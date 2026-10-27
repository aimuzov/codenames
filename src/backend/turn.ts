import { createHmac } from 'node:crypto'

import type { IceServer } from '#shared/relay-protocol.ts'

/**
 * ICE servers for the voice chat. TURN credentials follow coturn's
 * `use-auth-secret` scheme: the username carries its own expiry, the password
 * is an HMAC of it, so coturn checks them with the shared secret alone and
 * the relay keeps no credential store.
 */

const TTL_S = 24 * 60 * 60

export type TurnConfig = {
	secret: string | undefined
	/** Comma-separated `turn:` URLs. */
	urls: string | undefined
	stun: string
}

export function turnConfigFromEnv(env: NodeJS.ProcessEnv = process.env): TurnConfig {
	return {
		secret: env.TURN_SECRET || undefined,
		urls: env.TURN_URLS || undefined,
		stun: env.STUN_URL || 'stun:stun.l.google.com:19302',
	}
}

export function iceServers(config: TurnConfig, id: string, now = Date.now()): IceServer[] {
	const servers: IceServer[] = [{ urls: config.stun }]

	// Without a secret the relay runs locally or in e2e: STUN is enough there.
	if (!config.secret || !config.urls) return servers

	const username = `${Math.floor(now / 1000) + TTL_S}:${id}`
	const credential = createHmac('sha1', config.secret).update(username).digest('base64')
	const urls = config.urls
		.split(',')
		.map((u) => u.trim())
		.filter(Boolean)

	servers.push({ urls, username, credential })

	return servers
}
