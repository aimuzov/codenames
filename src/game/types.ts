/** Команда. */
export type Team = 'red' | 'blue'

/** Тип карты (секретный ключ). */
export type CardType = 'red' | 'blue' | 'neutral' | 'assassin'

/** Роль игрока. */
export type Role = 'spymaster' | 'operative'

/** Фаза партии. */
export type GamePhase = 'clue' | 'guess' | 'over'

/** Карта на поле. */
export interface Card {
  word: string
  /** Истинный тип карты — секрет, известный только капитанам. */
  type: CardType
  revealed: boolean
  /** Команда, открывшая карту (публичный факт). undefined, пока карта закрыта. */
  openedBy?: Team
}

/** Активная подсказка капитана. */
export interface Clue {
  word: string
  /** Число связанных слов (>= 1). */
  count: number
  team: Team
}

/** Полное состояние партии (каноническое, хранится у хоста). */
export interface GameState {
  cards: Card[]
  /** Команда с 9 картами (ходит первой). */
  startingTeam: Team
  /** Чей сейчас ход. */
  currentTeam: Team
  phase: GamePhase
  clue: Clue | null
  /** Сколько карт ещё можно открыть в текущем ходу. */
  guessesRemaining: number
  /** Слово подсказки из предыдущего хода каждой команды (для бонуса). null, пока хода не было. */
  prevClueWord: Record<Team, string | null>
  /** Победившая команда (если игра окончена). */
  winner: Team | null
  /** Таймлайн партии: подсказки, открытия, передачи хода (для экрана статистики). */
  log: LogEntry[]
}

/** Конфиг создания партии. */
export interface GameConfig {
  /** Пул слов (>= 25 уникальных). Из него случайно берутся 25. */
  words: string[]
  /** Стартовая команда. Если не задана — выбирается RNG. */
  startingTeam?: Team
}

/** Источник случайности: функция, возвращающая число в [0, 1). */
export type Rng = () => number

/** События, изменяющие партию (применяются чистым редьюсером). */
export type GameEvent =
  | { type: 'GIVE_CLUE'; word: string; count: number }
  | { type: 'REVEAL_CARD'; index: number }
  | { type: 'END_TURN' }

/**
 * Запись таймлайна партии. Накапливается в `GameState.log` (см. редьюсер).
 * Содержит только публичные факты, поэтому безопасна для рассылки гостям.
 * `at` — метка времени (мс epoch), проставляется применятелем события.
 */
export type LogEntry =
  | { kind: 'clue'; team: Team; word: string; count: number; at: number }
  /** Открытие карты: `team` — кто открыл, `type` — истинный тип (уже публичен). */
  | { kind: 'reveal'; team: Team; word: string; type: CardType; at: number }
  /** Добровольное завершение хода. */
  | { kind: 'pass'; team: Team; at: number }

/** Карта в редактированном (по роли) представлении. */
export interface RedactedCard {
  word: string
  /** Тип карты или null, если он скрыт от данной роли. */
  type: CardType | null
  revealed: boolean
  /** Команда, открывшая карту, или undefined для закрытых. */
  openedBy?: Team
}

/** Состояние, отредактированное под конкретную роль (рассылается клиентам). */
export type RedactedState = Omit<GameState, 'cards'> & { cards: RedactedCard[] }
