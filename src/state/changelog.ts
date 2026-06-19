import { action, atom, computed } from '@reatom/core'
import { LATEST } from '@/data/changelog.ts'

const KEY = 'codenames.changelog.seen'

/** Последняя версия, чей журнал изменений игрок открывал. */
function loadSeen(): string {
	try {
		return localStorage.getItem(KEY) ?? ''
	} catch {
		return ''
	}
}

const seenVersionAtom = atom(loadSeen(), 'changelogSeen')

/**
 * Есть ли непрочитанные изменения: версия последнего релиза не совпадает с той,
 * чей журнал игрок уже открывал. На первом запуске (пусто) — тоже считаем непрочитанным,
 * чтобы пригласить заглянуть «что умеет приложение».
 */
export const hasUnseenChangelogAtom = computed(
	() => seenVersionAtom() !== LATEST.version,
	'hasUnseenChangelog',
)

/** Помечает журнал прочитанным — гасит индикатор «новое». Вызывается при открытии экрана. */
export const markChangelogSeen = action(() => {
	if (seenVersionAtom() === LATEST.version) return
	seenVersionAtom.set(LATEST.version)
	try {
		localStorage.setItem(KEY, LATEST.version)
	} catch {
		// приватный режим / нет доступа — индикатор просто покажется снова
	}
}, 'markChangelogSeen')
