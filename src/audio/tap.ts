import { soundEnabledAtom } from '@/state/settings.ts'
import { resumeAudio, sfxTap } from './sfx.ts'

/**
 * Лёгкий отклик на нажатие кнопки: тихий клик.
 * Гейтится настройкой звука; зовётся на pointerdown (раньше click → отзывчивее).
 */
export function tapFeedback(): void {
	if (soundEnabledAtom()) {
		resumeAudio()
		sfxTap()
	}
}
