import { action, atom } from '@reatom/core'
import { registerSW } from 'virtual:pwa-register'
import { toast } from 'sonner'

/** Версия и время сборки (подставляются через define в vite.config.ts). */
export const APP_VERSION = __APP_VERSION__
export const BUILD_TIME = __BUILD_TIME__

/** Состояние ручной проверки обновления — только чтобы крутить спиннер на кнопке. Результат показываем тостом. */
export type UpdateStatus = 'idle' | 'checking' | 'updating'
export const updateStatusAtom = atom<UpdateStatus>('idle', 'updateStatus')

let registration: ServiceWorkerRegistration | undefined

// Регистрируем service worker и сохраняем ссылку для ручной проверки.
// registerType: 'autoUpdate' сам активирует новую версию и перезагрузит страницу, когда найдёт её.
// В dev сервис-воркер отключён (devOptions.enabled: false), поэтому здесь это no-op.
const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, r) {
    registration = r
  },
})

/** Принудительно проверяет обновление приложения и применяет его, если найдено. */
export const checkForUpdate = action(async () => {
  updateStatusAtom.set('checking')
  const toastId = toast.loading('Проверяю обновление…')
  try {
    await registration?.update()
    // Новый воркер уже устанавливается/ждёт → активируем его и перезагружаемся.
    if (registration?.installing || registration?.waiting) {
      updateStatusAtom.set('updating')
      toast.loading('Найдено обновление, перезагружаю…', { id: toastId })
      await updateSW(true)
    } else {
      toast.success('Установлена последняя версия', { id: toastId })
      updateStatusAtom.set('idle')
    }
  } catch {
    toast.error('Не удалось проверить обновление', { id: toastId })
    updateStatusAtom.set('idle')
  }
}, 'checkForUpdate')
