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
  | 'TRIGGER_EVENT';

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
  | { kind: 'EVENT_HAS_TARGET_PLAYER' }
  | { kind: 'EVENT_CATEGORY_IS'; category: AssetCategory }
  | { kind: 'EVENT_DECK_IS'; deck: DeckId }
  | { kind: 'EVENT_SPACE_IS'; spaceNumber: number }
  | { kind: 'EVENT_STAT_IS'; stat: PlayerStat }
  | { kind: 'PLAYER_CAREER_TAG'; tag: CareerCategoryTag }
  | { kind: 'TARGET_IS_OTHER_PLAYER' };

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
  ['guardian_h', 'Hold the Line', 'Once per game, block the next negative effect against you.'],
  ['click_click', 'Quick Draw', 'Landing on another player earns you 1 Influence.'],
  ['frostbyte', 'Deep Freeze', 'When you lose AI Skill, gain 1 Influence once per round.'],
  ['sadman', 'Last Laugh', 'A roll of 2 earns you 2 Fame once per game.'],
  ['rainbow_dash', 'Prismatic Rush', 'Passing another player earns you 1 Lifestyle once per turn.'],
  ['accuser', 'Call It Out', 'When an opponent loses Fame, gain 1 Influence once per round.'],
  ['low_flame', 'Slow Burn', 'Crossing a Payday earns you another $2,500 once per turn.'],
  ['wandering_eye', 'Peripheral Vision', 'Passing Career Change at space 35 earns 1 AI Skill once per game.'],
  ['the_rind', 'Hard Exterior', 'When another player lands on you, gain $2,500 Wealth once per round.'],
  ['anointed', 'Chosen Path', 'Locking in a career earns you 2 Fame once per game.'],
  ['executive_p', 'Power Move', 'When you pass a player, take 1 Influence and gain 1 Influence once per turn.'],
  ['alpha_prime', 'Prime Directive', 'Your first roll permanently raises your salary by $5,000.'],
  ['roll_safe', 'Calculated Risk', 'A roll of 2 gives you one-use protection from a negative effect.'],
  ['hotwired', 'Jump Start', 'Buying an asset earns you 1 Lifestyle once per turn.'],
  ['panic_bot', 'Red Alert', 'Drawing a Gamble card earns you 1 Influence once per round.'],
  ['primate', 'Wild Instinct', 'Rolling doubles earns you 1 Lifestyle once per round.'],
  ['pain_hider', 'Poker Face', 'When you lose Fame, gain 1 Influence once per round.'],
  ['prom_king', 'Spotlight', 'Landing on another player earns you 1 Fame once per round.'],
  ['idol_core', 'Main Character', 'Drawing a Fame card earns you 1 Fame once per round.'],
  ['danger_zone', 'Full Throttle', 'A roll of 8 earns $5,000 and costs 1 Lifestyle once per round.'],
  ['the_tank', 'Breakthrough', 'Your first movement each round earns you $2,500 Wealth.'],
] as const;

const careerText = [
  ['ai-engineer', 'MODEL UPGRADE', 'When you gain AI Skill, gain $2,500 Wealth once per turn.'],
  ['race-driver', 'NEED FOR SPEED', 'Buying a car earns you 1 Fame once per game.'],
  ['content-creator', 'GO VIRAL', 'A positive Fame change earns you $1,500 Wealth once per round.'],
  ['gig-worker', 'SIDE HUSTLE', 'Moving earns you $1,500 Wealth once per turn.'],
  ['lawyer', 'OBJECTION', 'When an opponent loses Wealth, gain 1 Influence once per round.'],
  ['pro-gamer', 'SWEAT THE ODDS', 'Rolling doubles earns you 1 AI Skill once per round.'],
  ['doctor', 'HEALTH INSURANCE', 'Once per game, block one Lifestyle or AI Skill penalty.'],
  ['personal-trainer', 'LOCKED IN', 'A roll of 8 earns you 1 Lifestyle once per round.'],
  ['degen-trader', 'YOLO', 'A roll of 8 earns you $5,000 Wealth once per turn.'],
  ['startup-founder', 'EQUITY', 'Buying an investment earns you $2,500 Wealth once per round.'],
  ['influencer', 'ENGAGEMENT', 'Passing another player earns you 1 Fame once per round.'],
  ['corporate-executive', 'GOLDEN HANDCUFFS', 'Crossing a Payday earns you another $2,500 once per turn.'],
  ['cybersecurity-specialist', 'ZERO DAY', 'Resolving an AI card grants one-use protection from an AI penalty.'],
  ['entertainer', 'MAIN CHARACTER', 'When another player lands on you, gain 1 Fame once per round.'],
  ['real-estate-investor', 'PROPERTY LADDER', 'Buying property earns you $2,500 Wealth once per round.'],
] as const;

const overrides: Partial<Record<string, Omit<AbilityDefinition, 'id' | 'name' | 'description'>>> = {
  [characterAbilityId('guardian_h')]: {
    trigger: 'TURN_START',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }],
    effects: [{ type: 'PROTECT_FROM_EFFECT', amount: 1, reason: 'Hold the Line' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerGame: true },
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
    effects: [{ type: 'ADD_FAME', amount: 2, reason: 'Last Laugh' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerGame: true },
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
    trigger: 'PASS_SPACE',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }, { kind: 'EVENT_SPACE_IS', spaceNumber: 35 }],
    effects: [{ type: 'ADD_AI_SKILL', amount: 1, reason: 'Peripheral Vision' }],
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
      { type: 'ADD_WEALTH', amount: 5000, reason: 'Full Throttle' },
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
    usageLimits: { oncePerRound: true },
  },
  [careerAbilityId('degen-trader')]: {
    trigger: 'ROLL_OF_8',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }, { kind: 'PLAYER_CAREER_TAG', tag: 'risk' }],
    effects: [{ type: 'ADD_WEALTH', amount: 5000, reason: 'YOLO' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerTurn: true },
  },
  [careerAbilityId('ai-engineer')]: {
    trigger: 'AI_SKILL_CHANGED',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }, { kind: 'EVENT_DELTA_IS_POSITIVE' }],
    effects: [{ type: 'ADD_WEALTH', amount: 2500, reason: 'Model Upgrade' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerTurn: true },
  },
  [careerAbilityId('race-driver')]: {
    trigger: 'CAR_PURCHASED',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }],
    effects: [{ type: 'ADD_FAME', amount: 1, reason: 'Need for Speed' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerGame: true },
  },
  [careerAbilityId('content-creator')]: {
    trigger: 'FAME_CHANGED',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }, { kind: 'EVENT_DELTA_IS_POSITIVE' }],
    effects: [{ type: 'ADD_WEALTH', amount: 1500, reason: 'Go Viral' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [careerAbilityId('gig-worker')]: {
    trigger: 'PLAYER_MOVED',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }],
    effects: [{ type: 'ADD_WEALTH', amount: 1500, reason: 'Side Hustle' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerTurn: true },
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
    trigger: 'TURN_START',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }],
    effects: [{
      type: 'PROTECT_FROM_EFFECT',
      amount: 1,
      blockedEffectTypes: ['REMOVE_LIFESTYLE', 'REMOVE_AI_SKILL'],
      reason: 'Health Insurance',
    }],
    mode: 'PASSIVE',
    usageLimits: { oncePerGame: true },
  },
  [careerAbilityId('personal-trainer')]: {
    trigger: 'ROLL_OF_8',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }],
    effects: [{ type: 'ADD_LIFESTYLE', amount: 1, reason: 'Locked In' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [careerAbilityId('startup-founder')]: {
    trigger: 'ASSET_PURCHASED',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }, { kind: 'EVENT_CATEGORY_IS', category: 'investment' }],
    effects: [{ type: 'ADD_WEALTH', amount: 2500, reason: 'Equity' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [careerAbilityId('influencer')]: {
    trigger: 'PASS_PLAYER',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }, { kind: 'EVENT_HAS_TARGET_PLAYER' }],
    effects: [{ type: 'ADD_FAME', amount: 1, reason: 'Engagement' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [careerAbilityId('corporate-executive')]: {
    trigger: 'SALARY_GATE',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }],
    effects: [{ type: 'ADD_WEALTH', amount: 2500, reason: 'Golden Handcuffs' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerTurn: true },
  },
  [careerAbilityId('cybersecurity-specialist')]: {
    trigger: 'CARD_RESOLVED',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }, { kind: 'EVENT_DECK_IS', deck: 'ai' }],
    effects: [{
      type: 'PROTECT_FROM_EFFECT',
      amount: 1,
      blockedEffectTypes: ['REMOVE_AI_SKILL'],
      reason: 'Zero Day',
    }],
    mode: 'PASSIVE',
    usageLimits: { oncePerGame: true },
  },
  [careerAbilityId('entertainer')]: {
    trigger: 'LAND_ON_PLAYER',
    conditions: [{ kind: 'EVENT_OWNER_IS_EVENT_TARGET' }],
    effects: [{ type: 'ADD_FAME', amount: 1, reason: 'Main Character' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerRound: true },
  },
  [careerAbilityId('real-estate-investor')]: {
    trigger: 'PROPERTY_PURCHASED',
    conditions: [{ kind: 'EVENT_ACTOR_IS_SELF' }],
    effects: [{ type: 'ADD_WEALTH', amount: 2500, reason: 'Property Ladder' }],
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
