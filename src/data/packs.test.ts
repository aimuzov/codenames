import { describe, expect, it } from 'vitest'
import { BUILTIN_PACKS, DEFAULT_PACK_IDS, isPlayable, mergeWords, parseWordList } from './packs.ts'
import { BOARD_SIZE } from '../game/index.ts'

describe('parseWordList', () => {
  it('разбивает по переводам строк, запятым и точкам с запятой', () => {
    expect(parseWordList('кот, пёс\nмышь; конь')).toEqual(['кот', 'пёс', 'мышь', 'конь'])
  })

  it('обрезает пробелы и выкидывает пустые', () => {
    expect(parseWordList('  кот  ,\n\n , пёс ,')).toEqual(['кот', 'пёс'])
  })

  it('убирает точные дубли, сохраняя порядок первого вхождения', () => {
    expect(parseWordList('кот\nпёс\nкот')).toEqual(['кот', 'пёс'])
  })

  it('сохраняет словосочетания (не режет по пробелам)', () => {
    expect(parseWordList('красная площадь\nзимний дворец')).toEqual([
      'красная площадь',
      'зимний дворец',
    ])
  })

  it('на пустом вводе возвращает пустой массив', () => {
    expect(parseWordList('   \n , ; ')).toEqual([])
  })
})

describe('mergeWords', () => {
  it('объединяет слова паков и убирает дубли между ними', () => {
    const a = { id: 'a', title: 'A', lang: 'ru', builtin: true, words: ['кот', 'пёс'] }
    const b = { id: 'b', title: 'B', lang: 'ru', builtin: true, words: ['пёс', 'мышь'] }
    expect(mergeWords([a, b])).toEqual(['кот', 'пёс', 'мышь'])
  })

  it('на пустом списке паков возвращает пустой массив', () => {
    expect(mergeWords([])).toEqual([])
  })
})

describe('isPlayable', () => {
  it('пак играбелен при наличии минимум BOARD_SIZE уникальных слов', () => {
    expect(isPlayable(Array.from({ length: BOARD_SIZE }, (_, i) => `w${i}`))).toBe(true)
    expect(isPlayable(Array.from({ length: BOARD_SIZE - 1 }, (_, i) => `w${i}`))).toBe(false)
  })
})

describe('BUILTIN_PACKS', () => {
  it('каждый встроенный пак играбелен сам по себе', () => {
    expect(BUILTIN_PACKS.length).toBeGreaterThan(0)
    for (const pack of BUILTIN_PACKS) {
      expect(isPlayable(pack.words)).toBe(true)
    }
  })

  it('все встроенные паки содержат только уникальные слова', () => {
    for (const pack of BUILTIN_PACKS) {
      expect(new Set(pack.words).size).toBe(pack.words.length)
    }
  })

  it('у встроенных паков уникальные id', () => {
    const ids = BUILTIN_PACKS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('паки из дефолтного выбора существуют', () => {
    const ids = new Set(BUILTIN_PACKS.map((p) => p.id))
    for (const id of DEFAULT_PACK_IDS) {
      expect(ids.has(id)).toBe(true)
    }
  })
})
