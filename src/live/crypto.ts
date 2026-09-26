/**
 * Room codes and end-to-end encryption for live team sessions.
 *
 * Kept identical in planning-poker and moving-motivators (src/live/).
 *
 * A room code is the only secret. Everything the relays see is derived from
 * it one-way:
 *
 *   code ──PBKDF2──► 48 bytes ─┬─► AES-GCM key (32 bytes, never leaves the browser)
 *                              └─► room id    (16 bytes, used as the public topic)
 *
 * so someone watching a public broker sees a random topic and ciphertext, and
 * cannot get from the topic back to the key. The code travels in the URL
 * fragment (`#join=…`), which browsers never send to any server.
 */

/** Crockford base32: no I, L, O, U, so codes survive being read aloud. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
export const CODE_LENGTH = 10
const PBKDF2_ITERATIONS = 100_000

/** A fresh 10-character room code (50 bits of entropy). */
export function generateRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH))
  // 256 is a multiple of 32, so `% 32` is unbiased.
  return Array.from(bytes, b => ALPHABET[b % 32]).join('')
}

/**
 * Canonical form of a typed or pasted code, or '' if it cannot be one.
 * Accepts lowercase, dashes and spaces, and the usual look-alikes (O→0, I/L→1).
 */
export function normalizeRoomCode(input: string): string {
  const cleaned = input
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
  if (cleaned.length !== CODE_LENGTH) return ''
  for (const ch of cleaned) if (!ALPHABET.includes(ch)) return ''
  return cleaned
}

/** `ABCDE12345` → `ABCDE-12345`, for display only. */
export function formatRoomCode(code: string): string {
  return code.length === CODE_LENGTH ? `${code.slice(0, 5)}-${code.slice(5)}` : code
}

export interface RoomSecrets {
  /** Public, relay-visible room identifier (32 hex chars). */
  roomId: string
  key: CryptoKey
}

/**
 * Derives the room id and key. `app` goes into the salt so the same code in
 * two apps lands in two unrelated rooms.
 */
export async function deriveRoomSecrets(code: string, app: string): Promise<RoomSecrets> {
  const enc = new TextEncoder()
  const base = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveBits'])
  const bits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(`agile-toolkit/live/v1/${app}`), iterations: PBKDF2_ITERATIONS },
    base,
    48 * 8,
  ))
  const key = await crypto.subtle.importKey('raw', bits.slice(0, 32), 'AES-GCM', false, ['encrypt', 'decrypt'])
  const roomId = Array.from(bits.slice(32), b => b.toString(16).padStart(2, '0')).join('')
  return { roomId, key }
}

function toBase64(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

function fromBase64(s: string): Uint8Array {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** AES-GCM with a random 96-bit IV; output is base64(iv ‖ ciphertext). */
export async function encryptJson(key: CryptoKey, value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(value)),
  ))
  const out = new Uint8Array(iv.length + ct.length)
  out.set(iv)
  out.set(ct, iv.length)
  return toBase64(out)
}

/**
 * Inverse of `encryptJson`. Returns `undefined` for anything that does not
 * decrypt under this key — other rooms' traffic, tampering, junk — so callers
 * can drop it without a try/catch.
 */
export async function decryptJson(key: CryptoKey, payload: string): Promise<unknown> {
  try {
    const bytes = fromBase64(payload)
    if (bytes.length < 13) return undefined
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, key, bytes.slice(12))
    return JSON.parse(new TextDecoder().decode(pt))
  } catch {
    return undefined
  }
}
