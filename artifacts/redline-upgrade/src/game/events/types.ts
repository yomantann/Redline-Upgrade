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
  | 'BOARD_EFFECT_RESOLVED'
  | 'CARD_DRAW'
  | 'CARD_RESOLVED'
  | 'UPGRADE_TOKEN_GAINED'
  | 'UPGRADE_TOKEN_SPENT'
  | 'UPGRADE_TOKEN_HELD'
  | 'ASSET_UPGRADED'
  | 'MILESTONE_RECOVERED'
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
  | 'PLAYER_AFFECTED'
  | 'FINISH_LINE_REACHED'
  | 'ENDGAME_STARTED'
  | 'ENDGAME_CHOICE_SELECTED'
  | 'CASH_OUT_RESOLVED'
  | 'DOUBLE_DOWN_RESOLVED'
  | 'FINAL_GAMBLE_RESOLVED'
  | 'ENDGAME_COMPLETED';

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
  effectId?: string;
  deck?: DeckId;
  cardId?: string;
  assetId?: string;
  assetName?: string;
  assetLevel?: number;
  previousAssetValue?: number;
  newAssetValue?: number;
  category?: AssetCategory;
  cost?: number;
  stat?: PlayerStat;
  previousValue?: number;
  newValue?: number;
  delta?: number;
  reason?: string;
  description?: string;
  effectType?: string;
  endgameChoice?: 'CASH_OUT' | 'DOUBLE_DOWN' | 'FINAL_GAMBLE';
  baseValue?: number;
  finalGameValue?: number;
  multiplier?: number;
  tokenTier?: number;
  effectiveRoll?: number;
}

export type AnyGameEvent = GameEvent;

export interface EventLogEntry {
  id: string;
  kind: 'EVENT';
  eventType: GameEventType;
  source: EventSource;
  playerId: string;
  targetPlayerId?: string;
  abilityId?: string;
  label: string;
  detail: string;
  amount?: number;
  assetName?: string;
  assetLevel?: number;
  previousAssetValue?: number;
  newAssetValue?: number;
  salaryAmount?: number;
  previousWealth?: number;
  newWealth?: number;
  previousSalary?: number;
  newSalary?: number;
  stat?: PlayerStat;
  previousValue?: number;
  newValue?: number;
  delta?: number;
  baseValue?: number;
  finalGameValue?: number;
  reason?: string;
  blocked?: boolean;
  round: number;
  turnIndex: number;
  depth: number;
  timestamp: number;
}
