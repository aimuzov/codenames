import { createServer } from 'node:http'
import { WebSocketServer, type WebSocket } from 'ws'

import { iceServers, turnConfigFromEnv } from '#backend/turn.ts'
import {
	isRoomCode,
	normalizeRoomCode,
	ROOM_CODE_ALPHABET,
	ROOM_CODE_LENGTH,
	type RelayIn,
	type RelayOut,
} from '#shared/relay-protocol.ts'

/**
 * Релей игровых сообщений: комнаты «звезда» вокруг хоста, никакой игровой логики на сервере.
 * Нужен ровно затем, чтобы уснувшее устройство могло вернуться в партию само — WebRTC поверх
 * QR-сигналинга такого не умеет (для нового рукопожатия нужен человек с камерой).
 *
 * Запуск: node src/backend/server.ts (Node исполняет TypeScript без сборки).
 */

const PORT = Number(process.env.PORT ?? 8787)
/** Сколько комната живёт без хоста: он мог уснуть или перезапустить приложение. */
const ROOM_TTL_MS = 30 * 60 * 1000
const SWEEP_MS = 60 * 1000
const MAX_ROOMS = 500
const MAX_MESSAGE_BYTES = 256 * 1024
const TURN = turnConfigFromEnv()
/** How the host is addressed in voice signaling: same as HOST_ID on the client. */
const HOST_ID = 'host'

type Room = {
	code: string
	host: WebSocket | null
	guests: Map<string, WebSocket>
	/** Момент, когда комната осталась без хоста (0 — хост на месте). */
	orphanedAt: number
}

const rooms = new Map<string, Room>()
/** Обратный индекс: по сокету понимаем, кого отцеплять при закрытии. */
const membership = new WeakMap<WebSocket, { room: Room; id: string | null }>()

function send(ws: WebSocket, msg: RelayOut) {
	if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg))
}

function newRoomCode(): string {
	for (;;) {
		const bytes = crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH))
		const code = [...bytes].map((b) => ROOM_CODE_ALPHABET[b % ROOM_CODE_ALPHABET.length]).join('')

		if (!rooms.has(code)) return code
	}
}

function openRoom(ws: WebSocket, requested?: string) {
	const code = requested && isRoomCode(requested) ? requested : newRoomCode()
	const existing = rooms.get(code)

	// Вернуться в свою комнату можно, пока её никто не занял: хост в ней ровно один.
	if (existing && existing.host !== null && existing.host !== ws) {
		send(ws, { t: 'error', reason: 'room-taken' })

		return
	}

	if (!existing && rooms.size >= MAX_ROOMS) {
		send(ws, { t: 'error', reason: 'room-taken' })

		return
	}

	const room = existing ?? { code, host: null, guests: new Map(), orphanedAt: 0 }

	room.host = ws
	room.orphanedAt = 0
	rooms.set(code, room)
	membership.set(ws, { room, id: null })
	send(ws, { t: 'hosting', code })
	send(ws, { t: 'ice', servers: iceServers(TURN, HOST_ID) })

	// Гости, ждавшие возвращения хоста, представятся заново
	// (см. ws-relay.ts: `host-online` → open → `hello`).
	for (const [id, guest] of room.guests) {
		send(guest, { t: 'host-online', online: true })
		send(ws, { t: 'peer', id, online: true })
	}
}

function joinRoom(ws: WebSocket, rawCode: string, id: string) {
	const room = rooms.get(normalizeRoomCode(rawCode))

	if (!room) {
		send(ws, { t: 'error', reason: 'no-room' })

		return
	}

	// Переподключение того же игрока вытесняет его прежний сокет.
	room.guests.get(id)?.close()
	room.guests.set(id, ws)
	membership.set(ws, { room, id })
	send(ws, { t: 'joined', code: room.code })
	send(ws, { t: 'ice', servers: iceServers(TURN, id) })
	send(ws, { t: 'host-online', online: room.host !== null })

	if (room.host) send(room.host, { t: 'peer', id, online: true })
}

function route(ws: WebSocket, msg: Extract<RelayIn, { t: 'to' }>) {
	const seat = membership.get(ws)

	if (!seat) return

	const { room, id } = seat

	if (id === null) {
		// Отправитель — хост: адресуем конкретному гостю.
		const guest = msg.to === undefined ? undefined : room.guests.get(msg.to)

		if (guest) send(guest, { t: 'from', from: 'host', data: msg.data })
	} else if (room.host) {
		send(room.host, { t: 'from', from: id, data: msg.data })
	}
}

/**
 * Voice chat is a mesh, so unlike game messages signaling goes between guests too.
 * Strangers can't be reached: the target is looked up only within the sender's room.
 */
function routeVoice(ws: WebSocket, msg: Extract<RelayIn, { t: 'voice' }>) {
	const seat = membership.get(ws)

	if (!seat) return

	const { room, id } = seat
	const target = msg.to === HOST_ID ? room.host : room.guests.get(msg.to)

	if (target && target !== ws) send(target, { t: 'voice', from: id ?? HOST_ID, data: msg.data })
}

function leave(ws: WebSocket) {
	const seat = membership.get(ws)

	if (!seat) return

	membership.delete(ws)
	const { room, id } = seat

	if (id === null) {
		if (room.host !== ws) return

		room.host = null
		room.orphanedAt = Date.now()

		for (const guest of room.guests.values()) send(guest, { t: 'host-online', online: false })

		return
	}

	// Сокет мог быть уже вытеснен переподключением того же игрока — тогда трогать нечего.
	if (room.guests.get(id) !== ws) return

	room.guests.delete(id)

	if (room.host) send(room.host, { t: 'peer', id, online: false })
}

// Обычный HTTP нужен для проверки живости (docker healthcheck, ожидание сервера в e2e).
const http = createServer((_req, res) => {
	res.writeHead(200, { 'content-type': 'text/plain' })
	res.end(`ok ${rooms.size}`)
})
const wss = new WebSocketServer({ server: http, maxPayload: MAX_MESSAGE_BYTES })

wss.on('connection', (ws) => {
	let alive = true

	ws.on('pong', () => (alive = true))

	// Полумёртвые сокеты (уснувший телефон) молчат и не закрываются — отстреливаем по пингу.
	const ping = setInterval(() => {
		if (!alive) {
			ws.terminate()

			return
		}

		alive = false
		ws.ping()
	}, 25_000)

	ws.on('message', (raw) => {
		let msg: RelayIn

		try {
			msg = JSON.parse(String(raw)) as RelayIn
		} catch {
			send(ws, { t: 'error', reason: 'bad-message' })

			return
		}

		switch (msg.t) {
			case 'host':
				openRoom(ws, msg.code)
				break
			case 'join':
				joinRoom(ws, msg.code, msg.id)
				break
			case 'to':
				route(ws, msg)
				break
			case 'voice':
				routeVoice(ws, msg)
				break
			default:
				send(ws, { t: 'error', reason: 'bad-message' })
		}
	})

	ws.on('close', () => {
		clearInterval(ping)
		leave(ws)
	})

	ws.on('error', () => ws.terminate())
})

// Комнаты, покинутые хостом надолго, убираем — иначе коды копятся вечно.
setInterval(() => {
	const now = Date.now()

	for (const [code, room] of rooms) {
		if (room.host === null && now - room.orphanedAt > ROOM_TTL_MS) {
			for (const guest of room.guests.values()) guest.close()

			rooms.delete(code)
		}
	}
}, SWEEP_MS).unref()

http.listen(PORT, () => console.log(`codenames relay: ws://0.0.0.0:${PORT}`))
