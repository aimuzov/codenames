import { reatomComponent } from '@reatom/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { navDirectionAtom } from '@/state/ui.ts'
import { Logo } from './Logo.tsx'

/**
 * Раскладка экранов-меню: логотип над кнопками, центрированные по вертикали.
 *
 * Контейнер кнопок имеет фиксированную высоту под три пункта
 * (`3 × h-16 + 2 × gap-3 = 13.5rem`). Поэтому общий блок одинаков по высоте
 * независимо от числа кнопок на конкретном экране — логотип стоит на одном
 * месте и не «прыгает» при переходе между экранами. Кнопок меньше трёх —
 * лишние строки просто остаются пустыми (там же помещается доп. подпись).
 *
 * Enter-анимация перехода вешается только на кнопки: логотип остаётся
 * статичным, как хедер. Поэтому экран должен передавать `Screen` флаг
 * `staticBody` (иначе тело анимируется целиком и логотип уедет вместе с ним).
 */
export const MenuLayout = reatomComponent<{ children: ReactNode }>(({ children }) => {
	const dir = navDirectionAtom()
	return (
		<div className="flex flex-1 flex-col justify-center gap-9">
			<Logo />
			<div className={cn('flex h-[13.5rem] flex-col gap-3', dir === 'back' && 'screen-enter-back')}>
				{children}
			</div>
		</div>
	)
}, 'MenuLayout')
