import type { ReactNode } from 'react'
import { ArrowLeft, Settings } from 'lucide-react'
import { goTo } from '../../state/ui.ts'
import { RippleButton } from './RippleButton.tsx'

interface Props {
  /** Заголовок экрана. Строка рендерится как `<h1>`; узел — как есть. Не задан — пропускается. */
  title?: ReactNode
  /** Если задано — слева появляется иконка «назад». */
  onBack?: () => void
  /** Дополнительный контент справа (перед кнопкой настроек). */
  right?: ReactNode
  /** Показывать сквозную кнопку настроек справа (по умолчанию — да). */
  showSettings?: boolean
}

/** Сквозной хедер экрана: [← назад] Заголовок [действия] [⚙]. */
export function TopBar({ title, onBack, right, showSettings = true }: Props) {
  return (
    <header className="flex min-h-10 items-center gap-3">
      {onBack && (
        <RippleButton variant="outline" size="icon" onClick={onBack} aria-label="Назад">
          <ArrowLeft className="transition-transform duration-200 ease-out group-hover/button:-translate-x-0.5 group-active/button:-translate-x-1" />
        </RippleButton>
      )}
      {title &&
        (typeof title === 'string' ? (
          <h1 className="font-heading text-lg font-bold tracking-tight">{title}</h1>
        ) : (
          title
        ))}
      {(right || showSettings) && (
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {right}
          {showSettings && (
            <RippleButton
              variant="outline"
              size="icon"
              onClick={() => goTo('settings')}
              aria-label="Настройки"
            >
              <Settings className="transition-transform duration-300 ease-out group-hover/button:rotate-45 group-active/button:rotate-90" />
            </RippleButton>
          )}
        </div>
      )}
    </header>
  )
}
