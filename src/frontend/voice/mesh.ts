import type { VoiceSignaling } from '#frontend/transport/ws-relay.ts'

/**
 * Меш голосового чата: по RTCPeerConnection на каждого другого участника, только звук.
 * Первый offer делает невежливая сторона (у кого id больше). Последующие, от ICE restart,
 * могут прийти с обеих сторон разом, поэтому согласование идёт по паттерну
 * "perfect negotiation": вежливая сторона откатывает свой offer,
 * невежливая игнорирует встречный.
 *
 * У каждого меша свой `sid`. Пир, который вышел из голосового чата и вернулся, —
 * это новая сессия, и всё, что ещё шлёт его старое соединение, не должно попасть
 * в новое.
 */

type Signal = {
	sid: string
	/** sid получателя, каким его знает отправитель; не совпал — значит, сигнал устарел. */
	rsid?: string
	description?: RTCSessionDescriptionInit
	candidate?: RTCIceCandidateInit
}

type Peer = {
	pc: RTCPeerConnection
	audio: HTMLAudioElement
	polite: boolean
	makingOffer: boolean
	ignoreOffer: boolean
	answerPending: boolean
	/** Сигналы применяем по одному: await посреди одного не должен пропустить следующий. */
	queue: Promise<void>
	remoteSid?: string
	/** Когда пир создан его собственным сигналом, а не ростером (см. sync). */
	bornAt: number
}

const FALLBACK_ICE: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]

/**
 * Offer может обогнать ростер: он идёт к нам напрямую через релей,
 * а новость о том, что отправитель вошёл в чат, — в обход, через хост.
 * Свежий пир, которого нет в ростере, держим вот столько, иначе sync
 * повесит трубку раньше, чем ростер догонит.
 */
const ROSTER_GRACE_MS = 10_000

export class VoiceMesh {
	private readonly sid = crypto.randomUUID()
	private readonly peers = new Map<string, Peer>()
	private readonly stream: MediaStream
	private readonly signaling: VoiceSignaling
	private readonly myId: string
	private readonly off: () => void
	private wanted: string[] = []
	private graceTimer: ReturnType<typeof setTimeout> | null = null

	private constructor(stream: MediaStream, signaling: VoiceSignaling, myId: string) {
		this.stream = stream
		this.signaling = signaling
		this.myId = myId
		this.off = signaling.onSignal((from, data) => void this.onSignal(from, data as Signal))
	}

	/** Запрашивает микрофон: вызывать по нажатию, иначе iOS не будет играть входящий звук. */
	static async open(signaling: VoiceSignaling, myId: string): Promise<VoiceMesh> {
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
		})

		return new VoiceMesh(stream, signaling, myId)
	}

	set muted(muted: boolean) {
		for (const track of this.stream.getAudioTracks()) track.enabled = !muted
	}

	/** Соединяется со всеми из `ids`, а с остальными кладёт трубку. */
	sync(ids: string[]) {
		this.wanted = ids
		const wanted = new Set(ids.filter((id) => id !== this.myId))
		let graceLeft = false

		for (const id of wanted) if (!this.peers.has(id)) this.connect(id)

		for (const [id, peer] of this.peers) {
			if (wanted.has(id)) {
				peer.bornAt = 0 // ростер догнал: теперь выход из чата сразу кладёт трубку

				continue
			}

			if (Date.now() - peer.bornAt > ROSTER_GRACE_MS) this.hangUp(id)
			else graceLeft = true
		}

		// Ростер может больше и не поменяться, поэтому, когда отсрочка выйдет, смотрим ещё раз.
		if (graceLeft && this.graceTimer === null) {
			this.graceTimer = setTimeout(() => {
				this.graceTimer = null
				this.sync(this.wanted)
			}, ROSTER_GRACE_MS)
		}
	}

	close() {
		this.off()

		if (this.graceTimer !== null) clearTimeout(this.graceTimer)

		for (const id of this.peers.keys()) this.hangUp(id)

		for (const track of this.stream.getTracks()) track.stop()
	}

	/** Для e2e: в каком состоянии сейчас каждое соединение. */
	stats() {
		return [...this.peers].map(([id, { pc, audio }]) => ({
			id,
			state: pc.connectionState,
			receiving: audio.srcObject instanceof MediaStream && audio.srcObject.getAudioTracks().length > 0,
		}))
	}

	private connect(id: string, bornAt = 0): Peer {
		const pc = new RTCPeerConnection({
			iceServers: this.signaling.iceServers.length > 0 ? this.signaling.iceServers : FALLBACK_ICE,
		})
		const audio = document.createElement('audio')

		audio.autoplay = true
		audio.setAttribute('playsinline', '')
		audio.hidden = true
		document.body.append(audio)

		const peer: Peer = {
			pc,
			audio,
			polite: this.myId < id,
			makingOffer: false,
			ignoreOffer: false,
			answerPending: false,
			queue: Promise.resolve(),
			bornAt,
		}

		this.peers.set(id, peer)

		// Звонок начинает только невежливая сторона: если offer сделают обе разом, кандидаты
		// проигнорированного offer'а теряются, и связь может зависнуть в 'new'. Вежливая сторона
		// вместо этого кладёт свой микрофон во входящий трансивер (см. apply).
		if (!peer.polite) for (const track of this.stream.getAudioTracks()) pc.addTrack(track, this.stream)

		pc.ontrack = ({ track, streams }) => {
			audio.srcObject = streams[0] ?? new MediaStream([track])
			void audio.play().catch(() => {})
		}

		pc.onicecandidate = ({ candidate }) => {
			if (candidate) this.send(id, { candidate: candidate.toJSON() })
		}

		pc.onnegotiationneeded = async () => {
			try {
				peer.makingOffer = true
				await pc.setLocalDescription()
				this.send(id, { description: pc.localDescription!.toJSON() })
			} catch {
				// Соединение закрыли посреди согласования: отправлять больше нечего.
			} finally {
				peer.makingOffer = false
			}
		}

		// Смена сети (с Wi-Fi на мобильную) ломает ICE-маршрут; restart находит новый,
		// не обрывая звонок.
		pc.onconnectionstatechange = () => {
			if (pc.connectionState === 'failed') pc.restartIce()
		}

		return peer
	}

	private hangUp(id: string) {
		const peer = this.peers.get(id)

		if (!peer) return

		this.peers.delete(id)
		peer.pc.close()
		peer.audio.srcObject = null
		peer.audio.remove()
	}

	private send(id: string, signal: Omit<Signal, 'sid' | 'rsid'>) {
		this.signaling.send(id, { ...signal, sid: this.sid, rsid: this.peers.get(id)?.remoteSid })
	}

	private onSignal(from: string, signal: Signal) {
		if (signal.rsid !== undefined && signal.rsid !== this.sid) return

		let peer = this.peers.get(from)

		// Пир перезашёл в чат: старое соединение мертво, начинаем заново с новым.
		if (peer?.remoteSid !== undefined && peer.remoteSid !== signal.sid) {
			this.hangUp(from)
			peer = undefined
		}

		const target = (peer ??= this.connect(from, Date.now()))

		target.remoteSid = signal.sid
		target.queue = target.queue.then(() => this.apply(from, target, signal))
	}

	/** Отвечает нашим звуком: трансивер пришёл с offer'ом, в нём не хватает только нашего трека. */
	private async attachMic(pc: RTCPeerConnection) {
		const [track] = this.stream.getAudioTracks()
		const transceiver = pc.getTransceivers().find((t) => t.receiver.track.kind === 'audio')

		if (!track || !transceiver || transceiver.sender.track) return

		await transceiver.sender.replaceTrack(track)
		transceiver.sender.setStreams(this.stream)
		transceiver.direction = 'sendrecv'
	}

	private async apply(from: string, peer: Peer, signal: Signal) {
		const { pc } = peer

		try {
			if (signal.description) {
				const readyForOffer = !peer.makingOffer && (pc.signalingState === 'stable' || peer.answerPending)
				const collision = signal.description.type === 'offer' && !readyForOffer

				peer.ignoreOffer = !peer.polite && collision

				if (peer.ignoreOffer) return

				peer.answerPending = signal.description.type === 'answer'
				await pc.setRemoteDescription(signal.description)
				peer.answerPending = false

				if (signal.description.type === 'offer') {
					await this.attachMic(pc)
					await pc.setLocalDescription()
					this.send(from, { description: pc.localDescription!.toJSON() })
				}
			} else if (signal.candidate) {
				await pc.addIceCandidate(signal.candidate)
			}
		} catch {
			// Кандидаты проигнорированного offer'а обязательно упадут. Всё остальное — заминка,
			// которую perfect negotiation переживёт сам, а мёртвый ICE-маршрут закончится restartIce.
			peer.answerPending = false
		}
	}
}
