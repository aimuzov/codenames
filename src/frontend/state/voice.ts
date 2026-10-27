import type { GamePhase, Role, Team } from '#frontend/game/index.ts'
import { atom, onChange } from '#frontend/lib/atom.ts'
import { E2E } from '#frontend/lib/e2e.ts'
import { toast } from '#frontend/lib/toast.ts'
import { announceVoice, myIdAtom, rosterAtom, voiceSignalingAtom } from '#frontend/state/net.ts'
import { myRoleAtom, myTeamAtom, viewAtom } from '#frontend/state/session.ts'
import type { VoiceSignaling } from '#frontend/transport/ws-relay.ts'
import type { VoiceMesh } from '#frontend/voice/mesh.ts'

/**
 * Voice chat of an online room: one channel for everyone. The spymaster gets muted for their
 * team's turn, so a hint can't slip out by voice; they can still unmute by hand.
 */

export const voiceOnAtom = atom(false)
export const micMutedAtom = atom(false)
/** True from the tap until the mic is ours: the mesh module loads, the permission prompt waits. */
export const voiceJoiningAtom = atom(false)

let mesh: VoiceMesh | null = null
/** The transport the mesh signals through: a new one means the room the mesh knew is gone. */
let meshSignaling: VoiceSignaling | null = null
/** Set while the current mute is the auto one: then the turn's end gives the mic back. */
let autoMuted = false
let captainTurn = false

type TurnView = { currentTeam: Team; phase: GamePhase } | null

/** Whether it's the turn of this spymaster's team, the time their voice must stay out. */
export function isCaptainTurn(view: TurnView, team: Team, role: Role): boolean {
	return role === 'spymaster' && !!view && view.phase !== 'over' && view.currentTeam === team
}

function syncMesh() {
	mesh?.sync(
		rosterAtom()
			.filter((p) => p.voice && p.connected)
			.map((p) => p.id),
	)
}

function setMuted(muted: boolean) {
	micMutedAtom.set(muted)

	if (mesh) mesh.muted = muted

	announceVoice(voiceOnAtom(), muted)
}

export async function joinVoice() {
	const signaling = voiceSignalingAtom()

	if (!signaling || mesh || voiceJoiningAtom()) return

	voiceJoiningAtom.set(true)

	try {
		const { VoiceMesh } = await import('#frontend/voice/mesh.ts')

		mesh = await VoiceMesh.open(signaling, myIdAtom())
		meshSignaling = signaling
	} catch {
		toast.error('Нет доступа к микрофону', { description: 'Разрешите его в настройках браузера' })

		return
	} finally {
		voiceJoiningAtom.set(false)
	}

	// Joining mid-turn as the spymaster starts muted just like at the turn's start.
	autoMuted = isCaptainTurn(viewAtom(), myTeamAtom(), myRoleAtom())
	captainTurn = autoMuted
	voiceOnAtom.set(true)
	setMuted(autoMuted)
	syncMesh()
}

export function leaveVoice() {
	mesh?.close()
	mesh = null
	meshSignaling = null
	autoMuted = false
	voiceOnAtom.set(false)
	micMutedAtom.set(false)

	if (voiceSignalingAtom()) announceVoice(false, false)
}

export function toggleMic() {
	autoMuted = false
	setMuted(!micMutedAtom())
}

onChange(rosterAtom, syncMesh)

// The session's transport went away (left the game, or the room is gone): so did the chat.
onChange(voiceSignalingAtom, () => {
	if (mesh && voiceSignalingAtom() !== meshSignaling) leaveVoice()
})

for (const source of [viewAtom, myTeamAtom, myRoleAtom]) {
	onChange(source, () => {
		const now = isCaptainTurn(viewAtom(), myTeamAtom(), myRoleAtom())

		if (now === captainTurn) return

		captainTurn = now

		if (!mesh) return

		if (now && !micMutedAtom()) {
			autoMuted = true
			setMuted(true)

			toast.warning('Микрофон выключен на ход вашей команды', {
				description: 'Чтобы что-то сказать, включите его сами',
			})
		} else if (!now && autoMuted) {
			autoMuted = false
			setMuted(false)
		}
	})
}

if (E2E) {
	;(window as unknown as { __e2eVoice?: () => unknown }).__e2eVoice = () => mesh?.stats() ?? []
}
