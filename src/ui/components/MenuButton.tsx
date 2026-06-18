import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { tapFeedback } from '../../audio/tap.ts'

interface Props {
  /** Ведущая иконка (lucide), например `<Play />`. */
  icon: ReactNode
  children: ReactNode
  onClick: () => void
  variant?: 'default' | 'outline'
  disabled?: boolean
  /** Главный CTA экрана: добавляет скользящий блик (sheen). Не больше одной на экран. */
  accent?: boolean
}

/** Крупная навигационная кнопка меню: иконка + подпись + шеврон (намёк на переход). */
export function MenuButton({
  icon,
  children,
  onClick,
  variant = 'default',
  disabled = false,
  accent = false,
}: Props) {
  return (
    <Button
      size="lg"
      variant={variant}
      disabled={disabled}
      onPointerDown={() => tapFeedback()}
      onClick={onClick}
      className={cn('w-full justify-start gap-3', accent && 'btn-sheen')}
    >
      {icon}
      <span>{children}</span>
      <ChevronRight className="ml-auto opacity-60 transition-transform group-hover/button:translate-x-0.5 group-active/button:translate-x-1" />
    </Button>
  )
}
