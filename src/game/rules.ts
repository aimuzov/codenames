import type { Card, Team } from './types.ts'

export const otherTeam = (team: Team): Team => (team === 'red' ? 'blue' : 'red')

/** Сколько карт команды ещё не открыто. */
export function remainingFor(cards: readonly Card[], team: Team): number {
	return cards.filter((c) => c.type === team && !c.revealed).length
}

/** Команда, у которой открыты все карты (победитель), либо null. */
export function detectWinner(cards: readonly Card[]): Team | null {
	if (remainingFor(cards, 'red') === 0) return 'red'
	if (remainingFor(cards, 'blue') === 0) return 'blue'
	return null
}

/** Текущий счёт: сколько карт каждой команды осталось открыть. */
export function score(cards: readonly Card[]): Record<Team, number> {
	return { red: remainingFor(cards, 'red'), blue: remainingFor(cards, 'blue') }
}
