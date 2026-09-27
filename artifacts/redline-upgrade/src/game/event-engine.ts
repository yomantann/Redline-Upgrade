import { assetOptions, getAsset, type AssetCategory, type AssetSlot } from './assets';
import { getAbility, type EffectDefinition, type EffectType } from './abilities';
import { getSpace } from './board-data';
import { getCareer } from './careers';
import { getCharacter } from './characters';
import type { AnyGameEvent, EventLogEntry, EventSource, GameEventType } from './events/types';
import type { Match, MatchPlayer, RewardModifierState } from './match';
import { applySalaryGate } from './movement-events';
import type { PlayerStat } from './player';

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
  deck?: 'wealth' | 'ai' | 'fame' | 'lifestyle' | 'influence' | 'gamble';
  cardId?: string;
  assetId?: string;
  assetName?: string;
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
    case 'CARD_DRAW': return 'CARD DRAW';
    case 'CARD_RESOLVED': return 'CARD RESOLVED';
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
    case 'CARD_DRAW':
      return `${player.displayName} drew a ${event.deck} card.`;
    case 'CARD_RESOLVED':
      return `${player.displayName} resolved a ${event.deck} card.`;
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
      if (space.deck) {
        queue.push({
          type: 'CARD_DRAW',
          playerIndex: targetIndex,
          source: 'EFFECT',
          sourceEventId: event.id,
          abilityId: event.abilityId,
          depth: event.depth + 1,
          spaceNumber: nextPosition,
          deck: space.deck,
        });
      }
    }
  }
  const finalPosition = state.players[targetIndex].position;
  const finalSpace = getSpace(finalPosition);
  if (targetIndex === state.turnIndex && finalSpace) {
    const landing = { playerIndex: targetIndex, space: finalSpace };
    const slot = finalSpace.type === 'MILESTONE' ? milestoneSlot(finalSpace.number) : null;
    if (finalSpace.type === 'CAREER_CHANGE') {
      state = { ...state, phase: 'decision', pending: { kind: 'CAREER', stage: 'choice', space: finalSpace.number }, lastLanding: landing };
    } else if (slot && !state.players[targetIndex].equipment[slot]) {
      state = {
        ...state,
        phase: 'decision',
        pending: { kind: 'ASSET', slot, space: finalSpace.number, offeredAssetIds: slot === 'companion' ? undefined : drawAssets(slot) },
        lastLanding: landing,
      };
    } else if (finalSpace.deck) {
      state = { ...state, phase: 'decision', pending: { kind: 'CARD', deck: finalSpace.deck, space: finalSpace.number }, lastLanding: landing };
    } else {
      state = { ...state, phase: 'landed', pending: null, lastLanding: landing };
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
      return resolveTargets(match, actor, event, effect.target).filter((index) => index === match.turnIndex).reduce((state, index) => {
        queue.push({
          type: 'CARD_DRAW',
          playerIndex: index,
          source: 'ABILITY',
          abilityId: event.abilityId,
          sourceEventId: event.id,
          depth: event.depth + 1,
          deck: effect.deck,
          spaceNumber: state.players[index].position,
        });
        const landingSpace = getSpace(state.players[index].position);
        return {
          ...state,
          phase: 'decision',
          pending: { kind: 'CARD', deck: effect.deck, space: state.players[index].position },
          lastLanding: landingSpace ? { playerIndex: index, space: landingSpace } : state.lastLanding,
        };
      }, match);
    case 'MOVE_PLAYER': {
      return resolveTargets(match, actor, event, effect.target).filter((index) => index === match.turnIndex).reduce(
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

function nativeSecondaryEvents(match: Match, event: AnyGameEvent): EventDraft[] {
  if (event.type !== 'DICE_ROLL') return [];
  const drafts: EventDraft[] = [];
  if (event.doubles) drafts.push({ type: 'DOUBLES_ROLLED', playerIndex: event.playerIndex, source: 'GAME', sourceEventId: event.id, depth: event.depth + 1, die1: event.die1, die2: event.die2, total: event.total });
  if (event.total === 2) drafts.push({ type: 'ROLL_OF_2', playerIndex: event.playerIndex, source: 'GAME', sourceEventId: event.id, depth: event.depth + 1, die1: event.die1, die2: event.die2, total: event.total });
  if (event.total === 8) drafts.push({ type: 'ROLL_OF_8', playerIndex: event.playerIndex, source: 'GAME', sourceEventId: event.id, depth: event.depth + 1, die1: event.die1, die2: event.die2, total: event.total });
  return drafts;
}

function runAbilities(match: Match, queue: EventDraft[], event: AnyGameEvent): Match {
  let next = match;
  for (const player of next.players) {
    for (const abilityId of getPlayerAbilityIds(player)) {
      const ability = getAbility(abilityId);
      if (!ability || ability.trigger !== event.type || !abilityAvailable(next, player, abilityId)) continue;
      if (!ability.conditions.every((condition) => meetsCondition(next, player, event, condition))) continue;
      let abilityState = markAbilityUsed(next, player, abilityId);
      for (const effect of ability.effects) {
        abilityState = applyEffect(abilityState, queue, player, { ...event, abilityId, source: 'ABILITY' }, effect);
      }
      next = pushLog(
        abilityState,
        { ...event, id: `${event.id}:ability:${abilityId}:${player.playerId}`, abilityId, source: 'ABILITY', description: ability.description, playerId: player.playerId, playerIndex: player.slot },
        ability.name,
        ability.description,
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
