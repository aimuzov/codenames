import { describe, expect, it } from 'vitest'
import { validateIntent } from './validateIntent.ts'
import type { GameState } from '../game/index.ts'
import type { PlayerInfo } from '../transport/messages.ts'

const roster: PlayerInfo[] = [
  { id: 'rs', name: 'КрасныйКап', team: 'red', role: 'spymaster', connected: true },
  { id: 'ro', name: 'КрасныйОп', team: 'red', role: 'operative', connected: true },
  { id: 'bs', name: 'СинийКап', team: 'blue', role: 'spymaster', connected: true },
  { id: 'bo', name: 'СинийОп', team: 'blue', role: 'operative', connected: true },
]

function game(over: Partial<GameState> = {}): GameState {
  return {
    cards: [],
    startingTeam: 'red',
    currentTeam: 'red',
    phase: 'clue',
    clue: null,
    guessesRemaining: 0,
    prevClueWord: { red: null, blue: null },
    winner: null,
    log: [],
    ...over,
  }
}

describe('validateIntent', () => {
  it('капитан текущей команды может дать подсказку в фазе clue', () => {
    expect(validateIntent(roster, game(), 'rs', { type: 'GIVE_CLUE', word: 'x', count: 1 })).toBe(true)
  })

  it('капитан другой команды не может дать подсказку', () => {
    expect(validateIntent(roster, game(), 'bs', { type: 'GIVE_CLUE', word: 'x', count: 1 })).toBe(false)
  })

  it('игрок не может давать подсказку', () => {
    expect(validateIntent(roster, game(), 'ro', { type: 'GIVE_CLUE', word: 'x', count: 1 })).toBe(false)
  })

  it('игрок текущей команды может открывать карту в фазе guess', () => {
    const g = game({ phase: 'guess' })
    expect(validateIntent(roster, g, 'ro', { type: 'REVEAL_CARD', index: 0 })).toBe(true)
  })

  it('капитан не может открывать карты', () => {
    const g = game({ phase: 'guess' })
    expect(validateIntent(roster, g, 'rs', { type: 'REVEAL_CARD', index: 0 })).toBe(false)
  })

  it('игрок другой команды не может открывать карту', () => {
    const g = game({ phase: 'guess' })
    expect(validateIntent(roster, g, 'bo', { type: 'REVEAL_CARD', index: 0 })).toBe(false)
  })

  it('нельзя дать подсказку в фазе guess и открыть карту в фазе clue', () => {
    expect(validateIntent(roster, game({ phase: 'guess' }), 'rs', { type: 'GIVE_CLUE', word: 'x', count: 1 })).toBe(false)
    expect(validateIntent(roster, game({ phase: 'clue' }), 'ro', { type: 'REVEAL_CARD', index: 0 })).toBe(false)
  })

  it('игрок текущей команды может завершить ход в guess', () => {
    expect(validateIntent(roster, game({ phase: 'guess' }), 'ro', { type: 'END_TURN' })).toBe(true)
  })

  it('неизвестный отправитель отклоняется', () => {
    expect(validateIntent(roster, game(), 'xxx', { type: 'GIVE_CLUE', word: 'x', count: 1 })).toBe(false)
  })

  it('в завершённой игре любые интенты отклоняются', () => {
    const over = game({ phase: 'over', winner: 'red' })
    expect(validateIntent(roster, over, 'rs', { type: 'GIVE_CLUE', word: 'x', count: 1 })).toBe(false)
  })
})
