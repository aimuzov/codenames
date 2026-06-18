import { action, atom, computed, wrap } from '@reatom/core'
import type { Team } from '@/game/index.ts'
import {
	BUILTIN_PACKS,
	DEFAULT_PACK_IDS,
	mergeWords,
	parseWordList,
	type WordPack,
} from '@/data/packs.ts'
import { deleteCustomPack, loadCustomPacks, upsertCustomPack } from '@/data/customPacks.ts'

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

export const screenAtom = atom<Screen>('home', 'screen')

/** Стек посещённых экранов для кнопки «назад». */
const historyAtom = atom<Screen[]>([], 'history')

/** Направление последнего перехода — для анимации (`forward` вперёд / `back` назад). */
export const navDirectionAtom = atom<'forward' | 'back'>('forward', 'navDirection')

/** Открыт ли оверлей ввода подсказки (композер капитана). */
export const composerOpenAtom = atom<boolean>(false, 'composerOpen')

export const goTo = action((screen: Screen) => {
	if (screen === screenAtom()) return
	historyAtom.set([...historyAtom(), screenAtom()])
	navDirectionAtom.set('forward')
	screenAtom.set(screen)
}, 'goTo')

/** Команда, по которой отфильтрован экран статистики (null — обе команды). */
export const statsTeamAtom = atom<Team | null>(null, 'statsTeam')

/** Открыть статистику: с фильтром по команде (тап по чипу счёта)
 *  или без фильтра (иконка в шапке / кнопка в финале). */
export function goToStats(team: Team | null = null) {
	statsTeamAtom.set(team)
	goTo('stats')
}

/** Возврат на предыдущий экран (или на главную, если истории нет). */
export const goBack = action(() => {
	const h = historyAtom()
	const prev = h[h.length - 1] ?? 'home'
	historyAtom.set(h.slice(0, -1))
	navDirectionAtom.set('back')
	screenAtom.set(prev)
}, 'goBack')

/** Пользовательские паки, подгруженные из IndexedDB. */
export const customPacksAtom = atom<WordPack[]>([], 'customPacks')

/** Все доступные паки: встроенные + пользовательские. */
export const allPacksAtom = computed<WordPack[]>(
	() => [...BUILTIN_PACKS, ...customPacksAtom()],
	'allPacks',
)

/** Выбранные для игры паки (по умолчанию — стартовый микс из трёх тем). */
export const selectedPackIdsAtom = atom<string[]>([...DEFAULT_PACK_IDS], 'selectedPackIds')

export const togglePack = action((id: string) => {
	const ids = selectedPackIdsAtom()
	selectedPackIdsAtom.set(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])
}, 'togglePack')

/** Слова из выбранных паков (объединённые, без дублей). */
export const selectedWordsAtom = computed<string[]>(() => {
	const selected = allPacksAtom().filter((p) => selectedPackIdsAtom().includes(p.id))
	return mergeWords(selected)
}, 'selectedWords')

/** Подгружает пользовательские паки из IndexedDB (вызывается на старте). */
export const hydrateCustomPacks = action(async () => {
	const packs = await wrap(loadCustomPacks())
	customPacksAtom.set(packs)
}, 'hydrateCustomPacks')

/** Создаёт пользовательский пак из произвольного текста и выбирает его. */
export const addCustomPack = action(async (title: string, text: string) => {
	const words = parseWordList(text)
	const pack = await wrap(upsertCustomPack({ title, words }))
	customPacksAtom.set([...customPacksAtom(), pack])
	if (!selectedPackIdsAtom().includes(pack.id)) {
		selectedPackIdsAtom.set([...selectedPackIdsAtom(), pack.id])
	}
	return pack
}, 'addCustomPack')

/** Удаляет пользовательский пак. */
export const removeCustomPack = action(async (id: string) => {
	await wrap(deleteCustomPack(id))
	customPacksAtom.set(customPacksAtom().filter((p) => p.id !== id))
	selectedPackIdsAtom.set(selectedPackIdsAtom().filter((x) => x !== id))
}, 'removeCustomPack')
