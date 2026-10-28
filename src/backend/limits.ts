import { isIPv6 } from 'node:net'

/**
 * Лимиты релея на IP клиента. Аккаунтов нет, поэтому клиент может бесконечно перевходить под
 * новыми id, а каждый вход выписывает новые TURN-доступы, и каждый стоит `user-quota` аллокаций
 * coturn: набрав достаточно личностей, можно занять порты релея для всех. Поэтому ключ лимитов —
 * адрес, его клиент не сменит так же дёшево, как id.
 *
 * Чистый учёт: время передаёт вызывающий, сокетов здесь ничто не касается.
 */

export type LimitsConfig = {
	/** Одновременные WebSocket-соединения на IP. */
	maxConnections: number
	/** TURN-доступы на IP в скользящем окне; сверх этого клиент получает только STUN. */
	maxTurn: number
	turnWindowMs: number
}

export const DEFAULT_LIMITS: LimitsConfig = {
	maxConnections: 32,
	maxTurn: 20,
	turnWindowMs: 10 * 60 * 1000,
}

/**
 * Адрес, по которому считаются лимиты. За прокси (в проде это Caddy) адрес сокета — это сам
 * прокси, поэтому клиента берём из `X-Forwarded-For`. Только последняя запись в нём от самого
 * прокси: всё, что левее, клиент мог прислать сам. Без доверенного прокси заголовок не смотрим
 * вовсе, иначе любой клиент мог бы выбрать себе ключ сам.
 */
export function clientIp(
	remoteAddress: string | undefined,
	forwardedFor: string | string[] | undefined,
	trustProxy: boolean,
): string {
	const header = Array.isArray(forwardedFor) ? forwardedFor.join(',') : forwardedFor
	const forwarded = trustProxy ? header?.split(',').at(-1)?.trim() : undefined

	return ipKey(forwarded || remoteAddress || 'unknown')
}

/**
 * IPv4 как есть, IPv4-mapped IPv6 разворачиваем, остальной IPv6 обрезаем до /64: одному абоненту
 * обычно выдают целую /64, и внутри неё он может менять адреса сколько угодно.
 */
export function ipKey(ip: string): string {
	const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)

	if (mapped) return mapped[1]

	if (!isIPv6(ip)) return ip

	const [head, tail] = ip.toLowerCase().split('::')
	const left = head ? head.split(':') : []
	const right = tail ? tail.split(':') : []
	const zeros = tail === undefined ? [] : Array(8 - left.length - right.length).fill('0')
	const groups = [...left, ...zeros, ...right].map((g) => g.replace(/^0+(?=.)/, ''))

	return `${groups.slice(0, 4).join(':')}::/64`
}

export function createLimits(config: LimitsConfig = DEFAULT_LIMITS) {
	const connections = new Map<string, number>()
	/** Моменты выдачи в пределах окна, самые старые первыми. */
	const issued = new Map<string, number[]>()

	function recent(ip: string, now: number): number[] {
		const times = (issued.get(ip) ?? []).filter((t) => now - t < config.turnWindowMs)

		if (times.length) issued.set(ip, times)
		else issued.delete(ip)

		return times
	}

	return {
		/** Засчитывает новое соединение; `false` — лимит превышен, и ничего не засчитано. */
		connect(ip: string): boolean {
			const count = connections.get(ip) ?? 0

			if (count >= config.maxConnections) return false

			connections.set(ip, count + 1)

			return true
		},

		disconnect(ip: string) {
			const count = connections.get(ip) ?? 0

			if (count > 1) connections.set(ip, count - 1)
			else connections.delete(ip)
		},

		/** Можно ли этому IP сейчас получить TURN-доступы; каждое «да» идёт ему в счёт. */
		allowTurn(ip: string, now: number): boolean {
			const times = recent(ip, now)

			if (times.length >= config.maxTurn) return false

			times.push(now)
			issued.set(ip, times)

			return true
		},

		/** Выкидывает IP с опустевшим окном, чтобы простаивающие адреса не копились. */
		sweep(now: number) {
			for (const ip of issued.keys()) recent(ip, now)
		},

		/** Сколько IP отслеживается всего. */
		tracked(): number {
			return new Set([...connections.keys(), ...issued.keys()]).size
		},
	}
}
