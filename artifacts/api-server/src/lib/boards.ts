// Server-side board registry. Board IDs are stable platform identifiers and must stay
// in sync with artifacts/redline-upgrade/src/game/boards.ts.
export const BOARD_IDS = ["REDLINE_UPGRADE", "BIO_UPGRADE", "HAUNTED_UPGRADE"] as const;
export type BoardId = (typeof BOARD_IDS)[number];

export const MULTIPLAYER_MODE = "MULTIPLAYER";
export const MAX_ROOM_PLAYERS = 4;
export const MIN_ROOM_PLAYERS = 2;

const multiplayerBoards: ReadonlySet<string> = new Set<BoardId>(["REDLINE_UPGRADE"]);

export function isKnownBoard(boardId: string): boardId is BoardId {
  return (BOARD_IDS as readonly string[]).includes(boardId);
}

export function isMultiplayerBoardAvailable(boardId: string): boolean {
  return multiplayerBoards.has(boardId);
}
