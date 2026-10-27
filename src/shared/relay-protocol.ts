/**
 * Конверт сообщений WS-релея. Сервер — тупой маршрутизатор: он знает только комнаты, кто в них
 * хост и кто гости, а `data` (игровые сообщения) не разбирает, поэтому её тип задаёт клиент.
 *
 * Формат общий для сервера (src/backend/server.ts) и клиента (transport/ws-relay.ts), поэтому
 * лежит в src/shared: так стороны не разъезжаются.
 */

/** Гость→сервер и хост→сервер. */
export type RelayIn<Data = unknown> =
	/** Хост открывает комнату; `code` — вернуться в свою после обрыва или перезапуска. */
	| { t: 'host'; code?: string }
	/** Гость входит в комнату под своим id устройства. */
	| { t: 'join'; code: string; id: string }
	/** Переслать полезную нагрузку: хост указывает id гостя, гость — всегда хосту. */
	| { t: 'to'; to?: string; data: Data }
	/** Voice chat signaling (SDP, ICE) to any room member: 'host' or a guest id. */
	| { t: 'voice'; to: string; data: unknown }

/** Сервер→клиенту. */
export type RelayOut<Data = unknown> =
	/** Комната открыта (хосту). */
	| { t: 'hosting'; code: string }
	/** Вход выполнен (гостю). */
	| { t: 'joined'; code: string }
	/** Полезная нагрузка от собеседника: гостю приходит от 'host'. */
	| { t: 'from'; from: string; data: Data }
	/** Хосту — гость появился или пропал. */
	| { t: 'peer'; id: string; online: boolean }
	/** Гостю — хост на связи или нет (он мог уснуть или перезапуститься). */
	| { t: 'host-online'; online: boolean }
	/** Voice chat signaling from another room member ('host' or a guest id). */
	| { t: 'voice'; from: string; data: unknown }
	/** ICE servers for voice chat: STUN plus short-lived TURN credentials, if configured. */
	| { t: 'ice'; servers: IceServer[] }
	| { t: 'error'; reason: 'no-room' | 'room-taken' | 'bad-message' }

/** Same shape as RTCIceServer, which Node has no types for. */
export type IceServer = { urls: string | string[]; username?: string; credential?: string }

/** Алфавит кода комнаты — без символов, которые путаются при диктовке и наборе (0/O, 1/I). */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const ROOM_CODE_LENGTH = 6

/**
 * Приводит введённый код к виду, в котором его выдаёт сервер:
 * верхний регистр, без пробелов, дефисов и цифр 0/1.
 *
 * Буквы O и I при этом остаются, хотя в алфавите их нет,
 * такой код отсеет уже {@link isRoomCode}.
 */
export function normalizeRoomCode(input: string): string {
	return input
		.trim()
		.toUpperCase()
		.replaceAll(/[^A-Z2-9]/g, '')
}

/**
 * Ровно {@link ROOM_CODE_LENGTH} символов из алфавита.
 * Регистр и пробелы не прощает, поэтому сырой ввод сначала
 * пропускаем через {@link normalizeRoomCode}.
 */
export function isRoomCode(code: string): boolean {
	return code.length === ROOM_CODE_LENGTH && [...code].every((c) => ROOM_CODE_ALPHABET.includes(c))
}
