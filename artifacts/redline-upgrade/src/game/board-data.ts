import type { DeckId } from './decks';
import { BOARD_EFFECTS_BY_SPACE } from './board-effects';

export type SpaceType = 'NORMAL' | 'EVENT' | 'CARD' | 'MILESTONE' | 'GAMBLE' | 'SALARY_GATE' | 'CAREER_CHANGE' | 'UPGRADE_TOKEN';
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
  effectId?: string;
}

const milestones = new Set([10, 30, 45, 60, 75]);
const gambles = new Set([15, 50, 70]);
// Phase 14 keeps the established token behavior and makes the early route read clearly:
// space 2 joins the two existing token sources without introducing a new system.
const upgradeTokenSpaces = new Set([2, 14, 55]);
// Deck assignments preserve the existing board route; landing triggers the live deck draw.
// Phase 14 adds only ordinary spaces, spread across the latter half of the circuit.
export const PHASE_14_5_CONVERTED_EVENT_SPACES: Partial<Record<number, DeckId>> = {
  5: 'wealth', 13: 'ai', 20: 'lifestyle', 24: 'fame', 27: 'wealth',
  33: 'ai', 37: 'wealth', 39: 'influence', 47: 'fame', 49: 'wealth',
  57: 'influence', 64: 'wealth', 67: 'fame', 72: 'wealth',
};

const cardSpaces: Partial<Record<number, DeckId>> = {
  3: 'wealth', 7: 'ai', 12: 'fame', 17: 'lifestyle', 22: 'influence',
  26: 'lifestyle', 32: 'wealth', 36: 'influence', 42: 'ai',
  48: 'wealth', 52: 'fame', 58: 'fame', 62: 'influence', 69: 'ai',
  ...PHASE_14_5_CONVERTED_EVENT_SPACES,
};
export const PHASE_14_BOARD_CHANGES = {
  openRoad: [1],
  upgradeToken: [2],
  addedCardSpaces: [26, 36, 48, 58, 69],
} as const;
// Payday is independent of space type, so later spaces can combine it with an Event.
export const PAYDAY_SPACES = new Set([6, 18, 29, 41, 54, 66, 73]);

export const BOARD_SPACES: BoardSpace[] = Array.from({ length: 75 }, (_, index) => {
  const number = index + 1;
  const isOpenRoad = number === 1;
  const deck = cardSpaces[number] ?? (gambles.has(number) ? 'gamble' : undefined);
  const effect = isOpenRoad ? undefined : BOARD_EFFECTS_BY_SPACE.get(number);
  const type: SpaceType = isOpenRoad ? 'NORMAL' : number === 35 ? 'CAREER_CHANGE' : PAYDAY_SPACES.has(number) ? 'SALARY_GATE'
    : milestones.has(number) ? 'MILESTONE' : upgradeTokenSpaces.has(number) ? 'UPGRADE_TOKEN' : gambles.has(number) ? 'GAMBLE'
    : deck ? 'CARD' : effect ? 'EVENT' : 'NORMAL';
  const details: Record<SpaceType, [string, string, string, SpaceTrigger]> = {
    NORMAL: ['normal', 'Open Road', 'A regular space. No effect is active here.', 'NONE'],
    EVENT: ['event', 'Event', 'A predictable board effect resolves when you land here.', 'LAND'],
    CARD: [deck ?? 'wealth', `${deck?.toUpperCase()} Card`, `Land here to draw and resolve a card from the ${deck} deck.`, 'LAND'],
    GAMBLE: ['gamble', 'Gamble Card', 'Land here to draw and resolve a high-risk Gamble card.', 'LAND'],
    SALARY_GATE: ['salary', 'Salary Gate', 'Pass through or land here to receive your exact current salary once.', 'LAND_OR_PASS'],
    CAREER_CHANGE: ['career', 'Career Change', 'Pass through or land here to keep your career or choose between two new opportunities.', 'LAND_OR_PASS'],
    MILESTONE: ['milestone', 'Milestone', 'A milestone stop. Choose an asset to buy, or skip.', 'LAND'],
    UPGRADE_TOKEN: ['upgrade-token', 'Upgrade Token', 'Land here to gain 1 match-only Upgrade Token.', 'LAND'],
  };
  const [defaultIcon, defaultLabel, defaultDescription, defaultTrigger] = details[type];
  const milestone: Partial<Record<number, [string, string, string, SpaceTrigger]>> = {
    10: ['car', 'Car', 'Land here to choose one of three randomly offered cars, or skip.', 'LAND'],
    30: ['lifestyle', 'Lifestyle', 'Land here to choose one of three randomly offered lifestyles, or skip.', 'LAND'],
    45: ['pet', 'Pet / Investment', 'Land here to choose a Pet or Investment, then choose one of three offers, or skip.', 'LAND'],
    60: ['property', 'Property', 'Land here to choose one of three randomly offered properties, or skip.', 'LAND'],
    75: ['finish', 'Finish', 'The finish line. Reach it to lock in your place and make your final choice.', 'NONE'],
  };
  const [icon, label, description, trigger] = milestone[number]
    ?? (effect ? [effect.icon, effect.label, effect.description, 'LAND'] : [defaultIcon, defaultLabel, defaultDescription, defaultTrigger]);
  return {
    number,
    type,
    payday: PAYDAY_SPACES.has(number),
    icon: isOpenRoad ? 'normal' : icon,
    secondaryIcon: number === 45 ? 'investment' : undefined,
    label: isOpenRoad ? 'OPEN ROAD' : label,
    description: isOpenRoad ? 'Open Road. No gameplay effect is triggered here.' : description,
    trigger: isOpenRoad ? 'NONE' : trigger,
    deck,
    effectId: isOpenRoad ? undefined : effect?.id,
  };
});

export function getSpace(position: number): BoardSpace | null {
  return position === 0 ? null : BOARD_SPACES[position - 1] ?? null;
}