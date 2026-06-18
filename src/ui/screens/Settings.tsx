import { reatomComponent } from '@reatom/react'
import type { ReactNode } from 'react'
import { Monitor, Moon, RefreshCw, Sun, TimerOff } from 'lucide-react'
import {
  CARD_WORD_SIZES,
  type CardWordSize,
  cardWordSizeAtom,
  hapticsEnabledAtom,
  hideRevealedWordsAtom,
  setCardWordSize,
  setHaptics,
  setHideRevealedWords,
  setSound,
  setTimer,
  soundEnabledAtom,
  TIMER_OPTIONS,
  timerSecondsAtom,
} from '../../state/settings.ts'
import { APP_VERSION, BUILD_TIME, checkForUpdate, updateStatusAtom } from '../../state/pwa.ts'
import { setTheme, themeAtom, type ThemeMode } from '../../state/theme.ts'
import { goBack } from '../../state/ui.ts'
import { hapticsSupported } from '../../audio/haptics.ts'
import { previewSound } from '../../audio/sfx.ts'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { CLOSED_FACE, TILE, WORD_BASE } from '../components/CardTile.tsx'
import { Screen } from '../components/Screen.tsx'
import { TopBar } from '../components/TopBar.tsx'

const timerLabel = (s: number): ReactNode =>
  s === 0 ? <TimerOff className="size-5" /> : `${s / 60} мин`

const cardWordSizeLabel = (s: CardWordSize) =>
  ({ '11px': 'Мелкий', '13px': 'Средний', '15px': 'Крупный', '17px': 'Огромный' })[s]

const buildLabel = new Date(BUILD_TIME).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</h3>
}

export const Settings = reatomComponent(() => {
  const sound = soundEnabledAtom()
  const haptics = hapticsEnabledAtom()
  const hapticsOk = hapticsSupported()
  const timer = timerSecondsAtom()
  const cardWordSize = cardWordSizeAtom()
  const hideRevealedWords = hideRevealedWordsAtom()
  const theme = themeAtom()
  const updateStatus = updateStatusAtom()

  // Подтверждение при включении звука.
  const onSound = (v: boolean) => {
    setSound(v)
    if (v) previewSound()
  }

  const back = () => goBack()

  const updateBusy = updateStatus !== 'idle'

  return (
    <Screen onBack={back} header={<TopBar title="Настройки" onBack={back} showSettings={false} />}>

      <Card>
        <CardContent className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="sound">Звук</Label>
            <Switch id="sound" checked={sound} onCheckedChange={onSound} />
          </div>
          <Separator className="my-1" />
          <div className="flex items-center justify-between">
            <Label htmlFor="haptics" className="flex items-center gap-1.5">
              Вибрация
              {!hapticsOk && <span className="text-xs font-normal text-muted-foreground">недоступно</span>}
            </Label>
            <Switch
              id="haptics"
              checked={haptics}
              disabled={!hapticsOk}
              onCheckedChange={(v) => setHaptics(v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <SectionTitle>Тема</SectionTitle>
          <ToggleGroup
            className="w-full"
            value={[theme]}
            onValueChange={(v) => v[0] && setTheme(v[0] as ThemeMode)}
          >
            <ToggleGroupItem value="light" variant="outline" aria-label="Светлая" className="h-14 flex-1">
              <Sun className="size-6" />
            </ToggleGroupItem>
            <ToggleGroupItem value="system" variant="outline" aria-label="Системная" className="h-14 flex-1">
              <Monitor className="size-6" />
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" variant="outline" aria-label="Тёмная" className="h-14 flex-1">
              <Moon className="size-6" />
            </ToggleGroupItem>
          </ToggleGroup>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <SectionTitle>Таймер хода</SectionTitle>
          <ToggleGroup
            className="w-full"
            value={[String(timer)]}
            onValueChange={(v) => v[0] != null && setTimer(Number(v[0]))}
          >
            {TIMER_OPTIONS.map((s) => (
              <ToggleGroupItem
                key={s}
                value={String(s)}
                variant="outline"
                className="flex-1"
                aria-label={s === 0 ? 'Выкл' : `${s / 60} мин`}
              >
                {timerLabel(s)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <SectionTitle>Размер слов</SectionTitle>
          <div className="grid grid-cols-4 gap-[7px]">
            {CARD_WORD_SIZES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={s === cardWordSize}
                aria-label={cardWordSizeLabel(s)}
                onClick={() => setCardWordSize(s)}
                className={cn(
                  TILE,
                  CLOSED_FACE,
                  'transition-transform active:scale-[0.97]',
                  s === cardWordSize && 'bg-primary text-primary-foreground',
                )}
              >
                <span className={WORD_BASE} style={{ fontSize: s }}>
                  {cardWordSizeLabel(s)}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <Label htmlFor="dim-revealed">Приглушать отгаданные слова</Label>
            <span className="text-xs text-muted-foreground">
              Текст на открытых картах становится еле заметным
            </span>
          </div>
          <Switch
            id="dim-revealed"
            checked={hideRevealedWords}
            onCheckedChange={(v) => setHideRevealedWords(v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <SectionTitle>Билд</SectionTitle>
            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
              <span>версия на устройстве: {APP_VERSION}</span>
              <span>последняя синхронизация: {buildLabel}</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Проверить обновление"
            disabled={updateBusy}
            onClick={() => checkForUpdate()}
          >
            <RefreshCw className={cn(updateBusy && 'animate-spin')} />
          </Button>
        </CardContent>
      </Card>
    </Screen>
  )
})
