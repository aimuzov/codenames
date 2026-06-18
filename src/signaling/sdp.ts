import type { SignalDescription } from './types.ts'

/**
 * Минимизация WebRTC SDP для DataChannel-соединения.
 *
 * Полный SDP от браузера (~600 символов) почти весь шаблонный. Передаём только
 * существенные поля (тип, ICE-логин/пароль, отпечаток DTLS, setup, кандидаты),
 * а на другой стороне пересобираем валидный SDP из шаблона. Это сокращает код
 * до ~180 символов — QR становится заметно проще, а ручной ввод реальнее.
 *
 * Проверено: реальный браузер принимает пересобранный SDP (setRemoteDescription
 * + createAnswer проходят без ошибок) для offer и answer.
 */

const SETUP_CODE: Record<string, string> = { actpass: '0', active: '1', passive: '2' }
const SETUP_NAME = ['actpass', 'active', 'passive'] as const
const SEP = '~'
const CAND_SEP = '|'

/** Отбрасывает нестандартные хвосты кандидата (generation/network-cost/ufrag), сохраняя обязательную часть. */
function trimCandidate(candidate: string): string {
	const parts = candidate.split(' ')
	// foundation component transport priority address port "typ" type  (= 8 токенов)
	let end = 8
	if (parts[8] === 'raddr') end = 12 // + raddr <ip> rport <port> для srflx/relay
	return parts.slice(0, end).join(' ')
}

/**
 * Оставляет только полезные на локальной сети кандидаты, чтобы QR не раздувался:
 * UDP, без IPv6 (двоеточие в адресе), без loopback и link-local. Остаются IPv4-
 * host и mDNS (`*.local`) — этого достаточно для соединения по одному Wi-Fi.
 */
function isUsefulCandidate(candidate: string): boolean {
	const p = candidate.split(' ')
	if ((p[2] ?? '').toLowerCase() !== 'udp') return false
	const addr = p[4] ?? ''
	if (addr.includes(':')) return false // IPv6
	if (addr.startsWith('127.') || addr.startsWith('169.254.')) return false // loopback / link-local
	return true
}

/** Сужает список кандидатов: фильтр + дедуп по адресу и порту (с запасным вариантом, если фильтр всё убрал). */
function selectCandidates(all: string[]): string[] {
	const useful = all.filter(isUsefulCandidate)
	const source = useful.length ? useful : all
	const seen = new Set<string>()
	return source.filter((c) => {
		const p = c.split(' ')
		const key = `${p[4] ?? ''}:${p[5] ?? ''}`
		if (seen.has(key)) return false
		seen.add(key)
		return true
	})
}

export function minifySdp(desc: SignalDescription): string {
	const sdp = desc.sdp
	const get = (re: RegExp) => sdp.match(re)?.[1] ?? ''
	const allCandidates = [...sdp.matchAll(/a=candidate:(.+)/g)].map((m) =>
		trimCandidate(m[1]!.trim()),
	)
	const candidates = selectCandidates(allCandidates)
	return [
		'M',
		desc.type === 'offer' ? '0' : '1',
		get(/a=ice-ufrag:(\S+)/),
		get(/a=ice-pwd:(\S+)/),
		get(/a=fingerprint:sha-256 ([0-9A-Fa-f:]+)/).replace(/:/g, ''),
		SETUP_CODE[get(/a=setup:(\w+)/)] ?? '0',
		candidates.join(CAND_SEP),
	].join(SEP)
}

export function expandSdp(code: string): SignalDescription {
	const [tag, t, ufrag, pwd, fpHex, setup, candsJoined] = code.split(SEP)
	if (tag !== 'M' || !ufrag || !pwd || !fpHex) {
		throw new Error('Некорректный код подключения')
	}
	const fingerprint = (fpHex.match(/.{2}/g) ?? []).join(':').toUpperCase()
	const candidates = candsJoined ? candsJoined.split(CAND_SEP) : []
	const lines = [
		'v=0',
		'o=- 4611731400430051336 2 IN IP4 127.0.0.1',
		's=-',
		't=0 0',
		'a=group:BUNDLE 0',
		'a=extmap-allow-mixed',
		'a=msid-semantic: WMS',
		'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
		'c=IN IP4 0.0.0.0',
		...candidates.map((c) => 'a=candidate:' + c),
		'a=ice-ufrag:' + ufrag,
		'a=ice-pwd:' + pwd,
		'a=ice-options:trickle',
		'a=fingerprint:sha-256 ' + fingerprint,
		'a=setup:' + (SETUP_NAME[Number(setup)] ?? 'actpass'),
		'a=mid:0',
		'a=sctp-port:5000',
		'a=max-message-size:262144',
	]
	return { type: t === '0' ? 'offer' : 'answer', sdp: lines.join('\r\n') + '\r\n' }
}

/** Признак минифицированного кода. */
export const isMinifiedSignal = (text: string) => text.trimStart().startsWith('M' + SEP)
