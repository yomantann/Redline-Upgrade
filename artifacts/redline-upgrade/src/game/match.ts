import { characters } from './characters';
import { createPlayer, type PlayerStat } from './player';
import { getSpace, type BoardSpace } from './board-data';
import { careers, startingWealth, type SalaryTier } from './careers';
import { assetOptions, getAsset, type AssetCategory, type AssetSlot } from './assets';
import type { DeckId } from './decks';
import { addNativeStatChange, createPurchaseEvents, resolveEventQueue, type AbilityUsageState, type EventDraft, type ProtectionState } from './event-engine';
import type { EventLogEntry } from './events/types';
import { applySalaryGate } from './movement-events';

export type MatchPlayer = ReturnType<typeof createPlayer> & { isCPU: boolean; slot: number };
export type TurnPhase = 'ready' | 'rolling' | 'reveal' | 'moving' | 'decision' | 'landed';
export interface DiceResult { die1: number; die2: number; total: number; doubles: boolean }
export interface Landing { playerIndex: number; space: BoardSpace }
export interface WealthEvent { id: number; playerIndex: number; amount: number; kind: 'PAYDAY' | 'PURCHASE'; space: number }
export interface RewardModifierState { stat: PlayerStat; amount: number }
export type PendingDecision =
  | { kind: 'ASSET'; slot: AssetSlot; space: number; category?: 'pet' | 'investment'; offeredAssetIds?: string[] }
  | { kind: 'CARD'; deck: DeckId; space: number }
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

function emit(match: Match, drafts: EventDraft[]): Match {
  return drafts.length ? resolveEventQueue(match, drafts) : match;
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
  };
  return emit(match, [{ type: 'TURN_START', playerIndex: 0 }]);
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
  | { type: 'SKIP_ASSET' }
  | { type: 'KEEP_CAREER' }
  | { type: 'SWITCH_CAREER' }
  | { type: 'SELECT_CAREER'; careerId: string }
  | { type: 'ACKNOWLEDGE_CAREER' }
  | { type: 'ACKNOWLEDGE_CARD' }
  | { type: 'AUTO_DECIDE' }
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
  if (slot && !match.players[match.turnIndex].equipment[slot]) {
    return emit({ ...match, phase: 'decision', stepsRemaining: 0, lastLanding: landing, pending: { kind: 'ASSET', slot, space: space.number, offeredAssetIds: slot === 'companion' ? undefined : drawAssets(slot) } }, drafts);
  }
  if (space.deck) {
    drafts.push({ type: 'CARD_DRAW', playerIndex: match.turnIndex, spaceNumber: space.number, deck: space.deck });
    return emit({ ...match, phase: 'decision', stepsRemaining: 0, lastLanding: landing, pending: { kind: 'CARD', deck: space.deck, space: space.number } }, drafts);
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

function applyAssetStats(match: Match, playerIndex: number, assetId: string): [Match, EventDraft[]] {
  const asset = getAsset(assetId);
  if (!asset) return [match, []];
  const player = match.players[playerIndex];
  const next = {
    ...player,
    equipment: { ...player.equipment },
  };
  const drafts: EventDraft[] = [];
  next.equipment[(asset.category === 'pet' || asset.category === 'investment') ? 'companion' : asset.category] = asset.id;
  const nextWealth = Math.max(0, player.wealth - asset.cost + (asset.effects.wealth ?? 0));
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

function resolveCardDecision(match: Match): Match {
  if (match.phase !== 'decision' || match.pending?.kind !== 'CARD') return match;
  const { deck, space } = match.pending;
  return emit(resume(match), [{ type: 'CARD_RESOLVED', playerIndex: match.turnIndex, deck, spaceNumber: space, cardId: `example-${deck}` }]);
}

function autoDecide(match: Match): Match {
  const pending = match.pending;
  if (match.phase !== 'decision' || !match.players[match.turnIndex].isCPU || !pending) return match;
  const player = match.players[match.turnIndex];
  if (pending.kind === 'CARD') return resolveCardDecision(match);
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
      if (match.phase !== 'ready') return match;
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
      if (match.phase !== 'reveal') return match;
      if (match.players[match.turnIndex].position < 75) return { ...match, phase: 'moving' };
      const space = getSpace(75);
      if (!space) throw new Error('Missing finish space');
      return land(match, space, 75);
    }
    case 'STEP': {
      if (match.phase !== 'moving') return match;
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
    case 'ACKNOWLEDGE_CARD':
      if (match.phase !== 'decision' || match.pending?.kind !== 'CARD' || match.players[match.turnIndex].isCPU) return match;
      return resolveCardDecision(match);
    case 'AUTO_DECIDE':
      return autoDecide(match);
    case 'NEXT_TURN':
      if (match.phase !== 'landed') return match;
      const nextTurnCounter = match.turnCounter + 1;
      const endedTurn = emit(resetTurnScopedState(match), [{ type: 'TURN_END', playerIndex: match.turnIndex }]);
      const nextTurnIndex = (endedTurn.turnIndex + 1) % 4;
      const nextRound = endedTurn.turnIndex === 3 ? endedTurn.round + 1 : endedTurn.round;
      return emit({
        ...endedTurn,
        turnIndex: nextTurnIndex,
        round: nextRound,
        phase: 'ready',
        roll: null,
        stepsRemaining: 0,
        turnCounter: nextTurnCounter,
      }, [{ type: 'TURN_START', playerIndex: nextTurnIndex }]);
  }
}
