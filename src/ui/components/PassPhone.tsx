import { reatomComponent } from '@reatom/react'
import { Crown, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { Team } from '../../game/index.ts'
import { handoffReasonAtom, modeAtom, revealLockedAtom, viewAtom, viewRoleAtom } from '../../state/session.ts'

const TEAM_GEN: Record<Team, string> = { red: 'красных', blue: 'синих' }
const TEAM_SOLID: Record<Team, string> = {
  red: 'bg-team-red text-team-red-foreground hover:bg-team-red/90',
  blue: 'bg-team-blue text-team-blue-foreground hover:bg-team-blue/90',
}
const TEAM_TEXT: Record<Team, string> = {
  red: 'text-team-red',
  blue: 'text-team-blue',
}

/**
 * Гейт передачи телефона капитану (только hot-seat). Появляется, когда наступает ход капитана
 * (фаза clue в виде игрока), и блокирует поле, пока капитан не подтвердит, что телефон у
 * него — только тогда открывается вид капитана с ключом. Закрывается единственной кнопкой.
 */
export const PassPhone = reatomComponent(() => {
  const view = viewAtom()
  const open =
    modeAtom() === 'local' &&
    !!view &&
    view.phase === 'clue' &&
    viewRoleAtom() === 'operative' &&
    !revealLockedAtom()
  if (!open) return null

  const team = view.currentTeam
  const reason = handoffReasonAtom()

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        className="flex flex-col items-center gap-4 text-center"
      >
        {reason && (
          <div className="flex flex-col gap-1">
            <DialogDescription>
              {reason.type === 'neutral' ? 'Вы открыли общее слово' : 'Вы открыли слово соперников'}
            </DialogDescription>
            <span
              className={cn(
                'font-heading text-lg font-bold',
                reason.type === 'neutral' ? 'text-foreground' : TEAM_TEXT[reason.type],
              )}
            >
              {reason.word}
            </span>
          </div>
        )}

        <div className={cn('flex size-16 items-center justify-center rounded-2xl', TEAM_SOLID[team])}>
          <Crown size={30} />
        </div>

        <div className="flex flex-col gap-1">
          <DialogTitle className="font-heading text-2xl">Ход капитана</DialogTitle>
          <DialogDescription>Передайте телефон капитану {TEAM_GEN[team]}</DialogDescription>
        </div>

        <Button
          size="lg"
          className={cn('w-full max-w-xs', TEAM_SOLID[team])}
          onClick={() => viewRoleAtom.set('spymaster')}
        >
          <Eye />
          Показать поле
        </Button>
      </DialogContent>
    </Dialog>
  )
})
