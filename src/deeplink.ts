import type { CardValue, SessionHistoryEntry } from './types'
import { normalizeRoomCode } from './live/crypto'

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

/**
 * The room code from a join link (`#join=ABCDE-12345`), normalized, or ''.
 *
 * The code is the session's encryption secret, so it lives in the URL
 * fragment — browsers never send that to a server — and anything that is
 * not a well-formed code is dropped here.
 */
export function parseJoinCodeParam(): string {
  const raw = new URLSearchParams(window.location.hash.slice(1)).get('join') ?? ''
  return normalizeRoomCode(raw)
}

/** Kanban Designer's "Send to Planning Poker" button: ?kanban-board=<base64 UTF-8 board name> */
export function parseKanbanBoardParam(): DeeplinkStory[] {
  try {
    const raw = new URLSearchParams(window.location.search).get('kanban-board')
    if (!raw) return []
    const name = decodeURIComponent(escape(atob(raw))).trim()
    return name ? [{ title: name }] : []
  } catch {
    return []
  }
}

/** Scrum Facilitator's ceremony "Open in Planning Poker" link: ?participants=Alice,Bob,Carol */
export function parseParticipantsParam(): string[] {
  const raw = new URLSearchParams(window.location.search).get('participants')
  if (!raw) return []
  return raw.split(',').map(n => n.trim()).filter(Boolean)
}

export function cardKey(v: CardValue): string {
  if (v === '½') return 'half'
  if (v === '☕') return 'coffee'
  return v
}
