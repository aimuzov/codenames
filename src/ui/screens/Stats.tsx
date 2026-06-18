import { reatomComponent } from '@reatom/react'
import type { ReactNode } from 'react'
import { Check, Skull, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CardType, LogEntry, Team } from '../../game/index.ts'
import { scoreAtom, viewAtom } from '../../state/session.ts'
import { goBack, goTo, statsTeamAtom } from '../../state/ui.ts'
import { WordToken } from '../components/WordToken.tsx'
import { Screen } from '../components/Screen.tsx'
import { TopBar } from '../components/TopBar.tsx'

const TEAM_NOM: Record<Team, string> = { red: 'Красные', blue: 'Синие' }
const TEAM_SOLID: Record<Team, string> = {
  red: 'bg-team-red text-team-red-foreground',
  blue: 'bg-team-blue text-team-blue-foreground',
}
const TEAM_DOT: Record<Team, string> = { red: 'bg-team-red', blue: 'bg-team-blue' }
const TEAM_BORDER: Record<Team, string> = { red: 'border-team-red', blue: 'border-team-blue' }

/** Заливка пилюли открытой карты по её истинному типу. */
const TYPE_SOLID: Record<CardType, string> = {
  red: 'bg-team-red text-team-red-foreground',
  blue: 'bg-team-blue text-team-blue-foreground',
  neutral: 'bg-card-neutral text-card-neutral-foreground',
  assassin: 'bg-card-assassin text-card-assassin-foreground',
}

/** Исход открытия относительно открывшей команды. */
type Outcome = 'correct' | 'wrong' | 'assassin'

const OUTCOME_ICON: Record<Outcome, ReactNode> = {
  correct: <Check className="size-3.5" />,
  wrong: <X className="size-3.5" />,
  assassin: <Skull className="size-3.5" />,
}

interface Reveal {
  word: string
  type: CardType
  outcome: Outcome
}

interface Turn {
  team: Team
  clue: { word: string; count: number }
  reveals: Reveal[]
  /** Ход завершён добровольно (нажали «Завершить ход»). */
  passed: boolean
  startAt: number
}

/** Группирует плоский лог в ходы: подсказка + открытые под ней карты. */
function buildTurns(log: LogEntry[]): Turn[] {
  const turns: Turn[] = []
  let current: Turn | null = null
  for (const e of log) {
    if (e.kind === 'clue') {
      current = { team: e.team, clue: { word: e.word, count: e.count }, reveals: [], passed: false, startAt: e.at }
      turns.push(current)
    } else if (e.kind === 'reveal' && current) {
      const outcome: Outcome =
        e.type === 'assassin' ? 'assassin' : e.type === e.team ? 'correct' : 'wrong'
      current.reveals.push({ word: e.word, type: e.type, outcome })
    } else if (e.kind === 'pass' && current) {
      current.passed = true
    }
  }
  return turns
}

/** Относительное время от старта партии в формате «м:сс». */
function fmtRel(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Метрика-плашка в шапке итогов. */
function Metric({ label, value, dot }: { label: string; value: string; dot?: Team }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-card px-3 py-2.5 ring-1 ring-foreground/10">
      {dot && <span className={cn('size-2.5 shrink-0 rounded-full', TEAM_DOT[dot])} />}
      <div className="leading-none">
        <div className="font-heading text-base font-bold leading-none">{value}</div>
        <div className="mt-1 text-[10px] font-semibold uppercase leading-none tracking-wide text-muted-foreground">
          {label}
        </div>
      </div>
    </div>
  )
}

/** Экран статистики партии: итог + таймлайн ходов с подсказками и открытиями. */
export const Stats = reatomComponent(() => {
  const view = viewAtom()
  const sc = scoreAtom()
  const team = statsTeamAtom()
  const back = () => goBack()

  if (!view) {
    goTo('home')
    return null
  }

  const turns = buildTurns(view.log)
  const t0 = view.log[0]?.at ?? 0
  const tEnd = view.log[view.log.length - 1]?.at ?? 0

  const totalRed = view.startingTeam === 'red' ? 9 : 8
  const totalBlue = view.startingTeam === 'blue' ? 9 : 8
  const foundRed = totalRed - sc.red
  const foundBlue = totalBlue - sc.blue

  const winner = view.winner
  const assassinHit = view.cards.some((c) => c.revealed && c.type === 'assassin')

  // Режим фильтра по команде (тап по чипу счёта): показываем только её данные.
  const teamTotal = team ? (view.startingTeam === team ? 9 : 8) : 0
  const teamFound = team ? teamTotal - sc[team] : 0
  const teamTurns = team ? turns.filter((t) => t.team === team) : turns
  // Время команды — сумма длительностей её ходов (до начала следующего хода / конца партии).
  let teamTime = 0
  if (team) {
    turns.forEach((t, i) => {
      if (t.team !== team) return
      teamTime += (i + 1 < turns.length ? turns[i + 1].startAt : tEnd) - t.startAt
    })
  }

  return (
    <Screen
      bottomFade
      onBack={back}
      header={<TopBar title={team ? `Статистика · ${TEAM_NOM[team]}` : 'Статистика'} onBack={back} />}
    >
      {team ? (
        /* фильтр по команде: только карточка выбранной команды */
        <>
          <div className="flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-foreground/10">
            <div className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl', TEAM_SOLID[team])}>
              <WordToken size={22} />
            </div>
            <div className="min-w-0">
              <div className="font-heading text-lg font-bold leading-tight">{TEAM_NOM[team]}</div>
              <div className="text-sm text-muted-foreground">
                Найдено слов: {teamFound}/{teamTotal}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Metric label="Ходов" value={String(teamTurns.length)} />
            <Metric label="Время" value={fmtRel(teamTime)} />
          </div>
        </>
      ) : (
        <>
          {/* итог партии */}
          {winner && (
            <div className="flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-foreground/10">
              <div className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl', TEAM_SOLID[winner])}>
                <WordToken size={22} />
              </div>
              <div className="min-w-0">
                <div className="font-heading text-lg font-bold leading-tight">{TEAM_NOM[winner]} победили</div>
                <div className="text-sm text-muted-foreground">
                  {assassinHit
                    ? `${TEAM_NOM[winner === 'red' ? 'blue' : 'red']} попались на ассасина`
                    : 'Все свои слова найдены'}
                </div>
              </div>
            </div>
          )}

          {/* сводка */}
          <div className="grid grid-cols-2 gap-2.5">
            <Metric label="Красные" value={`${foundRed}/${totalRed}`} dot="red" />
            <Metric label="Синие" value={`${foundBlue}/${totalBlue}`} dot="blue" />
            <Metric label="Ходов" value={String(turns.length)} />
            <Metric label="Время" value={fmtRel(tEnd - t0)} />
          </div>
        </>
      )}

      {/* таймлайн */}
      <h2 className="mt-1 font-heading text-sm font-semibold text-muted-foreground">Таймлайн</h2>
      {teamTurns.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет данных о ходах.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {teamTurns.map((turn, i) => (
            <div
              key={i}
              className={cn(
                'flex flex-col gap-2 rounded-xl border-l-4 bg-card p-3 ring-1 ring-foreground/10',
                TEAM_BORDER[turn.team],
              )}
            >
              {/* подсказка + время хода */}
              <div className="flex items-center gap-2">
                <span className={cn('size-2.5 shrink-0 rounded-full', TEAM_DOT[turn.team])} />
                <span className="font-heading font-semibold">
                  {turn.clue.word} <span className="text-muted-foreground">· {turn.clue.count}</span>
                </span>
                <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                  {fmtRel(turn.startAt - t0)}
                </span>
              </div>

              {/* открытые карты */}
              {turn.reveals.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {turn.reveals.map((r, j) => (
                    <span
                      key={j}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold',
                        TYPE_SOLID[r.type],
                      )}
                    >
                      {OUTCOME_ICON[r.outcome]}
                      {r.word}
                    </span>
                  ))}
                </div>
              )}

              {turn.reveals.length === 0 && !turn.passed && (
                <div className="text-xs text-muted-foreground">Открытий не было</div>
              )}
              {turn.passed && <div className="text-xs text-muted-foreground">Ход завершён</div>}
            </div>
          ))}
        </div>
      )}
    </Screen>
  )
})
