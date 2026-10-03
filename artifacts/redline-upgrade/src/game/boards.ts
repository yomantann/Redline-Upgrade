export type BoardId = 'REDLINE_UPGRADE' | 'BIO_UPGRADE' | 'HAUNTED_UPGRADE';
export type GameMode = 'SINGLE_PLAYER' | 'MULTIPLAYER';
export type BoardAvailability = 'AVAILABLE' | 'IN_DEVELOPMENT' | 'COMING_SOON';

/**
 * Platform-level description of a board. Each board owns its own content: rules,
 * cards, characters, assets and engine configuration are referenced by ID so a new
 * board only needs to register an entry here plus its own content modules.
 */
export interface BoardDefinition {
  id: BoardId;
  name: string;
  tagline: string;
  description: string;
  availability: BoardAvailability;
  artwork: { mark: string; themeClass: string };
  content: {
    dataSetId: string;
    rulesetId: string;
    cardSetId: string;
    characterSetId: string;
    assetSetId: string;
    engineId: string;
  };
  visualThemeId: string;
  playable: boolean;
  multiplayerAvailable: boolean;
}

export const boards: readonly BoardDefinition[] = [
  {
    id: 'REDLINE_UPGRADE',
    name: 'Redline Upgrade',
    tagline: 'The original race.',
    description: 'Build your career, collect assets, and outpace three CPU rivals.',
    availability: 'AVAILABLE',
    artwork: { mark: 'R', themeClass: 'redline-choice' },
    content: {
      dataSetId: 'redline-upgrade',
      rulesetId: 'redline-upgrade',
      cardSetId: 'redline-upgrade',
      characterSetId: 'redline-upgrade',
      assetSetId: 'redline-upgrade',
      engineId: 'redline-upgrade',
    },
    visualThemeId: 'redline',
    playable: true,
    multiplayerAvailable: true,
  },
  {
    id: 'BIO_UPGRADE',
    name: 'Bio Upgrade',
    tagline: 'A different kind of game.',
    description: 'A separate board and game experience, in development.',
    availability: 'IN_DEVELOPMENT',
    artwork: { mark: 'B', themeClass: 'bio-choice' },
    content: {
      dataSetId: 'bio-upgrade',
      rulesetId: 'bio-upgrade',
      cardSetId: 'bio-upgrade',
      characterSetId: 'bio-upgrade',
      assetSetId: 'bio-upgrade',
      engineId: 'bio-upgrade',
    },
    visualThemeId: 'bio',
    playable: false,
    multiplayerAvailable: false,
  },
  {
    id: 'HAUNTED_UPGRADE',
    name: 'Haunted Upgrade',
    tagline: 'Something stirs after dark.',
    description: 'A haunted board with its own rules, cards and cast. Coming soon.',
    availability: 'COMING_SOON',
    artwork: { mark: 'H', themeClass: 'haunted-choice' },
    content: {
      dataSetId: 'haunted-upgrade',
      rulesetId: 'haunted-upgrade',
      cardSetId: 'haunted-upgrade',
      characterSetId: 'haunted-upgrade',
      assetSetId: 'haunted-upgrade',
      engineId: 'haunted-upgrade',
    },
    visualThemeId: 'haunted',
    playable: false,
    multiplayerAvailable: false,
  },
];

export const DEFAULT_BOARD_ID: BoardId = 'REDLINE_UPGRADE';

export function getBoardDefinition(boardId: BoardId): BoardDefinition {
  const board = boards.find((item) => item.id === boardId);
  if (!board) throw new Error(`Unknown board: ${boardId}`);
  return board;
}

export function findBoardDefinition(boardId: string): BoardDefinition | undefined {
  return boards.find((item) => item.id === boardId);
}

export function boardAvailabilityLabel(board: BoardDefinition): string {
  if (board.availability === 'AVAILABLE') return 'READY TO PLAY';
  return board.availability === 'COMING_SOON' ? 'COMING SOON' : 'IN DEVELOPMENT';
}
