import { getCharacter } from './characters';
import type { AssetSlot } from './assets';

export interface Player {
  playerId: string;
  displayName: string;
  characterId: string;
  position: number;
  wealth: number;
  aiSkill: number;
  fame: number;
  lifestyle: number;
  influence: number;
  careerId: string | null;
  salaryTier: number;
  salaryAmount: number;
  equipment: Record<AssetSlot, string | null>;
  upgrades: string[];
}

export type PlayerStat = 'wealth' | 'aiSkill' | 'fame' | 'lifestyle' | 'influence';

export function createPlayer(characterId: string, displayName = 'Player 1'): Player {
  if (!getCharacter(characterId)) {
    throw new Error(`Unknown character: ${characterId}`);
  }

  return {
    playerId: crypto.randomUUID(),
    displayName,
    characterId,
    position: 0,
    wealth: 0,
    aiSkill: 0,
    fame: 0,
    lifestyle: 0,
    influence: 0,
    careerId: null,
    salaryTier: 0,
    salaryAmount: 0,
    equipment: { car: null, lifestyle: null, companion: null, property: null },
    upgrades: [],
  };
}