import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/manrope'
import { App } from './App.tsx'
import { applyTheme } from './state/theme.ts'
import { applyCardWordSize } from './state/settings.ts'
import './state/pwa.ts' // регистрирует service worker при старте
import './index.css'

// Применяем сохранённую тему и размер слов до первого рендера, чтобы не было «вспышки».
applyTheme()
applyCardWordSize()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
