import type { CardValue, SessionHistoryEntry } from './types'

const HISTORY_KEY = 'planning-poker:history'

export function loadHistory(): SessionHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export interface DeeplinkStory {
  title: string
  description?: string
}

export function parseDeeplinkStories(): DeeplinkStory[] {
  try {
    const raw = new URLSearchParams(window.location.search).get('stories')
    if (!raw) return []
    const parsed: unknown = JSON.parse(decodeURIComponent(raw))
    if (!Array.isArray(parsed)) return []
    return (parsed as unknown[])
      .slice(0, 50)
      .filter((s): s is { title: string; description?: string } =>
        typeof s === 'object' && s !== null && typeof (s as { title?: unknown }).title === 'string'
      )
      .map(s => ({ title: s.title.trim(), description: s.description?.trim() || undefined }))
      .filter(s => s.title.length > 0)
  } catch {
    return []
  }
}

export function parseChangePlannerParams(): { initiativeId: string } | null {
  const p = new URLSearchParams(window.location.search)
  if (p.get('source') !== 'change-planner') return null
  const initiativeId = p.get('initiativeId') ?? ''
  return { initiativeId }
}

export function parseJoinPinParam(): string {
  return new URLSearchParams(window.location.search).get('joinPin') ?? ''
}

export function cardKey(v: CardValue): string {
  if (v === '½') return 'half'
  if (v === '☕') return 'coffee'
  return v
}
