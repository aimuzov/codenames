import { BOARD_SIZE } from '../game/index.ts'
import ruAnimals from './packs/ru-animals.json'
import ruNature from './packs/ru-nature.json'
import ruPeople from './packs/ru-people.json'
import ruCity from './packs/ru-city.json'
import ruMusic from './packs/ru-music.json'
import ruSport from './packs/ru-sport.json'
import ruFantasy from './packs/ru-fantasy.json'
import ruScience from './packs/ru-science.json'
import ruSpace from './packs/ru-space.json'
import ruFood from './packs/ru-food.json'
import ruCars from './packs/ru-cars.json'
import ruMemes from './packs/ru-memes.json'
import ruHiking from './packs/ru-hiking.json'

export interface WordPack {
  id: string
  title: string
  lang: string
  /** true — встроенный пак, false — пользовательский (IndexedDB). */
  builtin: boolean
  words: string[]
}

/** Встроенные паки сгруппированы по темам — их и миксуют по 3-5 за раз. */
export const BUILTIN_PACKS: WordPack[] = [
  { id: 'ru-animals', title: 'Животные', lang: 'ru', builtin: true, words: ruAnimals },
  { id: 'ru-nature', title: 'Природа и стихии', lang: 'ru', builtin: true, words: ruNature },
  { id: 'ru-people', title: 'Люди и профессии', lang: 'ru', builtin: true, words: ruPeople },
  { id: 'ru-city', title: 'Город и транспорт', lang: 'ru', builtin: true, words: ruCity },
  { id: 'ru-music', title: 'Музыка и искусство', lang: 'ru', builtin: true, words: ruMusic },
  { id: 'ru-sport', title: 'Спорт и игры', lang: 'ru', builtin: true, words: ruSport },
  { id: 'ru-fantasy', title: 'Фэнтези и мифы', lang: 'ru', builtin: true, words: ruFantasy },
  { id: 'ru-science', title: 'Наука и техника', lang: 'ru', builtin: true, words: ruScience },
  { id: 'ru-space', title: 'Космос', lang: 'ru', builtin: true, words: ruSpace },
  { id: 'ru-food', title: 'Еда и напитки', lang: 'ru', builtin: true, words: ruFood },
  { id: 'ru-cars', title: 'Машины', lang: 'ru', builtin: true, words: ruCars },
  { id: 'ru-memes', title: 'Мемы', lang: 'ru', builtin: true, words: ruMemes },
  { id: 'ru-hiking', title: 'Походы', lang: 'ru', builtin: true, words: ruHiking },
]

/** Паки, выбранные по умолчанию, — стартовый микс из трёх тем. */
export const DEFAULT_PACK_IDS = ['ru-animals', 'ru-nature', 'ru-food']

/** Разбирает пользовательский текст в список слов: разделители — перенос строки, запятая, `;`. */
export function parseWordList(text: string): string[] {
  const words = text
    .split(/[\n,;]+/)
    .map((w) => w.trim())
    .filter(Boolean)
  return [...new Set(words)]
}

/** Объединяет слова нескольких паков, убирая дубли. */
export function mergeWords(packs: WordPack[]): string[] {
  return [...new Set(packs.flatMap((p) => p.words))]
}

/** Пак можно использовать в одиночку, если в нём хватает уникальных слов на поле. */
export function isPlayable(words: string[]): boolean {
  return new Set(words).size >= BOARD_SIZE
}

export { BOARD_SIZE }
