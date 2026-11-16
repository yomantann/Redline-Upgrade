export type BoardId = 'REDLINE_UPGRADE' | 'BIO_UPGRADE' | 'HAUNTED_UPGRADE' | 'WAGER_BOARD' | 'SOCIAL_BOARD';
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
    tagline: 'Own the night.',
    description: 'A neon-nightlife board with its own party challenges and 21+ play.',
    availability: 'AVAILABLE',
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
    playable: true,
    multiplayerAvailable: true,
  },
  {
    id: 'HAUNTED_UPGRADE',
    name: 'Haunted Upgrade',
    tagline: 'The house moves. The route changes.',
    description: 'Choose a path, tempt the doors, and outrun a living haunted estate.',
    availability: 'AVAILABLE',
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
    playable: true,
    multiplayerAvailable: true,
  },
  {
    id: 'WAGER_BOARD',
    name: 'Wager Board',
    tagline: 'Every move has a price.',
    description: 'A new board focused on calculated stakes and high-risk choices.',
    availability: 'IN_DEVELOPMENT',
    artwork: { mark: 'W', themeClass: 'wager-choice' },
    content: {
      dataSetId: 'wager-board',
      rulesetId: 'wager-board',
      cardSetId: 'wager-board',
      characterSetId: 'wager-board',
      assetSetId: 'wager-board',
      engineId: 'wager-board',
    },
    visualThemeId: 'wager',
    playable: false,
    multiplayerAvailable: false,
  },
  {
    id: 'SOCIAL_BOARD',
    name: 'Social Board',
    tagline: 'The room is part of the game.',
    description: 'A new board built around player interaction and social choices.',
    availability: 'IN_DEVELOPMENT',
    artwork: { mark: 'S', themeClass: 'social-choice' },
    content: {
      dataSetId: 'social-board',
      rulesetId: 'social-board',
      cardSetId: 'social-board',
      characterSetId: 'social-board',
      assetSetId: 'social-board',
      engineId: 'social-board',
    },
    visualThemeId: 'social',
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
