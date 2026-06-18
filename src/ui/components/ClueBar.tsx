import { reatomComponent } from '@reatom/react'
import type { KeyboardEvent } from 'react'
import { Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import type { Team } from '../../game/index.ts'
import { modeAtom, myRoleAtom, myTeamAtom, viewAtom, viewRoleAtom } from '../../state/session.ts'
import { timerSecondsAtom } from '../../state/settings.ts'
import { openComposer } from './ClueComposer.tsx'

const TEAM_GEN = { red: 'красных', blue: 'синих' } as const

const TEAM_SOLID: Record<Team, string> = {
  red: 'bg-team-red text-team-red-foreground hover:bg-team-red/90',
  blue: 'bg-team-blue text-team-blue-foreground hover:bg-team-blue/90',
}
/** Мягкая заливка для иконки-приглашения «придумать подсказку». */
const TEAM_TINT: Record<Team, string> = {
  red: 'bg-team-red-tint text-team-red-tint-foreground',
  blue: 'bg-team-blue-tint text-team-blue-tint-foreground',
}
/** Цвет «утекающей» полосы таймера по нижнему краю блока. */
const TEAM_PROGRESS: Record<Team, string> = {
  red: '[&_[data-slot=progress-indicator]]:bg-team-red',
  blue: '[&_[data-slot=progress-indicator]]:bg-team-blue',
}

const BAR = 'flex h-[70px] items-center rounded-xl border border-border bg-card'

/** Статус-зона хода: активная подсказка либо ожидание капитана (сам ввод — в ClueComposer). */
export const ClueBar = reatomComponent<{ timeFrac: number | null }>(({ timeFrac }) => {
  const view = viewAtom()
  if (!view) return null

  const team = view.currentTeam
  const over = view.phase === 'over'
  // Все слова подсказки открыты — осталась бонусная попытка (ровно одна).
  const isBonus = view.guessesRemaining <= 1
  // В бонусе показываем подсказку прошлого хода этой команды; на первом ходу её ещё нет —
  // тогда вместо пустоты ставим «…», чтобы блок слова не схлопывался.
  const clueWord = isBonus ? (view.prevClueWord[team] ?? '…') : (view.clue?.word ?? null)
  const isLocal = modeAtom() === 'local'
  // Таймер включён в настройках — резервируем место под полосу всегда (и до подсказки),
  // чтобы контент не прыгал при переходе clue → guess. Сама полоса рисуется по timeFrac.
  const timerOn = timerSecondsAtom() > 0
  const inClue = !over && view.phase === 'clue'
  // Зритель может дать подсказку (капитан в фазе clue) — сам ввод открывается из футера.
  const canCompose =
    inClue &&
    (isLocal
      ? viewRoleAtom() === 'spymaster'
      : myTeamAtom() === team && myRoleAtom() === 'spymaster')
  // Приглашение «Ожидаем подсказки» показываем всю фазу clue в локали (и под гейтом передачи
  // телефона): инструкцию «передайте телефон» несёт сама модалка PassPhone, бар не дублирует её.
  const showInvite = canCompose || (inClue && isLocal)

  return (
    <div
      className={cn(
        BAR,
        'relative justify-between gap-3 overflow-hidden px-4',
        // полоса таймера занимает нижние 6px — резервируем их, чтобы контент остался по центру
        timerOn && 'pb-1.5',
        over && 'opacity-50',
        // тап по бару-приглашению открывает композер — как кнопка «Придумать подсказку»
        canCompose && 'cursor-pointer select-none active:opacity-90',
        // блик-приглашение: тот же sheen, что у главного CTA, но только пока показываем зов к ходу
        !view.clue && showInvite && 'btn-sheen',
      )}
      {...(canCompose && {
        role: 'button',
        tabIndex: 0,
        onClick: openComposer,
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openComposer()
          }
        },
      })}
    >
      {view.clue ? (
        // Бонусная попытка выглядит как обычная подсказка — меняются лишь подпись и число.
        <>
          <div className="flex min-w-0 flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {isBonus ? 'Бонусное угадывание' : `Подсказка ${TEAM_GEN[team]}`}
            </span>
            {clueWord && (
              <span className="truncate font-heading text-2xl font-semibold lowercase tracking-wide">
                {clueWord}
              </span>
            )}
          </div>
          <span
            className={cn(
              'flex size-10 min-w-10 items-center justify-center rounded-xl font-heading text-xl font-bold',
              TEAM_SOLID[team],
            )}
          >
            {isBonus ? view.guessesRemaining : view.clue.count}
          </span>
        </>
      ) : showInvite ? (
        // Зеркалит вид подсказки: текст слева, чип-иконка справа (где число слов).
        <>
          <div className="flex min-w-0 flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Ход капитана {TEAM_GEN[team]}
            </span>
            <span className="truncate font-heading text-2xl font-semibold lowercase tracking-wide">
              Ожидаем подсказки
            </span>
          </div>
          <span
            className={cn(
              'flex size-10 min-w-10 items-center justify-center rounded-xl',
              TEAM_TINT[team],
            )}
          >
            <Lightbulb className="size-5" />
          </span>
        </>
      ) : (
        <span className="text-sm font-medium text-muted-foreground">
          Капитан {TEAM_GEN[team]} придумывает подсказку
        </span>
      )}

      {/* таймер хода — «утекающая» полоса по нижнему краю блока.
          Рисуем её всегда при включённом таймере (то же условие, что и pb-1.5):
          вне фазы guess timeFrac === null → показываем пустой серый трек (value 0),
          чтобы зарезервированное снизу место было заполнено и контент не «висел» выше центра. */}
      {timerOn && (
        <Progress
          value={timeFrac ?? 0}
          max={1}
          className={cn(
            'absolute inset-x-0 bottom-0',
            '[&_[data-slot=progress-track]]:h-1.5 [&_[data-slot=progress-track]]:rounded-none [&_[data-slot=progress-track]]:bg-foreground/10',
            TEAM_PROGRESS[team],
          )}
        />
      )}
    </div>
  )
})
