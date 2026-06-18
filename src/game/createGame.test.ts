import { describe, expect, it } from 'vitest'
import { createGame } from './createGame.ts'
import type { CardType, Rng } from './types.ts'

/** Пул из 30 уникальных слов для тестов. */
const WORDS = Array.from({ length: 30 }, (_, i) => `слово${i + 1}`)

/** Детерминированный RNG (всегда 0) — берёт первые элементы, не тасует. */
const rngZero: Rng = () => 0

function countTypes(types: CardType[]): Record<CardType, number> {
	return types.reduce((acc, t) => ({ ...acc, [t]: acc[t] + 1 }), {
		red: 0,
		blue: 0,
		neutral: 0,
		assassin: 0,
	})
}

describe('createGame', () => {
	it('раздаёт ровно 25 карт', () => {
		const state = createGame({ words: WORDS, startingTeam: 'red' }, rngZero)
		expect(state.cards).toHaveLength(25)
	})

	it('распределяет типы 9/8/7/1 в пользу стартовой команды (red)', () => {
		const state = createGame({ words: WORDS, startingTeam: 'red' }, rngZero)
		const counts = countTypes(state.cards.map((c) => c.type))
		expect(counts).toEqual({ red: 9, blue: 8, neutral: 7, assassin: 1 })
	})

	it('распределяет 9 карт стартовой команде blue', () => {
		const state = createGame({ words: WORDS, startingTeam: 'blue' }, rngZero)
		const counts = countTypes(state.cards.map((c) => c.type))
		expect(counts).toEqual({ red: 8, blue: 9, neutral: 7, assassin: 1 })
	})

	it('начинает в фазе подсказки, ход у стартовой команды, без победителя', () => {
		const state = createGame({ words: WORDS, startingTeam: 'red' }, rngZero)
		expect(state.phase).toBe('clue')
		expect(state.currentTeam).toBe('red')
		expect(state.startingTeam).toBe('red')
		expect(state.winner).toBeNull()
		expect(state.clue).toBeNull()
	})

	it('все карты изначально закрыты', () => {
		const state = createGame({ words: WORDS, startingTeam: 'red' }, rngZero)
		expect(state.cards.every((c) => !c.revealed)).toBe(true)
	})

	it('начинает с пустым логом таймлайна', () => {
		const state = createGame({ words: WORDS, startingTeam: 'red' }, rngZero)
		expect(state.log).toEqual([])
	})

	it('использует только слова из пула, без повторов', () => {
		const state = createGame({ words: WORDS, startingTeam: 'red' }, rngZero)
		const used = state.cards.map((c) => c.word)
		expect(new Set(used).size).toBe(25)
		expect(used.every((w) => WORDS.includes(w))).toBe(true)
	})

	it('бросает ошибку, если в пуле меньше 25 слов', () => {
		expect(() => createGame({ words: WORDS.slice(0, 24), startingTeam: 'red' }, rngZero)).toThrow()
	})

	it('выбирает стартовую команду через RNG, если не задана', () => {
		// rng < 0.5 -> red, иначе blue (детерминированно проверяем обе ветки)
		const red = createGame({ words: WORDS }, () => 0)
		const blue = createGame({ words: WORDS }, () => 0.99)
		expect(red.startingTeam).toBe('red')
		expect(blue.startingTeam).toBe('blue')
	})
})
