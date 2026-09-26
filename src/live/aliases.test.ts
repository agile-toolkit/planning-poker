import { describe, it, expect } from 'vitest'
import { ALIASES, aliasLabel, aliasLabels, isAliasIndex, pickAlias } from './aliases'

describe('aliases', () => {
  it('validates indices', () => {
    expect(isAliasIndex(0)).toBe(true)
    expect(isAliasIndex(ALIASES.length - 1)).toBe(true)
    expect(isAliasIndex(ALIASES.length)).toBe(false)
    expect(isAliasIndex(-1)).toBe(false)
    expect(isAliasIndex(1.5)).toBe(false)
    expect(isAliasIndex('1')).toBe(false)
  })

  it('avoids taken aliases while any are free', () => {
    const taken = ALIASES.map((_, i) => i).filter(i => i !== 7)
    for (let i = 0; i < 20; i++) expect(pickAlias(taken)).toBe(7)
    expect(isAliasIndex(pickAlias(ALIASES.map((_, i) => i)))).toBe(true)
  })

  it('labels in the UI language, falling back to English', () => {
    expect(aliasLabel(0, 'en')).toBe('🦊 Fox')
    expect(aliasLabel(0, 'ru-RU')).toBe('🦊 Лиса')
    expect(aliasLabel(0, 'de')).toBe('🦊 Fox')
    expect(aliasLabel(999, 'en')).toBe('?')
  })

  it('numbers duplicate aliases consistently', () => {
    const labels = aliasLabels([['bb', 0], ['aa', 0], ['cc', 1]], 'en')
    expect(labels.get('aa')).toBe('🦊 Fox')
    expect(labels.get('bb')).toBe('🦊 Fox 2')
    expect(labels.get('cc')).toBe('🐻 Bear')
  })
})
