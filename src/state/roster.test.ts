import { describe, expect, it } from 'vitest'
import {
	isRosterReady,
	pickSlot,
	randomSetup,
	reshuffleRoster,
	resolveSetup,
	teamHasSpymaster,
} from './roster.ts'
import type { Role, Team } from '@/game/index.ts'
import type { PlayerInfo } from '@/transport/messages.ts'

let seq = 0
function player(team: Team, role: Role, connected = true): PlayerInfo {
	return { id: `p${seq++}`, name: 'Игрок', team, role, connected }
}

/** Детерминированный rng (mulberry32) для воспроизводимых перетасовок в тестах. */
function makeRng(seed: number): () => number {
	let a = seed >>> 0
	return () => {
		a = (a + 0x6d2b79f5) | 0
		let t = Math.imul(a ^ (a >>> 15), 1 | a)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

function spymastersOf(roster: PlayerInfo[], team: Team): PlayerInfo[] {
	return roster.filter((p) => p.team === team && p.role === 'spymaster')
}

const full: PlayerInfo[] = [
	{ id: 'rs', name: 'КрасныйКап', team: 'red', role: 'spymaster', connected: true },
	{ id: 'ro', name: 'КрасныйОп', team: 'red', role: 'operative', connected: true },
	{ id: 'bs', name: 'СинийКап', team: 'blue', role: 'spymaster', connected: true },
	{ id: 'bo', name: 'СинийОп', team: 'blue', role: 'operative', connected: true },
]

describe('teamHasSpymaster', () => {
	it('видит капитана команды и исключает указанного игрока', () => {
		expect(teamHasSpymaster(full, 'red')).toBe(true)
		expect(teamHasSpymaster(full, 'red', 'rs')).toBe(false)
		expect(teamHasSpymaster(full, 'blue', 'rs')).toBe(true)
	})
})

describe('pickSlot', () => {
	it('первый игрок (пустой ростер) — красный капитан', () => {
		expect(pickSlot([])).toEqual({ team: 'red', role: 'spymaster' })
	})

	it('второй игрок попадает в пустую команду капитаном', () => {
		const roster = [player('red', 'spymaster')]
		expect(pickSlot(roster)).toEqual({ team: 'blue', role: 'spymaster' })
	})

	it('третий и четвёртый добивают игроков в обе команды', () => {
		const roster = [player('red', 'spymaster'), player('blue', 'spymaster')]
		const third = pickSlot(roster)
		expect(third.role).toBe('operative')
		roster.push(player(third.team, third.role))
		const fourth = pickSlot(roster)
		expect(fourth.role).toBe('operative')
		roster.push(player(fourth.team, fourth.role))
		// По итогу — корректный 4-составный ростер.
		expect(isRosterReady(roster)).toBe(true)
	})

	it('садит в команду с меньшим числом игроков', () => {
		const roster = [player('red', 'spymaster'), player('red', 'operative')]
		expect(pickSlot(roster).team).toBe('blue')
	})
})

describe('resolveSetup', () => {
	it('понижает второго капитана команды до игрока', () => {
		const roster = [player('red', 'spymaster')]
		expect(resolveSetup(roster, 'newbie', 'red', 'spymaster')).toEqual({
			team: 'red',
			role: 'operative',
		})
	})

	it('не трогает капитана, если в команде нет другого капитана', () => {
		const roster = [player('red', 'operative')]
		expect(resolveSetup(roster, 'newbie', 'red', 'spymaster')).toEqual({
			team: 'red',
			role: 'spymaster',
		})
	})

	it('позволяет игроку остаться капитаном своей команды', () => {
		expect(resolveSetup(full, 'rs', 'red', 'spymaster')).toEqual({ team: 'red', role: 'spymaster' })
	})

	it('пропускает игрока без изменений', () => {
		expect(resolveSetup(full, 'x', 'red', 'operative')).toEqual({ team: 'red', role: 'operative' })
	})
})

describe('isRosterReady', () => {
	it('false при одном капитане', () => {
		expect(isRosterReady([player('red', 'spymaster')])).toBe(false)
	})

	it('false, если в команде нет игрока', () => {
		const roster = [
			player('red', 'spymaster'),
			player('blue', 'spymaster'),
			player('red', 'operative'),
		]
		expect(isRosterReady(roster)).toBe(false)
	})

	it('true для полного 4-составного ростера', () => {
		expect(isRosterReady(full)).toBe(true)
	})

	it('не учитывает отключённых игроков', () => {
		const roster = [
			player('red', 'spymaster'),
			player('red', 'operative'),
			player('blue', 'spymaster'),
			player('blue', 'operative', false),
		]
		expect(isRosterReady(roster)).toBe(false)
	})
})

describe('randomSetup', () => {
	it('никогда не назначает второго капитана в занятую команду', () => {
		const roster = [player('red', 'spymaster'), player('blue', 'spymaster')]
		// Доступны только red/blue-operative. Из синего всегда уходим в красный.
		const current = { team: 'blue' as Team, role: 'operative' as Role }
		expect(randomSetup(roster, 'me', current, () => 0)).toEqual({ team: 'red', role: 'operative' })
		expect(randomSetup(roster, 'me', current, () => 0.99)).toEqual({
			team: 'red',
			role: 'operative',
		})
	})

	it('может выдать капитана, если команда свободна', () => {
		// current=red-operative исключается; rng=0 → первый из оставшихся (red-spymaster).
		expect(randomSetup([], 'me', { team: 'red', role: 'operative' }, () => 0)).toEqual({
			team: 'red',
			role: 'spymaster',
		})
	})

	it('не повторяет текущий вариант ни при каком rng', () => {
		const combos: { team: Team; role: Role }[] = [
			{ team: 'red', role: 'operative' },
			{ team: 'red', role: 'spymaster' },
			{ team: 'blue', role: 'operative' },
			{ team: 'blue', role: 'spymaster' },
		]
		for (const current of combos) {
			for (const rng of [0, 0.25, 0.5, 0.75, 0.99]) {
				expect(randomSetup([], 'me', current, () => rng)).not.toEqual(current)
			}
		}
	})

	it('переключает команду, когда оба капитана заняты', () => {
		const roster = [player('red', 'spymaster'), player('blue', 'spymaster')]
		expect(randomSetup(roster, 'me', { team: 'red', role: 'operative' }, () => 0)).toEqual({
			team: 'blue',
			role: 'operative',
		})
	})
})

describe('reshuffleRoster', () => {
	it('возвращает ростер без изменений, если подключённых меньше 4', () => {
		const roster = [
			player('red', 'spymaster'),
			player('blue', 'spymaster'),
			player('red', 'operative'),
		]
		expect(reshuffleRoster(roster, makeRng(1))).toEqual(roster)
	})

	it('всегда даёт валидный сбалансированный состав (4–8 игроков, много сидов)', () => {
		for (let n = 4; n <= 8; n++) {
			const roster = Array.from({ length: n }, (_, i) =>
				player(i % 2 === 0 ? 'red' : 'blue', 'operative'),
			)
			for (let seed = 0; seed < 25; seed++) {
				const next = reshuffleRoster(roster, makeRng(seed))
				expect(isRosterReady(next)).toBe(true)
				// ровно один капитан на команду
				expect(spymastersOf(next, 'red')).toHaveLength(1)
				expect(spymastersOf(next, 'blue')).toHaveLength(1)
				// все игроки сохранены
				expect([...next].map((p) => p.id).sort()).toEqual(roster.map((p) => p.id).sort())
			}
		}
	})

	it('перетасовывает хоста наравне со всеми', () => {
		const roster = [
			{ id: 'host', name: 'Хост', team: 'red' as Team, role: 'spymaster' as Role, connected: true },
			player('blue', 'spymaster'),
			player('red', 'operative'),
			player('blue', 'operative'),
		]
		const moved = Array.from({ length: 30 }, (_, s) => reshuffleRoster(roster, makeRng(s))).some(
			(r) => {
				const h = r.find((p) => p.id === 'host')!
				return h.team !== 'red' || h.role !== 'spymaster'
			},
		)
		expect(moved).toBe(true)
	})

	it('детерминирован при одинаковом rng', () => {
		const roster = [
			player('red', 'spymaster'),
			player('blue', 'spymaster'),
			player('red', 'operative'),
			player('blue', 'operative'),
		]
		expect(reshuffleRoster(roster, makeRng(7))).toEqual(reshuffleRoster(roster, makeRng(7)))
	})

	it('офлайн-игрока оставляет в его команде, но снимает капитанство', () => {
		const roster = [
			player('red', 'spymaster'),
			player('red', 'operative'),
			player('blue', 'spymaster'),
			player('blue', 'operative'),
			{
				id: 'off',
				name: 'Офлайн',
				team: 'blue' as Team,
				role: 'spymaster' as Role,
				connected: false,
			},
		]
		const next = reshuffleRoster(roster, makeRng(3))
		const off = next.find((p) => p.id === 'off')!
		expect(off.connected).toBe(false)
		expect(off.team).toBe('blue')
		expect(off.role).toBe('operative')
		// баланс среди подключённых сохранён
		expect(isRosterReady(next)).toBe(true)
	})
})
