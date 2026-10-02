import type { AssetCategory } from './assets';
import type { DeckId } from './decks';
import type { GameEventType } from './events/types';
import type { CareerCategoryTag } from './careers';
import type { PlayerStat } from './player';
import {
  CAREER_DECK_AFFINITIES,
  careerAffinityAbilityId,
} from './career-affinities';

export type AbilityMode = 'PASSIVE' | 'ACTIVE';
export type AbilityTarget = 'SELF' | 'LANDED_ON_PLAYER' | 'AFFECTED_PLAYER' | 'ALL_OTHER_PLAYERS';

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
  | 'TRIGGER_EVENT'
  | 'ASSET_INTERACTION'
  | 'SWAP_CAREER'
  | 'TRANSFER_WEALTH_FROM_EVENT_ACTOR'
  | 'SKIP_NEXT_TURN'
  | 'UPGRADE_ACQUIRED_ASSET'
  | 'CHOOSE_STAT_DESTINATION'
  | 'ACQUIRE_SECOND_CAREER';

export interface AbilityUsageLimit {
  oncePerTurn?: boolean;
  oncePerRound?: boolean;
  oncePerGame?: boolean;
}

export type AbilityCondition =
  | { kind: 'ANY' }
  | { kind: 'EVENT_ACTOR_IS_SELF' }
  | { kind: 'EVENT_ACTOR_IS_OTHER' }
  | { kind: 'EVENT_OWNER_IS_EVENT_TARGET' }
  | { kind: 'EVENT_DELTA_IS_NEGATIVE' }
  | { kind: 'EVENT_DELTA_IS_POSITIVE' }
  | { kind: 'EVENT_STAGE_IS'; stage: 'TRIGGERED' | 'RESOLVED' }
  | { kind: 'EVENT_CAREER_SWITCHED' }
  | { kind: 'EVENT_HAS_TARGET_PLAYER' }
  | { kind: 'EVENT_CATEGORY_IS'; category: AssetCategory }
  | { kind: 'EVENT_DECK_IS'; deck: DeckId }
  | { kind: 'EVENT_SPACE_IS'; spaceNumber: number }
  | { kind: 'EVENT_STAT_IS'; stat: PlayerStat }
  | { kind: 'PLAYER_CAREER_TAG'; tag: CareerCategoryTag }
  | { kind: 'TARGET_IS_OTHER_PLAYER' }
  | { kind: 'EVENT_TARGET_HAS_ASSET'; category: 'car' | 'property' }
  | { kind: 'EVENT_SPACE_HAS_OTHER_PLAYERS' }
  | { kind: 'PLAYER_HAS_NO_SECOND_CAREER' };

interface EffectBase {
  type: EffectType;
  target?: AbilityTarget;
  amount?: number;
  reason?: string;
}

export type EffectDefinition =
  | (EffectBase & { type: 'ADD_WEALTH' | 'REMOVE_WEALTH' | 'ADD_AI_SKILL' | 'REMOVE_AI_SKILL' | 'ADD_FAME' | 'REMOVE_FAME' | 'ADD_LIFESTYLE' | 'REMOVE_LIFESTYLE' | 'ADD_INFLUENCE' | 'REMOVE_INFLUENCE'; amount: number })
  | (EffectBase & { type: 'MOVE_PLAYER'; amount: number })
  | (EffectBase & { type: 'DRAW_CARD'; deck: DeckId })
  | (EffectBase & { type: 'AFFECT_OTHER_PLAYER'; effects: EffectDefinition[] })
  | (EffectBase & { type: 'PROTECT_FROM_EFFECT'; amount?: number; blockedEffectTypes?: EffectType[] })
  | (EffectBase & { type: 'MODIFY_REWARD'; amount: number; stat: PlayerStat })
  | (EffectBase & { type: 'MODIFY_SALARY'; amount: number })
  | (EffectBase & { type: 'TRIGGER_EVENT'; eventType: GameEventType; payload?: Record<string, unknown> })
  | (EffectBase & { type: 'ASSET_INTERACTION'; category: 'car' | 'property' })
  | (EffectBase & { type: 'SWAP_CAREER'; mode: 'OPTIONAL' | 'FORCED' })
  | (EffectBase & { type: 'TRANSFER_WEALTH_FROM_EVENT_ACTOR'; amount: number })
  | (EffectBase & { type: 'SKIP_NEXT_TURN' })
  | (EffectBase & { type: 'UPGRADE_ACQUIRED_ASSET'; level: 2 })
  | (EffectBase & { type: 'CHOOSE_STAT_DESTINATION' })
  | (EffectBase & { type: 'ACQUIRE_SECOND_CAREER' });

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
  ['guardian_h', 'Hold the Line', 'Your AI Skill, Fame, Lifestyle and Influence can never be lost or reduced below zero.'],
  ['click_click', 'Quick Draw', 'Landing on another player earns you 1 Influence.'],
  ['frostbyte', 'Deep Freeze', 'When you lose AI Skill, gain 1 Influence once per round.'],
  ['sadman', 'Last Laugh', 'Any roll of 2 earns you 2 Influence.'],
  ['rainbow_dash', 'Prismatic Rush', 'Passing another player earns you 1 Lifestyle once per turn.'],
  ['accuser', 'Call It Out', 'When an opponent loses Fame, gain 1 Influence once per round.'],
  ['low_flame', 'Slow Burn', 'Crossing a Payday earns you another $2,500 once per turn.'],
  ['wandering_eye', 'Peripheral Vision', 'Switching careers at Career Change earns you 5 AI Skill.'],
  ['the_rind', 'Hard Exterior', 'When another player lands on you, gain $2,500 Wealth once per round.'],
  ['anointed', 'Chosen Path', 'Locking in a career earns you 2 Fame once per game.'],
  ['executive_p', 'Power Move', 'Passing another player steals 1 Influence from them for yourself, once per turn.'],
  ['alpha_prime', 'Prime Directive', 'Your first roll permanently raises your salary by $5,000.'],
  ['roll_safe', 'Calculated Risk', 'A roll of 2 gives you one-use protection from a negative effect.'],
  ['hotwired', 'Jump Start', 'Buying an asset earns you 1 Lifestyle once per turn.'],
  ['panic_bot', 'Red Alert', 'Drawing a Gamble card earns you 1 Influence once per round.'],
  ['primate', 'Wild Instinct', 'Rolling doubles earns you 1 Lifestyle once per round.'],
  ['pain_hider', 'Poker Face', 'When you lose Fame, gain 1 Influence once per round.'],
  ['prom_king', 'Spotlight', 'Landing on another player earns you 1 Fame once per round.'],
  ['idol_core', 'Main Character', 'Drawing a Fame card earns you 1 Fame once per round.'],
  ['danger_zone', 'Full Throttle', 'A roll of 8 earns $10,000 and costs 1 Lifestyle once per round.'],
  ['the_tank', 'Breakthrough', 'Your first movement each turn earns you $2,500 Wealth.'],
] as const;

const careerText = [
  ['ai-engineer', 'MODEL UPGRADE', 'When you gain AI Skill, gain $7,500 Wealth once per turn.'],
  ['race-driver', 'NEED FOR SPEED', 'When you land on another player, optionally steal their Car if your slot is empty, or swap Cars. Once per game.'],
  ['content-creator', 'GO VIRAL', 'Whenever you gain AI Skill, Fame, or Influence, choose which of those attributes receives the gain.'],
  ['gig-worker', 'SIDE HUSTLE', 'At Space 35, keep Gig Worker and gain a second career with its own salary; Payday uses the higher salary.'],
  ['lawyer', 'OBJECTION', 'When an opponent loses Wealth, gain 1 Influence once per round.'],
  ['pro-gamer', 'SWEAT THE ODDS', 'Rolling doubles earns you 1 AI Skill once per round.'],
  ['doctor', 'CAREER BENEFIT', 'Receive 1 Upgrade Token whenever you newly acquire the Doctor career.'],
  ['personal-trainer', 'SORE', 'When you land on another player, gain 1 Lifestyle and every other player on that space skips their next turn. Once per round.'],
  ['degen-trader', 'YOLO', 'A roll of 8 earns you $50,000 Wealth once per turn.'],
  ['startup-founder', 'EQUITY', 'Whenever you acquire an asset, upgrade that asset to Level 2 for free.'],
  ['influencer', 'ENGAGEMENT', 'Passing another player earns you 1 Fame once per round.'],
  ['corporate-executive', 'GOLDEN HANDCUFFS', 'When you land on another player, you may swap careers and salaries with them. Once per turn.'],
  ['cybersecurity-specialist', 'ZERO DAY', 'When you land on another player, steal 1 AI Skill from them. Once per game.'],
  ['entertainer', 'MAIN CHARACTER', 'When you land on another player, steal 1 Fame from them. Once per round.'],
  ['real-estate-investor', 'PROPERTY LADDER', 'When you land on another player, optionally steal their Property if your slot is empty, or swap Properties. Once per round.'],
  ['thief', 'TAXMAN', 'Whenever another player rolls a 2 or 8, take up to $25,000 of their Wealth.'],
  ['alien', 'ABDUCTION', 'Whenever another player lands on you, they must swap careers and salaries with you. Once per round.'],
] as const;

const overrides: Partial<Record<string, Omit<AbilityDefinition, 'id' | 'name' | 'description'>>> = {
  [characterAbilityId('guardian_h')]: {
    trigger: null,
    conditions: [],
    effects: [],
    mode: 'PASSIVE',
  },
  [characterAbilityId('click_click')]: {
    trigger: 'LAND_ON_PLAYER',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }, { kind: 'EVENT_HAS_TARGET_PLAYER' }, { kind: 'TARGET_IS_OTHER_PLAYER' }],
    effects: [{ type: 'ADD_INFLUENCE', amount: 1, reason: 'Quick Draw' }],
    mode: 'PASSIVE',
  },
  [characterAbilityId('frostbyte')]: {
    trigger: 'AI_SKILL_CHANGED',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }, { kind: 'EVENT_DELTA_IS_NEGATIVE' }],
    effects: [{ type: 'ADD_INFLUENCE', amount: 1, reason: 'Deep Freeze' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [characterAbilityId('sadman')]: {
    trigger: 'ROLL_OF_2',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }],
    effects: [{ type: 'ADD_INFLUENCE', amount: 2, reason: 'Last Laugh' }],
    mode: 'PASSIVE',
  },
  [characterAbilityId('rainbow_dash')]: {
    trigger: 'PASS_PLAYER',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }, { kind: 'EVENT_HAS_TARGET_PLAYER' }],
    effects: [{ type: 'ADD_LIFESTYLE', amount: 1, reason: 'Prismatic Rush' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerTurn: true },
  },
  [characterAbilityId('accuser')]: {
    trigger: 'FAME_CHANGED',
    conditions: [{ kind: 'EVENT_ACTOR_IS_OTHER' }, { kind: 'EVENT_DELTA_IS_NEGATIVE' }],
    effects: [{ type: 'ADD_INFLUENCE', amount: 1, reason: 'Call It Out' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [characterAbilityId('low_flame')]: {
    trigger: 'SALARY_GATE',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }],
    effects: [{ type: 'ADD_WEALTH', amount: 2500, reason: 'Slow Burn' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerTurn: true },
  },
  [characterAbilityId('wandering_eye')]: {
    trigger: 'CAREER_CHANGE',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }, { kind: 'EVENT_STAGE_IS', stage: 'RESOLVED' }, { kind: 'EVENT_CAREER_SWITCHED' }],
    effects: [{ type: 'ADD_AI_SKILL', amount: 5, reason: 'Peripheral Vision' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerGame: true },
  },
  [characterAbilityId('the_rind')]: {
    trigger: 'LAND_ON_PLAYER',
    conditions: [{ kind: 'EVENT_OWNER_IS_EVENT_TARGET' }],
    effects: [{ type: 'ADD_WEALTH', amount: 2500, reason: 'Hard Exterior' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [characterAbilityId('anointed')]: {
    trigger: 'CAREER_CHANGE',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }, { kind: 'EVENT_STAGE_IS', stage: 'RESOLVED' }],
    effects: [{ type: 'ADD_FAME', amount: 2, reason: 'Chosen Path' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerGame: true },
  },
  [characterAbilityId('executive_p')]: {
    trigger: 'PASS_PLAYER',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }, { kind: 'EVENT_HAS_TARGET_PLAYER' }],
    effects: [
      { type: 'REMOVE_INFLUENCE', amount: 1, target: 'LANDED_ON_PLAYER', reason: 'Power Move' },
      { type: 'ADD_INFLUENCE', amount: 1, reason: 'Power Move' },
    ],
    mode: 'PASSIVE',
    usageLimits: { oncePerTurn: true },
  },
  [characterAbilityId('idol_core')]: {
    trigger: 'CARD_DRAW',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }, { kind: 'EVENT_DECK_IS', deck: 'fame' }],
    effects: [{ type: 'ADD_FAME', amount: 1, reason: 'Main Character' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [characterAbilityId('alpha_prime')]: {
    trigger: 'DICE_ROLL',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }],
    effects: [{ type: 'MODIFY_SALARY', amount: 5000, reason: 'Prime Directive' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerGame: true },
  },
  [characterAbilityId('roll_safe')]: {
    trigger: 'ROLL_OF_2',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }],
    effects: [{ type: 'PROTECT_FROM_EFFECT', amount: 1, reason: 'Calculated Risk' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerGame: true },
  },
  [characterAbilityId('hotwired')]: {
    trigger: 'ASSET_PURCHASED',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }],
    effects: [{ type: 'ADD_LIFESTYLE', amount: 1, reason: 'Jump Start' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerTurn: true },
  },
  [characterAbilityId('panic_bot')]: {
    trigger: 'CARD_DRAW',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }, { kind: 'EVENT_DECK_IS', deck: 'gamble' }],
    effects: [{ type: 'ADD_INFLUENCE', amount: 1, reason: 'Red Alert' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [characterAbilityId('primate')]: {
    trigger: 'DOUBLES_ROLLED',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }],
    effects: [{ type: 'ADD_LIFESTYLE', amount: 1, reason: 'Wild Instinct' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [characterAbilityId('pain_hider')]: {
    trigger: 'FAME_CHANGED',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }, { kind: 'EVENT_DELTA_IS_NEGATIVE' }],
    effects: [{ type: 'ADD_INFLUENCE', amount: 1, reason: 'Poker Face' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [characterAbilityId('prom_king')]: {
    trigger: 'LAND_ON_PLAYER',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }, { kind: 'EVENT_HAS_TARGET_PLAYER' }],
    effects: [{ type: 'ADD_FAME', amount: 1, reason: 'Spotlight' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [characterAbilityId('danger_zone')]: {
    trigger: 'ROLL_OF_8',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }],
    effects: [
      { type: 'ADD_WEALTH', amount: 10000, reason: 'Full Throttle' },
      { type: 'REMOVE_LIFESTYLE', amount: 1, reason: 'Full Throttle' },
    ],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [characterAbilityId('the_tank')]: {
    trigger: 'PLAYER_MOVED',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }],
    effects: [{ type: 'ADD_WEALTH', amount: 2500, reason: 'Breakthrough' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerTurn: true },
  },
  [careerAbilityId('degen-trader')]: {
    trigger: 'ROLL_OF_8',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }, { kind: 'PLAYER_CAREER_TAG', tag: 'risk' }],
    effects: [{ type: 'ADD_WEALTH', amount: 50000, reason: 'YOLO' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerTurn: true },
  },
  [careerAbilityId('ai-engineer')]: {
    trigger: 'AI_SKILL_CHANGED',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }, { kind: 'EVENT_DELTA_IS_POSITIVE' }],
    effects: [{ type: 'ADD_WEALTH', amount: 7500, reason: 'Model Upgrade' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerTurn: true },
  },
  [careerAbilityId('race-driver')]: {
    trigger: 'LAND_ON_PLAYER',
    conditions: [
      { kind: 'EVENT_ACTOR_IS_SELF' },
      { kind: 'TARGET_IS_OTHER_PLAYER' },
      { kind: 'EVENT_TARGET_HAS_ASSET', category: 'car' },
    ],
    effects: [{ type: 'ASSET_INTERACTION', category: 'car', reason: 'Need for Speed' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerGame: true },
  },
  [careerAbilityId('content-creator')]: {
    trigger: 'ATTRIBUTE_GAINED',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }, { kind: 'EVENT_DELTA_IS_POSITIVE' }],
    effects: [{ type: 'CHOOSE_STAT_DESTINATION', reason: 'Go Viral' }],
    mode: 'PASSIVE',
  },
  [careerAbilityId('gig-worker')]: {
    trigger: 'CAREER_CHANGE',
    conditions: [
      { kind: 'EVENT_ACTOR_IS_SELF' },
      { kind: 'EVENT_STAGE_IS', stage: 'TRIGGERED' },
      { kind: 'EVENT_SPACE_IS', spaceNumber: 35 },
      { kind: 'PLAYER_HAS_NO_SECOND_CAREER' },
    ],
    effects: [{ type: 'ACQUIRE_SECOND_CAREER', reason: 'Side Hustle' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerGame: true },
  },
  [careerAbilityId('lawyer')]: {
    trigger: 'WEALTH_CHANGED',
    conditions: [{ kind: 'EVENT_ACTOR_IS_OTHER' }, { kind: 'EVENT_DELTA_IS_NEGATIVE' }],
    effects: [{ type: 'ADD_INFLUENCE', amount: 1, reason: 'Objection' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [careerAbilityId('pro-gamer')]: {
    trigger: 'DOUBLES_ROLLED',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }],
    effects: [{ type: 'ADD_AI_SKILL', amount: 1, reason: 'Sweat the Odds' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [careerAbilityId('doctor')]: {
    trigger: null,
    conditions: [],
    effects: [],
    mode: 'PASSIVE',
  },
  [careerAbilityId('personal-trainer')]: {
    trigger: 'LAND_ON_SPACE',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }, { kind: 'EVENT_SPACE_HAS_OTHER_PLAYERS' }],
    effects: [
      { type: 'ADD_LIFESTYLE', amount: 1, reason: 'SORE' },
      { type: 'SKIP_NEXT_TURN', target: 'ALL_OTHER_PLAYERS', reason: 'SORE' },
    ],
    mode: 'PASSIVE',
  },
  [careerAbilityId('startup-founder')]: {
    trigger: 'ASSET_ACQUIRED',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }],
    effects: [{ type: 'UPGRADE_ACQUIRED_ASSET', level: 2, reason: 'Equity' }],
    mode: 'PASSIVE',
  },
  [careerAbilityId('influencer')]: {
    trigger: 'PASS_PLAYER',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }, { kind: 'EVENT_HAS_TARGET_PLAYER' }],
    effects: [{ type: 'ADD_FAME', amount: 1, reason: 'Engagement' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [careerAbilityId('corporate-executive')]: {
    trigger: 'LAND_ON_PLAYER',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }, { kind: 'TARGET_IS_OTHER_PLAYER' }],
    effects: [{ type: 'SWAP_CAREER', mode: 'OPTIONAL', reason: 'Golden Handcuffs' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerTurn: true },
  },
  [careerAbilityId('cybersecurity-specialist')]: {
    trigger: 'LAND_ON_PLAYER',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }, { kind: 'TARGET_IS_OTHER_PLAYER' }],
    effects: [
      { type: 'ADD_AI_SKILL', amount: 1, reason: 'Zero Day' },
      { type: 'REMOVE_AI_SKILL', amount: 1, target: 'LANDED_ON_PLAYER', reason: 'Zero Day' },
    ],
    mode: 'PASSIVE',
    usageLimits: { oncePerGame: true },
  },
  [careerAbilityId('entertainer')]: {
    trigger: 'LAND_ON_PLAYER',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }, { kind: 'TARGET_IS_OTHER_PLAYER' }],
    effects: [
      { type: 'ADD_FAME', amount: 1, reason: 'Main Character' },
      { type: 'REMOVE_FAME', amount: 1, target: 'LANDED_ON_PLAYER', reason: 'Main Character' },
    ],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [careerAbilityId('real-estate-investor')]: {
    trigger: 'LAND_ON_PLAYER',
    conditions: [
      { kind: 'EVENT_ACTOR_IS_SELF' },
      { kind: 'TARGET_IS_OTHER_PLAYER' },
      { kind: 'EVENT_TARGET_HAS_ASSET', category: 'property' },
    ],
    effects: [{ type: 'ASSET_INTERACTION', category: 'property', reason: 'Property Ladder' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [careerAbilityId('thief')]: {
    trigger: 'ROLL_OF_2_OR_8',
    conditions: [{ kind: 'EVENT_ACTOR_IS_OTHER' }],
    effects: [{ type: 'TRANSFER_WEALTH_FROM_EVENT_ACTOR', amount: 25000, reason: 'Taxman' }],
    mode: 'PASSIVE',
  },
  [careerAbilityId('alien')]: {
    trigger: 'LAND_ON_PLAYER',
    conditions: [{ kind: 'EVENT_OWNER_IS_EVENT_TARGET' }],
    effects: [{ type: 'SWAP_CAREER', mode: 'FORCED', reason: 'Abduction' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
};

function toAbilityDefinition(
  id: string,
  name: string,
  description: string,
): AbilityDefinition {
  const override = overrides[id];
  if (!override) throw new Error(`Missing ability implementation: ${id}`);
  return {
    id,
    name,
    description,
    ...override,
  };
}

const deckNames: Record<DeckId, string> = {
  wealth: 'WEALTH',
  ai: 'AI SKILL',
  fame: 'FAME',
  lifestyle: 'LIFESTYLE',
  influence: 'INFLUENCE',
  gamble: 'GAMBLE',
};

function affinityReward(deck: DeckId, slot: 'primary' | 'secondary'): EffectDefinition {
  const wealthAmount = slot === 'primary' ? 2500 : 1000;
  switch (deck) {
    case 'wealth':
    case 'gamble':
      return { type: 'ADD_WEALTH', amount: wealthAmount, reason: `${deckNames[deck]} affinity` };
    case 'ai':
      return { type: 'ADD_AI_SKILL', amount: 1, reason: `${deckNames[deck]} affinity` };
    case 'fame':
      return { type: 'ADD_FAME', amount: 1, reason: `${deckNames[deck]} affinity` };
    case 'lifestyle':
      return { type: 'ADD_LIFESTYLE', amount: 1, reason: `${deckNames[deck]} affinity` };
    case 'influence':
      return { type: 'ADD_INFLUENCE', amount: 1, reason: `${deckNames[deck]} affinity` };
  }
}

const careerAffinityAbilities: AbilityDefinition[] = Object.entries(CAREER_DECK_AFFINITIES)
  .flatMap(([careerId, affinity]) => [
    { slot: 'primary' as const, deck: affinity.primary },
    ...(affinity.secondary ? [{ slot: 'secondary' as const, deck: affinity.secondary }] : []),
  ].map(({ slot, deck }) => {
    const reward = affinityReward(deck, slot);
    const rewardLabel = reward.type === 'ADD_WEALTH'
      ? `+$${reward.amount.toLocaleString()} Wealth`
      : `+1 ${deckNames[deck]}`;
    return {
      id: careerAffinityAbilityId(careerId, deck),
      name: `${slot === 'primary' ? 'Primary' : 'Secondary'} ${deckNames[deck]} affinity`,
      description: `When you draw a ${deckNames[deck]} card, gain ${rewardLabel} once per turn.`,
      trigger: 'CARD_DRAW',
      conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }, { kind: 'EVENT_DECK_IS', deck }],
      effects: [reward],
      mode: 'PASSIVE',
      usageLimits: { oncePerTurn: true },
    };
  }));

export const abilities: readonly AbilityDefinition[] = [
  ...characterText.map(([id, name, description]) => toAbilityDefinition(characterAbilityId(id), name, description)),
  ...careerText.map(([id, name, description]) => toAbilityDefinition(careerAbilityId(id), name, description)),
  ...careerAffinityAbilities,
];

export function getAbility(id: string): AbilityDefinition | undefined {
  return abilities.find((ability) => ability.id === id);
}
