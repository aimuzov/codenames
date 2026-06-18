import { reatomComponent } from '@reatom/react'
import { useState } from 'react'
import { myRoleAtom, myTeamAtom } from '../../state/session.ts'
import {
  connStatusAtom,
  guestAcceptAnswer,
  guestCreateOffer,
  guestSetup,
  leaveSession,
  myIdAtom,
  rosterAtom,
  startJoining,
} from '../../state/net.ts'
import { randomSetup, teamHasSpymaster } from '../../state/roster.ts'
import { goBack } from '../../state/ui.ts'
import { randomName } from '../../data/names.ts'
import { ArrowLeft, ArrowRight, Dices, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { QrCode } from '../../signaling/QrCode.tsx'
import { QrScanner } from '../../signaling/QrScanner.tsx'
import { RosterList } from '../components/RosterList.tsx'
import { SetupPicker } from '../components/SetupPicker.tsx'
import { Screen } from '../components/Screen.tsx'
import { TopBar } from '../components/TopBar.tsx'

type Stage = 'name' | 'offer' | 'scan' | 'setup'

const STATUS_LABEL = {
  idle: '',
  connecting: 'Подключение…',
  connected: 'Подключено ✓',
  error: 'Соединение потеряно',
} as const

const SectionTitle = ({ children }: { children: string }) => (
  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</h3>
)

export const Join = reatomComponent(() => {
  const [stage, setStage] = useState<Stage>('name')
  const [name, setName] = useState('')
  const [suggestedName, setSuggestedName] = useState(() => randomName())
  const [offerCode, setOfferCode] = useState('')

  const status = connStatusAtom()
  const team = myTeamAtom()
  const role = myRoleAtom()
  const roster = rosterAtom()
  const myId = myIdAtom()
  const spymasterDisabled = teamHasSpymaster(roster, team, myId)

  const connect = async () => {
    startJoining(name.trim() || suggestedName)
    const code = await guestCreateOffer()
    setOfferCode(code)
    setStage('offer')
  }

  const onScanAnswer = async (answerCode: string) => {
    await guestAcceptAnswer(answerCode)
    setStage('setup')
  }

  const back = () => {
    leaveSession()
    goBack()
  }

  return (
    <Screen onBack={back} header={<TopBar title="Подключение" onBack={back} />}>

      {stage === 'name' && (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <SectionTitle>Ваше имя</SectionTitle>
            <div className="flex items-center gap-2">
              <Input
                className="flex-1"
                placeholder={suggestedName}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Другое имя"
                onClick={() => setSuggestedName(randomName())}
              >
                <Dices />
              </Button>
            </div>
            <Button className="w-full" onClick={connect}>
              <LogIn />
              Подключиться
            </Button>
          </CardContent>
        </Card>
      )}

      {stage === 'offer' && (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <SectionTitle>Шаг 1 — покажите QR хосту</SectionTitle>
            {offerCode ? (
              <QrCode value={offerCode} />
            ) : (
              <p className="text-sm text-muted-foreground">Готовлю код…</p>
            )}
            <Button className="w-full" disabled={!offerCode} onClick={() => setStage('scan')}>
              Далее
              <ArrowRight />
            </Button>
          </CardContent>
        </Card>
      )}

      {stage === 'scan' && (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <SectionTitle>Шаг 2 — отсканируйте ответ хоста</SectionTitle>
            <QrScanner onScan={onScanAnswer} />
            <Button variant="outline" className="w-full" onClick={() => setStage('offer')}>
              <ArrowLeft />
              Назад к QR
            </Button>
          </CardContent>
        </Card>
      )}

      {stage === 'setup' && (
        <>
          <Card>
            <CardContent className="flex flex-col gap-3">
              <SectionTitle>Команда и роль</SectionTitle>
              <p className="text-sm text-muted-foreground">{STATUS_LABEL[status]}</p>
              <SetupPicker
                team={team}
                role={role}
                spymasterDisabled={spymasterDisabled}
                onChange={(t, r) => guestSetup(t, r)}
                onRandom={() => {
                  const s = randomSetup(roster, myId, { team, role })
                  guestSetup(s.team, s.role)
                }}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-3">
              <SectionTitle>Игроки</SectionTitle>
              <RosterList />
              <p className="text-sm text-muted-foreground">Ждём, пока хост начнёт игру…</p>
            </CardContent>
          </Card>
        </>
      )}
    </Screen>
  )
})
