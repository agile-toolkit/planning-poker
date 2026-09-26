import { describe, it, expect } from 'vitest'
import {
  generateRoomCode, normalizeRoomCode, formatRoomCode, deriveRoomSecrets, encryptJson, decryptJson, CODE_LENGTH,
} from './crypto'

describe('room codes', () => {
  it('generates 10-character Crockford base32 codes', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode()
      expect(code).toMatch(/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{10}$/)
      expect(normalizeRoomCode(code)).toBe(code)
    }
  })

  it('normalizes case, separators and look-alike characters', () => {
    expect(normalizeRoomCode('abcde-12345')).toBe('ABCDE12345')
    expect(normalizeRoomCode(' abcde 12345 ')).toBe('ABCDE12345')
    expect(normalizeRoomCode('OIL00-11111')).toBe('01100' + '11111')
  })

  it('rejects wrong lengths and characters outside the alphabet', () => {
    expect(normalizeRoomCode('')).toBe('')
    expect(normalizeRoomCode('ABCDE1234')).toBe('')
    expect(normalizeRoomCode('ABCDE123456')).toBe('')
    expect(normalizeRoomCode('ABCDE1234U')).toBe('')
    expect(normalizeRoomCode('ABCDE1234!')).toBe('')
  })

  it('formats codes in two groups for display', () => {
    expect(formatRoomCode('ABCDE12345')).toBe('ABCDE-12345')
    expect(formatRoomCode('short')).toBe('short')
    expect(CODE_LENGTH).toBe(10)
  })
})

describe('deriveRoomSecrets', () => {
  it('is deterministic per code and app', async () => {
    const a = await deriveRoomSecrets('ABCDE12345', 'planning-poker')
    const b = await deriveRoomSecrets('ABCDE12345', 'planning-poker')
    expect(a.roomId).toBe(b.roomId)
    expect(a.roomId).toMatch(/^[0-9a-f]{32}$/)
  })

  it('separates apps and codes', async () => {
    const pp = await deriveRoomSecrets('ABCDE12345', 'planning-poker')
    const mm = await deriveRoomSecrets('ABCDE12345', 'moving-motivators')
    const other = await deriveRoomSecrets('ABCDE12346', 'planning-poker')
    expect(pp.roomId).not.toBe(mm.roomId)
    expect(pp.roomId).not.toBe(other.roomId)
  })

  it('does not put the code into the public room id', async () => {
    const { roomId } = await deriveRoomSecrets('ABCDE12345', 'planning-poker')
    expect(roomId.toUpperCase()).not.toContain('ABCDE')
  })
})

describe('encryptJson / decryptJson', () => {
  it('round-trips JSON values', async () => {
    const { key } = await deriveRoomSecrets('ABCDE12345', 'planning-poker')
    const value = { p: 'abc', s: 3, d: { k: 'p', a: 1 } }
    const ct = await encryptJson(key, value)
    expect(ct).not.toContain('abc')
    expect(await decryptJson(key, ct)).toEqual(value)
  })

  it('uses a fresh IV each time', async () => {
    const { key } = await deriveRoomSecrets('ABCDE12345', 'planning-poker')
    expect(await encryptJson(key, 1)).not.toBe(await encryptJson(key, 1))
  })

  it('returns undefined for another room, tampering and junk', async () => {
    const { key } = await deriveRoomSecrets('ABCDE12345', 'planning-poker')
    const { key: other } = await deriveRoomSecrets('ZZZZZ99999', 'planning-poker')
    const ct = await encryptJson(key, { hello: 1 })
    expect(await decryptJson(other, ct)).toBeUndefined()
    const bytes = atob(ct)
    const flipped = btoa(bytes.slice(0, -1) + String.fromCharCode(bytes.charCodeAt(bytes.length - 1) ^ 1))
    expect(await decryptJson(key, flipped)).toBeUndefined()
    expect(await decryptJson(key, 'not base64 !!')).toBeUndefined()
    expect(await decryptJson(key, '')).toBeUndefined()
  })
})
