import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HostMessage } from '@/transport/messages.ts'

// Перехватываем колбэк, который гость регистрирует через onMessage,
// чтобы вручную «доставлять» ему сообщения хоста.
let deliver: ((msg: HostMessage) => void) | null = null

vi.mock('@/transport/webrtc.ts', () => {
	class GuestConnection {
		onMessage(cb: (msg: HostMessage) => void) {
			deliver = cb
		}
		onOpen() {}
		onClose() {}
		createOfferCode() {
			return Promise.resolve('offer')
		}
		acceptAnswerCode() {
			return Promise.resolve()
		}
		send() {}
		close() {}
	}
	// HostConnection в гостевом сценарии не создаётся — нужен лишь как импортируемый символ.
	return { GuestConnection, HostConnection: class { close() {} } }
})

const { startJoining } = await import('./net.ts')
const { isOverAtom, remoteViewAtom, modeAtom } = await import('./session.ts')
const { screenAtom } = await import('./ui.ts')
const { createGame, redactStateForRole } = await import('@/game/index.ts')

const words = Array.from({ length: 25 }, (_, i) => `слово${i}`)
const players = [{ id: 'g1', name: 'Гость', team: 'red' as const, role: 'operative' as const, connected: true }]

describe('гость: переходы доски при старте/рестарте партии', () => {
	beforeEach(() => {
		// Атомы — модульные синглтоны, сбрасываем состояние между тестами.
		deliver = null
		screenAtom.set('home')
		remoteViewAtom.set(null)
		modeAtom.set('local')
	})

	it('новый state после финала убирает оверлей победы (рестарт)', () => {
		startJoining('Гость')
		expect(deliver).toBeTruthy()

		deliver!({ t: 'welcome', youId: 'g1' })
		deliver!({ t: 'lobby', players, started: true })

		// Первая партия дошла до конца — хост прислал over-состояние.
		const overGame = { ...createGame({ words, startingTeam: 'red' }), phase: 'over' as const, winner: 'red' as const }
		deliver!({ t: 'state', state: redactStateForRole(overGame, 'operative') })

		expect(screenAtom()).toBe('board')
		expect(isOverAtom()).toBe(true) // оверлей победы показан

		// РЕСТАРТ: хост жмёт «Новая игра» → рассылает lobby(started) + свежий state.
		const fresh = createGame({ words, startingTeam: 'blue' })
		deliver!({ t: 'lobby', players, started: true })
		deliver!({ t: 'state', state: redactStateForRole(fresh, 'operative') })

		expect(remoteViewAtom()?.phase).toBe('clue')
		expect(isOverAtom()).toBe(false) // оверлей должен исчезнуть
	})

	it('lobby(started) без state не уводит гостя на пустую доску — переход по приходу state', () => {
		startJoining('Гость')
		deliver!({ t: 'welcome', youId: 'g1' })
		deliver!({ t: 'lobby', players, started: false })

		// Хост стартует: первым приходит lobby(started). state ещё в пути.
		deliver!({ t: 'lobby', players, started: true })

		// Гость ждёт состояние, а не висит на пустой доске (раньше тут было view === null
		// на экране board → Board дёргал goTo('home') и гостя выкидывало).
		expect(remoteViewAtom()).toBeNull()
		expect(screenAtom()).not.toBe('board')

		// Приходит состояние — теперь есть, что показать: переходим на доску.
		deliver!({ t: 'state', state: redactStateForRole(createGame({ words, startingTeam: 'red' }), 'operative') })
		expect(screenAtom()).toBe('board')
		expect(remoteViewAtom()).not.toBeNull()
	})
})
