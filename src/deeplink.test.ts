import { describe, it, expect, beforeEach } from 'vitest'
import { loadHistory, parseDeeplinkStories, parseChangePlannerParams, cardKey } from './deeplink'

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

describe('cardKey', () => {
  it('maps special card glyphs to i18n-safe keys', () => {
    expect(cardKey('½')).toBe('half')
    expect(cardKey('☕')).toBe('coffee')
  })
  it('passes through numeric-looking values unchanged', () => {
    expect(cardKey('5')).toBe('5')
  })
})
