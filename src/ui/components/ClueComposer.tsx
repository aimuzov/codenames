import { reatomComponent } from '@reatom/react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CornerDownLeft, Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RippleButton } from './RippleButton.tsx'
import type { Team } from '../../game/index.ts'
import {
  giveClue,
  modeAtom,
  myRoleAtom,
  myTeamAtom,
  viewAtom,
  viewRoleAtom,
} from '../../state/session.ts'
import { composerOpenAtom } from '../../state/ui.ts'

const TEAM_BORDER: Record<Team, string> = { red: 'border-l-team-red', blue: 'border-l-team-blue' }
const TEAM_SOLID: Record<Team, string> = {
  red: 'bg-team-red text-team-red-foreground hover:bg-team-red/90',
  blue: 'bg-team-blue text-team-blue-foreground hover:bg-team-blue/90',
}

const BAR = 'flex h-[70px] items-center rounded-xl border border-border border-l-4 bg-card'

// Держатель смонтированного поля ввода: `openComposer` фокусирует его синхронно в рамках тапа —
// иначе на iOS не поднимается клавиатура. Поле держим предмонтированным всё время, пока капитан
// может давать подсказку, потому что Reatom уведомляет React микротаском и открытие оверлея по
// атому происходит уже после обработчика жеста.
let clueInputEl: HTMLInputElement | null = null
const setClueInputEl = (node: HTMLInputElement | null) => {
  clueInputEl = node
}
/** Фокус на поле подсказки, если композер сейчас на экране (иначе no-op). */
function focusClueInput() {
  // preventScroll: иначе браузер дополнительно «подматывает» страницу к полю при фокусе. Бар и так
  // сидит над клавиатурой (оболочка #root прижата к visualViewport), поэтому подмотка не нужна.
  clueInputEl?.focus({ preventScroll: true })
}

/** Открыть оверлей ввода подсказки и синхронно сфокусировать поле (см. коммент к `clueInputEl`). */
export function openComposer() {
  composerOpenAtom.set(true)
  focusClueInput()
}

/**
 * Оверлей ввода подсказки поверх доски. Поле предмонтировано, пока `canCompose`; видимость — через
 * `composerOpenAtom`.
 *
 * Рендерится порталом в `#root` — оболочку, прижатую к `visualViewport` (см. App.tsx). За счёт этого
 * оверлей `absolute inset-0` отсчитывается от видимой области, а строка композера у нижней кромки
 * оказывается ровно над клавиатурой. Документ не переполняется → iOS нечего проматывать, доска не
 * прыгает. Портал (а не рендер внутри `Screen`) выносит поле из прокручиваемого контейнера `Screen`.
 */
export const ClueComposer = reatomComponent(() => {
  const [word, setWord] = useState('')
  const [num, setNum] = useState(2)
  const [barShown, setBarShown] = useState(false)

  const view = viewAtom()
  const isLocal = modeAtom() === 'local'
  const team = view?.currentTeam ?? 'red'
  const canCompose =
    !!view &&
    view.phase === 'clue' &&
    (isLocal
      ? viewRoleAtom() === 'spymaster'
      : myTeamAtom() === team && myRoleAtom() === 'spymaster')

  const open = composerOpenAtom()

  // Плашка композера проявляется через 250мс после открытия — отдельным стейтом, а не CSS
  // transition-delay: тогда opacity меняется уже на видимом оверлее и переход не «проглатывается».
  useEffect(() => {
    if (!open) {
      setBarShown(false)
      return
    }
    const id = setTimeout(() => setBarShown(true), 250)
    return () => clearTimeout(id)
  }, [open])

  // Сброс при выходе из режима подсказки (выдали подсказку / сменили роль / конец игры).
  useEffect(() => {
    if (!canCompose) {
      composerOpenAtom.set(false)
      setWord('')
      setNum(2)
    }
  }, [canCompose])

  // Закрытие по Esc (десктоп).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') composerOpenAtom.set(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!canCompose) return null

  const close = () => composerOpenAtom.set(false)
  const submit = () => {
    const w = word.trim()
    if (!w) return
    giveClue(w, num)
    setWord('')
    setNum(2)
    composerOpenAtom.set(false)
  }

  // Плашка счётчика плавно темнеет с ростом числа (1 — светлая, 9 — тёмная) на абсолютной шкале.
  const t = (num - 1) / 8
  const bgL = 0.94 - t * (0.94 - 0.3)
  const stepperStyle = {
    backgroundColor: `oklch(${bgL} 0.008 60)`,
    color: `oklch(${bgL > 0.62 ? 0.22 : 0.97} 0.005 60)`,
  }

  return createPortal(
    <div
      className={cn(
        'absolute inset-0 z-50 transition-opacity duration-200',
        open ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      {/* полупрозрачный фон: растянут далеко за пределы #root (вверх и вниз), чтобы снизу под
          клавиатурой не оставалось светлой полосы; края всё равно обрежет body. Тап закрывает. */}
      <div className="absolute inset-x-0 -top-[50vh] h-[250vh] bg-black/20" onClick={close} />

      {/* строка композера у нижней кромки оболочки — она же над клавиатурой */}
      <div className="absolute inset-x-0 bottom-0 px-3 pb-3">
        {/* плашку проявляем целиком через 250мс (см. barShown) — поле прозрачное/пустое, фейдить
            только его визуально нечего; пауза скрывает мельтешение, пока доезжает клавиатура */}
        <div
          className={cn(
            BAR,
            'relative gap-2 px-3 transition-opacity duration-500',
            TEAM_BORDER[team],
            barShown ? 'opacity-100' : 'opacity-0',
          )}
        >
          <Input
            ref={setClueInputEl}
            value={word}
            // Подсказка — одно слово: оставляем только первый непробельный токен (пробел не проходит)
            onChange={(e) => setWord(e.target.value.match(/\S+/)?.[0] ?? '')}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            autoCapitalize="none"
            enterKeyHint="send"
            className="h-auto flex-1 border-0 bg-transparent px-2 text-base font-semibold lowercase tracking-wide shadow-none focus-visible:ring-0"
          />
          <div
            className="flex items-center gap-1 rounded-lg px-1.5 py-1 transition-colors duration-300"
            style={stepperStyle}
            // preventDefault на mousedown — чтобы тап по ±-кнопкам не уводил фокус с поля
            // подсказки и не прятал клавиатуру (onClick при этом срабатывает как обычно).
            onMouseDown={(e) => e.preventDefault()}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Меньше"
              onClick={() => setNum((n) => Math.max(1, n - 1))}
            >
              <Minus />
            </Button>
            <span className="min-w-4 text-center font-heading font-bold">{num}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Больше"
              onClick={() => setNum((n) => Math.min(9, n + 1))}
            >
              <Plus />
            </Button>
          </div>
          <RippleButton
            type="button"
            size="icon"
            onClick={submit}
            disabled={!word.trim()}
            aria-label="Дать"
            className={TEAM_SOLID[team]}
          >
            <CornerDownLeft />
          </RippleButton>
        </div>
      </div>
    </div>,
    document.getElementById('root') ?? document.body,
  )
})
