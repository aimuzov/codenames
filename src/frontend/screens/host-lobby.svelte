<script lang="ts">
	import Check from '@lucide/svelte/icons/check'
	import Dices from '@lucide/svelte/icons/dices'
	import Play from '@lucide/svelte/icons/play'
	import QrCodeIcon from '@lucide/svelte/icons/qr-code'
	import UserPlus from '@lucide/svelte/icons/user-plus'
	import Wifi from '@lucide/svelte/icons/wifi'

	import QrCode from '#frontend/components/net/qr-code.svelte'
	import RosterList from '#frontend/components/net/roster-list.svelte'
	import VoiceControls from '#frontend/components/net/voice-controls.svelte'
	import SectionTitle from '#frontend/components/net/section-title.svelte'
	import SetupPicker from '#frontend/components/net/setup-picker.svelte'
	import Screen from '#frontend/components/screen.svelte'
	import TopBar from '#frontend/components/top-bar.svelte'
	import Button from '#frontend/components/ui/button.svelte'
	import Card from '@aimuzov/infra-site-kit/ui/card.svelte'
	import Dialog from '#frontend/components/ui/dialog.svelte'
	import {
		HOST_ID,
		hostReshuffle,
		hostStartGame,
		leaveSession,
		roomCodeAtom,
		rosterAtom,
		setHostSetup,
		startHosting,
		transportAtom,
	} from '#frontend/state/net.ts'
	import { isRosterReady, randomSetup, teamHasSpymaster } from '#frontend/state/roster.ts'
	import { modeAtom, myRoleAtom, myTeamAtom } from '#frontend/state/session.ts'
	import { goBack, goTo, selectedWordsAtom } from '#frontend/state/ui.ts'

	// Запускаем хостинг при входе, но не при возврате с экрана «Добавить игрока»: экран
	// перемонтируется на каждом переходе, а startHosting деструктивен (сбросил бы ростер).
	// По умолчанию -- комната на релее: она сама переживает сон телефона.
	$effect(() => {
		if (modeAtom() !== 'host') startHosting('Хост', 'red', 'spymaster', 'relay')
	})

	const spymasterDisabled = $derived(teamHasSpymaster($rosterAtom, $myTeamAtom, HOST_ID))
	// Тот же порог, что в `reshuffleRoster`: при меньшем числе подключённых он ростер не меняет.
	const canReshuffle = $derived($rosterAtom.filter((p) => p.connected).length >= 4)

	let showRosterAlert = $state(false)

	function back() {
		leaveSession()
		goBack()
	}

	function handleStart() {
		if (!isRosterReady(rosterAtom())) {
			showRosterAlert = true

			return
		}

		hostStartGame({ words: selectedWordsAtom() })
	}

	function random() {
		const s = randomSetup(rosterAtom(), HOST_ID, { team: myTeamAtom(), role: myRoleAtom() })

		setHostSetup(s.team, s.role)
	}
</script>

<Screen onback={back}>
	{#snippet header()}
		<TopBar title="Создание игры" onback={back}>
			{#snippet right()}<VoiceControls />{/snippet}
		</TopBar>
	{/snippet}

	<Card>
		<SectionTitle>Вы</SectionTitle>
		<SetupPicker
			team={$myTeamAtom}
			role={$myRoleAtom}
			{spymasterDisabled}
			onchange={(t, r) => setHostSetup(t, r)}
			onrandom={random}
		/>
	</Card>

	{#if $transportAtom === 'relay'}
		<Card>
			<div class="host-lobby__room">
				<SectionTitle>Код комнаты</SectionTitle>
				{#if $roomCodeAtom}
					<span data-testid="room-code" class="host-lobby__code">{$roomCodeAtom}</span>
					<QrCode value={$roomCodeAtom} />
					<p class="host-lobby__hint host-lobby__hint--center">
						Продиктуйте код или дайте отсканировать. Игроки вернутся сами, даже если телефон уснёт.
					</p>
				{:else}
					<p class="host-lobby__hint">Открываем комнату…</p>
				{/if}
				<Button variant="outline" block onclick={() => startHosting('Хост', myTeamAtom(), myRoleAtom(), 'qr')}>
					<QrCodeIcon />
					Играть без интернета
				</Button>
			</div>
		</Card>
	{/if}

	<Card>
		<SectionTitle>Игроки</SectionTitle>
		<RosterList />
		{#if $transportAtom === 'qr' || canReshuffle}
			<div class="host-lobby__actions">
				{#if $transportAtom === 'qr'}
					<div class="host-lobby__grow">
						<Button variant="outline" block onclick={() => goTo('host-add')}>
							<UserPlus />
							Добавить игрока
						</Button>
					</div>
				{/if}
				{#if canReshuffle}
					<Button
						variant="outline"
						size="icon"
						aria-label="Перемешать игроков"
						onclick={() => hostReshuffle()}
					>
						<Dices />
					</Button>
				{/if}
			</div>
		{/if}
		{#if $transportAtom === 'qr'}
			<Button variant="ghost" block onclick={() => startHosting('Хост', myTeamAtom(), myRoleAtom(), 'relay')}>
				<Wifi />
				Играть через интернет — по коду комнаты
			</Button>
		{/if}
	</Card>

	<div class="host-lobby__footer">
		<Button size="lg" block ripple onclick={handleStart}>
			<Play />
			Начать игру
		</Button>
	</div>

	<Dialog alert open={showRosterAlert} onclose={() => (showRosterAlert = false)} title="Нельзя начать игру">
		{#snippet description()}Нужно минимум по капитану и игроку в каждой команде.{/snippet}
		{#snippet actions()}
			<div class="host-lobby__dialog-action">
				<Button block onclick={() => (showRosterAlert = false)}>
					<Check />
					Понятно
				</Button>
			</div>
		{/snippet}
	</Dialog>
</Screen>

<style>
	.host-lobby {
		&__room {
			display: flex;
			flex-direction: column;
			gap: 0.75rem;
			align-items: center;
		}

		&__code {
			font-size: 1.875rem;
			font-weight: 700;
			letter-spacing: 0.3em;
		}

		&__hint {
			font-size: 0.875rem;
			color: var(--muted-foreground);

			&--center {
				text-align: center;
			}
		}

		&__actions {
			display: flex;
			gap: 0.5rem;
		}

		&__grow {
			flex: 1;
		}

		&__footer {
			display: flex;
			flex-direction: column;
			gap: 0.625rem;
			margin-top: auto;
		}

		&__dialog-action {
			grid-column: 1 / -1;
		}
	}
</style>
