<script lang="ts">
	import '@aimuzov/infra-site-kit/theme-peek.css'
	import { themePeek } from '@aimuzov/infra-site-kit/theme-peek.js'
	import ChevronRight from '@lucide/svelte/icons/chevron-right'
	import Moon from '@lucide/svelte/icons/moon'
	import RefreshCw from '@lucide/svelte/icons/refresh-cw'
	import Sun from '@lucide/svelte/icons/sun'
	import SunMoon from '@lucide/svelte/icons/sun-moon'
	import TimerOff from '@lucide/svelte/icons/timer-off'

	import { previewSound } from '#frontend/audio/sfx.ts'
	import CardTile from '#frontend/components/game/card-tile.svelte'
	import Screen from '#frontend/components/screen.svelte'
	import TopBar from '#frontend/components/top-bar.svelte'
	import Badge from '#frontend/components/ui/badge.svelte'
	import Button from '#frontend/components/ui/button.svelte'
	import Card from '@aimuzov/infra-site-kit/ui/card.svelte'
	import Switch from '#frontend/components/ui/switch.svelte'
	import { LATEST } from '#frontend/data/changelog.ts'
	import { hasUnseenChangelogAtom } from '#frontend/state/changelog.ts'
	import { APP_VERSION, BUILD_TIME, checkForUpdate, updateStatusAtom } from '#frontend/state/pwa.ts'
	import {
		CARD_WORD_SIZES,
		type CardWordSize,
		cardWordSizeAtom,
		hideRevealedWordsAtom,
		keepAwakeAtom,
		setCardWordSize,
		setHideRevealedWords,
		setKeepAwake,
		setSound,
		setTimer,
		soundEnabledAtom,
		TIMER_OPTIONS,
		timerSecondsAtom,
	} from '#frontend/state/settings.ts'
	import { setTheme, type ThemeMode, themeAtom } from '#frontend/state/theme.ts'
	import { goBack, goTo } from '#frontend/state/ui.ts'

	const THEMES: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
		{ mode: 'light', label: 'Светлая', icon: Sun },
		{ mode: 'system', label: 'Системная', icon: SunMoon },
		{ mode: 'dark', label: 'Тёмная', icon: Moon },
	]

	/** Схема, на которую переключит кнопка темы: для `system` -- та, что сейчас стоит в системе. */
	function schemeOf(mode: ThemeMode): 'light' | 'dark' {
		if (mode !== 'system') return mode

		return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
	}

	const WORD_SIZE_LABELS: Record<CardWordSize, string> = {
		'11px': 'Мелкий',
		'13px': 'Средний',
		'15px': 'Крупный',
		'17px': 'Огромный',
	}

	const buildLabel = new Date(BUILD_TIME).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })

	const updateBusy = $derived($updateStatusAtom !== 'idle')

	// Подтверждение при включении звука.
	function onSound(v: boolean) {
		setSound(v)

		if (v) previewSound()
	}
</script>

<Screen onback={goBack}>
	{#snippet header()}<TopBar title="Настройки" onback={goBack} showSettings={false} />{/snippet}
	<Card layout="row">
		<label class="settings__label" for="sound">Звук</label>
		<Switch id="sound" checked={$soundEnabledAtom} onchange={onSound} />
	</Card>

	<Card>
		<h3 class="settings__section">Тема</h3>
		<div class="settings__toggles">
			{#each THEMES as { mode, label, icon: Icon } (mode)}
				<button
					type="button"
					class="settings__toggle settings__toggle--tall"
					class:settings__toggle--on={$themeAtom === mode}
					aria-pressed={$themeAtom === mode}
					aria-label={label}
					onclick={() => setTheme(mode)}
					{@attach (node) => themePeek(node, { target: () => schemeOf(mode) })}
				>
					<Icon size={24} />
				</button>
			{/each}
		</div>
	</Card>

	<Card>
		<h3 class="settings__section">Таймер хода</h3>
		<div class="settings__toggles">
			{#each TIMER_OPTIONS as s (s)}
				<button
					type="button"
					class="settings__toggle"
					class:settings__toggle--on={$timerSecondsAtom === s}
					aria-pressed={$timerSecondsAtom === s}
					aria-label={s === 0 ? 'Выкл' : `${s / 60} мин`}
					onclick={() => setTimer(s)}
				>
					{#if s === 0}<TimerOff size={20} />{:else}{s / 60} мин{/if}
				</button>
			{/each}
		</div>
	</Card>

	<Card>
		<h3 class="settings__section">Размер слов</h3>
		<div class="settings__sizes">
			{#each CARD_WORD_SIZES as s (s)}
				<!-- Превью -- настоящая закрытая карта доски; нажатие ловит прозрачная кнопка поверх. -->
				<div
					class="settings__size"
					class:settings__size--on={s === $cardWordSizeAtom}
					style:--card-word-size={s}
				>
					<span class="settings__size-face" aria-hidden="true">
						<CardTile
							card={{ word: WORD_SIZE_LABELS[s], type: null, revealed: false }}
							interactive={false}
						/>
					</span>
					<button
						type="button"
						class="settings__size-hit"
						aria-pressed={s === $cardWordSizeAtom}
						aria-label={WORD_SIZE_LABELS[s]}
						onclick={() => setCardWordSize(s)}
					></button>
				</div>
			{/each}
		</div>
	</Card>

	<Card layout="row">
		<div class="settings__described">
			<label class="settings__label" for="dim-revealed">Приглушать отгаданные слова</label>
			<span class="settings__hint">Текст на открытых картах становится еле заметным</span>
		</div>
		<Switch id="dim-revealed" checked={$hideRevealedWordsAtom} onchange={setHideRevealedWords} />
	</Card>

	<Card layout="row">
		<div class="settings__described">
			<label class="settings__label" for="keep-awake">Не гасить экран в игре</label>
			<span class="settings__hint">Уснувший телефон теряет связь с хостом</span>
		</div>
		<Switch id="keep-awake" checked={$keepAwakeAtom} onchange={setKeepAwake} />
	</Card>

	<Card>
		<div class="settings__inline">
			<h3 class="settings__section">Что нового</h3>
			{#if $hasUnseenChangelogAtom}<Badge>новое</Badge>{/if}
		</div>
		<div class="settings__latest">
			<div class="settings__inline">
				<span class="settings__latest-title">{LATEST.title}</span>
				<Badge variant="outline">{LATEST.version}</Badge>
			</div>
			<span class="settings__hint">{LATEST.highlight}</span>
		</div>
		<Button variant="outline" block onclick={() => goTo('changelog')}>
			<span class="settings__grow">Весь список изменений</span>
			<span class="settings__chevron"><ChevronRight /></span>
		</Button>
	</Card>

	<Card>
		<div class="settings__build">
			<div class="settings__described">
				<h3 class="settings__section">Билд</h3>
				<span class="settings__hint">версия на устройстве: {APP_VERSION}</span>
				<span class="settings__hint">последняя синхронизация: {buildLabel}</span>
			</div>
			<Button
				variant="outline"
				size="icon"
				aria-label="Проверить обновление"
				disabled={updateBusy}
				onclick={() => checkForUpdate()}
			>
				<span class="settings__refresh" class:settings__refresh--busy={updateBusy}><RefreshCw /></span>
			</Button>
		</div>
	</Card>
</Screen>

<style>
	.settings {
		&__label {
			font-size: 0.875rem;
			font-weight: 500;
			line-height: 1;
		}

		&__section {
			font-size: 0.75rem;
			font-weight: 600;
			color: var(--muted-foreground);
			text-transform: uppercase;
			letter-spacing: 0.025em;
		}

		&__hint {
			font-size: 0.75rem;
			color: var(--muted-foreground);
		}

		&__described {
			display: flex;
			flex-direction: column;
			gap: 0.125rem;
		}

		&__inline {
			display: flex;
			gap: 0.5rem;
			align-items: center;
		}

		&__latest {
			display: flex;
			flex-direction: column;
			gap: 0.25rem;
		}

		&__latest-title {
			font-size: 0.875rem;
			font-weight: 500;
		}

		&__grow {
			flex: 1;
			text-align: start;
		}

		&__chevron {
			display: inline-flex;
			opacity: 0.6;
		}

		&__build {
			display: flex;
			gap: 0.75rem;
			align-items: flex-start;
			justify-content: space-between;
		}

		&__refresh {
			display: inline-flex;

			&--busy {
				animation: spin 1s linear infinite;
			}
		}

		&__toggles {
			display: flex;
			width: 100%;
			border: 1px solid var(--border);
			border-radius: var(--radius-lg);
		}

		&__toggle {
			display: inline-flex;
			flex: 1;
			align-items: center;
			justify-content: center;
			min-width: 0;
			height: 2.75rem;
			padding-inline: 0.5rem;
			border: 0;
			font-size: 0.875rem;
			font-weight: 500;
			background: transparent;
			outline: none;
			transition:
				background-color 150ms,
				color 150ms;

			&:first-child {
				border-radius: var(--radius-lg) 0 0 var(--radius-lg);
			}

			&:last-child {
				border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
			}

			& + & {
				border-left: 1px solid var(--border);
			}

			&:hover {
				background: var(--muted);
			}

			&:focus-visible {
				box-shadow: inset 0 0 0 2px color-mix(in oklch, var(--ring) 50%, transparent);
			}

			&--tall {
				height: 3.5rem;
			}

			&--on,
			&--on:hover {
				color: var(--primary-foreground);
				background: var(--primary);
			}
		}

		&__sizes {
			display: grid;
			grid-template-columns: repeat(4, 1fr);
			gap: 7px;
		}

		&__size {
			position: relative;
			transition: transform 150ms;

			&:active {
				transform: scale(0.97);
			}

			/* Выбранный размер -- карта в цвете primary, как активный пункт переключателя. */
			&--on :global(.card-tile) {
				color: var(--primary-foreground);
				background: var(--primary);
			}
		}

		&__size-face {
			display: block;
		}

		&__size-hit {
			position: absolute;
			inset: 0;
			padding: 0;
			border: 0;
			border-radius: var(--radius-lg);
			background: transparent;
			outline: none;

			&:focus-visible {
				box-shadow: 0 0 0 3px color-mix(in oklch, var(--ring) 50%, transparent);
			}
		}
	}
</style>
