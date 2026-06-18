import { decodeSignal, encodeSignal } from '../signaling/codec.ts'

/**
 * WebRTC поверх локальной сети (хотспота) с офлайн-сигналингом через QR/строку.
 * Non-trickle ICE: дожидаемся сбора кандидатов, затем сериализуем полный SDP.
 * Без STUN/TURN — на одной LAN достаточно host-кандидатов.
 */
const RTC_CONFIG: RTCConfiguration = { iceServers: [] }
const CHANNEL = 'codenames'
const ICE_TIMEOUT_MS = 4000

type Unsub = () => void

/** Ждёт окончания сбора ICE-кандидатов (с запасным таймаутом). */
function waitIceComplete(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve()
  return new Promise((resolve) => {
    const finish = () => {
      pc.removeEventListener('icegatheringstatechange', check)
      clearTimeout(timer)
      resolve()
    }
    const check = () => {
      if (pc.iceGatheringState === 'complete') finish()
    }
    const timer = setTimeout(finish, ICE_TIMEOUT_MS)
    pc.addEventListener('icegatheringstatechange', check)
  })
}

function localCode(pc: RTCPeerConnection): string {
  const desc = pc.localDescription
  if (!desc) throw new Error('Нет локального описания')
  return encodeSignal({ type: desc.type as 'offer' | 'answer', sdp: desc.sdp })
}

/** Тонкая обёртка над DataChannel: типизированные подписки и отправка JSON. */
class Channel<TIn, TOut> {
  private messageCbs = new Set<(msg: TIn) => void>()
  private openCbs = new Set<() => void>()
  private closeCbs = new Set<() => void>()
  private channel: RTCDataChannel | null = null

  attach(channel: RTCDataChannel) {
    this.channel = channel
    channel.onopen = () => this.openCbs.forEach((cb) => cb())
    channel.onclose = () => this.closeCbs.forEach((cb) => cb())
    channel.onmessage = (e) => {
      const msg = JSON.parse(e.data as string) as TIn
      this.messageCbs.forEach((cb) => cb(msg))
    }
    if (channel.readyState === 'open') this.openCbs.forEach((cb) => cb())
  }

  get open() {
    return this.channel?.readyState === 'open'
  }

  send(msg: TOut) {
    if (this.channel?.readyState === 'open') this.channel.send(JSON.stringify(msg))
  }

  onMessage(cb: (msg: TIn) => void): Unsub {
    this.messageCbs.add(cb)
    return () => this.messageCbs.delete(cb)
  }
  onOpen(cb: () => void): Unsub {
    this.openCbs.add(cb)
    return () => this.openCbs.delete(cb)
  }
  onClose(cb: () => void): Unsub {
    this.closeCbs.add(cb)
    return () => this.closeCbs.delete(cb)
  }
}

/** Соединение со стороны гостя (инициатор: создаёт offer и DataChannel). */
export class GuestConnection<TIn = unknown, TOut = unknown> {
  private pc = new RTCPeerConnection(RTC_CONFIG)
  private chan = new Channel<TIn, TOut>()

  constructor() {
    this.chan.attach(this.pc.createDataChannel(CHANNEL))
  }

  /** Создаёт offer-код для показа хосту (QR/строка). */
  async createOfferCode(): Promise<string> {
    await this.pc.setLocalDescription(await this.pc.createOffer())
    await waitIceComplete(this.pc)
    return localCode(this.pc)
  }

  /** Принимает answer-код от хоста; после этого канал откроется. */
  async acceptAnswerCode(code: string): Promise<void> {
    await this.pc.setRemoteDescription(decodeSignal(code))
  }

  send(msg: TOut) {
    this.chan.send(msg)
  }
  onMessage(cb: (msg: TIn) => void) {
    return this.chan.onMessage(cb)
  }
  onOpen(cb: () => void) {
    return this.chan.onOpen(cb)
  }
  onClose(cb: () => void) {
    return this.chan.onClose(cb)
  }
  close() {
    this.pc.close()
  }
}

/** Соединение со стороны хоста с конкретным гостем (отвечающий). */
export class HostConnection<TIn = unknown, TOut = unknown> {
  private pc = new RTCPeerConnection(RTC_CONFIG)
  private chan = new Channel<TIn, TOut>()

  constructor(readonly id: string) {
    this.pc.ondatachannel = (e) => this.chan.attach(e.channel)
  }

  /** Принимает offer-код гостя и возвращает answer-код для показа ему. */
  async acceptOfferCode(code: string): Promise<string> {
    await this.pc.setRemoteDescription(decodeSignal(code))
    await this.pc.setLocalDescription(await this.pc.createAnswer())
    await waitIceComplete(this.pc)
    return localCode(this.pc)
  }

  send(msg: TOut) {
    this.chan.send(msg)
  }
  get open() {
    return this.chan.open
  }
  onMessage(cb: (msg: TIn) => void) {
    return this.chan.onMessage(cb)
  }
  onOpen(cb: () => void) {
    return this.chan.onOpen(cb)
  }
  onClose(cb: () => void) {
    return this.chan.onClose(cb)
  }
  close() {
    this.pc.close()
  }
}
