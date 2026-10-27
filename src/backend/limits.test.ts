import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { clientIp, createLimits, ipKey } from '#backend/limits.ts'

describe('адрес клиента для лимитов', () => {
	it('без доверенного прокси игнорирует X-Forwarded-For', () => {
		assert.equal(clientIp('203.0.113.5', '198.51.100.1', false), '203.0.113.5')
	})

	it('за прокси берёт последний адрес из X-Forwarded-For', () => {
		assert.equal(clientIp('172.18.0.2', '6.6.6.6, 198.51.100.1', true), '198.51.100.1')
		assert.equal(clientIp('172.18.0.2', ['6.6.6.6', '198.51.100.1'], true), '198.51.100.1')
	})

	it('за прокси без заголовка берёт адрес сокета', () => {
		assert.equal(clientIp('::ffff:127.0.0.1', undefined, true), '127.0.0.1')
		assert.equal(clientIp(undefined, '', true), 'unknown')
	})

	it('IPv6 сводит к /64, IPv4-mapped разворачивает', () => {
		assert.equal(ipKey('2001:db8:1:2:aaaa::1'), '2001:db8:1:2::/64')
		assert.equal(ipKey('2001:0db8:0001:0002:ffff:ffff:ffff:ffff'), '2001:db8:1:2::/64')
		assert.equal(ipKey('2001:db8::5'), '2001:db8:0:0::/64')
		assert.equal(ipKey('::1'), '0:0:0:0::/64')
		assert.equal(ipKey('::FFFF:10.0.0.1'), '10.0.0.1')
		assert.equal(ipKey('10.0.0.1'), '10.0.0.1')
	})
})

describe('лимиты по IP', () => {
	const config = { maxConnections: 2, maxTurn: 3, turnWindowMs: 1000 }

	it('ограничивает одновременные соединения и отпускает место при закрытии', () => {
		const limits = createLimits(config)

		assert.ok(limits.connect('a'))
		assert.ok(limits.connect('a'))
		assert.equal(limits.connect('a'), false)
		assert.ok(limits.connect('b'))

		limits.disconnect('a')
		assert.ok(limits.connect('a'))
	})

	it('отказанное соединение не занимает место', () => {
		const limits = createLimits(config)

		limits.connect('a')
		limits.connect('a')
		limits.connect('a')
		limits.disconnect('a')
		limits.disconnect('a')

		assert.equal(limits.tracked(), 0)
	})

	it('выдаёт TURN не чаще лимита в скользящем окне', () => {
		const limits = createLimits(config)

		assert.ok(limits.allowTurn('a', 0))
		assert.ok(limits.allowTurn('a', 400))
		assert.ok(limits.allowTurn('a', 800))
		assert.equal(limits.allowTurn('a', 900), false)
		assert.ok(limits.allowTurn('b', 900))

		// Первая выдача выпала из окна — освободилось одно место, отказ места не занимал.
		assert.ok(limits.allowTurn('a', 1000))
		assert.equal(limits.allowTurn('a', 1100), false)
	})

	it('забывает адреса с опустевшим окном', () => {
		const limits = createLimits(config)

		limits.allowTurn('a', 0)
		limits.allowTurn('b', 500)
		limits.sweep(1200)

		assert.equal(limits.tracked(), 1)
		limits.sweep(1500)
		assert.equal(limits.tracked(), 0)
	})
})
