import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'

import { openApp } from './helpers/app'
import { mobileCtx } from './helpers/net'

/**
 * Онлайн-режим: комната на WS-релее (см. src/backend/server.ts). Проверяем то, ради чего он появился —
 * связь чинится сама, без хождения с камерой: обрыв сети имитируем `context.setOffline`.
 */

async function openPeers(browser: Browser, n: number) {
	const ctxs = await Promise.all(
		Array.from({ length: n }, () => browser.newContext({ ...mobileCtx, permissions: ['microphone'] })),
	)
	const pages = await Promise.all(ctxs.map((c) => c.newPage()))

	return { ctxs, pages }
}

/** Хост открывает комнату и возвращает её код. */
async function hostRoom(host: Page): Promise<string> {
	await openApp(host)
	await host.getByRole('button', { name: 'Играть' }).click()
	await host.getByRole('button', { name: 'Лобби' }).click()
	await host.getByRole('button', { name: 'Создать' }).click()
	const code = host.getByTestId('room-code')

	await expect(code).toBeVisible({ timeout: 20_000 })

	return (await code.textContent()) ?? ''
}

/** Гость входит в комнату по коду. */
async function joinRoom(guest: Page, code: string) {
	await openApp(guest)
	await guest.getByRole('button', { name: 'Играть' }).click()
	await guest.getByRole('button', { name: 'Лобби' }).click()
	await guest.getByRole('button', { name: 'Подключиться' }).click()
	await guest.getByRole('button', { name: 'Войти по коду' }).click()
	await guest.getByRole('textbox').fill(code)
	await guest.getByRole('button', { name: 'Войти' }).click()
	await expect(guest.getByText('Подключено ✓')).toBeVisible({ timeout: 20_000 })
}

type VoiceStat = { id: string; state: RTCPeerConnectionState; receiving: boolean }

/** Voice mesh connections of a page, via the e2e hook in state/voice.ts. */
function voiceStats(page: Page): Promise<VoiceStat[]> {
	return page.evaluate(() => (window as unknown as { __e2eVoice: () => VoiceStat[] }).__e2eVoice())
}

/** Имитация сна устройства: сеть пропадает, затем возвращается. */
async function blink(ctx: BrowserContext, page: Page, offlineWhile: () => Promise<void>) {
	await ctx.setOffline(true)
	await offlineWhile()
	await ctx.setOffline(false)
	// Транспорт просыпается по событию online, но подстрахуемся видимостью вкладки.
	await page.bringToFront()
}

test.describe('онлайн-режим (релей)', () => {
	test('вход по коду комнаты и автоматический возврат после обрыва', async ({ browser }) => {
		const { ctxs, pages } = await openPeers(browser, 2)
		const [host, guest] = pages

		try {
			const code = await hostRoom(host!)

			expect(code).toMatch(/^[A-Z2-9]{6}$/)

			await joinRoom(guest!, code)
			await guest!.getByRole('radio', { name: 'Синие' }).click()
			await guest!.getByRole('radio', { name: 'Капитан' }).click()
			await expect(host!.getByRole('listitem')).toHaveCount(2)

			// Телефон гостя ушёл в сон — сеть пропала.
			await blink(ctxs[1]!, guest!, async () => {
				await expect(guest!.getByText('Соединение потеряно')).toBeVisible({ timeout: 30_000 })
			})

			// Возвращается сам: ни QR, ни кнопок — и на своём месте.
			await expect(guest!.getByText('Подключено ✓')).toBeVisible({ timeout: 30_000 })
			await expect(host!.getByRole('listitem')).toHaveCount(2)
			await expect(host!.getByRole('listitem').filter({ hasText: 'капитан' })).toHaveCount(2)
		} finally {
			await Promise.all(ctxs.map((c) => c.close()))
		}
	})

	test('уснувший хост возвращается в свою комнату — гости остаются на местах', async ({ browser }) => {
		const { ctxs, pages } = await openPeers(browser, 2)
		const [host, guest] = pages

		try {
			const code = await hostRoom(host!)

			await joinRoom(guest!, code)
			await expect(host!.getByRole('listitem')).toHaveCount(2)

			// Уснул хост: гость видит потерю связи, но остаётся в приложении.
			await blink(ctxs[0]!, host!, async () => {
				await expect(guest!.getByText('Соединение потеряно')).toBeVisible({ timeout: 30_000 })
			})

			// Хост занимает ту же комнату, гость представляется заново — состав прежний.
			await expect(host!.getByTestId('room-code')).toHaveText(code, { timeout: 30_000 })
			await expect(guest!.getByText('Подключено ✓')).toBeVisible({ timeout: 30_000 })
			await expect(host!.getByRole('listitem')).toHaveCount(2)
		} finally {
			await Promise.all(ctxs.map((c) => c.close()))
		}
	})

	test('голосовой чат: оба слышат друг друга, мьют и выход видны в составе', async ({ browser }) => {
		const { ctxs, pages } = await openPeers(browser, 2)
		const [host, guest] = pages

		try {
			const code = await hostRoom(host!)

			await joinRoom(guest!, code)
			await host!.getByRole('button', { name: 'Войти в голосовой чат' }).click()
			await guest!.getByRole('button', { name: 'Войти в голосовой чат' }).click()

			// Each side hears the other: the connection is up and the remote track is attached.
			for (const page of [host!, guest!]) {
				await expect
					.poll(() => voiceStats(page), { timeout: 20_000 })
					.toEqual([expect.objectContaining({ state: 'connected', receiving: true })])
			}

			await expect(host!.getByTestId('voice-live')).toHaveCount(2)

			await guest!.getByRole('button', { name: 'Выключить микрофон' }).click()
			await expect(host!.getByTestId('voice-muted')).toHaveCount(1)

			await guest!.getByRole('button', { name: 'Выйти из голосового чата' }).click()
			await expect(host!.getByTestId('voice-live')).toHaveCount(1)
			await expect.poll(() => voiceStats(host!), { timeout: 15_000 }).toEqual([])
		} finally {
			await Promise.all(ctxs.map((c) => c.close()))
		}
	})
})
