export type BoardId = 'REDLINE_UPGRADE' | 'BIO_MODE';
export type GameMode = 'SINGLE_PLAYER' | 'MULTIPLAYER';

export interface BoardDefinition {
  id: BoardId;
  name: string;
  tagline: string;
  description: string;
  dataSetId: string;
  rulesetId: string;
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
    dataSetId: 'redline-upgrade',
    rulesetId: 'redline-upgrade',
    visualThemeId: 'redline',
    playable: true,
    multiplayerAvailable: false,
  },
  {
    id: 'BIO_MODE',
    name: 'Bio Mode',
    tagline: 'A different kind of game.',
    description: 'A separate board and game experience, in development.',
    dataSetId: 'bio-mode',
    rulesetId: 'bio-mode',
    visualThemeId: 'bio',
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
