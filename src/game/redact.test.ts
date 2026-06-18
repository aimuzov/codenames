import { describe, expect, it } from 'vitest'
import { redactStateForRole } from './redact.ts'
import type { Card, GameState } from './types.ts'

const cards: Card[] = [
  { word: 'a', type: 'red', revealed: true },
  { word: 'b', type: 'blue', revealed: false },
  { word: 'c', type: 'assassin', revealed: false },
  { word: 'd', type: 'neutral', revealed: true },
]

const state: GameState = {
  cards,
  startingTeam: 'red',
  currentTeam: 'blue',
  phase: 'guess',
  clue: { word: 'тест', count: 2, team: 'blue' },
  guessesRemaining: 3,
  prevClueWord: { red: null, blue: null },
  winner: null,
  log: [],
}

describe('redactStateForRole', () => {
  it('капитан видит истинный тип всех карт', () => {
    const r = redactStateForRole(state, 'spymaster')
    expect(r.cards.map((c) => c.type)).toEqual(['red', 'blue', 'assassin', 'neutral'])
  })

  it('игрок видит тип только у открытых карт, у закрытых — null', () => {
    const r = redactStateForRole(state, 'operative')
    expect(r.cards.map((c) => c.type)).toEqual(['red', null, null, 'neutral'])
  })

  it('сохраняет слова и флаги revealed', () => {
    const r = redactStateForRole(state, 'operative')
    expect(r.cards.map((c) => c.word)).toEqual(['a', 'b', 'c', 'd'])
    expect(r.cards.map((c) => c.revealed)).toEqual([true, false, false, true])
  })

  it('сохраняет остальные поля состояния', () => {
    const r = redactStateForRole(state, 'operative')
    expect(r.currentTeam).toBe('blue')
    expect(r.startingTeam).toBe('red')
    expect(r.phase).toBe('guess')
    expect(r.clue).toEqual({ word: 'тест', count: 2, team: 'blue' })
    expect(r.guessesRemaining).toBe(3)
    expect(r.winner).toBeNull()
    expect(r.log).toBe(state.log)
  })

  it('не мутирует исходное состояние', () => {
    const snapshot = JSON.stringify(state)
    redactStateForRole(state, 'operative')
    expect(JSON.stringify(state)).toBe(snapshot)
  })
})
