export type CardValue = '½' | '1' | '2' | '3' | '5' | '8' | '13' | '20' | '40' | '100' | '?' | '☕'
export type GamePhase = 'home' | 'setup' | 'voting' | 'revealed' | 'history' | 'learn'

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
