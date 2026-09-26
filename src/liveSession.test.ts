import { describe, it, expect } from 'vitest'
import { isPeerState, findHost, cardFor, hasVoted, deckFor, PHASE, type HostState, type ParticipantState } from './liveSession'

const host: HostState = { k: 'h', ph: PHASE.voting, rd: 2, dk: 0, bl: 0 }
const voter: ParticipantState = { k: 'p', a: 3, o: 0, rd: 2, v: 1 }

describe('isPeerState', () => {
  it('accepts the host and participant shapes', () => {
    expect(isPeerState(host)).toBe(true)
    expect(isPeerState(voter)).toBe(true)
    expect(isPeerState({ ...voter, c: 4 })).toBe(true)
  })

  it('rejects any text riding along — only the known numeric fields are allowed', () => {
    expect(isPeerState({ ...voter, name: 'Alice' })).toBe(false)
    expect(isPeerState({ ...host, title: 'Login page' })).toBe(false)
    expect(isPeerState({ ...voter, c: '5' })).toBe(false)
    expect(isPeerState({ ...voter, a: 'Fox' })).toBe(false)
  })

  it('rejects out-of-range values', () => {
    expect(isPeerState({ ...host, ph: 3 })).toBe(false)
    expect(isPeerState({ ...host, dk: 3 })).toBe(false)
    expect(isPeerState({ ...host, rd: -1 })).toBe(false)
    expect(isPeerState({ ...voter, a: 999 })).toBe(false)
    expect(isPeerState({ ...voter, c: 99 })).toBe(false)
    expect(isPeerState({ ...voter, v: 2 })).toBe(false)
    expect(isPeerState(null)).toBe(false)
    expect(isPeerState([])).toBe(false)
    expect(isPeerState({ k: 'x' })).toBe(false)
  })
})

describe('findHost', () => {
  it('returns null when no host is present', () => {
    expect(findHost(new Map([['aaa', voter]]))).toBeNull()
  })

  it('picks the lowest peer id when several claim to host, so every client agrees', () => {
    const other: HostState = { ...host, rd: 9 }
    expect(findHost(new Map<string, HostState | ParticipantState>([['bbb', other], ['aaa', host], ['ccc', voter]])))
      .toEqual(['aaa', host])
  })
})

describe('votes', () => {
  it('counts a vote only for the host’s current round', () => {
    expect(hasVoted(voter, host)).toBe(true)
    expect(hasVoted({ ...voter, rd: 1 }, host)).toBe(false)
    expect(hasVoted({ ...voter, v: 0 }, host)).toBe(false)
    expect(hasVoted({ ...voter, o: 1 }, host)).toBe(false)
  })

  it('shows a card only after reveal, for the matching round, in the host’s deck', () => {
    const revealed: HostState = { ...host, ph: PHASE.revealed }
    expect(cardFor({ ...voter, c: 4 }, host)).toBeNull()
    expect(cardFor({ ...voter, c: 4 }, revealed)).toBe('5')
    expect(cardFor({ ...voter, c: 4, rd: 1 }, revealed)).toBeNull()
    expect(cardFor({ ...voter, c: 1 }, { ...revealed, dk: 1 })).toBe('S')
    expect(cardFor({ ...voter, c: 11 }, { ...revealed, dk: 1 })).toBeNull()
  })

  it('maps the deck index', () => {
    expect(deckFor(null)).toBe('fibonacci')
    expect(deckFor({ ...host, dk: 2 })).toBe('powers2')
  })
})
