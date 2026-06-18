import { Crown, Dices, Flag, Target } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Role, Team } from '@/game/index.ts'

interface Props {
	team: Team
	role: Role
	/** Заблокировать выбор капитана (в выбранной команде уже есть капитан). */
	spymasterDisabled?: boolean
	onChange: (team: Team, role: Role) => void
	/** Случайный выбор команды и роли. Кнопка показывается, только если задан. */
	onRandom?: () => void
}

interface Segment<T extends string> {
	value: T
	label: ReactNode
	/** Класс фона «бегунка», когда этот сегмент активен. */
	thumbClass: string
	/** Класс цвета подписи активного сегмента (контраст к бегунку). */
	activeTextClass: string
	disabled?: boolean
}

/**
 * Слитный сегмент-контрол с «бегунком», который скользит к выбранному сегменту.
 * Бегунок позиционируется абсолютно и сдвигается через translateX по индексу.
 */
function SegmentedToggle<T extends string>({
	value,
	options,
	ariaLabel,
	onChange,
}: {
	value: T
	options: Segment<T>[]
	ariaLabel: string
	onChange: (value: T) => void
}) {
	const index = options.findIndex((o) => o.value === value)
	const active = options[index]
	return (
		<div
			role="radiogroup"
			aria-label={ariaLabel}
			className="relative flex w-full rounded-lg border border-input bg-muted p-1"
		>
			<span
				aria-hidden
				className={cn(
					'pointer-events-none absolute inset-y-1 left-1 rounded-md transition-[transform,background-color] duration-200 ease-out',
					active?.thumbClass,
				)}
				style={{
					width: `calc((100% - 0.5rem) / ${options.length})`,
					transform: `translateX(${index * 100}%)`,
				}}
			/>
			{options.map((o) => {
				const isActive = o.value === value
				return (
					<button
						key={o.value}
						type="button"
						role="radio"
						aria-checked={isActive}
						disabled={o.disabled}
						onClick={() => onChange(o.value)}
						className={cn(
							'relative z-10 flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors [&_svg]:size-4 disabled:pointer-events-none disabled:opacity-50',
							isActive ? o.activeTextClass : 'text-muted-foreground',
						)}
					>
						{o.label}
					</button>
				)
			})}
		</div>
	)
}

/** Выбор команды и роли (капитан/игрок) сегмент-контролами с бегунком. */
export function SetupPicker({ team, role, spymasterDisabled, onChange, onRandom }: Props) {
	return (
		<div className="flex flex-col gap-2">
			<SegmentedToggle
				ariaLabel="Команда"
				value={team}
				onChange={(t) => onChange(t, role)}
				options={[
					{
						value: 'red',
						thumbClass: 'bg-team-red',
						activeTextClass: 'text-team-red-foreground',
						label: (
							<>
								<Flag />
								Красные
							</>
						),
					},
					{
						value: 'blue',
						thumbClass: 'bg-team-blue',
						activeTextClass: 'text-team-blue-foreground',
						label: (
							<>
								<Flag />
								Синие
							</>
						),
					},
				]}
			/>

			<SegmentedToggle
				ariaLabel="Роль"
				value={role}
				onChange={(r) => onChange(team, r)}
				options={[
					{
						value: 'operative',
						thumbClass: 'bg-primary',
						activeTextClass: 'text-primary-foreground',
						label: (
							<>
								<Target />
								Игрок
							</>
						),
					},
					{
						value: 'spymaster',
						thumbClass: 'bg-primary',
						activeTextClass: 'text-primary-foreground',
						disabled: spymasterDisabled,
						label: (
							<>
								<Crown />
								Капитан
							</>
						),
					},
				]}
			/>

			{onRandom && (
				<Button type="button" variant="outline" className="w-full" onClick={onRandom}>
					<Dices />
					Случайно
				</Button>
			)}
		</div>
	)
}
