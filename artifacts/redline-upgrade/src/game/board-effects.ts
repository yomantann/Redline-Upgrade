import type { CareerCategoryTag } from './careers';
import type { PlayerStat } from './player';

export type BoardEffectTone = 'wealth' | 'ai' | 'fame' | 'lifestyle' | 'influence' | 'career' | 'interaction' | 'risk';

export type BoardEffectTarget =
  | 'SELF'
  | 'LANDED_ON_PLAYER'
  | 'PLAYER_AHEAD'
  | 'PLAYER_BEHIND'
  | 'WEALTH_LEADER'
  | 'WEALTH_TRAILER'
  | 'RANDOM_OPPONENT'
  | 'ALL_OTHER_PLAYERS'
  | 'ALL_PLAYERS';

export type BoardEffectAction =
  | {
      kind: 'STAT';
      target: BoardEffectTarget;
      stat: PlayerStat;
      amount: number;
      perRoll?: number;
      careerTags?: readonly CareerCategoryTag[];
    }
  | {
      kind: 'TRANSFER_WEALTH';
      target: Exclude<BoardEffectTarget, 'SELF' | 'ALL_OTHER_PLAYERS' | 'ALL_PLAYERS'>;
      amount: number;
    };

export interface BoardEffectDefinition {
  id: string;
  spaceNumber: number;
  label: string;
  description: string;
  icon: string;
  tone: BoardEffectTone;
  effects: readonly BoardEffectAction[];
}

const allBoardEffectDefinitions: readonly BoardEffectDefinition[] = [
  {
    id: 'quick-contract',
    spaceNumber: 1,
    label: 'QUICK CONTRACT',
    description: 'A local client signs on. Gain $4,000 Wealth.',
    icon: 'wealth',
    tone: 'wealth',
    effects: [{ kind: 'STAT', target: 'SELF', stat: 'wealth', amount: 4000 }],
  },
  {
    id: 'unexpected-expense',
    spaceNumber: 5,
    label: 'UNEXPECTED EXPENSE',
    description: 'A repair bill hits. Lose $3,000 Wealth.',
    icon: 'wealth',
    tone: 'wealth',
    effects: [{ kind: 'STAT', target: 'SELF', stat: 'wealth', amount: -3000 }],
  },
  {
    id: 'ai-lab',
    spaceNumber: 13,
    label: 'AI LAB',
    description: 'Gain 1 AI Skill. Digital careers gain 1 additional AI Skill.',
    icon: 'ai',
    tone: 'ai',
    effects: [
      { kind: 'STAT', target: 'SELF', stat: 'aiSkill', amount: 1 },
      { kind: 'STAT', target: 'SELF', stat: 'aiSkill', amount: 1, careerTags: ['digital'] },
    ],
  },
  {
    id: 'lifestyle-upgrade',
    spaceNumber: 20,
    label: 'LIFESTYLE UPGRADE',
    description: 'Gain 1 Lifestyle. Flexible careers gain 1 additional Lifestyle.',
    icon: 'lifestyle',
    tone: 'lifestyle',
    effects: [
      { kind: 'STAT', target: 'SELF', stat: 'lifestyle', amount: 1 },
      { kind: 'STAT', target: 'SELF', stat: 'lifestyle', amount: 1, careerTags: ['flex', 'gig'] },
    ],
  },
  {
    id: 'public-moment',
    spaceNumber: 24,
    label: 'PUBLIC MOMENT',
    description: 'Gain 1 Fame. Media and fame careers gain 1 additional Fame.',
    icon: 'fame',
    tone: 'fame',
    effects: [
      { kind: 'STAT', target: 'SELF', stat: 'fame', amount: 1 },
      { kind: 'STAT', target: 'SELF', stat: 'fame', amount: 1, careerTags: ['media', 'fame'] },
    ],
  },
  {
    id: 'overhead-fee',
    spaceNumber: 27,
    label: 'OVERHEAD FEE',
    description: 'An operating cost comes due. Lose $2,000 Wealth.',
    icon: 'wealth',
    tone: 'wealth',
    effects: [{ kind: 'STAT', target: 'SELF', stat: 'wealth', amount: -2000 }],
  },
  {
    id: 'product-launch',
    spaceNumber: 33,
    label: 'PRODUCT LAUNCH',
    description: 'Gain 1 AI Skill. Digital careers also gain $2,000 Wealth.',
    icon: 'ai',
    tone: 'ai',
    effects: [
      { kind: 'STAT', target: 'SELF', stat: 'aiSkill', amount: 1 },
      { kind: 'STAT', target: 'SELF', stat: 'wealth', amount: 2000, careerTags: ['digital'] },
    ],
  },
  {
    id: 'corporate-connection',
    spaceNumber: 37,
    label: 'CORPORATE CONNECTION',
    description: 'Gain $3,000 Wealth. Business and professional careers gain $2,000 more.',
    icon: 'career',
    tone: 'career',
    effects: [
      { kind: 'STAT', target: 'SELF', stat: 'wealth', amount: 3000 },
      { kind: 'STAT', target: 'SELF', stat: 'wealth', amount: 2000, careerTags: ['business', 'entrepreneur', 'professional'] },
    ],
  },
  {
    id: 'rival-contract',
    spaceNumber: 39,
    label: 'RIVAL CONTRACT',
    description: 'Gain 1 Influence and take up to $2,000 from the player immediately ahead.',
    icon: 'influence',
    tone: 'interaction',
    effects: [
      { kind: 'STAT', target: 'SELF', stat: 'influence', amount: 1 },
      { kind: 'TRANSFER_WEALTH', target: 'PLAYER_AHEAD', amount: 2000 },
    ],
  },
  {
    id: 'rival-spotlight',
    spaceNumber: 47,
    label: 'RIVAL SPOTLIGHT',
    description: 'Gain 1 Fame. The player immediately behind you loses 1 Fame.',
    icon: 'fame',
    tone: 'interaction',
    effects: [
      { kind: 'STAT', target: 'SELF', stat: 'fame', amount: 1 },
      { kind: 'STAT', target: 'PLAYER_BEHIND', stat: 'fame', amount: -1 },
    ],
  },
  {
    id: 'roll-dividend',
    spaceNumber: 49,
    label: 'ROLL DIVIDEND',
    description: 'Gain $1,000 Wealth for each pip in the roll that brought you here.',
    icon: 'wealth',
    tone: 'risk',
    effects: [{ kind: 'STAT', target: 'SELF', stat: 'wealth', amount: 0, perRoll: 1000 }],
  },
  {
    id: 'shared-network',
    spaceNumber: 57,
    label: 'SHARED NETWORK',
    description: 'The whole table gains 1 Influence.',
    icon: 'influence',
    tone: 'interaction',
    effects: [{ kind: 'STAT', target: 'ALL_PLAYERS', stat: 'influence', amount: 1 }],
  },
  {
    id: 'market-catch-up',
    spaceNumber: 64,
    label: 'MARKET CATCH-UP',
    description: 'The player with the least Wealth gains $5,000.',
    icon: 'wealth',
    tone: 'wealth',
    effects: [{ kind: 'STAT', target: 'WEALTH_TRAILER', stat: 'wealth', amount: 5000 }],
  },
  {
    id: 'final-spotlight',
    spaceNumber: 67,
    label: 'FINAL SPOTLIGHT',
    description: 'Gain 1 Fame. Media and fame careers gain 1 additional Fame.',
    icon: 'fame',
    tone: 'fame',
    effects: [
      { kind: 'STAT', target: 'SELF', stat: 'fame', amount: 1 },
      { kind: 'STAT', target: 'SELF', stat: 'fame', amount: 1, careerTags: ['media', 'fame'] },
    ],
  },
  {
    id: 'deadline-cost',
    spaceNumber: 72,
    label: 'DEADLINE COST',
    description: 'Pay $2,500 Wealth. Gig careers recover $1,500.',
    icon: 'wealth',
    tone: 'risk',
    effects: [
      { kind: 'STAT', target: 'SELF', stat: 'wealth', amount: -2500 },
      { kind: 'STAT', target: 'SELF', stat: 'wealth', amount: 1500, careerTags: ['gig'] },
    ],
  },
];

export const BOARD_EFFECTS: readonly BoardEffectDefinition[] = allBoardEffectDefinitions
  .filter((effect) => effect.spaceNumber === 1);

export const BOARD_EFFECTS_BY_SPACE = new Map<number, BoardEffectDefinition>(
  BOARD_EFFECTS.map((effect) => [effect.spaceNumber, effect] as const),
);

const boardEffectsById = new Map(BOARD_EFFECTS.map((effect) => [effect.id, effect] as const));

export function getBoardEffect(effectId: string | undefined): BoardEffectDefinition | undefined {
  return effectId ? boardEffectsById.get(effectId) : undefined;
}