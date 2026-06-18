import { shuffle, type Role, type Rng, type Team } from '@/game/index.ts'
import type { PlayerInfo } from '@/transport/messages.ts'

/**
 * Чистая логика лобби: распределение новых игроков по командам/ролям,
 * ограничение «один капитан на команду» и проверка готовности состава.
 * Без атомов — переиспользуется хостом, гостем и UI.
 */

const TEAMS: readonly Team[] = ['red', 'blue']

/** Есть ли в команде капитан (кроме указанного игрока). */
export function teamHasSpymaster(roster: PlayerInfo[], team: Team, exceptId?: string): boolean {
	return roster.some((p) => p.team === team && p.role === 'spymaster' && p.id !== exceptId)
}

function teamSize(roster: PlayerInfo[], team: Team): number {
	return roster.reduce((n, p) => (p.team === team ? n + 1 : n), 0)
}

/**
 * Подбирает место для нового участника: команда с меньшим числом игроков
 * (при равенстве — та, где ещё нет капитана, иначе red), роль — капитан, если
 * в выбранной команде капитана нет, иначе игрок.
 */
export function pickSlot(roster: PlayerInfo[]): { team: Team; role: Role } {
	const [a, b] = TEAMS as [Team, Team]
	let team: Team
	if (teamSize(roster, a) !== teamSize(roster, b)) {
		team = teamSize(roster, a) < teamSize(roster, b) ? a : b
	} else if (!teamHasSpymaster(roster, a)) {
		team = a
	} else if (!teamHasSpymaster(roster, b)) {
		team = b
	} else {
		team = a
	}
	return { team, role: teamHasSpymaster(roster, team) ? 'operative' : 'spymaster' }
}

/**
 * Приводит запрошенные команду/роль к допустимым: если просят капитана, но в
 * команде уже есть другой капитан, понижает роль до игрока.
 */
export function resolveSetup(
	roster: PlayerInfo[],
	selfId: string,
	team: Team,
	role: Role,
): { team: Team; role: Role } {
	if (role === 'spymaster' && teamHasSpymaster(roster, team, selfId)) {
		return { team, role: 'operative' }
	}
	return { team, role }
}

/**
 * Готов ли состав к старту: в каждой команде среди подключённых игроков есть
 * хотя бы один капитан и хотя бы один игрок.
 */
export function isRosterReady(roster: PlayerInfo[]): boolean {
	const online = roster.filter((p) => p.connected)
	return TEAMS.every(
		(team) =>
			online.some((p) => p.team === team && p.role === 'spymaster') &&
			online.some((p) => p.team === team && p.role === 'operative'),
	)
}

/**
 * Полностью перетасовывает состав: случайно раскидывает всех подключённых игроков
 * (включая хоста) по командам поровну и назначает в каждой команде ровно одного
 * капитана и остальных игроков — результат всегда проходит {@link isRosterReady}.
 * Офлайн-участники остаются в своих командах, но понижаются до игроков, чтобы не
 * удерживать «фантомное» капитанство. При менее чем 4 подключённых ростер не меняется.
 */
export function reshuffleRoster(roster: PlayerInfo[], rng: Rng = Math.random): PlayerInfo[] {
	const connected = roster.filter((p) => p.connected)
	if (connected.length < 4) return roster

	const shuffled = shuffle(connected, rng)
	const redCount = Math.ceil(shuffled.length / 2)
	const slots = new Map<string, { team: Team; role: Role }>()
	shuffled.forEach((p, i) => {
		const team: Team = i < redCount ? 'red' : 'blue'
		const isFirstOfTeam = i === 0 || i === redCount
		slots.set(p.id, { team, role: isFirstOfTeam ? 'spymaster' : 'operative' })
	})

	return roster.map((p) => {
		const slot = slots.get(p.id)
		if (slot) return { ...p, ...slot }
		return p.role === 'spymaster' ? { ...p, role: 'operative' } : p
	})
}

/** Случайная допустимая расстановка, отличная от текущей (капитан — только если слот свободен). */
export function randomSetup(
	roster: PlayerInfo[],
	selfId: string,
	current: { team: Team; role: Role },
	rng: Rng = Math.random,
): { team: Team; role: Role } {
	const candidates: { team: Team; role: Role }[] = []
	for (const team of TEAMS) {
		candidates.push({ team, role: 'operative' })
		if (!teamHasSpymaster(roster, team, selfId)) candidates.push({ team, role: 'spymaster' })
	}
	const others = candidates.filter((c) => c.team !== current.team || c.role !== current.role)
	const pool = others.length > 0 ? others : candidates
	return pool[Math.floor(rng() * pool.length)]!
}
