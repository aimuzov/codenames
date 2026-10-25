<script lang="ts">
	import Save from '@lucide/svelte/icons/save'
	import Trash2 from '@lucide/svelte/icons/trash-2'

	import Screen from '#frontend/components/screen.svelte'
	import TopBar from '#frontend/components/top-bar.svelte'
	import Button from '#frontend/components/ui/button.svelte'
	import Card from '@aimuzov/infra-site-kit/ui/card.svelte'
	import Input from '@aimuzov/infra-site-kit/ui/input.svelte'
	import Textarea from '#frontend/components/ui/textarea.svelte'
	import { parseWordList } from '#frontend/data/packs.ts'
	import { addCustomPack, customPacksAtom, goBack, removeCustomPack } from '#frontend/state/ui.ts'

	let title = $state('')
	let text = $state('')

	const preview = $derived(parseWordList(text))

	function add() {
		if (preview.length === 0) return

		void addCustomPack(title, text)
		title = ''
		text = ''
	}
</script>

<Screen onback={goBack}>
	{#snippet header()}<TopBar title="Свои паки" onback={goBack} />{/snippet}
	<Card>
		<h3 class="packs__section">Новый пак</h3>
		<Input placeholder="Название пака" bind:value={title} />
		<Textarea placeholder="Слова через запятую или с новой строки" bind:value={text} rows={6} />
		<div class="packs__actions">
			<span class="packs__muted">Слов: {preview.length}</span>
			<Button onclick={add} disabled={preview.length === 0}>
				<Save />
				Сохранить
			</Button>
		</div>
	</Card>

	<Card>
		<h3 class="packs__section">Сохранённые ({$customPacksAtom.length})</h3>
		{#if $customPacksAtom.length === 0}
			<p class="packs__muted">Пока нет своих паков.</p>
		{:else}
			<ul class="packs__list">
				{#each $customPacksAtom as pack (pack.id)}
					<li class="packs__pack">
						<span class="packs__title">{pack.title}</span>
						<span class="packs__count">{pack.words.length}</span>
						<Button
							variant="outline"
							size="icon-sm"
							aria-label="Удалить"
							onclick={() => void removeCustomPack(pack.id)}
						>
							<Trash2 />
						</Button>
					</li>
				{/each}
			</ul>
		{/if}
	</Card>
</Screen>

<style>
	.packs {
		&__section {
			font-size: 0.75rem;
			font-weight: 600;
			color: var(--muted-foreground);
			text-transform: uppercase;
			letter-spacing: 0.025em;
		}

		&__actions {
			display: flex;
			gap: 0.625rem;
			align-items: center;
			justify-content: space-between;
		}

		&__muted {
			font-size: 0.875rem;
			color: var(--muted-foreground);
		}

		&__list {
			display: flex;
			flex-direction: column;
			gap: 0.375rem;
		}

		&__pack {
			display: flex;
			gap: 0.625rem;
			align-items: center;
			padding: 0.625rem 0.75rem;
			border-radius: var(--radius-lg);
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
	}
</style>
