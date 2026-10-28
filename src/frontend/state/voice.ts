import type { GamePhase, Role, Team } from '#frontend/game/index.ts'
import { atom, onChange } from '#frontend/lib/atom.ts'
import { E2E } from '#frontend/lib/e2e.ts'
import { toast } from '#frontend/lib/toast.ts'
import { announceVoice, myIdAtom, rosterAtom, voiceSignalingAtom } from '#frontend/state/net.ts'
import { myRoleAtom, myTeamAtom, viewAtom } from '#frontend/state/session.ts'
import type { PlayerInfo } from '#frontend/transport/messages.ts'
import type { VoiceSignaling } from '#frontend/transport/ws-relay.ts'
import type { VoiceMesh } from '#frontend/voice/mesh.ts'

/**
 * Голосовой чат онлайн-комнаты: один канал на всех. На ход своей команды капитану выключаем
 * микрофон, чтобы подсказка не проскочила голосом; включить его обратно вручную он всё равно может.
 */

export const voiceOnAtom = atom(false)
export const micMutedAtom = atom(false)
/** `true` от нажатия до получения микрофона: грузится модуль меша, висит запрос разрешения. */
export const voiceJoiningAtom = atom(false)
/** Кто из чата сейчас говорит: id из ростера, свой тоже. */
export const speakingAtom = atom<ReadonlySet<string>>(new Set())

let mesh: VoiceMesh | null = null
/** Транспорт сигналинга меша: если он сменился, комнаты, которую знал меш, больше нет. */
let meshSignaling: VoiceSignaling | null = null
/** Выставлен, пока мьют автоматический: тогда с концом хода микрофон вернётся. */
let autoMuted = false
let captainTurn = false

type TurnView = { currentTeam: Team; phase: GamePhase } | null

/** Идёт ли ход команды этого капитана — то время, когда его голоса быть не должно. */
export function isCaptainTurn(view: TurnView, team: Team, role: Role): boolean {
	return role === 'spymaster' && !!view && view.phase !== 'over' && view.currentTeam === team
}

export type SpeakerMark = { id: string; letter: string }

/**
 * Кружки говорящих для чипа счёта команды. У капитана всегда «К»: по ней сразу видно, что
 * голос подаёт он, а у игроков — первая буква имени.
 */
export function speakerMarks(
	players: readonly Pick<PlayerInfo, 'id' | 'name' | 'team' | 'role'>[],
	speaking: ReadonlySet<string>,
	team: Team,
): SpeakerMark[] {
	return players
		.filter((p) => p.team === team && speaking.has(p.id))
		.map((p) => ({ id: p.id, letter: p.role === 'spymaster' ? 'К' : ([...p.name.trim()][0] ?? '?').toUpperCase() }))
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

	// Индикатору говорящих нужен AudioContext, а iOS запускает его только из самого нажатия:
	// после первого await (загрузки модуля меша) жест уже потерян.
	const audio = new AudioContext()

	void audio.resume().catch(() => {})

	try {
		const { VoiceMesh } = await import('#frontend/voice/mesh.ts')

		const opened = await VoiceMesh.open(signaling, myIdAtom(), audio)

		// Сессия закончилась, пока висел запрос разрешения: слушать нас уже некому, кнопок
		// тоже нет, поэтому микрофон отпускаем сразу.
		if (voiceSignalingAtom() !== signaling) {
			opened.close()

			return
		}

		mesh = opened
		mesh.onSpeaking = (speaking) => speakingAtom.set(speaking)
		meshSignaling = signaling
	} catch {
		void audio.close().catch(() => {})
		toast.error('Нет доступа к микрофону', { description: 'Разрешите его в настройках браузера' })

		return
	} finally {
		voiceJoiningAtom.set(false)
	}

	// Капитан, вошедший посреди хода, начинает с выключенным микрофоном, как и в начале хода.
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
	speakingAtom.set(new Set())

	if (voiceSignalingAtom()) announceVoice(false, false)
}

export function toggleMic() {
	autoMuted = false
	setMuted(!micMutedAtom())
}

onChange(rosterAtom, syncMesh)

// Транспорт сессии пропал (вышли из игры или комнаты больше нет) — значит, пропал и чат.
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
