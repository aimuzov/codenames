import { reatomComponent } from '@reatom/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { navDirectionAtom } from '../../state/ui.ts'
import { useEdgeSwipeBack } from '../hooks.ts'

interface Props {
  /** Хедер, закреплённый сверху (обычно `<TopBar />`). Не скроллится вместе с телом. */
  header?: ReactNode
  /** Классы для прокручиваемого тела (например, переопределить gap). */
  className?: string
  /** Обработчик «назад» для жеста edge-swipe (тот же, что у кнопки в `TopBar`). */
  onBack?: () => void
  /** Градиент-затухание у нижней кромки (зеркально хедеру), чтобы контент уходил в фон, а не обрывался. */
  bottomFade?: boolean
  /**
   * Не проигрывать enter-анимацию для тела целиком — контент сам управляет
   * движением. Нужно, когда часть контента должна оставаться статичной, как
   * хедер (например, `MenuLayout` держит логотип на месте, а анимирует только
   * кнопки).
   */
  staticBody?: boolean
  children?: ReactNode
}

/**
 * Каркас экрана: прибитый сверху хедер + прокручиваемое тело, с safe-area отступами.
 *
 * Хедер — `sticky` внутри скролл-контейнера, поэтому контент проезжает под ним, а
 * градиентный фон хедера (сплошной сверху → прозрачный у нижней кромки) даёт мягкое
 * просвечивание. Фон строится от `--background`, так что работает и в тёмной теме.
 *
 * При `bottomFade` у нижней кромки добавляется зеркальный градиент (прозрачный →
 * сплошной), чтобы контент растворялся в фоне, а не обрывался у края экрана.
 *
 * При возврате (`navDirection === 'back'`) анимируется только тело — хедер вне
 * анимируемого узла, поэтому остаётся статичным. Переход «вперёд» — без анимации.
 */
export const Screen = reatomComponent<Props>(
  ({ header, className, onBack, bottomFade, staticBody, children }) => {
    useEdgeSwipeBack(onBack)
    const dir = navDirectionAtom()
    return (
      <div className="relative mx-auto flex h-dvh w-full max-w-md flex-col">
        <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto overflow-x-clip overscroll-contain pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
          {header && (
            <div className="sticky top-0 z-10 bg-linear-to-t from-background/0 to-background to-[1rem] px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3">
              {header}
            </div>
          )}
          <div
            className={cn(
              'flex flex-1 flex-col gap-3.5 px-4 pt-0.5',
              !staticBody && dir === 'back' && 'screen-enter-back',
              className,
            )}
          >
            {children}
          </div>
        </div>
        {bottomFade && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[calc(env(safe-area-inset-bottom)+1rem)] bg-linear-to-b from-background/0 to-background to-[1rem]" />
        )}
      </div>
    )
  },
  'Screen',
)
