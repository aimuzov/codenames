/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Шрифтовой пакет — это CSS-импорт без типов.
declare module '@fontsource-variable/manrope'

// Подставляются через define в vite.config.ts.
declare const __APP_VERSION__: string
declare const __BUILD_TIME__: string
