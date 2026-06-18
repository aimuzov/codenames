import { describe, expect, it } from 'vitest'
import { reducer } from './reducer.ts'
import type { Card, CardType, GameState } from './types.ts'

/** Строит поле из явного списка типов. Слова — w0, w1, ... */
function board(types: CardType[]): Card[] {
  return types.map((type, i) => ({ word: `w${i}`, type, revealed: false }))
}

/** Базовое состояние в фазе подсказки для red. */
function clueState(types: CardType[]): GameState {
  return {
    cards: board(types),
    startingTeam: 'red',
    currentTeam: 'red',
    phase: 'clue',
    clue: null,
    guessesRemaining: 0,
    prevClueWord: { red: null, blue: null },
    winner: null,
    log: [],
  }
}

/** Состояние в фазе угадывания (после подсказки count). */
function guessState(types: CardType[], count: number): GameState {
  return {
    ...clueState(types),
    phase: 'guess',
    clue: { word: 'подсказка', count, team: 'red' },
    guessesRemaining: count + 1,
  }
}

// Удобный мини-расклад: индексы 0,1 — red; 2,3 — blue; 4 — neutral; 5 — assassin.
const LAYOUT: CardType[] = ['red', 'red', 'blue', 'blue', 'neutral', 'assassin']

describe('reducer / GIVE_CLUE', () => {
  it('в фазе подсказки задаёт подсказку и переводит в угадывание с count+1 попытками', () => {
    const next = reducer(clueState(LAYOUT), { type: 'GIVE_CLUE', word: 'река', count: 2 })
    expect(next.phase).toBe('guess')
    expect(next.clue).toEqual({ word: 'река', count: 2, team: 'red' })
    expect(next.guessesRemaining).toBe(3)
  })

  it('игнорируется вне фазы подсказки', () => {
    const s = guessState(LAYOUT, 1)
    expect(reducer(s, { type: 'GIVE_CLUE', word: 'x', count: 1 })).toBe(s)
  })

  it('игнорирует некорректный count (< 1) и пустое слово', () => {
    const s = clueState(LAYOUT)
    expect(reducer(s, { type: 'GIVE_CLUE', word: 'x', count: 0 })).toBe(s)
    expect(reducer(s, { type: 'GIVE_CLUE', word: '  ', count: 2 })).toBe(s)
  })
})

describe('reducer / REVEAL_CARD', () => {
  it('верная карта своей команды открывается и тратит попытку, ход продолжается', () => {
    const next = reducer(guessState(LAYOUT, 2), { type: 'REVEAL_CARD', index: 0 })
    expect(next.cards[0]!.revealed).toBe(true)
    expect(next.phase).toBe('guess')
    expect(next.currentTeam).toBe('red')
    expect(next.guessesRemaining).toBe(2)
  })

  it('исчерпание попыток на верной карте передаёт ход (без победы)', () => {
    // 3 красных, чтобы открытие двух не завершило команду. count=1 -> 2 попытки.
    const s = guessState(['red', 'red', 'red', 'blue', 'neutral', 'assassin'], 1)
    const afterFirst = reducer(s, { type: 'REVEAL_CARD', index: 0 }) // 1 попытка осталась
    const afterSecond = reducer(afterFirst, { type: 'REVEAL_CARD', index: 1 }) // 0 -> пас
    expect(afterSecond.phase).toBe('clue')
    expect(afterSecond.currentTeam).toBe('blue')
    expect(afterSecond.clue).toBeNull()
    expect(afterSecond.guessesRemaining).toBe(0)
  })

  it('нейтральная карта завершает ход', () => {
    const next = reducer(guessState(LAYOUT, 3), { type: 'REVEAL_CARD', index: 4 })
    expect(next.cards[4]!.revealed).toBe(true)
    expect(next.phase).toBe('clue')
    expect(next.currentTeam).toBe('blue')
    expect(next.clue).toBeNull()
  })

  it('карта соперника открывается и завершает ход', () => {
    const next = reducer(guessState(LAYOUT, 3), { type: 'REVEAL_CARD', index: 2 })
    expect(next.cards[2]!.revealed).toBe(true)
    expect(next.currentTeam).toBe('blue')
    expect(next.phase).toBe('clue')
  })

  it('ассасин — мгновенный проигрыш, побеждает соперник', () => {
    const next = reducer(guessState(LAYOUT, 3), { type: 'REVEAL_CARD', index: 5 })
    expect(next.phase).toBe('over')
    expect(next.winner).toBe('blue')
    expect(next.cards[5]!.revealed).toBe(true)
  })

  it('открытие последней карты своей команды — победа', () => {
    // Откроем index 0 заранее, останется одна красная (index 1)
    const s = guessState(LAYOUT, 3)
    const opened: GameState = {
      ...s,
      cards: s.cards.map((c, i) => (i === 0 ? { ...c, revealed: true } : c)),
    }
    const next = reducer(opened, { type: 'REVEAL_CARD', index: 1 })
    expect(next.phase).toBe('over')
    expect(next.winner).toBe('red')
  })

  it('открытие последней карты соперника отдаёт победу сопернику', () => {
    const s = guessState(LAYOUT, 3)
    const opened: GameState = {
      ...s,
      cards: s.cards.map((c, i) => (i === 2 ? { ...c, revealed: true } : c)),
    }
    const next = reducer(opened, { type: 'REVEAL_CARD', index: 3 })
    expect(next.phase).toBe('over')
    expect(next.winner).toBe('blue')
  })

  it('игнорирует уже открытую карту, неверный индекс и фазу не-угадывания', () => {
    const s = guessState(LAYOUT, 2)
    const opened: GameState = {
      ...s,
      cards: s.cards.map((c, i) => (i === 0 ? { ...c, revealed: true } : c)),
    }
    expect(reducer(opened, { type: 'REVEAL_CARD', index: 0 })).toBe(opened)
    expect(reducer(s, { type: 'REVEAL_CARD', index: 99 })).toBe(s)
    const cs = clueState(LAYOUT)
    expect(reducer(cs, { type: 'REVEAL_CARD', index: 0 })).toBe(cs)
  })
})

describe('reducer / END_TURN', () => {
  it('в угадывании передаёт ход и очищает подсказку', () => {
    const next = reducer(guessState(LAYOUT, 2), { type: 'END_TURN' })
    expect(next.phase).toBe('clue')
    expect(next.currentTeam).toBe('blue')
    expect(next.clue).toBeNull()
    expect(next.guessesRemaining).toBe(0)
  })

  it('игнорируется вне фазы угадывания', () => {
    const s = clueState(LAYOUT)
    expect(reducer(s, { type: 'END_TURN' })).toBe(s)
  })

  it('запоминает поданную подсказку как прошлую для этой команды (для бонуса)', () => {
    const afterClue = reducer(clueState(LAYOUT), { type: 'GIVE_CLUE', word: 'река', count: 2 })
    // В первый ход прошлой подсказки ещё нет.
    expect(afterClue.prevClueWord.red).toBeNull()
    // После передачи хода запоминаем «реку» как прошлую подсказку красных.
    const afterTurn = reducer(afterClue, { type: 'END_TURN' })
    expect(afterTurn.prevClueWord.red).toBe('река')
    expect(afterTurn.prevClueWord.blue).toBeNull()
  })
})

describe('reducer / общее', () => {
  it('игнорирует любые события в завершённой игре', () => {
    const over: GameState = { ...clueState(LAYOUT), phase: 'over', winner: 'red' }
    expect(reducer(over, { type: 'GIVE_CLUE', word: 'x', count: 1 })).toBe(over)
    expect(reducer(over, { type: 'REVEAL_CARD', index: 0 })).toBe(over)
    expect(reducer(over, { type: 'END_TURN' })).toBe(over)
  })

  it('не мутирует входное состояние', () => {
    const s = guessState(LAYOUT, 2)
    const snapshot = JSON.stringify(s)
    reducer(s, { type: 'REVEAL_CARD', index: 0 })
    expect(JSON.stringify(s)).toBe(snapshot)
  })
})

describe('reducer / log (таймлайн)', () => {
  it('GIVE_CLUE добавляет запись подсказки с командой, словом и числом', () => {
    const next = reducer(clueState(LAYOUT), { type: 'GIVE_CLUE', word: 'река', count: 2 }, 1000)
    expect(next.log).toEqual([{ kind: 'clue', team: 'red', word: 'река', count: 2, at: 1000 }])
  })

  it('невалидная подсказка не добавляет запись в лог', () => {
    const s = clueState(LAYOUT)
    expect(reducer(s, { type: 'GIVE_CLUE', word: '  ', count: 2 }).log).toEqual([])
    expect(reducer(s, { type: 'GIVE_CLUE', word: 'x', count: 0 }).log).toEqual([])
  })

  it('REVEAL_CARD добавляет запись открытия с истинным типом и открывшей командой', () => {
    const next = reducer(guessState(LAYOUT, 2), { type: 'REVEAL_CARD', index: 0 }, 2000)
    expect(next.log).toEqual([{ kind: 'reveal', team: 'red', word: 'w0', type: 'red', at: 2000 }])
  })

  it('повторное открытие карты не добавляет запись в лог', () => {
    const s = guessState(LAYOUT, 2)
    const opened: GameState = {
      ...s,
      cards: s.cards.map((c, i) => (i === 0 ? { ...c, revealed: true } : c)),
    }
    expect(reducer(opened, { type: 'REVEAL_CARD', index: 0 })).toBe(opened)
  })

  it('явный END_TURN в угадывании добавляет запись «пас»', () => {
    const next = reducer(guessState(LAYOUT, 2), { type: 'END_TURN' }, 3000)
    expect(next.log).toEqual([{ kind: 'pass', team: 'red', at: 3000 }])
  })

  it('авто-передача хода после неверной карты не создаёт лишний «пас» (только открытие)', () => {
    // index 4 — нейтральная, ход переходит автоматически.
    const next = reducer(guessState(LAYOUT, 3), { type: 'REVEAL_CARD', index: 4 })
    expect(next.log).toEqual([{ kind: 'reveal', team: 'red', word: 'w4', type: 'neutral', at: 0 }])
  })

  it('накапливает записи по ходу партии в порядке событий', () => {
    const s0 = clueState(LAYOUT)
    const s1 = reducer(s0, { type: 'GIVE_CLUE', word: 'река', count: 2 }, 100)
    const s2 = reducer(s1, { type: 'REVEAL_CARD', index: 0 }, 200) // верная red, ход продолжается
    const s3 = reducer(s2, { type: 'REVEAL_CARD', index: 4 }, 300) // нейтральная, пас
    expect(s3.log).toEqual([
      { kind: 'clue', team: 'red', word: 'река', count: 2, at: 100 },
      { kind: 'reveal', team: 'red', word: 'w0', type: 'red', at: 200 },
      { kind: 'reveal', team: 'red', word: 'w4', type: 'neutral', at: 300 },
    ])
  })
})
