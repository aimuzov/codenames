import type { Team } from '../../game/index.ts'
import { cn } from '@/lib/utils'

const LABEL: Record<Team, string> = { red: 'Красные', blue: 'Синие' }
const SOLID: Record<Team, string> = {
  red: 'bg-team-red text-team-red-foreground',
  blue: 'bg-team-blue text-team-blue-foreground',
}
const DOT: Record<Team, string> = { red: 'bg-team-red', blue: 'bg-team-blue' }

/** Чип счёта команды: точка + число оставшихся слов + статус хода.
 *  mirror — зеркалит содержимое к центру экрана: точка и число у центра,
 *  статус — у внешней границы.
 *  onClick — если передан, чип становится кнопкой (тап открывает статистику). */
export function ScoreChip({
  team,
  count,
  active,
  mirror = false,
  onClick,
}: {
  team: Team
  count: number
  active: boolean
  mirror?: boolean
  onClick?: () => void
}) {
  const className = cn(
    'flex flex-1 items-center gap-2.5 rounded-xl px-3 py-2.5',
    mirror && 'flex-row-reverse',
    active ? SOLID[team] : 'bg-card ring-1 ring-foreground/10',
    onClick &&
      'cursor-pointer transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  )
  const content = (
    <>
      <span className={cn('size-2.5 shrink-0 rounded-full', active ? 'bg-current opacity-90' : DOT[team])} />
      <div className="font-heading text-lg font-bold leading-none">{count}</div>
      <div
        className={cn(
          'flex-1 whitespace-nowrap text-[10px] font-semibold uppercase leading-none tracking-wide',
          mirror ? 'text-left' : 'text-right',
          active ? 'opacity-90' : 'text-muted-foreground',
        )}
      >
        {LABEL[team]} {active ? 'ходят' : 'ожидают'}
      </div>
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label="Открыть статистику" className={className}>
        {content}
      </button>
    )
  }
  return <div className={className}>{content}</div>
}
