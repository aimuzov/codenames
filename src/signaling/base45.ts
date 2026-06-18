/**
 * Base45 (RFC 9285) — кодирование байтов в алфавит, целиком входящий в
 * «alphanumeric»-набор QR-кодов (0-9 A-Z и немного символов). Благодаря этому
 * QR-энкодер использует более плотный режим (5.5 бит/символ вместо 8), и код
 * получается проще для сканирования камерой.
 */
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:'
const REV = new Map<string, number>()
for (let i = 0; i < ALPHABET.length; i++) REV.set(ALPHABET[i]!, i)

export function base45Encode(data: Uint8Array): string {
	let out = ''
	for (let i = 0; i < data.length; i += 2) {
		if (i + 1 < data.length) {
			const n = data[i]! * 256 + data[i + 1]!
			out +=
				ALPHABET[n % 45]! + ALPHABET[Math.floor(n / 45) % 45]! + ALPHABET[Math.floor(n / 2025)]!
		} else {
			const n = data[i]!
			out += ALPHABET[n % 45]! + ALPHABET[Math.floor(n / 45)]!
		}
	}
	return out
}

export function base45Decode(text: string): Uint8Array {
	const vals: number[] = []
	for (const ch of text) {
		const v = REV.get(ch)
		if (v === undefined) throw new Error('Некорректный код подключения')
		vals.push(v)
	}
	const out: number[] = []
	let i = 0
	for (; i + 3 <= vals.length; i += 3) {
		const n = vals[i]! + vals[i + 1]! * 45 + vals[i + 2]! * 2025
		if (n > 0xffff) throw new Error('Некорректный код подключения')
		out.push(n >> 8, n & 0xff)
	}
	const rem = vals.length - i
	if (rem === 1) throw new Error('Некорректный код подключения')
	if (rem === 2) {
		const n = vals[i]! + vals[i + 1]! * 45
		if (n > 0xff) throw new Error('Некорректный код подключения')
		out.push(n)
	}
	return new Uint8Array(out)
}
