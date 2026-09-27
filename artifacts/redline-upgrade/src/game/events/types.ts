/**
 * Core event type definitions for the Redline Upgrade event system.
 * 
 * Events flow through the system to trigger abilities and effects.
 * All events should include minimal required context to identify source and target.
 */

export type GameEventType =
  | 'TURN_START'
  | 'TURN_END'
  | 'DICE_ROLL'
  | 'DOUBLES_ROLLED'
  | 'ROLL_OF_2'
  | 'ROLL_OF_8'
  | 'PLAYER_MOVED'
  | 'PASS_SPACE'
  | 'LAND_ON_SPACE'
  | 'PASS_PLAYER'
  | 'LAND_ON_PLAYER'
  | 'SALARY_GATE'
  | 'CAREER_CHANGE'
  | 'MILESTONE'
  | 'CARD_DRAW'
  | 'CARD_RESOLVED'
  | 'ASSET_PURCHASED'
  | 'CAR_PURCHASED'
  | 'LIFESTYLE_PURCHASED'
  | 'PET_PURCHASED'
  | 'INVESTMENT_PURCHASED'
  | 'PROPERTY_PURCHASED'
  | 'WEALTH_CHANGED'
  | 'AI_SKILL_CHANGED'
  | 'FAME_CHANGED'
  | 'LIFESTYLE_CHANGED'
  | 'INFLUENCE_CHANGED'
  | 'PLAYER_AFFECTED';

/** Base event structure. All events extend this. */
export interface GameEvent {
  id: string;
  type: GameEventType;
  playerId: string; // Primary actor
  timestamp: number;
  /** Chain depth for infinite loop protection */
  depth: number;
  /** Where this event originated: 'GAME' (native), 'ABILITY', 'EFFECT' */
  source: 'GAME' | 'ABILITY' | 'EFFECT';
  /** Turn and round context for logging */
  turnIndex?: number;
  round?: number;
}

// Specific event payload types

export interface DiceRollEvent extends GameEvent {
  type: 'DICE_ROLL';
  die1: number;
  die2: number;
  total: number;
  doubles: boolean;
}

export interface DoublesRolledEvent extends GameEvent {
  type: 'DOUBLES_ROLLED';
  die1: number;
  die2: number;
}

export interface RollOf2Event extends GameEvent {
  type: 'ROLL_OF_2';
  die1: number;
  die2: number;
}

export interface RollOf8Event extends GameEvent {
  type: 'ROLL_OF_8';
  die1: number;
  die2: number;
}

export interface PlayerMovedEvent extends GameEvent {
  type: 'PLAYER_MOVED';
  previousPosition: number;
  newPosition: number;
  distance: number;
}

export interface PassSpaceEvent extends GameEvent {
  type: 'PASS_SPACE';
  spaceNumber: number;
  previousPosition: number;
  newPosition: number;
}

export interface LandOnSpaceEvent extends GameEvent {
  type: 'LAND_ON_SPACE';
  spaceNumber: number;
  previousPosition: number;
  newPosition: number;
}

export interface PassPlayerEvent extends GameEvent {
  type: 'PASS_PLAYER';
  targetPlayerId: string;
  targetPosition: number;
}

export interface LandOnPlayerEvent extends GameEvent {
  type: 'LAND_ON_PLAYER';
  targetPlayerId: string;
  targetPosition: number;
}

export interface SalaryGateEvent extends GameEvent {
  type: 'SALARY_GATE';
  spaceNumber: number;
  salaryAmount: number;
  previousWealth: number;
  newWealth: number;
}

export interface CareerChangeEvent extends GameEvent {
  type: 'CAREER_CHANGE';
  spaceNumber: number;
  previousCareerId: string | null;
  newCareerId: string | null;
  previousSalary: number;
  newSalary: number;
}

export interface MilestoneEvent extends GameEvent {
  type: 'MILESTONE';
  spaceNumber: number;
  milestoneType: 'car' | 'lifestyle' | 'companion' | 'property';
}

export interface CardDrawEvent extends GameEvent {
  type: 'CARD_DRAW';
  deck: string;
  spaceNumber: number;
}

export interface CardResolvedEvent extends GameEvent {
  type: 'CARD_RESOLVED';
  cardId: string;
  deck: string;
}

export interface AssetPurchasedEvent extends GameEvent {
  type: 'ASSET_PURCHASED';
  assetId: string;
  assetName: string;
  category: 'car' | 'lifestyle' | 'pet' | 'investment' | 'property';
  cost: number;
  previousWealth: number;
  newWealth: number;
}

export interface CarPurchasedEvent extends GameEvent {
  type: 'CAR_PURCHASED';
  assetId: string;
  assetName: string;
  cost: number;
  previousWealth: number;
  newWealth: number;
}

export interface LifestylePurchasedEvent extends GameEvent {
  type: 'LIFESTYLE_PURCHASED';
  assetId: string;
  assetName: string;
  cost: number;
  previousWealth: number;
  newWealth: number;
}

export interface PetPurchasedEvent extends GameEvent {
  type: 'PET_PURCHASED';
  assetId: string;
  assetName: string;
  cost: number;
  previousWealth: number;
  newWealth: number;
}

export interface InvestmentPurchasedEvent extends GameEvent {
  type: 'INVESTMENT_PURCHASED';
  assetId: string;
  assetName: string;
  cost: number;
  previousWealth: number;
  newWealth: number;
}

export interface PropertyPurchasedEvent extends GameEvent {
  type: 'PROPERTY_PURCHASED';
  assetId: string;
  assetName: string;
  cost: number;
  previousWealth: number;
  newWealth: number;
}

export interface WealthChangedEvent extends GameEvent {
  type: 'WEALTH_CHANGED';
  previousValue: number;
  newValue: number;
  delta: number;
  reason: string;
  source: 'GAME' | 'ABILITY' | 'EFFECT';
}

export interface AISkillChangedEvent extends GameEvent {
  type: 'AI_SKILL_CHANGED';
  previousValue: number;
  newValue: number;
  delta: number;
  reason: string;
  source: 'GAME' | 'ABILITY' | 'EFFECT';
}

export interface FameChangedEvent extends GameEvent {
  type: 'FAME_CHANGED';
  previousValue: number;
  newValue: number;
  delta: number;
  reason: string;
  source: 'GAME' | 'ABILITY' | 'EFFECT';
}

export interface LifestyleChangedEvent extends GameEvent {
  type: 'LIFESTYLE_CHANGED';
  previousValue: number;
  newValue: number;
  delta: number;
  reason: string;
  source: 'GAME' | 'ABILITY' | 'EFFECT';
}

export interface InfluenceChangedEvent extends GameEvent {
  type: 'INFLUENCE_CHANGED';
  previousValue: number;
  newValue: number;
  delta: number;
  reason: string;
  source: 'GAME' | 'ABILITY' | 'EFFECT';
}

export interface PlayerAffectedEvent extends GameEvent {
  type: 'PLAYER_AFFECTED';
  affectedPlayerId: string;
  effectType: string;
  description: string;
}

export interface TurnStartEvent extends GameEvent {
  type: 'TURN_START';
  turnIndex: number;
  round: number;
}

export interface TurnEndEvent extends GameEvent {
  type: 'TURN_END';
  turnIndex: number;
  round: number;
}

/** Union type of all possible events */
export type AnyGameEvent =
  | DiceRollEvent
  | DoublesRolledEvent
  | RollOf2Event
  | RollOf8Event
  | PlayerMovedEvent
  | PassSpaceEvent
  | LandOnSpaceEvent
  | PassPlayerEvent
  | LandOnPlayerEvent
  | SalaryGateEvent
  | CareerChangeEvent
  | MilestoneEvent
  | CardDrawEvent
  | CardResolvedEvent
  | AssetPurchasedEvent
  | CarPurchasedEvent
  | LifestylePurchasedEvent
  | PetPurchasedEvent
  | InvestmentPurchasedEvent
  | PropertyPurchasedEvent
  | WealthChangedEvent
  | AISkillChangedEvent
  | FameChangedEvent
  | LifestyleChangedEvent
  | InfluenceChangedEvent
  | PlayerAffectedEvent
  | TurnStartEvent
  | TurnEndEvent;
