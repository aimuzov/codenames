import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { isCaptainTurn } from '#frontend/state/voice.ts'

describe('автомьют капитана в голосовом чате', () => {
	it('глушит капитана на весь ход его команды: и пока он даёт подсказку, и пока угадывают', () => {
		assert.equal(isCaptainTurn({ currentTeam: 'red', phase: 'clue' }, 'red', 'spymaster'), true)
		assert.equal(isCaptainTurn({ currentTeam: 'red', phase: 'guess' }, 'red', 'spymaster'), true)
	})

	it('в ход соперников капитан говорит свободно', () => {
		assert.equal(isCaptainTurn({ currentTeam: 'blue', phase: 'guess' }, 'red', 'spymaster'), false)
	})

	it('игроков не трогает', () => {
		assert.equal(isCaptainTurn({ currentTeam: 'red', phase: 'guess' }, 'red', 'operative'), false)
	})

	it('после конца партии и до её начала не глушит', () => {
		assert.equal(isCaptainTurn({ currentTeam: 'red', phase: 'over' }, 'red', 'spymaster'), false)
		assert.equal(isCaptainTurn(null, 'red', 'spymaster'), false)
	})
})
