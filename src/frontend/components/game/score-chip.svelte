<script lang="ts">
	import { fade, scale } from 'svelte/transition'

	import type { Team } from '#frontend/game/index.ts'
	import { rosterAtom } from '#frontend/state/net.ts'
	import { speakerMarks, speakingAtom } from '#frontend/state/voice.ts'

	type Props = {
		team: Team
		count: number
		active: boolean
		/** Зеркалит содержимое к центру экрана: точка и число у центра, статус -- у внешней границы. */
		mirror?: boolean
		/** Если передан, чип становится кнопкой (тап открывает статистику). */
		onclick?: () => void
	}

	let { team, count, active, mirror = false, onclick }: Props = $props()

	const LABEL: Record<Team, string> = { red: 'Красные', blue: 'Синие' }

	const speakers = $derived(speakerMarks($rosterAtom, $speakingAtom, team))
</script>

<!-- Чип счёта команды: точка + число оставшихся слов + статус хода. -->
{#snippet content()}
	<span class="score-chip__dot"></span>
	<span class="score-chip__count">{count}</span>
	<!-- Пока кто-то из команды говорит, вместо статуса хода — кружки говорящих. -->
	<span class="score-chip__status">
		{#if speakers.length === 0}
			<span class="score-chip__status-text" transition:fade={{ duration: 200 }}>
				{LABEL[team]}
				{active ? 'ходят' : 'ожидают'}
			</span>
		{:else}
			<span class="score-chip__speakers" transition:fade={{ duration: 200 }} data-testid="speakers-{team}">
				{#each speakers as speaker (speaker.id)}
					<span class="score-chip__speaker" transition:scale={{ duration: 200, start: 0.5 }}
						>{speaker.letter}</span
					>
				{/each}
			</span>
		{/if}
	</span>
{/snippet}

{#if onclick}
	<button
		type="button"
		class="score-chip score-chip--{team} score-chip--button"
		class:score-chip--mirror={mirror}
		class:score-chip--active={active}
		{onclick}
		aria-label="Открыть статистику"
	>
		{@render content()}
	</button>
{:else}
	<div class="score-chip score-chip--{team}" class:score-chip--mirror={mirror} class:score-chip--active={active}>
		{@render content()}
	</div>
{/if}

<style>
	.score-chip {
		--team: var(--team-red);
		--team-fg: var(--team-red-foreground);

		display: flex;
		flex: 1;
		gap: 0.625rem;
		align-items: center;
		padding: 0.625rem 0.75rem;
		border: 0;
		border-radius: var(--radius-xl);
		color: var(--card-foreground);
		background: var(--card);
		box-shadow: 0 0 0 1px color-mix(in oklch, var(--foreground) 10%, transparent);

		&--blue {
			--team: var(--team-blue);
			--team-fg: var(--team-blue-foreground);
		}

		&--mirror {
			flex-direction: row-reverse;
		}

		&--active {
			color: var(--team-fg);
			background: var(--team);
			box-shadow: none;
		}

		&--button {
			outline: none;
			transition: transform 150ms;

			&:active {
				transform: scale(0.98);
			}

			&:focus-visible {
				box-shadow: 0 0 0 2px var(--ring);
			}
		}

		&__dot {
			flex-shrink: 0;
			width: 0.625rem;
			height: 0.625rem;
			border-radius: 9999px;
			background: var(--team);

			.score-chip--active & {
				opacity: 0.9;
				background: currentcolor;
			}
		}

		&__count {
			font-size: 1.125rem;
			font-weight: 700;
			line-height: 1;
		}

		/* Текст и кружки лежат в одной ячейке, чтобы при смене они плавно перетекали друг в друга. */
		&__status {
			display: grid;
			flex: 1;
			align-items: center;
			justify-items: end;
			font-size: 10px;
			font-weight: 600;
			line-height: 1;
			color: var(--muted-foreground);
			text-align: right;
			text-transform: uppercase;
			letter-spacing: 0.025em;
			white-space: nowrap;

			.score-chip--mirror & {
				justify-items: start;
				text-align: left;
			}

			.score-chip--active & {
				color: inherit;
				opacity: 0.9;
			}
		}

		&__status-text,
		&__speakers {
			grid-area: 1 / 1;
		}

		&__speakers {
			display: flex;
			gap: 0.25rem;

			.score-chip--mirror & {
				flex-direction: row-reverse;
			}
		}

		&__speaker {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 1.125rem;
			height: 1.125rem;
			border-radius: 9999px;
			font-size: 11px;
			color: var(--team-fg);
			background: var(--team);

			/* На залитом чипе команды кружок — светлый, иначе он сольётся с фоном. */
			.score-chip--active & {
				color: var(--team);
				background: var(--team-fg);
			}
		}
	}
</style>
