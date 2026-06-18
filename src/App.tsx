import { reatomComponent } from '@reatom/react'
import { useEffect } from 'react'
import { hydrateCustomPacks, screenAtom, type Screen } from './state/ui.ts'
import { Toaster } from '@/components/ui/sonner'
import { Home } from './ui/screens/Home.tsx'
import { Play } from './ui/screens/Play.tsx'
import { Lobby } from './ui/screens/Lobby.tsx'
import { Dicts } from './ui/screens/Dicts.tsx'
import { Rules } from './ui/screens/Rules.tsx'
import { Board } from './ui/screens/Board.tsx'
import { Packs } from './ui/screens/Packs.tsx'
import { HostLobby } from './ui/screens/HostLobby.tsx'
import { AddPlayer } from './ui/screens/AddPlayer.tsx'
import { Join } from './ui/screens/Join.tsx'
import { Settings } from './ui/screens/Settings.tsx'
import { Stats } from './ui/screens/Stats.tsx'

function screenView(screen: Screen) {
  switch (screen) {
    case 'play':
      return <Play />
    case 'lobby':
      return <Lobby />
    case 'dicts':
      return <Dicts />
    case 'rules':
      return <Rules />
    case 'board':
      return <Board />
    case 'packs':
      return <Packs />
    case 'host':
      return <HostLobby />
    case 'host-add':
      return <AddPlayer />
    case 'join':
      return <Join />
    case 'settings':
      return <Settings />
    case 'stats':
      return <Stats />
    default:
      return <Home />
  }
}

export const App = reatomComponent(() => {
  // Убираем стартовый лоадер из index.html после первого рендера реального UI.
  useEffect(() => {
    const loader = document.getElementById('initial-loader')
    if (!loader) return
    loader.classList.add('is-hiding')
    const t = setTimeout(() => loader.remove(), 200)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    void hydrateCustomPacks()
  }, [])

  // Прижимаем оболочку (#root) к visualViewport. При клавиатуре видимая область ужимается и на iOS
  // съезжает вверх — двигаем оболочку следом (height = видимой высоте, transform = её смещению).
  // Тогда контент визуально стоит на месте, документу нечего скроллить, а строка композера (у нижней
  // кромки оболочки) оказывается ровно над клавиатурой — iOS незачем «доставать» поле прокруткой.
  useEffect(() => {
    const vv = window.visualViewport
    const root = document.getElementById('root')
    if (!vv || !root) return
    const apply = () => {
      root.style.height = `${vv.height}px`
      // Держим translate3d постоянно (даже при 0,0): у #root стабильный compositing-слой, поэтому
      // нет паразитного «моргания» оверлея, когда трансформа скачком появлялась при открытии клавы.
      root.style.transform = `translate3d(${vv.offsetLeft}px, ${vv.offsetTop}px, 0)`
    }
    apply()
    vv.addEventListener('resize', apply)
    vv.addEventListener('scroll', apply)
    return () => {
      vv.removeEventListener('resize', apply)
      vv.removeEventListener('scroll', apply)
      root.style.height = ''
      root.style.transform = ''
    }
  }, [])

  const screen = screenAtom()

  // key={screen} перемонтирует экран при каждом переходе → анимация тела (в Screen) играет заново.
  // Toaster — вне keyed-блока, чтобы тосты не сбрасывались при смене экрана.
  // Опускаем тосты на уровень хедера (тот же отступ сверху), иначе на iOS их прячет чёлка.
  const toastTopOffset = { top: 'calc(env(safe-area-inset-top) + 1rem)' }
  return (
    <>
      <div key={screen}>{screenView(screen)}</div>
      <Toaster position="top-center" offset={toastTopOffset} mobileOffset={toastTopOffset} />
    </>
  )
})
