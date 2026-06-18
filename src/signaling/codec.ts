import { deflateRaw, inflateRaw } from 'pako'
import { expandSdp, isMinifiedSignal, minifySdp } from './sdp.ts'
import { base45Decode, base45Encode } from './base45.ts'
import type { SignalDescription } from './types.ts'

/**
 * Кодирует WebRTC-сигнал в компактную строку для QR.
 *
 * Шаги: минификация SDP (только существенные поля + отфильтрованные кандидаты) →
 * сжатие deflate (hex-отпечаток и шаблонные части кандидатов ужимаются) →
 * упаковка в Base45 (QR использует плотный alphanumeric-режим). За счёт этого
 * QR заметно проще для сканирования камерой.
 */
export function encodeSignal(desc: SignalDescription): string {
  return base45Encode(deflateRaw(minifySdp(desc)))
}

/** Декодирует строку обратно в WebRTC-сигнал. */
export function decodeSignal(text: string): SignalDescription {
  const trimmed = text.trim()
  // Совместимость: голый минифицированный код (M~…) без сжатия.
  if (isMinifiedSignal(trimmed)) return expandSdp(trimmed)
  return expandSdp(inflateRaw(base45Decode(trimmed), { to: 'string' }))
}
