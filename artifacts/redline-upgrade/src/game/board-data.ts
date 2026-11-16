import type { DeckId } from './decks';
import { BOARD_EFFECTS_BY_SPACE } from './board-effects';
import type { BoardId } from './boards';

export type SpaceType = 'NORMAL' | 'EVENT' | 'CARD' | 'MILESTONE' | 'GAMBLE' | 'SALARY_GATE' | 'CAREER_CHANGE' | 'UPGRADE_TOKEN' | 'CURSED_DOOR';
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
    CURSED_DOOR: ['haunted-door', 'Cursed Door', 'Choose a sealed door and reveal the encounter inside.', 'LAND'],
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

const HAUNTED_SPACE_NAMES = [
  'Iron Gate', 'Rusted Bell', 'Moonlit Courtyard', 'The Watchman', 'Thorn Walk', 'Empty Carriage', 'Gravel Drive', 'Black Ivy Arch', 'The First Footstep', 'Carriage House',
  'Chapel Fork', 'Candlelit Gallery', 'Saint Orra’s Niche', 'Quiet Reliquary', 'Bell Tower Stairs', 'The Hanging Rope', 'Choir Loft', 'Broken Bellworks', 'The Ringer’s Room', 'Chapel Yard',
  'North Cloister', 'Ashen Fountain', 'The Glasshouse', 'Night Conservatory', 'Withered Orchard', 'Moth Garden', 'The Well That Answers', 'Root Cellar', 'Kitchen Passage', 'Mirror Hall',
  'Shattered Gallery', 'The Backward Portrait', 'The Long Portrait Hall', 'The Painted Twins', 'The Listening Frame', 'West Gallery', 'The Empty Ballroom', 'Dance Floor Dust', 'Gallery Junction', 'The Grand Stair',
  'Servants’ Landing', 'The Locked Nursery', 'Cradle Room', 'The Nursery Window', 'The Long Corridor', 'The Wrong Door', 'The East Landing', 'Widow’s Room', 'Sunken Crossing', 'Flooded Crypt',
  'The Drowned Chapel', 'Bone Bridge', 'Skull Toll', 'The Low Vault', 'The Rusted Grate', 'River of Keys', 'Crypt Steps', 'The Burial Ledger', 'Old Family Tomb', 'The Rooted Crypt',
  'Witchlight Garden', 'The Crooked Sundial', 'Mourner’s Path', 'Final Approach', 'Old Catacombs', 'The Bell Crypt', 'Grave of the Architect', 'The Buried Kitchen', 'The House Beneath', 'Graveyard Gate',
  'The Watcher’s Lawn', 'The Final Hedge', 'Cursed Estate', 'The Last Threshold', 'The Black Door',
] as const;
const HAUNTED_PAYDAY_SPACES = new Set([6, 18, 29, 41, 54, 66, 73]);
const HAUNTED_MILESTONES = new Set([10, 30, 45, 60, 75]);
const HAUNTED_TOKEN_SPACES = new Set([2, 14, 55]);
export const HAUNTED_DOOR_SPACES = new Set([5, 19, 27, 43, 57, 68]);
const HAUNTED_CARD_DECK_BY_SPACE: Readonly<Record<number, DeckId>> = {
  3: 'wealth',
  8: 'ai',
  13: 'fame',
  16: 'lifestyle',
  22: 'influence',
  25: 'gamble',
  32: 'wealth',
  37: 'ai',
  39: 'fame',
  47: 'lifestyle',
  50: 'influence',
  58: 'gamble',
  62: 'wealth',
  69: 'ai',
  72: 'fame',
};
const HAUNTED_BOARD_SPACES: BoardSpace[] = HAUNTED_SPACE_NAMES.map((name, index) => {
  const number = index + 1;
  const payday = HAUNTED_PAYDAY_SPACES.has(number);
  const milestone = HAUNTED_MILESTONES.has(number);
  const token = HAUNTED_TOKEN_SPACES.has(number);
  const door = HAUNTED_DOOR_SPACES.has(number);
  const deck = HAUNTED_CARD_DECK_BY_SPACE[number];
  const type: SpaceType = number === 35 ? 'CAREER_CHANGE'
    : payday ? 'SALARY_GATE'
      : milestone ? 'MILESTONE'
        : token ? 'UPGRADE_TOKEN' : door ? 'CURSED_DOOR' : deck ? 'CARD' : 'NORMAL';
  const milestoneInfo: Partial<Record<number, [string, string, string]>> = {
    10: ['car', 'Cursed Carriage', 'Choose a milestone vehicle, or skip.'],
    30: ['lifestyle', 'The Portrait Cloak', 'Choose a milestone lifestyle, or skip.'],
    45: ['pet', 'The House Familiar', 'Choose a companion or investment, then an offer, or skip.'],
    60: ['property', 'The Buried Estate', 'Choose a property milestone, or skip.'],
    75: ['finish', 'The Black Door', 'Reach the estate finish to lock in your place and choose your ending.'],
  };
  const special = milestoneInfo[number];
  const deckLabel: Record<DeckId, string> = {
    wealth: 'WEALTH',
    ai: 'AI SKILL',
    fame: 'FAME',
    lifestyle: 'LIFESTYLE',
    influence: 'INFLUENCE',
    gamble: 'GAMBLE',
  };
  const icon = special?.[0] ?? (payday ? 'salary' : token ? 'upgrade-token' : number === 35 ? 'career' : door ? 'haunted-door' : deck ?? 'normal');
  const label = special?.[1] ?? (payday ? 'HAUNTED PAYDAY' : token ? 'CURSED TOKEN' : number === 35 ? 'CAREER SWITCH' : door ? 'CURSED DOOR' : deck ? `${deckLabel[deck]} CARD` : name.toUpperCase());
  const description = special?.[2] ?? (payday
    ? 'Pass through or land here to receive your current salary once.'
    : token
      ? 'Gain one match-only Upgrade Token.'
      : number === 35
        ? 'Keep your current career or choose another opportunity.'
        : door
          ? 'Choose a sealed door and reveal the encounter inside.'
          : deck
            ? `Draw a Haunted ${deckLabel[deck]} card and resolve its effect.`
        : `${name}. The estate watches as you pass.`);
  return {
    number,
    type,
    payday,
    icon,
    label,
    description,
    trigger: payday || number === 35 ? 'LAND_OR_PASS' : type === 'NORMAL' ? 'NONE' : 'LAND',
    deck,
  };
});

export function getBoardSpaces(boardId: BoardId = 'REDLINE_UPGRADE'): BoardSpace[] {
  if (boardId === 'BIO_UPGRADE') return BIO_BOARD_SPACES;
  if (boardId === 'HAUNTED_UPGRADE') return HAUNTED_BOARD_SPACES;
  return BOARD_SPACES;
}

export function getSpace(position: number, boardId: BoardId = 'REDLINE_UPGRADE'): BoardSpace | null {
  return position === 0 ? null : getBoardSpaces(boardId)[position - 1] ?? null;
}