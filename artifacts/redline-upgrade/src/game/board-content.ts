import { assets, assetOptions as redlineAssetOptions, type AssetCategory, type AssetDefinition } from './assets';
import { BOARD_SPACES, type BoardSpace } from './board-data';
import { bioAssets, bioCards, bioCharacters, bioCareers, bioSpaces } from './bio-upgrade';
import { cards, type CardDefinition } from './cards';
import { careers, type Career } from './careers';
import { characters, type CharacterDefinition } from './characters';
import { DEFAULT_BOARD_ID, type BoardId } from './boards';

/** Board-owned content. The shared engine reads content only through this registry. */
export interface BoardContent {
  boardId: BoardId;
  characters: readonly CharacterDefinition[];
  careers: readonly Career[];
  cards: readonly CardDefinition[];
  assets: readonly AssetDefinition[];
  spaces: readonly BoardSpace[];
  finishSpace: number;
}

const contentByBoard: Partial<Record<BoardId, BoardContent>> = {
  REDLINE_UPGRADE: { boardId: 'REDLINE_UPGRADE', characters, careers, cards, assets, spaces: BOARD_SPACES, finishSpace: 75 },
  BIO_UPGRADE: { boardId: 'BIO_UPGRADE', characters: bioCharacters, careers: bioCareers, cards: bioCards, assets: bioAssets, spaces: bioSpaces, finishSpace: 75 },
};

export function hasBoardContent(boardId: string): boolean {
  return Object.prototype.hasOwnProperty.call(contentByBoard, boardId);
}

export function getBoardContent(boardId: BoardId = DEFAULT_BOARD_ID): BoardContent {
  const content = contentByBoard[boardId];
  if (!content) throw new Error(`No game content is registered for board: ${boardId}`);
  return content;
}

export function getBoardSpace(boardId: BoardId, position: number): BoardSpace | null {
  return position === 0 ? null : getBoardContent(boardId).spaces[position - 1] ?? null;
}

export function boardAssetOptions(boardId: BoardId, category: AssetCategory): readonly AssetDefinition[] {
  return boardId === 'REDLINE_UPGRADE'
    ? redlineAssetOptions(category)
    : getBoardContent(boardId).assets.filter((asset) => asset.category === category);
}
