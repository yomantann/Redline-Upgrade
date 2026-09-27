import { characters } from './characters';
import { createPlayer, type Player } from './player';
import { getSpace, type BoardSpace } from './board-data';
import { careers, startingWealth, type SalaryTier } from './careers';
import { assetOptions, getAsset, type AssetCategory, type AssetSlot } from './assets';

export type MatchPlayer = Player & { isCPU: boolean; slot: number };
export type TurnPhase = 'ready' | 'rolling' | 'reveal' | 'moving' | 'decision' | 'landed';
export interface DiceResult { die1: number; die2: number; total: number }
export interface Landing { playerIndex: number; space: BoardSpace }
export interface WealthEvent { id: number; playerIndex: number; amount: number; kind: 'PAYDAY' | 'PURCHASE'; space: number }
export type PendingDecision =
  | { kind: 'ASSET'; slot: AssetSlot; space: number; category?: 'pet' | 'investment' }
  | { kind: 'CAREER'; space: 35; stage: 'choice' | 'offers' | 'salary'; options?: [string, string]; selectedCareerId?: string; previousCareerId?: string };
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

export function createMatch(characterId: string): Match {
  const ids = [characterId, ...pickUnique(characters.map(({ id }) => id).filter(id => id !== characterId), 3)];
  const assignedCareers = pickUnique(careers, 4);
  return {
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
  };
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

function land(match: Match, space: BoardSpace): Match {
  const slot = space.type === 'MILESTONE' ? milestoneSlot(space.number) : null;
  const landing = { playerIndex: match.turnIndex, space };
  if (slot && !match.players[match.turnIndex].equipment[slot]) {
    return { ...match, phase: 'decision', stepsRemaining: 0, lastLanding: landing, pending: { kind: 'ASSET', slot, space: space.number } };
  }
  return { ...match, phase: 'landed', stepsRemaining: 0, lastLanding: landing, pending: null };
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
  // A career change replaces the salary/ability but never awards new starting Wealth
  // or removes previously earned stats and assets.
  return { ...match, players };
}

function purchase(match: Match, assetId: string): Match {
  const pending = match.pending;
  if (match.phase !== 'decision' || pending?.kind !== 'ASSET') return match;
  const asset = getAsset(assetId);
  const player = match.players[match.turnIndex];
  const category: AssetCategory | null = pending.slot === 'companion' ? pending.category ?? null : pending.slot;
  if (!asset || asset.category !== category || player.equipment[pending.slot] || asset.cost > player.wealth) return match;
  const players = match.players.map((item, index) => index === match.turnIndex ? {
    ...item,
    equipment: { ...item.equipment, [pending.slot]: assetId },
    wealth: item.wealth - asset.cost + (asset.effects.wealth ?? 0),
    aiSkill: item.aiSkill + (asset.effects.aiSkill ?? 0),
    fame: item.fame + (asset.effects.fame ?? 0),
    lifestyle: item.lifestyle + (asset.effects.lifestyle ?? 0),
    influence: item.influence + (asset.effects.influence ?? 0),
  } : item);
  const event: WealthEvent = { id: (match.wealthEvents.at(-1)?.id ?? 0) + 1, playerIndex: match.turnIndex, amount: -asset.cost + (asset.effects.wealth ?? 0), kind: 'PURCHASE', space: pending.space };
  return resume({ ...match, players, wealthEvents: [...match.wealthEvents, event] });
}

function autoDecide(match: Match): Match {
  const pending = match.pending;
  if (match.phase !== 'decision' || !match.players[match.turnIndex].isCPU || !pending) return match;
  const player = match.players[match.turnIndex];
  if (pending.kind === 'ASSET') {
    const categories: AssetCategory[] = pending.slot === 'companion'
      ? (player.careerId === 'degen-trader' || player.careerId === 'real-estate-investor' ? ['investment'] : ['pet'])
      : [pending.slot];
    const available = categories.flatMap(category => assetOptions(category))
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
    return purchase({ ...match, pending: { ...pending, category: chosen.category === 'pet' || chosen.category === 'investment' ? chosen.category : undefined } }, chosen.id);
  }
  if (Math.random() > 0.42) return resume(match);
  const options = careerOffers(player.careerId ?? '');
  const chosen = options.map(id => careers.find(career => career.id === id)!)
    .sort((a, b) => (b.salaryTiers[1] + Math.random() * 80000) - (a.salaryTiers[1] + Math.random() * 80000))[0];
  return resume(assignNewCareer(match, chosen.id));
}

/** Guard each transition so stale timers and repeated clicks cannot reapply an effect. */
export function advanceMatch(match: Match, action: MatchAction): Match {
  switch (action.type) {
    case 'ROLL': {
      if (match.phase !== 'ready') return match;
      const { die1, die2, total } = action.result;
      if (![die1, die2].every((n) => Number.isInteger(n) && n >= 1 && n <= 4) || total !== die1 + die2) {
        throw new Error('Invalid 2d4 roll');
      }
      return { ...match, phase: 'rolling', roll: action.result, stepsRemaining: total };
    }
    case 'REVEAL':
      return match.phase === 'rolling' ? { ...match, phase: 'reveal' } : match;
    case 'MOVE': {
      if (match.phase !== 'reveal') return match;
      if (match.players[match.turnIndex].position < 75) return { ...match, phase: 'moving' };
      const space = getSpace(75);
      if (!space) throw new Error('Missing finish space');
      return land(match, space);
    }
    case 'STEP': {
      if (match.phase !== 'moving') return match;
      const current = match.players[match.turnIndex];
      const position = Math.min(75, current.position + 1);
      const space = getSpace(position);
      if (!space) throw new Error(`Invalid movement position: ${position}`);
      // PASS effects resolve on entry, including the destination. LAND effects are handled
      // below only after movement ends; they must not grant this Payday a second time.
      const payday = space.payday && position !== current.position;
      const players = match.players.map((player, index) => index === match.turnIndex
        ? { ...player, position, wealth: player.wealth + (payday ? player.salaryAmount : 0) }
        : player);
      const wealthEvents = payday
        ? [...match.wealthEvents, { id: (match.wealthEvents.at(-1)?.id ?? 0) + 1, playerIndex: match.turnIndex, amount: current.salaryAmount, kind: 'PAYDAY' as const, space: position }]
        : match.wealthEvents;
      const stepsRemaining = match.stepsRemaining - 1;
      const moved = { ...match, players, wealthEvents, stepsRemaining };
      if (space.type === 'CAREER_CHANGE') {
        return { ...moved, phase: 'decision', pending: { kind: 'CAREER', stage: 'choice', space: 35 }, lastLanding: stepsRemaining <= 0 ? { playerIndex: match.turnIndex, space } : match.lastLanding };
      }
      if (stepsRemaining > 0 && position < 75) return moved;
      return land(moved, space);
    }
    case 'CHOOSE_ASSET_CATEGORY':
      return match.phase === 'decision' && match.pending?.kind === 'ASSET' && match.pending.slot === 'companion' && !match.pending.category
        ? { ...match, pending: { ...match.pending, category: action.category } } : match;
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
      const updated = assignNewCareer(match, action.careerId);
      return { ...updated, pending: { ...pending, stage: 'salary', selectedCareerId: action.careerId, previousCareerId: match.players[match.turnIndex].careerId ?? undefined } };
    }
    case 'ACKNOWLEDGE_CAREER':
      return match.phase === 'decision' && match.pending?.kind === 'CAREER' && match.pending.stage === 'salary' ? resume(match) : match;
    case 'AUTO_DECIDE':
      return autoDecide(match);
    case 'NEXT_TURN':
      if (match.phase !== 'landed') return match;
      return {
        ...match,
        turnIndex: (match.turnIndex + 1) % 4,
        round: match.turnIndex === 3 ? match.round + 1 : match.round,
        phase: 'ready',
        roll: null,
        stepsRemaining: 0,
      };
  }
}