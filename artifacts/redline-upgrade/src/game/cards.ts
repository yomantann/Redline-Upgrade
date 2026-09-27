import type { DeckId } from './decks';

/** Visual examples only. These have no game effects and are not added to a real draw pile. */
export interface CardDefinition {
  id: string;
  deck: DeckId;
  title: string;
  description: string;
  effect: string;
  value: string;
  rarity: 'STANDARD' | 'RARE';
}

export const cards: readonly CardDefinition[] = [
  { id: 'wealth-seed', deck: 'wealth', title: 'Seed Capital', description: 'A small opening becomes a real opportunity.', effect: 'Example wealth adjustment', value: '+$12,500', rarity: 'STANDARD' },
  { id: 'wealth-windfall', deck: 'wealth', title: 'Unexpected Return', description: 'An old bet finally makes its way home.', effect: 'Example wealth adjustment', value: '+$28,750', rarity: 'RARE' },
  { id: 'ai-pattern', deck: 'ai', title: 'Pattern Found', description: 'The noise resolves into an edge you can use.', effect: 'Example AI skill adjustment', value: '+3 AI', rarity: 'STANDARD' },
  { id: 'ai-model', deck: 'ai', title: 'New Model', description: 'A better question leads to a better machine.', effect: 'Example AI skill adjustment', value: '+6 AI', rarity: 'RARE' },
  { id: 'fame-clip', deck: 'fame', title: 'The Clip', description: 'One moment travels farther than you expected.', effect: 'Example fame adjustment', value: '+4 FAME', rarity: 'STANDARD' },
  { id: 'fame-cover', deck: 'fame', title: 'Cover Story', description: 'Your name is suddenly impossible to ignore.', effect: 'Example fame adjustment', value: '+9 FAME', rarity: 'RARE' },
  { id: 'lifestyle-detour', deck: 'lifestyle', title: 'Take The Long Way', description: 'An unplanned stop becomes the whole story.', effect: 'Example lifestyle adjustment', value: '+3 LIFE', rarity: 'STANDARD' },
  { id: 'lifestyle-reset', deck: 'lifestyle', title: 'Full Reset', description: 'Clear the calendar. Make space for more.', effect: 'Example lifestyle adjustment', value: '+7 LIFE', rarity: 'RARE' },
  { id: 'influence-intro', deck: 'influence', title: 'Warm Introduction', description: 'Someone opens a door before you knock.', effect: 'Example influence adjustment', value: '+3 INFL.', rarity: 'STANDARD' },
  { id: 'influence-room', deck: 'influence', title: 'In The Room', description: 'The conversation changes when you arrive.', effect: 'Example influence adjustment', value: '+8 INFL.', rarity: 'RARE' },
  { id: 'gamble-call', deck: 'gamble', title: 'Double Or Nothing', description: 'The next move asks for nerve, not certainty.', effect: 'Example risk outcome', value: '±$18,500', rarity: 'STANDARD' },
  { id: 'gamble-edge', deck: 'gamble', title: 'Against The Odds', description: 'A narrow opening and a very loud clock.', effect: 'Example risk outcome', value: '±$36,750', rarity: 'RARE' },
];

export const examplesForDeck = (deck: DeckId): readonly CardDefinition[] => cards.filter(card => card.deck === deck);