import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { describe, it } from 'node:test'

import { iceServers, turnConfigFromEnv } from '#backend/turn.ts'

describe('ICE-серверы голосового чата', () => {
	it('без секрета отдаёт только STUN', () => {
		const servers = iceServers(turnConfigFromEnv({}), 'guest-1')

		assert.deepEqual(servers, [{ urls: 'stun:stun.l.google.com:19302' }])
	})

	it('выдаёт временные креды TURN по схеме coturn use-auth-secret', () => {
		const config = turnConfigFromEnv({
			TURN_SECRET: 's3cret',
			TURN_URLS: 'turn:turn.example.com:3478?transport=udp, turn:turn.example.com:3478?transport=tcp',
		})
		const now = 1_700_000_000_000
		const [, turn] = iceServers(config, 'host', now)
		const username = `${1_700_000_000 + 24 * 60 * 60}:host`

		assert.deepEqual(turn, {
			urls: ['turn:turn.example.com:3478?transport=udp', 'turn:turn.example.com:3478?transport=tcp'],
			username,
			credential: createHmac('sha1', 's3cret').update(username).digest('base64'),
		})
	})
})
