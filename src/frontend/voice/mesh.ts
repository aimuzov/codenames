import type { VoiceSignaling } from '#frontend/transport/ws-relay.ts'

/**
 * Voice chat mesh: an RTCPeerConnection per other participant, audio only.
 * The impolite side (larger id) makes the first offer. Later ones, from an ICE
 * restart, may come from both sides at once, so negotiation follows the
 * "perfect negotiation" pattern: the polite side rolls back its own offer,
 * the impolite one ignores the colliding offer.
 *
 * Every mesh gets its own `sid`. A peer that left the voice chat and came back
 * is a new session, and whatever its old connection still sends must not reach
 * the new one.
 */

type Signal = {
	sid: string
	/** The receiver's sid as the sender knows it; a mismatch means the signal is stale. */
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
	/** Signals are applied one by one: an await in the middle of one must not let the next in. */
	queue: Promise<void>
	remoteSid?: string
	/** When a peer was created by its own signal rather than by the roster (see sync). */
	bornAt: number
}

const FALLBACK_ICE: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]

/**
 * An offer can outrun the roster: it goes to us straight through the relay,
 * while news that the sender joined the chat takes a detour through the host.
 * A fresh peer missing from the roster is kept for this long, otherwise sync
 * would hang up before the roster catches up.
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

	/** Asks for the mic: call it from a tap, otherwise iOS won't play the incoming audio. */
	static async open(signaling: VoiceSignaling, myId: string): Promise<VoiceMesh> {
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
		})

		return new VoiceMesh(stream, signaling, myId)
	}

	set muted(muted: boolean) {
		for (const track of this.stream.getAudioTracks()) track.enabled = !muted
	}

	/** Connects to everyone in `ids` and hangs up on the rest. */
	sync(ids: string[]) {
		this.wanted = ids
		const wanted = new Set(ids.filter((id) => id !== this.myId))
		let graceLeft = false

		for (const id of wanted) if (!this.peers.has(id)) this.connect(id)

		for (const [id, peer] of this.peers) {
			if (wanted.has(id)) {
				peer.bornAt = 0 // the roster has caught up: leaving the chat now hangs up at once

				continue
			}

			if (Date.now() - peer.bornAt > ROSTER_GRACE_MS) this.hangUp(id)
			else graceLeft = true
		}

		// The roster may never change again, so look once more when the grace runs out.
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

	/** For e2e: what each connection looks like right now. */
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

		// Only the impolite side starts the call: if both offered at once, the candidates of the
		// ignored offer get lost and the link can hang in 'new'. The polite side puts its mic
		// into the incoming transceiver instead (see apply).
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
				// The connection was closed mid-negotiation: nothing to send any more.
			} finally {
				peer.makingOffer = false
			}
		}

		// A network change (Wi-Fi to cellular) breaks the ICE path; a restart finds a new one
		// without tearing down the call.
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

		// The peer rejoined the chat: its old connection is dead, start over with the new one.
		if (peer?.remoteSid !== undefined && peer.remoteSid !== signal.sid) {
			this.hangUp(from)
			peer = undefined
		}

		const target = (peer ??= this.connect(from, Date.now()))

		target.remoteSid = signal.sid
		target.queue = target.queue.then(() => this.apply(from, target, signal))
	}

	/** Answers with our own audio: the offer brought a transceiver, it only lacks our track. */
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
			// Candidates of an ignored offer are bound to fail. Anything else is a hiccup that
			// perfect negotiation gets over by itself, and a dead ICE path ends in restartIce.
			peer.answerPending = false
		}
	}
}
