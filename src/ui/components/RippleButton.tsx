import { type ComponentProps, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { tapFeedback } from '@/audio/tap.ts'

interface Ripple {
	id: number
	x: number
	y: number
	size: number
}

/** Событие нажатия в том виде, в каком его ждёт base-ui Button (обёрнуто в BaseUIEvent). */
type ButtonPointerEvent = Parameters<NonNullable<ComponentProps<typeof Button>['onPointerDown']>>[0]

let nextRippleId = 0

function prefersReducedMotion(): boolean {
	return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Кнопка акцентного действия: волна от точки касания + тактильный отклик (tapFeedback).
 * Обёртка над обычным Button с теми же пропсами. Под prefers-reduced-motion волна не запускается.
 */
export function RippleButton({
	className,
	onPointerDown,
	children,
	...props
}: ComponentProps<typeof Button>) {
	const [ripples, setRipples] = useState<Ripple[]>([])

	const handlePointerDown = (e: ButtonPointerEvent) => {
		tapFeedback()
		if (!prefersReducedMotion()) {
			const rect = e.currentTarget.getBoundingClientRect()
			const size = Math.max(rect.width, rect.height) * 2.2
			const id = nextRippleId++
			setRipples((rs) => [...rs, { id, x: e.clientX - rect.left, y: e.clientY - rect.top, size }])
			setTimeout(() => setRipples((rs) => rs.filter((r) => r.id !== id)), 600)
		}
		onPointerDown?.(e)
	}

	return (
		<Button
			className={cn('relative overflow-hidden', className)}
			onPointerDown={handlePointerDown}
			{...props}
		>
			{children}
			{ripples.map((r) => (
				<span
					key={r.id}
					aria-hidden
					className="ripple-ink"
					style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
				/>
			))}
		</Button>
	)
}
