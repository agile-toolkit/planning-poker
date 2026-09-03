import { describe, it, expect, beforeEach } from 'vitest'
import { loadHistory, parseDeeplinkStories, parseChangePlannerParams, parseJoinPinParam, parseKanbanBoardParam, parseParticipantsParam, cardKey } from './deeplink'

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState({}, '', '/')
})

describe('loadHistory', () => {
  it('returns an empty array when unset', () => {
    expect(loadHistory()).toEqual([])
  })
  it('recovers gracefully from corrupted storage', () => {
    localStorage.setItem('planning-poker:history', '{not json')
    expect(loadHistory()).toEqual([])
  })
  it('recovers from a non-array value', () => {
    localStorage.setItem('planning-poker:history', JSON.stringify({ not: 'an array' }))
    expect(loadHistory()).toEqual([])
  })
})

describe('parseDeeplinkStories', () => {
  it('returns an empty array with no ?stories param', () => {
    expect(parseDeeplinkStories()).toEqual([])
  })

  it('parses valid stories from the URL, trimming whitespace', () => {
    const stories = [{ title: '  Story A  ', description: ' desc ' }, { title: 'Story B' }]
    const encoded = encodeURIComponent(JSON.stringify(stories))
    window.history.replaceState({}, '', `/?stories=${encoded}`)
    expect(parseDeeplinkStories()).toEqual([
      { title: 'Story A', description: 'desc' },
      { title: 'Story B', description: undefined },
    ])
  })

  it('caps at 50 raw entries before filtering, so invalid entries within the cap reduce the final count', () => {
    // The 2 invalid entries land within the first 50 (sliced before filtering),
    // so they're dropped rather than backfilled from the remaining 58 valid ones.
    const stories = [{ title: '' }, { notATitle: 'x' }, ...Array.from({ length: 60 }, (_, i) => ({ title: `S${i}` }))]
    const encoded = encodeURIComponent(JSON.stringify(stories))
    window.history.replaceState({}, '', `/?stories=${encoded}`)
    expect(parseDeeplinkStories()).toHaveLength(48)
  })

  it('caps at 50 when all entries are valid', () => {
    const stories = Array.from({ length: 60 }, (_, i) => ({ title: `S${i}` }))
    const encoded = encodeURIComponent(JSON.stringify(stories))
    window.history.replaceState({}, '', `/?stories=${encoded}`)
    expect(parseDeeplinkStories()).toHaveLength(50)
  })

  it('recovers gracefully from malformed JSON in the param', () => {
    window.history.replaceState({}, '', '/?stories=not-json')
    expect(parseDeeplinkStories()).toEqual([])
  })
})

describe('parseChangePlannerParams', () => {
  it('returns null when source is not change-planner', () => {
    expect(parseChangePlannerParams()).toBeNull()
  })

  it('extracts the initiativeId when source matches', () => {
    window.history.replaceState({}, '', '/?source=change-planner&initiativeId=abc123')
    expect(parseChangePlannerParams()).toEqual({ initiativeId: 'abc123' })
  })

  it('defaults to an empty initiativeId when missing', () => {
    window.history.replaceState({}, '', '/?source=change-planner')
    expect(parseChangePlannerParams()).toEqual({ initiativeId: '' })
  })
})

describe('parseJoinPinParam', () => {
  it('returns an empty string with no ?joinPin param', () => {
    expect(parseJoinPinParam()).toBe('')
  })

  it('extracts the PIN from the URL', () => {
    window.history.replaceState({}, '', '/?joinPin=4821')
    expect(parseJoinPinParam()).toBe('4821')
  })
})

describe('parseKanbanBoardParam', () => {
  it('returns an empty array with no ?kanban-board param', () => {
    expect(parseKanbanBoardParam()).toEqual([])
  })

  it('decodes a base64 UTF-8 board name into a single deeplinked story', () => {
    const encoded = btoa(unescape(encodeURIComponent('Sprint 12 Backlog')))
    window.history.replaceState({}, '', `/?kanban-board=${encoded}`)
    expect(parseKanbanBoardParam()).toEqual([{ title: 'Sprint 12 Backlog' }])
  })

  it('round-trips non-ASCII board names', () => {
    const encoded = btoa(unescape(encodeURIComponent('Спринт 12')))
    window.history.replaceState({}, '', `/?kanban-board=${encoded}`)
    expect(parseKanbanBoardParam()).toEqual([{ title: 'Спринт 12' }])
  })

  it('recovers gracefully from malformed base64 in the param', () => {
    window.history.replaceState({}, '', '/?kanban-board=not-valid-base64!!!')
    expect(parseKanbanBoardParam()).toEqual([])
  })

  it('returns an empty array for a blank decoded name', () => {
    window.history.replaceState({}, '', `/?kanban-board=${btoa('   ')}`)
    expect(parseKanbanBoardParam()).toEqual([])
  })
})

describe('parseParticipantsParam', () => {
  it('returns an empty array with no ?participants param', () => {
    expect(parseParticipantsParam()).toEqual([])
  })

  it('splits a comma-separated, URL-encoded name list', () => {
    window.history.replaceState({}, '', `/?participants=${encodeURIComponent('Alice,Bob,Carol')}`)
    expect(parseParticipantsParam()).toEqual(['Alice', 'Bob', 'Carol'])
  })

  it('trims whitespace and drops empty entries', () => {
    window.history.replaceState({}, '', `/?participants=${encodeURIComponent(' Alice , , Bob ')}`)
    expect(parseParticipantsParam()).toEqual(['Alice', 'Bob'])
  })
})

describe('cardKey', () => {
  it('maps special card glyphs to i18n-safe keys', () => {
    expect(cardKey('½')).toBe('half')
    expect(cardKey('☕')).toBe('coffee')
  })
  it('passes through numeric-looking values unchanged', () => {
    expect(cardKey('5')).toBe('5')
  })
})
