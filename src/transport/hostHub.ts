import { HostConnection } from './webrtc.ts'
import type { ClientMessage, HostMessage } from './messages.ts'

/** Управляет множеством соединений хоста с гостями (топология «звезда»). */
export class HostHub {
	private conns = new Map<string, HostConnection<ClientMessage, HostMessage>>()
	private messageCb: (id: string, msg: ClientMessage) => void = () => {}
	private connectCb: (id: string) => void = () => {}
	private disconnectCb: (id: string) => void = () => {}

	onMessage(cb: (id: string, msg: ClientMessage) => void) {
		this.messageCb = cb
	}
	onConnect(cb: (id: string) => void) {
		this.connectCb = cb
	}
	onDisconnect(cb: (id: string) => void) {
		this.disconnectCb = cb
	}

	/** Принимает offer гостя, возвращает id и answer-код для показа гостю. */
	async acceptGuest(offerCode: string): Promise<{ id: string; answerCode: string }> {
		const id = crypto.randomUUID().slice(0, 8)
		const conn = new HostConnection<ClientMessage, HostMessage>(id)
		// Подписки — до рукопожатия, чтобы не пропустить событие открытия канала.
		conn.onMessage((m) => this.messageCb(id, m))
		conn.onOpen(() => this.connectCb(id))
		conn.onClose(() => this.disconnectCb(id))
		const answerCode = await conn.acceptOfferCode(offerCode)
		this.conns.set(id, conn)
		return { id, answerCode }
	}

	send(id: string, msg: HostMessage) {
		this.conns.get(id)?.send(msg)
	}

	broadcast(msg: HostMessage) {
		for (const conn of this.conns.values()) conn.send(msg)
	}

	ids(): string[] {
		return [...this.conns.keys()]
	}

	close() {
		for (const conn of this.conns.values()) conn.close()
		this.conns.clear()
	}
}
