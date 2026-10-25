<script lang="ts">
	import Pencil from '@lucide/svelte/icons/pencil'

	import Screen from '#frontend/components/screen.svelte'
	import TopBar from '#frontend/components/top-bar.svelte'
	import Button from '#frontend/components/ui/button.svelte'
	import Card from '@aimuzov/infra-site-kit/ui/card.svelte'
	import Checkbox from '#frontend/components/ui/checkbox.svelte'
	import { BOARD_SIZE } from '#frontend/game/index.ts'
	import {
		allPacksAtom,
		goBack,
		goTo,
		selectedPackIdsAtom,
		selectedWordsAtom,
		togglePack,
	} from '#frontend/state/ui.ts'

	const ready = $derived($selectedWordsAtom.length >= BOARD_SIZE)
</script>

<Screen onback={goBack}>
	{#snippet header()}<TopBar title="Словари" onback={goBack} />{/snippet}
	<Card>
		<ul class="dicts__list">
			{#each $allPacksAtom as pack (pack.id)}
				<li>
					<label class="dicts__pack">
						<Checkbox
							checked={$selectedPackIdsAtom.includes(pack.id)}
							onchange={() => togglePack(pack.id)}
						/>
						<span class="dicts__title">{pack.title}</span>
						<span class="dicts__count">{pack.words.length}</span>
					</label>
				</li>
			{/each}
		</ul>
		<Button variant="outline" block onclick={() => goTo('packs')}>
			<Pencil />
			Свои паки…
		</Button>
	</Card>

	<p class="dicts__total" class:dicts__total--short={!ready}>
		Слов выбрано: {$selectedWordsAtom.length}{ready ? '' : ` (нужно минимум ${BOARD_SIZE})`}
	</p>
</Screen>

<style>
	.dicts {
		&__list {
			display: flex;
			flex-direction: column;
			gap: 0.375rem;
		}

		&__pack {
			cursor: pointer;
			display: flex;
			gap: 0.625rem;
			align-items: center;
			padding: 0.625rem 0.75rem;
			border-radius: var(--radius-lg);
			font-size: 0.875rem;
			background: color-mix(in oklch, var(--muted) 50%, transparent);
		}

		&__title {
			flex: 1;
			font-weight: 500;
		}

		&__count {
			font-weight: 500;
			font-variant-numeric: tabular-nums;
			color: var(--muted-foreground);
		}

		&__total {
			font-size: 0.875rem;
			color: var(--muted-foreground);

			&--short {
				color: var(--destructive);
			}
		}
	}
</style>
