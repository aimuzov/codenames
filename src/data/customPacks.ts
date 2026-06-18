import { get, set } from 'idb-keyval'
import type { WordPack } from './packs.ts'

const STORAGE_KEY = 'codenames.customPacks'

/** Загружает пользовательские паки из IndexedDB. */
export async function loadCustomPacks(): Promise<WordPack[]> {
	const packs = await get<WordPack[]>(STORAGE_KEY)
	return packs ?? []
}

/** Создаёт или обновляет пользовательский пак и возвращает его. */
export async function upsertCustomPack(input: {
	id?: string
	title: string
	words: string[]
}): Promise<WordPack> {
	const packs = await loadCustomPacks()
	const id = input.id ?? crypto.randomUUID()
	const pack: WordPack = {
		id,
		title: input.title.trim() || 'Свой пак',
		lang: 'custom',
		builtin: false,
		words: input.words,
	}
	const next = packs.some((p) => p.id === id)
		? packs.map((p) => (p.id === id ? pack : p))
		: [...packs, pack]
	await set(STORAGE_KEY, next)
	return pack
}

/** Удаляет пользовательский пак по id. */
export async function deleteCustomPack(id: string): Promise<void> {
	const packs = await loadCustomPacks()
	await set(
		STORAGE_KEY,
		packs.filter((p) => p.id !== id),
	)
}
