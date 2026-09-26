import { isAliasIndex } from './live/aliases'
import { DECKS, type DeckType } from './types'

/**
 * What Planning Poker puts on the wire in a live team session.
 *
 * Only numbers leave the device: phase, round number, deck and card
 * *indices*, alias indices. Story titles and real names stay on the host's
 * screen, and a participant's card stays on their device until the host
 * reveals the round. Every incoming state is validated against these exact
 * shapes before the UI sees it.
 */

export const APP_ID = 'planning-poker'

export const DECK_ORDER: DeckType[] = ['fibonacci', 'tshirt', 'powers2']

export const PHASE = { lobby: 0, voting: 1, revealed: 2 } as const
export type Phase = (typeof PHASE)[keyof typeof PHASE]

export interface HostState {
  k: 'h'
  /** Phase: 0 lobby, 1 voting, 2 revealed. */
  ph: Phase
  /** Round number — "Story N" on participants' screens. 0 before the first round. */
  rd: number
  /** Index into DECK_ORDER. */
  dk: number
  /** Blind mode: participants see "Voter N" instead of aliases. */
  bl: 0 | 1
}

export interface ParticipantState {
  k: 'p'
  /** Alias index (see live/aliases.ts). */
  a: number
  /** Observer — present, never votes. */
  o: 0 | 1
  /** Round the vote below belongs to. */
  rd: number
  /** 1 once a card is chosen for round `rd`. */
  v: 0 | 1
  /** Card index into the deck — only sent after the host reveals round `rd`. */
  c?: number
}

export type PeerState = HostState | ParticipantState

const isRound = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0
const isBit = (v: unknown): v is 0 | 1 => v === 0 || v === 1
const hasOnly = (o: object, keys: string[]) => Object.keys(o).every(k => keys.includes(k))

export function isPeerState(v: unknown): v is PeerState {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false
  const s = v as Record<string, unknown>
  if (s.k === 'h') {
    return hasOnly(s, ['k', 'ph', 'rd', 'dk', 'bl']) &&
      (s.ph === 0 || s.ph === 1 || s.ph === 2) &&
      isRound(s.rd) &&
      Number.isInteger(s.dk) && (s.dk as number) >= 0 && (s.dk as number) < DECK_ORDER.length &&
      isBit(s.bl)
  }
  if (s.k === 'p') {
    if (!hasOnly(s, ['k', 'a', 'o', 'rd', 'v', 'c'])) return false
    if (!isAliasIndex(s.a) || !isBit(s.o) || !isRound(s.rd) || !isBit(s.v)) return false
    if (s.c === undefined) return true
    // Largest deck bounds the index; the per-deck check happens in cardFor().
    const max = Math.max(...Object.values(DECKS).map(d => d.length))
    return Number.isInteger(s.c) && (s.c as number) >= 0 && (s.c as number) < max
  }
  return false
}

export function deckFor(host: HostState | null): DeckType {
  return DECK_ORDER[host?.dk ?? 0] ?? 'fibonacci'
}

/** The card a participant revealed for the host's current round, if any. */
export function cardFor(p: ParticipantState, host: HostState): string | null {
  if (host.ph !== PHASE.revealed || p.rd !== host.rd || p.c === undefined) return null
  return DECKS[deckFor(host)][p.c] ?? null
}

/** True when the participant has a card down for the host's current round. */
export function hasVoted(p: ParticipantState, host: HostState): boolean {
  return p.o === 0 && p.rd === host.rd && p.v === 1
}

/**
 * The host of a room. Anyone holding the code could publish a host state, so
 * when there is more than one the lowest peer id wins — every client applies
 * the same rule and so agrees on the same host.
 */
export function findHost(peers: ReadonlyMap<string, PeerState>): [string, HostState] | null {
  let found: [string, HostState] | null = null
  for (const [id, s] of peers) {
    if (s.k === 'h' && (!found || id < found[0])) found = [id, s]
  }
  return found
}

export function participantsOf(peers: ReadonlyMap<string, PeerState>): [string, ParticipantState][] {
  return [...peers].filter((e): e is [string, ParticipantState] => e[1].k === 'p')
}
