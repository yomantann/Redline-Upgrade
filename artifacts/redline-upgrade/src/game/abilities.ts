import type { AssetCategory } from './assets';
import type { CareerCategoryTag } from './careers';
import type { DeckId } from './decks';
import type { GameEventType } from './events/types';
import type { PlayerStat } from './player';

export type AbilityMode = 'PASSIVE' | 'ACTIVE';
export type AbilityTarget = 'SELF' | 'EVENT_PLAYER' | 'LANDED_ON_PLAYER' | 'AFFECTED_PLAYER' | 'ALL_OTHER_PLAYERS' | 'ALL_PLAYERS';

export type EffectType =
  | 'ADD_WEALTH'
  | 'REMOVE_WEALTH'
  | 'ADD_AI_SKILL'
  | 'REMOVE_AI_SKILL'
  | 'ADD_FAME'
  | 'REMOVE_FAME'
  | 'ADD_LIFESTYLE'
  | 'REMOVE_LIFESTYLE'
  | 'ADD_INFLUENCE'
  | 'REMOVE_INFLUENCE'
  | 'MOVE_PLAYER'
  | 'DRAW_CARD'
  | 'AFFECT_OTHER_PLAYER'
  | 'PROTECT_FROM_EFFECT'
  | 'MODIFY_REWARD'
  | 'MODIFY_SALARY'
  | 'TRIGGER_EVENT';

export interface AbilityUsageLimit {
  oncePerTurn?: boolean;
  oncePerRound?: boolean;
  oncePerGame?: boolean;
}

export type AbilityCondition =
  | { kind: 'ANY' }
  | { kind: 'EVENT_HAS_TARGET_PLAYER' }
  | { kind: 'EVENT_CATEGORY_IS'; category: AssetCategory }
  | { kind: 'EVENT_DECK_IS'; deck: DeckId }
  | { kind: 'EVENT_SPACE_IS'; spaceNumber: number }
  | { kind: 'EVENT_STAT_IS'; stat: PlayerStat }
  | { kind: 'PLAYER_CAREER_TAG'; tag: CareerCategoryTag }
  | { kind: 'TARGET_IS_OTHER_PLAYER' }
  | { kind: 'EVENT_PLAYER_IS_SELF' }
  | { kind: 'EVENT_PLAYER_IS_OTHER_PLAYER' }
  | { kind: 'EVENT_TARGET_IS_SELF' }
  | { kind: 'PLAYER_WEALTH_AT_OR_BELOW'; amount: number }
  | { kind: 'EVENT_DELTA_AT_LEAST'; amount: number }
  | { kind: 'EVENT_DELTA_AT_MOST'; amount: number };

interface EffectBase {
  type: EffectType;
  target?: AbilityTarget;
  amount?: number;
  reason?: string;
  careerTag?: CareerCategoryTag;
  careerTags?: readonly CareerCategoryTag[];
}

export type EffectDefinition =
  | (EffectBase & { type: 'ADD_WEALTH' | 'REMOVE_WEALTH' | 'ADD_AI_SKILL' | 'REMOVE_AI_SKILL' | 'ADD_FAME' | 'REMOVE_FAME' | 'ADD_LIFESTYLE' | 'REMOVE_LIFESTYLE' | 'ADD_INFLUENCE' | 'REMOVE_INFLUENCE'; amount: number })
  | (EffectBase & { type: 'MOVE_PLAYER'; amount: number })
  | (EffectBase & { type: 'DRAW_CARD'; deck: DeckId })
  | (EffectBase & { type: 'AFFECT_OTHER_PLAYER'; effects: EffectDefinition[] })
  | (EffectBase & { type: 'PROTECT_FROM_EFFECT'; amount?: number; blockedEffectTypes?: EffectType[] })
  | (EffectBase & { type: 'MODIFY_REWARD'; amount: number; stat: PlayerStat })
  | (EffectBase & { type: 'MODIFY_SALARY'; amount: number })
  | (EffectBase & { type: 'TRIGGER_EVENT'; eventType: GameEventType; payload?: Record<string, unknown> });

export interface AbilityDefinition {
  id: string;
  name: string;
  description: string;
  trigger: GameEventType | null;
  conditions: AbilityCondition[];
  effects: EffectDefinition[];
  mode: AbilityMode;
  usageLimits?: AbilityUsageLimit;
}

export const characterAbilityId = (characterId: string) => `character:${characterId}`;
export const careerAbilityId = (careerId: string) => `career:${careerId}`;

const characterText = [
  ['guardian_h', 'Protector', 'Once per round, landing on another player protects them from the next penalty.'],
  ['click_click', 'Media Machine', 'The first Fame gain each round gives Click Click a little more Fame.'],
  ['frostbyte', 'Freeze Frame', 'Once per round, another player rolling doubles costs them a little Wealth.'],
  ['sadman', 'Misery Loves Company', 'When another player lands a big Wealth gain, Sadman pockets a smaller cut.'],
  ['rainbow_dash', 'Hype Train', 'Passing another player creates a small Fame boost.'],
  ['accuser', 'Point The Finger', 'Landing on another player drains their Influence while boosting Accuser.'],
  ['low_flame', 'Low Heat', 'Starting a turn low on Wealth creates a small cash comeback.'],
  ['wandering_eye', 'Watching', 'Once per round, another player drawing a card teaches Wandering Eye something.'],
  ['the_rind', 'Hard Exterior', 'Rolling a 2 sets up a single-use defensive shell.'],
  ['anointed', 'Chosen Path', 'Milestones add a little extra Fame and Influence.'],
  ['executive_p', 'Power Move', 'Every salary gate also raises Executive P\'s Influence.'],
  ['alpha_prime', 'Prime Directive', 'The first roll each turn permanently raises salary.'],
  ['roll_safe', 'Calculated Risk', 'A roll of 2 still pays something back.'],
  ['hotwired', 'Jump Start', 'Car purchases also improve Lifestyle and Influence.'],
  ['panic_bot', 'Red Alert', 'Once per round, another player rolling an 8 gives Panic Bot a failsafe.'],
  ['primate', 'Wild Instinct', 'Doubles turn into a burst of Lifestyle.'],
  ['pain_hider', 'Poker Face', 'Big Wealth hits still translate into Influence.'],
  ['prom_king', 'Spotlight', 'Passing another player adds Fame and a little Influence.'],
  ['idol_core', 'Main Character', 'Doubles always create more Fame.'],
  ['danger_zone', 'Full Throttle', 'Rolling an 8 pays off immediately.'],
  ['the_tank', 'Breakthrough', 'Once per round, landing on another player knocks them back a space.'],
] as const;

const careerText = [
  ['ai-engineer', 'MODEL UPGRADE', 'The first AI gain each turn gets one more AI Skill.'],
  ['race-driver', 'NEED FOR SPEED', 'Car purchases pay back extra Wealth.'],
  ['content-creator', 'GO VIRAL', 'The first Fame gain each turn gets amplified.'],
  ['gig-worker', 'SIDE HUSTLE', 'Resolved cards add a small Wealth bump.'],
  ['lawyer', 'OBJECTION', 'A roll of 2 sets up a Wealth/Influence protection.'],
  ['pro-gamer', 'CLUTCH INPUT', 'Doubles add a little Fame.'],
  ['doctor', 'HEALTH INSURANCE', 'Big Wealth setbacks still restore some Lifestyle.'],
  ['personal-trainer', 'LOCKED IN', 'Lifestyle purchases add more Lifestyle.'],
  ['degen-trader', 'YOLO', 'Rolling an 8 pays extra Wealth.'],
  ['startup-founder', 'EQUITY', 'Gamble cards cash out a little harder.'],
  ['influencer', 'ENGAGEMENT', 'The first Fame gain each turn also pays Wealth.'],
  ['corporate-executive', 'GOLDEN HANDCUFFS', 'Salary gates also raise Influence.'],
  ['cybersecurity-specialist', 'ZERO DAY', 'A roll of 2 sets up an AI/Wealth failsafe.'],
  ['entertainer', 'ENCORE', 'Landing on another player adds Fame.'],
  ['real-estate-investor', 'PROPERTY LADDER', 'Property purchases add Wealth and Influence.'],
] as const;

const overrides: Partial<Record<string, Omit<AbilityDefinition, 'id' | 'name' | 'description'>>> = {
  [characterAbilityId('guardian_h')]: {
    trigger: 'LAND_ON_PLAYER',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }, { kind: 'EVENT_HAS_TARGET_PLAYER' }],
    effects: [{ type: 'PROTECT_FROM_EFFECT', target: 'LANDED_ON_PLAYER', amount: 1, reason: 'Protector' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [characterAbilityId('click_click')]: {
    trigger: 'FAME_CHANGED',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }, { kind: 'EVENT_DELTA_AT_LEAST', amount: 1 }],
    effects: [{ type: 'ADD_FAME', amount: 2, reason: 'Media Machine' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [characterAbilityId('frostbyte')]: {
    trigger: 'DOUBLES_ROLLED',
    conditions: [{ kind: 'EVENT_PLAYER_IS_OTHER_PLAYER' }],
    effects: [{ type: 'REMOVE_WEALTH', target: 'EVENT_PLAYER', amount: 5000, reason: 'Freeze Frame' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [characterAbilityId('sadman')]: {
    trigger: 'WEALTH_CHANGED',
    conditions: [{ kind: 'EVENT_PLAYER_IS_OTHER_PLAYER' }, { kind: 'EVENT_DELTA_AT_LEAST', amount: 20000 }],
    effects: [{ type: 'ADD_WEALTH', amount: 5000, reason: 'Misery Loves Company' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [characterAbilityId('rainbow_dash')]: {
    trigger: 'PASS_PLAYER',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }],
    effects: [{ type: 'ADD_FAME', amount: 2, reason: 'Hype Train' }],
    mode: 'PASSIVE',
  },
  [characterAbilityId('accuser')]: {
    trigger: 'LAND_ON_PLAYER',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }, { kind: 'EVENT_HAS_TARGET_PLAYER' }],
    effects: [
      { type: 'REMOVE_INFLUENCE', target: 'LANDED_ON_PLAYER', amount: 2, reason: 'Point The Finger' },
      { type: 'ADD_INFLUENCE', amount: 2, reason: 'Point The Finger' },
    ],
    mode: 'PASSIVE',
  },
  [characterAbilityId('low_flame')]: {
    trigger: 'TURN_START',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }, { kind: 'PLAYER_WEALTH_AT_OR_BELOW', amount: 120000 }],
    effects: [{ type: 'ADD_WEALTH', amount: 10000, reason: 'Low Heat' }],
    mode: 'PASSIVE',
  },
  [characterAbilityId('wandering_eye')]: {
    trigger: 'CARD_DRAW',
    conditions: [{ kind: 'EVENT_PLAYER_IS_OTHER_PLAYER' }],
    effects: [{ type: 'ADD_AI_SKILL', amount: 1, reason: 'Watching' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [characterAbilityId('the_rind')]: {
    trigger: 'ROLL_OF_2',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }],
    effects: [{ type: 'PROTECT_FROM_EFFECT', amount: 1, blockedEffectTypes: ['REMOVE_WEALTH', 'REMOVE_FAME', 'REMOVE_LIFESTYLE', 'REMOVE_INFLUENCE', 'REMOVE_AI_SKILL'], reason: 'Hard Exterior' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [characterAbilityId('anointed')]: {
    trigger: 'MILESTONE',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }],
    effects: [
      { type: 'ADD_FAME', amount: 3, reason: 'Chosen Path' },
      { type: 'ADD_INFLUENCE', amount: 2, reason: 'Chosen Path' },
    ],
    mode: 'PASSIVE',
  },
  [characterAbilityId('executive_p')]: {
    trigger: 'SALARY_GATE',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }],
    effects: [{ type: 'ADD_INFLUENCE', amount: 2, reason: 'Power Move' }],
    mode: 'PASSIVE',
  },
  [characterAbilityId('alpha_prime')]: {
    trigger: 'DICE_ROLL',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }],
    effects: [{ type: 'MODIFY_SALARY', amount: 5000, reason: 'Prime Directive' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerTurn: true },
  },
  [characterAbilityId('roll_safe')]: {
    trigger: 'ROLL_OF_2',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }],
    effects: [{ type: 'ADD_WEALTH', amount: 15000, reason: 'Calculated Risk' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [characterAbilityId('hotwired')]: {
    trigger: 'CAR_PURCHASED',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }],
    effects: [
      { type: 'ADD_LIFESTYLE', amount: 5, reason: 'Jump Start' },
      { type: 'ADD_INFLUENCE', amount: 1, reason: 'Jump Start' },
    ],
    mode: 'PASSIVE',
  },
  [characterAbilityId('panic_bot')]: {
    trigger: 'ROLL_OF_8',
    conditions: [{ kind: 'EVENT_PLAYER_IS_OTHER_PLAYER' }],
    effects: [{ type: 'PROTECT_FROM_EFFECT', amount: 1, blockedEffectTypes: ['REMOVE_WEALTH', 'REMOVE_INFLUENCE'], reason: 'Red Alert' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [characterAbilityId('primate')]: {
    trigger: 'DOUBLES_ROLLED',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }],
    effects: [{ type: 'ADD_LIFESTYLE', amount: 2, reason: 'Wild Instinct' }],
    mode: 'PASSIVE',
  },
  [characterAbilityId('pain_hider')]: {
    trigger: 'WEALTH_CHANGED',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }, { kind: 'EVENT_DELTA_AT_MOST', amount: -10000 }],
    effects: [{ type: 'ADD_INFLUENCE', amount: 2, reason: 'Poker Face' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [characterAbilityId('prom_king')]: {
    trigger: 'PASS_PLAYER',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }],
    effects: [
      { type: 'ADD_FAME', amount: 2, reason: 'Spotlight' },
      { type: 'ADD_INFLUENCE', amount: 1, reason: 'Spotlight' },
    ],
    mode: 'PASSIVE',
    usageLimits: { oncePerTurn: true },
  },
  [characterAbilityId('idol_core')]: {
    trigger: 'DOUBLES_ROLLED',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }],
    effects: [{ type: 'ADD_FAME', amount: 5, reason: 'Main Character' }],
    mode: 'PASSIVE',
  },
  [characterAbilityId('danger_zone')]: {
    trigger: 'ROLL_OF_8',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }],
    effects: [
      { type: 'ADD_WEALTH', amount: 10000, reason: 'Full Throttle' },
      { type: 'ADD_FAME', amount: 2, reason: 'Full Throttle' },
    ],
    mode: 'PASSIVE',
  },
  [characterAbilityId('the_tank')]: {
    trigger: 'LAND_ON_PLAYER',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }, { kind: 'EVENT_HAS_TARGET_PLAYER' }],
    effects: [{ type: 'MOVE_PLAYER', target: 'LANDED_ON_PLAYER', amount: -1, reason: 'Breakthrough' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [careerAbilityId('ai-engineer')]: {
    trigger: 'AI_SKILL_CHANGED',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }, { kind: 'EVENT_DELTA_AT_LEAST', amount: 1 }],
    effects: [{ type: 'ADD_AI_SKILL', amount: 1, reason: 'MODEL UPGRADE' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerTurn: true },
  },
  [careerAbilityId('race-driver')]: {
    trigger: 'CAR_PURCHASED',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }],
    effects: [{ type: 'ADD_WEALTH', amount: 10000, reason: 'NEED FOR SPEED' }],
    mode: 'PASSIVE',
  },
  [careerAbilityId('content-creator')]: {
    trigger: 'FAME_CHANGED',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }, { kind: 'EVENT_DELTA_AT_LEAST', amount: 1 }],
    effects: [{ type: 'ADD_FAME', amount: 2, reason: 'GO VIRAL' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerTurn: true },
  },
  [careerAbilityId('gig-worker')]: {
    trigger: 'CARD_RESOLVED',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }],
    effects: [{ type: 'ADD_WEALTH', amount: 5000, reason: 'SIDE HUSTLE' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerTurn: true },
  },
  [careerAbilityId('lawyer')]: {
    trigger: 'ROLL_OF_2',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }],
    effects: [{ type: 'PROTECT_FROM_EFFECT', amount: 1, blockedEffectTypes: ['REMOVE_WEALTH', 'REMOVE_INFLUENCE'], reason: 'OBJECTION' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [careerAbilityId('pro-gamer')]: {
    trigger: 'DOUBLES_ROLLED',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }],
    effects: [{ type: 'ADD_FAME', amount: 2, reason: 'CLUTCH INPUT' }],
    mode: 'PASSIVE',
  },
  [careerAbilityId('doctor')]: {
    trigger: 'WEALTH_CHANGED',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }, { kind: 'EVENT_DELTA_AT_MOST', amount: -10000 }],
    effects: [{ type: 'ADD_LIFESTYLE', amount: 2, reason: 'HEALTH INSURANCE' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [careerAbilityId('personal-trainer')]: {
    trigger: 'LIFESTYLE_PURCHASED',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }],
    effects: [{ type: 'ADD_LIFESTYLE', amount: 3, reason: 'LOCKED IN' }],
    mode: 'PASSIVE',
  },
  [careerAbilityId('degen-trader')]: {
    trigger: 'ROLL_OF_8',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }],
    effects: [{ type: 'ADD_WEALTH', amount: 10000, reason: 'YOLO' }],
    mode: 'PASSIVE',
  },
  [careerAbilityId('startup-founder')]: {
    trigger: 'CARD_RESOLVED',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }, { kind: 'EVENT_DECK_IS', deck: 'gamble' }],
    effects: [{ type: 'ADD_WEALTH', amount: 10000, reason: 'EQUITY' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerTurn: true },
  },
  [careerAbilityId('influencer')]: {
    trigger: 'FAME_CHANGED',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }, { kind: 'EVENT_DELTA_AT_LEAST', amount: 1 }],
    effects: [{ type: 'ADD_WEALTH', amount: 5000, reason: 'ENGAGEMENT' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerTurn: true },
  },
  [careerAbilityId('corporate-executive')]: {
    trigger: 'SALARY_GATE',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }],
    effects: [{ type: 'ADD_INFLUENCE', amount: 2, reason: 'GOLDEN HANDCUFFS' }],
    mode: 'PASSIVE',
  },
  [careerAbilityId('cybersecurity-specialist')]: {
    trigger: 'ROLL_OF_2',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }],
    effects: [{ type: 'PROTECT_FROM_EFFECT', amount: 1, blockedEffectTypes: ['REMOVE_AI_SKILL', 'REMOVE_WEALTH'], reason: 'ZERO DAY' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [careerAbilityId('entertainer')]: {
    trigger: 'LAND_ON_PLAYER',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }, { kind: 'EVENT_HAS_TARGET_PLAYER' }],
    effects: [{ type: 'ADD_FAME', amount: 3, reason: 'ENCORE' }],
    mode: 'PASSIVE',
  },
  [careerAbilityId('real-estate-investor')]: {
    trigger: 'PROPERTY_PURCHASED',
    conditions: [{ kind: 'EVENT_PLAYER_IS_SELF' }],
    effects: [
      { type: 'ADD_WEALTH', amount: 10000, reason: 'PROPERTY LADDER' },
      { type: 'ADD_INFLUENCE', amount: 3, reason: 'PROPERTY LADDER' },
    ],
    mode: 'PASSIVE',
  },
};

function toAbilityDefinition(
  id: string,
  name: string,
  description: string,
): AbilityDefinition {
  const override = overrides[id];
  return {
    id,
    name,
    description,
    trigger: override?.trigger ?? null,
    conditions: override?.conditions ?? [{ kind: 'ANY' }],
    effects: override?.effects ?? [],
    mode: override?.mode ?? 'PASSIVE',
    usageLimits: override?.usageLimits,
  };
}

export const abilities: readonly AbilityDefinition[] = [
  ...characterText.map(([id, name, description]) => toAbilityDefinition(characterAbilityId(id), name, description)),
  ...careerText.map(([id, name, description]) => toAbilityDefinition(careerAbilityId(id), name, description)),
];

export function getAbility(id: string): AbilityDefinition | undefined {
  return abilities.find((ability) => ability.id === id);
}
