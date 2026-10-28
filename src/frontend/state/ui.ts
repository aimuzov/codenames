import { deleteCustomPack, loadCustomPacks, upsertCustomPack } from '#frontend/data/custom-packs.ts'
import { BUILTIN_PACKS, DEFAULT_PACK_IDS, mergeWords, parseWordList, type WordPack } from '#frontend/data/packs.ts'
import type { Team } from '#frontend/game/index.ts'
import { atom, computed } from '#frontend/lib/atom.ts'

export type Screen =
	| 'home'
	| 'play'
	| 'lobby'
	| 'dicts'
	| 'rules'
	| 'board'
	| 'packs'
	| 'host'
	| 'host-add'
	| 'join'
	| 'settings'
	| 'stats'
	| 'changelog'

export const screenAtom = atom<Screen>('home')

/** Стек посещённых экранов для кнопки «назад». */
const historyAtom = atom<Screen[]>([])

/** Направление последнего перехода — для анимации (`forward` вперёд / `back` назад). */
export const navDirectionAtom = atom<'forward' | 'back'>('forward')

/** Открыт ли оверлей ввода подсказки (композер капитана). */
export const composerOpenAtom = atom<boolean>(false)

/**
 * Зачем открыт экран подключения: 'new' — вход в новую игру, 'reconnect' — возврат в свою партию
 * после обрыва (имя и место уже есть, экран сразу показывает QR и не рвёт сессию при выходе).
 */
export const joinModeAtom = atom<'new' | 'reconnect'>('new')

/** Код из ссылки-приглашения: экран подключения подставит его и предложит войти. */
export const inviteCodeAtom = atom<string>('')

/** Открыть экран подключения в нужном режиме. */
export function goToJoin(mode: 'new' | 'reconnect' = 'new') {
	joinModeAtom.set(mode)
	goTo('join')
}

/** Переход вперёд: текущий экран уходит в историю, переход на него же игнорируется. */
export function goTo(screen: Screen) {
	if (screen === screenAtom()) return

	historyAtom.set([...historyAtom(), screenAtom()])
	navDirectionAtom.set('forward')
	screenAtom.set(screen)
}

/** Команда, по которой отфильтрован экран статистики (null — обе команды). */
export const statsTeamAtom = atom<Team | null>(null)

/** Открыть статистику: с фильтром по команде (тап по чипу счёта)
 *  или без фильтра (иконка в шапке / кнопка в финале). */
export function goToStats(team: Team | null = null) {
	statsTeamAtom.set(team)
	goTo('stats')
}

/** Возврат на предыдущий экран (или на главную, если истории нет). */
export function goBack() {
	const h = historyAtom()
	const prev = h[h.length - 1] ?? 'home'

	historyAtom.set(h.slice(0, -1))
	navDirectionAtom.set('back')
	screenAtom.set(prev)
}

/** Пользовательские паки, подгруженные из IndexedDB. */
export const customPacksAtom = atom<WordPack[]>([])

/** Все доступные паки: встроенные + пользовательские. */
export const allPacksAtom = computed<WordPack[]>([customPacksAtom], () => [...BUILTIN_PACKS, ...customPacksAtom()])

/** Выбранные для игры паки (по умолчанию — стартовый микс из трёх тем). */
export const selectedPackIdsAtom = atom<string[]>([...DEFAULT_PACK_IDS])

export function togglePack(id: string) {
	const ids = selectedPackIdsAtom()

	selectedPackIdsAtom.set(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])
}

/** Слова из выбранных паков (объединённые, без дублей). */
export const selectedWordsAtom = computed<string[]>([allPacksAtom, selectedPackIdsAtom], () => {
	const selected = allPacksAtom().filter((p) => selectedPackIdsAtom().includes(p.id))

	return mergeWords(selected)
})

/** Подгружает пользовательские паки из IndexedDB (вызывается на старте). */
export async function hydrateCustomPacks() {
	const packs = await loadCustomPacks()

	customPacksAtom.set(packs)
}

/** Создаёт пользовательский пак из произвольного текста и выбирает его. */
export async function addCustomPack(title: string, text: string) {
	const words = parseWordList(text)
	const pack = await upsertCustomPack({ title, words })

	customPacksAtom.set([...customPacksAtom(), pack])

	if (!selectedPackIdsAtom().includes(pack.id)) {
		selectedPackIdsAtom.set([...selectedPackIdsAtom(), pack.id])
	}

	return pack
}

/** Удаляет пользовательский пак. */
export async function removeCustomPack(id: string) {
	await deleteCustomPack(id)
	customPacksAtom.set(customPacksAtom().filter((p) => p.id !== id))
	selectedPackIdsAtom.set(selectedPackIdsAtom().filter((x) => x !== id))
}
