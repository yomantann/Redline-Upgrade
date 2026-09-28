import { getAsset, type AssetLevel, type AssetSlot } from './assets';
import { assetValueAtLevel } from './upgrade-tokens';
import type { Player } from './player';

export type EndgameChoice = 'CASH_OUT' | 'DOUBLE_DOWN' | 'FINAL_GAMBLE';
export type EndgameTokenTier = 0 | 1 | 2 | 3 | 4;
export type PlayerMatchStatus = 'ACTIVE' | 'FINISHED';

export interface FinishSnapshot {
  playerId: string;
  displayName: string;
  slot: number;
  isCPU: boolean;
  capturedRound: number;
  capturedTurnCounter: number;
  position: number;
  characterId: string;
  careerId: string | null;
  salaryTier: number;
  salaryAmount: number;
  wealth: number;
  aiSkill: number;
  fame: number;
  lifestyle: number;
  influence: number;
  equipment: Record<AssetSlot, string | null>;
  assetLevels: Record<string, AssetLevel>;
  upgradeTokens: number;
  heldUpgradeTokens: number;
  upgrades: string[];
}

export interface EndgameDice {
  die1: number;
  die2: number;
  total: number;
  doubles: boolean;
}

export interface EndgameState {
  status: 'PENDING' | 'RESOLVED';
  snapshot: FinishSnapshot;
  baseValue: number;
  tokenTier: EndgameTokenTier;
  choice?: EndgameChoice;
  finalGameValue?: number;
  multiplier?: number;
  dice?: EndgameDice;
  effectiveRoll?: number;
  rollEffectDelta?: number;
  gambleCardId?: string;
  gambleRawDelta?: number;
  gambleAdjustedDelta?: number;
}

export const ENDGAME_BALANCE = {
  statValues: {
    aiSkill: 15_000,
    fame: 8_000,
    lifestyle: 10_000,
    influence: 7_500,
  },
  cashOutMultipliersByHeldTokens: [1, 1.06, 1.13, 1.22, 1.34] as const,
  doubleDownRollBonusByHeldTokens: [0, 1, 2, 3, 4] as const,
  doubleDownBands: [
    { maxRoll: 3, multiplier: 0.25 },
    { maxRoll: 4, multiplier: 0.5 },
    { maxRoll: 5, multiplier: 0.85 },
    { maxRoll: 6, multiplier: 1.25 },
    { maxRoll: 7, multiplier: 1.9 },
    { maxRoll: 8, multiplier: 2.75 },
    { maxRoll: 12, multiplier: 3.6 },
  ] as const,
  finalGambleWinMultipliersByHeldTokens: [1, 1.12, 1.3, 1.5, 1.75] as const,
  finalGambleLossMultipliersByHeldTokens: [1, 0.9, 0.78, 0.64, 0.5] as const,
} as const;

export function getEndgameTokenTier(heldUpgradeTokens: number): EndgameTokenTier {
  return Math.min(4, Math.max(0, Math.trunc(heldUpgradeTokens))) as EndgameTokenTier;
}

export function calculateEndgameBaseValue(player: Player): number {
  const assetValue = Object.values(player.equipment).reduce((total, assetId) => {
    if (!assetId) return total;
    const asset = getAsset(assetId);
    if (!asset) return total;
    const level = (player.assetLevels[assetId] ?? 1) as AssetLevel;
    return total + assetValueAtLevel(asset, level);
  }, 0);
  const statValue =
    player.aiSkill * ENDGAME_BALANCE.statValues.aiSkill +
    player.fame * ENDGAME_BALANCE.statValues.fame +
    player.lifestyle * ENDGAME_BALANCE.statValues.lifestyle +
    player.influence * ENDGAME_BALANCE.statValues.influence;
  return Math.max(0, Math.round(Math.max(0, player.wealth) + assetValue + statValue));
}

export function createFinishSnapshot(
  player: Player,
  slot: number,
  isCPU: boolean,
  round: number,
  turnCounter: number,
): FinishSnapshot {
  return {
    playerId: player.playerId,
    displayName: player.displayName,
    slot,
    isCPU,
    capturedRound: round,
    capturedTurnCounter: turnCounter,
    position: player.position,
    characterId: player.characterId,
    careerId: player.careerId,
    salaryTier: player.salaryTier,
    salaryAmount: player.salaryAmount,
    wealth: player.wealth,
    aiSkill: player.aiSkill,
    fame: player.fame,
    lifestyle: player.lifestyle,
    influence: player.influence,
    equipment: { ...player.equipment },
    assetLevels: { ...player.assetLevels },
    upgradeTokens: player.upgradeTokens,
    heldUpgradeTokens: player.heldUpgradeTokens,
    upgrades: [...player.upgrades],
  };
}

export function cashOutValue(baseValue: number, tokenTier: EndgameTokenTier): {
  multiplier: number;
  finalGameValue: number;
} {
  const multiplier = ENDGAME_BALANCE.cashOutMultipliersByHeldTokens[tokenTier];
  return {
    multiplier,
    finalGameValue: Math.max(0, Math.round(baseValue * multiplier)),
  };
}

export function doubleDownValue(
  baseValue: number,
  rollTotal: number,
  tokenTier: EndgameTokenTier,
): { effectiveRoll: number; multiplier: number; finalGameValue: number } {
  const effectiveRoll = Math.min(
    12,
    rollTotal + ENDGAME_BALANCE.doubleDownRollBonusByHeldTokens[tokenTier],
  );
  const multiplier =
    ENDGAME_BALANCE.doubleDownBands.find((band) => effectiveRoll <= band.maxRoll)
      ?.multiplier ?? 3.6;
  return {
    effectiveRoll,
    multiplier,
    finalGameValue: Math.max(0, Math.round(baseValue * multiplier)),
  };
}

export function finalGambleValue(
  baseValue: number,
  rawDelta: number,
  tokenTier: EndgameTokenTier,
): { adjustedDelta: number; multiplier: number; finalGameValue: number } {
  const multiplier = rawDelta >= 0
    ? ENDGAME_BALANCE.finalGambleWinMultipliersByHeldTokens[tokenTier]
    : ENDGAME_BALANCE.finalGambleLossMultipliersByHeldTokens[tokenTier];
  const adjustedDelta = Math.round(rawDelta * multiplier);
  return {
    adjustedDelta,
    multiplier,
    finalGameValue: Math.max(0, baseValue + adjustedDelta),
  };
}

export function chooseCpuEndgameChoice(
  wealth: number,
  baseValue: number,
  tokenTier: EndgameTokenTier,
  random: () => number = Math.random,
): EndgameChoice {
  const wealthShare = baseValue > 0 ? wealth / baseValue : 0;
  if (baseValue >= 1_000_000 && wealthShare >= 0.55 && tokenTier <= 1 && random() < 0.62) {
    return 'CASH_OUT';
  }
  if (tokenTier >= 3 && random() < 0.64) return 'DOUBLE_DOWN';
  return random() < 0.68 ? 'DOUBLE_DOWN' : 'FINAL_GAMBLE';
}