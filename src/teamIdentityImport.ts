/**
 * Team Identity's `team-identity-charter` (App.tsx, STORAGE_KEY) stores
 * `members?: string[]` — plain names, not objects. Reads the same key.
 */
export function parseTeamIdentityMembers(raw: string | null): string[] {
  if (!raw) return []
  try {
    const charter = JSON.parse(raw) as Record<string, unknown>
    const members = charter.members
    if (!Array.isArray(members)) return []
    return members
      .filter((m): m is string => typeof m === 'string')
      .map(m => m.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}
