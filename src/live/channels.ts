/**
 * Public, account-free relays that carry a room's encrypted messages.
 *
 * Kept identical in planning-poker and moving-motivators (src/live/).
 *
 * A room connects to every relay below at once and publishes to all of them;
 * `room.ts` de-duplicates. That is what makes it survive networks that block
 * some of them: the MQTT brokers are the better transport (retained state,
 * last-will presence) but listen on ports 8884/8084, which enterprise
 * firewalls often block; the Nostr relays are plain `wss://` on 443.
 *
 * Nothing here ever sees plaintext — `payload` is already AES-GCM ciphertext.
 */
import type { MqttClient } from 'mqtt'

export interface ChannelHandlers {
  /**
   * An incoming payload. `null` means "this peer's retained state was
   * cleared" (MQTT last will or explicit leave). `peerHint` is the peer id
   * the transport itself attributes the message to, if it has one.
   */
  onMessage: (payload: string | null, peerHint: string | null) => void
  onStatus: (connected: boolean) => void
}

export interface Channel {
  readonly label: string
  publish(payload: string): void
  /** Best-effort goodbye: clear retained state, then disconnect. */
  close(): void
}

export type ChannelFactory = (roomId: string, peerId: string, handlers: ChannelHandlers) => Channel

const TOPIC_ROOT = 'agile-toolkit/live/v1'

// ── MQTT ─────────────────────────────────────────────────────────────────────

/**
 * One public MQTT broker. Each peer publishes its state *retained* on its own
 * topic, so a late joiner receives everyone's current state on subscribe, and
 * registers an empty retained last will so the broker clears it if the tab
 * dies without saying goodbye.
 */
export function mqttChannel(url: string): ChannelFactory {
  return (roomId, peerId, { onMessage, onStatus }) => {
    const base = `${TOPIC_ROOT}/${roomId}`
    const own = `${base}/${peerId}`
    let client: MqttClient | null = null
    let closed = false

    // Loaded on demand so the MQTT client stays out of the entry chunk.
    void import('mqtt').then(({ default: mqtt }) => {
      if (closed) return
      client = mqtt.connect(url, {
        clientId: `at-${peerId}`,
        clean: true,
        keepalive: 30,
        connectTimeout: 8_000,
        reconnectPeriod: 5_000,
        queueQoSZero: false,
        will: { topic: own, payload: new Uint8Array(0) as never, retain: true, qos: 0 },
      })
      client.on('connect', () => {
        client?.subscribe(`${base}/+`)
        onStatus(true)
      })
      client.on('close', () => onStatus(false))
      client.on('error', () => onStatus(false))
      client.on('message', (topic, buf) => {
        const hint = topic.slice(base.length + 1)
        onMessage(buf.length === 0 ? null : buf.toString(), hint)
      })
    }).catch(() => onStatus(false))

    return {
      label: url,
      publish(payload) {
        if (client?.connected) client.publish(own, payload, { retain: true, qos: 0 })
      },
      close() {
        closed = true
        const c = client
        if (!c) return
        if (c.connected) {
          c.publish(own, '', { retain: true, qos: 0 }, () => c.end(false))
        } else {
          c.end(true)
        }
      },
    }
  }
}

// ── Nostr ────────────────────────────────────────────────────────────────────

/** Ephemeral kind (20000–29999): relays forward it live and store nothing. */
export const NOSTR_KIND = 20888

/**
 * One public Nostr relay, used as a plain pub/sub bus. Events are signed
 * with a throwaway key generated per session — no account, no identity.
 * Relays keep no history for ephemeral events, so late joiners are brought
 * up to date by the room's hello/re-announce handshake instead.
 */
export function nostrChannel(url: string): ChannelFactory {
  return (roomId, _peerId, { onMessage, onStatus }) => {
    let ws: WebSocket | null = null
    let closed = false
    let retryMs = 2_000
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    const subId = `at${Math.random().toString(36).slice(2, 10)}`
    const toolsP = import('nostr-tools/pure')
    const secretP = toolsP.then(t => t.generateSecretKey())

    const open = () => {
      if (closed) return
      let sock: WebSocket
      try {
        sock = new WebSocket(url)
      } catch {
        scheduleRetry()
        return
      }
      ws = sock
      sock.onopen = () => {
        retryMs = 2_000
        sock.send(JSON.stringify(['REQ', subId, { kinds: [NOSTR_KIND], '#t': [roomId] }]))
        onStatus(true)
      }
      sock.onmessage = ev => {
        try {
          const msg = JSON.parse(String(ev.data)) as unknown[]
          if (msg[0] === 'EVENT' && msg[1] === subId) {
            const event = msg[2] as { kind?: unknown; content?: unknown }
            if (event?.kind === NOSTR_KIND && typeof event.content === 'string') onMessage(event.content, null)
          }
        } catch {
          /* not JSON — ignore */
        }
      }
      sock.onclose = () => {
        if (ws === sock) ws = null
        onStatus(false)
        scheduleRetry()
      }
      sock.onerror = () => sock.close()
    }

    const scheduleRetry = () => {
      if (closed) return
      clearTimeout(retryTimer)
      retryTimer = setTimeout(open, retryMs)
      retryMs = Math.min(retryMs * 2, 30_000)
    }

    open()

    return {
      label: url,
      publish(payload) {
        const sock = ws
        if (!sock || sock.readyState !== WebSocket.OPEN) return
        void Promise.all([toolsP, secretP]).then(([tools, sk]) => {
          const event = tools.finalizeEvent(
            { kind: NOSTR_KIND, created_at: Math.floor(Date.now() / 1000), tags: [['t', roomId]], content: payload },
            sk,
          )
          if (sock.readyState === WebSocket.OPEN) sock.send(JSON.stringify(['EVENT', event]))
        })
      },
      close() {
        closed = true
        clearTimeout(retryTimer)
        const sock = ws
        ws = null
        if (!sock) return
        if (sock.readyState === WebSocket.OPEN) sock.send(JSON.stringify(['CLOSE', subId]))
        sock.close()
      },
    }
  }
}

/** The relays every room uses. All free, public, and need no account. */
export const DEFAULT_CHANNELS: ChannelFactory[] = [
  mqttChannel('wss://broker.hivemq.com:8884/mqtt'),
  mqttChannel('wss://broker.emqx.io:8084/mqtt'),
  nostrChannel('wss://relay.damus.io'),
  nostrChannel('wss://nos.lol'),
]
