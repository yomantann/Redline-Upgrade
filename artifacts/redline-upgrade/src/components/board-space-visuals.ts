import type { BoardSpace } from '../game/board-data';
import type { DeckId } from '../game/decks';

export type BoardVisualClass = 'safe' | 'deck' | 'salary' | 'major' | 'gamble' | 'effect';

export interface BoardSpaceVisual {
  className: BoardVisualClass;
  accent: string;
  tile: string;
}

const DECK_VISUALS: Record<DeckId, Pick<BoardSpaceVisual, 'accent' | 'tile'>> = {
  wealth: { accent: '#d8e78b', tile: '#3d4b3e' },
  ai: { accent: '#88c6c2', tile: '#344a48' },
  fame: { accent: '#f5a67e', tile: '#4b4039' },
  lifestyle: { accent: '#dbbbdc', tile: '#483f4a' },
  influence: { accent: '#e9c477', tile: '#4a4438' },
  gamble: { accent: '#f57970', tile: '#4a3936' },
};

/**
 * Presentation-only classification. NORMAL and inactive EVENT spaces deliberately
 * share the safe treatment because neither has a gameplay effect in this phase.
 */
export function getSpaceVisual(space: BoardSpace): BoardSpaceVisual {
  switch (space.type) {
    case 'CARD': {
      if (!space.deck) throw new Error(`Card space ${space.number} is missing its deck identity.`);
      return { className: 'deck', ...DECK_VISUALS[space.deck] };
    }
    case 'GAMBLE':
      return { className: 'gamble', accent: '#e8a367', tile: '#594139' };
    case 'SALARY_GATE':
      return { className: 'salary', accent: '#d4e981', tile: '#496752' };
    case 'CAREER_CHANGE':
    case 'MILESTONE':
      return { className: 'major', accent: '#f96346', tile: '#603b32' };
    case 'EVENT':
      return space.trigger === 'NONE'
        ? { className: 'safe', accent: '#8ea69a', tile: '#30423b' }
        : { className: 'effect', accent: '#9fc6ae', tile: '#35483e' };
    case 'NORMAL':
      return { className: 'safe', accent: '#8ea69a', tile: '#30423b' };
    default: {
      const unreachable: never = space.type;
      return unreachable;
    }
  }
}