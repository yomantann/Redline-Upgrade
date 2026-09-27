import { getCareer } from './careers';
import type { Player } from './player';

export type CareerTarget =
  | { kind: 'career'; ids: readonly string[] }
  | { kind: 'category'; ids: readonly string[] };

export interface CareerWealthEffect {
  target: CareerTarget;
  amount: number;
}

/** A target may name one or more careers OR one or more categories. No event deck is required. */
export function matchesCareerTarget(player: Pick<Player, 'careerId'>, target: CareerTarget): boolean {
  if (!player.careerId) return false;
  if (target.kind === 'career') return target.ids.includes(player.careerId);
  const career = getCareer(player.careerId);
  return Boolean(career && target.ids.includes(career.categoryId));
}

/** Pure helper for future Wealth events; the caller chooses if and when an event takes effect. */
export function applyCareerWealthEffect<T extends Player>(players: readonly T[], effect: CareerWealthEffect): T[] {
  return players.map(player => matchesCareerTarget(player, effect.target)
    ? { ...player, wealth: Math.max(0, player.wealth + effect.amount) }
    : player);
}