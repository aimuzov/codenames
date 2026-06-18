import { reatomComponent } from '@reatom/react'
import { Crown, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Role, Team } from '@/game/index.ts'
import { modeAtom, myRoleAtom, myTeamAtom, viewAtom } from '@/state/session.ts'
import { myNameAtom } from '@/state/net.ts'

const ROLE_LABEL: Record<Role, string> = { spymaster: 'Капитан', operative: 'Игрок' }
const ROLE_ICON: Record<Role, typeof Crown> = { spymaster: Crown, operative: Target }
/** Мягкая заливка чипа под иконку — как у приглашения «Ход капитана» в ClueBar. */
const TEAM_TINT: Record<Team, string> = {
	red: 'bg-team-red-tint text-team-red-tint-foreground',
	blue: 'bg-team-blue-tint text-team-blue-tint-foreground',
}
const TEAM_TEXT: Record<Team, string> = { red: 'text-team-red', blue: 'text-team-blue' }

/**
 * Бейдж роли в хедере доски: иконка роли в тинт-чипе команды + название роли в цвете команды.
 * Локально (hot-seat) показывает активного игрока хода (капитан в фазе clue,
 * иначе игрок); в сети — собственную закреплённую роль и имя, указанное при подключении.
 */
export const PlayerBadge = reatomComponent(() => {
	const view = viewAtom()
	if (!view) return null

	const local = modeAtom() === 'local'
	const team: Team = local ? view.currentTeam : myTeamAtom()
	const role: Role = local ? (view.phase === 'clue' ? 'spymaster' : 'operative') : myRoleAtom()
	const Icon = ROLE_ICON[role]
	// Имя есть только в сетевых режимах (вводится при подключении); в hot-seat — нет.
	const name = local ? '' : myNameAtom().trim()

	return (
		<div className="flex min-w-0 flex-1 items-center gap-2">
			<span
				className={cn(
					'flex size-9 shrink-0 items-center justify-center rounded-xl',
					TEAM_TINT[team],
				)}
			>
				<Icon className="size-5" />
			</span>
			{name ? (
				<span className="flex min-w-0 flex-col leading-tight">
					<span
						className={cn(
							'truncate font-heading text-base font-bold tracking-tight',
							TEAM_TEXT[team],
						)}
					>
						{name}
					</span>
					<span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
						{ROLE_LABEL[role]}
					</span>
				</span>
			) : (
				<span
					className={cn(
						'min-w-0 truncate font-heading text-base font-bold tracking-tight',
						TEAM_TEXT[team],
					)}
				>
					{ROLE_LABEL[role]}
				</span>
			)}
		</div>
	)
})
