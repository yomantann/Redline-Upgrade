import { characters } from './characters';
import { createPlayer, effectiveSalaryAmount, type PlayerStat } from './player';
import { getSpace, type BoardSpace } from './board-data';
import { careers, FINISH_ORDER_WEALTH_REWARDS, startingWealth, type SalaryTier } from './careers';
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
  resolveFinalGambleStake,
  type EndgameChoice,
  type EndgameState,
  type PlayerMatchStatus,
} from './endgame';
import { evaluateEndGameTitle } from './endgame-titles';
import { careerAcquisitionTokenCount, swapCareerPackages } from './career-package';
import { DEFAULT_BOARD_ID, getBoardDefinition, type BoardId, type GameMode } from './boards';

export type MatchPlayer = ReturnType<typeof createPlayer> & {
  isCPU: boolean;
  role: 'HOST' | 'PLAYER' | 'CPU';
  slot: number;
  status: PlayerMatchStatus;
  endgame: EndgameState | null;
};
export type EndgameAttribute = 'aiSkill' | 'fame' | 'lifestyle' | 'influence';
export interface EndgameAttributeBonus {
  attribute: EndgameAttribute;
  label: 'AI SKILL' | 'FAME' | 'LIFESTYLE' | 'INFLUENCE';
  playerIndex: number;
  value: number;
  amount: 50_000;
}

const ENDGAME_ATTRIBUTES: readonly { attribute: EndgameAttribute; label: EndgameAttributeBonus['label'] }[] = [
  { attribute: 'aiSkill', label: 'AI SKILL' },
  { attribute: 'fame', label: 'FAME' },
  { attribute: 'lifestyle', label: 'LIFESTYLE' },
  { attribute: 'influence', label: 'INFLUENCE' },
];

export function calculateEndgameAttributeBonuses(
  players: readonly MatchPlayer[],
  finishOrder: readonly number[],
): EndgameAttributeBonus[] {
  return ENDGAME_ATTRIBUTES.map(({ attribute, label }) => {
    const highest = Math.max(...players.map((player) => player[attribute]));
    const leaders = players
      .map((player, playerIndex) => ({ playerIndex, value: player[attribute] }))
      .filter((candidate) => candidate.value === highest)
      // Ties go to the earlier finisher; player-array order is the deterministic fallback.
      .sort((a, b) => {
        const aRank = finishOrder.indexOf(a.playerIndex);
        const bRank = finishOrder.indexOf(b.playerIndex);
        const rankDifference = (aRank < 0 ? Number.MAX_SAFE_INTEGER : aRank)
          - (bRank < 0 ? Number.MAX_SAFE_INTEGER : bRank);
        return rankDifference || a.playerIndex - b.playerIndex;
      });
    const winner = leaders[0];
    return {
      attribute,
      label,
      playerIndex: winner.playerIndex,
      value: highest,
      amount: 50_000,
    };
  });
}
export type TurnPhase = 'ready' | 'rolling' | 'reveal' | 'moving' | 'decision' | 'landed' | 'endgame' | 'complete';
export interface DiceResult { die1: number; die2: number; total: number; doubles: boolean }
export interface Landing { playerIndex: number; space: BoardSpace }
export interface WealthEvent { id: number; playerIndex: number; amount: number; kind: 'PAYDAY' | 'PURCHASE' | 'FINISH_BONUS'; space: number }
export interface RewardModifierState { stat: PlayerStat; amount: number }
export type BoardPendingDecision =
  | { kind: 'ASSET'; slot: AssetSlot; space: number; category?: 'pet' | 'investment'; offeredAssetIds?: string[] }
  | { kind: 'CARD'; deck: DeckId; space: number; cardId: string; stage: 'draw' | 'resolved' }
  | { kind: 'CAREER'; space: number; stage: 'choice' | 'offers' | 'salary'; options?: [string, string]; selectedCareerId?: string; previousCareerId?: string }
  | { kind: 'GIG_WORKER'; space: number };
export type AbilityPendingDecision = {
  kind: 'ABILITY';
  playerIndex: number;
  abilityId: string;
  space: number;
  resumePhase: TurnPhase;
  resumePending: BoardPendingDecision | null;
  resumeEvents: EventDraft[];
  afterStep?: { previousPosition: number };
} & (
  | { decision: 'STAT_DESTINATION'; sourceStat: 'aiSkill' | 'fame' | 'influence'; amount: number; reason?: string }
  | { decision: 'ASSET_INTERACTION'; targetPlayerId: string; category: 'car' | 'property'; targetAssetId: string; ownAssetId: string | null }
  | { decision: 'CAREER_SWAP'; targetPlayerId: string }
);
export type PendingDecision = BoardPendingDecision | AbilityPendingDecision;
export interface Match {
  /** Stable identifiers and host metadata form the future multiplayer/session boundary. */
  matchId: string;
  boardId: BoardId;
  mode: GameMode;
  hostPlayerId: string;
  players: MatchPlayer[];
  turnIndex: number;
  round: number;
  phase: TurnPhase;
  roll: DiceResult | null;
  stepsRemaining: number;
  lastLanding: Landing | null;
  wealthEvents: WealthEvent[];
  /** Player indexes in the order they reached space 75. */
  finishOrder: number[];
  endgameAttributeBonuses: EndgameAttributeBonus[] | null;
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
  const finishOrder = [...(match.finishOrder ?? [])];
  const wealthEvents = [...match.wealthEvents];
  const players = match.players.map((player, playerIndex) => {
    if (!newlyFinished.includes(playerIndex)) return player;
    const rank = finishOrder.length;
    finishOrder.push(playerIndex);
    const finishReward = FINISH_ORDER_WEALTH_REWARDS[rank] ?? 0;
    const rewardedWealth = player.wealth + finishReward;
    const rewardedPlayer = { ...player, wealth: rewardedWealth };
    if (finishReward > 0) {
      wealthEvents.push({
        id: (wealthEvents.at(-1)?.id ?? 0) + 1,
        playerIndex,
        amount: finishReward,
        kind: 'FINISH_BONUS',
        space: 75,
      });
      addNativeStatChange(
        match,
        drafts,
        playerIndex,
        'wealth',
        player.wealth,
        rewardedWealth,
        `Finish reward (${rank + 1}${rank === 0 ? 'st' : rank === 1 ? 'nd' : rank === 2 ? 'rd' : 'th'} place)`,
      );
    }
    const snapshot = createFinishSnapshot(rewardedPlayer, player.slot, player.isCPU, match.round, match.turnCounter);
    const baseValue = calculateEndgameBaseValue(rewardedPlayer);
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
        description: `${player.displayName} locked a finish value of ${formatAssetValue(baseValue)} and entered the endgame.`,
      },
    );
    return {
      ...rewardedPlayer,
      status: 'FINISHED' as const,
      endgame: { status: 'PENDING' as const, snapshot, baseValue },
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
    finishOrder,
    wealthEvents,
    ...(currentPlayerFinished ? {
      phase: 'endgame' as const,
      stepsRemaining: 0,
      pending: null,
      lastLanding: currentSpace ? { playerIndex: match.turnIndex, space: currentSpace } : match.lastLanding,
    } : {}),
  };
  const resolved = resolveEventQueue(nextMatch, drafts);
  if (
    resolved.endgameAttributeBonuses
    || resolved.finishOrder.length !== resolved.players.length
    || !resolved.players.every((player) => player.status === 'FINISHED')
  ) return resolved;

  const bonuses = calculateEndgameAttributeBonuses(resolved.players, resolved.finishOrder);
  const bonusByPlayer = new Map<number, number>();
  for (const bonus of bonuses) {
    bonusByPlayer.set(bonus.playerIndex, (bonusByPlayer.get(bonus.playerIndex) ?? 0) + bonus.amount);
  }
  const playersWithBonuses = resolved.players.map((player, playerIndex) => {
    const amount = bonusByPlayer.get(playerIndex) ?? 0;
    if (!amount) return player;
    const awardedPlayer = { ...player, wealth: player.wealth + amount };
    if (player.endgame?.status === 'PENDING') {
      return {
        ...awardedPlayer,
        endgame: {
          ...player.endgame,
          baseValue: calculateEndgameBaseValue(awardedPlayer),
          snapshot: { ...player.endgame.snapshot, wealth: awardedPlayer.wealth },
        },
      };
    }
    if (player.endgame?.status === 'RESOLVED' && player.endgame.finalGameValue !== undefined) {
      return {
        ...awardedPlayer,
        endgame: { ...player.endgame, finalGameValue: player.endgame.finalGameValue + amount },
      };
    }
    return awardedPlayer;
  });
  return {
    ...resolved,
    players: playersWithBonuses,
    endgameAttributeBonuses: bonuses,
  };
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

export function createMatch(
  characterId: string,
  boardId: BoardId = DEFAULT_BOARD_ID,
  mode: GameMode = 'SINGLE_PLAYER',
): Match {
  const board = getBoardDefinition(boardId);
  if (!board.playable || mode !== 'SINGLE_PLAYER') {
    throw new Error(`${board.name} is not available in ${mode.toLowerCase().replace('_', ' ')} mode`);
  }
  const ids = [characterId, ...pickUnique(characters.map(({ id }) => id).filter(id => id !== characterId), 3)];
  const assignedCareers = pickUnique(careers, 4);
  const players = ids.map((id, slot) => {
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
      role: slot === 0 ? 'HOST' as const : 'CPU' as const,
      slot,
      status: 'ACTIVE' as const,
      endgame: null,
    };
  });
  const match: Match = {
    matchId: crypto.randomUUID(),
    boardId,
    mode,
    hostPlayerId: players[0].playerId,
    players,
    turnIndex: 0,
    round: 1,
    phase: 'ready',
    roll: null,
    stepsRemaining: 0,
    lastLanding: null,
    wealthEvents: [],
    finishOrder: [],
    endgameAttributeBonuses: null,
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
    const amount = career?.acquisitionUpgradeTokens ?? 0;
    return amount > 0 ? [{
      type: 'UPGRADE_TOKEN_GAINED' as const,
      playerIndex,
      delta: amount,
      reason: `${career?.name} career benefit`,
      description: `${player.displayName} gained ${amount} Upgrade Token for acquiring the ${career?.name} career.`,
    }] : [];
  });
  return emit(match, [...startingTokenEvents, { type: 'TURN_START', playerIndex: 0 }]);
}

export function rollD4(): number {
  return Math.floor(Math.random() * 4) + 1;
}

/** Plain, serializable gameplay intents; the reducer remains the source of truth. */
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
  | { type: 'RESOLVE_ABILITY_STAT_DESTINATION'; stat: 'aiSkill' | 'fame' | 'influence' }
  | { type: 'RESOLVE_ABILITY_ASSET_INTERACTION'; choice: 'STEAL' | 'SWAP' | 'DECLINE' }
  | { type: 'RESOLVE_ABILITY_CAREER_SWAP'; accept: boolean }
  | { type: 'AUTO_DECIDE' }
  | { type: 'CHOOSE_ENDGAME'; choice: EndgameChoice }
  | { type: 'NEXT_TURN' };

/** Session setup actions and reducer actions have stable actor/match identities. */
export type GameSessionAction =
  | { type: 'JOIN_GAME'; playerId: string; displayName: string }
  | { type: 'SELECT_CHARACTER'; playerId: string; characterId: string };

/** Envelope used by a future transport/action log; not tied to a React component. */
export interface MatchActionEnvelope {
  matchId: string;
  playerId: string;
  action: MatchAction;
}

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

function careerOffers(currentId: string, secondCareerId?: string | null): [string, string] {
  const other = pickUnique(careers.filter(career => career.id !== currentId && career.id !== secondCareerId), 2);
  return [other[0].id, other[1].id];
}

function assignNewCareer(match: Match, careerId: string): [Match, EventDraft[]] {
  const current = match.players[match.turnIndex];
  const career = careers.find(item => item.id === careerId);
  if (!career || careerId === current.careerId || careerId === current.secondCareer?.careerId) return [match, []];
  const salaryTier = (Math.floor(Math.random() * 4) + 1) as SalaryTier;
  const players = match.players.map((player, index) => index === match.turnIndex
    ? { ...player, careerId, salaryTier, salaryAmount: career.salaryTiers[salaryTier - 1] }
    : player);
  const updated = { ...match, players };
  const acquiredTokens = careerAcquisitionTokenCount([career.id])
    - careerAcquisitionTokenCount([current.careerId]);
  const drafts: EventDraft[] = acquiredTokens > 0 ? [{
    type: 'UPGRADE_TOKEN_GAINED',
    playerIndex: match.turnIndex,
    delta: acquiredTokens,
    reason: 'Newly acquired Doctor career',
    description: `${current.displayName} gained ${acquiredTokens} Upgrade Token for newly acquiring Doctor.`,
  }] : [];
  return [updated, drafts];
}

function finishStep(match: Match, previousPosition: number): Match {
  if (match.phase !== 'moving') return match;
  const current = match.players[match.turnIndex];
  const space = getSpace(current.position);
  if (!space) throw new Error(`Invalid movement position: ${current.position}`);
  if (space.type === 'CAREER_CHANGE') {
    if (space.number === 35 && current.careerId === 'gig-worker' && current.secondCareer) {
      if (match.stepsRemaining > 0 && current.position < 75) return match;
      return land(match, space, previousPosition);
    }
    return {
      ...match,
      phase: 'decision',
      pending: { kind: 'CAREER', stage: 'choice', space: space.number },
      lastLanding: match.stepsRemaining <= 0 ? { playerIndex: match.turnIndex, space } : match.lastLanding,
    };
  }
  if (match.stepsRemaining > 0 && current.position < 75) return match;
  return land(match, space, previousPosition);
}

function resumeAbilityDecision(match: Match, events: EventDraft[] = []): Match {
  const pending = match.pending;
  if (pending?.kind !== 'ABILITY') return match;
  const resumed = {
    ...match,
    phase: pending.resumePhase,
    pending: pending.resumePending,
  };
  const withChoiceEvents = events.length ? emit(resumed, events) : resumed;
  if (withChoiceEvents.pending?.kind === 'ABILITY') {
    return {
      ...withChoiceEvents,
      pending: {
        ...withChoiceEvents.pending,
        resumeEvents: [...withChoiceEvents.pending.resumeEvents, ...pending.resumeEvents],
        afterStep: pending.afterStep ?? withChoiceEvents.pending.afterStep,
      },
    };
  }
  const withQueuedEvents = pending.resumeEvents.length ? emit(withChoiceEvents, pending.resumeEvents) : withChoiceEvents;
  if (withQueuedEvents.pending?.kind === 'ABILITY' && pending.afterStep) {
    return {
      ...withQueuedEvents,
      pending: { ...withQueuedEvents.pending, afterStep: pending.afterStep },
    };
  }
  return pending.afterStep ? finishStep(withQueuedEvents, pending.afterStep.previousPosition) : withQueuedEvents;
}

function attributeEventType(stat: 'aiSkill' | 'fame' | 'influence'): EventDraft['type'] {
  if (stat === 'aiSkill') return 'AI_SKILL_CHANGED';
  if (stat === 'fame') return 'FAME_CHANGED';
  return 'INFLUENCE_CHANGED';
}

function resolveAbilityStatDestination(match: Match, stat: 'aiSkill' | 'fame' | 'influence'): Match {
  const pending = match.pending;
  if (match.phase !== 'decision' || pending?.kind !== 'ABILITY' || pending.decision !== 'STAT_DESTINATION') return match;
  if (!['aiSkill', 'fame', 'influence'].includes(stat)) return match;
  if (stat === pending.sourceStat) return resumeAbilityDecision(match);
  const player = match.players[pending.playerIndex];
  if (!player) return match;
  const sourceBefore = player[pending.sourceStat];
  const destinationBefore = player[stat];
  const sourceAfter = sourceBefore - pending.amount;
  const destinationAfter = destinationBefore + pending.amount;
  const updated = {
    ...match,
    players: match.players.map((item, index) => index === pending.playerIndex
      ? { ...item, [pending.sourceStat]: sourceAfter, [stat]: destinationAfter }
      : item),
  };
  const eventContext = {
    playerIndex: pending.playerIndex,
    source: 'ABILITY' as const,
    abilityId: pending.abilityId,
    reason: pending.reason ?? 'Go Viral',
  };
  return resumeAbilityDecision(updated, [
    {
      ...eventContext,
      type: attributeEventType(pending.sourceStat),
      stat: pending.sourceStat,
      previousValue: sourceBefore,
      newValue: sourceAfter,
      delta: -pending.amount,
      description: `${player.displayName} redirected ${pending.amount} ${pending.sourceStat} to ${stat}.`,
    },
    {
      ...eventContext,
      type: attributeEventType(stat),
      stat,
      previousValue: destinationBefore,
      newValue: destinationAfter,
      delta: pending.amount,
      description: `${player.displayName} gained ${pending.amount} ${stat} from Go Viral.`,
    },
  ]);
}

function resolveAbilityAssetInteraction(
  match: Match,
  choice: 'STEAL' | 'SWAP' | 'DECLINE',
): Match {
  const pending = match.pending;
  if (match.phase !== 'decision' || pending?.kind !== 'ABILITY' || pending.decision !== 'ASSET_INTERACTION') return match;
  if (choice === 'DECLINE') return resumeAbilityDecision(match);
  if (pending.ownAssetId ? choice !== 'SWAP' : choice !== 'STEAL') return match;
  const actorIndex = pending.playerIndex;
  const targetIndex = match.players.findIndex((player) => player.playerId === pending.targetPlayerId);
  const actor = match.players[actorIndex];
  const target = match.players[targetIndex];
  if (!actor || !target || target.equipment[pending.category] !== pending.targetAssetId) return match;
  if (pending.ownAssetId && actor.equipment[pending.category] !== pending.ownAssetId) return match;
  if (!pending.ownAssetId && actor.equipment[pending.category]) return match;

  const targetLevel = target.assetLevels[pending.targetAssetId] ?? 1;
  const ownLevel = pending.ownAssetId ? actor.assetLevels[pending.ownAssetId] ?? 1 : null;
  const actorLevels = { ...actor.assetLevels };
  const targetLevels = { ...target.assetLevels };
  delete targetLevels[pending.targetAssetId];
  if (pending.ownAssetId) {
    delete actorLevels[pending.ownAssetId];
    targetLevels[pending.ownAssetId] = ownLevel ?? 1;
  }
  actorLevels[pending.targetAssetId] = targetLevel;
  const players = match.players.map((player, index) => index === actorIndex
    ? {
      ...player,
      equipment: { ...player.equipment, [pending.category]: pending.targetAssetId },
      assetLevels: actorLevels,
    }
    : index === targetIndex
      ? {
        ...player,
        equipment: { ...player.equipment, [pending.category]: pending.ownAssetId },
        assetLevels: targetLevels,
      }
      : player);
  const updated = { ...match, players };
  const incoming = [
    { playerIndex: actorIndex, assetId: pending.targetAssetId, assetLevel: targetLevel, from: target },
    ...(pending.ownAssetId
      ? [{ playerIndex: targetIndex, assetId: pending.ownAssetId, assetLevel: ownLevel ?? 1, from: actor }]
      : []),
  ];
  const transferEvents: EventDraft[] = incoming.flatMap(({ playerIndex, assetId, assetLevel, from }) => {
    const asset = getAsset(assetId);
    if (!asset) return [];
    return [
      {
        type: 'ASSET_TRANSFERRED',
        playerIndex,
        targetPlayerId: from.playerId,
        abilityId: pending.abilityId,
        assetId,
        assetName: asset.name,
        assetLevel,
        category: asset.category,
        reason: 'Career asset interaction',
        description: `${match.players[playerIndex].displayName} received ${asset.name} at Level ${assetLevel} from ${from.displayName}.`,
      },
      {
        type: 'ASSET_ACQUIRED',
        playerIndex,
        abilityId: pending.abilityId,
        assetId,
        assetName: asset.name,
        assetLevel,
        category: asset.category,
        reason: 'Career asset interaction',
      },
    ];
  });
  return resumeAbilityDecision(updated, transferEvents);
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
      previousValue: previousLevel,
      newValue: level,
      delta: level - previousLevel,
      previousAssetValue: valueBefore,
      newAssetValue: valueAfter,
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
    description: `${player.displayName} selected ${choice.replaceAll('_', ' ')}.`,
  }]);
  const selectedPlayer = selected.players[playerIndex];
  const selectedEndgame = selectedPlayer.endgame ?? endgame;

  if (choice === 'CASH_OUT') {
    const outcome = cashOutValue(selectedEndgame.baseValue);
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
        description: `${player.displayName} cashed out at ${outcome.multiplier}× for ${formatAssetValue(outcome.finalGameValue)}.`,
      },
      {
        type: 'ENDGAME_COMPLETED',
        playerIndex,
        endgameChoice: choice,
        baseValue: selectedEndgame.baseValue,
        finalGameValue: outcome.finalGameValue,
      },
    ]);
  }

  if (choice === 'DOUBLE_DOWN') {
    const dice = { die1: rollD4(), die2: rollD4() };
    const total = dice.die1 + dice.die2;
    const roll = { ...dice, total, doubles: dice.die1 === dice.die2 };
    const outcome = doubleDownValue(selectedEndgame.baseValue, total);
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
        effectiveRoll: outcome.effectiveRoll,
        description: `${player.displayName} rolled ${roll.die1}-${roll.die2}; the 2d4 total set the outcome at ${outcome.multiplier}×.`,
      },
      {
        type: 'ENDGAME_COMPLETED',
        playerIndex,
        endgameChoice: choice,
        baseValue: selectedEndgame.baseValue,
        finalGameValue: outcome.finalGameValue,
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
  const stake = resolveFinalGambleStake(finalPlayer);
  const outcome = finalGambleValue(selectedEndgame.baseValue, rawDelta, stake.delta);
  const completed = resolvedEndgamePlayer(gambled, playerIndex, {
    ...selectedEndgame,
    status: 'RESOLVED',
    choice,
    gambleCardId: draw.cardId,
    gambleRawDelta: rawDelta,
    gambleAdjustedDelta: outcome.adjustedDelta,
    gambleStake: stake,
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
      description: `${player.displayName} put their Wealth, assets${stake.tokens ? ' and Upgrade Tokens' : ''} on the line and ${stake.won ? 'WON' : 'LOST'}. ${card.title}: ${outcome.adjustedDelta >= 0 ? '+' : ''}${formatAssetValue(outcome.adjustedDelta)} adjusted value.`,
    },
    {
      type: 'ENDGAME_COMPLETED',
      playerIndex,
      endgameChoice: choice,
      baseValue: selectedEndgame.baseValue,
      finalGameValue: outcome.finalGameValue,
    },
  ]);
}

function autoDecide(match: Match): Match {
  const pending = match.pending;
  const decisionPlayerIndex = pending?.kind === 'ABILITY' ? pending.playerIndex : match.turnIndex;
  const player = match.players[decisionPlayerIndex];
  if (!player?.isCPU) return match;
  if (match.phase === 'endgame' && player.endgame?.status === 'PENDING') {
    const choice = chooseCpuEndgameChoice(
      player.wealth,
      player.endgame.baseValue,
    );
    return resolveEndgameChoice(match, choice);
  }
  if (match.phase !== 'decision' || !pending) return match;
  if (pending.kind === 'ABILITY') {
    if (pending.decision === 'STAT_DESTINATION') {
      return resolveAbilityStatDestination(match, pending.sourceStat);
    }
    if (pending.decision === 'ASSET_INTERACTION') {
      return resolveAbilityAssetInteraction(match, pending.ownAssetId ? 'SWAP' : 'STEAL');
    }
    const target = match.players.find((candidate) => candidate.playerId === pending.targetPlayerId);
    const accept = Boolean(target && effectiveSalaryAmount(target) > effectiveSalaryAmount(player));
    if (!accept) return resumeAbilityDecision(match);
    return resumeAbilityDecision(match, [{
      type: 'CAREER_SWAP_RESOLVED',
      playerIndex: pending.playerIndex,
      targetPlayerId: pending.targetPlayerId,
      abilityId: pending.abilityId,
      reason: 'Golden Handcuffs',
      description: `${player.displayName} swapped career packages with ${target?.displayName ?? 'another player'}.`,
    }]);
  }
  if (pending.kind === 'CARD') {
    return pending.stage === 'draw'
      ? resolveCardDecision(match)
      : acknowledgeCardDecision(match);
  }
  if (pending.kind === 'ASSET') {
    // The slot can be filled after the offer opens (e.g. by an event resolved on landing); never stall.
    if (player.equipment[pending.slot]) return resume(match);
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
  const options = careerOffers(player.careerId ?? '', player.secondCareer?.careerId);
  const chosen = options.map(id => careers.find(career => career.id === id)!)
    .sort((a, b) => (b.salaryTiers[1] + Math.random() * 80000) - (a.salaryTiers[1] + Math.random() * 80000))[0];
  const [updated, acquisitionEvents] = assignNewCareer(match, chosen.id);
  const withCareerEvent = emit({ ...updated, pending: null }, [
    {
      type: 'CAREER_CHANGE',
      playerIndex: decisionPlayerIndex,
      spaceNumber: pending.space,
      stage: 'RESOLVED',
      previousCareerId: player.careerId,
      newCareerId: chosen.id,
      previousSalary: player.salaryAmount,
      newSalary: updated.players[decisionPlayerIndex].salaryAmount,
    },
    ...acquisitionEvents,
  ]);
  return resume(withCareerEvent);
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
      const effectiveSalary = effectiveSalaryAmount(current);
      const salaryGate = applySalaryGate(moved, match.turnIndex, previousPosition, position);
      moved = {
        ...salaryGate.match,
        wealthEvents: salaryGate.drafts.length
          ? [...match.wealthEvents, { id: (match.wealthEvents.at(-1)?.id ?? 0) + 1, playerIndex: match.turnIndex, amount: effectiveSalary, kind: 'PAYDAY', space: position }]
          : match.wealthEvents,
      };
      const drafts = createStepEvents(moved, previousPosition, position, moved.stepsRemaining <= 0, effectiveSalary, salaryGate.drafts.length > 0);
      drafts.unshift({ type: 'PLAYER_MOVED', playerIndex: match.turnIndex, previousPosition, newPosition: position, distance: 1 });
      moved = emit(moved, [...salaryGate.drafts, ...drafts]);
      if (moved.pending?.kind === 'ABILITY') {
        return {
          ...moved,
          pending: { ...moved.pending, afterStep: { previousPosition } },
        };
      }
      if (moved.phase !== 'moving') return moved;
      return finishStep(moved, previousPosition);
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
      const current = match.players[match.turnIndex];
      return {
        ...match,
        pending: {
          ...match.pending,
          stage: 'offers',
          options: careerOffers(current.careerId ?? '', current.secondCareer?.careerId),
        },
      };
    }
    case 'SELECT_CAREER': {
      const pending = match.pending;
      if (match.phase !== 'decision' || pending?.kind !== 'CAREER' || pending.stage !== 'offers' || !pending.options?.includes(action.careerId)) return match;
      const previous = match.players[match.turnIndex];
      const [updated, acquisitionEvents] = assignNewCareer(match, action.careerId);
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
        }, ...acquisitionEvents],
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
    case 'RESOLVE_ABILITY_STAT_DESTINATION':
      if (match.players[match.pending?.kind === 'ABILITY' ? match.pending.playerIndex : match.turnIndex]?.isCPU) return match;
      return resolveAbilityStatDestination(match, action.stat);
    case 'RESOLVE_ABILITY_ASSET_INTERACTION':
      if (match.players[match.pending?.kind === 'ABILITY' ? match.pending.playerIndex : match.turnIndex]?.isCPU) return match;
      return resolveAbilityAssetInteraction(match, action.choice);
    case 'RESOLVE_ABILITY_CAREER_SWAP': {
      const pending = match.pending;
      const player = match.players[pending?.kind === 'ABILITY' ? pending.playerIndex : match.turnIndex];
      if (player?.isCPU || match.phase !== 'decision' || pending?.kind !== 'ABILITY' || pending.decision !== 'CAREER_SWAP') return match;
      if (!action.accept) return resumeAbilityDecision(match);
      return resumeAbilityDecision(match, [{
        type: 'CAREER_SWAP_RESOLVED',
        playerIndex: pending.playerIndex,
        targetPlayerId: pending.targetPlayerId,
        abilityId: pending.abilityId,
        reason: 'Golden Handcuffs',
        description: `${player.displayName} swapped career packages with another player.`,
      }]);
    }
    case 'AUTO_DECIDE':
      return autoDecide(match);
    case 'CHOOSE_ENDGAME':
      if (match.players[match.turnIndex]?.isCPU) return match;
      return resolveEndgameChoice(match, action.choice);
    case 'NEXT_TURN': {
      if (match.phase !== 'landed') return match;
      const currentPlayer = match.players[match.turnIndex];
      const previousTurnIndex = match.turnIndex;
      const normalTurnEnded = currentPlayer.status === 'ACTIVE';
      const finishedPlayerTurnEnded = currentPlayer.status === 'FINISHED'
        && currentPlayer.endgame?.snapshot.capturedTurnCounter === match.turnCounter;
      const turnEnded = normalTurnEnded || finishedPlayerTurnEnded;
      let nextTurnCounter = match.turnCounter + (turnEnded ? 1 : 0);
      let endedTurn = emit(
        resetTurnScopedState(match),
        normalTurnEnded ? [{ type: 'TURN_END', playerIndex: match.turnIndex }] : [],
      );
      const playerCount = endedTurn.players.length;
      let nextIndex = -1;
      let nextIsEndgame = false;
      let skippedTurns = 0;
      for (let offset = 1; offset <= playerCount; offset += 1) {
        const candidateIndex = (previousTurnIndex + offset) % playerCount;
        const candidate = endedTurn.players[candidateIndex];
        if (candidate.endgame?.status === 'PENDING') {
          nextIndex = candidateIndex;
          nextIsEndgame = true;
          break;
        }
        if (candidate.status === 'ACTIVE') {
          if (candidate.skipTurns > 0) {
            endedTurn = emit({
              ...resetTurnScopedState(endedTurn),
              turnIndex: candidateIndex,
              turnCounter: nextTurnCounter,
              players: endedTurn.players.map((player, index) => index === candidateIndex
                ? { ...player, skipTurns: player.skipTurns - 1 }
                : player),
            }, [{
              type: 'TURN_SKIPPED',
              playerIndex: candidateIndex,
              delta: -1,
              reason: 'Scheduled turn skip',
              description: `${candidate.displayName} skipped their scheduled turn.`,
            }]);
            nextTurnCounter += 1;
            skippedTurns += 1;
            continue;
          }
          nextIndex = candidateIndex;
          break;
        }
      }
      if (nextIndex < 0 && skippedTurns > 0) {
        for (let offset = 1; offset <= playerCount; offset += 1) {
          const candidateIndex = (previousTurnIndex + offset) % playerCount;
          if (endedTurn.players[candidateIndex].status === 'ACTIVE') {
            nextIndex = candidateIndex;
            break;
          }
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
      const nextRound = nextIndex <= previousTurnIndex ? endedTurn.round + 1 : endedTurn.round;
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
