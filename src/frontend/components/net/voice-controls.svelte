<script lang="ts">
	import Headphones from '@lucide/svelte/icons/headphones'
	import Mic from '@lucide/svelte/icons/mic'
	import MicOff from '@lucide/svelte/icons/mic-off'
	import PhoneOff from '@lucide/svelte/icons/phone-off'

	import Button from '#frontend/components/ui/button.svelte'
	import { voiceSignalingAtom } from '#frontend/state/net.ts'
	import {
		joinVoice,
		leaveVoice,
		micMutedAtom,
		toggleMic,
		voiceJoiningAtom,
		voiceOnAtom,
	} from '#frontend/state/voice.ts'
</script>

<!-- Кнопки голосового чата для верхней панели. Только онлайн-комнаты: в QR-режиме голоса нет. -->
{#if $voiceSignalingAtom}
	{#if $voiceOnAtom}
		<Button
			variant={$micMutedAtom ? 'outline' : 'default'}
			size="icon"
			onclick={toggleMic}
			aria-label={$micMutedAtom ? 'Включить микрофон' : 'Выключить микрофон'}
			aria-pressed={!$micMutedAtom}
		>
			{#if $micMutedAtom}<MicOff />{:else}<Mic />{/if}
		</Button>
		<Button variant="ghost" size="icon" onclick={leaveVoice} aria-label="Выйти из голосового чата">
			<PhoneOff />
		</Button>
	{:else}
		<Button
			variant="outline"
			size="icon"
			onclick={joinVoice}
			disabled={$voiceJoiningAtom}
			aria-label="Войти в голосовой чат"
		>
			<Headphones />
		</Button>
	{/if}
{/if}
