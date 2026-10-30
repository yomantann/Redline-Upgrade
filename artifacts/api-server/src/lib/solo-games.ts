import { and, desc, eq } from "drizzle-orm";
import {
  db,
  soloGamesTable,
  usersTable,
} from "@workspace/db";
import {
  applySoloPlayerAction,
  type ClientAction,
  type MatchAssetEvent,
} from "../../../redline-upgrade/src/game/multiplayer";
import { findBoardDefinition } from "../../../redline-upgrade/src/game/boards";
import { createMatch, type Match } from "../../../redline-upgrade/src/game/match";
import { recordCompletedGame } from "./progression";
import { getCosmeticIdentity } from "./cosmetics";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface SoloGameState {
  match: Match;
  assetEvents: MatchAssetEvent[];
}

export interface SoloGameSnapshot {
  gameId: string;
  version: number;
  match: Match;
  newlyUnlocked: string[];
}

export type SoloGameResult =
  | { kind: "ok"; snapshot: SoloGameSnapshot }
  | { kind: "not_found" }
  | { kind: "conflict"; message: string }
  | { kind: "invalid"; message: string };

function snapshot(gameId: string, version: number, state: SoloGameState, newlyUnlocked: string[] = []): SoloGameSnapshot {
  return { gameId, version, match: state.match, newlyUnlocked };
}

function accountDisplayName(user?: { displayName?: string | null; firstName?: string | null; lastName?: string | null }, fallback = "You"): string {
  return user?.displayName?.trim()
    || [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim()
    || fallback;
}

function withPlayerDisplayName(state: SoloGameState, displayName: string): SoloGameState {
  return {
    ...state,
    match: {
      ...state.match,
      players: state.match.players.map((player, index) => index === 0 ? { ...player, displayName } : player),
    },
  };
}

export async function getActiveSoloGame(userId: string): Promise<SoloGameSnapshot | null> {
  const [game] = await db.select().from(soloGamesTable)
    .where(and(eq(soloGamesTable.userId, userId), eq(soloGamesTable.status, "active")))
    .orderBy(desc(soloGamesTable.updatedAt))
    .limit(1);
  if (!game) return null;
  const [user] = await db.select({
    displayName: usersTable.displayName,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
  }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const state = withPlayerDisplayName(game.state as SoloGameState, accountDisplayName(user));
  return snapshot(game.id, game.version, state);
}

export async function startSoloGame(userId: string, boardId: string, characterId: string, displayName = "You"): Promise<SoloGameResult> {
  return db.transaction(async (tx): Promise<SoloGameResult> => {
    const [user] = await tx.select({ id: usersTable.id, displayName: usersTable.displayName, firstName: usersTable.firstName, lastName: usersTable.lastName })
      .from(usersTable).where(eq(usersTable.id, userId)).for("update").limit(1);
    if (!user) return { kind: "not_found" };
    const board = findBoardDefinition(boardId);
    if (!board?.playable || !characterId.trim() || characterId.length > 80) {
      return { kind: "invalid", message: "Choose an available board and a valid character." };
    }

    const name = accountDisplayName(user, displayName);
    let match: Match;
    try {
      match = createMatch(characterId, board.id, "SINGLE_PLAYER");
    } catch {
      return { kind: "invalid", message: "That character is not available for this board." };
    }
    const identity = (await getCosmeticIdentity([userId])).get(userId);
    match = {
      ...match,
      players: match.players.map((player, index) => index === 0 ? {
        ...player,
        displayName: name,
        portraitImagePath: identity?.skins[player.characterId] ?? null,
        playerLogoPath: identity?.logoPath ?? null,
      } : player),
    };

    // Only one live solo run is kept for an account. Starting another safely abandons the old one;
    // unfinished matches never enter lifetime totals or award achievements.
    await tx.update(soloGamesTable)
      .set({ status: "abandoned", updatedAt: new Date() })
      .where(and(eq(soloGamesTable.userId, userId), eq(soloGamesTable.status, "active")));
    const state: SoloGameState = { match, assetEvents: [] };
    const [game] = await tx.insert(soloGamesTable).values({ userId, state }).returning();
    return { kind: "ok", snapshot: snapshot(game.id, game.version, state) };
  });
}

export async function submitSoloGameAction(
  gameId: string,
  userId: string,
  action: unknown,
  expectedVersion: number,
): Promise<SoloGameResult> {
  return db.transaction(async (tx): Promise<SoloGameResult> => {
    const [game] = await tx.select().from(soloGamesTable)
      .where(and(eq(soloGamesTable.id, gameId), eq(soloGamesTable.userId, userId)))
      .for("update").limit(1);
    if (!game) return { kind: "not_found" };
    if (game.status !== "active") return { kind: "conflict", message: "This solo game is no longer active." };
    if (game.version !== expectedVersion) return { kind: "conflict", message: "The game state changed. Refresh and try again." };
    const [user] = await tx.select({
      displayName: usersTable.displayName,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
    }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const current = withPlayerDisplayName(game.state as SoloGameState, accountDisplayName(user));
    const result = applySoloPlayerAction(current.match, action as ClientAction);
    if (!result) return { kind: "conflict", message: "That action is not allowed right now." };
    const nextState: SoloGameState = {
      match: result.match,
      assetEvents: [...(current.assetEvents ?? []), ...result.assetEvents],
    };
    const nextVersion = game.version + 1;
    const completed = nextState.match.phase === "complete";
    const completedAt = completed ? new Date() : null;
    const newlyUnlocked = completed
      ? await recordCompletedGame(tx, "SOLO", gameId, userId, nextState.match, 0, nextState.assetEvents, completedAt!)
      : [];
    await tx.update(soloGamesTable)
      .set({
        state: nextState,
        version: nextVersion,
        status: completed ? "completed" : "active",
        updatedAt: new Date(),
        completedAt,
      })
      .where(eq(soloGamesTable.id, gameId));
    return { kind: "ok", snapshot: snapshot(gameId, nextVersion, nextState, newlyUnlocked) };
  });
}
