import { detectWinner, otherTeam } from './rules.ts'
import type { Card, GameEvent, GameState, LogEntry } from './types.ts'

/**
 * Чистый редьюсер партии: применяет событие, возвращая новое состояние.
 * Поверх результата дописывает запись таймлайна (`log`); `at` — метка времени
 * (мс epoch), которую проставляет применятель события (в тестах по умолчанию 0).
 */
export function reducer(state: GameState, event: GameEvent, at = 0): GameState {
	if (state.phase === 'over') return state
	const next = apply(state, event)
	// Тот же ref — событие невалидно/ничего не изменило, лог не трогаем.
	if (next === state) return state
	const entry = logEntryFor(state, event, at)
	return entry ? { ...next, log: [...next.log, entry] } : next
}

/** Применение события без логирования (прежняя чистая логика). */
function apply(state: GameState, event: GameEvent): GameState {
	switch (event.type) {
		case 'GIVE_CLUE':
			return giveClue(state, event.word, event.count)
		case 'REVEAL_CARD':
			return revealCard(state, event.index)
		case 'END_TURN':
			return state.phase === 'guess' ? endTurn(state) : state
	}
}

/**
 * Запись таймлайна для применённого события, исходя из состояния ДО него
 * (там видны открывшая команда и тип открываемой карты). Вызывается только
 * когда событие реально изменило состояние.
 */
function logEntryFor(state: GameState, event: GameEvent, at: number): LogEntry | null {
	switch (event.type) {
		case 'GIVE_CLUE':
			return { kind: 'clue', team: state.currentTeam, word: event.word, count: event.count, at }
		case 'REVEAL_CARD': {
			const card = state.cards[event.index]!
			return { kind: 'reveal', team: state.currentTeam, word: card.word, type: card.type, at }
		}
		case 'END_TURN':
			return { kind: 'pass', team: state.currentTeam, at }
	}
}

function giveClue(state: GameState, word: string, count: number): GameState {
	if (state.phase !== 'clue') return state
	if (!word.trim() || !Number.isInteger(count) || count < 1) return state
	return {
		...state,
		clue: { word, count, team: state.currentTeam },
		phase: 'guess',
		guessesRemaining: count + 1,
	}
}

function revealCard(state: GameState, index: number): GameState {
	if (state.phase !== 'guess') return state
	const target = state.cards[index]
	if (!target || target.revealed) return state

	const cards: Card[] = state.cards.map((c, i) =>
		i === index ? { ...c, revealed: true, openedBy: state.currentTeam } : c,
	)

	// Ассасин — мгновенный проигрыш открывшей команды.
	if (target.type === 'assassin') {
		return {
			...state,
			cards,
			phase: 'over',
			winner: otherTeam(state.currentTeam),
			guessesRemaining: 0,
		}
	}

	// Открыли последнюю карту какой-то команды — она побеждает (даже если открыл соперник).
	const winner = detectWinner(cards)
	if (winner) {
		return { ...state, cards, phase: 'over', winner, guessesRemaining: 0 }
	}

	// Верная карта своей команды — тратим попытку, ход продолжается пока есть попытки.
	if (target.type === state.currentTeam) {
		const guessesRemaining = state.guessesRemaining - 1
		return guessesRemaining > 0
			? { ...state, cards, guessesRemaining }
			: { ...endTurn(state), cards }
	}

	// Нейтральная или карта соперника — ход переходит.
	return { ...endTurn(state), cards }
}

/** Передача хода: смена команды, сброс подсказки и попыток. */
function endTurn(state: GameState): GameState {
	return {
		...state,
		currentTeam: otherTeam(state.currentTeam),
		phase: 'clue',
		clue: null,
		guessesRemaining: 0,
		// Запоминаем поданную подсказку как «прошлую» для этой команды — покажем её в её следующем бонусе.
		prevClueWord: state.clue
			? { ...state.prevClueWord, [state.clue.team]: state.clue.word }
			: state.prevClueWord,
	}
}
