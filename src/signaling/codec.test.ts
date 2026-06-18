import { describe, expect, it } from 'vitest'
import { decodeSignal, encodeSignal } from './codec.ts'

const fullOffer = {
	type: 'offer' as const,
	sdp:
		[
			'v=0',
			'o=- 4611731400430051336 2 IN IP4 127.0.0.1',
			's=-',
			't=0 0',
			'a=group:BUNDLE 0',
			'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
			'c=IN IP4 0.0.0.0',
			'a=candidate:1 1 udp 2113937151 172.20.10.3 54321 typ host',
			'a=ice-ufrag:abcd',
			'a=ice-pwd:0123456789abcdef0123456789',
			'a=fingerprint:sha-256 AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99',
			'a=setup:actpass',
			'a=mid:0',
			'a=sctp-port:5000',
			'a=max-message-size:262144',
		].join('\r\n') + '\r\n',
}

describe('codec сигналинга', () => {
	it('кодирует в компактную сжатую строку из QR-alphanumeric набора', () => {
		const encoded = encodeSignal(fullOffer)
		expect(encoded.length).toBeLessThan(fullOffer.sdp.length / 2)
		// Base45 целиком входит в alphanumeric-режим QR — символы только из этого набора.
		expect(encoded).toMatch(/^[0-9A-Z $%*+\-./:]+$/)
	})

	it('roundtrip сохраняет тип и существенные ICE-поля', () => {
		const decoded = decodeSignal(encodeSignal(fullOffer))
		expect(decoded.type).toBe('offer')
		expect(decoded.sdp).toContain('a=ice-ufrag:abcd')
		expect(decoded.sdp).toContain('a=ice-pwd:0123456789abcdef0123456789')
		expect(decoded.sdp).toContain('a=candidate:1 1 udp 2113937151 172.20.10.3 54321 typ host')
	})

	it('decode мусора бросает ошибку', () => {
		expect(() => decodeSignal('не-валидная-строка!!!')).toThrow()
	})
})
