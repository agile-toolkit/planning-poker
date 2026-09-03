import { describe, it, expect } from 'vitest'
import { parseTeamIdentityMembers } from './teamIdentityImport'

describe('parseTeamIdentityMembers', () => {
  it('returns an empty array when raw is null', () => {
    expect(parseTeamIdentityMembers(null)).toEqual([])
  })

  it('reads plain-string members from a Team Identity charter', () => {
    const raw = JSON.stringify({ members: ['Alice', 'Bob', 'Carol'] })
    expect(parseTeamIdentityMembers(raw)).toEqual(['Alice', 'Bob', 'Carol'])
  })

  it('trims whitespace and drops empty entries', () => {
    const raw = JSON.stringify({ members: [' Alice ', '', '  ', 'Bob'] })
    expect(parseTeamIdentityMembers(raw)).toEqual(['Alice', 'Bob'])
  })

  it('ignores non-string entries rather than crashing (e.g. an older {name} object shape)', () => {
    const raw = JSON.stringify({ members: [{ name: 'Alice' }, 'Bob'] })
    expect(parseTeamIdentityMembers(raw)).toEqual(['Bob'])
  })

  it('returns an empty array when members is missing or not an array', () => {
    expect(parseTeamIdentityMembers(JSON.stringify({}))).toEqual([])
    expect(parseTeamIdentityMembers(JSON.stringify({ members: 'not-an-array' }))).toEqual([])
  })

  it('recovers gracefully from malformed JSON', () => {
    expect(parseTeamIdentityMembers('not-json')).toEqual([])
  })
})
