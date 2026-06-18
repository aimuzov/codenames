import { reatomComponent } from '@reatom/react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { Team } from '@/game/index.ts'
import { rosterAtom } from '@/state/net.ts'

const ROLE_LABEL = { spymaster: 'капитан', operative: 'игрок' } as const
const DOT: Record<Team, string> = { red: 'bg-team-red', blue: 'bg-team-blue' }

/** Список игроков в лобби с командой/ролью/статусом. */
export const RosterList = reatomComponent(() => {
	const roster = rosterAtom()
	if (roster.length === 0)
		return <p className="text-sm text-muted-foreground">Пока никто не подключился.</p>
	return (
		<ul className="flex flex-col gap-1.5">
			{roster.map((p) => (
				<li key={p.id} className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5">
					<span className={cn('size-2.5 shrink-0 rounded-full', DOT[p.team])} />
					<span className="flex-1 font-medium">{p.name}</span>
					<span className="text-sm text-muted-foreground">{ROLE_LABEL[p.role]}</span>
					{!p.connected && (
						<Badge variant="outline" className="text-destructive">
							офлайн
						</Badge>
					)}
				</li>
			))}
		</ul>
	)
})
