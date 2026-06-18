import { reatomComponent } from '@reatom/react'
import { useEffect, useState } from 'react'
import { modeAtom, myRoleAtom, myTeamAtom } from '../../state/session.ts'
import {
  HOST_ID,
  hostReshuffle,
  hostStartGame,
  leaveSession,
  rosterAtom,
  setHostSetup,
  startHosting,
} from '../../state/net.ts'
import { isRosterReady, randomSetup, teamHasSpymaster } from '../../state/roster.ts'
import { goBack, goTo, selectedWordsAtom } from '../../state/ui.ts'
import { Check, Dices, Play, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Card, CardContent } from '@/components/ui/card'
import { RippleButton } from '../components/RippleButton.tsx'
import { RosterList } from '../components/RosterList.tsx'
import { SetupPicker } from '../components/SetupPicker.tsx'
import { Screen } from '../components/Screen.tsx'
import { TopBar } from '../components/TopBar.tsx'

const SectionTitle = ({ children }: { children: string }) => (
  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</h3>
)

export const HostLobby = reatomComponent(() => {
  // Запускаем хостинг при входе, но не при возврате с экрана «Добавить игрока»:
  // экран перемонтируется (key={screen}), а startHosting деструктивен (сбросил бы ростер).
  useEffect(() => {
    if (modeAtom() !== 'host') startHosting('Хост', 'red', 'spymaster')
  }, [])

  const team = myTeamAtom()
  const role = myRoleAtom()
  const roster = rosterAtom()
  const words = selectedWordsAtom()
  const rosterReady = isRosterReady(roster)
  const spymasterDisabled = teamHasSpymaster(roster, team, HOST_ID)
  const canReshuffle = roster.filter((p) => p.connected).length >= 4

  const [showRosterAlert, setShowRosterAlert] = useState(false)

  const back = () => {
    leaveSession()
    goBack()
  }

  const handleStart = () => {
    if (!rosterReady) {
      setShowRosterAlert(true)
      return
    }
    hostStartGame({ words })
  }

  return (
    <Screen onBack={back} header={<TopBar title="Создание игры" onBack={back} />}>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <SectionTitle>Вы</SectionTitle>
          <SetupPicker
            team={team}
            role={role}
            spymasterDisabled={spymasterDisabled}
            onChange={(t, r) => setHostSetup(t, r)}
            onRandom={() => {
              const s = randomSetup(roster, HOST_ID, { team, role })
              setHostSetup(s.team, s.role)
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <SectionTitle>Игроки</SectionTitle>
          <RosterList />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => goTo('host-add')}>
              <UserPlus />
              Добавить игрока
            </Button>
            {canReshuffle && (
              <Button
                variant="outline"
                size="icon"
                aria-label="Перемешать игроков"
                onClick={() => hostReshuffle()}
              >
                <Dices />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-auto flex flex-col gap-2.5">
        <RippleButton size="lg" className="w-full" onClick={handleStart}>
          <Play />
          Начать игру
        </RippleButton>
      </div>

      <AlertDialog open={showRosterAlert} onOpenChange={setShowRosterAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Нельзя начать игру</AlertDialogTitle>
            <AlertDialogDescription>
              Нужно минимум по капитану и игроку в каждой команде.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowRosterAlert(false)}>
              <Check />
              Понятно
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Screen>
  )
})
