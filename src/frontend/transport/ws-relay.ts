import type { ClientMessage, HostMessage } from '#frontend/transport/messages.ts'
import type { GuestTransport, HostTransport } from '#frontend/transport/types.ts'
import type { RelayIn as Envelope, RelayOut as EnvelopeOut, IceServer } from '#shared/relay-protocol.ts'

type RelayIn = Envelope<ClientMessage | HostMessage>
type RelayOut = EnvelopeOut<ClientMessage | HostMessage>

/**
 * Voice chat signaling over the same relay socket. Only the relay transport has it: the QR
 * mode has no server to route through, and its players sit next to each other anyway.
 */
export type VoiceSignaling = {
	send(to: string, data: unknown): void
	onSignal(cb: (from: string, data: unknown) => void): () => void
	/** The latest servers from the relay; they come with every (re)join. */
	readonly iceServers: IceServer[]
}

class RelayVoice implements VoiceSignaling {
	iceServers: IceServer[] = []
	private cbs = new Set<(from: string, data: unknown) => void>()
	private readonly socket: ReconnectingSocket

	constructor(socket: ReconnectingSocket) {
		this.socket = socket
	}

	/** Takes the envelopes meant for voice; false means the message is someone else's. */
	handle(msg: RelayOut): boolean {
		if (msg.t === 'ice') this.iceServers = msg.servers
		else if (msg.t === 'voice') for (const cb of this.cbs) cb(msg.from, msg.data)
		else return false

		return true
	}

	send(to: string, data: unknown) {
		this.socket.send({ t: 'voice', to, data })
	}

	onSignal(cb: (from: string, data: unknown) => void) {
		this.cbs.add(cb)

		return () => this.cbs.delete(cb)
	}
}

/**
 * Транспорт поверх WS-релея. Главное отличие от QR/WebRTC: разорванный канал чинится сам —
 * сокет переподключается с backoff, гость заново входит в комнату под тем же id устройства,
 * а хост занимает свою комнату обратно. Именно это позволяет вернуться в партию после сна
 * телефона, не заставляя людей снова водить камерой по чужому экрану.
 */

const RETRY_MIN_MS = 500
const RETRY_MAX_MS = 5000

type Fatal = 'no-room' | 'room-taken'

/** Сокет с авто-переподключением: живёт до close(), сам поднимается после обрыва. */
class ReconnectingSocket {
	private ws: WebSocket | null = null
	private timer: ReturnType<typeof setTimeout> | null = null
	private delay = RETRY_MIN_MS
	private stopped = false
	private readonly url: string
	private readonly onOpen: () => void
	private readonly onMessage: (msg: RelayOut) => void
	private readonly onDown: () => void

	constructor(url: string, onOpen: () => void, onMessage: (msg: RelayOut) => void, onDown: () => void) {
		this.url = url
		this.onOpen = onOpen
		this.onMessage = onMessage
		this.onDown = onDown
		this.connect()
		// Возврат из фона и появление сети — лучшие моменты для повторной попытки: ждать
		// очередного шага backoff, когда человек уже смотрит на экран, незачем.
		globalThis.addEventListener('online', this.wake)
		document.addEventListener('visibilitychange', this.wake)
	}

	private wake = () => {
		if (this.stopped || document.visibilityState !== 'visible') return

		if (this.ws?.readyState === WebSocket.OPEN) return

		this.delay = RETRY_MIN_MS
		this.connect()
	}

	private connect() {
		if (this.stopped) return

		if (this.timer !== null) {
			clearTimeout(this.timer)
			this.timer = null
		}

		this.ws?.close()
		const ws = new WebSocket(this.url)

		this.ws = ws

		ws.onopen = () => {
			this.delay = RETRY_MIN_MS
			this.onOpen()
		}

		ws.onmessage = (e) => this.onMessage(JSON.parse(e.data as string) as RelayOut)

		ws.onclose = () => {
			if (this.ws !== ws) return // уже заменён более свежей попыткой

			this.onDown()
			this.scheduleRetry()
		}

		ws.onerror = () => ws.close()
	}

	private scheduleRetry() {
		if (this.stopped || this.timer !== null) return

		this.timer = setTimeout(() => {
			this.timer = null
			this.connect()
		}, this.delay)

		this.delay = Math.min(this.delay * 2, RETRY_MAX_MS)
	}

	get open() {
		return this.ws?.readyState === WebSocket.OPEN
	}

	send(msg: RelayIn) {
		if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg))
	}

	close() {
		this.stopped = true

		if (this.timer !== null) clearTimeout(this.timer)

		globalThis.removeEventListener('online', this.wake)
		document.removeEventListener('visibilitychange', this.wake)
		this.ws?.close()
		this.ws = null
	}
}

/** Сторона хоста: комната на релее, гости адресуются своим id устройства. */
export class WsHostTransport implements HostTransport {
	readonly voice: RelayVoice
	private socket: ReconnectingSocket
	private code: string | null = null
	private guests = new Set<string>()
	private messageCb: (connId: string, msg: ClientMessage) => void = () => {}
	private disconnectCb: (connId: string) => void = () => {}
	private readonly onCode: (code: string) => void
	private readonly onFatal: (reason: Fatal) => void

	constructor(
		url: string,
		/** Код прошлой комнаты — чтобы после перезапуска приложения вернуться в неё же. */
		code: string | null,
		onCode: (code: string) => void,
		onFatal: (reason: Fatal) => void = () => {},
	) {
		this.code = code
		this.onCode = onCode
		this.onFatal = onFatal

		this.socket = new ReconnectingSocket(
			url,
			// Тот же код после обрыва — гости остаются в комнате и ждут возвращения хоста.
			() => this.socket.send({ t: 'host', code: this.code ?? undefined }),
			(msg) => this.handle(msg),
			() => {},
		)

		this.voice = new RelayVoice(this.socket)
	}

	private handle(msg: RelayOut) {
		if (this.voice.handle(msg)) return

		switch (msg.t) {
			case 'hosting':
				this.code = msg.code
				this.onCode(msg.code)
				break
			case 'peer':
				if (msg.online) this.guests.add(msg.id)
				else if (this.guests.delete(msg.id)) this.disconnectCb(msg.id)

				break
			case 'from':
				this.guests.add(msg.from)
				this.messageCb(msg.from, msg.data as ClientMessage)
				break
			case 'error':
				// `bad-message` -- сервер отбил одно кривое сообщение, сокет и комната при этом живы,
				// поэтому сворачивать игру не из-за чего.
				if (msg.reason !== 'bad-message') this.onFatal(msg.reason)

				break
		}
	}

	onMessage(cb: (connId: string, msg: ClientMessage) => void) {
		this.messageCb = cb
	}
	onDisconnect(cb: (connId: string) => void) {
		this.disconnectCb = cb
	}
	send(connId: string, msg: HostMessage) {
		this.socket.send({ t: 'to', to: connId, data: msg })
	}
	broadcast(msg: HostMessage) {
		for (const id of this.guests) this.send(id, msg)
	}
	close() {
		this.socket.close()
	}
}

/** Сторона гостя: канал до хоста через комнату релея. */
export class WsGuestTransport implements GuestTransport {
	readonly voice: RelayVoice
	private socket: ReconnectingSocket
	private hostOnline = false
	private messageCb: (msg: HostMessage) => void = () => {}
	private openCbs = new Set<() => void>()
	private closeCbs = new Set<() => void>()
	private readonly code: string
	private readonly playerId: string
	private readonly onFatal: (reason: Fatal) => void

	constructor(url: string, code: string, playerId: string, onFatal: (reason: Fatal) => void = () => {}) {
		this.code = code
		this.playerId = playerId
		this.onFatal = onFatal

		this.socket = new ReconnectingSocket(
			url,
			() => this.socket.send({ t: 'join', code: this.code, id: this.playerId }),
			(msg) => this.handle(msg),
			() => this.setHostOnline(false),
		)

		this.voice = new RelayVoice(this.socket)
	}

	/**
	 * Канал считаем открытым, только когда хост в комнате: сокет до релея сам по себе игру не
	 * двигает. Каждое открытие поднимает onOpen — net.ts на нём представляется (`hello`), так
	 * что вернувшийся хост сразу узнаёт, кто уже на месте.
	 */
	private setHostOnline(online: boolean) {
		if (online === this.hostOnline) return

		this.hostOnline = online

		for (const cb of online ? this.openCbs : this.closeCbs) cb()
	}

	private handle(msg: RelayOut) {
		if (this.voice.handle(msg)) return

		switch (msg.t) {
			case 'host-online':
				this.setHostOnline(msg.online)
				break
			case 'from':
				this.messageCb(msg.data as HostMessage)
				break
			case 'error':
				if (msg.reason !== 'bad-message') this.onFatal(msg.reason)

				break
		}
	}

	get open() {
		return this.socket.open && this.hostOnline
	}
	onMessage(cb: (msg: HostMessage) => void) {
		this.messageCb = cb
	}
	onOpen(cb: () => void) {
		this.openCbs.add(cb)
	}
	onClose(cb: () => void) {
		this.closeCbs.add(cb)
	}
	send(msg: ClientMessage) {
		this.socket.send({ t: 'to', data: msg })
	}
	close() {
		this.socket.close()
	}
}
