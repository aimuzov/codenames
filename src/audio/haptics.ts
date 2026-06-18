/** Тактильная отдача через Vibration API. На iOS API нет — там вибрация заблокирована в настройках. */
export function vibrate(pattern: number | readonly number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern as number | number[])
    } catch {
      // некоторые движки бросают при запрете — игнорируем
    }
  }
}

/** Android-устройство: только там вибрация реально работает (iOS API не даёт, десктоп физически не вибрирует). */
function isAndroid(): boolean {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
}

/** Поддерживается ли вибрация (доступна только на Android). */
export function hapticsSupported(): boolean {
  return isAndroid() && 'vibrate' in navigator
}

export const HAPTIC = {
  tap: 10,
  reveal: 20,
  assassin: [60, 40, 80],
  win: [40, 30, 40, 30, 90],
} as const
