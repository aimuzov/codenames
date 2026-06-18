import { action, atom } from '@reatom/core'

const KEY = 'codenames.settings'

interface Persisted {
	sound: boolean
	timer: number
	cardWordSize: string
	hideRevealedWords: boolean
}

function load(): Partial<Persisted> {
	try {
		return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Persisted>
	} catch {
		return {}
	}
}

const saved = load()

export const soundEnabledAtom = atom(saved.sound ?? true, 'soundEnabled')
/** Длительность хода в секундах; 0 — без таймера. */
export const timerSecondsAtom = atom(saved.timer ?? 0, 'timerSeconds')

export const TIMER_OPTIONS = [0, 60, 120, 180] as const

/** Размер слова на карте (font-size). */
export const CARD_WORD_SIZES = ['11px', '13px', '15px', '17px'] as const
export type CardWordSize = (typeof CARD_WORD_SIZES)[number]

const DEFAULT_CARD_WORD_SIZE: CardWordSize = '13px'

function normalizeSize(v: unknown): CardWordSize {
	return (CARD_WORD_SIZES as readonly string[]).includes(v as string)
		? (v as CardWordSize)
		: DEFAULT_CARD_WORD_SIZE
}

export const cardWordSizeAtom = atom<CardWordSize>(
	normalizeSize(saved.cardWordSize),
	'cardWordSize',
)

/** Прятать слова на открытых картах, заменяя их иконкой по типу. */
export const hideRevealedWordsAtom = atom(saved.hideRevealedWords ?? false, 'hideRevealedWords')

/** Применяет размер слова к <html> через CSS-переменную. */
export function applyCardWordSize(size: CardWordSize = cardWordSizeAtom()): void {
	document.documentElement.style.setProperty('--card-word-size', size)
}

function persist() {
	try {
		localStorage.setItem(
			KEY,
			JSON.stringify({
				sound: soundEnabledAtom(),
				timer: timerSecondsAtom(),
				cardWordSize: cardWordSizeAtom(),
				hideRevealedWords: hideRevealedWordsAtom(),
			}),
		)
	} catch {
		// приватный режим / нет доступа — настройки просто не сохранятся
	}
}

export const setSound = action((v: boolean) => {
	soundEnabledAtom.set(v)
	persist()
}, 'setSound')

export const setTimer = action((v: number) => {
	timerSecondsAtom.set(v)
	persist()
}, 'setTimer')

export const setCardWordSize = action((v: CardWordSize) => {
	cardWordSizeAtom.set(v)
	persist()
	applyCardWordSize(v)
}, 'setCardWordSize')

export const setHideRevealedWords = action((v: boolean) => {
	hideRevealedWordsAtom.set(v)
	persist()
}, 'setHideRevealedWords')
