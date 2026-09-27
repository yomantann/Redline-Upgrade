/** Deck registry for board/UI presentation. Counts remain visual, while Phase 9 card effects are active. */
export type DeckId = 'wealth' | 'ai' | 'fame' | 'lifestyle' | 'influence' | 'gamble';

export interface DeckDefinition {
  id: DeckId;
  name: string;
  icon: string;
  serial: string;
  motif: string;
  count: number;
  color: string;
  description: string;
}

export const decks: readonly DeckDefinition[] = [
  { id: 'wealth', name: 'WEALTH', icon: 'wealth', serial: '01 / CAPITAL', motif: 'W', count: 24, color: '#d8e78b', description: 'Money moves. Every draw changes the stakes.' },
  { id: 'ai', name: 'AI SKILL', icon: 'ai', serial: '02 / SIGNAL', motif: 'AI', count: 20, color: '#88c6c2', description: 'A sharper signal for the next move.' },
  { id: 'fame', name: 'FAME', icon: 'fame', serial: '03 / SPOTLIGHT', motif: 'F', count: 18, color: '#f5a67e', description: 'Eyes on you. Make the attention count.' },
  { id: 'lifestyle', name: 'LIFESTYLE', icon: 'lifestyle', serial: '04 / MOMENTUM', motif: 'L', count: 22, color: '#dbbbdc', description: 'The life you make along the way.' },
  { id: 'influence', name: 'INFLUENCE', icon: 'influence', serial: '05 / NETWORK', motif: 'I', count: 18, color: '#e9c477', description: 'The right connections change the route.' },
  { id: 'gamble', name: 'GAMBLE', icon: 'gamble', serial: '06 / RISK', motif: 'G', count: 16, color: '#f57970', description: 'No sure things past the red line.' },
];

export const getDeck = (id: DeckId): DeckDefinition => decks.find(deck => deck.id === id)!;