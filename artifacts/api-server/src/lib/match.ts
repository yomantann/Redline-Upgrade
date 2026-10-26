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
  AUTOPLAY_AFTER_MS,
  MAX_MISSED_TURNS,
  applyPlayerAction,
  autoplayIfStale,
  describeTurn,
  seatForUser,
  type ClientAction,
  type MultiplayerMatchState,
} from "../../../redline-upgrade/src/game/multiplayer";
import { DISCONNECT_AFTER_MS } from "./rooms";

const KICKED_MESSAGE = "You were removed from this match for missing too many turns.";
export const DISCONNECT_GRACE_MS = 30_000;
const recoveryHours = Number(process.env.MULTIPLAYER_RECOVERY_HOURS ?? 24);
export const RECOVERY_EXPIRATION_MS =
  (Number.isFinite(recoveryHours) && recoveryHours > 0 ? recoveryHours : 24) * 60 * 60 * 1000;

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
    actionAt: state.actionAt,
    autoplayAfterMs: AUTOPLAY_AFTER_MS,
    maxMissedTurns: MAX_MISSED_TURNS,
    pausedAt: state.pausedAt ?? null,
    abandoned: Boolean(state.abandoned),
    seats: state.seats.map((seat) => {
      const member = members.find((candidate) => candidate.userId === seat.userId);
      return {
        userId: seat.userId,
        playerId: seat.playerId,
        playerIndex: seat.playerIndex,
        displayName: state.match.players[seat.playerIndex]?.displayName ?? "Player",
        missedTurns: state.missedTurns[seat.userId] ?? 0,
        kicked: state.kicked.includes(seat.userId),
        cpuControlled: Boolean(
          member &&
            (member.status === "left" ||
              (member.status === "disconnected" &&
                now - member.lastSeenAt.getTime() >= DISCONNECT_AFTER_MS + DISCONNECT_GRACE_MS)),
        ),
        cpuTurns: state.cpuTurns?.[seat.userId] ?? 0,
        fastCpu: (state.cpuTurns?.[seat.userId] ?? 0) >= 4,
        connected: Boolean(
          !state.kicked.includes(seat.userId) &&
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

/**
 * Applies idle-player rules to the stored state and persists the outcome. Kicked users are marked as
 * having left the room so the lobby no longer lists them; their seat stays in the match as an
 * auto-played ghost so turn order and the shared state are never disturbed.
 */
async function settleIdle(
  tx: Tx,
  roomId: string,
  row: { version: number },
  state: MultiplayerMatchState,
): Promise<{ state: MultiplayerMatchState; version: number }> {
  const now = Date.now();
  const players = await members(tx, roomId);
  let connectionStatusChanged = false;
  for (const player of players) {
    if (player.status === "joined" && now - player.lastSeenAt.getTime() > DISCONNECT_AFTER_MS) {
      await tx.update(roomPlayersTable).set({ status: "disconnected" })
        .where(eq(roomPlayersTable.id, player.id));
      player.status = "disconnected";
      connectionStatusChanged = true;
    }
  }
  const humansOnline = players.some((player) =>
    player.status === "joined" && now - player.lastSeenAt.getTime() <= DISCONNECT_AFTER_MS,
  );
  if (!humansOnline) {
    const pausedAt = state.pausedAt ?? now;
    const expired = now - pausedAt >= RECOVERY_EXPIRATION_MS;
    const pausedState = {
      ...state,
      pausedAt,
      abandoned: expired || state.abandoned,
      recoveryStatus: expired ? "ABANDONED" as const : "PAUSED_NO_HUMANS" as const,
    };
    if (expired) {
      await tx.update(gameRoomsTable).set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(gameRoomsTable.id, roomId));
    }
    if (!state.pausedAt || expired !== Boolean(state.abandoned)) {
      const version = row.version + 1;
      await tx.update(roomMatchesTable).set({ state: pausedState, version, updatedAt: new Date() })
        .where(eq(roomMatchesTable.roomId, roomId));
      return { state: pausedState, version };
    }
    return { state: pausedState, version: row.version };
  }

  const cpuControlled = new Set(players
    .filter((player) =>
      player.status === "left" ||
      (player.status === "disconnected" &&
        now - player.lastSeenAt.getTime() >= DISCONNECT_AFTER_MS + DISCONNECT_GRACE_MS),
    )
    .map((player) => player.userId));
  const resumedState = state.pausedAt
    ? { ...state, pausedAt: null, recoveryStatus: null }
    : state;
  const result = autoplayIfStale(resumedState, cpuControlled, now);
  if (!result.changed && resumedState === state && !connectionStatusChanged) {
    return { state, version: row.version };
  }
  const nextState = result.state;
  const version = row.version + 1;
  await tx
    .update(roomMatchesTable)
    .set({ state: nextState, version, updatedAt: new Date() })
    .where(eq(roomMatchesTable.roomId, roomId));
  if (nextState.match.phase === "complete") {
    await tx
      .update(gameRoomsTable)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(gameRoomsTable.id, roomId));
  }
  return { state: nextState, version };
}

async function members(tx: Tx, roomId: string): Promise<RoomPlayer[]> {
  return tx.select().from(roomPlayersTable).where(eq(roomPlayersTable.roomId, roomId));
}

/** Server-side watchdog: recovery still runs if every browser closes. */
export async function tickActiveMatches(): Promise<void> {
  const active = await db.select({ id: gameRoomsTable.id })
    .from(gameRoomsTable)
    .where(eq(gameRoomsTable.status, "in_progress"));
  for (const { id } of active) {
    await db.transaction(async (tx) => {
      const [room] = await tx.select().from(gameRoomsTable)
        .where(eq(gameRoomsTable.id, id)).for("update").limit(1);
      if (!room || room.status !== "in_progress") return;
      const [row] = await tx.select().from(roomMatchesTable)
        .where(eq(roomMatchesTable.roomId, id)).for("update").limit(1);
      if (row) await settleIdle(tx, id, row, row.state as MultiplayerMatchState);
    });
  }
}

/** Member-only read. Doubles as heartbeat: refreshing/reconnecting recovers the slot and current state. */
export async function getMatchForMember(roomId: string, userId: string): Promise<MatchResult> {
  return db.transaction(async (tx): Promise<MatchResult> => {
    const loaded = await loadForMember(tx, roomId, userId);
    if (!loaded) return { kind: "not_found" };
    if (loaded.state.abandoned || loaded.room.status === "cancelled") return { kind: "not_found" };
    // Refreshing/reconnecting counts as being present; it does not reset the idle clock.
    await tx
      .update(roomPlayersTable)
      .set({ lastSeenAt: new Date(), status: "joined" })
      .where(and(eq(roomPlayersTable.roomId, roomId), eq(roomPlayersTable.userId, userId)));
    const recoveredState = {
      ...loaded.state,
      kicked: loaded.state.kicked.filter((id) => id !== userId),
      cpuTurns: { ...(loaded.state.cpuTurns ?? {}), [userId]: 0 },
    };
    let version = loaded.row.version;
    if (loaded.state.kicked.includes(userId) || (loaded.state.cpuTurns?.[userId] ?? 0) > 0) {
      version += 1;
      await tx.update(roomMatchesTable)
        .set({ state: recoveredState, version, updatedAt: new Date() })
        .where(eq(roomMatchesTable.roomId, roomId));
    }
    const settled = await settleIdle(tx, roomId, { version }, recoveredState);
    return {
      kind: "ok",
      snapshot: buildSnapshot(roomId, settled.version, settled.state, userId, await members(tx, roomId)),
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
    const { room, row } = loaded;
    if (loaded.state.abandoned || room.status === "cancelled") {
      return { kind: "conflict", message: "This match has expired." };
    }
    if (room.status !== "in_progress") {
      return { kind: "conflict", message: "This match is not in progress." };
    }
    // An idle acting player may be auto-played before this action is evaluated.
    // An authenticated action is also a heartbeat and safely returns control from the CPU.
    await tx.update(roomPlayersTable)
      .set({ lastSeenAt: new Date(), status: "joined" })
      .where(and(eq(roomPlayersTable.roomId, roomId), eq(roomPlayersTable.userId, userId)));
    const recoveredState = {
      ...loaded.state,
      kicked: loaded.state.kicked.filter((id) => id !== userId),
      cpuTurns: { ...(loaded.state.cpuTurns ?? {}), [userId]: 0 },
    };
    const settled = await settleIdle(tx, roomId, row, recoveredState);
    const state = settled.state;
    if (expectedVersion !== undefined && expectedVersion !== settled.version) {
      return { kind: "conflict", message: "The game state changed. Refresh and try again." };
    }
    const result = applyPlayerAction(state, userId, action as ClientAction);
    if (!result.ok) {
      switch (result.reason) {
        case "INVALID_ACTION":
          return { kind: "invalid", message: result.message };
        case "NOT_YOUR_TURN":
        case "KICKED":
          return { kind: "forbidden", message: result.message };
        case "NOT_A_PLAYER":
          return { kind: "not_found" };
        default:
          return { kind: "conflict", message: result.message };
      }
    }
    const version = settled.version + 1;
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
