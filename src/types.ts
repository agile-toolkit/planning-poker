export type CardValue = '½' | '1' | '2' | '3' | '5' | '8' | '13' | '20' | '40' | '100' | '?' | '☕'

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
}

export const CARD_VALUES: CardValue[] = [
  '½',
  '1',
  '2',
  '3',
  '5',
  '8',
  '13',
  '20',
  '40',
  '100',
  '?',
  '☕',
]
