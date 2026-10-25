<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left'
	import ArrowRight from '@lucide/svelte/icons/arrow-right'
	import Dices from '@lucide/svelte/icons/dices'
	import LogIn from '@lucide/svelte/icons/log-in'
	import QrCodeIcon from '@lucide/svelte/icons/qr-code'
	import RefreshCw from '@lucide/svelte/icons/refresh-cw'
	import { untrack } from 'svelte'

	import QrCode from '#frontend/components/net/qr-code.svelte'
	import QrScanner from '#frontend/components/net/qr-scanner.svelte'
	import RosterList from '#frontend/components/net/roster-list.svelte'
	import SectionTitle from '#frontend/components/net/section-title.svelte'
	import SetupPicker from '#frontend/components/net/setup-picker.svelte'
	import Screen from '#frontend/components/screen.svelte'
	import TopBar from '#frontend/components/top-bar.svelte'
	import Button from '#frontend/components/ui/button.svelte'
	import Card from '@aimuzov/infra-site-kit/ui/card.svelte'
	import Input from '@aimuzov/infra-site-kit/ui/input.svelte'
	import { randomName } from '#frontend/data/names.ts'
	import {
		connStatusAtom,
		guestAcceptAnswer,
		guestCreateOffer,
		guestReconnect,
		guestSetup,
		leaveSession,
		myIdAtom,
		rosterAtom,
		startJoining,
		transportAtom,
	} from '#frontend/state/net.ts'
	import { randomSetup, teamHasSpymaster } from '#frontend/state/roster.ts'
	import { myRoleAtom, myTeamAtom } from '#frontend/state/session.ts'
	import { goBack, joinModeAtom } from '#frontend/state/ui.ts'
	import { isRoomCode, normalizeRoomCode } from '#shared/relay-protocol.ts'

	type Stage = 'name' | 'room' | 'scanRoom' | 'offer' | 'scan' | 'setup'

	const STATUS_LABEL = {
		idle: '',
		connecting: 'Подключение…',
		connected: 'Подключено ✓',
		error: 'Соединение потеряно',
	} as const

	// Возврат в свою партию после обрыва: имя и место уже есть, шаг с именем пропускаем.
	const reconnecting = joinModeAtom() === 'reconnect'
	let stage = $state<Stage>(reconnecting ? 'offer' : 'name')
	let name = $state('')
	let suggestedName = $state(randomName())
	let offerCode = $state('')
	let roomInput = $state('')
	let codeError = $state('')

	// Новое рукопожатие без потери сессии: id и место у игрока прежние, хост узнает его по ним.
	// В комнате на релее ходить с камерой не нужно -- транспорт поднимается сам.
	async function reconnect() {
		if (transportAtom() === 'relay') {
			guestReconnect()
			stage = 'setup'

			return
		}

		offerCode = ''
		stage = 'offer'
		guestReconnect()
		offerCode = await guestCreateOffer()
	}

	$effect(() => {
		if (reconnecting) untrack(() => void reconnect())
	})

	const spymasterDisabled = $derived(teamHasSpymaster($rosterAtom, $myTeamAtom, $myIdAtom))

	// Офлайн-путь: двухшаговое рукопожатие по QR (offer -> answer), интернет не нужен.
	async function connectByQr() {
		startJoining(name.trim() || suggestedName)
		offerCode = await guestCreateOffer()
		stage = 'offer'
	}

	// Онлайн-путь: комната на релее. Дальше канал чинится сам, ходить с камерой не придётся.
	function connectByCode(raw: string) {
		const code = normalizeRoomCode(raw)

		if (!isRoomCode(code)) {
			codeError = 'Код из 6 символов, например ABC123'

			return
		}

		codeError = ''
		startJoining(name.trim() || suggestedName, { transport: 'relay', code })
		stage = 'setup'
	}

	async function onScanAnswer(answerCode: string) {
		await guestAcceptAnswer(answerCode)
		stage = 'setup'
	}

	function random() {
		const s = randomSetup(rosterAtom(), myIdAtom(), { team: myTeamAtom(), role: myRoleAtom() })

		guestSetup(s.team, s.role)
	}

	// При переподключении выход с экрана -- просто возврат на доску: сессию рвать нельзя,
	// иначе игрок потеряет партию, в которую как раз возвращается.
	function back() {
		if (!reconnecting) leaveSession()

		goBack()
	}
</script>

<Screen onback={back}>
	{#snippet header()}<TopBar title={reconnecting ? 'Переподключение' : 'Подключение'} onback={back} />{/snippet}

	{#if stage === 'name'}
		<Card>
			<SectionTitle>Ваше имя</SectionTitle>
			<div class="join__row">
				<Input placeholder={suggestedName} bind:value={name} />
				<Button
					variant="outline"
					size="icon"
					aria-label="Другое имя"
					onclick={() => (suggestedName = randomName())}
				>
					<Dices />
				</Button>
			</div>
			<Button block onclick={() => (stage = 'room')}>
				<LogIn />
				Войти по коду
			</Button>
			<Button variant="ghost" block onclick={() => void connectByQr()}>
				<QrCodeIcon />
				Рядом, без интернета
			</Button>
		</Card>
	{:else if stage === 'room'}
		<Card>
			<SectionTitle>Код комнаты</SectionTitle>
			<Input
				code
				inputmode="text"
				autocapitalize="characters"
				placeholder="ABC123"
				bind:value={() => roomInput, (v) => (roomInput = normalizeRoomCode(v))}
				onkeydown={(e) => e.key === 'Enter' && connectByCode(roomInput)}
				{@attach (node) => node.focus()}
			/>
			{#if codeError}<p class="join__error">{codeError}</p>{/if}
			<Button block onclick={() => connectByCode(roomInput)}>
				<LogIn />
				Войти
			</Button>
			<Button variant="outline" block onclick={() => (stage = 'scanRoom')}>
				<QrCodeIcon />
				Отсканировать QR хоста
			</Button>
		</Card>
	{:else if stage === 'scanRoom'}
		<Card>
			<SectionTitle>QR с кодом комнаты</SectionTitle>
			<QrScanner onscan={connectByCode} />
			<Button variant="outline" block onclick={() => (stage = 'room')}>
				<ArrowLeft />
				Ввести код руками
			</Button>
		</Card>
	{:else if stage === 'offer'}
		<Card>
			<SectionTitle>Шаг 1 — покажите QR хосту</SectionTitle>
			{#if offerCode}
				<QrCode value={offerCode} />
			{:else}
				<p class="join__hint">Готовлю код…</p>
			{/if}
			<Button block disabled={!offerCode} onclick={() => (stage = 'scan')}>
				Далее
				<ArrowRight />
			</Button>
		</Card>
	{:else if stage === 'scan'}
		<Card>
			<SectionTitle>Шаг 2 — отсканируйте ответ хоста</SectionTitle>
			<QrScanner onscan={onScanAnswer} />
			<Button variant="outline" block onclick={() => (stage = 'offer')}>
				<ArrowLeft />
				Назад к QR
			</Button>
		</Card>
	{:else}
		<Card>
			<SectionTitle>Команда и роль</SectionTitle>
			<p class="join__hint">{STATUS_LABEL[$connStatusAtom]}</p>
			{#if $connStatusAtom === 'error'}
				<Button variant="outline" block onclick={() => void reconnect()}>
					<RefreshCw />
					Переподключиться
				</Button>
			{/if}
			<SetupPicker
				team={$myTeamAtom}
				role={$myRoleAtom}
				{spymasterDisabled}
				onchange={(t, r) => guestSetup(t, r)}
				onrandom={random}
			/>
		</Card>
		<Card>
			<SectionTitle>Игроки</SectionTitle>
			<RosterList />
			<p class="join__hint">Ждём, пока хост начнёт игру…</p>
		</Card>
	{/if}
</Screen>

<style>
	.join {
		&__row {
			display: flex;
			gap: 0.5rem;
			align-items: center;
		}

		&__hint {
			font-size: 0.875rem;
			color: var(--muted-foreground);
		}

		&__error {
			font-size: 0.875rem;
			color: var(--destructive);
		}
	}
</style>
