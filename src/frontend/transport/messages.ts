import type { GameEvent, RedactedState, Role, Team } from '#frontend/game/index.ts'

/** Публичная информация об игроке (для лобби). */
export type PlayerInfo = {
	id: string
	name: string
	team: Team
	role: Role
	connected: boolean
	/** In the voice chat: the mesh connects only to players who have this set. */
	voice?: boolean
	/** Mic off, by hand or by the spymaster auto-mute. */
	muted?: boolean
}

/**
 * Сообщения хост → клиент.
 * `ping` — пульс: замороженный сном вебвью часто не присылает close, и тишина в канале
 * оказывается единственным признаком обрыва (см. heartbeat в net.ts).
 */
export type HostMessage =
	| { t: 'welcome'; youId: string }
	| { t: 'lobby'; players: PlayerInfo[]; started: boolean }
	| { t: 'state'; state: RedactedState }
	| { t: 'ping' }

/** Сообщения клиент → хост. */
export type ClientMessage =
	// id — стабильный идентификатор устройства: по нему хост узнаёт вернувшегося игрока.
	| { t: 'hello'; id: string; name: string }
	| { t: 'setup'; team: Team; role: Role }
	| { t: 'intent'; event: GameEvent }
	| { t: 'voice'; on: boolean; muted: boolean }
	| { t: 'ping' }
