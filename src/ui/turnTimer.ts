import type { RedactedState } from '../game/index.ts'

/**
 * Метка времени (мс epoch) начала текущего хода — момент выдачи активной подсказки,
 * взятый из лога партии. Этот якорь живёт в состоянии партии: он синхронизируется
 * гостям и переживает перемонтирование экрана, поэтому, в отличие от локального
 * отсчёта компонента, не сбрасывается при заходе в настройки и обратно.
 * null — активного хода нет (не фаза guess).
 */
export function turnStartedAt(view: RedactedState | null): number | null {
  if (!view || view.phase !== 'guess' || !view.clue) return null
  for (let i = view.log.length - 1; i >= 0; i--) {
    const entry = view.log[i]!
    if (entry.kind === 'clue') return entry.at
  }
  return null
}

/** Сколько секунд хода осталось при длительности `timerSec` и старте `startedAt` (всё в мс epoch). */
export function turnSecondsLeft(startedAt: number, timerSec: number, now: number): number {
  return Math.max(0, timerSec - (now - startedAt) / 1000)
}

/**
 * Сколько секунд осталось до разблокировки кнопки «Завершить ход».
 * Блокировка длится `lockSec` секунд от старта хода `startedAt` (всё в мс epoch),
 * чтобы погасить случайный тап при передаче телефона. 0 — кнопка уже доступна.
 */
export function endTurnLockLeft(startedAt: number, lockSec: number, now: number): number {
  return Math.max(0, lockSec - (now - startedAt) / 1000)
}
