import { reatomComponent } from '@reatom/react'
import { useEffect, useState } from 'react'
import { ChartColumn, Check, Lightbulb, LogOut, RefreshCw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Team } from '../../game/index.ts'
import {
  endTurn,
  modeAtom,
  myRoleAtom,
  myTeamAtom,
  revealCard,
  revealLockedAtom,
  scoreAtom,
  startGame,
  viewAtom,
  viewRoleAtom,
} from '../../state/session.ts'
import { hostStartGame, leaveSession } from '../../state/net.ts'
import { hideRevealedWordsAtom } from '../../state/settings.ts'
import { goTo, goToStats, selectedWordsAtom } from '../../state/ui.ts'
import { resumeAudio } from '../../audio/sfx.ts'
import { CardTile } from '../components/CardTile.tsx'
import { RippleButton } from '../components/RippleButton.tsx'
import { ClueBar } from '../components/ClueBar.tsx'
import { ClueComposer, openComposer } from '../components/ClueComposer.tsx'
import { PassPhone } from '../components/PassPhone.tsx'
import { ScoreChip } from '../components/ScoreChip.tsx'
import { WordToken } from '../components/WordToken.tsx'
import { PlayerBadge } from '../components/PlayerBadge.tsx'
import { Screen } from '../components/Screen.tsx'
import { TopBar } from '../components/TopBar.tsx'
import { useEndTurnLock, useGameFeedback, useTurnTimer } from '../hooks.ts'

const TEAM_NOM: Record<Team, string> = { red: 'Красные', blue: 'Синие' }

const TEAM_SOLID: Record<Team, string> = {
  red: 'bg-team-red text-team-red-foreground hover:bg-team-red/90',
  blue: 'bg-team-blue text-team-blue-foreground hover:bg-team-blue/90',
}

export const Board = reatomComponent(() => {
  const view = viewAtom()
  const sc = scoreAtom()
  const mode = modeAtom()
  const hideRevealedWords = hideRevealedWordsAtom()
  const [confirmExit, setConfirmExit] = useState(false)
  const [confirmNewGame, setConfirmNewGame] = useState(false)
  const [confirmEmptyPass, setConfirmEmptyPass] = useState(false)

  useGameFeedback(view)
  const timeFrac = useTurnTimer(view, mode)
  const endTurnLock = useEndTurnLock(view)

  // Диалог «завершить ход без догадок» имеет смысл только в активной фазе guess.
  // Если ход закончился, пока диалог открыт (например, истёк таймер хода) — закрываем
  // его, иначе он останется висеть под гейтом передачи телефона.
  const guessTurnActive = !!view && view.phase === 'guess' && !!view.clue
  useEffect(() => {
    if (!guessTurnActive) setConfirmEmptyPass(false)
  }, [guessTurnActive])

  if (!view) {
    goTo('home')
    return null
  }

  const team = view.currentTeam
  const over = view.phase === 'over'
  const isLocal = mode === 'local'
  const viewRole = viewRoleAtom()

  const interactive =
    view.phase === 'guess' &&
    (isLocal || (team === myTeamAtom() && myRoleAtom() === 'operative'))
  const canEnd =
    !over && !!view.clue && (isLocal || (team === myTeamAtom() && myRoleAtom() === 'operative'))
  // По правилам ход завершает только игрок, не капитан.
  const viewerIsOperative = isLocal ? viewRole === 'operative' : myRoleAtom() === 'operative'
  // Капитан может дать подсказку (фаза clue): футер показывает «Придумать подсказку» вместо «Завершить ход».
  const canCompose =
    !over &&
    view.phase === 'clue' &&
    (isLocal
      ? viewRole === 'spymaster'
      : team === myTeamAtom() && myRoleAtom() === 'spymaster')

  const reveal = (i: number) => {
    resumeAudio()
    revealCard(i)
  }
  const newGame = () =>
    mode === 'host' ? hostStartGame({ words: selectedWordsAtom() }) : startGame({ words: selectedWordsAtom() })
  const toMenu = () => {
    if (!isLocal) leaveSession()
    goTo('home')
  }

  // Игра «началась», если уже дана подсказка или открыта хоть одна карта.
  const inProgress = !over && (!!view.clue || view.cards.some((c) => c.revealed))
  const requestBack = () => (inProgress ? setConfirmExit(true) : toMenu())
  const requestNewGame = () => (inProgress ? setConfirmNewGame(true) : newGame())

  // Блокировка кнопки в начале хода (отсчёт) — гасит случайный тап при передаче телефона.
  const endLocked = endTurnLock > 0
  // За ход не открыто ни одного слова: счётчик попыток ещё на максимуме (clue.count + 1).
  // Неверное открытие само завершает ход, так что до кнопки доходят только верные.
  const noGuessesThisTurn = !!view.clue && view.guessesRemaining === view.clue.count + 1
  const requestEndTurn = () => (noGuessesThisTurn ? setConfirmEmptyPass(true) : endTurn())

  const assassinHit = view.cards.some((c) => c.revealed && c.type === 'assassin')
  const winner = view.winner

  return (
    <Screen
      className="gap-3"
      onBack={requestBack}
      header={
        <TopBar
          onBack={requestBack}
          title={<PlayerBadge />}
          right={
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={() => goToStats()}
                aria-label="Статистика"
              >
                <ChartColumn />
              </Button>
              {mode !== 'guest' && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={requestNewGame}
                  aria-label="Новая игра"
                >
                  <RefreshCw />
                </Button>
              )}
            </>
          }
        />
      }
    >

      {/* score */}
      <div className="flex gap-2.5">
        <ScoreChip team="red" count={sc.red} active={team === 'red'} mirror onClick={() => goToStats('red')} />
        <ScoreChip team="blue" count={sc.blue} active={team === 'blue'} onClick={() => goToStats('blue')} />
      </div>

      {/* clue zone */}
      <ClueBar timeFrac={timeFrac} />

      {/* grid */}
      <div className="grid grid-cols-5 gap-[7px]">
        {view.cards.map((card, i) => (
          <CardTile
            key={i}
            card={card}
            interactive={interactive}
            hideWord={hideRevealedWords}
            onReveal={() => reveal(i)}
          />
        ))}
      </div>

      {/* footer — капитан даёт подсказку, игрок завершает ход */}
      {canCompose ? (
        <div className="flex gap-2.5">
          <RippleButton
            size="lg"
            className={cn('flex-1', TEAM_SOLID[team])}
            onClick={openComposer}
          >
            <Lightbulb />
            Придумать подсказку
          </RippleButton>
        </div>
      ) : viewerIsOperative ? (
        <div className="flex gap-2.5">
          <RippleButton
            size="lg"
            className={cn('flex-1', canEnd && TEAM_SOLID[team])}
            disabled={!canEnd || endLocked}
            onClick={requestEndTurn}
          >
            <Check />
            <span>
              Завершить ход
              {endLocked && (
                <>
                  {' · '}
                  <span className="inline-block w-[1ch] text-center tabular-nums">
                    {endTurnLock}
                  </span>
                </>
              )}
            </span>
          </RippleButton>
        </div>
      ) : null}

      {/* оверлей ввода подсказки (над доской, поле предмонтировано) */}
      <ClueComposer />

      {/* гейт передачи телефона капитану (hot-seat) */}
      <PassPhone />

      {/* подтверждение выхода во время партии */}
      <AlertDialog open={confirmExit} onOpenChange={setConfirmExit}>
        <AlertDialogContent dismissible>
          <AlertDialogHeader>
            <AlertDialogTitle>Выйти из игры?</AlertDialogTitle>
            <AlertDialogDescription>
              Партия уже идёт. Если выйти, текущая игра будет потеряна.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <X />
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction onClick={toMenu}>
              <LogOut />
              Выйти
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* подтверждение новой игры во время партии */}
      <AlertDialog open={confirmNewGame} onOpenChange={setConfirmNewGame}>
        <AlertDialogContent dismissible>
          <AlertDialogHeader>
            <AlertDialogTitle>Начать новую игру?</AlertDialogTitle>
            <AlertDialogDescription>
              Партия уже идёт. Если начать заново, текущая игра будет потеряна.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <X />
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmNewGame(false)
                newGame()
              }}
            >
              <RefreshCw />
              Начать заново
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* подтверждение завершения хода без единой догадки (защита от случайного нажатия) */}
      <AlertDialog open={confirmEmptyPass} onOpenChange={setConfirmEmptyPass}>
        <AlertDialogContent dismissible>
          <AlertDialogHeader>
            <AlertDialogTitle>Завершить ход без догадок?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы не открыли ни одного слова. Точно завершить ход?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* «Отмена» — главная кнопка (CTA): безопасный исход при случайном открытии диалога. */}
            <AlertDialogCancel variant="default">
              <X />
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              variant="outline"
              onClick={() => {
                setConfirmEmptyPass(false)
                endTurn()
              }}
            >
              <Check />
              Завершить ход
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* win overlay — после анимации открытия последней карты */}
      {over && winner && !revealLockedAtom() && (
        <Dialog open>
          <DialogContent showCloseButton={false} className="flex flex-col items-center gap-4 text-center">
            <div
              className={cn('flex size-16 items-center justify-center rounded-2xl', TEAM_SOLID[winner])}
            >
              <WordToken size={26} />
            </div>
            <div className="flex flex-col gap-1">
              <DialogTitle className="font-heading text-2xl">{TEAM_NOM[winner]} победили</DialogTitle>
              <DialogDescription>
                {assassinHit
                  ? `${TEAM_NOM[winner === 'red' ? 'blue' : 'red']} попались на ассасина`
                  : 'Все свои слова найдены'}
              </DialogDescription>
            </div>
            <div className="flex w-full max-w-xs flex-col gap-2">
              {mode !== 'guest' && (
                <RippleButton size="lg" className="w-full" onClick={newGame}>
                  Новая игра
                </RippleButton>
              )}
              <Button variant="outline" className="w-full" onClick={() => goToStats()}>
                Статистика
              </Button>
              <Button variant="outline" className="w-full" onClick={toMenu}>
                В меню
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Screen>
  )
})
