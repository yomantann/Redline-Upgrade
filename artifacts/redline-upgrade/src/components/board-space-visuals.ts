import type { BoardSpace } from '../game/board-data';
import { getBoardEffect } from '../game/board-effects';
import type { DeckId } from '../game/decks';

export type BoardVisualClass = 'safe' | 'deck' | 'salary' | 'major' | 'gamble' | 'effect' | 'upgrade' | 'start';

export interface BoardSpaceVisual {
  className: BoardVisualClass;
  accent: string;
  tile: string;
  deckCode?: string;
  deckName?: string;
}

const DECK_VISUALS: Record<DeckId, Pick<BoardSpaceVisual, 'accent' | 'tile' | 'deckCode' | 'deckName'>> = {
  wealth: { accent: '#d8e78b', tile: '#3d4b3e', deckCode: 'W', deckName: 'WEALTH' },
  ai: { accent: '#88c6c2', tile: '#344a48', deckCode: 'AI', deckName: 'AI SKILL' },
  fame: { accent: '#f5a67e', tile: '#4b4039', deckCode: 'FM', deckName: 'FAME' },
  lifestyle: { accent: '#dbbbdc', tile: '#483f4a', deckCode: 'LS', deckName: 'LIFESTYLE' },
  influence: { accent: '#e9c477', tile: '#4a4438', deckCode: 'IN', deckName: 'INFLUENCE' },
  gamble: { accent: '#f57970', tile: '#4a3936', deckCode: 'GMB', deckName: 'GAMBLE' },
};

const EFFECT_ACCENTS = {
  wealth: '#d8e78b',
  ai: '#88c6c2',
  fame: '#f5a67e',
  lifestyle: '#dbbbdc',
  influence: '#e9c477',
  career: '#a6c1a0',
  interaction: '#9fc6ae',
  risk: '#e8a367',
} as const;

/**
 * Presentation-only classification. Ordinary spaces remain neutral; active EVENT
 * spaces carry the category accent for their predictable board effect.
 */
export function getSpaceVisual(space: BoardSpace): BoardSpaceVisual {
  switch (space.type) {
    case 'CARD': {
      if (!space.deck) throw new Error(`Card space ${space.number} is missing its deck identity.`);
      return { className: 'deck', ...DECK_VISUALS[space.deck] };
    }
    case 'GAMBLE':
      return { className: 'gamble', ...DECK_VISUALS.gamble };
    case 'SALARY_GATE':
      return { className: 'salary', accent: '#d4e981', tile: '#496752' };
    case 'UPGRADE_TOKEN':
      return { className: 'upgrade', accent: '#d4c5ff', tile: '#433b5a' };
    case 'CAREER_CHANGE':
    case 'MILESTONE':
      return { className: 'major', accent: '#f96346', tile: '#603b32' };
    case 'EVENT': {
      if (!space.effectId) return { className: 'safe', accent: '#8ea69a', tile: '#30423b' };
      const effect = getBoardEffect(space.effectId);
      if (!effect) throw new Error(`Board space ${space.number} references unknown effect ${space.effectId}.`);
      if (space.number === 1) return { className: 'start', accent: '#d4e981', tile: '#3b543f' };
      return { className: 'effect', accent: EFFECT_ACCENTS[effect.tone], tile: '#35483e' };
    }
    case 'NORMAL':
      return { className: 'safe', accent: '#8ea69a', tile: '#30423b' };
    default: {
      const unreachable: never = space.type;
      return unreachable;
    }
  }
}