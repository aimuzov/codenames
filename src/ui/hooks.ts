import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { RedactedState } from '@/game/index.ts'
import { endTurn, type Mode } from '@/state/session.ts'
import { soundEnabledAtom, timerSecondsAtom } from '@/state/settings.ts'
import { sfxReveal, sfxWin } from '@/audio/sfx.ts'
import { endTurnLockLeft, turnSecondsLeft, turnStartedAt } from './turnTimer.ts'

/** За сколько секунд до конца хода предупреждаем, что время заканчивается. */
const TURN_WARN_SECONDS = 20

/** На сколько секунд блокируется «Завершить ход» в начале хода — гасит случайный тап при передаче телефона. */
const END_TURN_LOCK_SECONDS = 5

/** Звук на открытие карт и завершение партии. */
export function useGameFeedback(view: RedactedState | null) {
	const prevRevealed = useRef<Set<number>>(new Set())
	const prevOver = useRef(false)

	useEffect(() => {
		if (!view) {
			prevRevealed.current = new Set()
			prevOver.current = false
			return
		}

		const now = new Set<number>()
		const newly: number[] = []
		view.cards.forEach((c, i) => {
			if (c.revealed) {
				now.add(i)
				if (!prevRevealed.current.has(i)) newly.push(i)
			}
		})

		// Меньше открытых, чем было → новая партия: без звуков.
		const isReset = now.size < prevRevealed.current.size
		if (!isReset) {
			for (const i of newly) {
				const type = view.cards[i]!.type
				if (!type) continue
				if (soundEnabledAtom()) sfxReveal(type)
			}
		}
		prevRevealed.current = now

		const over = view.phase === 'over'
		if (over && !prevOver.current && !isReset) {
			if (soundEnabledAtom()) sfxWin()
		}
		prevOver.current = over
	}, [view])
}

/** Обратный отсчёт хода. Возвращает долю оставшегося времени 0..1 (или null). Хост/локаль авто-завершают ход. */
export function useTurnTimer(view: RedactedState | null, mode: Mode): number | null {
	const timerSec = timerSecondsAtom()
	const [left, setLeft] = useState<number | null>(null)

	// Старт хода берём из лога партии (см. turnStartedAt): он переживает перемонтирование Board
	// и синхронизируется гостям, поэтому заход в настройки и обратно не перезапускает отсчёт.
	const startedAt = turnStartedAt(view)

	useEffect(() => {
		if (!timerSec || startedAt == null) {
			setLeft(null)
			return
		}
		const remaining = () => turnSecondsLeft(startedAt, timerSec, Date.now())
		setLeft(remaining())
		// Предупреждаем один раз за ход. Если на момент маунта время уже на исходе (короткий ход
		// или вернулись из настроек под конец) — повторно не тревожим.
		let warned = remaining() <= TURN_WARN_SECONDS
		const id = setInterval(() => {
			const rem = remaining()
			setLeft(rem)
			if (!warned && rem <= TURN_WARN_SECONDS) {
				warned = true
				toast.warning('Время на ход заканчивается', {
					description: `Осталось ${TURN_WARN_SECONDS} секунд`,
					// Оранжевая окраска только этого тоста (остальные — нейтральные).
					// Имена --toast-warn-* специально не совпадают с внутренними --warning-* sonner,
					// иначе var() резолвится в его бледный фон (он задаёт их на самом тостере).
					// min-height: тост стартует на уровне верха хедера, а 6rem дотягивают его до низа
					// строки чипов «Красные ходят» (хедер 44px + 12px + 2px + строка чипов ~38px).
					style: {
						'--normal-bg': 'var(--toast-warn-bg)',
						'--normal-border': 'var(--toast-warn-border)',
						'--normal-text': 'var(--toast-warn-text)',
						minHeight: '6rem',
						// Крупнее дефолтных 13px sonner — заголовок и описание наследуют этот размер.
						fontSize: '1rem',
					} as React.CSSProperties,
				})
			}
			if (rem <= 0) {
				clearInterval(id)
				if (mode !== 'guest') endTurn()
			}
		}, 250)
		return () => clearInterval(id)
	}, [startedAt, timerSec, mode])

	// Доля оставшегося времени: 1 в начале хода, 0 в конце (timerSec>0, раз left не null).
	return left === null ? null : left / timerSec
}

/**
 * Блокировка кнопки «Завершить ход» в начале хода. Возвращает целое число секунд
 * до разблокировки (0 — кнопка доступна) для показа отсчёта на кнопке.
 * Якорь — старт хода (turnStartedAt), а не маунт: возврат из настроек отсчёт не
 * перезапускает, а слишком долгая передача телефона застанет кнопку уже открытой.
 */
export function useEndTurnLock(view: RedactedState | null): number {
	const [left, setLeft] = useState(0)
	const startedAt = turnStartedAt(view)

	useEffect(() => {
		if (startedAt == null) {
			setLeft(0)
			return
		}
		const remaining = () => Math.ceil(endTurnLockLeft(startedAt, END_TURN_LOCK_SECONDS, Date.now()))
		const initial = remaining()
		setLeft(initial)
		if (initial <= 0) return // блокировка уже истекла — интервал не нужен
		const id = setInterval(() => {
			const rem = remaining()
			setLeft(rem)
			if (rem <= 0) clearInterval(id)
		}, 250)
		return () => clearInterval(id)
	}, [startedAt])

	return left
}

/**
 * Edge-swipe от левого края экрана вправо → «назад».
 * Слушает touch на `window` без `preventDefault`, чтобы не мешать вертикальному скроллу.
 * Жест, начатый на интерактивном элементе (кнопка, поле), игнорируется.
 * Если `onBack` не передан (экран без «назад») — жест ничего не делает.
 */
export function useEdgeSwipeBack(onBack?: () => void) {
	const cb = useRef(onBack)
	cb.current = onBack

	useEffect(() => {
		const EDGE_ZONE = 30 // px от левого края, где жест может начаться
		const THRESHOLD = 70 // px горизонтального хода вправо для срабатывания
		const MAX_DURATION = 600 // ms — слишком медленный «свайп» жестом не считаем

		let active = false
		let startX = 0
		let startY = 0
		let startT = 0

		const onStart = (e: TouchEvent) => {
			const t = e.touches[0]
			active = false
			if (e.touches.length !== 1 || !t || t.clientX > EDGE_ZONE) return
			// Не перехватываем жест, начатый на интерактивном элементе (кнопка «назад» и т.п.).
			const target = e.target as Element | null
			if (
				target?.closest?.('button, a, input, textarea, select, [role="button"], [role="slider"]')
			) {
				return
			}
			active = true
			startX = t.clientX
			startY = t.clientY
			startT = e.timeStamp
		}

		const onEnd = (e: TouchEvent) => {
			if (!active) return
			active = false
			const t = e.changedTouches[0]
			if (!t) return
			const dx = t.clientX - startX
			const dy = t.clientY - startY
			if (dx >= THRESHOLD && dx > Math.abs(dy) && e.timeStamp - startT <= MAX_DURATION) {
				cb.current?.()
			}
		}

		const reset = () => {
			active = false
		}

		window.addEventListener('touchstart', onStart, { passive: true })
		window.addEventListener('touchend', onEnd, { passive: true })
		window.addEventListener('touchcancel', reset, { passive: true })
		return () => {
			window.removeEventListener('touchstart', onStart)
			window.removeEventListener('touchend', onEnd)
			window.removeEventListener('touchcancel', reset)
		}
	}, [])
}
