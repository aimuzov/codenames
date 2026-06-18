import { describe, expect, it } from 'vitest'
import type { LogEntry, RedactedState } from '../game/index.ts'
import { endTurnLockLeft, turnSecondsLeft, turnStartedAt } from './turnTimer.ts'

function viewWith(partial: Partial<RedactedState>): RedactedState {
  return {
    cards: [],
    startingTeam: 'red',
    currentTeam: 'red',
    phase: 'guess',
    clue: { word: 'тест', count: 2, team: 'red' },
    guessesRemaining: 3,
    prevClueWord: { red: null, blue: null },
    winner: null,
    log: [],
    ...partial,
  }
}

const clue = (at: number, word = 'тест'): LogEntry => ({ kind: 'clue', team: 'red', word, count: 2, at })

describe('turnStartedAt', () => {
  it('берёт метку времени последней выданной подсказки', () => {
    const view = viewWith({
      log: [clue(1000), { kind: 'reveal', team: 'red', word: 'a', type: 'red', at: 1500 }, clue(5000)],
    })
    expect(turnStartedAt(view)).toBe(5000)
  })

  it('null вне фазы guess', () => {
    expect(turnStartedAt(viewWith({ phase: 'clue', clue: null, log: [clue(1000)] }))).toBeNull()
  })

  it('null без активной партии', () => {
    expect(turnStartedAt(null)).toBeNull()
  })
})

describe('turnSecondsLeft — отсчёт привязан к старту хода, а не к маунту', () => {
  it('не сбрасывается при повторном расчёте (возврат из настроек)', () => {
    const startedAt = 10_000
    const timerSec = 180
    // Зашли в игру: с начала хода прошло 30 c.
    expect(turnSecondsLeft(startedAt, timerSec, 40_000)).toBe(150)
    // Сходили в настройки и вернулись (ещё +20 c): таймер продолжает идти, а не стартует с 180.
    expect(turnSecondsLeft(startedAt, timerSec, 60_000)).toBe(130)
  })

  it('не уходит ниже нуля', () => {
    expect(turnSecondsLeft(10_000, 60, 999_000)).toBe(0)
  })
})

describe('endTurnLockLeft — блокировка «Завершить ход» в начале хода', () => {
  it('в момент старта хода блокировка на всю длительность', () => {
    expect(endTurnLockLeft(10_000, 5, 10_000)).toBe(5)
  })

  it('убывает от старта хода, а не от повторного расчёта (возврат из настроек)', () => {
    const startedAt = 10_000
    const lockSec = 5
    // Прошло 2 c с начала хода.
    expect(endTurnLockLeft(startedAt, lockSec, 12_000)).toBe(3)
    // Сходили в настройки и вернулись (ещё +1.5 c): отсчёт продолжает идти, а не стартует с 5.
    expect(endTurnLockLeft(startedAt, lockSec, 13_500)).toBe(1.5)
  })

  it('не уходит ниже нуля после разблокировки', () => {
    expect(endTurnLockLeft(10_000, 5, 20_000)).toBe(0)
  })
})
