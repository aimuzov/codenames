import type { CardType } from '../game/index.ts'

/** Лёгкие синтезированные звуки через Web Audio (без файлов). */
let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  const Ctor =
    typeof window !== 'undefined'
      ? window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined
  if (!Ctor) return null
  ctx ??= new Ctor()
  return ctx
}

/** Возобновляет AudioContext (вызывать из пользовательского жеста). */
export function resumeAudio() {
  void audio()?.resume?.()
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', delay = 0, gain = 0.07) {
  const c = audio()
  if (!c) return
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  osc.connect(g)
  g.connect(c.destination)
  const t = c.currentTime + delay
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.start(t)
  osc.stop(t + dur)
}

/** Тихий короткий клик на нажатие кнопки (UI-отклик). */
export function sfxTap() {
  const c = audio()
  if (!c) return
  const osc = c.createOscillator()
  const g = c.createGain()
  const t = c.currentTime
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(1100, t)
  osc.frequency.exponentialRampToValueAtTime(560, t + 0.04)
  g.gain.setValueAtTime(0.04, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(t)
  osc.stop(t + 0.06)
}

/** Звук открытия карты по её типу. */
export function sfxReveal(type: CardType) {
  switch (type) {
    case 'red':
      return tone(440, 0.18, 'triangle')
    case 'blue':
      return tone(587, 0.18, 'triangle')
    case 'neutral':
      return tone(330, 0.16, 'sine')
    case 'assassin':
      tone(150, 0.5, 'sawtooth')
      tone(95, 0.7, 'sawtooth', 0.08)
      return
  }
}

/** Фанфара победы. */
export function sfxWin() {
  tone(523, 0.15, 'triangle', 0)
  tone(659, 0.15, 'triangle', 0.15)
  tone(784, 0.32, 'triangle', 0.3)
}

/** Короткое подтверждение при включении звука в настройках (вызывать из жеста). */
export function previewSound() {
  resumeAudio()
  tone(523, 0.12, 'triangle', 0)
  tone(784, 0.16, 'triangle', 0.1)
}
