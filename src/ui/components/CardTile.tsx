import { useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import type { CardType, RedactedCard, Team } from '@/game/index.ts'
import { cn } from '@/lib/utils'

interface Props {
	card: RedactedCard
	interactive: boolean
	onReveal: () => void
	/** Прятать слово на открытой карте: текст становится прозрачным, а его блок заливается тоном карты. */
	hideWord?: boolean
}

/** Сплошная заливка открытой карты по типу. */
const SOLID: Record<CardType, string> = {
	red: 'bg-team-red text-team-red-foreground',
	blue: 'bg-team-blue text-team-blue-foreground',
	neutral: 'bg-card-neutral text-card-neutral-foreground',
	assassin: 'bg-card-assassin text-card-assassin-foreground',
}

/** Тинт закрытой карты в виде капитана. */
const TINT: Record<CardType, string> = {
	red: 'bg-team-red-tint text-team-red-tint-foreground',
	blue: 'bg-team-blue-tint text-team-blue-tint-foreground',
	neutral: 'bg-card-neutral-tint text-card-neutral-tint-foreground',
	assassin: 'bg-card-assassin-tint text-card-assassin-tint-foreground',
}

/** Цвет акцентной полоски (намёк на тип) в виде капитана. */
const BAR: Record<CardType, string> = {
	red: 'bg-team-red',
	blue: 'bg-team-blue',
	neutral: 'bg-card-neutral',
	assassin: 'bg-card-assassin-tint-foreground',
}

/**
 * Цвет точки открывшей команды (правый нижний угол открытой карты).
 * Берём яркий оттенок — он светлее любого фона карты, поэтому точка заметна
 * и на «своём» цвете, и на чужом/нейтральном/ассасине.
 */
const OPENED_DOT: Record<Team, string> = {
	red: 'bg-team-red-bright',
	blue: 'bg-team-blue-bright',
}

export const TILE =
	'relative flex min-h-[4rem] items-center justify-center overflow-hidden rounded-lg px-1 py-1.5 text-center'
/** Типографика слова без размера — размер задаётся отдельно (на карте — через CSS-переменную). */
export const WORD_BASE = 'font-heading w-full font-semibold leading-[1.1] tracking-wide break-words'
/** Визуал закрытой нейтральной карты игрока. */
export const CLOSED_FACE = 'bg-card text-card-foreground ring-1 ring-foreground/10'
const WORD = cn(WORD_BASE, 'text-[length:var(--card-word-size,0.8125rem)]')

/** Сколько держим галочку/крестик перед возвратом к слову (см. REVEAL_POPUP_DELAY_MS в session.ts). */
const ICON_HOLD_MS = 1000
/** Длительность дрожания чужой карты. */
const SHAKE_MS = 500

/**
 * Плитка карты: скрытая (игрок), подсвеченная (капитан) или открытая.
 *
 * Корень всегда `<button>` — один и тот же DOM-узел при открытии карты, поэтому
 * фон/текст плавно перетекают в нужный цвет (`transition-colors`). В момент
 * открытия слово на ~секунду сменяется галочкой (своя) или крестиком (чужая),
 * а чужая карта при этом дрожит.
 */
export function CardTile({ card, interactive, onReveal, hideWord = false }: Props) {
	const type = card.type
	const revealed = card.revealed && type !== null
	const tinted = !card.revealed && type !== null
	const clickable = interactive && !card.revealed && type === null
	// Чужая открытая карта: открыта не своим типом (соперник / нейтрал / ассасин).
	const foreign = revealed && card.openedBy !== undefined && card.openedBy !== type

	// Реакция на открытие: иконка вместо слова + дрожание (для чужой).
	const prevRevealed = useRef(card.revealed)
	const [showIcon, setShowIcon] = useState(false)
	const [shake, setShake] = useState(false)
	// Слово приглушено (режим «приглушать отгаданные»). Включается, как только отыграла
	// галочка/крестик (showIcon погас) — слово проявляется сразу приглушённым, без вспышки.
	const masked = revealed && hideWord && !showIcon

	useEffect(() => {
		const was = prevRevealed.current
		prevRevealed.current = card.revealed
		// Срабатывает только на переходе «закрыта → открыта» (не на маунте уже открытой).
		if (!card.revealed || was || type === null || card.openedBy === undefined) return

		setShowIcon(true)
		const timers = [setTimeout(() => setShowIcon(false), ICON_HOLD_MS)]
		if (card.openedBy !== type) {
			setShake(true)
			timers.push(setTimeout(() => setShake(false), SHAKE_MS))
		}
		return () => timers.forEach(clearTimeout)
	}, [card.revealed, type, card.openedBy])

	return (
		<button
			type="button"
			disabled={!clickable}
			onClick={clickable ? onReveal : undefined}
			className={cn(
				TILE,
				revealed ? SOLID[type] : tinted ? TINT[type] : CLOSED_FACE,
				// Открытие — плавная заливка цветом; закрытая — отклик на нажатие.
				revealed
					? 'transition-colors duration-500'
					: 'transition-transform enabled:active:scale-[0.97] disabled:cursor-default',
				shake && 'animate-card-shake',
			)}
		>
			{/* Слово в потоке задаёт размер ячейки. В режиме скрытия оно становится еле видимым. */}
			<span className={cn(WORD, 'relative block min-w-0', revealed && 'opacity-95')}>
				<span
					className={cn(
						'block transition-opacity duration-200',
						showIcon ? 'opacity-0' : masked ? 'opacity-30' : 'opacity-100',
					)}
				>
					{card.word}
				</span>

				{/* Реакция на открытие: галочка (своя) / крестик (чужая) поверх слова — блёклым тоном текста карты. */}
				<span
					aria-hidden
					className={cn(
						'absolute inset-0 flex items-center justify-center transition-opacity duration-200',
						showIcon ? 'opacity-60' : 'opacity-0',
					)}
				>
					{foreign ? <X className="size-6" /> : <Check className="size-6" />}
				</span>
			</span>

			{/* Капитан видит тип закрытой карты — акцентная полоска снизу. */}
			{tinted && (
				<span className={cn('absolute inset-x-2 bottom-1.5 h-[3px] rounded-full', BAR[type])} />
			)}

			{/* Открыта чужой командой — точка-метка открывшего в правом нижнем углу. */}
			{foreign && card.openedBy && (
				<span
					className={cn(
						'absolute right-2 bottom-1.5 size-1 rounded-full',
						OPENED_DOT[card.openedBy],
					)}
				/>
			)}
		</button>
	)
}
