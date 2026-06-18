import { hapticsEnabledAtom, soundEnabledAtom } from '../state/settings.ts'
import { resumeAudio, sfxTap } from './sfx.ts'
import { HAPTIC, vibrate } from './haptics.ts'

/**
 * Лёгкий отклик на нажатие кнопки: тихий клик + короткое вибро.
 * Гейтится настройками звука/вибрации; зовётся на pointerdown (раньше click → отзывчивее).
 */
export function tapFeedback(): void {
  if (soundEnabledAtom()) {
    resumeAudio()
    sfxTap()
  }
  if (hapticsEnabledAtom()) vibrate(HAPTIC.tap)
}
