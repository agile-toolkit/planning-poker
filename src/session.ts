import { ref, get, set, remove, serverTimestamp } from 'firebase/database'
import type { Database } from 'firebase/database'

/**
 * Session addressing and lifecycle for live team sessions.
 *
 * Two things here are load-bearing and were previously wrong:
 *
 * 1. **The path is namespaced per app.** One Firebase project serves both
 *    this app and Moving Motivators (same org-level `VITE_FIREBASE_*`
 *    secrets), and both used to write `sessions/<pin>`. A PIN minted here
 *    could land on a live Moving Motivators session, and vice versa —
 *    silently destroying it, since neither app checked.
 *
 * 2. **A PIN is claimed, not assumed.** `Math.random()` over 9000 four-digit
 *    values with no existence check meant a new host could overwrite a live
 *    session outright. PINs are now six digits from `crypto.getRandomValues`,
 *    and `claimSession` retries until it finds a free one.
 *
 * The matching security rules live in `agile-toolkit/.github/firebase/`.
 * They enforce the six-digit shape, a server-set `createdAt`, and a 24h TTL
 * after which a PIN becomes reclaimable — which is also what stops the
 * database from growing without bound, since no session was ever deleted.
 */

export const SESSION_TTL_MS = 24 * 60 * 60 * 1000

/** Realtime Database path for one of this app's sessions. */
export function sessionPath(pin: string): string {
  return `sessions/planning-poker/${pin}`
}

/**
 * A uniformly distributed six-digit PIN. Rejection sampling keeps the
 * distribution flat — `% 900000` would bias the low end, which matters here
 * only because a biased generator collides more often than a flat one.
 */
export function generatePin(): string {
  const buf = new Uint32Array(1)
  const limit = Math.floor(0xffffffff / 900000) * 900000
  let n: number
  do {
    crypto.getRandomValues(buf)
    n = buf[0]
  } while (n >= limit)
  return String(100000 + (n % 900000))
}

/** True when a session is absent, or present but past its TTL. */
export function isReclaimable(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return true
  const createdAt = (value as { createdAt?: unknown }).createdAt
  if (typeof createdAt !== 'number') return true
  return Date.now() - createdAt > SESSION_TTL_MS
}

export class SessionPinUnavailableError extends Error {
  constructor() {
    super('Could not find a free session PIN')
    this.name = 'SessionPinUnavailableError'
  }
}

/**
 * Finds a free PIN and writes `session` to it, returning the PIN.
 *
 * `attempts` is small on purpose: with 900k PINs, needing more than a handful
 * of tries means the namespace is genuinely saturated (or the database is
 * unreachable), and failing fast beats hammering it.
 */
export async function claimSession(
  db: Database,
  session: Record<string, unknown>,
  attempts = 5,
): Promise<string> {
  for (let i = 0; i < attempts; i++) {
    const pin = generatePin()
    const snap = await get(ref(db, sessionPath(pin)))
    if (!isReclaimable(snap.val())) continue
    await set(ref(db, sessionPath(pin)), { ...session, createdAt: serverTimestamp() })
    return pin
  }
  throw new SessionPinUnavailableError()
}

/**
 * Releases a session so its PIN returns to the pool immediately instead of
 * waiting out the TTL. Best-effort: a failure here costs a day of one PIN,
 * never the user's results, so it must not surface as an error.
 */
export async function releaseSession(db: Database, pin: string): Promise<void> {
  try {
    await remove(ref(db, sessionPath(pin)))
  } catch {
    /* TTL will reclaim it */
  }
}
