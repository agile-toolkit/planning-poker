import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { LiveRoom, type RoomStatus } from './room'

/**
 * React binding for `LiveRoom`. Kept identical in planning-poker and
 * moving-motivators (src/live/).
 *
 * Opens the room while `code` is set, publishes `state` whenever it changes
 * (by value), and closes the room — sending a goodbye — on unmount or when
 * `code` changes.
 */
export interface LiveRoomView<S> {
  status: RoomStatus
  selfId: string
  peers: ReadonlyMap<string, S>
}

const EMPTY: ReadonlyMap<string, never> = new Map<string, never>()

export function useLiveRoom<S>(
  code: string | null,
  app: string,
  validate: (v: unknown) => v is S,
  state: S | null,
): LiveRoomView<S> {
  const [room, setRoom] = useState<LiveRoom<S> | null>(null)
  // Opening only fails without WebCrypto (e.g. a non-HTTPS origin).
  const [failed, setFailed] = useState(false)
  const validateRef = useRef(validate)
  validateRef.current = validate

  useEffect(() => {
    if (!code) return
    let cancelled = false
    let opened: LiveRoom<S> | null = null
    void LiveRoom.open<S>({ code, app, validate: (v): v is S => validateRef.current(v) }).then(r => {
      if (cancelled) {
        r.close()
        return
      }
      opened = r
      setRoom(r)
    }).catch(() => {
      if (!cancelled) setFailed(true)
    })
    return () => {
      cancelled = true
      opened?.close()
      setRoom(null)
      setFailed(false)
    }
  }, [code, app])

  const stateJson = state === null ? null : JSON.stringify(state)
  useEffect(() => {
    if (room && stateJson !== null) room.setState(JSON.parse(stateJson) as S)
  }, [room, stateJson])

  const subscribe = useCallback(
    (listener: () => void) => (room ? room.subscribe(listener) : () => {}),
    [room],
  )
  const peers = useSyncExternalStore(subscribe, () => (room ? room.getPeers() : EMPTY))
  const status = useSyncExternalStore(subscribe, () => (room ? room.status : 'connecting'))
  return { status: failed ? 'unreachable' : status, selfId: room?.selfId ?? '', peers }
}
