import { Heart } from 'lucide-react'

/**
 * Подпись автора у нижней кромки экранов-меню. Ставится сразу после `MenuLayout`
 * (тот занимает `flex-1`), поэтому естественно прижимается к низу. Вся фраза —
 * ссылка на телеграм, открывается в новой вкладке.
 */
export function Footer() {
  return (
    <footer className="pb-1 text-center">
      <a
        href="https://t.me/aimuzov"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        made with
        <Heart className="size-3.5 fill-red-500 text-red-500" aria-hidden />
        by aimuzov
      </a>
    </footer>
  )
}
