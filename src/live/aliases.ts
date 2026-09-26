/**
 * Session aliases. Kept identical in planning-poker and moving-motivators
 * (src/live/).
 *
 * Real names never go over the network: each participant is an animal,
 * sent as its index into this list and rendered locally.
 */
export const ALIASES = [
  { emoji: '🦊', en: 'Fox',      es: 'Zorro',     be: 'Ліса',      ru: 'Лиса' },
  { emoji: '🐻', en: 'Bear',     es: 'Oso',       be: 'Мядзведзь', ru: 'Медведь' },
  { emoji: '🦉', en: 'Owl',      es: 'Búho',      be: 'Сава',      ru: 'Сова' },
  { emoji: '🐺', en: 'Wolf',     es: 'Lobo',      be: 'Воўк',      ru: 'Волк' },
  { emoji: '🦔', en: 'Hedgehog', es: 'Erizo',     be: 'Вожык',     ru: 'Ёжик' },
  { emoji: '🐿️', en: 'Squirrel', es: 'Ardilla',   be: 'Вавёрка',   ru: 'Белка' },
  { emoji: '🦫', en: 'Beaver',   es: 'Castor',    be: 'Бабёр',     ru: 'Бобр' },
  { emoji: '🦌', en: 'Deer',     es: 'Ciervo',    be: 'Алень',     ru: 'Олень' },
  { emoji: '🐧', en: 'Penguin',  es: 'Pingüino',  be: 'Пінгвін',   ru: 'Пингвин' },
  { emoji: '🐢', en: 'Turtle',   es: 'Tortuga',   be: 'Чарапаха',  ru: 'Черепаха' },
  { emoji: '🐬', en: 'Dolphin',  es: 'Delfín',    be: 'Дэльфін',   ru: 'Дельфин' },
  { emoji: '🦁', en: 'Lion',     es: 'León',      be: 'Леў',       ru: 'Лев' },
  { emoji: '🐼', en: 'Panda',    es: 'Panda',     be: 'Панда',     ru: 'Панда' },
  { emoji: '🦒', en: 'Giraffe',  es: 'Jirafa',    be: 'Жырафа',    ru: 'Жираф' },
  { emoji: '🐙', en: 'Octopus',  es: 'Pulpo',     be: 'Васьміног', ru: 'Осьминог' },
  { emoji: '🦩', en: 'Flamingo', es: 'Flamenco',  be: 'Фламінга',  ru: 'Фламинго' },
  { emoji: '🐝', en: 'Bee',      es: 'Abeja',     be: 'Пчала',     ru: 'Пчела' },
  { emoji: '🦜', en: 'Parrot',   es: 'Loro',      be: 'Папугай',   ru: 'Попугай' },
  { emoji: '🐳', en: 'Whale',    es: 'Ballena',   be: 'Кіт',       ru: 'Кит' },
  { emoji: '🦘', en: 'Kangaroo', es: 'Canguro',   be: 'Кенгуру',   ru: 'Кенгуру' },
] as const

export type AliasLang = 'en' | 'es' | 'be' | 'ru'

export function isAliasIndex(v: unknown): v is number {
  return Number.isInteger(v) && (v as number) >= 0 && (v as number) < ALIASES.length
}

/** A random alias index, avoiding ones already taken when possible. */
export function pickAlias(taken: Iterable<number> = []): number {
  const used = new Set(taken)
  const free = ALIASES.map((_, i) => i).filter(i => !used.has(i))
  const pool = free.length > 0 ? free : ALIASES.map((_, i) => i)
  return pool[crypto.getRandomValues(new Uint32Array(1))[0] % pool.length]
}

/** "🦊 Fox" in the UI language (falls back to English). */
export function aliasLabel(index: number, lang: string): string {
  const a = ALIASES[index]
  if (!a) return '?'
  const key = (['en', 'es', 'be', 'ru'].includes(lang.slice(0, 2)) ? lang.slice(0, 2) : 'en') as AliasLang
  return `${a.emoji} ${a[key]}`
}

/**
 * Labels for a set of peers, numbering duplicates ("🦊 Fox", "🦊 Fox 2") so
 * two people who drew the same animal stay distinguishable.
 */
export function aliasLabels(entries: [id: string, alias: number][], lang: string): Map<string, string> {
  const counts = new Map<number, number>()
  const out = new Map<string, string>()
  for (const [id, alias] of [...entries].sort(([a], [b]) => a.localeCompare(b))) {
    const n = (counts.get(alias) ?? 0) + 1
    counts.set(alias, n)
    out.set(id, n === 1 ? aliasLabel(alias, lang) : `${aliasLabel(alias, lang)} ${n}`)
  }
  return out
}
