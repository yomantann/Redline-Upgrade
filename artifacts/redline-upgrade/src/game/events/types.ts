import type { AssetCategory } from '../assets';
import type { DeckId } from '../decks';
import type { PlayerStat } from '../player';

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

export type EventSource = 'GAME' | 'ABILITY' | 'EFFECT';
export type CareerEventStage = 'TRIGGERED' | 'RESOLVED';
export type MilestoneType = 'car' | 'lifestyle' | 'companion' | 'property';

export interface GameEvent {
  id: string;
  type: GameEventType;
  playerId: string;
  playerIndex: number;
  timestamp: number;
  depth: number;
  source: EventSource;
  turnIndex: number;
  round: number;
  sourceEventId?: string;
  abilityId?: string;
  die1?: number;
  die2?: number;
  total?: number;
  doubles?: boolean;
  previousPosition?: number;
  newPosition?: number;
  distance?: number;
  spaceNumber?: number;
  targetPlayerId?: string;
  targetPlayerIndex?: number;
  targetPosition?: number;
  salaryAmount?: number;
  previousWealth?: number;
  newWealth?: number;
  previousCareerId?: string | null;
  newCareerId?: string | null;
  previousSalary?: number;
  newSalary?: number;
  stage?: CareerEventStage;
  milestoneType?: MilestoneType;
  deck?: DeckId;
  cardId?: string;
  assetId?: string;
  assetName?: string;
  category?: AssetCategory;
  cost?: number;
  stat?: PlayerStat;
  previousValue?: number;
  newValue?: number;
  delta?: number;
  reason?: string;
  description?: string;
  effectType?: string;
}

export type AnyGameEvent = GameEvent;

export interface EventLogEntry {
  id: string;
  kind: 'EVENT';
  eventType: GameEventType;
  playerId: string;
  targetPlayerId?: string;
  abilityId?: string;
  label: string;
  detail: string;
  amount?: number;
  blocked?: boolean;
  round: number;
  turnIndex: number;
  depth: number;
  timestamp: number;
}
