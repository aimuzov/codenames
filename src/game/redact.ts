import type { GameState, RedactedCard, RedactedState, Role } from './types.ts'

/**
 * Готовит состояние к отправке игроку с данной ролью.
 * Капитан видит весь ключ; игрок — тип лишь у уже открытых карт.
 * Это граница анти-чита: закрытые цвета не покидают хост для игроков.
 */
export function redactStateForRole(state: GameState, role: Role): RedactedState {
  const cards: RedactedCard[] = state.cards.map((c) => ({
    word: c.word,
    revealed: c.revealed,
    type: role === 'spymaster' || c.revealed ? c.type : null,
    openedBy: c.openedBy,
  }))
  return { ...state, cards }
}
