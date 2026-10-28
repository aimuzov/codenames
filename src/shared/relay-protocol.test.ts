import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { inviteUrl, isRoomCode, normalizeRoomCode, parseRoomCode, ROOM_CODE_ALPHABET } from '#shared/relay-protocol.ts'

describe('код комнаты', () => {
	it('приводит ввод к каноническому виду: регистр, пробелы, дефисы', () => {
		assert.equal(normalizeRoomCode(' abc-234 '), 'ABC234')
		assert.equal(normalizeRoomCode('a b c 2 3 4'), 'ABC234')
	})

	it('выбрасывает символы, которых нет в алфавите (0/O и 1/I путают при диктовке)', () => {
		// Ноль и единицу в кодах не выдаём, так что и на вводе они лишние.
		assert.equal(normalizeRoomCode('AB0C1D'), 'ABCD')
	})

	it('валидным считает ровно шесть символов алфавита', () => {
		assert.equal(isRoomCode('ABC234'), true)
		assert.equal(isRoomCode('ABC23'), false)
		assert.equal(isRoomCode('ABC2345'), false)
		assert.equal(isRoomCode('ABC01D'), false)
	})

	it('в алфавите нет похожих друг на друга знаков', () => {
		for (const c of '01IO') assert.ok(!ROOM_CODE_ALPHABET.includes(c))
	})
})

describe('ссылка-приглашение', () => {
	it('собирает ссылку из адреса сайта и кода', () => {
		assert.equal(
			inviteUrl('https://codenames.aimuzov.online', 'ABC234'),
			'https://codenames.aimuzov.online/?room=ABC234',
		)
	})

	it('достаёт код из голого ввода', () => {
		assert.equal(parseRoomCode('ABC234'), 'ABC234')
		assert.equal(parseRoomCode(' abc-234 '), 'ABC234')
	})

	it('достаёт код из ссылки, а не из букв адреса', () => {
		assert.equal(parseRoomCode(inviteUrl('https://codenames.aimuzov.online', 'ABC234')), 'ABC234')
		assert.equal(parseRoomCode('http://localhost:4321/?room=abc234'), 'ABC234')
	})

	it('без кода возвращает null', () => {
		assert.equal(parseRoomCode('https://codenames.aimuzov.online/'), null)
		assert.equal(parseRoomCode('https://codenames.aimuzov.online/?room=XYZ'), null)
		assert.equal(parseRoomCode('привет'), null)
	})
})
