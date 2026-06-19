import { reatomComponent } from '@reatom/react'
import type { ReactNode } from 'react'
import { ArrowLeft, Settings } from 'lucide-react'
import { hasUnseenChangelogAtom } from '@/state/changelog.ts'
import { goTo } from '@/state/ui.ts'
import { RippleButton } from './RippleButton.tsx'

/** Кнопка настроек с точкой-индикатором непрочитанного журнала изменений. */
const SettingsButton = reatomComponent(() => {
	const hasUnseen = hasUnseenChangelogAtom()
	return (
		<span className="relative inline-flex">
			<RippleButton
				variant="outline"
				size="icon"
				onClick={() => goTo('settings')}
				aria-label={hasUnseen ? 'Настройки (есть новое)' : 'Настройки'}
			>
				<Settings className="transition-transform duration-300 ease-out group-hover/button:rotate-45 group-active/button:rotate-90" />
			</RippleButton>
			{hasUnseen && (
				<span
					aria-hidden
					className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-primary ring-2 ring-background"
				/>
			)}
		</span>
	)
}, 'SettingsButton')

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
					{showSettings && <SettingsButton />}
				</div>
			)}
		</header>
	)
}
