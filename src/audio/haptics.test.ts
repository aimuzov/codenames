import { afterEach, describe, expect, it, vi } from 'vitest'

// Детектор в haptics.ts вычисляется при импорте модуля,
// поэтому navigator подменяем ДО динамического import() и сбрасываем кэш между тестами.
afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('haptics', () => {
  it('vibrate() вызывает navigator.vibrate', async () => {
    const spy = vi.fn()
    vi.stubGlobal('navigator', { vibrate: spy })
    const { vibrate } = await import('./haptics.ts')

    vibrate(20)
    expect(spy).toHaveBeenCalledWith(20)
  })

  it('hapticsSupported() === true на Android при наличии Vibration API', async () => {
    vi.stubGlobal('navigator', {
      vibrate: vi.fn(),
      userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36',
    })
    const { hapticsSupported } = await import('./haptics.ts')

    expect(hapticsSupported()).toBe(true)
  })

  it('hapticsSupported() === false на iOS (нет Vibration API)', async () => {
    vi.stubGlobal('navigator', {})
    const { hapticsSupported } = await import('./haptics.ts')

    expect(hapticsSupported()).toBe(false)
  })

  it('hapticsSupported() === false на десктопе (есть Vibration API, но не Android)', async () => {
    vi.stubGlobal('navigator', {
      vibrate: vi.fn(),
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    })
    const { hapticsSupported } = await import('./haptics.ts')

    expect(hapticsSupported()).toBe(false)
  })
})
