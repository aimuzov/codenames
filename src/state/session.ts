import { action, atom, computed } from '@reatom/core'
import {
  createGame,
  reducer,
  redactStateForRole,
  type GameConfig,
  type GameEvent,
  type GameState,
  type RedactedState,
  type Role,
  type Team,
} from '../game/index.ts'

/**
 * Слой сессии. Три режима:
 *  - 'local'  — одно устройство (hot-seat): канон в gameAtom, ключ по кнопке.
 *  - 'host'   — сетевой хост: канон в gameAtom, рассылка состояния гостям (см. net.ts).
 *  - 'guest'  — сетевой клиент: рендер remoteViewAtom, интенты уходят хосту.
 */
export type Mode = 'local' | 'host' | 'guest'

export const modeAtom = atom<Mode>('local', 'mode')

/** Каноническое состояние партии (режимы local/host). */
export const gameAtom = atom<GameState | null>(null, 'game')

/** Состояние, полученное от хоста (режим guest). */
export const remoteViewAtom = atom<RedactedState | null>(null, 'remoteView')

/** Назначенная роль игрока (сетевые режимы). */
export const myRoleAtom = atom<Role>('operative', 'myRole')
export const myTeamAtom = atom<Team>('red', 'myTeam')

/** Роль, под которой редактируется/отображается поле. */
export const viewRoleAtom = atom<Role>('operative', 'viewRole')

/**
 * Причина передачи хода капитану (hot-seat): какое неверное слово открыли в прошлом ходу.
 * Показывается в попапе передачи телефона. null — старт/добровольное завершение хода.
 */
export const handoffReasonAtom = atom<{ word: string; type: 'neutral' | Team } | null>(
  null,
  'handoffReason',
)

/**
 * Блокировка попапов на время анимации открытия карты. Пока true — гейт передачи
 * телефона (PassPhone) и оверлей победы (Board) скрыты, чтобы сперва отыграла
 * реакция на открытие (заливка + галочка/крестик, см. CardTile).
 */
export const revealLockedAtom = atom(false, 'revealLocked')

/** Задержка показа попапа после клика по карте — под длительность анимации открытия. */
const REVEAL_POPUP_DELAY_MS = 1500

export const isHostAtom = computed(() => modeAtom() !== 'guest', 'isHost')

/** Что отображает UI. */
export const viewAtom = computed<RedactedState | null>(() => {
  if (modeAtom() === 'guest') return remoteViewAtom()
  const game = gameAtom()
  return game ? redactStateForRole(game, viewRoleAtom()) : null
}, 'view')

/** Счёт — из публичной информации (открытые карты + известный расклад 9/8). */
export const scoreAtom = computed<Record<Team, number>>(() => {
  const view = viewAtom()
  if (!view) return { red: 0, blue: 0 }
  const totalRed = view.startingTeam === 'red' ? 9 : 8
  const totalBlue = view.startingTeam === 'blue' ? 9 : 8
  const revealed = (team: Team) => view.cards.filter((c) => c.revealed && c.type === team).length
  return { red: totalRed - revealed('red'), blue: totalBlue - revealed('blue') }
}, 'score')

export const isOverAtom = computed(() => viewAtom()?.phase === 'over', 'isOver')

// --- Сетевые хуки (регистрируются net.ts, чтобы избежать циклической зависимости) ---
let intentSender: ((event: GameEvent) => void) | null = null
let hostSubmit: ((senderId: string, event: GameEvent) => void) | null = null

export function setIntentSender(fn: ((event: GameEvent) => void) | null) {
  intentSender = fn
}
export function setHostSubmit(fn: ((senderId: string, event: GameEvent) => void) | null) {
  hostSubmit = fn
}

/** Применяет событие к канону (только local/host). Возвращает true, если состояние есть. */
export const applyEvent = action((event: GameEvent) => {
  const game = gameAtom()
  if (!game) return false
  gameAtom.set(reducer(game, event, Date.now()))
  return true
}, 'applyEvent')

/** Действие игрока из UI. Маршрутизируется по режиму. */
const playerAction = (event: GameEvent) => {
  const mode = modeAtom()
  if (mode === 'guest') {
    intentSender?.(event)
  } else if (mode === 'host') {
    hostSubmit?.('host', event) // хост — тоже игрок с id 'host'
  } else {
    applyEvent(event)
  }
}

export const startGame = action((config: GameConfig) => {
  gameAtom.set(createGame(config))
  viewRoleAtom.set('operative')
  handoffReasonAtom.set(null)
}, 'startGame')

export const giveClue = action((word: string, count: number) => {
  playerAction({ type: 'GIVE_CLUE', word, count })
  if (modeAtom() === 'local') viewRoleAtom.set('operative') // hot-seat: прячем ключ
}, 'giveClue')

export const revealCard = action((index: number) => {
  const before = gameAtom()
  playerAction({ type: 'REVEAL_CARD', index })
  if (modeAtom() === 'local' && before?.phase === 'guess') {
    const after = gameAtom()
    const card = after?.cards[index]
    const turnPassed = !!after && after.phase === 'clue' && after.currentTeam !== before.currentTeam
    // Ход перешёл из-за неверной карты (чужая или нейтральная, не ассасин) — покажем её в попапе.
    handoffReasonAtom.set(
      turnPassed && card && card.type !== before.currentTeam && card.type !== 'assassin'
        ? { word: card.word, type: card.type as 'neutral' | Team }
        : null,
    )
    // Попап (передача хода / победа) откладываем до конца анимации открытия карты.
    if (turnPassed || after?.phase === 'over') {
      revealLockedAtom.set(true)
      setTimeout(() => revealLockedAtom.set(false), REVEAL_POPUP_DELAY_MS)
    }
  }
}, 'revealCard')

export const endTurn = action(() => {
  handoffReasonAtom.set(null)
  playerAction({ type: 'END_TURN' })
}, 'endTurn')
