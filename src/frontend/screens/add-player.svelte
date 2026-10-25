<script lang="ts">
	import QrCode from '#frontend/components/net/qr-code.svelte'
	import QrScanner from '#frontend/components/net/qr-scanner.svelte'
	import SectionTitle from '#frontend/components/net/section-title.svelte'
	import Screen from '#frontend/components/screen.svelte'
	import TopBar from '#frontend/components/top-bar.svelte'
	import Card from '@aimuzov/infra-site-kit/ui/card.svelte'
	import { acceptGuestOffer, joinedConnIdsAtom } from '#frontend/state/net.ts'
	import { goBack } from '#frontend/state/ui.ts'

	let answer = $state<string | null>(null)
	let pendingConnId = $state<string | null>(null)

	// Защита от повторного возврата: список подключившихся может обновиться ещё раз до того,
	// как экран успеет размонтироваться -- тогда вышло бы два goBack подряд (за HostLobby
	// улетели бы и в Lobby).
	let left = false

	// Как только гость представился (`hello`) -- возвращаемся к настройке игры. Ждём именно
	// `hello`, а не появления в ростере: игрок мог подключаться повторно и уже быть в списке.
	// Сессию не рвём: ростер сохраняется, HostLobby его покажет.
	$effect(() => {
		if (!left && pendingConnId && $joinedConnIdsAtom.includes(pendingConnId)) {
			left = true
			goBack()
		}
	})

	async function onScanOffer(offerCode: string) {
		try {
			const { connId, answerCode } = await acceptGuestOffer(offerCode)

			pendingConnId = connId
			answer = answerCode
		} catch {
			answer = null
		}
	}
</script>

<Screen onback={goBack}>
	{#snippet header()}<TopBar title="Добавить игрока" onback={goBack} />{/snippet}
	<Card>
		{#if answer}
			<SectionTitle>Покажите QR игроку</SectionTitle>
			<p class="add-player__hint">Покажите этот QR игроку — пусть отсканирует его.</p>
			<QrCode value={answer} />
			<p class="add-player__hint">Экран закроется сам, когда игрок подключится…</p>
		{:else}
			<SectionTitle>Отсканируйте QR игрока</SectionTitle>
			<p class="add-player__hint">Отсканируйте QR-код игрока (его offer).</p>
			<QrScanner onscan={onScanOffer} />
		{/if}
	</Card>
</Screen>

<style>
	.add-player__hint {
		font-size: 0.875rem;
		color: var(--muted-foreground);
	}
</style>
