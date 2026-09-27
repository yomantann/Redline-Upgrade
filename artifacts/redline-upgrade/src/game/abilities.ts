import type { AssetCategory } from './assets';
import type { DeckId } from './decks';
import type { GameEventType } from './events/types';
import type { CareerCategoryTag } from './careers';
import type { PlayerStat } from './player';

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
  ['guardian_h', 'Hold the Line', 'Stands firm when everything else gives way.'],
  ['click_click', 'Quick Draw', 'Acts before the moment has a chance to disappear.'],
  ['frostbyte', 'Deep Freeze', 'Keeps calm when the system starts to burn.'],
  ['sadman', 'Last Laugh', 'Finds an opening when the odds look hopeless.'],
  ['rainbow_dash', 'Prismatic Rush', 'Turns momentum into a signature move.'],
  ['accuser', 'Call It Out', 'Exposes what others would rather keep hidden.'],
  ['low_flame', 'Slow Burn', 'Builds pressure without drawing attention.'],
  ['wandering_eye', 'Peripheral Vision', 'Spots possibilities just outside the obvious route.'],
  ['the_rind', 'Hard Exterior', 'Endures the hits that would stop someone else.'],
  ['anointed', 'Chosen Path', 'Turns conviction into an unmistakable presence.'],
  ['executive_p', 'Power Move', 'Knows when to make an offer nobody can ignore.'],
  ['alpha_prime', 'Prime Directive', 'Cuts through uncertainty with decisive focus.'],
  ['roll_safe', 'Calculated Risk', 'Finds the safest angle in a dangerous situation.'],
  ['hotwired', 'Jump Start', 'Gets moving when the whole system stalls.'],
  ['panic_bot', 'Red Alert', 'Senses trouble before it reaches the rest of the crew.'],
  ['primate', 'Wild Instinct', 'Trusts a gut feeling when logic runs out.'],
  ['pain_hider', 'Poker Face', 'Reveals nothing, even under pressure.'],
  ['prom_king', 'Spotlight', 'Commands the room before saying a word.'],
  ['idol_core', 'Main Character', 'Captures attention wherever the signal reaches.'],
  ['danger_zone', 'Full Throttle', 'Leans in when everyone else backs away.'],
  ['the_tank', 'Breakthrough', 'Pushes forward when the way is blocked.'],
] as const;

const careerText = [
  ['ai-engineer', 'MODEL UPGRADE', 'Gain extra AI Skill from future AI-related events.'],
  ['race-driver', 'NEED FOR SPEED', 'Future car ownership can unlock special benefits.'],
  ['content-creator', 'GO VIRAL', 'Gain extra Fame from future Fame events.'],
  ['gig-worker', 'SIDE HUSTLE', 'Future Event spaces can award extra Wealth.'],
  ['lawyer', 'OBJECTION', 'A future ability can cancel one negative penalty.'],
  ['pro-gamer', 'SWEAT THE ODDS', 'Future successful Gamble spaces can pay more.'],
  ['doctor', 'HEALTH INSURANCE', 'A future ability can ignore one health-related penalty.'],
  ['personal-trainer', 'LOCKED IN', 'Gain Lifestyle more efficiently in future systems.'],
  ['degen-trader', 'YOLO', 'Future Gamble wins can deliver stronger rewards.'],
  ['startup-founder', 'EQUITY', 'Future risky events can award extra Wealth.'],
  ['influencer', 'ENGAGEMENT', 'Some future Fame gains can create extra Wealth.'],
  ['corporate-executive', 'GOLDEN HANDCUFFS', 'Stable salary with less flexibility in future decisions.'],
  ['cybersecurity-specialist', 'ZERO DAY', 'A future ability can avoid one negative Event.'],
  ['entertainer', 'MAIN CHARACTER', 'Future player interactions can award Fame.'],
  ['real-estate-investor', 'PROPERTY LADDER', 'Future property purchases can grant extra benefits.'],
] as const;

const overrides: Partial<Record<string, Omit<AbilityDefinition, 'id' | 'name' | 'description'>>> = {
  [characterAbilityId('guardian_h')]: {
    trigger: 'TURN_START',
    conditions: [{ kind: 'ANY' }],
    effects: [{ type: 'PROTECT_FROM_EFFECT', amount: 1, reason: 'Guardian H protection charge' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerTurn: true },
  },
  [characterAbilityId('click_click')]: {
    trigger: 'LAND_ON_PLAYER',
    conditions: [{ kind: 'EVENT_HAS_TARGET_PLAYER' }, { kind: 'TARGET_IS_OTHER_PLAYER' }],
    effects: [{ type: 'ADD_INFLUENCE', amount: 5, reason: 'Quick Draw' }],
    mode: 'PASSIVE',
  },
  [characterAbilityId('idol_core')]: {
    trigger: 'DOUBLES_ROLLED',
    conditions: [{ kind: 'ANY' }],
    effects: [{ type: 'ADD_FAME', amount: 5, reason: 'Main Character' }],
    mode: 'PASSIVE',
  },
  [characterAbilityId('hotwired')]: {
    trigger: 'ASSET_PURCHASED',
    conditions: [{ kind: 'ANY' }],
    effects: [{ type: 'ADD_LIFESTYLE', amount: 5, reason: 'Jump Start' }],
    mode: 'PASSIVE',
  },
  [characterAbilityId('alpha_prime')]: {
    trigger: 'DICE_ROLL',
    conditions: [{ kind: 'ANY' }],
    effects: [{ type: 'MODIFY_SALARY', amount: 5000, reason: 'Prime Directive' }],
    mode: 'PASSIVE',
    usageLimits: { oncePerTurn: true },
  },
  [careerAbilityId('degen-trader')]: {
    trigger: 'ROLL_OF_8',
    conditions: [{ kind: 'ANY' }, { kind: 'PLAYER_CAREER_TAG', tag: 'risk' }],
    effects: [{ type: 'ADD_WEALTH', amount: 10000, reason: 'YOLO' }],
    mode: 'PASSIVE',
  },
  [careerAbilityId('real-estate-investor')]: {
    trigger: 'ASSET_PURCHASED',
    conditions: [{ kind: 'ANY' }, { kind: 'EVENT_CATEGORY_IS', category: 'property' }],
    effects: [{ type: 'ADD_LIFESTYLE', amount: 5, reason: 'Property Ladder' }],
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
