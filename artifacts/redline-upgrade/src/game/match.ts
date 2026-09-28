import { characters } from './characters';
import { createPlayer, type PlayerStat } from './player';
import { getSpace, type BoardSpace } from './board-data';
import { careers, startingWealth, type SalaryTier } from './careers';
import { assetOptions, getAsset, MAX_ASSET_LEVEL, type AssetCategory, type AssetLevel, type AssetSlot } from './assets';
import { assetValueAtLevel, availableUpgradeTokens, chooseRecoveredMilestoneAsset, formatAssetValue, getEligibleRecoveryMilestones, getOwnedUpgradeableAssets } from './upgrade-tokens';
import type { DeckId } from './decks';
import { addNativeStatChange, createPurchaseEvents, resolveEventQueue, type AbilityUsageState, type EventDraft, type ProtectionState } from './event-engine';
import type { EventLogEntry } from './events/types';
import { applySalaryGate } from './movement-events';
import { createCardPiles, discardCardToPiles, drawCardFromPiles, type CardPileMap } from './card-piles';
import { getCard } from './cards';
import {
  calculateEndgameBaseValue,
  cashOutValue,
  chooseCpuEndgameChoice,
  createFinishSnapshot,
  doubleDownValue,
  finalGambleValue,
  getEndgameTokenTier,
  type EndgameChoice,
  type EndgameState,
  type PlayerMatchStatus,
} from './endgame';
import { evaluateEndGameTitle } from './endgame-titles';

export type MatchPlayer = ReturnType<typeof createPlayer> & {
  isCPU: boolean;
  slot: number;
  status: PlayerMatchStatus;
  endgame: EndgameState | null;
};
export type TurnPhase = 'ready' | 'rolling' | 'reveal' | 'moving' | 'decision' | 'landed' | 'endgame' | 'complete';
export interface DiceResult { die1: number; die2: number; total: number; doubles: boolean }
export interface Landing { playerIndex: number; space: BoardSpace }
export interface WealthEvent { id: number; playerIndex: number; amount: number; kind: 'PAYDAY' | 'PURCHASE'; space: number }
export interface RewardModifierState { stat: PlayerStat; amount: number }
export type PendingDecision =
  | { kind: 'ASSET'; slot: AssetSlot; space: number; category?: 'pet' | 'investment'; offeredAssetIds?: string[] }
  | { kind: 'CARD'; deck: DeckId; space: number; cardId: string; stage: 'draw' | 'resolved' }
  | { kind: 'CAREER'; space: number; stage: 'choice' | 'offers' | 'salary'; options?: [string, string]; selectedCareerId?: string; previousCareerId?: string };
export interface Match {
  players: MatchPlayer[];
  turnIndex: number;
  round: number;
  phase: TurnPhase;
  roll: DiceResult | null;
  stepsRemaining: number;
  lastLanding: Landing | null;
  wealthEvents: WealthEvent[];
  pending: PendingDecision | null;
  eventLog: EventLogEntry[];
  eventCursor: number;
  turnCounter: number;
  abilityUsage: Record<string, AbilityUsageState>;
  effectProtections: Record<string, ProtectionState[]>;
  rewardModifiers: Record<string, RewardModifierState>;
  cardPiles: CardPileMap;
}

function assignEndGameTitles(match: Match): Match {
  return {
    ...match,
    players: match.players.map((player) => {
      if (player.endgame?.status !== 'RESOLVED') return player;
      if (player.endgame.endGameTitle && player.endgame.endGameTitleDescription) return player;
      return {
        ...player,
        endgame: {
          ...player.endgame,
          ...evaluateEndGameTitle(player, player.endgame),
        },
      };
    }),
  };
}

function pickUnique<T>(items: readonly T[], count: number): T[] {
  if (items.length < count) throw new Error(`Not enough unique entries to select ${count}`);
  const remaining = [...items];
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }
  return remaining.slice(0, count);
}

function finishPlayersAtLine(match: Match): Match {
  const newlyFinished = match.players.flatMap((player, playerIndex) => {
    // Allow the normal STEP transition to resolve its destination before freezing
    // the player. This keeps finish-space landing events in the same turn.
    if (match.phase === 'moving' && playerIndex === match.turnIndex) return [];
    return player.status === 'ACTIVE' && player.position >= 75 ? [playerIndex] : [];
  });
  if (!newlyFinished.length) return match;

  const drafts: EventDraft[] = [];
  const players = match.players.map((player, playerIndex) => {
    if (!newlyFinished.includes(playerIndex)) return player;
    const snapshot = createFinishSnapshot(player, player.slot, player.isCPU, match.round, match.turnCounter);
    const tokenTier = getEndgameTokenTier(player.heldUpgradeTokens);
    const baseValue = calculateEndgameBaseValue(player);
    drafts.push(
      {
        type: 'FINISH_LINE_REACHED',
        playerIndex,
        spaceNumber: player.position,
        description: `${player.displayName} reached the finish line.`,
      },
      {
        type: 'ENDGAME_STARTED',
        playerIndex,
        baseValue,
        tokenTier,
        description: `${player.displayName} locked a finish value of ${formatAssetValue(baseValue)} and entered the endgame.`,
      },
    );
    return {
      ...player,
      status: 'FINISHED' as const,
      endgame: { status: 'PENDING' as const, snapshot, baseValue, tokenTier },
    };
  });
  const currentPlayerFinished = newlyFinished.includes(match.turnIndex);
  const currentSpace = getSpace(75);
  if (currentPlayerFinished) {
    drafts.push({ type: 'TURN_END', playerIndex: match.turnIndex });
  }
  const nextMatch: Match = {
    ...match,
    players,
    ...(currentPlayerFinished ? {
      phase: 'endgame' as const,
      stepsRemaining: 0,
      pending: null,
      lastLanding: currentSpace ? { playerIndex: match.turnIndex, space: currentSpace } : match.lastLanding,
    } : {}),
  };
  return resolveEventQueue(nextMatch, drafts);
}

function emit(match: Match, drafts: EventDraft[]): Match {
  const resolved = drafts.length ? resolveEventQueue(match, drafts) : match;
  return finishPlayersAtLine(resolved);
}

function resetTurnScopedState(match: Match): Match {
  const rewardModifiers = Object.fromEntries(
    Object.entries(match.rewardModifiers).filter(([, value]) => value.amount !== 0),
  );
  return {
    ...match,
    rewardModifiers,
  };
}

export function createMatch(characterId: string): Match {
  const ids = [characterId, ...pickUnique(characters.map(({ id }) => id).filter(id => id !== characterId), 3)];
  const assignedCareers = pickUnique(careers, 4);
  const match: Match = {
    players: ids.map((id, slot) => {
      const career = assignedCareers[slot];
      const salaryTier = (Math.floor(Math.random() * 4) + 1) as SalaryTier;
      const salaryAmount = career.salaryTiers[salaryTier - 1];
      return {
        ...createPlayer(id, slot === 0 ? 'You' : `CPU ${slot}`),
        careerId: career.id,
        salaryTier,
        salaryAmount,
        wealth: startingWealth(career, salaryAmount),
        aiSkill: 1 + (career.statModifiers.aiSkill ?? 0),
        fame: career.statModifiers.fame ?? 0,
        lifestyle: career.statModifiers.lifestyle ?? 0,
        influence: career.statModifiers.influence ?? 0,
        isCPU: slot !== 0,
        slot,
        status: 'ACTIVE' as const,
        endgame: null,
      };
    }),
    turnIndex: 0,
    round: 1,
    phase: 'ready',
    roll: null,
    stepsRemaining: 0,
    lastLanding: null,
    wealthEvents: [],
    pending: null,
    eventLog: [],
    eventCursor: 0,
    turnCounter: 1,
    abilityUsage: {},
    effectProtections: {},
    rewardModifiers: {},
    cardPiles: createCardPiles(),
  };
  const startingTokenEvents = match.players.flatMap((player, playerIndex) => {
    const career = careers.find((item) => item.id === player.careerId);
    const amount = career?.startingUpgradeTokens ?? 0;
    return amount > 0 ? [{
      type: 'UPGRADE_TOKEN_GAINED' as const,
      playerIndex,
      delta: amount,
      reason: `${career?.name} starting benefit`,
      description: `${player.displayName} gained ${amount} Upgrade Token from the ${career?.name} starting benefit.`,
    }] : [];
  });
  return emit(match, [...startingTokenEvents, { type: 'TURN_START', playerIndex: 0 }]);
}

export function rollD4(): number {
  return Math.floor(Math.random() * 4) + 1;
}

export type MatchAction =
  | { type: 'ROLL'; result: DiceResult }
  | { type: 'REVEAL' }
  | { type: 'MOVE' }
  | { type: 'STEP' }
  | { type: 'CHOOSE_ASSET_CATEGORY'; category: 'pet' | 'investment' }
  | { type: 'BUY_ASSET'; assetId: string }
  | { type: 'UPGRADE_ASSET'; assetId: string }
  | { type: 'RECOVER_MILESTONE' }
  | { type: 'HOLD_UPGRADE_TOKEN' }
  | { type: 'SKIP_ASSET' }
  | { type: 'KEEP_CAREER' }
  | { type: 'SWITCH_CAREER' }
  | { type: 'SELECT_CAREER'; careerId: string }
  | { type: 'ACKNOWLEDGE_CAREER' }
  | { type: 'RESOLVE_CARD' }
  | { type: 'ACKNOWLEDGE_CARD' }
  | { type: 'AUTO_DECIDE' }
  | { type: 'CHOOSE_ENDGAME'; choice: EndgameChoice }
  | { type: 'NEXT_TURN' };

function milestoneSlot(space: number): AssetSlot | null {
  switch (space) {
    case 10: return 'car';
    case 30: return 'lifestyle';
    case 45: return 'companion';
    case 60: return 'property';
    default: return null;
  }
}

function milestoneType(space: number): 'car' | 'lifestyle' | 'companion' | 'property' | null {
  switch (space) {
    case 10: return 'car';
    case 30: return 'lifestyle';
    case 45: return 'companion';
    case 60: return 'property';
    default: return null;
  }
}

function drawAssets(category: AssetCategory): string[] {
  return pickUnique(assetOptions(category), 3).map(asset => asset.id);
}

function land(match: Match, space: BoardSpace, previousPosition: number): Match {
  const slot = space.type === 'MILESTONE' ? milestoneSlot(space.number) : null;
  const landing = { playerIndex: match.turnIndex, space };
  const drafts: EventDraft[] = [{ type: 'LAND_ON_SPACE', playerIndex: match.turnIndex, previousPosition, newPosition: space.number, spaceNumber: space.number }];
  if (space.type === 'UPGRADE_TOKEN') {
    drafts.push({
      type: 'UPGRADE_TOKEN_GAINED',
      playerIndex: match.turnIndex,
      delta: 1,
      spaceNumber: space.number,
      reason: 'Upgrade Token board space',
      description: `${match.players[match.turnIndex].displayName} gained 1 Upgrade Token at space ${space.number}.`,
    });
  }
  const occupants = match.players.filter((player, index) => index !== match.turnIndex && player.position === space.number);
  for (const occupant of occupants) {
    drafts.push({
      type: 'LAND_ON_PLAYER',
      playerIndex: match.turnIndex,
      targetPlayerId: occupant.playerId,
      targetPlayerIndex: occupant.slot,
      targetPosition: occupant.position,
      previousPosition,
      newPosition: space.number,
      spaceNumber: space.number,
    });
  }
  const milestone = milestoneType(space.number);
  if (space.type === 'MILESTONE' && milestone && space.trigger === 'LAND') {
    drafts.push({ type: 'MILESTONE', playerIndex: match.turnIndex, spaceNumber: space.number, milestoneType: milestone });
  }
  if (space.effectId && space.trigger === 'LAND') {
    drafts.push({
      type: 'BOARD_EFFECT_RESOLVED',
      playerIndex: match.turnIndex,
      total: match.roll?.total,
      spaceNumber: space.number,
      effectId: space.effectId,
    });
  }
  if (slot && !match.players[match.turnIndex].equipment[slot]) {
    return emit({ ...match, phase: 'decision', stepsRemaining: 0, lastLanding: landing, pending: { kind: 'ASSET', slot, space: space.number, offeredAssetIds: slot === 'companion' ? undefined : drawAssets(slot) } }, drafts);
  }
  if (space.deck) {
    const draw = drawCardFromPiles(match.cardPiles, space.deck);
    drafts.push({ type: 'CARD_DRAW', playerIndex: match.turnIndex, spaceNumber: space.number, deck: space.deck, cardId: draw.cardId });
    return emit({
      ...match,
      cardPiles: draw.cardPiles,
      phase: 'decision',
      stepsRemaining: 0,
      lastLanding: landing,
      pending: { kind: 'CARD', deck: space.deck, space: space.number, cardId: draw.cardId, stage: 'draw' },
    }, drafts);
  }
  return emit({ ...match, phase: 'landed', stepsRemaining: 0, lastLanding: landing, pending: null }, drafts);
}

function resume(match: Match): Match {
  const current = match.players[match.turnIndex];
  if (match.stepsRemaining > 0 && current.position < 75) return { ...match, phase: 'moving', pending: null };
  const space = getSpace(current.position);
  if (!space) throw new Error('Missing decision space');
  return { ...match, phase: 'landed', stepsRemaining: 0, lastLanding: { playerIndex: match.turnIndex, space }, pending: null };
}

function careerOffers(currentId: string): [string, string] {
  const other = pickUnique(careers.filter(career => career.id !== currentId), 2);
  return [other[0].id, other[1].id];
}

function assignNewCareer(match: Match, careerId: string): Match {
  const current = match.players[match.turnIndex];
  const career = careers.find(item => item.id === careerId);
  if (!career || careerId === current.careerId) return match;
  const salaryTier = (Math.floor(Math.random() * 4) + 1) as SalaryTier;
  const players = match.players.map((player, index) => index === match.turnIndex
    ? { ...player, careerId, salaryTier, salaryAmount: career.salaryTiers[salaryTier - 1] }
    : player);
  return { ...match, players };
}

function applyAssetStats(match: Match, playerIndex: number, assetId: string, chargeCost = true): [Match, EventDraft[]] {
  const asset = getAsset(assetId);
  if (!asset) return [match, []];
  const player = match.players[playerIndex];
  const next = {
    ...player,
    equipment: { ...player.equipment },
    assetLevels: { ...player.assetLevels, [asset.id]: 1 as AssetLevel },
  };
  const drafts: EventDraft[] = [];
  next.equipment[(asset.category === 'pet' || asset.category === 'investment') ? 'companion' : asset.category] = asset.id;
  const nextWealth = Math.max(0, player.wealth - (chargeCost ? asset.cost : 0) + (asset.effects.wealth ?? 0));
  next.wealth = nextWealth;
  addNativeStatChange(match, drafts, playerIndex, 'wealth', player.wealth, nextWealth, `Purchased ${asset.name}`);
  for (const stat of ['aiSkill', 'fame', 'lifestyle', 'influence'] as const) {
    const delta = asset.effects[stat] ?? 0;
    next[stat] = player[stat] + delta;
    addNativeStatChange(match, drafts, playerIndex, stat, player[stat], next[stat], `Purchased ${asset.name}`);
  }
  const updated = {
    ...match,
    players: match.players.map((item, index) => index === playerIndex ? next : item),
  };
  return [updated, drafts];
}

function purchase(match: Match, assetId: string): Match {
  const pending = match.pending;
  if (match.phase !== 'decision' || pending?.kind !== 'ASSET') return match;
  const asset = getAsset(assetId);
  const player = match.players[match.turnIndex];
  const category: AssetCategory | null = pending.slot === 'companion' ? pending.category ?? null : pending.slot;
  if (!asset || asset.category !== category || !pending.offeredAssetIds?.includes(assetId) || player.equipment[pending.slot] || asset.cost > player.wealth) return match;
  const [updated, statDrafts] = applyAssetStats(match, match.turnIndex, assetId);
  const current = match.players[match.turnIndex];
  const nextPlayer = updated.players[match.turnIndex];
  const wealthEvent: WealthEvent = { id: (match.wealthEvents.at(-1)?.id ?? 0) + 1, playerIndex: match.turnIndex, amount: nextPlayer.wealth - current.wealth, kind: 'PURCHASE', space: pending.space };
  const drafts = [
    ...createPurchaseEvents(match.turnIndex, assetId, current.wealth, nextPlayer.wealth),
    ...statDrafts,
  ];
  return emit(resume({ ...updated, wealthEvents: [...match.wealthEvents, wealthEvent] }), drafts);
}

function applyAssetLevelEffects(match: Match, playerIndex: number, assetId: string, level: AssetLevel): [Match, EventDraft[]] {
  const asset = getAsset(assetId);
  if (!asset) return [match, []];
  const player = match.players[playerIndex];
  const next = { ...player, assetLevels: { ...player.assetLevels, [assetId]: level } };
  const drafts: EventDraft[] = [];
  for (const stat of ['wealth', 'aiSkill', 'fame', 'lifestyle', 'influence'] as const) {
    const delta = asset.effects[stat] ?? 0;
    const previousValue = player[stat];
    const newValue = stat === 'wealth' ? Math.max(0, previousValue + delta) : previousValue + delta;
    next[stat] = newValue;
    addNativeStatChange(match, drafts, playerIndex, stat, previousValue, newValue, `Upgraded ${asset.name} to Level ${level}`);
  }
  return [{
    ...match,
    players: match.players.map((item, index) => index === playerIndex ? next : item),
  }, drafts];
}

function upgradeOwnedAsset(match: Match, assetId: string): Match {
  if (match.phase !== 'ready') return match;
  const player = match.players[match.turnIndex];
  if (availableUpgradeTokens(player) < 1 || !getOwnedUpgradeableAssets(player).some((asset) => asset.id === assetId)) return match;
  const asset = getAsset(assetId);
  if (!asset) return match;
  const previousLevel = player.assetLevels[assetId] ?? 1;
  if (previousLevel >= MAX_ASSET_LEVEL) return match;
  const level = (previousLevel + 1) as AssetLevel;
  const [updated, statDrafts] = applyAssetLevelEffects(match, match.turnIndex, assetId, level);
  const nextPlayer = {
    ...updated.players[match.turnIndex],
    upgradeTokens: player.upgradeTokens - 1,
  };
  const valueBefore = assetValueAtLevel(asset, previousLevel);
  const valueAfter = assetValueAtLevel(asset, level);
  return emit({
    ...updated,
    players: updated.players.map((item, index) => index === match.turnIndex ? nextPlayer : item),
  }, [
    {
      type: 'UPGRADE_TOKEN_SPENT',
      playerIndex: match.turnIndex,
      delta: -1,
      assetId,
      assetName: asset.name,
      assetLevel: level,
      reason: 'Upgrade owned asset',
      description: `${player.displayName} spent 1 Upgrade Token to upgrade ${asset.name} to Level ${level}.`,
    },
    {
      type: 'ASSET_UPGRADED',
      playerIndex: match.turnIndex,
      assetId,
      assetName: asset.name,
      assetLevel: level,
      category: asset.category,
      delta: valueAfter - valueBefore,
      description: `${asset.name} reached Level ${level}; its asset value increased to ${formatAssetValue(valueAfter)} and its listed effects increased by one base set.`,
    },
    ...statDrafts,
  ]);
}

function recoverMissedMilestone(match: Match, random: () => number = Math.random): Match {
  if (match.phase !== 'ready') return match;
  const player = match.players[match.turnIndex];
  if (availableUpgradeTokens(player) < 1 || !getEligibleRecoveryMilestones(player).length) return match;
  const recovery = chooseRecoveredMilestoneAsset(player, random);
  if (!recovery) return match;
  const [updated, statDrafts] = applyAssetStats(match, match.turnIndex, recovery.asset.id, false);
  const nextPlayer = { ...updated.players[match.turnIndex], upgradeTokens: player.upgradeTokens - 1 };
  const milestoneType = recovery.milestone.slot;
  return emit({
    ...updated,
    players: updated.players.map((item, index) => index === match.turnIndex ? nextPlayer : item),
  }, [
    {
      type: 'UPGRADE_TOKEN_SPENT',
      playerIndex: match.turnIndex,
      delta: -1,
      assetId: recovery.asset.id,
      assetName: recovery.asset.name,
      reason: 'Recover missed milestone',
      description: `${player.displayName} spent 1 Upgrade Token to recover a missed milestone asset.`,
    },
    {
      type: 'MILESTONE_RECOVERED',
      playerIndex: match.turnIndex,
      spaceNumber: recovery.milestone.space,
      milestoneType,
      assetId: recovery.asset.id,
      assetName: recovery.asset.name,
      category: recovery.category,
      assetLevel: 1,
      description: `${player.displayName} randomly recovered ${recovery.asset.name} (${recovery.category}) from the missed milestone at space ${recovery.milestone.space}.`,
    },
    ...statDrafts,
  ]);
}

function holdUpgradeToken(match: Match): Match {
  if (match.phase !== 'ready') return match;
  const player = match.players[match.turnIndex];
  if (availableUpgradeTokens(player) < 1) return match;
  const nextPlayer = { ...player, heldUpgradeTokens: player.heldUpgradeTokens + 1 };
  return emit({
    ...match,
    players: match.players.map((item, index) => index === match.turnIndex ? nextPlayer : item),
  }, [{
    type: 'UPGRADE_TOKEN_HELD',
    playerIndex: match.turnIndex,
    delta: 1,
    description: `${player.displayName} reserved 1 Upgrade Token for the future endgame.`,
  }]);
}

function autoUseUpgradeToken(match: Match): Match {
  if (match.phase !== 'ready') return match;
  const player = match.players[match.turnIndex];
  if (player.status !== 'ACTIVE' || !player.isCPU || availableUpgradeTokens(player) < 1) return match;
  const upgradeable = getOwnedUpgradeableAssets(player);
  const recoverable = getEligibleRecoveryMilestones(player);
  const decision = Math.random();
  if (recoverable.length && (!upgradeable.length || decision < 0.48)) return recoverMissedMilestone(match);
  if (upgradeable.length && decision < 0.86) {
    const chosen = upgradeable.sort((a, b) =>
      assetValueAtLevel(b, (player.assetLevels[b.id] ?? 1) + 1)
      - assetValueAtLevel(a, (player.assetLevels[a.id] ?? 1) + 1),
    )[0];
    return upgradeOwnedAsset(match, chosen.id);
  }
  return holdUpgradeToken(match);
}

function resolveCardDecision(match: Match): Match {
  if (match.phase !== 'decision' || match.pending?.kind !== 'CARD' || match.pending.stage !== 'draw') return match;
  const { deck, space, cardId } = match.pending;
  const card = getCard(cardId);
  if (!card || card.deck !== deck) throw new Error(`Invalid pending card ${cardId} for ${deck}`);
  const resolved = {
    ...match,
    cardPiles: discardCardToPiles(match.cardPiles, deck, cardId),
    pending: { ...match.pending, stage: 'resolved' as const },
  };
  return emit(resolved, [{
    type: 'CARD_RESOLVED',
    playerIndex: match.turnIndex,
    deck,
    spaceNumber: space,
    cardId,
    description: `${card.title}: ${card.effect}`,
  }]);
}

function acknowledgeCardDecision(match: Match): Match {
  if (match.phase !== 'decision' || match.pending?.kind !== 'CARD' || match.pending.stage !== 'resolved') return match;
  return resume(match);
}

function resolvedEndgamePlayer(
  match: Match,
  playerIndex: number,
  endgame: EndgameState,
): Match {
  return {
    ...match,
    turnIndex: playerIndex,
    phase: 'landed',
    stepsRemaining: 0,
    pending: null,
    players: match.players.map((player, index) =>
      index === playerIndex ? { ...player, status: 'FINISHED', endgame } : player,
    ),
  };
}

function resolveEndgameChoice(match: Match, choice: EndgameChoice): Match {
  if (match.phase !== 'endgame') return match;
  const playerIndex = match.turnIndex;
  const player = match.players[playerIndex];
  const endgame = player?.endgame;
  if (!player || player.status !== 'FINISHED' || endgame?.status !== 'PENDING') return match;

  const selected = emit(match, [{
    type: 'ENDGAME_CHOICE_SELECTED',
    playerIndex,
    endgameChoice: choice,
    baseValue: endgame.baseValue,
    tokenTier: endgame.tokenTier,
    description: `${player.displayName} selected ${choice.replaceAll('_', ' ')}.`,
  }]);
  const selectedPlayer = selected.players[playerIndex];
  const selectedEndgame = selectedPlayer.endgame ?? endgame;

  if (choice === 'CASH_OUT') {
    const outcome = cashOutValue(selectedEndgame.baseValue, selectedEndgame.tokenTier);
    const completed = resolvedEndgamePlayer(selected, playerIndex, {
      ...selectedEndgame,
      status: 'RESOLVED',
      choice,
      multiplier: outcome.multiplier,
      finalGameValue: outcome.finalGameValue,
    });
    return emit(completed, [
      {
        type: 'CASH_OUT_RESOLVED',
        playerIndex,
        endgameChoice: choice,
        baseValue: selectedEndgame.baseValue,
        finalGameValue: outcome.finalGameValue,
        multiplier: outcome.multiplier,
        tokenTier: selectedEndgame.tokenTier,
        description: `${player.displayName} cashed out at ${outcome.multiplier}× for ${formatAssetValue(outcome.finalGameValue)}.`,
      },
      {
        type: 'ENDGAME_COMPLETED',
        playerIndex,
        endgameChoice: choice,
        baseValue: selectedEndgame.baseValue,
        finalGameValue: outcome.finalGameValue,
        tokenTier: selectedEndgame.tokenTier,
      },
    ]);
  }

  if (choice === 'DOUBLE_DOWN') {
    const dice = { die1: rollD4(), die2: rollD4() };
    const total = dice.die1 + dice.die2;
    const roll = { ...dice, total, doubles: dice.die1 === dice.die2 };
    const outcome = doubleDownValue(selectedEndgame.baseValue, total, selectedEndgame.tokenTier);
    const completed = resolvedEndgamePlayer({ ...selected, roll }, playerIndex, {
      ...selectedEndgame,
      status: 'RESOLVED',
      choice,
      dice: roll,
      effectiveRoll: outcome.effectiveRoll,
      multiplier: outcome.multiplier,
      finalGameValue: outcome.finalGameValue,
    });
    return emit(completed, [
      {
        type: 'DOUBLE_DOWN_RESOLVED',
        playerIndex,
        endgameChoice: choice,
        die1: roll.die1,
        die2: roll.die2,
        total: roll.total,
        doubles: roll.doubles,
        baseValue: selectedEndgame.baseValue,
        finalGameValue: outcome.finalGameValue,
        multiplier: outcome.multiplier,
        tokenTier: selectedEndgame.tokenTier,
        effectiveRoll: outcome.effectiveRoll,
        description: `${player.displayName} rolled ${roll.die1}-${roll.die2}; held tokens raised the outcome to ${outcome.effectiveRoll} for ${outcome.multiplier}×.`,
      },
      {
        type: 'ENDGAME_COMPLETED',
        playerIndex,
        endgameChoice: choice,
        baseValue: selectedEndgame.baseValue,
        finalGameValue: outcome.finalGameValue,
        tokenTier: selectedEndgame.tokenTier,
      },
    ]);
  }

  const draw = drawCardFromPiles(selected.cardPiles, 'gamble');
  const card = getCard(draw.cardId);
  if (!card || card.deck !== 'gamble') throw new Error(`Invalid Final Gamble card ${draw.cardId}`);
  let gambled = emit({ ...selected, cardPiles: draw.cardPiles }, [{
    type: 'CARD_DRAW',
    playerIndex,
    spaceNumber: 75,
    deck: 'gamble',
    cardId: draw.cardId,
    description: `${player.displayName} drew ${card.title} for Final Gamble.`,
  }]);
  gambled = {
    ...gambled,
    cardPiles: discardCardToPiles(gambled.cardPiles, 'gamble', draw.cardId),
  };
  gambled = emit(gambled, [{
    type: 'CARD_RESOLVED',
    playerIndex,
    deck: 'gamble',
    spaceNumber: 75,
    cardId: draw.cardId,
    description: `${card.title}: ${card.effect}`,
  }]);
  const finalPlayer = gambled.players[playerIndex];
  const rawDelta = calculateEndgameBaseValue(finalPlayer) - selectedEndgame.baseValue;
  const outcome = finalGambleValue(selectedEndgame.baseValue, rawDelta, selectedEndgame.tokenTier);
  const completed = resolvedEndgamePlayer(gambled, playerIndex, {
    ...selectedEndgame,
    status: 'RESOLVED',
    choice,
    gambleCardId: draw.cardId,
    gambleRawDelta: rawDelta,
    gambleAdjustedDelta: outcome.adjustedDelta,
    multiplier: outcome.multiplier,
    finalGameValue: outcome.finalGameValue,
  });
  return emit(completed, [
    {
      type: 'FINAL_GAMBLE_RESOLVED',
      playerIndex,
      endgameChoice: choice,
      deck: 'gamble',
      cardId: draw.cardId,
      baseValue: selectedEndgame.baseValue,
      finalGameValue: outcome.finalGameValue,
      delta: outcome.adjustedDelta,
      multiplier: outcome.multiplier,
      tokenTier: selectedEndgame.tokenTier,
      description: `${player.displayName} resolved ${card.title}: ${outcome.adjustedDelta >= 0 ? '+' : ''}${formatAssetValue(outcome.adjustedDelta)} adjusted value.`,
    },
    {
      type: 'ENDGAME_COMPLETED',
      playerIndex,
      endgameChoice: choice,
      baseValue: selectedEndgame.baseValue,
      finalGameValue: outcome.finalGameValue,
      tokenTier: selectedEndgame.tokenTier,
    },
  ]);
}

function autoDecide(match: Match): Match {
  const pending = match.pending;
  const player = match.players[match.turnIndex];
  if (!player?.isCPU) return match;
  if (match.phase === 'endgame' && player.endgame?.status === 'PENDING') {
    const choice = chooseCpuEndgameChoice(
      player.wealth,
      player.endgame.baseValue,
      player.endgame.tokenTier,
    );
    return resolveEndgameChoice(match, choice);
  }
  if (match.phase !== 'decision' || !pending) return match;
  if (pending.kind === 'CARD') return acknowledgeCardDecision(resolveCardDecision(match));
  if (pending.kind === 'ASSET') {
    const categories: AssetCategory[] = pending.slot === 'companion'
      ? (player.careerId === 'degen-trader' || player.careerId === 'real-estate-investor' ? ['investment'] : ['pet'])
      : [pending.slot];
    const offers = pending.offeredAssetIds ?? drawAssets(categories[0]);
    const available = offers.map(id => getAsset(id)).filter((asset): asset is NonNullable<typeof asset> => !!asset)
      .filter(asset => asset.cost <= player.wealth);
    if (!available.length) return resume(match);
    const score = (asset: (typeof available)[number]) =>
      (asset.effects.fame ?? 0) * (['influencer', 'content-creator', 'entertainer'].includes(player.careerId ?? '') ? 3 : 1)
      + (asset.effects.aiSkill ?? 0) * (['ai-engineer', 'cybersecurity-specialist'].includes(player.careerId ?? '') ? 3 : 1)
      + (asset.effects.lifestyle ?? 0) * (player.careerId === 'personal-trainer' ? 2 : 1)
      + (asset.effects.influence ?? 0)
      + (asset.category === 'car' && player.careerId === 'race-driver' ? 25 : 0)
      + (asset.category === 'property' && player.careerId === 'real-estate-investor' ? 25 : 0)
      + (asset.category === 'investment' && ['real-estate-investor', 'degen-trader'].includes(player.careerId ?? '') ? 30 : 0)
      + Math.random() * 8;
    const chosen = available.map(asset => ({ asset, weight: score(asset) }))
      .sort((a, b) => b.weight - a.weight)[0].asset;
    return purchase({ ...match, pending: { ...pending, offeredAssetIds: offers, category: chosen.category === 'pet' || chosen.category === 'investment' ? chosen.category : undefined } }, chosen.id);
  }
  if (Math.random() > 0.42) return resume(match);
  const options = careerOffers(player.careerId ?? '');
  const chosen = options.map(id => careers.find(career => career.id === id)!)
    .sort((a, b) => (b.salaryTiers[1] + Math.random() * 80000) - (a.salaryTiers[1] + Math.random() * 80000))[0];
  return resume(assignNewCareer(match, chosen.id));
}

function createStepEvents(match: Match, previousPosition: number, position: number, isFinalStep: boolean, salaryAmount: number, hitPayday: boolean): EventDraft[] {
  const drafts: EventDraft[] = [{
    type: 'PASS_SPACE',
    playerIndex: match.turnIndex,
    previousPosition,
    newPosition: position,
    spaceNumber: position,
  }];
  const space = getSpace(position);
  if (!space) return drafts;
  if (hitPayday) {
    drafts.push({
      type: 'SALARY_GATE',
      playerIndex: match.turnIndex,
      previousPosition,
      newPosition: position,
      spaceNumber: position,
      salaryAmount,
      previousWealth: match.players[match.turnIndex].wealth,
      newWealth: match.players[match.turnIndex].wealth + salaryAmount,
    });
  }
  if (space.type === 'CAREER_CHANGE') {
    drafts.push({
      type: 'CAREER_CHANGE',
      playerIndex: match.turnIndex,
      spaceNumber: position,
      stage: 'TRIGGERED',
      previousCareerId: match.players[match.turnIndex].careerId,
      newCareerId: match.players[match.turnIndex].careerId,
      previousSalary: match.players[match.turnIndex].salaryAmount,
      newSalary: match.players[match.turnIndex].salaryAmount,
    });
  }
  const occupants = match.players.filter((player, index) => index !== match.turnIndex && player.position === position);
  if (!isFinalStep) {
    for (const occupant of occupants) {
      drafts.push({
        type: 'PASS_PLAYER',
        playerIndex: match.turnIndex,
        previousPosition,
        newPosition: position,
        spaceNumber: position,
        targetPlayerId: occupant.playerId,
        targetPlayerIndex: occupant.slot,
        targetPosition: occupant.position,
      });
    }
  }
  return drafts;
}

/** Guard each transition so stale timers and repeated clicks cannot reapply an effect. */
export function advanceMatch(match: Match, action: MatchAction): Match {
  switch (action.type) {
    case 'ROLL': {
      if (match.phase !== 'ready' || match.players[match.turnIndex]?.status !== 'ACTIVE') return match;
      const { die1, die2, total, doubles } = action.result;
      if (![die1, die2].every((n) => Number.isInteger(n) && n >= 1 && n <= 4) || total !== die1 + die2) {
        throw new Error('Invalid 2d4 roll');
      }
      return emit(
        { ...match, phase: 'rolling', roll: { die1, die2, total, doubles }, stepsRemaining: total },
        [{ type: 'DICE_ROLL', playerIndex: match.turnIndex, die1, die2, total, doubles }],
      );
    }
    case 'REVEAL':
      return match.phase === 'rolling' ? { ...match, phase: 'reveal' } : match;
    case 'MOVE': {
      if (match.phase !== 'reveal' || match.players[match.turnIndex]?.status !== 'ACTIVE') return match;
      if (match.players[match.turnIndex].position < 75) return { ...match, phase: 'moving' };
      const space = getSpace(75);
      if (!space) throw new Error('Missing finish space');
      return land(match, space, 75);
    }
    case 'STEP': {
      if (match.phase !== 'moving' || match.players[match.turnIndex]?.status !== 'ACTIVE') return match;
      const current = match.players[match.turnIndex];
      const previousPosition = current.position;
      const position = Math.min(75, current.position + 1);
      const space = getSpace(position);
      if (!space) throw new Error(`Invalid movement position: ${position}`);
      let moved: Match = {
        ...match,
        players: match.players.map((player, index) => index === match.turnIndex
          ? { ...player, position }
          : player),
        wealthEvents: match.wealthEvents,
        stepsRemaining: match.stepsRemaining - 1,
      };
      const salaryGate = applySalaryGate(moved, match.turnIndex, previousPosition, position);
      moved = {
        ...salaryGate.match,
        wealthEvents: salaryGate.drafts.length
          ? [...match.wealthEvents, { id: (match.wealthEvents.at(-1)?.id ?? 0) + 1, playerIndex: match.turnIndex, amount: current.salaryAmount, kind: 'PAYDAY', space: position }]
          : match.wealthEvents,
      };
      const drafts = createStepEvents(moved, previousPosition, position, moved.stepsRemaining <= 0, current.salaryAmount, salaryGate.drafts.length > 0);
      drafts.unshift({ type: 'PLAYER_MOVED', playerIndex: match.turnIndex, previousPosition, newPosition: position, distance: 1 });
      moved = emit(moved, [...salaryGate.drafts, ...drafts]);
      if (moved.phase !== 'moving') return moved;
      const currentAfterMove = moved.players[moved.turnIndex];
      const resolvedSpace = getSpace(currentAfterMove.position);
      if (!resolvedSpace) throw new Error(`Invalid movement position: ${currentAfterMove.position}`);
      if (resolvedSpace.type === 'CAREER_CHANGE') {
        return { ...moved, phase: 'decision', pending: { kind: 'CAREER', stage: 'choice', space: resolvedSpace.number }, lastLanding: moved.stepsRemaining <= 0 ? { playerIndex: match.turnIndex, space: resolvedSpace } : moved.lastLanding };
      }
      if (moved.stepsRemaining > 0 && currentAfterMove.position < 75) return moved;
      return land(moved, resolvedSpace, previousPosition);
    }
    case 'CHOOSE_ASSET_CATEGORY':
      return match.phase === 'decision' && match.pending?.kind === 'ASSET' && match.pending.slot === 'companion' && !match.pending.category
        ? { ...match, pending: { ...match.pending, category: action.category, offeredAssetIds: drawAssets(action.category) } } : match;
    case 'BUY_ASSET':
      return purchase(match, action.assetId);
    case 'UPGRADE_ASSET':
      return upgradeOwnedAsset(match, action.assetId);
    case 'RECOVER_MILESTONE':
      return recoverMissedMilestone(match);
    case 'HOLD_UPGRADE_TOKEN':
      return holdUpgradeToken(match);
    case 'SKIP_ASSET':
      return match.phase === 'decision' && match.pending?.kind === 'ASSET' ? resume(match) : match;
    case 'KEEP_CAREER':
      return match.phase === 'decision' && match.pending?.kind === 'CAREER' && match.pending.stage === 'choice' ? resume(match) : match;
    case 'SWITCH_CAREER': {
      if (match.phase !== 'decision' || match.pending?.kind !== 'CAREER' || match.pending.stage !== 'choice') return match;
      return { ...match, pending: { ...match.pending, stage: 'offers', options: careerOffers(match.players[match.turnIndex].careerId ?? '') } };
    }
    case 'SELECT_CAREER': {
      const pending = match.pending;
      if (match.phase !== 'decision' || pending?.kind !== 'CAREER' || pending.stage !== 'offers' || !pending.options?.includes(action.careerId)) return match;
      const previous = match.players[match.turnIndex];
      const updated = assignNewCareer(match, action.careerId);
      const next = updated.players[updated.turnIndex];
      return emit(
        { ...updated, pending: { ...pending, stage: 'salary', selectedCareerId: action.careerId, previousCareerId: previous.careerId ?? undefined } },
        [{
          type: 'CAREER_CHANGE',
          playerIndex: updated.turnIndex,
          spaceNumber: pending.space,
          stage: 'RESOLVED',
          previousCareerId: previous.careerId,
          newCareerId: next.careerId,
          previousSalary: previous.salaryAmount,
          newSalary: next.salaryAmount,
        }],
      );
    }
    case 'ACKNOWLEDGE_CAREER':
      return match.phase === 'decision' && match.pending?.kind === 'CAREER' && match.pending.stage === 'salary' ? resume(match) : match;
    case 'RESOLVE_CARD':
      if (match.phase !== 'decision' || match.pending?.kind !== 'CARD' || match.players[match.turnIndex].isCPU) return match;
      return resolveCardDecision(match);
    case 'ACKNOWLEDGE_CARD':
      if (match.players[match.turnIndex]?.isCPU) return match;
      return acknowledgeCardDecision(match);
    case 'AUTO_DECIDE':
      return autoDecide(match);
    case 'CHOOSE_ENDGAME':
      if (match.players[match.turnIndex]?.isCPU) return match;
      return resolveEndgameChoice(match, action.choice);
    case 'NEXT_TURN': {
      if (match.phase !== 'landed') return match;
      const currentPlayer = match.players[match.turnIndex];
      const normalTurnEnded = currentPlayer.status === 'ACTIVE';
      const finishedPlayerTurnEnded = currentPlayer.status === 'FINISHED'
        && currentPlayer.endgame?.snapshot.capturedTurnCounter === match.turnCounter;
      const turnEnded = normalTurnEnded || finishedPlayerTurnEnded;
      const nextTurnCounter = match.turnCounter + (turnEnded ? 1 : 0);
      const endedTurn = emit(
        resetTurnScopedState(match),
        normalTurnEnded ? [{ type: 'TURN_END', playerIndex: match.turnIndex }] : [],
      );
      const playerCount = endedTurn.players.length;
      let nextIndex = -1;
      let nextIsEndgame = false;
      for (let offset = 1; offset <= playerCount; offset += 1) {
        const candidateIndex = (endedTurn.turnIndex + offset) % playerCount;
        const candidate = endedTurn.players[candidateIndex];
        if (candidate.endgame?.status === 'PENDING') {
          nextIndex = candidateIndex;
          nextIsEndgame = true;
          break;
        }
        if (candidate.status === 'ACTIVE') {
          nextIndex = candidateIndex;
          break;
        }
      }
      if (nextIndex < 0) {
        return assignEndGameTitles({
          ...endedTurn,
          turnCounter: nextTurnCounter,
          phase: 'complete',
          roll: null,
          stepsRemaining: 0,
          pending: null,
        });
      }
      const nextRound = nextIndex <= endedTurn.turnIndex ? endedTurn.round + 1 : endedTurn.round;
      const withUpdatedClock = { ...endedTurn, round: nextRound, turnCounter: nextTurnCounter };
      if (nextIsEndgame) {
        return {
          ...withUpdatedClock,
          turnIndex: nextIndex,
          phase: 'endgame',
          roll: null,
          stepsRemaining: 0,
          pending: null,
        };
      }
      return autoUseUpgradeToken(emit({
        ...withUpdatedClock,
        turnIndex: nextIndex,
        phase: 'ready',
        roll: null,
        stepsRemaining: 0,
        pending: null,
      }, [{ type: 'TURN_START', playerIndex: nextIndex }]));
    }
  }
}
