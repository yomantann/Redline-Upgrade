import type { DeckId } from './decks';
import { BOARD_EFFECTS_BY_SPACE } from './board-effects';
import type { BoardId } from './boards';

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

const BIO_PAYDAY_SPACES = new Set([6, 18, 29, 41, 54, 66, 73]);
const BIO_MILESTONES = new Set([10, 30, 45, 60, 75]);
const BIO_GAMBLES = new Set([15, 50, 70]);
const BIO_TOKENS = new Set([2, 14, 55]);
const BIO_DECK_SPACES: Partial<Record<number, DeckId>> = {
  3: 'wealth', 5: 'lifestyle', 7: 'ai', 9: 'fame', 12: 'influence',
  13: 'wealth', 16: 'ai', 17: 'lifestyle', 20: 'fame', 22: 'influence',
  23: 'wealth', 25: 'lifestyle', 27: 'ai', 28: 'fame', 32: 'influence',
  33: 'wealth', 34: 'lifestyle', 36: 'ai', 38: 'fame', 39: 'influence',
  42: 'wealth', 43: 'lifestyle', 44: 'ai', 46: 'fame', 48: 'influence',
  49: 'wealth', 52: 'lifestyle', 53: 'ai', 57: 'fame', 58: 'influence',
  59: 'wealth', 61: 'lifestyle', 63: 'ai', 64: 'fame', 68: 'influence',
  69: 'wealth', 71: 'lifestyle', 72: 'ai', 74: 'fame',
};
const BIO_PARTY_LABELS: Partial<Record<number, string>> = {
  3: 'GROUP TOAST', 5: 'DANCE DUEL', 7: 'BRAIN FREEZE', 9: 'SPOTLIGHT',
  12: 'SOCIAL CHAOS', 13: 'VIP TAB', 16: 'QUICK THINK', 17: 'DRINKING PARTNER',
  20: 'KARAOKE BREAK', 22: 'GROUP VOTE', 23: 'VIP LOUNGE', 25: 'PARTY TRADITION',
  27: 'SYSTEM OVERLOAD', 28: 'MAIN CHARACTER', 32: 'ALLIANCE', 33: 'CHAMPAGNE PROBLEMS',
  34: 'GROUP TOAST', 36: 'HUMAN CAPTCHA', 38: 'SPOTLIGHT', 39: 'THE ACCUSATION',
  42: 'LUXURY TOAST', 43: 'DANCE BREAK', 44: 'BRAIN FREEZE', 46: 'OPEN MIC',
  48: 'SOCIAL CHAOS', 49: 'VIP TAB', 52: 'PARTY TRADITION', 53: 'QUICK THINK',
  57: 'HEADLINER', 58: 'DRINKING PARTNER', 59: 'ROOFTOP TOAST', 61: 'LAST CALL',
  63: 'SYSTEM OVERLOAD', 64: 'SPOTLIGHT', 68: 'THE BETRAYAL', 69: 'VIP LOUNGE',
  71: 'GROUP TOAST', 72: 'BRAIN FREEZE', 74: 'LAST CALL',
};
const BIO_BOARD_SPACES: BoardSpace[] = Array.from({ length: 75 }, (_, index) => {
  const number = index + 1;
  const payday = BIO_PAYDAY_SPACES.has(number);
  const milestone = BIO_MILESTONES.has(number);
  const gamble = BIO_GAMBLES.has(number);
  const deck = BIO_DECK_SPACES[number] ?? (gamble ? 'gamble' : undefined);
  const type: SpaceType = number === 1 ? 'NORMAL'
    : number === 35 ? 'CAREER_CHANGE'
      : payday ? 'SALARY_GATE'
        : milestone ? 'MILESTONE'
          : BIO_TOKENS.has(number) ? 'UPGRADE_TOKEN'
            : gamble ? 'GAMBLE'
              : deck ? 'CARD' : 'NORMAL';
  const milestoneLabels: Record<number, [string, string, string]> = {
    10: ['car', 'OPENING NIGHT', 'Choose a car milestone asset or skip.'],
    30: ['lifestyle', 'VIP MOMENT', 'Choose a lifestyle milestone asset or skip.'],
    45: ['pet', 'CREW PICK', 'Choose a companion or investment milestone asset, then an offer, or skip.'],
    60: ['property', 'ROOFTOP SUITE', 'Choose a property milestone asset or skip.'],
    75: ['finish', 'FINAL ARENA', 'Reach the final arena to lock in your place and make your final choice.'],
  };
  const special = milestoneLabels[number];
  const partyLabel = BIO_PARTY_LABELS[number];
  const deckLabels: Partial<Record<DeckId, string>> = {
    wealth: 'WEALTH CARD',
    ai: 'AI SKILL CARD',
    fame: 'FAME CARD',
    lifestyle: 'LIFESTYLE CARD',
    influence: 'INFLUENCE CARD',
    gamble: 'GAMBLE CARD',
  };
  const label = number === 1 ? 'START / CLUB ENTRANCE'
    : special?.[1] ?? (type === 'SALARY_GATE' ? 'SALARY GATE'
      : type === 'CAREER_CHANGE' ? 'CAREER SWITCH'
        : type === 'UPGRADE_TOKEN' ? 'UPGRADE TOKEN'
          : type === 'GAMBLE' ? 'GAMBLE CARD'
            : type === 'CARD' ? deckLabels[deck!] ?? 'CARD'
              : partyLabel ?? 'STANDARD SPACE');
  const description = number === 1 ? 'Start your Bio Upgrade run here.'
    : special?.[2] ?? (type === 'SALARY_GATE' ? 'Pass through or land here to receive your current salary once.'
      : type === 'CAREER_CHANGE' ? 'Keep your current career or choose between two new opportunities.'
        : type === 'UPGRADE_TOKEN' ? 'Gain one match-only Upgrade Token.'
          : type === 'GAMBLE' ? 'Draw one random card from the Gamble deck.'
            : type === 'CARD' ? `Draw one random card from the ${deck} deck.`
              : 'Standard space. No effect triggers here.');
  return {
    number,
    type,
    payday,
    icon: special?.[0] ?? (type === 'SALARY_GATE' ? 'salary'
      : type === 'CAREER_CHANGE' ? 'career'
        : type === 'UPGRADE_TOKEN' ? 'upgrade-token'
          : type === 'GAMBLE' ? 'gamble'
            : deck ?? 'normal'),
    label,
    description,
    trigger: type === 'SALARY_GATE' || type === 'CAREER_CHANGE' ? 'LAND_OR_PASS'
      : type === 'NORMAL' ? 'NONE' : 'LAND',
    deck,
  };
});

export function getBoardSpaces(boardId: BoardId = 'REDLINE_UPGRADE'): BoardSpace[] {
  return boardId === 'BIO_UPGRADE' ? BIO_BOARD_SPACES : BOARD_SPACES;
}

export function getSpace(position: number, boardId: BoardId = 'REDLINE_UPGRADE'): BoardSpace | null {
  return position === 0 ? null : getBoardSpaces(boardId)[position - 1] ?? null;
}