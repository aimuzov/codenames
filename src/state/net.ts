import { action, atom, wrap } from '@reatom/core'
import {
  createGame,
  redactStateForRole,
  type GameConfig,
  type GameEvent,
  type Role,
  type Team,
} from '../game/index.ts'
import { HostHub } from '../transport/hostHub.ts'
import { GuestConnection } from '../transport/webrtc.ts'
import type { ClientMessage, HostMessage, PlayerInfo } from '../transport/messages.ts'
import { validateIntent } from './validateIntent.ts'
import { pickSlot, reshuffleRoster, resolveSetup } from './roster.ts'
import {
  applyEvent,
  gameAtom,
  modeAtom,
  myRoleAtom,
  myTeamAtom,
  remoteViewAtom,
  setHostSubmit,
  setIntentSender,
  viewRoleAtom,
} from './session.ts'
import { goTo } from './ui.ts'

export const HOST_ID = 'host'

export const rosterAtom = atom<PlayerInfo[]>([], 'roster')
export const myIdAtom = atom<string>(HOST_ID, 'myId')
export const myNameAtom = atom<string>('', 'myName')
export const startedAtom = atom<boolean>(false, 'started')
export const connStatusAtom = atom<'idle' | 'connecting' | 'connected' | 'error'>('idle', 'connStatus')

let hub: HostHub | null = null
let guest: GuestConnection<HostMessage, ClientMessage> | null = null

// ---------- helpers ----------
function patchRoster(id: string, patch: Partial<PlayerInfo>) {
  rosterAtom.set(rosterAtom().map((p) => (p.id === id ? { ...p, ...patch } : p)))
}

// ---------- отложенное удаление офлайн-игрока из лобби ----------
const OFFLINE_REMOVAL_MS = 5000
const removalTimers = new Map<string, ReturnType<typeof setTimeout>>()

function removePlayer(id: string) {
  rosterAtom.set(rosterAtom().filter((p) => p.id !== id))
}

function clearRemovalTimer(id: string) {
  const t = removalTimers.get(id)
  if (t !== undefined) {
    clearTimeout(t)
    removalTimers.delete(id)
  }
}

function scheduleRemoval(id: string) {
  clearRemovalTimer(id)
  const timer = setTimeout(() => {
    removalTimers.delete(id)
    const p = rosterAtom().find((p) => p.id === id)
    // Удаляем только если всё ещё в лобби и игрок всё ещё офлайн.
    if (!startedAtom() && p && !p.connected) {
      removePlayer(id)
      broadcastLobby()
    }
  }, OFFLINE_REMOVAL_MS)
  removalTimers.set(id, timer)
}

function roleOf(id: string): Role {
  return rosterAtom().find((p) => p.id === id)?.role ?? 'operative'
}

// ================= ХОСТ =================
export const startHosting = action((name: string, team: Team, role: Role) => {
  modeAtom.set('host')
  myIdAtom.set(HOST_ID)
  myNameAtom.set(name)
  myTeamAtom.set(team)
  myRoleAtom.set(role)
  viewRoleAtom.set(role)
  startedAtom.set(false)
  gameAtom.set(null)
  rosterAtom.set([{ id: HOST_ID, name, team, role, connected: true }])

  hub = new HostHub()
  hub.onConnect((id) => {
    clearRemovalTimer(id)
    if (!rosterAtom().some((p) => p.id === id)) {
      const slot = pickSlot(rosterAtom())
      rosterAtom.set([...rosterAtom(), { id, name: 'Игрок', ...slot, connected: true }])
    } else {
      patchRoster(id, { connected: true })
    }
    hub!.send(id, { t: 'welcome', youId: id })
    broadcastLobby()
    sendStateTo(id)
  })
  hub.onDisconnect((id) => {
    patchRoster(id, { connected: false })
    broadcastLobby()
    if (!startedAtom()) scheduleRemoval(id)
  })
  hub.onMessage(handleClientMessage)

  setHostSubmit(hostSubmit)
  setIntentSender(null)
}, 'startHosting')

/** Принимает offer гостя (из QR/строки); возвращает id и answer-код для показа гостю. */
export const acceptGuestOffer = action(async (offerCode: string) => {
  if (!hub) throw new Error('Хост не запущен')
  return await wrap(hub.acceptGuest(offerCode))
}, 'acceptGuestOffer')

function handleClientMessage(id: string, msg: ClientMessage) {
  switch (msg.t) {
    case 'hello':
      patchRoster(id, { name: msg.name || 'Игрок', connected: true })
      broadcastLobby()
      break
    case 'setup':
      patchRoster(id, resolveSetup(rosterAtom(), id, msg.team, msg.role))
      broadcastLobby()
      break
    case 'intent':
      hostSubmit(id, msg.event)
      break
  }
}

function hostSubmit(senderId: string, event: GameEvent) {
  const game = gameAtom()
  if (!game || !validateIntent(rosterAtom(), game, senderId, event)) return
  applyEvent(event)
  broadcastState()
}

function broadcastLobby() {
  hub?.broadcast({ t: 'lobby', players: rosterAtom(), started: startedAtom() })
}

function sendStateTo(id: string) {
  const game = gameAtom()
  if (game) hub?.send(id, { t: 'state', state: redactStateForRole(game, roleOf(id)) })
}

function broadcastState() {
  const game = gameAtom()
  if (!game || !hub) return
  for (const id of hub.ids()) {
    hub.send(id, { t: 'state', state: redactStateForRole(game, roleOf(id)) })
  }
}

/** Хост настраивает свою команду/роль. */
export const setHostSetup = action((team: Team, role: Role) => {
  const resolved = resolveSetup(rosterAtom(), HOST_ID, team, role)
  myTeamAtom.set(resolved.team)
  myRoleAtom.set(resolved.role)
  viewRoleAtom.set(resolved.role)
  patchRoster(HOST_ID, resolved)
  broadcastLobby()
}, 'setHostSetup')

/** Хост перетасовывает весь состав (команды и роли) с соблюдением баланса. */
export const hostReshuffle = action(() => {
  const next = reshuffleRoster(rosterAtom())
  rosterAtom.set(next)
  const me = next.find((p) => p.id === HOST_ID)
  if (me) {
    myTeamAtom.set(me.team)
    myRoleAtom.set(me.role)
    viewRoleAtom.set(me.role)
  }
  broadcastLobby()
}, 'hostReshuffle')

/** Хост запускает партию. */
export const hostStartGame = action((config: GameConfig) => {
  gameAtom.set(createGame(config))
  startedAtom.set(true)
  broadcastLobby()
  broadcastState()
  goTo('board')
}, 'hostStartGame')

// ================= ГОСТЬ =================
export const startJoining = action((name: string) => {
  modeAtom.set('guest')
  myNameAtom.set(name)
  remoteViewAtom.set(null)
  rosterAtom.set([])
  startedAtom.set(false)
  connStatusAtom.set('connecting')

  guest = new GuestConnection<HostMessage, ClientMessage>()
  // Подписки — до рукопожатия.
  guest.onMessage(handleHostMessage)
  guest.onOpen(() => {
    connStatusAtom.set('connected')
    guest!.send({ t: 'hello', name })
  })
  guest.onClose(() => connStatusAtom.set('error'))

  setIntentSender((event) => guest?.send({ t: 'intent', event }))
  setHostSubmit(null)
}, 'startJoining')

/** Гость создаёт offer-код для показа хосту. */
export const guestCreateOffer = action(async () => {
  if (!guest) throw new Error('Подключение не начато')
  return await wrap(guest.createOfferCode())
}, 'guestCreateOffer')

/** Гость принимает answer-код хоста; после этого канал откроется. */
export const guestAcceptAnswer = action(async (answerCode: string) => {
  if (!guest) throw new Error('Подключение не начато')
  await wrap(guest.acceptAnswerCode(answerCode))
}, 'guestAcceptAnswer')

/** Гость выбирает команду/роль и сообщает хосту. */
export const guestSetup = action((team: Team, role: Role) => {
  const resolved = resolveSetup(rosterAtom(), myIdAtom(), team, role)
  myTeamAtom.set(resolved.team)
  myRoleAtom.set(resolved.role)
  guest?.send({ t: 'setup', team: resolved.team, role: resolved.role })
}, 'guestSetup')

function handleHostMessage(msg: HostMessage) {
  switch (msg.t) {
    case 'welcome':
      myIdAtom.set(msg.youId)
      break
    case 'lobby': {
      rosterAtom.set(msg.players)
      startedAtom.set(msg.started)
      const me = msg.players.find((p) => p.id === myIdAtom())
      if (me) {
        myTeamAtom.set(me.team)
        myRoleAtom.set(me.role)
      }
      if (msg.started) goTo('board')
      break
    }
    case 'state':
      remoteViewAtom.set(msg.state)
      startedAtom.set(true)
      goTo('board')
      break
  }
}

// ================= общий выход =================
export const leaveSession = action(() => {
  for (const t of removalTimers.values()) clearTimeout(t)
  removalTimers.clear()
  hub?.close()
  guest?.close()
  hub = null
  guest = null
  setHostSubmit(null)
  setIntentSender(null)
  modeAtom.set('local')
  rosterAtom.set([])
  startedAtom.set(false)
  connStatusAtom.set('idle')
  gameAtom.set(null)
  remoteViewAtom.set(null)
}, 'leaveSession')
