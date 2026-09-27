import { characters } from './characters';
import { createPlayer, type Player } from './player';
import { getSpace, type BoardSpace } from './board-data';
import { careers, startingWealth, type SalaryTier } from './careers';

export type MatchPlayer = Player & { isCPU: boolean; slot: number };
export type TurnPhase = 'ready' | 'rolling' | 'reveal' | 'moving' | 'landed';
export interface DiceResult { die1: number; die2: number; total: number }
export interface Landing { playerIndex: number; space: BoardSpace }
export interface WealthEvent { id: number; playerIndex: number; amount: number; kind: 'PAYDAY'; space: number }
export interface Match {
  players: MatchPlayer[];
  turnIndex: number;
  round: number;
  phase: TurnPhase;
  roll: DiceResult | null;
  stepsRemaining: number;
  lastLanding: Landing | null;
  wealthEvents: WealthEvent[];
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
  | { type: 'NEXT_TURN' };

/** A guarded, pure turn reducer: stale timers and repeated clicks cannot advance an invalid phase. */
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
      return { ...match, phase: 'landed', stepsRemaining: 0, lastLanding: { playerIndex: match.turnIndex, space } };
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
      if (stepsRemaining > 0 && position < 75) return { ...match, players, wealthEvents, stepsRemaining };
      return { ...match, players, wealthEvents, stepsRemaining: 0, phase: 'landed', lastLanding: { playerIndex: match.turnIndex, space } };
    }
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