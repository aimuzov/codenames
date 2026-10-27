<script lang="ts">
	import Mic from '@lucide/svelte/icons/mic'
	import MicOff from '@lucide/svelte/icons/mic-off'

	import { rosterAtom } from '#frontend/state/net.ts'

	const ROLE_LABEL = { spymaster: 'капитан', operative: 'игрок' } as const
</script>

<!-- Список игроков в лобби с командой, ролью и статусом. -->
{#if $rosterAtom.length === 0}
	<p class="roster-list__empty">Пока никто не подключился.</p>
{:else}
	<ul class="roster-list">
		{#each $rosterAtom as player (player.id)}
			<li class="roster-list__item">
				<span class="roster-list__dot roster-list__dot--{player.team}"></span>
				<span class="roster-list__name">{player.name}</span>
				{#if player.voice}
					<span
						class="roster-list__voice"
						class:roster-list__voice--muted={player.muted}
						data-testid="voice-{player.muted ? 'muted' : 'live'}"
						title={player.muted ? 'В голосовом чате, микрофон выключен' : 'В голосовом чате'}
					>
						{#if player.muted}<MicOff size={14} />{:else}<Mic size={14} />{/if}
					</span>
				{/if}
				<span class="roster-list__role">{ROLE_LABEL[player.role]}</span>
				{#if !player.connected}<span class="roster-list__offline">офлайн</span>{/if}
			</li>
		{/each}
	</ul>
{/if}

<style>
	.roster-list {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		margin: 0;
		padding: 0;
		list-style: none;

		&__empty {
			font-size: 0.875rem;
			color: var(--muted-foreground);
		}

		&__item {
			display: flex;
			gap: 0.625rem;
			align-items: center;
			padding: 0.625rem 0.75rem;
			border-radius: var(--radius-lg);
			background: color-mix(in oklch, var(--muted) 50%, transparent);
		}

		&__dot {
			flex-shrink: 0;
			width: 0.625rem;
			height: 0.625rem;
			border-radius: 9999px;

			&--red {
				background: var(--team-red);
			}

			&--blue {
				background: var(--team-blue);
			}
		}

		&__name {
			flex: 1;
			font-weight: 500;
		}

		&__voice {
			display: inline-flex;
			color: var(--primary);

			&--muted {
				color: var(--muted-foreground);
			}
		}

		&__role {
			font-size: 0.875rem;
			color: var(--muted-foreground);
		}

		&__offline {
			display: inline-flex;
			align-items: center;
			height: 1rem;
			padding-inline: 0.375rem;
			border: 1px solid var(--border);
			border-radius: 9999px;
			font-size: 10px;
			font-weight: 500;
			line-height: 1;
			color: var(--destructive);
			white-space: nowrap;
		}
	}
</style>
