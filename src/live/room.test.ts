import { describe, it, expect, afterEach, vi } from 'vitest'
import { LiveRoom, type RoomOptions } from './room'
import { deriveRoomSecrets, encryptJson } from './crypto'
import type { ChannelFactory, ChannelHandlers } from './channels'

/**
 * An in-memory relay. `retain: true` behaves like an MQTT broker (retained
 * per-peer state, last will on crash); `retain: false` like a Nostr relay
 * (live forwarding only).
 */
function memoryRelay({ retain }: { retain: boolean }) {
  const rooms = new Map<string, Map<string, ChannelHandlers>>()
  const retained = new Map<string, Map<string, string>>()
  const deliver = (roomId: string, payload: string | null, from: string | null) => {
    for (const h of rooms.get(roomId)?.values() ?? []) {
      queueMicrotask(() => h.onMessage(payload, retain ? from : null))
    }
  }
  const drop = (roomId: string, peerId: string) => {
    rooms.get(roomId)?.delete(peerId)
    if (retain) {
      retained.get(roomId)?.delete(peerId)
      deliver(roomId, null, peerId) // last will: empty retained message
    }
  }
  const factory: ChannelFactory = (roomId, peerId, handlers) => {
    if (!rooms.has(roomId)) rooms.set(roomId, new Map())
    if (!retained.has(roomId)) retained.set(roomId, new Map())
    rooms.get(roomId)!.set(peerId, handlers)
    setTimeout(() => {
      handlers.onStatus(true)
      if (retain) for (const [from, p] of retained.get(roomId)!) handlers.onMessage(p, from)
    }, 0)
    return {
      label: 'memory',
      publish(payload) {
        if (!rooms.get(roomId)?.has(peerId)) return
        if (retain) retained.get(roomId)!.set(peerId, payload)
        deliver(roomId, payload, peerId)
      },
      close() {
        drop(roomId, peerId)
      },
    }
  }
  return {
    factory,
    /** Simulates a tab that vanishes without saying goodbye. */
    crash: (roomId: string, peerId: string) => drop(roomId, peerId),
    inject: (roomId: string, payload: string, from: string | null = null) => deliver(roomId, payload, from),
  }
}

interface TestState { n: number }
const isTestState = (v: unknown): v is TestState =>
  !!v && typeof v === 'object' && Number.isInteger((v as TestState).n) && Object.keys(v).length === 1

const CODE = 'ABCDE12345'
const APP = 'test-app'
const rooms: LiveRoom<TestState>[] = []

async function open(channels: ChannelFactory[], extra: Partial<RoomOptions<TestState>> = {}) {
  const room = await LiveRoom.open<TestState>({
    code: CODE, app: APP, validate: isTestState, channels,
    heartbeatMs: 40, expireMs: 150, connectTimeoutMs: 100, ...extra,
  })
  rooms.push(room)
  return room
}

const states = (room: LiveRoom<TestState>) => [...room.getPeers().values()].map(s => s.n).sort()

afterEach(() => {
  rooms.splice(0).forEach(r => r.close())
})

describe.each([
  ['Nostr-like relay (no retention)', false],
  ['MQTT-like broker (retained state)', true],
])('LiveRoom over a %s', (_label, retain) => {
  it('syncs each peer’s state to the others', async () => {
    const relay = memoryRelay({ retain })
    const a = await open([relay.factory])
    const b = await open([relay.factory])
    a.setState({ n: 1 })
    b.setState({ n: 2 })
    await vi.waitFor(() => {
      expect(states(a)).toEqual([2])
      expect(states(b)).toEqual([1])
    })
    a.setState({ n: 3 })
    await vi.waitFor(() => expect(states(b)).toEqual([3]))
  })

  it('brings a late joiner up to date', async () => {
    const relay = memoryRelay({ retain })
    // No heartbeats here, so expiry must outlast the 100–500 ms re-announce
    // delay or a peer can be swept before the late joiner hears back.
    const quiet = { heartbeatMs: 10_000, expireMs: 60_000 }
    const a = await open([relay.factory], quiet)
    a.setState({ n: 1 })
    await new Promise(r => setTimeout(r, 20))
    const late = await open([relay.factory], quiet)
    late.setState({ n: 9 })
    await vi.waitFor(() => {
      expect(states(late)).toEqual([1])
      expect(states(a)).toEqual([9])
    })
  })

  it('drops a peer immediately when it leaves cleanly', async () => {
    const relay = memoryRelay({ retain })
    const a = await open([relay.factory], { expireMs: 60_000 })
    const b = await open([relay.factory], { expireMs: 60_000 })
    a.setState({ n: 1 })
    b.setState({ n: 2 })
    await vi.waitFor(() => expect(states(a)).toEqual([2]))
    b.close()
    await vi.waitFor(() => expect(states(a)).toEqual([]))
  })

  it('drops a peer that vanishes without a goodbye', async () => {
    const relay = memoryRelay({ retain })
    const { roomId } = await deriveRoomSecrets(CODE, APP)
    const a = await open([relay.factory])
    const b = await open([relay.factory])
    a.setState({ n: 1 })
    b.setState({ n: 2 })
    await vi.waitFor(() => expect(states(a)).toEqual([2]))
    relay.crash(roomId, b.selfId)
    await vi.waitFor(() => expect(states(a)).toEqual([]), { timeout: 1_000 })
  })
})

describe('LiveRoom safety', () => {
  it('ignores states that fail validation', async () => {
    const relay = memoryRelay({ retain: false })
    const a = await open([relay.factory])
    const b = await open([relay.factory])
    a.setState({ n: 1 })
    b.setState({ n: 'nope' } as unknown as TestState)
    await new Promise(r => setTimeout(r, 100))
    expect(states(a)).toEqual([])
  })

  it('ignores traffic encrypted under another code', async () => {
    const relay = memoryRelay({ retain: false })
    const { roomId } = await deriveRoomSecrets(CODE, APP)
    const { key: wrongKey } = await deriveRoomSecrets('ZZZZZ99999', APP)
    const a = await open([relay.factory])
    a.setState({ n: 1 })
    relay.inject(roomId, await encryptJson(wrongKey, { p: 'aaaaaaaaaaaa', s: 1, t: Date.now(), d: { n: 5 } }))
    relay.inject(roomId, 'garbage')
    await new Promise(r => setTimeout(r, 50))
    expect(states(a)).toEqual([])
  })

  it('ignores messages whose transport sender disagrees with the envelope', async () => {
    const relay = memoryRelay({ retain: true })
    const { roomId, key } = await deriveRoomSecrets(CODE, APP)
    const a = await open([relay.factory])
    a.setState({ n: 1 })
    relay.inject(roomId, await encryptJson(key, { p: 'aaaaaaaaaaaa', s: 1, t: Date.now(), d: { n: 5 } }), 'bbbbbbbbbbbb')
    await new Promise(r => setTimeout(r, 50))
    expect(states(a)).toEqual([])
    relay.inject(roomId, await encryptJson(key, { p: 'aaaaaaaaaaaa', s: 1, t: Date.now(), d: { n: 5 } }), 'aaaaaaaaaaaa')
    await vi.waitFor(() => expect(states(a)).toEqual([5]))
  })

  it('ignores stale messages (e.g. old retained state)', async () => {
    const relay = memoryRelay({ retain: false })
    const { roomId, key } = await deriveRoomSecrets(CODE, APP)
    const a = await open([relay.factory])
    a.setState({ n: 1 })
    relay.inject(roomId, await encryptJson(key, { p: 'aaaaaaaaaaaa', s: 1, t: Date.now() - 10 * 60_000, d: { n: 5 } }))
    await new Promise(r => setTimeout(r, 50))
    expect(states(a)).toEqual([])
  })

  it('never lets an older message overwrite a newer one', async () => {
    const relay = memoryRelay({ retain: false })
    const { roomId, key } = await deriveRoomSecrets(CODE, APP)
    const a = await open([relay.factory], { expireMs: 60_000 })
    a.setState({ n: 1 })
    const msg = (s: number, n: number) => encryptJson(key, { p: 'aaaaaaaaaaaa', s, t: Date.now(), d: { n } })
    relay.inject(roomId, await msg(5, 50))
    await vi.waitFor(() => expect(states(a)).toEqual([50]))
    relay.inject(roomId, await msg(4, 40))
    await new Promise(r => setTimeout(r, 50))
    expect(states(a)).toEqual([50])
  })

  it('de-duplicates across relays and survives one of them being down', async () => {
    const mqtt = memoryRelay({ retain: true })
    const nostr = memoryRelay({ retain: false })
    const dead: ChannelFactory = () => ({ label: 'dead', publish() {}, close() {} })
    const a = await open([mqtt.factory, nostr.factory, dead])
    const b = await open([dead, nostr.factory]) // e.g. MQTT ports blocked for b
    a.setState({ n: 1 })
    b.setState({ n: 2 })
    await vi.waitFor(() => {
      expect(states(a)).toEqual([2])
      expect(states(b)).toEqual([1])
    })
    expect(a.status).toBe('online')
  })

  it('reports unreachable when no relay connects', async () => {
    const dead: ChannelFactory = () => ({ label: 'dead', publish() {}, close() {} })
    const a = await open([dead, dead])
    expect(a.status).toBe('connecting')
    await vi.waitFor(() => expect(a.status).toBe('unreachable'))
  })
})
