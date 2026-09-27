import type { DeckId } from './decks';

export type SpaceType = 'NORMAL' | 'EVENT' | 'CARD' | 'MILESTONE' | 'GAMBLE' | 'SALARY_GATE' | 'CAREER_CHANGE';
export type SpaceTrigger = 'NONE' | 'LAND' | 'LAND_OR_PASS';

export interface BoardSpace {
  number: number;
  type: SpaceType;
  payday: boolean;
  icon: string;
  label: string;
  description: string;
  trigger: SpaceTrigger;
  deck?: DeckId;
  secondaryIcon?: string;
}

const events = new Set([3, 7, 12, 17, 22, 27, 32, 37, 42, 47, 52, 57, 62, 67, 72]);
const milestones = new Set([10, 30, 45, 60, 75]);
const gambles = new Set([15, 50, 70]);
// Deck assignments preserve the existing board route; landing triggers the live deck draw.
const cardSpaces: Partial<Record<number, DeckId>> = {
  3: 'wealth', 7: 'ai', 12: 'fame', 17: 'lifestyle', 22: 'influence',
  32: 'wealth', 42: 'ai', 52: 'fame', 62: 'influence',
};
// Payday is independent of space type, so later spaces can combine it with an Event.
export const PAYDAY_SPACES = new Set([6, 18, 29, 41, 54, 66, 73]);

export const BOARD_SPACES: BoardSpace[] = Array.from({ length: 75 }, (_, index) => {
  const number = index + 1;
  const deck = cardSpaces[number] ?? (gambles.has(number) ? 'gamble' : undefined);
  const type: SpaceType = number === 35 ? 'CAREER_CHANGE' : PAYDAY_SPACES.has(number) ? 'SALARY_GATE'
    : milestones.has(number) ? 'MILESTONE' : gambles.has(number) ? 'GAMBLE'
    : deck ? 'CARD' : events.has(number) ? 'EVENT' : 'NORMAL';
  const details: Record<SpaceType, [string, string, string, SpaceTrigger]> = {
    NORMAL: ['normal', 'Open Road', 'A regular space. No effect is active here.', 'NONE'],
    EVENT: ['event', 'Event', 'A future event space. No effect is active yet.', 'NONE'],
    CARD: [deck ?? 'wealth', `${deck?.toUpperCase()} Card`, `Land here to draw and resolve a card from the ${deck} deck.`, 'LAND'],
    GAMBLE: ['gamble', 'Gamble Card', 'Land here to draw and resolve a high-risk Gamble card.', 'LAND'],
    SALARY_GATE: ['salary', 'Salary Gate', 'Pass through or land here to receive your exact current salary once.', 'LAND_OR_PASS'],
    CAREER_CHANGE: ['career', 'Career Change', 'Pass through or land here to keep your career or choose between two new opportunities.', 'LAND_OR_PASS'],
    MILESTONE: ['milestone', 'Milestone', 'A special destination on the circuit.', 'LAND'],
  };
  const [defaultIcon, defaultLabel, defaultDescription, defaultTrigger] = details[type];
  const milestone: Partial<Record<number, [string, string, string, SpaceTrigger]>> = {
    10: ['car', 'Car', 'Land here to choose one of three randomly offered cars, or skip.', 'LAND'],
    30: ['lifestyle', 'Lifestyle', 'Land here to choose one of three randomly offered lifestyles, or skip.', 'LAND'],
    45: ['pet', 'Pet / Investment', 'Land here to choose a Pet or Investment, then choose one of three offers, or skip.', 'LAND'],
    60: ['property', 'Property', 'Land here to choose one of three randomly offered properties, or skip.', 'LAND'],
    75: ['finish', 'Finish', 'The finish boundary. End-game rules are reserved for a later phase.', 'NONE'],
  };
  const [icon, label, description, trigger] = milestone[number] ?? [defaultIcon, defaultLabel, defaultDescription, defaultTrigger];
  return { number, type, payday: PAYDAY_SPACES.has(number), icon, secondaryIcon: number === 45 ? 'investment' : undefined, label, description, trigger, deck };
});

export function getSpace(position: number): BoardSpace | null {
  return position === 0 ? null : BOARD_SPACES[position - 1] ?? null;
}