import type { SessionHistoryEntry } from './types'

/**
 * Sprint Metrics' `sprint-metrics-projects` key stores `ProjectRecord[]`
 * (see sprint-metrics/src/types.ts). Only the fields read here are
 * declared — `SprintData` has no date field, so there is nothing to
 * match a Planning Poker session to a specific sprint by date (the
 * per-sprint "committed vs delivered" pairing originally proposed for
 * this integration isn't buildable against the real schema). This
 * reads a coarser, suite-wide signal instead: overall planned vs
 * completed points across every tracked sprint.
 */
interface SprintMetricsSprint {
  planned: number
  completed: number
}

interface SprintMetricsProject {
  sprints: SprintMetricsSprint[]
}

const SPRINT_METRICS_KEY = 'sprint-metrics-projects'
const MIN_SPRINTS_FOR_SIGNAL = 3

export interface DeliveryAccuracy {
  sprintCount: number
  totalPlanned: number
  totalCompleted: number
  accuracyRatio: number | null
}

export function readDeliveryAccuracy(): DeliveryAccuracy | null {
  let raw: string | null
  try {
    raw = localStorage.getItem(SPRINT_METRICS_KEY)
  } catch {
    return null
  }
  if (!raw) return null
  let projects: unknown
  try {
    projects = JSON.parse(raw)
  } catch {
    return null
  }
  if (!Array.isArray(projects)) return null

  const sprints: SprintMetricsSprint[] = []
  for (const project of projects as SprintMetricsProject[]) {
    if (!project || !Array.isArray(project.sprints)) continue
    for (const sprint of project.sprints) {
      if (typeof sprint?.planned === 'number' && typeof sprint?.completed === 'number') {
        sprints.push(sprint)
      }
    }
  }

  const totalPlanned = sprints.reduce((sum, s) => sum + s.planned, 0)
  const totalCompleted = sprints.reduce((sum, s) => sum + s.completed, 0)

  return {
    sprintCount: sprints.length,
    totalPlanned,
    totalCompleted,
    accuracyRatio: totalPlanned > 0 ? totalCompleted / totalPlanned : null,
  }
}

export function hasEnoughDeliveryData(accuracy: DeliveryAccuracy | null): boolean {
  return accuracy !== null && accuracy.sprintCount >= MIN_SPRINTS_FOR_SIGNAL
}

export type AccuracyLevel = 'green' | 'amber' | 'red'

export function accuracyLevel(ratio: number): AccuracyLevel {
  if (ratio >= 0.9) return 'green'
  if (ratio >= 0.7) return 'amber'
  return 'red'
}

export interface EstimationOverview {
  sessionCount: number
  avgPointsPerStory: number | null
}

export function summarizeEstimationHistory(sessionHistory: SessionHistoryEntry[]): EstimationOverview {
  const withEstimates = sessionHistory.filter(s => s.avgPoints !== null)
  const avgPointsPerStory = withEstimates.length > 0
    ? withEstimates.reduce((sum, s) => sum + (s.avgPoints ?? 0), 0) / withEstimates.length
    : null
  return { sessionCount: sessionHistory.length, avgPointsPerStory }
}
