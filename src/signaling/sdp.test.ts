import { describe, expect, it } from 'vitest'
import { expandSdp, isMinifiedSignal, minifySdp } from './sdp.ts'

const FP =
  'FD:45:51:1E:9B:15:1A:22:D8:13:F1:97:F5:E9:B3:46:79:63:B7:CC:17:50:88:4A:AE:D1:30:9C:28:AC:09:D2'

const fullOffer = {
  type: 'offer' as const,
  sdp:
    [
      'v=0',
      'o=- 8443117100110074629 2 IN IP4 127.0.0.1',
      's=-',
      't=0 0',
      'a=group:BUNDLE 0',
      'a=extmap-allow-mixed',
      'a=msid-semantic: WMS',
      'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
      'c=IN IP4 0.0.0.0',
      'a=candidate:101278190 1 udp 2113937151 37d389a6-af47-438d-aa1d-eff810022811.local 60215 typ host generation 0 network-cost 999',
      'a=ice-ufrag:1Zic',
      'a=ice-pwd:igoyy8MlxdhKBktfxwyBxkak',
      'a=ice-options:trickle',
      'a=fingerprint:sha-256 ' + FP,
      'a=setup:actpass',
      'a=mid:0',
      'a=sctp-port:5000',
      'a=max-message-size:262144',
    ].join('\r\n') + '\r\n',
}

describe('minifySdp', () => {
  it('кодирует существенные поля компактной строкой с префиксом M~', () => {
    const code = minifySdp(fullOffer)
    expect(code.startsWith('M~0~1Zic~igoyy8MlxdhKBktfxwyBxkak~')).toBe(true)
  })

  it('срезает нестандартный хвост кандидата (generation/network-cost)', () => {
    const code = minifySdp(fullOffer)
    expect(code).toContain('37d389a6-af47-438d-aa1d-eff810022811.local 60215 typ host')
    expect(code).not.toContain('generation')
    expect(code).not.toContain('network-cost')
  })

  it('заметно короче полного SDP', () => {
    expect(minifySdp(fullOffer).length).toBeLessThan(fullOffer.sdp.length / 2)
  })

  it('отбрасывает лишние кандидаты (IPv6, loopback, не-UDP, дубли), оставляя LAN/mDNS', () => {
    const many = {
      type: 'offer' as const,
      sdp:
        fullOffer.sdp.replace(
          'a=candidate:101278190 1 udp 2113937151 37d389a6-af47-438d-aa1d-eff810022811.local 60215 typ host generation 0 network-cost 999',
          [
            'a=candidate:1 1 udp 2113937151 192.168.1.5 50000 typ host',
            'a=candidate:1 1 udp 2113937151 192.168.1.5 50000 typ host', // дубль
            'a=candidate:2 1 tcp 2105458943 192.168.1.5 9 typ host', // tcp — отбросить
            'a=candidate:3 1 udp 2113937151 fe80::1 50001 typ host', // IPv6 — отбросить
            'a=candidate:4 1 udp 2113937151 127.0.0.1 50002 typ host', // loopback — отбросить
          ].join('\r\n'),
        ),
    }
    const code = minifySdp(many)
    expect(code).toContain('192.168.1.5 50000 typ host')
    expect(code).not.toContain('tcp')
    expect(code).not.toContain('fe80')
    expect(code).not.toContain('127.0.0.1')
    // остаётся ровно один кандидат (дубль схлопнут)
    expect(code.split('192.168.1.5').length - 1).toBe(1)
  })
})

describe('expandSdp', () => {
  it('восстанавливает валидный SDP с теми же ICE-данными и отпечатком', () => {
    const sdp = expandSdp(minifySdp(fullOffer)).sdp
    expect(sdp).toContain('a=ice-ufrag:1Zic')
    expect(sdp).toContain('a=ice-pwd:igoyy8MlxdhKBktfxwyBxkak')
    expect(sdp).toContain('a=fingerprint:sha-256 ' + FP)
    expect(sdp).toContain('a=setup:actpass')
    expect(sdp).toContain('m=application 9 UDP/DTLS/SCTP webrtc-datachannel')
    expect(sdp).toContain('a=sctp-port:5000')
    expect(sdp).toContain('a=candidate:101278190 1 udp 2113937151')
  })

  it('сохраняет тип offer/answer', () => {
    expect(expandSdp(minifySdp(fullOffer)).type).toBe('offer')
    const answer = { ...fullOffer, type: 'answer' as const, sdp: fullOffer.sdp.replace('actpass', 'active') }
    const expanded = expandSdp(minifySdp(answer))
    expect(expanded.type).toBe('answer')
    expect(expanded.sdp).toContain('a=setup:active')
  })

  it('бросает ошибку на повреждённом коде', () => {
    expect(() => expandSdp('мусор')).toThrow()
    expect(() => expandSdp('M~0~~~~0~')).toThrow()
  })
})

describe('isMinifiedSignal', () => {
  it('распознаёт компактный формат', () => {
    expect(isMinifiedSignal(minifySdp(fullOffer))).toBe(true)
    expect(isMinifiedSignal('eJxabc123')).toBe(false)
  })
})
