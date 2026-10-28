import { createHmac } from 'node:crypto'

import type { IceServer } from '#shared/relay-protocol.ts'

/**
 * ICE-серверы для голосового чата. TURN-доступы устроены по схеме coturn
 * `use-auth-secret`: в имени пользователя зашит срок действия, а пароль —
 * HMAC от имени, поэтому coturn проверяет их одним общим секретом,
 * и хранилища доступов у релея нет.
 */

const TTL_S = 24 * 60 * 60

export type TurnConfig = {
	secret: string | undefined
	/** `turn:`-адреса через запятую. */
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

	// Без секрета релей запущен локально или в e2e: там хватает STUN.
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
