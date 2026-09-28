import { getCharacter } from './characters';
import type { AssetLevel, AssetSlot } from './assets';

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
  assetLevels: Record<string, AssetLevel>;
  /** Total match-only Upgrade Tokens, including any reserved for the endgame. */
  upgradeTokens: number;
  /** Tokens reserved for the future endgame; these cannot be spent mid-match. */
  heldUpgradeTokens: number;
  upgrades: string[];
  history: PlayerMatchHistory;
}

export interface PlayerMatchHistory {
  gambleCardsDrawn: number;
  doubleDowns: number;
  finalGambles: number;
  largestWealthSwing: number;
  playerEncounters: number;
  careerChanges: number;
  assetUpgrades: number;
  upgradeTokensSpent: number;
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
    assetLevels: {},
    upgradeTokens: 0,
    heldUpgradeTokens: 0,
    upgrades: [],
    history: {
      gambleCardsDrawn: 0,
      doubleDowns: 0,
      finalGambles: 0,
      largestWealthSwing: 0,
      playerEncounters: 0,
      careerChanges: 0,
      assetUpgrades: 0,
      upgradeTokensSpent: 0,
    },
  };
}