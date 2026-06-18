import type { GameEvent, GameState, Role } from '../game/index.ts'
import type { PlayerInfo } from '../transport/messages.ts'

/**
 * Проверяет на хосте, вправе ли отправитель совершить действие:
 * подсказку даёт капитан текущей команды в фазе clue, карты открывает и ход
 * завершает игрок текущей команды в фазе guess.
 */
export function validateIntent(
  roster: PlayerInfo[],
  game: GameState,
  senderId: string,
  event: GameEvent,
): boolean {
  if (game.phase === 'over') return false
  const sender = roster.find((p) => p.id === senderId)
  if (!sender || sender.team !== game.currentTeam) return false

  const requirePhase = (phase: GameState['phase'], role: Role) =>
    game.phase === phase && sender.role === role

  switch (event.type) {
    case 'GIVE_CLUE':
      return requirePhase('clue', 'spymaster')
    case 'REVEAL_CARD':
    case 'END_TURN':
      return requirePhase('guess', 'operative')
  }
}
