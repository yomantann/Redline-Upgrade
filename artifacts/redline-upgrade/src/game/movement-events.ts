import { getSpace } from './board-data';
import type { EventDraft } from './event-engine';
import type { Match } from './match';

interface EventContext {
  source?: 'GAME' | 'ABILITY' | 'EFFECT';
  sourceEventId?: string;
  abilityId?: string;
  depth?: number;
}

export function applySalaryGate(
  match: Match,
  playerIndex: number,
  previousPosition: number,
  position: number,
  context: EventContext = {},
): { match: Match; drafts: EventDraft[] } {
  const space = getSpace(position);
  if (!space?.payday || position <= previousPosition) return { match, drafts: [] };
  const player = match.players[playerIndex];
  const previousWealth = player.wealth;
  const newWealth = previousWealth + player.salaryAmount;
  return {
    match: {
      ...match,
      players: match.players.map((item, index) => index === playerIndex ? { ...item, wealth: newWealth } : item),
    },
    drafts: [
      {
        type: 'SALARY_GATE',
        playerIndex,
        previousPosition,
        newPosition: position,
        spaceNumber: position,
        salaryAmount: player.salaryAmount,
        previousWealth,
        newWealth,
        ...context,
      },
      {
        type: 'WEALTH_CHANGED',
        playerIndex,
        stat: 'wealth',
        previousValue: previousWealth,
        newValue: newWealth,
        delta: newWealth - previousWealth,
        reason: 'Salary Gate',
        ...context,
      },
    ],
  };
}
