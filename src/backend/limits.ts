import { isIPv6 } from 'node:net'

/**
 * Per-client-IP limits of the relay. Without accounts a client can rejoin under fresh ids
 * forever, and every join mints new TURN credentials, each worth coturn's `user-quota`
 * allocations: enough identities exhaust the relay ports for everyone. Limits are keyed by
 * the address instead, which a client can't change as cheaply as an id.
 *
 * Pure bookkeeping: the caller passes the clock, nothing here touches sockets.
 */

export type LimitsConfig = {
	/** Concurrent WebSocket connections per IP. */
	maxConnections: number
	/** TURN credentials per IP within the sliding window; past it the client gets STUN only. */
	maxTurn: number
	turnWindowMs: number
}

export const DEFAULT_LIMITS: LimitsConfig = {
	maxConnections: 32,
	maxTurn: 20,
	turnWindowMs: 10 * 60 * 1000,
}

/**
 * The address limits are keyed by. Behind the proxy (Caddy in prod) the socket address is the
 * proxy itself, so the client comes from `X-Forwarded-For`. Only its last entry is the proxy's
 * own word: anything to the left the client may have sent itself. Without a trusted proxy the
 * header is ignored altogether, otherwise any client could pick its own key.
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
 * IPv4 as is, IPv4-mapped IPv6 unwrapped, other IPv6 cut to its /64: a single subscriber
 * usually gets a whole /64 and could rotate addresses inside it at will.
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
	/** Issue times within the window, oldest first. */
	const issued = new Map<string, number[]>()

	function recent(ip: string, now: number): number[] {
		const times = (issued.get(ip) ?? []).filter((t) => now - t < config.turnWindowMs)

		if (times.length) issued.set(ip, times)
		else issued.delete(ip)

		return times
	}

	return {
		/** Counts a new connection in; false means over the limit and nothing is counted. */
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

		/** Whether this IP may get TURN credentials now; a yes is counted against it. */
		allowTurn(ip: string, now: number): boolean {
			const times = recent(ip, now)

			if (times.length >= config.maxTurn) return false

			times.push(now)
			issued.set(ip, times)

			return true
		},

		/** Drops IPs whose window has emptied, so idle addresses don't pile up. */
		sweep(now: number) {
			for (const ip of issued.keys()) recent(ip, now)
		},

		/** How many IPs are tracked at all. */
		tracked(): number {
			return new Set([...connections.keys(), ...issued.keys()]).size
		},
	}
}
