import type { Rng } from './types.ts'

/** Перемешивание Фишера–Йетса на инъектируемом RNG (чистое, без мутации входа). */
export function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = a[i]!
    a[i] = a[j]!
    a[j] = tmp
  }
  return a
}
