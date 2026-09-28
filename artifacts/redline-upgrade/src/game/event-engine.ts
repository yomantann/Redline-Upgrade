import { assetOptions, getAsset, type AssetCategory, type AssetSlot } from './assets';
import { getAbility, type EffectDefinition, type EffectType } from './abilities';
import { getSpace } from './board-data';
import { getBoardEffect, type BoardEffectDefinition, type BoardEffectTarget } from './board-effects';
import { getCareer } from './careers';
import { getCharacter } from './characters';
import { getCard, type CardEffect, type CardTarget } from './cards';
import type { AnyGameEvent, EventLogEntry, EventSource, GameEventType } from './events/types';
import type { Match, MatchPlayer, RewardModifierState } from './match';
import { applySalaryGate } from './movement-events';
import type { PlayerStat } from './player';
import { drawCardFromPiles } from './card-piles';

const MAX_EVENT_DEPTH = 6;
const MAX_EVENT_CHAIN = 48;
const MAX_LOG_ENTRIES = 80;

export interface AbilityUsageState {
  lastTurn?: number;
  lastRound?: number;
  used: number;
}

export interface ProtectionState {
  remaining: number;
  blockedEffectTypes?: EffectType[];
}

export interface EventDraft {
  type: GameEventType;
  playerIndex: number;
  source?: EventSource;
  sourceEventId?: string;
  abilityId?: string;
  depth?: number;
  die1?: number;
  die2?: number;
  total?: number;
  doubles?: boolean;
  previousPosition?: number;
  newPosition?: number;
  distance?: number;
  spaceNumber?: number;
  targetPlayerId?: string;
  targetPlayerIndex?: number;
  targetPosition?: number;
  salaryAmount?: number;
  previousWealth?: number;
  newWealth?: number;
  previousCareerId?: string | null;
  newCareerId?: string | null;
  previousSalary?: number;
  newSalary?: number;
  stage?: 'TRIGGERED' | 'RESOLVED';
  milestoneType?: 'car' | 'lifestyle' | 'companion' | 'property';
  effectId?: string;
  deck?: 'wealth' | 'ai' | 'fame' | 'lifestyle' | 'influence' | 'gamble';
  cardId?: string;
  assetId?: string;
  assetName?: string;
  assetLevel?: number;
  category?: 'car' | 'lifestyle' | 'pet' | 'investment' | 'property';
  cost?: number;
  stat?: PlayerStat;
  previousValue?: number;
  newValue?: number;
  delta?: number;
  reason?: string;
  description?: string;
  effectType?: string;
}

function withEventCursor(match: Match): [Match, string] {
  const eventCursor = match.eventCursor + 1;
  return [{ ...match, eventCursor }, `evt-${eventCursor}`];
}

function createEvent(match: Match, draft: EventDraft): [Match, AnyGameEvent] {
  const [nextMatch, id] = withEventCursor(match);
  const player = nextMatch.players[draft.playerIndex];
  return [nextMatch, {
    ...draft,
    id,
    playerId: player.playerId,
    timestamp: nextMatch.eventCursor,
    source: draft.source ?? 'GAME',
    depth: draft.depth ?? 0,
    turnIndex: nextMatch.turnIndex,
    round: nextMatch.round,
  }];
}

function statEventType(stat: PlayerStat): GameEventType {
  switch (stat) {
    case 'wealth': return 'WEALTH_CHANGED';
    case 'aiSkill': return 'AI_SKILL_CHANGED';
    case 'fame': return 'FAME_CHANGED';
    case 'lifestyle': return 'LIFESTYLE_CHANGED';
    case 'influence': return 'INFLUENCE_CHANGED';
  }
}

function eventLabel(event: AnyGameEvent): string {
  switch (event.type) {
    case 'DICE_ROLL': return `ROLLED ${event.total ?? 0}`;
    case 'DOUBLES_ROLLED': return 'DOUBLES';
    case 'ROLL_OF_2': return 'ROLL OF 2';
    case 'ROLL_OF_8': return 'ROLL OF 8';
    case 'PASS_SPACE': return `PASSED ${String(event.spaceNumber ?? 0).padStart(2, '0')}`;
    case 'LAND_ON_SPACE': return `LANDED ${String(event.spaceNumber ?? 0).padStart(2, '0')}`;
    case 'LAND_ON_PLAYER': return 'LANDED ON PLAYER';
    case 'PASS_PLAYER': return 'PASSED PLAYER';
    case 'SALARY_GATE': return 'SALARY GATE';
    case 'CAREER_CHANGE': return event.stage === 'RESOLVED' ? 'CAREER RESOLVED' : 'CAREER CHANGE';
    case 'MILESTONE': return 'MILESTONE';
    case 'BOARD_EFFECT_RESOLVED': return getBoardEffect(event.effectId)?.label ?? 'BOARD EFFECT';
    case 'CARD_DRAW': return event.cardId ? `DREW ${getCard(event.cardId)?.title ?? 'CARD'}` : 'CARD DRAW';
    case 'CARD_RESOLVED': return event.cardId ? getCard(event.cardId)?.title ?? 'CARD RESOLVED' : 'CARD RESOLVED';
    case 'UPGRADE_TOKEN_GAINED': return 'UPGRADE TOKEN GAINED';
    case 'UPGRADE_TOKEN_SPENT': return 'UPGRADE TOKEN SPENT';
    case 'UPGRADE_TOKEN_HELD': return 'TOKEN HELD FOR ENDGAME';
    case 'ASSET_UPGRADED': return 'ASSET UPGRADED';
    case 'MILESTONE_RECOVERED': return 'MILESTONE RECOVERED';
    case 'ASSET_PURCHASED': return 'ASSET PURCHASED';
    case 'CAR_PURCHASED': return 'CAR PURCHASED';
    case 'LIFESTYLE_PURCHASED': return 'LIFESTYLE PURCHASED';
    case 'PET_PURCHASED': return 'PET PURCHASED';
    case 'INVESTMENT_PURCHASED': return 'INVESTMENT PURCHASED';
    case 'PROPERTY_PURCHASED': return 'PROPERTY PURCHASED';
    case 'WEALTH_CHANGED': return 'WEALTH CHANGED';
    case 'AI_SKILL_CHANGED': return 'AI SKILL CHANGED';
    case 'FAME_CHANGED': return 'FAME CHANGED';
    case 'LIFESTYLE_CHANGED': return 'LIFESTYLE CHANGED';
    case 'INFLUENCE_CHANGED': return 'INFLUENCE CHANGED';
    case 'TURN_START': return 'TURN START';
    case 'TURN_END': return 'TURN END';
    case 'PLAYER_MOVED': return 'PLAYER MOVED';
    case 'PLAYER_AFFECTED': return event.effectType === 'MODIFY_SALARY' ? 'SALARY UPDATED' : 'PLAYER AFFECTED';
  }
}

function eventDetail(match: Match, event: AnyGameEvent): string {
  const player = match.players[event.playerIndex];
  switch (event.type) {
    case 'DICE_ROLL':
      return `${player.displayName} rolled ${event.die1}-${event.die2} for ${event.total}.`;
    case 'PASS_SPACE':
      return `${player.displayName} passed space ${event.spaceNumber}.`;
    case 'LAND_ON_SPACE':
      return `${player.displayName} landed on space ${event.spaceNumber}.`;
    case 'LAND_ON_PLAYER':
      return `${player.displayName} landed on another player.`;
    case 'PASS_PLAYER':
      return `${player.displayName} passed another player.`;
    case 'SALARY_GATE':
      return `${player.displayName} collected salary ${event.salaryAmount ?? 0}.`;
    case 'CAREER_CHANGE':
      return event.stage === 'RESOLVED'
        ? `${player.displayName} resolved a career change.`
        : `${player.displayName} triggered a career change.`;
    case 'MILESTONE':
      return `${player.displayName} reached the ${event.milestoneType} milestone.`;
    case 'BOARD_EFFECT_RESOLVED': {
      const effect = getBoardEffect(event.effectId);
      return `${player.displayName} landed on ${effect?.label ?? 'a board effect'}: ${effect?.description ?? 'the effect was resolved.'}`;
    }
    case 'CARD_DRAW':
      return `${player.displayName} drew ${getCard(event.cardId ?? '')?.title ?? `a ${event.deck} card`}.`;
    case 'CARD_RESOLVED':
      return event.description ?? `${player.displayName} resolved ${getCard(event.cardId ?? '')?.title ?? `a ${event.deck} card`}.`;
    case 'UPGRADE_TOKEN_GAINED':
    case 'UPGRADE_TOKEN_SPENT':
    case 'UPGRADE_TOKEN_HELD':
    case 'ASSET_UPGRADED':
    case 'MILESTONE_RECOVERED':
      return event.description ?? `${player.displayName} ${event.type.toLowerCase().replaceAll('_', ' ')}.`;
    case 'ASSET_PURCHASED':
      return `${player.displayName} purchased ${event.assetName}.`;
    case 'CAR_PURCHASED':
      return `${player.displayName} purchased car ${event.assetName}.`;
    case 'LIFESTYLE_PURCHASED':
      return `${player.displayName} purchased lifestyle ${event.assetName}.`;
    case 'PET_PURCHASED':
      return `${player.displayName} purchased pet ${event.assetName}.`;
    case 'INVESTMENT_PURCHASED':
      return `${player.displayName} purchased investment ${event.assetName}.`;
    case 'PROPERTY_PURCHASED':
      return `${player.displayName} purchased property ${event.assetName}.`;
    case 'WEALTH_CHANGED':
    case 'AI_SKILL_CHANGED':
    case 'FAME_CHANGED':
    case 'LIFESTYLE_CHANGED':
    case 'INFLUENCE_CHANGED':
      return `${player.displayName} ${event.reason ?? 'changed'} ${event.delta && event.delta > 0 ? '+' : ''}${event.delta ?? 0}.`;
    default:
      return event.description ?? `${player.displayName} triggered ${event.type}.`;
  }
}

function pushLog(match: Match, event: AnyGameEvent, label = eventLabel(event), detail = eventDetail(match, event), amount?: number, blocked = false): Match {
  const entry: EventLogEntry = {
    id: event.id,
    kind: 'EVENT',
    eventType: event.type,
    source: event.source,
    playerId: event.playerId,
    targetPlayerId: event.targetPlayerId,
    abilityId: event.abilityId,
    label,
    detail,
    amount,
    blocked,
    round: event.round,
    turnIndex: event.turnIndex,
    depth: event.depth,
    timestamp: event.timestamp,
  };
  return { ...match, eventLog: [...match.eventLog, entry].slice(-MAX_LOG_ENTRIES) };
}

function getPlayerAbilityIds(player: MatchPlayer): string[] {
  const ids: string[] = [];
  const character = getCharacter(player.characterId);
  const career = player.careerId ? getCareer(player.careerId) : undefined;
  if (character) ids.push(...character.abilityIds);
  if (career) ids.push(...career.abilityIds);
  return ids;
}

function usageKey(match: Match, abilityId: string, playerId: string) {
  return `${playerId}:${abilityId}`;
}

function abilityAvailable(match: Match, player: MatchPlayer, abilityId: string) {
  const ability = getAbility(abilityId);
  if (!ability?.usageLimits) return true;
  const used = match.abilityUsage[usageKey(match, abilityId, player.playerId)];
  if (!used) return true;
  if (ability.usageLimits.oncePerGame && used.used > 0) return false;
  if (ability.usageLimits.oncePerRound && used.lastRound === match.round) return false;
  if (ability.usageLimits.oncePerTurn && used.lastTurn === match.turnCounter) return false;
  return true;
}

function markAbilityUsed(match: Match, player: MatchPlayer, abilityId: string): Match {
  const key = usageKey(match, abilityId, player.playerId);
  return {
    ...match,
    abilityUsage: {
      ...match.abilityUsage,
      [key]: {
        lastTurn: match.turnCounter,
        lastRound: match.round,
        used: (match.abilityUsage[key]?.used ?? 0) + 1,
      },
    },
  };
}

function meetsCondition(match: Match, player: MatchPlayer, event: AnyGameEvent, condition: ReturnType<typeof getAbility> extends infer T ? T extends { conditions: infer C } ? C extends Array<infer U> ? U : never : never : never): boolean {
  switch (condition.kind) {
    case 'ANY':
      return true;
    case 'EVENT_ACTOR_IS_SELF':
      return event.playerId === player.playerId;
    case 'EVENT_ACTOR_IS_OTHER':
      return event.playerId !== player.playerId;
    case 'EVENT_OWNER_IS_EVENT_TARGET':
      return event.targetPlayerId === player.playerId;
    case 'EVENT_DELTA_IS_NEGATIVE':
      return typeof event.delta === 'number' && event.delta < 0;
    case 'EVENT_DELTA_IS_POSITIVE':
      return typeof event.delta === 'number' && event.delta > 0;
    case 'EVENT_STAGE_IS':
      return event.stage === condition.stage;
    case 'EVENT_HAS_TARGET_PLAYER':
      return Boolean(event.targetPlayerId);
    case 'EVENT_CATEGORY_IS':
      return event.category === condition.category;
    case 'EVENT_DECK_IS':
      return event.deck === condition.deck;
    case 'EVENT_SPACE_IS':
      return event.spaceNumber === condition.spaceNumber;
    case 'EVENT_STAT_IS':
      return event.stat === condition.stat;
    case 'PLAYER_CAREER_TAG': {
      const career = player.careerId ? getCareer(player.careerId) : undefined;
      return Boolean(career?.tags.includes(condition.tag));
    }
    case 'TARGET_IS_OTHER_PLAYER':
      return Boolean(event.targetPlayerId && event.targetPlayerId !== player.playerId);
  }
}

function resolveTargets(match: Match, actor: MatchPlayer, event: AnyGameEvent, target: EffectDefinition['target'] = 'SELF'): number[] {
  switch (target) {
    case 'LANDED_ON_PLAYER':
    case 'AFFECTED_PLAYER':
      return event.targetPlayerId
        ? match.players.flatMap((player, index) => player.playerId === event.targetPlayerId ? [index] : [])
        : [];
    case 'ALL_OTHER_PLAYERS':
      return match.players.flatMap((player, index) => index === actor.slot ? [] : [index]);
    case 'SELF':
    default:
      return [actor.slot];
  }
}

function milestoneType(spaceNumber: number): 'car' | 'lifestyle' | 'companion' | 'property' | null {
  switch (spaceNumber) {
    case 10: return 'car';
    case 30: return 'lifestyle';
    case 45: return 'companion';
    case 60: return 'property';
    default: return null;
  }
}

function milestoneSlot(spaceNumber: number): AssetSlot | null {
  switch (spaceNumber) {
    case 10: return 'car';
    case 30: return 'lifestyle';
    case 45: return 'companion';
    case 60: return 'property';
    default: return null;
  }
}

function pickUnique<T>(items: readonly T[], count: number): T[] {
  const remaining = [...items];
  for (let i = remaining.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }
  return remaining.slice(0, count);
}

function drawAssets(category: AssetCategory): string[] {
  return pickUnique(assetOptions(category), 3).map((asset) => asset.id);
}

function getRewardBonus(match: Match, playerId: string, stat: PlayerStat): number {
  const key = `${playerId}:${stat}`;
  return match.rewardModifiers[key]?.amount ?? 0;
}

function consumeProtection(match: Match, playerId: string, effectType: EffectType): Match {
  const protections = match.effectProtections[playerId];
  if (!protections?.length) return match;
  const next = [...protections];
  const protectedIndex = next.findIndex((protection) => !protection.blockedEffectTypes?.length || protection.blockedEffectTypes.includes(effectType));
  if (protectedIndex === -1) return match;
  const protection = next[protectedIndex];
  if (protection.remaining <= 1) next.splice(protectedIndex, 1);
  else next[protectedIndex] = { ...protection, remaining: protection.remaining - 1 };
  return {
    ...match,
    effectProtections: {
      ...match.effectProtections,
      [playerId]: next,
    },
  };
}

function isBlocked(match: Match, playerId: string, effectType: EffectType, delta: number) {
  if (delta >= 0) return false;
  const protections = match.effectProtections[playerId];
  return Boolean(protections?.some((protection) => !protection.blockedEffectTypes?.length || protection.blockedEffectTypes.includes(effectType)));
}

function updatePlayer(match: Match, index: number, update: (player: MatchPlayer) => MatchPlayer): Match {
  return { ...match, players: match.players.map((player, playerIndex) => playerIndex === index ? update(player) : player) };
}

function applyStatDelta(
  match: Match,
  queue: EventDraft[],
  event: AnyGameEvent,
  actor: MatchPlayer,
  stat: PlayerStat,
  baseDelta: number,
  effectType: EffectType,
  target: number,
  reason?: string,
): Match {
  const targetPlayer = match.players[target];
  const delta = baseDelta + (baseDelta > 0 ? getRewardBonus(match, targetPlayer.playerId, stat) : 0);
  if (!delta) return match;
  if (isBlocked(match, targetPlayer.playerId, effectType, delta)) {
    const blockedEvent: AnyGameEvent = {
      ...event,
      id: `${event.id}:blocked:${stat}:${target}`,
      type: 'PLAYER_AFFECTED',
      targetPlayerId: targetPlayer.playerId,
      targetPlayerIndex: target,
      effectType,
      description: `${targetPlayer.displayName} blocked ${effectType}.`,
    };
    return pushLog(consumeProtection(match, targetPlayer.playerId, effectType), blockedEvent, 'PENALTY BLOCKED', blockedEvent.description, delta, true);
  }
  const previousValue = targetPlayer[stat];
  const nextValue = stat === 'wealth' ? Math.max(0, previousValue + delta) : previousValue + delta;
  if (nextValue === previousValue) return match;
  const updated = updatePlayer(match, target, (player) => ({ ...player, [stat]: nextValue }));
  queue.push({
    type: statEventType(stat),
    playerIndex: target,
    source: 'EFFECT',
    sourceEventId: event.id,
    abilityId: event.abilityId,
    depth: event.depth + 1,
    stat,
    previousValue,
    newValue: nextValue,
    delta: nextValue - previousValue,
    reason,
  });
  return updated;
}

function applyMovePlayerEffect(match: Match, queue: EventDraft[], actor: MatchPlayer, targetIndex: number, event: AnyGameEvent, amount: number): Match {
  if (!amount) return match;
  let state = match;
  const direction = amount > 0 ? 1 : -1;
  const steps = Math.abs(amount);
  for (let step = 0; step < steps; step += 1) {
    const current = state.players[targetIndex];
    const nextPosition = Math.min(75, Math.max(0, current.position + direction));
    if (nextPosition === current.position) break;
    state = updatePlayer(state, targetIndex, (player) => ({ ...player, position: nextPosition }));
    queue.push({
      type: 'PLAYER_MOVED',
      playerIndex: targetIndex,
      source: 'EFFECT',
      sourceEventId: event.id,
      abilityId: event.abilityId,
      depth: event.depth + 1,
      previousPosition: current.position,
      newPosition: nextPosition,
      distance: direction,
    });
    const space = getSpace(nextPosition);
    if (!space) continue;
    queue.push({
      type: 'PASS_SPACE',
      playerIndex: targetIndex,
      source: 'EFFECT',
      sourceEventId: event.id,
      abilityId: event.abilityId,
      depth: event.depth + 1,
      previousPosition: current.position,
      newPosition: nextPosition,
      spaceNumber: nextPosition,
    });
    const isFinalStep = step === steps - 1;
    const salaryGate = applySalaryGate(state, targetIndex, current.position, nextPosition, {
      source: 'EFFECT',
      sourceEventId: event.id,
      abilityId: event.abilityId,
      depth: event.depth + 1,
    });
    state = salaryGate.match;
    queue.push(...salaryGate.drafts);
    const occupants = state.players.filter((player, index) => index !== targetIndex && player.position === nextPosition);
    for (const occupant of occupants) {
      queue.push({
        type: isFinalStep ? 'LAND_ON_PLAYER' : 'PASS_PLAYER',
        playerIndex: targetIndex,
        source: 'EFFECT',
        sourceEventId: event.id,
        abilityId: event.abilityId,
        depth: event.depth + 1,
        previousPosition: current.position,
        newPosition: nextPosition,
        spaceNumber: nextPosition,
        targetPlayerId: occupant.playerId,
        targetPlayerIndex: occupant.slot,
        targetPosition: occupant.position,
      });
    }
    if (space.type === 'CAREER_CHANGE') {
      queue.push({
        type: 'CAREER_CHANGE',
        playerIndex: targetIndex,
        source: 'EFFECT',
        sourceEventId: event.id,
        abilityId: event.abilityId,
        depth: event.depth + 1,
        spaceNumber: nextPosition,
        stage: 'TRIGGERED',
        previousCareerId: state.players[targetIndex].careerId,
        newCareerId: state.players[targetIndex].careerId,
        previousSalary: state.players[targetIndex].salaryAmount,
        newSalary: state.players[targetIndex].salaryAmount,
      });
    }
    if (isFinalStep) {
      queue.push({
        type: 'LAND_ON_SPACE',
        playerIndex: targetIndex,
        source: 'EFFECT',
        sourceEventId: event.id,
        abilityId: event.abilityId,
        depth: event.depth + 1,
        previousPosition: current.position,
        newPosition: nextPosition,
        spaceNumber: nextPosition,
      });
      const milestone = milestoneType(nextPosition);
      if (space.type === 'MILESTONE' && milestone && space.trigger === 'LAND') {
        queue.push({
          type: 'MILESTONE',
          playerIndex: targetIndex,
          source: 'EFFECT',
          sourceEventId: event.id,
          abilityId: event.abilityId,
          depth: event.depth + 1,
          spaceNumber: nextPosition,
          milestoneType: milestone,
        });
      }
      if (space.type === 'UPGRADE_TOKEN' && space.trigger === 'LAND') {
        queue.push({
          type: 'UPGRADE_TOKEN_GAINED',
          playerIndex: targetIndex,
          source: 'EFFECT',
          sourceEventId: event.id,
          abilityId: event.abilityId,
          depth: event.depth + 1,
          delta: 1,
          spaceNumber: nextPosition,
          description: `${state.players[targetIndex].displayName} gained 1 Upgrade Token at space ${nextPosition}.`,
        });
      }
      if (space.effectId && space.trigger === 'LAND') {
        queue.push({
          type: 'BOARD_EFFECT_RESOLVED',
          playerIndex: targetIndex,
          source: 'EFFECT',
          sourceEventId: event.id,
          abilityId: event.abilityId,
          depth: event.depth + 1,
          total: state.roll?.total,
          spaceNumber: nextPosition,
          effectId: space.effectId,
        });
      }
    }
  }
  const finalPosition = state.players[targetIndex].position;
  const finalSpace = getSpace(finalPosition);
  if (finalSpace) {
    const landing = { playerIndex: targetIndex, space: finalSpace };
    const slot = finalSpace.type === 'MILESTONE' ? milestoneSlot(finalSpace.number) : null;
    if (finalSpace.type === 'CAREER_CHANGE') {
      state = { ...state, turnIndex: targetIndex, phase: 'decision', pending: { kind: 'CAREER', stage: 'choice', space: finalSpace.number }, lastLanding: landing };
    } else if (slot && !state.players[targetIndex].equipment[slot]) {
      state = {
        ...state,
        turnIndex: targetIndex,
        phase: 'decision',
        pending: { kind: 'ASSET', slot, space: finalSpace.number, offeredAssetIds: slot === 'companion' ? undefined : drawAssets(slot) },
        lastLanding: landing,
      };
    } else if (finalSpace.deck) {
      const draw = drawCardFromPiles(state.cardPiles, finalSpace.deck);
      queue.push({
        type: 'CARD_DRAW',
        playerIndex: targetIndex,
        source: 'EFFECT',
        sourceEventId: event.id,
        abilityId: event.abilityId,
        depth: event.depth + 1,
        spaceNumber: finalSpace.number,
        deck: finalSpace.deck,
        cardId: draw.cardId,
      });
      state = {
        ...state,
        cardPiles: draw.cardPiles,
        turnIndex: targetIndex,
        phase: 'decision',
        pending: { kind: 'CARD', deck: finalSpace.deck, space: finalSpace.number, cardId: draw.cardId, stage: 'draw' },
        lastLanding: landing,
      };
    } else if (targetIndex === state.turnIndex) {
      state = { ...state, phase: 'landed', pending: null, lastLanding: landing };
    } else {
      state = { ...state, lastLanding: landing };
    }
  }
  return state;
}

function applyEffect(match: Match, queue: EventDraft[], actor: MatchPlayer, event: AnyGameEvent, effect: EffectDefinition): Match {
  const reason = effect.reason ?? getAbility(event.abilityId ?? '')?.name ?? event.type;
  switch (effect.type) {
    case 'ADD_WEALTH':
      return resolveTargets(match, actor, event, effect.target).reduce((state, index) => applyStatDelta(state, queue, event, actor, 'wealth', effect.amount, effect.type, index, reason), match);
    case 'REMOVE_WEALTH':
      return resolveTargets(match, actor, event, effect.target).reduce((state, index) => applyStatDelta(state, queue, event, actor, 'wealth', -effect.amount, effect.type, index, reason), match);
    case 'ADD_AI_SKILL':
      return resolveTargets(match, actor, event, effect.target).reduce((state, index) => applyStatDelta(state, queue, event, actor, 'aiSkill', effect.amount, effect.type, index, reason), match);
    case 'REMOVE_AI_SKILL':
      return resolveTargets(match, actor, event, effect.target).reduce((state, index) => applyStatDelta(state, queue, event, actor, 'aiSkill', -effect.amount, effect.type, index, reason), match);
    case 'ADD_FAME':
      return resolveTargets(match, actor, event, effect.target).reduce((state, index) => applyStatDelta(state, queue, event, actor, 'fame', effect.amount, effect.type, index, reason), match);
    case 'REMOVE_FAME':
      return resolveTargets(match, actor, event, effect.target).reduce((state, index) => applyStatDelta(state, queue, event, actor, 'fame', -effect.amount, effect.type, index, reason), match);
    case 'ADD_LIFESTYLE':
      return resolveTargets(match, actor, event, effect.target).reduce((state, index) => applyStatDelta(state, queue, event, actor, 'lifestyle', effect.amount, effect.type, index, reason), match);
    case 'REMOVE_LIFESTYLE':
      return resolveTargets(match, actor, event, effect.target).reduce((state, index) => applyStatDelta(state, queue, event, actor, 'lifestyle', -effect.amount, effect.type, index, reason), match);
    case 'ADD_INFLUENCE':
      return resolveTargets(match, actor, event, effect.target).reduce((state, index) => applyStatDelta(state, queue, event, actor, 'influence', effect.amount, effect.type, index, reason), match);
    case 'REMOVE_INFLUENCE':
      return resolveTargets(match, actor, event, effect.target).reduce((state, index) => applyStatDelta(state, queue, event, actor, 'influence', -effect.amount, effect.type, index, reason), match);
    case 'PROTECT_FROM_EFFECT':
      return resolveTargets(match, actor, event, effect.target).reduce((state, index) => ({
        ...state,
        effectProtections: {
          ...state.effectProtections,
          [state.players[index].playerId]: [
            ...(state.effectProtections[state.players[index].playerId] ?? []),
            { remaining: effect.amount ?? 1, blockedEffectTypes: effect.blockedEffectTypes },
          ],
        },
      }), match);
    case 'MODIFY_REWARD':
      return resolveTargets(match, actor, event, effect.target).reduce((state, index) => ({
        ...state,
        rewardModifiers: {
          ...state.rewardModifiers,
          [`${state.players[index].playerId}:${effect.stat}`]: {
            stat: effect.stat,
            amount: (state.rewardModifiers[`${state.players[index].playerId}:${effect.stat}`]?.amount ?? 0) + effect.amount,
          },
        },
      }), match);
    case 'MODIFY_SALARY':
      return resolveTargets(match, actor, event, effect.target).reduce((state, index) => {
        const previousSalary = state.players[index].salaryAmount;
        const newSalary = Math.max(0, previousSalary + effect.amount);
        if (newSalary === previousSalary) return state;
        queue.push({
          type: 'PLAYER_AFFECTED',
          playerIndex: index,
          source: 'EFFECT',
          sourceEventId: event.id,
          abilityId: event.abilityId,
          depth: event.depth + 1,
          effectType: 'MODIFY_SALARY',
          previousSalary,
          newSalary,
          description: `${state.players[index].displayName} salary changed from ${previousSalary} to ${newSalary}.`,
        });
        return updatePlayer(state, index, (player) => ({ ...player, salaryAmount: newSalary }));
      }, match);
    case 'TRIGGER_EVENT':
      queue.push({
        ...effect.payload,
        type: effect.eventType,
        playerIndex: actor.slot,
        source: 'ABILITY',
        abilityId: event.abilityId,
        sourceEventId: event.id,
        depth: event.depth + 1,
      } as EventDraft);
      return match;
    case 'DRAW_CARD':
      return resolveTargets(match, actor, event, effect.target).reduce((state, index) => {
        const draw = drawCardFromPiles(state.cardPiles, effect.deck);
        queue.push({
          type: 'CARD_DRAW',
          playerIndex: index,
          source: 'ABILITY',
          abilityId: event.abilityId,
          sourceEventId: event.id,
          depth: event.depth + 1,
          deck: effect.deck,
          spaceNumber: state.players[index].position,
          cardId: draw.cardId,
        });
        const landingSpace = getSpace(state.players[index].position);
        return {
          ...state,
          cardPiles: draw.cardPiles,
          turnIndex: index,
          phase: 'decision',
          pending: { kind: 'CARD', deck: effect.deck, space: state.players[index].position, cardId: draw.cardId, stage: 'draw' },
          lastLanding: landingSpace ? { playerIndex: index, space: landingSpace } : state.lastLanding,
        };
      }, match);
    case 'MOVE_PLAYER': {
      return resolveTargets(match, actor, event, effect.target).reduce(
        (state, index) => applyMovePlayerEffect(state, queue, actor, index, event, effect.amount),
        match,
      );
    }
    case 'AFFECT_OTHER_PLAYER':
      return resolveTargets(match, actor, event, effect.target ?? 'LANDED_ON_PLAYER').reduce(
        (state, index) => effect.effects.reduce(
          (nestedState, nestedEffect) => applyEffect(nestedState, queue, actor, { ...event, targetPlayerId: nestedState.players[index].playerId, targetPlayerIndex: index }, nestedEffect),
          state,
        ),
        match,
      );
  }
}

function stableUnitValue(key: string): number {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0x100000000;
}

function cardTargetIndices(
  match: Match,
  actor: MatchPlayer,
  event: AnyGameEvent,
  target: CardTarget = 'SELF',
  careerTag?: import('./careers').CareerCategoryTag,
  salt = '',
): number[] {
  let indices: number[];
  switch (target) {
    case 'SELF':
      indices = [actor.slot];
      break;
    case 'ALL_OPPONENTS':
      indices = match.players.flatMap((player, index) => player.slot === actor.slot ? [] : [index]);
      break;
    case 'RANDOM_OPPONENT': {
      const opponents = match.players.flatMap((player, index) => player.slot === actor.slot ? [] : [index]);
      indices = opponents.length ? [opponents[Math.floor(stableUnitValue(`${event.id}:${salt}:target`) * opponents.length)]] : [];
      break;
    }
    case 'WEALTH_LEADER':
    case 'WEALTH_TRAILER': {
      const opponents = match.players
        .map((player, index) => ({ player, index }))
        .filter(({ player }) => player.slot !== actor.slot)
        .sort((left, right) => {
          const difference = target === 'WEALTH_LEADER'
            ? right.player.wealth - left.player.wealth
            : left.player.wealth - right.player.wealth;
          return difference || left.player.slot - right.player.slot;
        });
      indices = opponents.length ? [opponents[0].index] : [];
      break;
    }
  }
  return careerTag
    ? indices.filter(index => getCareer(match.players[index].careerId ?? '')?.tags.includes(careerTag))
    : indices;
}

function cardStatEffectType(stat: PlayerStat, amount: number): EffectType {
  const suffix: Record<PlayerStat, string> = {
    wealth: 'WEALTH',
    aiSkill: 'AI_SKILL',
    fame: 'FAME',
    lifestyle: 'LIFESTYLE',
    influence: 'INFLUENCE',
  };
  return `${amount < 0 ? 'REMOVE' : 'ADD'}_${suffix[stat]}` as EffectType;
}

function boardEffectTargets(
  match: Match,
  actor: MatchPlayer,
  event: AnyGameEvent,
  target: BoardEffectTarget,
  salt: string,
): number[] {
  const opponents = match.players.flatMap((player, index) => player.slot === actor.slot ? [] : [index]);
  switch (target) {
    case 'SELF':
      return [actor.slot];
    case 'ALL_PLAYERS':
      return match.players.map((_, index) => index);
    case 'ALL_OTHER_PLAYERS':
      return opponents;
    case 'LANDED_ON_PLAYER': {
      const spaceNumber = event.spaceNumber ?? actor.position;
      return match.players.flatMap((player, index) => index !== actor.slot && player.position === spaceNumber ? [index] : []);
    }
    case 'PLAYER_AHEAD': {
      const ahead = opponents
        .filter((index) => match.players[index].position > actor.position)
        .sort((left, right) => match.players[left].position - match.players[right].position || match.players[left].slot - match.players[right].slot);
      return ahead.slice(0, 1);
    }
    case 'PLAYER_BEHIND': {
      const behind = opponents
        .filter((index) => match.players[index].position < actor.position)
        .sort((left, right) => match.players[right].position - match.players[left].position || match.players[left].slot - match.players[right].slot);
      return behind.slice(0, 1);
    }
    case 'WEALTH_LEADER':
      return match.players
        .map((player, index) => ({ player, index }))
        .sort((left, right) => right.player.wealth - left.player.wealth || left.player.slot - right.player.slot)
        .slice(0, 1)
        .map(({ index }) => index);
    case 'WEALTH_TRAILER':
      return match.players
        .map((player, index) => ({ player, index }))
        .sort((left, right) => left.player.wealth - right.player.wealth || left.player.slot - right.player.slot)
        .slice(0, 1)
        .map(({ index }) => index);
    case 'RANDOM_OPPONENT':
      return opponents.length
        ? [opponents[Math.floor(stableUnitValue(`${event.id}:${salt}:board-target`) * opponents.length)]]
        : [];
  }
}

function applyBoardEffect(match: Match, queue: EventDraft[], event: AnyGameEvent, effect: BoardEffectDefinition): Match {
  let state = match;
  const rollTotal = event.total ?? state.roll?.total ?? 0;

  for (const [actionIndex, action] of effect.effects.entries()) {
    const actor = state.players[event.playerIndex];
    const targets = boardEffectTargets(state, actor, event, action.target, `${effect.id}:${actionIndex}`);
    if (action.kind === 'STAT') {
      const amount = action.amount + (action.perRoll ?? 0) * rollTotal;
      if (amount === 0) continue;
      for (const target of targets) {
        if (action.careerTags?.length) {
          const career = getCareer(state.players[target].careerId ?? '');
          if (!career || !action.careerTags.some((tag) => career.tags.includes(tag))) continue;
        }
        state = applyStatDelta(
          state,
          queue,
          event,
          state.players[event.playerIndex],
          action.stat,
          amount,
          cardStatEffectType(action.stat, amount),
          target,
          `${effect.label}: ${effect.description}`,
        );
      }
      continue;
    }

    for (const target of targets) {
      if (target === event.playerIndex) continue;
      const wealthBefore = state.players[target].wealth;
      state = applyStatDelta(
        state,
        queue,
        event,
        state.players[event.playerIndex],
        'wealth',
        -action.amount,
        cardStatEffectType('wealth', -action.amount),
        target,
        `${effect.label}: rival transfer`,
      );
      const transferred = wealthBefore - state.players[target].wealth;
      if (transferred > 0) {
        state = applyStatDelta(
          state,
          queue,
          event,
          state.players[event.playerIndex],
          'wealth',
          transferred,
          cardStatEffectType('wealth', transferred),
          event.playerIndex,
          `${effect.label}: rival transfer`,
        );
      }
    }
  }
  return state;
}

function applyCardEffects(
  match: Match,
  queue: EventDraft[],
  event: AnyGameEvent,
  cardId: string,
  effects: readonly CardEffect[],
  salt = 'root',
): Match {
  const card = getCard(cardId);
  if (!card) throw new Error(`Cannot resolve unknown card ${cardId}`);
  let state = match;
  effects.forEach((effect, effectIndex) => {
    const effectSalt = `${salt}:${effectIndex}`;
    if (effect.kind === 'RISK') {
      if (effect.chance < 0 || effect.chance > 1) throw new Error(`Invalid risk chance on ${cardId}`);
      const outcome = stableUnitValue(`${event.id}:${cardId}:${effectSalt}`) < effect.chance ? effect.win : effect.loss;
      state = applyCardEffects(state, queue, event, cardId, outcome, effectSalt);
      return;
    }

    const target = effect.kind === 'TRANSFER_WEALTH' ? effect.target : 'target' in effect ? effect.target ?? 'SELF' : 'SELF';
    const careerTag = effect.kind === 'TRANSFER_WEALTH' || !('careerTag' in effect) ? undefined : effect.careerTag;
    const targets = cardTargetIndices(state, state.players[event.playerIndex], event, target, careerTag, effectSalt);
    for (const targetIndex of targets) {
      const targetEvent: AnyGameEvent = {
        ...event,
        targetPlayerId: state.players[targetIndex].playerId,
        targetPlayerIndex: targetIndex,
      };
      const actor = state.players[event.playerIndex];
      switch (effect.kind) {
        case 'UPGRADE_TOKEN':
          if (!Number.isInteger(effect.amount) || effect.amount <= 0) {
            throw new Error(`Invalid Upgrade Token amount on ${cardId}`);
          }
          queue.push({
            type: 'UPGRADE_TOKEN_GAINED',
            playerIndex: targetIndex,
            source: 'EFFECT',
            sourceEventId: event.id,
            abilityId: event.abilityId,
            depth: event.depth + 1,
            delta: effect.amount,
            reason: effect.reason ?? card.title,
            description: `${state.players[targetIndex].displayName} gained ${effect.amount} Upgrade Token${effect.amount === 1 ? '' : 's'} from ${card.title}.`,
          });
          break;
        case 'STAT':
          state = applyStatDelta(
            state,
            queue,
            targetEvent,
            actor,
            effect.stat,
            effect.amount,
            cardStatEffectType(effect.stat, effect.amount),
            targetIndex,
            effect.reason ?? card.title,
          );
          break;
        case 'TRANSFER_WEALTH': {
          const amount = Math.max(0, effect.amount);
          const previousWealth = state.players[targetIndex].wealth;
          state = applyStatDelta(state, queue, targetEvent, actor, 'wealth', -amount, 'REMOVE_WEALTH', targetIndex, effect.reason ?? card.title);
          const transferred = previousWealth - state.players[targetIndex].wealth;
          if (transferred > 0) {
            state = applyStatDelta(state, queue, targetEvent, actor, 'wealth', transferred, 'ADD_WEALTH', event.playerIndex, effect.reason ?? card.title);
          }
          break;
        }
        case 'MODIFY_SALARY':
          state = applyEffect(state, queue, actor, targetEvent, {
            type: 'MODIFY_SALARY',
            amount: effect.amount,
            target: 'AFFECTED_PLAYER',
            reason: effect.reason ?? card.title,
          });
          break;
        case 'PROTECT':
          state = applyEffect(state, queue, actor, targetEvent, {
            type: 'PROTECT_FROM_EFFECT',
            amount: effect.amount ?? 1,
            blockedEffectTypes: effect.blockedEffectTypes,
            target: 'AFFECTED_PLAYER',
            reason: effect.reason ?? card.title,
          });
          break;
        case 'REWARD_MODIFIER':
          state = applyEffect(state, queue, actor, targetEvent, {
            type: 'MODIFY_REWARD',
            amount: effect.amount,
            stat: effect.stat,
            target: 'AFFECTED_PLAYER',
            reason: effect.reason ?? card.title,
          });
          break;
      }
    }
  });
  return state;
}

function nativeSecondaryEvents(match: Match, event: AnyGameEvent): EventDraft[] {
  if (event.type !== 'DICE_ROLL') return [];
  const drafts: EventDraft[] = [];
  if (event.doubles) drafts.push({ type: 'DOUBLES_ROLLED', playerIndex: event.playerIndex, source: 'GAME', sourceEventId: event.id, depth: event.depth + 1, die1: event.die1, die2: event.die2, total: event.total });
  if (event.total === 2) drafts.push({ type: 'ROLL_OF_2', playerIndex: event.playerIndex, source: 'GAME', sourceEventId: event.id, depth: event.depth + 1, die1: event.die1, die2: event.die2, total: event.total });
  if (event.total === 8) drafts.push({ type: 'ROLL_OF_8', playerIndex: event.playerIndex, source: 'GAME', sourceEventId: event.id, depth: event.depth + 1, die1: event.die1, die2: event.die2, total: event.total });
  return drafts;
}

function abilityOutcomeSummary(before: Match, after: Match, queuedEvents: number): string {
  const changes: string[] = [];
  const statLabels: Record<PlayerStat, string> = {
    wealth: 'Wealth',
    aiSkill: 'AI Skill',
    fame: 'Fame',
    lifestyle: 'Lifestyle',
    influence: 'Influence',
  };
  const formatChange = (stat: PlayerStat, delta: number) => {
    const sign = delta > 0 ? '+' : '−';
    const amount = stat === 'wealth'
      ? `$${Math.abs(delta).toLocaleString()}`
      : Math.abs(delta).toLocaleString();
    return `${sign}${amount}`;
  };

  for (const oldPlayer of before.players) {
    const newPlayer = after.players.find((player) => player.playerId === oldPlayer.playerId);
    if (!newPlayer) continue;
    for (const stat of ['wealth', 'aiSkill', 'fame', 'lifestyle', 'influence'] as const) {
      const delta = newPlayer[stat] - oldPlayer[stat];
      if (delta) changes.push(`${oldPlayer.displayName} ${statLabels[stat]} ${formatChange(stat, delta)}`);
    }
    const salaryDelta = newPlayer.salaryAmount - oldPlayer.salaryAmount;
    if (salaryDelta) changes.push(`${oldPlayer.displayName} salary ${formatChange('wealth', salaryDelta)}`);
    if (newPlayer.position !== oldPlayer.position) {
      changes.push(`${oldPlayer.displayName} moved to space ${newPlayer.position}`);
    }
    const protectionCount = (protections: Match['effectProtections'][string] = []) =>
      protections.reduce((total, protection) => total + protection.remaining, 0);
    const protectionDelta = protectionCount(after.effectProtections[oldPlayer.playerId])
      - protectionCount(before.effectProtections[oldPlayer.playerId]);
    if (protectionDelta > 0) {
      changes.push(`${oldPlayer.displayName} gained ${protectionDelta} protection charge${protectionDelta === 1 ? '' : 's'}`);
    }
  }

  for (const [key, modifier] of Object.entries(after.rewardModifiers)) {
    const oldAmount = before.rewardModifiers[key]?.amount ?? 0;
    const added = modifier.amount - oldAmount;
    if (added > 0) changes.push(`next positive ${modifier.stat} gain +${added}`);
  }

  if (after.pending?.kind === 'CARD' && before.pending?.kind !== 'CARD') {
    changes.push(`drew a ${after.pending.deck.toUpperCase()} card`);
  }
  if (!changes.length && queuedEvents > 0) {
    changes.push(`${queuedEvents} follow-up event${queuedEvents === 1 ? '' : 's'} queued`);
  }
  return changes.join('; ');
}

function runAbilities(match: Match, queue: EventDraft[], event: AnyGameEvent): Match {
  let next = match;
  for (const player of next.players) {
    for (const abilityId of getPlayerAbilityIds(player)) {
      const ability = getAbility(abilityId);
      if (!ability || ability.trigger !== event.type || !abilityAvailable(next, player, abilityId)) continue;
      if (!ability.conditions.every((condition) => meetsCondition(next, player, event, condition))) continue;
      const beforeAbility = next;
      const queuedBefore = queue.length;
      let abilityState = markAbilityUsed(next, player, abilityId);
      for (const effect of ability.effects) {
        abilityState = applyEffect(abilityState, queue, player, { ...event, abilityId, source: 'ABILITY' }, effect);
      }
      const outcome = abilityOutcomeSummary(beforeAbility, abilityState, queue.length - queuedBefore);
      const triggerLabel = `${eventLabel(event)} (${event.type.replace(/_/g, ' ')})`;
      next = pushLog(
        abilityState,
        {
          ...event,
          id: `${event.id}:ability:${abilityId}:${player.playerId}`,
          abilityId,
          source: 'ABILITY',
          description: ability.description,
          playerId: player.playerId,
          playerIndex: player.slot,
        },
        ability.name,
        `Triggered by ${triggerLabel}. ${ability.description}${outcome ? ` Result: ${outcome}.` : ' No immediate resource change.'}`,
        ability.effects[0]?.amount,
      );
    }
  }
  return next;
}

export function resolveEventQueue(match: Match, drafts: EventDraft[]): Match {
  let state = match;
  const queue = [...drafts];
  let processed = 0;
  while (queue.length && processed < MAX_EVENT_CHAIN) {
    const draft = queue.shift()!;
    if ((draft.depth ?? 0) > MAX_EVENT_DEPTH) continue;
    const [nextState, event] = createEvent(state, draft);
    state = pushLog(nextState, event);
    if (event.type === 'CARD_RESOLVED' && event.cardId) {
      const card = getCard(event.cardId);
      if (!card || card.deck !== event.deck) throw new Error(`Invalid card resolution event ${event.cardId}`);
      state = applyCardEffects(state, queue, event, card.id, card.effects);
    }
    if (event.type === 'UPGRADE_TOKEN_GAINED' && Number.isInteger(event.delta) && (event.delta ?? 0) > 0) {
      state = updatePlayer(state, event.playerIndex, (player) => ({
        ...player,
        upgradeTokens: player.upgradeTokens + (event.delta ?? 0),
      }));
    }
    if (event.type === 'BOARD_EFFECT_RESOLVED') {
      const effect = getBoardEffect(event.effectId);
      if (!effect) throw new Error(`Board effect event references unknown effect ${event.effectId ?? '(missing)'}.`);
      state = applyBoardEffect(state, queue, event, effect);
    }
    queue.push(...nativeSecondaryEvents(state, event));
    state = runAbilities(state, queue, event);
    processed += 1;
  }
  return state;
}

export function addNativeStatChange(
  match: Match,
  drafts: EventDraft[],
  playerIndex: number,
  stat: PlayerStat,
  previousValue: number,
  newValue: number,
  reason: string,
) {
  if (previousValue === newValue) return;
  drafts.push({
    type: statEventType(stat),
    playerIndex,
    source: 'GAME',
    stat,
    previousValue,
    newValue,
    delta: newValue - previousValue,
    reason,
  });
}

export function createPurchaseEvents(
  playerIndex: number,
  assetId: string,
  previousWealth: number,
  newWealth: number,
): EventDraft[] {
  const asset = getAsset(assetId);
  if (!asset) return [];
  const categoryType: Record<typeof asset.category, GameEventType> = {
    car: 'CAR_PURCHASED',
    lifestyle: 'LIFESTYLE_PURCHASED',
    pet: 'PET_PURCHASED',
    investment: 'INVESTMENT_PURCHASED',
    property: 'PROPERTY_PURCHASED',
  };
  return [
    {
      type: 'ASSET_PURCHASED',
      playerIndex,
      assetId: asset.id,
      assetName: asset.name,
      category: asset.category,
      cost: asset.cost,
      previousWealth,
      newWealth,
    },
    {
      type: categoryType[asset.category],
      playerIndex,
      assetId: asset.id,
      assetName: asset.name,
      category: asset.category,
      cost: asset.cost,
      previousWealth,
      newWealth,
    },
  ];
}
