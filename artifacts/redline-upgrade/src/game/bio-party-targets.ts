import type { PartyChallenge } from './cards';

/** Only turn-owner selections are submitted; group/self participation is derived identically everywhere. */
export function getPartyParticipantIds(
  challenge: PartyChallenge,
  playerIds: readonly string[],
  actorId: string,
  selectedIds: readonly string[],
  resolution?: string,
): string[] {
  const target = challenge.choices?.find(choice => choice.label === resolution)?.target ?? challenge.target;
  switch (target) {
    case 'SELF': return [actorId];
    case 'ALL_PLAYERS': return [...playerIds];
    case 'ALL_EXCEPT_SELF': return playerIds.filter(id => id !== actorId);
    case 'SELF_AND_SELECTED': return [actorId, ...selectedIds];
    case 'SELF_OR_ALL_PLAYERS': return [];
    default: return [...selectedIds];
  }
}
