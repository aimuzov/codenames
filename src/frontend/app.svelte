<script lang="ts">
	import type { Component } from 'svelte'

	import Toaster from '#frontend/components/ui/toaster.svelte'
	import { keepScreenAwake } from '#frontend/lib/wake-lock.ts'
	import AddPlayer from '#frontend/screens/add-player.svelte'
	import Board from '#frontend/screens/board.svelte'
	import Changelog from '#frontend/screens/changelog.svelte'
	import Dicts from '#frontend/screens/dicts.svelte'
	import Home from '#frontend/screens/home.svelte'
	import HostLobby from '#frontend/screens/host-lobby.svelte'
	import Join from '#frontend/screens/join.svelte'
	import Lobby from '#frontend/screens/lobby.svelte'
	import Packs from '#frontend/screens/packs.svelte'
	import Play from '#frontend/screens/play.svelte'
	import Rules from '#frontend/screens/rules.svelte'
	import Settings from '#frontend/screens/settings.svelte'
	import Stats from '#frontend/screens/stats.svelte'
	import { consumeInviteLink } from '#frontend/state/net.ts'
	import { registerServiceWorker } from '#frontend/state/pwa.ts'
	import { applyCardWordSize, keepAwakeAtom } from '#frontend/state/settings.ts'
	import { applyTheme } from '#frontend/state/theme.ts'
	import { hydrateCustomPacks, screenAtom, type Screen } from '#frontend/state/ui.ts'

	const screens: Record<Screen, Component> = {
		home: Home,
		play: Play,
		lobby: Lobby,
		dicts: Dicts,
		rules: Rules,
		board: Board,
		packs: Packs,
		host: HostLobby,
		'host-add': AddPlayer,
		join: Join,
		settings: Settings,
		stats: Stats,
		changelog: Changelog,
	}

	/** Экраны, где засыпание особенно болезненно: партия и сетевые лобби, там ждут подключений. */
	const awakeScreens = new Set<Screen>(['board', 'host', 'host-add', 'join'])

	applyTheme()
	applyCardWordSize()
	registerServiceWorker()
	void hydrateCustomPacks()
	consumeInviteLink()

	// Стартовый лоадер из pages/index.astro убираем после первого рендера настоящего интерфейса.
	$effect(() => {
		const loader = document.getElementById('initial-loader')

		if (!loader) return

		loader.classList.add('loader--hiding')
		// 200 мс -- длительность transition лоадера в pages/index.astro,
		// даём ему погаснуть и только потом убираем.
		const timer = setTimeout(() => loader.remove(), 200)

		return () => clearTimeout(timer)
	})

	// Прижимаем #root к visualViewport. С клавиатурой видимая область ужимается и на iOS съезжает
	// вверх -- оболочка едет следом: контент стоит на месте, документу нечего скроллить, а строка
	// композера у нижней кромки оказывается ровно над клавиатурой.
	$effect(() => {
		const vv = window.visualViewport
		const root = document.getElementById('root')

		if (!vv || !root) return

		const apply = () => {
			root.style.height = `${vv.height}px`
			// translate3d держим и при нуле: стабильный слой композитинга не даёт оверлею моргать,
			// когда трансформа появляется скачком при открытии клавиатуры.
			root.style.transform = `translate3d(${vv.offsetLeft}px, ${vv.offsetTop}px, 0)`
		}

		apply()
		vv.addEventListener('resize', apply)
		vv.addEventListener('scroll', apply)

		return () => {
			vv.removeEventListener('resize', apply)
			vv.removeEventListener('scroll', apply)
			root.style.height = ''
			root.style.transform = ''
		}
	})

	$effect(() => ($keepAwakeAtom && awakeScreens.has($screenAtom) ? keepScreenAwake() : undefined))

	const Current = $derived(screens[$screenAtom])
</script>

<!-- key перемонтирует экран на каждом переходе: анимация въезда играет заново. Тосты вне блока,
     чтобы не сбрасывались при смене экрана. -->
{#key $screenAtom}
	<Current />
{/key}
<Toaster />
