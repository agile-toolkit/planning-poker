/**
 * A live room: every peer owns one small state object, and the room keeps
 * everyone's latest copy in sync over the public relays in `channels.ts`.
 *
 * Kept identical in planning-poker and moving-motivators (src/live/).
 *
 * That single primitive is enough for both apps — the host's state carries
 * the phase, each participant's carries their response — and it keeps the
 * protocol transport-agnostic:
 *
 * - **Sync.** Each publish is `{p: peerId, s: seq, t: sentAt, d: state}`,
 *   AES-GCM encrypted. The highest `s` per peer wins, so duplicates arriving
 *   over several relays are harmless.
 * - **Late joiners.** A peer's first publish carries `h: 1` ("hello"); every
 *   other peer re-announces itself shortly after. MQTT's retained messages
 *   usually get there first, but Nostr relays keep nothing.
 * - **Presence.** State is re-sent every `heartbeatMs`; a peer not heard from
 *   for `expireMs` is dropped. A clean exit sends `d: null` straight away.
 *
 * Only the `validate`d shape of `d` is ever handed to the app: anything that
 * fails decryption, fails validation, or is older than `maxAgeMs` is dropped.
 */
import { decryptJson, deriveRoomSecrets, encryptJson } from './crypto'
import { DEFAULT_CHANNELS, type Channel, type ChannelFactory } from './channels'

export type RoomStatus = 'connecting' | 'online' | 'unreachable'

export interface RoomOptions<S> {
  code: string
  /** App name; separates rooms of different apps that share a code. */
  app: string
  validate: (value: unknown) => value is S
  channels?: ChannelFactory[]
  heartbeatMs?: number
  expireMs?: number
  /** How long to try before reporting `unreachable`. */
  connectTimeoutMs?: number
  /** Messages older than this (sender clock) are ignored — stale retained state. */
  maxAgeMs?: number
}

interface Envelope {
  p: string
  s: number
  t: number
  d: unknown
  h?: 1
}

interface PeerEntry<S> {
  state: S
  lastSeen: number
}

const PEER_ID = /^[0-9a-f]{12}$/

function newPeerId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), b => b.toString(16).padStart(2, '0')).join('')
}

function isEnvelope(v: unknown): v is Envelope {
  if (!v || typeof v !== 'object') return false
  const e = v as Record<string, unknown>
  return typeof e.p === 'string' && PEER_ID.test(e.p) &&
    Number.isSafeInteger(e.s) && (e.s as number) >= 0 &&
    typeof e.t === 'number' && Number.isFinite(e.t) &&
    'd' in e && (e.h === undefined || e.h === 1)
}

export class LiveRoom<S> {
  readonly selfId = newPeerId()
  private channels: Channel[] = []
  private connected = new Set<number>()
  private peers = new Map<string, PeerEntry<S>>()
  /** Highest seq seen per peer — outlives the peer, so late duplicates cannot resurrect it. */
  private seqs = new Map<string, number>()
  private snapshot: ReadonlyMap<string, S> = new Map()
  private listeners = new Set<() => void>()
  private state: S | null = null
  private seq = 0
  private helloSent = false
  private announceTimer: ReturnType<typeof setTimeout> | undefined
  private timers: ReturnType<typeof setInterval>[] = []
  private connectTimer: ReturnType<typeof setTimeout> | undefined
  private closed = false
  private key: CryptoKey | null = null
  private _status: RoomStatus = 'connecting'

  private readonly validate: (value: unknown) => value is S
  private readonly heartbeatMs: number
  private readonly expireMs: number
  private readonly maxAgeMs: number

  private constructor(opts: RoomOptions<S>) {
    this.validate = opts.validate
    this.heartbeatMs = opts.heartbeatMs ?? 10_000
    this.expireMs = opts.expireMs ?? 35_000
    this.maxAgeMs = opts.maxAgeMs ?? 120_000
  }

  /** Derives the room's secrets, then connects to every relay in parallel. */
  static async open<S>(opts: RoomOptions<S>): Promise<LiveRoom<S>> {
    const room = new LiveRoom(opts)
    const { roomId, key } = await deriveRoomSecrets(opts.code, opts.app)
    room.key = key
    const factories = opts.channels ?? DEFAULT_CHANNELS
    room.channels = factories.map((make, i) => make(roomId, room.selfId, {
      onMessage: (payload, hint) => { void room.receive(payload, hint) },
      onStatus: up => room.channelStatus(i, up),
    }))
    room.connectTimer = setTimeout(() => {
      if (room.connected.size === 0) room.setStatus('unreachable')
    }, opts.connectTimeoutMs ?? 10_000)
    room.timers.push(
      setInterval(() => room.broadcast(false), room.heartbeatMs),
      setInterval(() => room.sweep(), Math.min(5_000, room.expireMs)),
    )
    return room
  }

  get status(): RoomStatus {
    return this._status
  }

  /** Current peers (excluding self) and their latest states. Stable between changes. */
  getPeers(): ReadonlyMap<string, S> {
    return this.snapshot
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Replaces this peer's state and sends it to everyone. */
  setState(state: S): void {
    if (this.closed) return
    this.state = state
    this.broadcast(!this.helloSent)
  }

  /** Says goodbye and disconnects. Safe to call more than once. */
  close(): void {
    if (this.closed) return
    this.closed = true
    this.timers.forEach(clearInterval)
    clearTimeout(this.connectTimer)
    clearTimeout(this.announceTimer)
    const channels = this.channels
    if (this.key && this.state !== null) {
      void encryptJson(this.key, { p: this.selfId, s: ++this.seq, t: Date.now(), d: null } satisfies Envelope)
        .then(payload => channels.forEach(c => c.publish(payload)))
        .finally(() => setTimeout(() => channels.forEach(c => c.close()), 300))
    } else {
      channels.forEach(c => c.close())
    }
    this.listeners.clear()
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private broadcast(hello: boolean): void {
    if (this.closed || !this.key || this.state === null || this.connected.size === 0) return
    if (hello) this.helloSent = true
    const env: Envelope = { p: this.selfId, s: ++this.seq, t: Date.now(), d: this.state, ...(hello ? { h: 1 as const } : {}) }
    void encryptJson(this.key, env).then(payload => {
      if (!this.closed) this.channels.forEach(c => c.publish(payload))
    })
  }

  private channelStatus(index: number, up: boolean): void {
    if (this.closed) return
    const wasEmpty = this.connected.size === 0
    if (up) this.connected.add(index)
    else this.connected.delete(index)
    if (up) {
      this.setStatus('online')
      // A fresh connection may have missed everything so far: say hello on it
      // (and, through the shared publish, on the others — harmless).
      this.broadcast(true)
    } else if (this.connected.size === 0 && !wasEmpty) {
      this.setStatus('connecting')
    }
  }

  private async receive(payload: string | null, hint: string | null): Promise<void> {
    if (this.closed || !this.key) return
    if (payload === null) {
      // Retained state cleared by the broker (last will) or by the peer.
      if (hint && this.peers.delete(hint)) this.emit()
      return
    }
    const env = await decryptJson(this.key, payload)
    if (this.closed || !isEnvelope(env) || env.p === this.selfId) return
    // A transport that knows the sender (MQTT topic) must agree with the envelope.
    if (hint !== null && hint !== env.p) return
    if (Date.now() - env.t > this.maxAgeMs) return
    const lastSeq = this.seqs.get(env.p) ?? -1
    if (env.s < lastSeq) return
    const isNew = env.s > lastSeq
    this.seqs.set(env.p, env.s)

    if (env.d === null) {
      if (this.peers.delete(env.p)) this.emit()
      return
    }
    if (!this.validate(env.d)) return
    const known = this.peers.get(env.p)
    this.peers.set(env.p, { state: env.d, lastSeen: Date.now() })
    if (!known || (isNew && JSON.stringify(known.state) !== JSON.stringify(env.d))) this.emit()
    if (env.h === 1 && isNew) this.scheduleAnnounce()
  }

  /** Re-announce after a short random delay, so a hello doesn't trigger a burst. */
  private scheduleAnnounce(): void {
    if (this.announceTimer !== undefined) return
    this.announceTimer = setTimeout(() => {
      this.announceTimer = undefined
      this.broadcast(false)
    }, 100 + Math.random() * 400)
  }

  private sweep(): void {
    const cutoff = Date.now() - this.expireMs
    let changed = false
    for (const [id, entry] of this.peers) {
      if (entry.lastSeen < cutoff) {
        this.peers.delete(id)
        changed = true
      }
    }
    if (changed) this.emit()
  }

  private setStatus(status: RoomStatus): void {
    if (this._status === status) return
    this._status = status
    this.emit()
  }

  private emit(): void {
    this.snapshot = new Map(Array.from(this.peers, ([id, e]) => [id, e.state]))
    this.listeners.forEach(l => l())
  }
}
