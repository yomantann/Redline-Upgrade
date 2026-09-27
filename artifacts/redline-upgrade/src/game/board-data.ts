export type SpaceType = 'NORMAL' | 'EVENT' | 'MILESTONE' | 'GAMBLE';

export interface BoardSpace {
  number: number;
  type: SpaceType;
  payday: boolean;
}

const events = new Set([3, 7, 12, 17, 22, 27, 32, 37, 42, 47, 52, 57, 62, 67, 72]);
const milestones = new Set([10, 20, 30, 45, 60, 75]);
const gambles = new Set([15, 35, 50, 70]);
// Payday is independent of space type, so later spaces can combine it with an Event.
export const PAYDAY_SPACES = new Set([6, 18, 29, 41, 54, 66, 73]);

export const BOARD_SPACES: BoardSpace[] = Array.from({ length: 75 }, (_, index) => {
  const number = index + 1;
  const type: SpaceType = events.has(number) ? 'EVENT' : milestones.has(number) ? 'MILESTONE' : gambles.has(number) ? 'GAMBLE' : 'NORMAL';
  return { number, type, payday: PAYDAY_SPACES.has(number) };
});

export function getSpace(position: number): BoardSpace | null {
  return position === 0 ? null : BOARD_SPACES[position - 1] ?? null;
}