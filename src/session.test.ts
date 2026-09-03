import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generatePin,
  sessionPath,
  isReclaimable,
  claimSession,
  releaseSession,
  SessionPinUnavailableError,
  SESSION_TTL_MS,
} from './session'

// The Firebase module is replaced wholesale: these tests are about the
// claim/reclaim logic, not about the SDK.
const store = new Map<string, unknown>()
const removed: string[] = []

vi.mock('firebase/database', () => ({
  ref: (_db: unknown, path: string) => ({ path }),
  get: async (r: { path: string }) => ({
    val: () => (store.has(r.path) ? store.get(r.path) : null),
    exists: () => store.has(r.path),
  }),
  set: async (r: { path: string }, value: unknown) => {
    store.set(r.path, value)
  },
  remove: async (r: { path: string }) => {
    removed.push(r.path)
    store.delete(r.path)
  },
  serverTimestamp: () => Date.now(),
}))

const db = {} as never

beforeEach(() => {
  store.clear()
  removed.length = 0
})
afterEach(() => vi.restoreAllMocks())

describe('sessionPath', () => {
  it('namespaces this app so it cannot collide with Moving Motivators', () => {
    // Both apps share one Firebase project; both used to write sessions/<pin>.
    expect(sessionPath('123456')).toBe('sessions/planning-poker/123456')
  })
})

describe('generatePin', () => {
  it('is always six digits', () => {
    for (let i = 0; i < 500; i++) expect(generatePin()).toMatch(/^[0-9]{6}$/)
  })

  it('never returns a value outside the declared range', () => {
    for (let i = 0; i < 500; i++) {
      const n = Number(generatePin())
      expect(n).toBeGreaterThanOrEqual(100000)
      expect(n).toBeLessThanOrEqual(999999)
    }
  })

  it('does not repeat itself the way a 4-digit space did', () => {
    const seen = new Set(Array.from({ length: 1000 }, generatePin))
    // 1000 draws from 900k: a handful of collisions is possible, a heap is a bug.
    expect(seen.size).toBeGreaterThan(990)
  })
})

describe('isReclaimable', () => {
  it('treats an absent session as free', () => {
    expect(isReclaimable(null)).toBe(true)
    expect(isReclaimable(undefined)).toBe(true)
  })

  it('treats a live session as taken', () => {
    expect(isReclaimable({ createdAt: Date.now() })).toBe(false)
  })

  it('frees a session once it is past the TTL', () => {
    expect(isReclaimable({ createdAt: Date.now() - SESSION_TTL_MS - 1 })).toBe(true)
  })

  it('frees a session with no usable createdAt, so pre-TTL rows do not pin a PIN forever', () => {
    expect(isReclaimable({})).toBe(true)
    expect(isReclaimable({ createdAt: 'yesterday' })).toBe(true)
  })
})

describe('claimSession', () => {
  it('writes the session and returns its PIN', async () => {
    const pin = await claimSession(db, { phase: 'lobby' })
    expect(pin).toMatch(/^[0-9]{6}$/)
    expect(store.get(sessionPath(pin))).toMatchObject({ phase: 'lobby' })
  })

  it('stamps createdAt so the TTL has something to work from', async () => {
    const pin = await claimSession(db, { phase: 'lobby' })
    expect(store.get(sessionPath(pin))).toHaveProperty('createdAt')
  })

  it('skips a PIN that is already hosting a live session', async () => {
    const taken = generatePin()
    store.set(sessionPath(taken), { phase: 'voting', createdAt: Date.now() })
    const spy = vi.spyOn(globalThis.crypto, 'getRandomValues')
    // Force the first draw onto the taken PIN, then let it draw freely.
    let first = true
    spy.mockImplementation((arr: ArrayBufferView) => {
      const a = arr as Uint32Array
      if (first) {
        first = false
        a[0] = Number(taken) - 100000
      } else {
        a[0] = Math.floor(Math.random() * 900000)
      }
      return arr
    })

    const pin = await claimSession(db, { phase: 'lobby' })
    expect(pin).not.toBe(taken)
    // The live session is untouched — the old code would have overwritten it.
    expect(store.get(sessionPath(taken))).toMatchObject({ phase: 'voting' })
  })

  it('reuses a PIN whose session has expired', async () => {
    const stale = generatePin()
    store.set(sessionPath(stale), { phase: 'lobby', createdAt: Date.now() - SESSION_TTL_MS - 1 })
    const spy = vi.spyOn(globalThis.crypto, 'getRandomValues')
    spy.mockImplementation((arr: ArrayBufferView) => {
      ;(arr as Uint32Array)[0] = Number(stale) - 100000
      return arr
    })

    expect(await claimSession(db, { phase: 'lobby' })).toBe(stale)
  })

  it('gives up rather than hammering a saturated namespace', async () => {
    const spy = vi.spyOn(globalThis.crypto, 'getRandomValues')
    spy.mockImplementation((arr: ArrayBufferView) => {
      ;(arr as Uint32Array)[0] = 0
      return arr
    })
    store.set(sessionPath('100000'), { phase: 'lobby', createdAt: Date.now() })

    await expect(claimSession(db, { phase: 'lobby' }, 3)).rejects.toBeInstanceOf(
      SessionPinUnavailableError,
    )
  })
})

describe('releaseSession', () => {
  it('deletes the session so its PIN returns to the pool', async () => {
    const pin = await claimSession(db, { phase: 'lobby' })
    await releaseSession(db, pin)
    expect(removed).toContain(sessionPath(pin))
    expect(store.has(sessionPath(pin))).toBe(false)
  })
})
