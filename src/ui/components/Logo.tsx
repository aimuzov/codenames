import { useState } from 'react'

/**
 * Варианты логотипа из `public/logos/`. Чтобы добавить/убрать вариант —
 * положите файл в эту папку, поправьте список здесь и preload-ссылки в
 * index.html (прогрев кэша на старте). Остальная логика (случайный выбор
 * при загрузке, смена по клику) работает с любым количеством вариантов.
 */
const LOGOS = ['/logos/1.png', '/logos/2.png', '/logos/3.png']

/** Случайный индекс варианта; при `exclude` гарантированно вернёт другой. */
function pickLogo(exclude?: number): number {
  const candidates = LOGOS.map((_, i) => i).filter((i) => i !== exclude)
  return candidates[Math.floor(Math.random() * candidates.length)]
}

/**
 * Логотип над меню: при загрузке показывает случайный вариант, по клику
 * меняется на любой из остальных. В тёмной теме инвертируется фильтром
 * (чёрный рисунок → белый), чтобы оставаться читаемым на тёмном фоне.
 */
export function Logo() {
  // Ленивый инициализатор зовётся без аргументов → случайный из всех.
  // Апдейтер получает текущий индекс → выбирает заведомо другой вариант.
  const [index, setIndex] = useState(pickLogo)

  return (
    <button
      type="button"
      onClick={() => setIndex(pickLogo)}
      aria-label="Сменить логотип"
      className="mx-auto block cursor-pointer rounded-2xl outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <img
        src={LOGOS[index]}
        alt="Codenames"
        draggable={false}
        className="h-auto w-40 select-none dark:invert"
      />
    </button>
  )
}
