import type { GameEvent, RedactedState, Role, Team } from '@/game/index.ts'

/** Публичная информация об игроке (для лобби). */
export interface PlayerInfo {
	id: string
	name: string
	team: Team
	role: Role
	connected: boolean
}

/** Сообщения хост → клиент. */
export type HostMessage =
	| { t: 'welcome'; youId: string }
	| { t: 'lobby'; players: PlayerInfo[]; started: boolean }
	| { t: 'state'; state: RedactedState }

/** Сообщения клиент → хост. */
export type ClientMessage =
	| { t: 'hello'; name: string }
	| { t: 'setup'; team: Team; role: Role }
	| { t: 'intent'; event: GameEvent }
