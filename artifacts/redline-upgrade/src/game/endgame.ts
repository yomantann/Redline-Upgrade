import { getAsset, type AssetLevel, type AssetSlot } from './assets';
import { assetValueAtLevel } from './upgrade-tokens';
import type { Player } from './player';

export type EndgameChoice = 'CASH_OUT' | 'DOUBLE_DOWN' | 'FINAL_GAMBLE';
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
  finishOrderBonus: number;
  secondCareer: Player['secondCareer'];
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
  history: Player['history'];
}

export interface EndgameDice {
  die1: number;
  die2: number;
  total: number;
  doubles: boolean;
}

export interface FinalGambleStake {
  assetValue: number;
  adjustedAssetValue: number;
  tokens: number;
  creditsPerToken: number;
  credits: number;
  won: boolean;
  delta: number;
}

export interface EndgameScoreBreakdown {
  wealthBeforeFinishBonus: number;
  finishOrderBonus: number;
  wealth: number;
  assetBaseValue: number;
  assetMultiplier: number;
  adjustedAssetValue: number;
  attributeValues: {
    aiSkill: number;
    fame: number;
    lifestyle: number;
    influence: number;
  };
  attributePointValue: number;
  attributeLeaderBonus: number;
  preAdjustmentScore: number;
  diceAdjustment: number;
  finalScore: number;
}

export interface TokenConversion {
  tokens: number;
  creditsPerToken: number;
  credits: number;
}

export interface EndgameState {
  status: 'PENDING' | 'RESOLVED';
  snapshot: FinishSnapshot;
  baseValue: number;
  choice?: EndgameChoice;
  attributeLeaderBonus?: number;
  scoreBreakdown?: EndgameScoreBreakdown;
  tokenConversion?: TokenConversion;
  finalGameValue?: number;
  multiplier?: number;
  dice?: EndgameDice;
  effectiveRoll?: number;
  rollEffectDelta?: number;
  gambleCardId?: string;
  gambleRawDelta?: number;
  gambleAdjustedDelta?: number;
  gambleStake?: FinalGambleStake;
  endGameTitle?: string;
  endGameTitleDescription?: string;
}

export const ENDGAME_BALANCE = {
  statValues: {
    aiSkill: 15_000,
    fame: 8_000,
    lifestyle: 10_000,
    influence: 7_500,
  },
  assetValueMultipliers: {
    cashOut: 0.5,
    doubleDown: 0.7,
    finalGambleWin: 1.4,
    finalGambleLoss: 0,
  },
  tokenCreditsPerOutcome: {
    cashOut: 200,
    doubleDown: 200,
    finalGambleWin: 400,
    finalGambleLoss: 0,
  },
  finalGambleWinChance: 0.5,
  doubleDownBands: [
    { maxRoll: 3, multiplier: 0.25 },
    { maxRoll: 4, multiplier: 0.5 },
    { maxRoll: 5, multiplier: 0.85 },
    { maxRoll: 6, multiplier: 1.25 },
    { maxRoll: 7, multiplier: 1.9 },
    { maxRoll: 8, multiplier: 2.75 },
  ] as const,
} as const;

export function calculateAssetValue(player: Pick<Player, 'equipment' | 'assetLevels'>): number {
  return Object.values(player.equipment).reduce((total, assetId) => {
    if (!assetId) return total;
    const asset = getAsset(assetId);
    if (!asset) return total;
    const level = (player.assetLevels[assetId] ?? 1) as AssetLevel;
    return total + assetValueAtLevel(asset, level);
  }, 0);
}

export function calculateAdjustedAssetValue(
  player: Pick<Player, 'equipment' | 'assetLevels'>,
  multiplier: number,
): number {
  return Math.round(calculateAssetValue(player) * multiplier);
}

export function calculateAttributePointValue(
  player: Pick<Player, 'aiSkill' | 'fame' | 'lifestyle' | 'influence'>,
): number {
  return Math.round(
    player.aiSkill * ENDGAME_BALANCE.statValues.aiSkill +
    player.fame * ENDGAME_BALANCE.statValues.fame +
    player.lifestyle * ENDGAME_BALANCE.statValues.lifestyle +
    player.influence * ENDGAME_BALANCE.statValues.influence,
  );
}

export function calculateEndgameBaseValue(
  player: Pick<Player, 'wealth' | 'equipment' | 'assetLevels' | 'aiSkill' | 'fame' | 'lifestyle' | 'influence'>,
  assetMultiplier = ENDGAME_BALANCE.assetValueMultipliers.cashOut,
  attributeLeaderBonus = 0,
): number {
  const assetValue = calculateAdjustedAssetValue(player, assetMultiplier);
  const statValue = calculateAttributePointValue(player);
  return Math.max(0, Math.round(Math.max(0, player.wealth) + assetValue + statValue + attributeLeaderBonus));
}

export function createEndgameScoreBreakdown(
  snapshot: FinishSnapshot,
  choice: EndgameChoice,
  attributeLeaderBonus: number,
  finalScore: number,
  diceAdjustment = 0,
  finalGambleWon?: boolean,
): EndgameScoreBreakdown {
  const assetMultiplier = choice === 'CASH_OUT'
    ? ENDGAME_BALANCE.assetValueMultipliers.cashOut
    : choice === 'DOUBLE_DOWN'
      ? ENDGAME_BALANCE.assetValueMultipliers.doubleDown
      : finalGambleWon
        ? ENDGAME_BALANCE.assetValueMultipliers.finalGambleWin
        : ENDGAME_BALANCE.assetValueMultipliers.finalGambleLoss;
  const assetBaseValue = calculateAssetValue(snapshot);
  const adjustedAssetValue = Math.round(assetBaseValue * assetMultiplier);
  const attributeValues = {
    aiSkill: snapshot.aiSkill,
    fame: snapshot.fame,
    lifestyle: snapshot.lifestyle,
    influence: snapshot.influence,
  };
  const attributePointValue = calculateAttributePointValue(snapshot);
  const wealth = Math.max(0, snapshot.wealth - attributeLeaderBonus);
  const wealthBeforeFinishBonus = Math.max(0, wealth - snapshot.finishOrderBonus);
  const preAdjustmentScore = Math.max(0, Math.round(
    wealthBeforeFinishBonus
      + snapshot.finishOrderBonus
      + attributeLeaderBonus
      + adjustedAssetValue
      + attributePointValue,
  ));
  return {
    wealthBeforeFinishBonus,
    finishOrderBonus: snapshot.finishOrderBonus,
    wealth,
    assetBaseValue,
    assetMultiplier,
    adjustedAssetValue,
    attributeValues,
    attributePointValue,
    attributeLeaderBonus,
    preAdjustmentScore,
    diceAdjustment,
    finalScore: Math.max(0, Math.round(finalScore)),
  };
}

export function createFinishSnapshot(
  player: Player,
  slot: number,
  isCPU: boolean,
  round: number,
  turnCounter: number,
  finishOrderBonus = 0,
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
    finishOrderBonus,
    secondCareer: player.secondCareer ? { ...player.secondCareer } : null,
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
    history: { ...player.history },
  };
}

export function cashOutValue(baseValue: number): {
  multiplier: number;
  finalGameValue: number;
} {
  const multiplier = 1;
  return {
    multiplier,
    finalGameValue: Math.max(0, Math.round(baseValue * multiplier)),
  };
}

export function doubleDownValue(
  baseValue: number,
  rollTotal: number,
): { effectiveRoll: number; multiplier: number; finalGameValue: number } {
  const effectiveRoll = Math.min(8, Math.max(2, Math.trunc(rollTotal)));
  const multiplier =
    ENDGAME_BALANCE.doubleDownBands.find((band) => effectiveRoll <= band.maxRoll)
      ?.multiplier ?? 2.75;
  return {
    effectiveRoll,
    multiplier,
    finalGameValue: Math.max(0, Math.round(baseValue * multiplier)),
  };
}

export function finalGambleValue(
  baseValue: number,
  rawDelta: number,
  stakeDelta = 0,
): { adjustedDelta: number; multiplier: number; finalGameValue: number } {
  const multiplier = 1;
  const adjustedDelta = Math.round(rawDelta + stakeDelta);
  return {
    adjustedDelta,
    multiplier,
    finalGameValue: Math.max(0, baseValue + adjustedDelta),
  };
}

/**
 * The Final Gamble puts Wealth, owned assets and any Upgrade Tokens on the table.
 * Win: the staked Wealth and assets are doubled and each token pays its value.
 * Lose: the staked Wealth and assets are forfeited and the tokens are lost.
 */
export function resolveFinalGambleStake(
  player: Pick<Player, 'equipment' | 'assetLevels' | 'upgradeTokens'>,
  random: () => number = Math.random,
): FinalGambleStake {
  const assetValue = calculateAssetValue(player);
  const tokens = Math.max(0, player.upgradeTokens);
  const won = random() < ENDGAME_BALANCE.finalGambleWinChance;
  const adjustedAssetValue = Math.round(
    assetValue * (won
      ? ENDGAME_BALANCE.assetValueMultipliers.finalGambleWin
      : ENDGAME_BALANCE.assetValueMultipliers.finalGambleLoss),
  );
  const creditsPerToken = won
    ? ENDGAME_BALANCE.tokenCreditsPerOutcome.finalGambleWin
    : ENDGAME_BALANCE.tokenCreditsPerOutcome.finalGambleLoss;
  return {
    assetValue,
    adjustedAssetValue,
    tokens,
    creditsPerToken,
    credits: tokens * creditsPerToken,
    won,
    delta: adjustedAssetValue - assetValue,
  };
}

export function chooseCpuEndgameChoice(
  wealth: number,
  baseValue: number,
  random: () => number = Math.random,
): EndgameChoice {
  const wealthShare = baseValue > 0 ? wealth / baseValue : 0;
  if (baseValue >= 1_000_000 && wealthShare >= 0.55 && random() < 0.62) {
    return 'CASH_OUT';
  }
  return random() < 0.68 ? 'DOUBLE_DOWN' : 'FINAL_GAMBLE';
}