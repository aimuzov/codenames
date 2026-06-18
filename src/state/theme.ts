import { action, atom } from '@reatom/core'

export type ThemeMode = 'system' | 'light' | 'dark'

const KEY = 'codenames.theme'

function load(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
  } catch {
    return 'system'
  }
}

export const themeAtom = atom<ThemeMode>(load(), 'theme')

const media =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null

function resolveDark(mode: ThemeMode): boolean {
  if (mode === 'dark') return true
  if (mode === 'light') return false
  return media?.matches ?? false
}

/** Применяет тему к <html>: класс `.dark` для тёмной (учитывая системный режим). */
export function applyTheme(mode: ThemeMode = themeAtom()): void {
  document.documentElement.classList.toggle('dark', resolveDark(mode))
}

export const setTheme = action((mode: ThemeMode) => {
  themeAtom.set(mode)
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    // приватный режим / нет доступа — тема просто не сохранится
  }
  applyTheme(mode)
}, 'setTheme')

// Реагируем на смену системной темы, пока выбран режим «Системная».
media?.addEventListener('change', () => {
  if (themeAtom() === 'system') applyTheme('system')
})
