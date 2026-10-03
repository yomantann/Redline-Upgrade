import { and, eq, ne } from "drizzle-orm";
import {
  db,
  gameRoomsTable,
  roomMatchesTable,
  roomPlayersTable,
  type RoomPlayer,
} from "@workspace/db";
import type { MatchSnapshot } from "@workspace/api-zod";
import {
  applyPlayerAction,
  describeTurn,
  seatForUser,
  type ClientAction,
  type MultiplayerMatchState,
} from "../../../redline-upgrade/src/game/multiplayer";
import { DISCONNECT_AFTER_MS } from "./rooms";

export type MatchError =
  | { kind: "not_found" }
  | { kind: "forbidden"; message: string }
  | { kind: "conflict"; message: string }
  | { kind: "invalid"; message: string };

export type MatchResult = { kind: "ok"; snapshot: MatchSnapshot } | MatchError;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function buildSnapshot(
  roomId: string,
  version: number,
  state: MultiplayerMatchState,
  userId: string,
  members: RoomPlayer[],
): MatchSnapshot {
  const you = seatForUser(state, userId)!;
  const turn = describeTurn(state);
  const now = Date.now();
  return {
    roomId,
    version,
    you,
    currentPlayerIndex: turn.currentPlayerIndex,
    currentUserId: turn.currentUserId,
    seats: state.seats.map((seat) => {
      const member = members.find((candidate) => candidate.userId === seat.userId);
      return {
        userId: seat.userId,
        playerId: seat.playerId,
        playerIndex: seat.playerIndex,
        displayName: state.match.players[seat.playerIndex]?.displayName ?? "Player",
        connected: Boolean(
          member &&
            member.status === "joined" &&
            now - member.lastSeenAt.getTime() <= DISCONNECT_AFTER_MS,
        ),
      };
    }),
    match: state.match as unknown as MatchSnapshot["match"],
  };
}

async function loadForMember(tx: Tx, roomId: string, userId: string) {
  const [room] = await tx.select().from(gameRoomsTable).where(eq(gameRoomsTable.id, roomId)).for("update").limit(1);
  if (!room) return null;
  const [row] = await tx.select().from(roomMatchesTable).where(eq(roomMatchesTable.roomId, roomId)).for("update").limit(1);
  if (!row) return null;
  const state = row.state as MultiplayerMatchState;
  // Seats persist for the whole match, so a player who left or refreshed keeps their slot.
  if (!seatForUser(state, userId)) return null;
  return { room, row, state };
}

async function members(tx: Tx, roomId: string): Promise<RoomPlayer[]> {
  return tx.select().from(roomPlayersTable).where(eq(roomPlayersTable.roomId, roomId));
}

/** Member-only read. Doubles as heartbeat: refreshing/reconnecting recovers the slot and current state. */
export async function getMatchForMember(roomId: string, userId: string): Promise<MatchResult> {
  return db.transaction(async (tx): Promise<MatchResult> => {
    const loaded = await loadForMember(tx, roomId, userId);
    if (!loaded) return { kind: "not_found" };
    await tx
      .update(roomPlayersTable)
      .set({ lastSeenAt: new Date(), status: "joined" })
      .where(and(eq(roomPlayersTable.roomId, roomId), eq(roomPlayersTable.userId, userId)));
    return {
      kind: "ok",
      snapshot: buildSnapshot(roomId, loaded.row.version, loaded.state, userId, await members(tx, roomId)),
    };
  });
}

export async function submitMatchAction(
  roomId: string,
  userId: string,
  action: unknown,
  expectedVersion?: number,
): Promise<MatchResult> {
  return db.transaction(async (tx): Promise<MatchResult> => {
    const loaded = await loadForMember(tx, roomId, userId);
    if (!loaded) return { kind: "not_found" };
    const { room, row, state } = loaded;
    if (room.status !== "in_progress") {
      return { kind: "conflict", message: "This match is not in progress." };
    }
    if (expectedVersion !== undefined && expectedVersion !== row.version) {
      return { kind: "conflict", message: "The game state changed. Refresh and try again." };
    }
    const result = applyPlayerAction(state, userId, action as ClientAction);
    if (!result.ok) {
      switch (result.reason) {
        case "INVALID_ACTION":
          return { kind: "invalid", message: result.message };
        case "NOT_YOUR_TURN":
          return { kind: "forbidden", message: result.message };
        case "NOT_A_PLAYER":
          return { kind: "not_found" };
        default:
          return { kind: "conflict", message: result.message };
      }
    }
    const version = row.version + 1;
    await tx
      .update(roomMatchesTable)
      .set({ state: result.state, version, updatedAt: new Date() })
      .where(eq(roomMatchesTable.roomId, roomId));
    await tx
      .update(roomPlayersTable)
      .set({ lastSeenAt: new Date(), status: "joined" })
      .where(and(eq(roomPlayersTable.roomId, roomId), eq(roomPlayersTable.userId, userId), ne(roomPlayersTable.status, "left")));
    await tx
      .update(gameRoomsTable)
      .set({
        updatedAt: new Date(),
        ...(result.state.match.phase === "complete" ? { status: "completed" as const } : {}),
      })
      .where(eq(gameRoomsTable.id, roomId));
    return {
      kind: "ok",
      snapshot: buildSnapshot(roomId, version, result.state, userId, await members(tx, roomId)),
    };
  });
}
