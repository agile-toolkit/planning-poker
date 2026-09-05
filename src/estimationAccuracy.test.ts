import { describe, it, expect, beforeEach } from 'vitest'
import {
  readDeliveryAccuracy,
  hasEnoughDeliveryData,
  accuracyLevel,
  summarizeEstimationHistory,
} from './estimationAccuracy'
import type { SessionHistoryEntry } from './types'

const KEY = 'sprint-metrics-projects'

describe('readDeliveryAccuracy', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null when the key is absent', () => {
    expect(readDeliveryAccuracy()).toBeNull()
  })

  it('returns null for invalid JSON', () => {
    localStorage.setItem(KEY, '{not json')
    expect(readDeliveryAccuracy()).toBeNull()
  })

  it('returns null when the stored value is not an array', () => {
    localStorage.setItem(KEY, JSON.stringify({ not: 'an array' }))
    expect(readDeliveryAccuracy()).toBeNull()
  })

  it('aggregates planned/completed across all sprints in all projects', () => {
    localStorage.setItem(KEY, JSON.stringify([
      { sprints: [{ planned: 20, completed: 18 }, { planned: 15, completed: 10 }] },
      { sprints: [{ planned: 10, completed: 10 }] },
    ]))
    const result = readDeliveryAccuracy()
    expect(result).toEqual({
      sprintCount: 3,
      totalPlanned: 45,
      totalCompleted: 38,
      accuracyRatio: 38 / 45,
    })
  })

  it('skips malformed sprint entries rather than throwing', () => {
    localStorage.setItem(KEY, JSON.stringify([
      { sprints: [{ planned: 10, completed: 5 }, { planned: 'oops' }, null] },
      { sprints: 'not-an-array' },
      null,
    ]))
    const result = readDeliveryAccuracy()
    expect(result).toEqual({ sprintCount: 1, totalPlanned: 10, totalCompleted: 5, accuracyRatio: 0.5 })
  })

  it('returns a null accuracyRatio when total planned is zero', () => {
    localStorage.setItem(KEY, JSON.stringify([{ sprints: [{ planned: 0, completed: 0 }] }]))
    const result = readDeliveryAccuracy()
    expect(result?.accuracyRatio).toBeNull()
  })
})

describe('hasEnoughDeliveryData', () => {
  it('returns false for null', () => {
    expect(hasEnoughDeliveryData(null)).toBe(false)
  })

  it('returns false below the 3-sprint threshold', () => {
    expect(hasEnoughDeliveryData({ sprintCount: 2, totalPlanned: 10, totalCompleted: 8, accuracyRatio: 0.8 })).toBe(false)
  })

  it('returns true at or above the 3-sprint threshold', () => {
    expect(hasEnoughDeliveryData({ sprintCount: 3, totalPlanned: 10, totalCompleted: 8, accuracyRatio: 0.8 })).toBe(true)
  })
})

describe('accuracyLevel', () => {
  it('classifies green at 90% or above', () => {
    expect(accuracyLevel(0.9)).toBe('green')
    expect(accuracyLevel(1)).toBe('green')
  })

  it('classifies amber between 70% and 90%', () => {
    expect(accuracyLevel(0.7)).toBe('amber')
    expect(accuracyLevel(0.89)).toBe('amber')
  })

  it('classifies red below 70%', () => {
    expect(accuracyLevel(0.69)).toBe('red')
    expect(accuracyLevel(0)).toBe('red')
  })
})

function session(avgPoints: number | null): SessionHistoryEntry {
  return {
    id: crypto.randomUUID(),
    name: 'Session',
    date: '2026-01-01',
    deckType: 'fibonacci',
    storyCount: 1,
    estimatedCount: 1,
    avgPoints,
    stories: [],
  }
}

describe('summarizeEstimationHistory', () => {
  it('returns null avgPointsPerStory for no sessions', () => {
    expect(summarizeEstimationHistory([])).toEqual({ sessionCount: 0, avgPointsPerStory: null })
  })

  it('averages avgPoints across sessions that have an estimate', () => {
    const result = summarizeEstimationHistory([session(5), session(3), session(null)])
    expect(result.sessionCount).toBe(3)
    expect(result.avgPointsPerStory).toBe(4)
  })

  it('returns null avgPointsPerStory when no session has an estimate', () => {
    expect(summarizeEstimationHistory([session(null)]).avgPointsPerStory).toBeNull()
  })
})
