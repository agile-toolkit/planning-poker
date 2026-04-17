export const CARD_VALUES = ['½', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?', '☕'] as const;
export type CardValue = typeof CARD_VALUES[number];

export interface Participant {
  id: string;
  name: string;
  vote: CardValue | null;
}

export interface Story {
  id: string;
  title: string;
  description?: string;
  finalEstimate: CardValue | null;
  votes: Record<string, CardValue>;
}

export interface Session {
  id: string;
  name: string;
  participants: Participant[];
  stories: Story[];
  currentStoryId: string | null;
  revealed: boolean;
}

export type View = 'home' | 'session';
