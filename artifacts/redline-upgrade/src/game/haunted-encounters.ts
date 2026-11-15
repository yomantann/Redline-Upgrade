import type { PlayerStat } from './player';

export type HauntedDoorId = 'LANTERN' | 'MIRROR' | 'BONE';
export type HauntedDoorChange = 'OPEN_SHORTCUT' | 'CLOSE_ROUTE' | 'CURSE_SPACE' | 'SAFE_SPACE';
export type HauntedDoorEffect =
  | { kind: 'STAT'; stat: PlayerStat; amount: number }
  | { kind: 'TRANSFER'; target: 'WEALTH_LEADER' | 'WEALTH_TRAILER'; amount: number }
  | { kind: 'TOKEN' }
  | { kind: 'GROUP_STAT'; stat: PlayerStat; amount: number }
  | { kind: 'SKIP_TURN' }
  | { kind: 'BOARD_CHANGE'; change: HauntedDoorChange };

export interface HauntedDoorChoice {
  id: HauntedDoorId;
  label: string;
  clue: string;
  character: 'LANTERN' | 'MIRROR' | 'BONE';
}

export interface HauntedDoorOutcome {
  id: string;
  title: string;
  reveal: string;
  effect: HauntedDoorEffect;
}

export const CURSED_DOOR_CHOICES: readonly HauntedDoorChoice[] = [
  { id: 'LANTERN', label: 'THE LANTERN DOOR', clue: 'A warm light moves behind the glass.', character: 'LANTERN' },
  { id: 'MIRROR', label: 'THE MIRROR DOOR', clue: 'Your reflection reaches for the handle first.', character: 'MIRROR' },
  { id: 'BONE', label: 'THE BONE DOOR', clue: 'Something knocks from the other side.', character: 'BONE' },
];

const OUTCOMES: Record<HauntedDoorId, readonly HauntedDoorOutcome[]> = {
  LANTERN: [
    { id: 'kindly-host', title: 'THE KINDLY HOST', reveal: 'A pale host presses a sealed envelope into your hand.', effect: { kind: 'STAT', stat: 'wealth', amount: 35_000 } },
    { id: 'borrowed-luck', title: 'BORROWED LUCK', reveal: 'A candle burns backward. You keep the wick.', effect: { kind: 'TOKEN' } },
    { id: 'warm-memory', title: 'A WARM MEMORY', reveal: 'The house returns one bright detail you had forgotten.', effect: { kind: 'STAT', stat: 'fame', amount: 1 } },
    { id: 'open-stair', title: 'THE HOUSE OPENS', reveal: 'A hidden stairwell connects the gallery to the west wing.', effect: { kind: 'BOARD_CHANGE', change: 'OPEN_SHORTCUT' } },
  ],
  MIRROR: [
    { id: 'split-reflection', title: 'SPLIT REFLECTION', reveal: 'Your reflection keeps the best part of the story.', effect: { kind: 'STAT', stat: 'influence', amount: 2 } },
    { id: 'mirror-toll', title: 'THE MIRROR TOLL', reveal: 'A double steps out and asks for a very real fee.', effect: { kind: 'STAT', stat: 'wealth', amount: -30_000 } },
    { id: 'borrowed-face', title: 'BORROWED FACE', reveal: 'Someone else is briefly more convincing than you.', effect: { kind: 'TRANSFER', target: 'WEALTH_LEADER', amount: 20_000 } },
    { id: 'quiet-hall', title: 'THE HALL GROWS QUIET', reveal: 'The house seals one loud passage and leaves another open.', effect: { kind: 'BOARD_CHANGE', change: 'CLOSE_ROUTE' } },
  ],
  BONE: [
    { id: 'marrow-gift', title: 'MARROW GIFT', reveal: 'A skeletal hand drops a small fortune at your feet.', effect: { kind: 'STAT', stat: 'wealth', amount: 80_000 } },
    { id: 'the-house-laughs', title: 'THE HOUSE LAUGHS', reveal: 'Every portrait laughs at once. Nobody forgets it.', effect: { kind: 'GROUP_STAT', stat: 'fame', amount: 1 } },
    { id: 'empty-pockets', title: 'EMPTY POCKETS', reveal: 'A hungry shadow takes a little from the whole table.', effect: { kind: 'GROUP_STAT', stat: 'wealth', amount: -15_000 } },
    { id: 'bone-garden', title: 'THE GARDEN TURNS', reveal: 'The thorns curl back from one passage and claim another.', effect: { kind: 'BOARD_CHANGE', change: 'CURSE_SPACE' } },
    { id: 'the-last-knock', title: 'THE LAST KNOCK', reveal: 'The door follows you into the next turn.', effect: { kind: 'SKIP_TURN' } },
    { id: 'mercy-at-midnight', title: 'MERCY AT MIDNIGHT', reveal: 'A ghostly hand wipes one curse from the house.', effect: { kind: 'BOARD_CHANGE', change: 'SAFE_SPACE' } },
  ],
};

export function getHauntedDoorOutcome(choice: HauntedDoorId, random = Math.random): HauntedDoorOutcome {
  const pool = OUTCOMES[choice];
  return pool[Math.floor(random() * pool.length)] ?? pool[0];
}
