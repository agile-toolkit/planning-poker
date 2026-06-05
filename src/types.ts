export type CardValue = string

export type DeckType = 'fibonacci' | 'tshirt' | 'powers2'

export type GamePhase = 'home' | 'setup' | 'session' | 'history' | 'learn'

export interface Participant {
  name: string
  vote: CardValue | null
}

export interface Story {
  id: string
  title: string
  finalEstimate: CardValue | null
  votes: Record<string, CardValue>
}

export interface GameState {
  phase: GamePhase
  currentStory: string
  participants: Participant[]
  stories: Story[]
}

/** Session view: participants carry stable ids for vote maps */
export interface SessionParticipant {
  id: string
  name: string
  vote: CardValue | null
}

export interface SessionStory {
  id: string
  title: string
  description?: string
  finalEstimate: CardValue | null
  votes: Record<string, CardValue>
}

export interface PokerSession {
  id: string
  name: string
  participants: SessionParticipant[]
  stories: SessionStory[]
  currentStoryId: string | null
  revealed: boolean
  deckType: DeckType
}

export const DECKS: Record<DeckType, CardValue[]> = {
  fibonacci: ['½', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?', '☕'],
  tshirt:    ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕'],
  powers2:   ['1', '2', '4', '8', '16', '32', '64', '?', '☕'],
}

export const CARD_VALUES: CardValue[] = DECKS.fibonacci

export interface SessionHistoryStory {
  id: string
  title: string
  finalEstimate: CardValue | null
  votes: Record<string, CardValue>
}

export interface SessionHistoryEntry {
  id: string
  name: string
  date: string
  deckType: DeckType
  storyCount: number
  estimatedCount: number
  avgPoints: number | null
  stories: SessionHistoryStory[]
}
