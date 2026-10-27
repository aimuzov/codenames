import preset from '@aimuzov/infra-site-kit/playwright'
import { defineConfig, devices } from '@playwright/test'

/**
 * e2e-пресет infra-site-kit: Chromium против `astro build && astro preview` по HTTP.
 * PUBLIC_E2E=1 доходит до сборки пресета через окружение: включает тест-хуки
 * сигналинга (см. src/frontend/lib/e2e.ts) и выключает basic-ssl (см. astro.config.mjs).
 */
process.env.PUBLIC_E2E = '1'

// Релей на том же порту, что и на проде за Caddy; preview-сервер проксирует к нему /ws.
const RELAY_PORT = 8787

export default defineConfig(preset, {
	// Сетевые тесты открывают по несколько контекстов с настоящим WebRTC-рукопожатием,
	// параллельно они отбирают друг у друга CPU и падают по таймауту.
	fullyParallel: false,
	workers: 1,
	timeout: 30_000,
	expect: { timeout: 10_000 },

	use: {
		// Сетевые тесты ждут реального WebRTC-рукопожатия — действия не должны спешить.
		actionTimeout: 10_000,
	},

	// Проект пресета с эмуляцией телефона: приложение — PWA под телефон.
	projects: [
		{
			name: 'chromium',
			use: {
				...devices['Pixel 7'],
				// WebRTC между двумя контекстами на одной машине. По умолчанию Chromium прячет локальные
				// IP за mDNS (*.local, в headless не резолвятся) и не предлагает loopback-кандидат, а на
				// машине за VPN единственным host-кандидатом оказывается VPN-интерфейс, по которому два
				// сокета не связываются. Флаги раскрывают реальные IP и разрешают loopback (127.0.0.1) —
				// тогда оба пира находят прямой путь.
				launchOptions: {
					args: [
						'--disable-features=WebRtcHideLocalIpsWithMdns',
						'--allow-loopback-in-peer-connection',
						'--force-webrtc-ip-handling-policy=default',
						// Voice chat: a synthetic mic, and no permission prompt for it.
						'--use-fake-device-for-media-stream',
						'--use-fake-ui-for-media-stream',
					],
				},
			},
		},
	],

	// Тесты онлайн-режима гоняются против локального релея рядом с preview.
	webServer: {
		command: 'node src/backend/server.ts',
		// На обычный GET релей отвечает `ok <число комнат>`, для Playwright это признак жизни.
		url: `http://localhost:${RELAY_PORT}`,
		reuseExistingServer: false,
	},
})
