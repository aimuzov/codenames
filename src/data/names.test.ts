import { describe, expect, it } from 'vitest'
import { NAMES, randomName } from './names.ts'

describe('randomName', () => {
	it('rng=0 возвращает первый элемент словаря', () => {
		expect(randomName(() => 0)).toBe(NAMES[0])
	})

	it('rng→1 возвращает последний элемент словаря', () => {
		expect(randomName(() => 0.999999)).toBe(NAMES[NAMES.length - 1])
	})

	it('всегда возвращает имя из словаря', () => {
		for (const r of [0, 0.25, 0.5, 0.75, 0.99]) {
			expect(NAMES).toContain(randomName(() => r))
		}
	})
})

describe('NAMES', () => {
	it('не содержит дублей', () => {
		expect(new Set(NAMES).size).toBe(NAMES.length)
	})

	it('не пустой', () => {
		expect(NAMES.length).toBeGreaterThan(0)
	})
})
