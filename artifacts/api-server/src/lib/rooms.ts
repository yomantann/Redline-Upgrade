import crypto from "node:crypto";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import {
  db,
  gameRoomsTable,
  roomPlayersTable,
  usersTable,
  type GameRoom,
  type RoomPlayer,
} from "@workspace/db";
import type { RoomDetails, RoomInput, RoomSettingsInput } from "@workspace/api-zod";
import {
  MAX_ROOM_PLAYERS,
  MIN_ROOM_PLAYERS,
  MULTIPLAYER_MODE,
  isKnownBoard,
  isMultiplayerBoardAvailable,
} from "./boards";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Players who have not polled/acted within this window are shown as disconnected.
export const DISCONNECT_AFTER_MS = 20_000;
// A waiting room whose host has been gone this long hands host to a connected member.
export const HOST_TAKEOVER_AFTER_MS = 60_000;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

export type RoomError =
  | { kind: "not_found" }
  | { kind: "forbidden"; message: string }
  | { kind: "conflict"; message: string }
  | { kind: "invalid"; message: string };

export type RoomResult = { kind: "ok"; details: RoomDetails } | RoomError;

function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase();
}

async function loadPlayers(tx: Tx | typeof db, roomId: string) {
  return tx
    .select({
      player: roomPlayersTable,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
    })
    .from(roomPlayersTable)
    .innerJoin(usersTable, eq(usersTable.id, roomPlayersTable.userId))
    .where(and(eq(roomPlayersTable.roomId, roomId), ne(roomPlayersTable.status, "left")))
    .orderBy(asc(roomPlayersTable.slot));
}

function isStale(player: RoomPlayer, thresholdMs: number, now: number): boolean {
  return now - player.lastSeenAt.getTime() > thresholdMs;
}

async function buildDetails(tx: Tx | typeof db, room: GameRoom): Promise<RoomDetails> {
  const rows = await loadPlayers(tx, room.id);
  const now = Date.now();
  return {
    room: {
      id: room.id,
      code: room.code,
      hostUserId: room.hostUserId,
      boardId: room.boardId,
      mode: room.mode,
      status: room.status,
      minPlayers: room.minPlayers,
      maxPlayers: MAX_ROOM_PLAYERS,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    },
    players: rows.map(({ player, firstName, lastName }) => ({
      userId: player.userId,
      displayName:
        [firstName, lastName].filter(Boolean).join(" ").trim() || `Player ${player.slot + 1}`,
      slot: player.slot,
      status:
        player.status === "joined" && isStale(player, DISCONNECT_AFTER_MS, now)
          ? "disconnected"
          : player.status,
      selectedCharacterId: player.selectedCharacterId,
      ready: player.ready,
      joinedAt: player.joinedAt,
      updatedAt: player.updatedAt,
    })),
  };
}

async function lockRoom(tx: Tx, where: ReturnType<typeof eq>): Promise<GameRoom | undefined> {
  const [room] = await tx.select().from(gameRoomsTable).where(where).for("update").limit(1);
  return room;
}

async function activePlayers(tx: Tx, roomId: string): Promise<RoomPlayer[]> {
  return tx
    .select()
    .from(roomPlayersTable)
    .where(and(eq(roomPlayersTable.roomId, roomId), ne(roomPlayersTable.status, "left")))
    .orderBy(asc(roomPlayersTable.slot));
}

async function touch(tx: Tx, roomId: string, userId: string): Promise<void> {
  await tx
    .update(roomPlayersTable)
    .set({ lastSeenAt: new Date(), status: "joined" })
    .where(
      and(
        eq(roomPlayersTable.roomId, roomId),
        eq(roomPlayersTable.userId, userId),
        ne(roomPlayersTable.status, "left"),
      ),
    );
}

async function transferHost(tx: Tx, room: GameRoom, candidates: RoomPlayer[]): Promise<GameRoom> {
  const next = candidates[0];
  if (!next) {
    const [cancelled] = await tx
      .update(gameRoomsTable)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(gameRoomsTable.id, room.id))
      .returning();
    return cancelled;
  }
  await tx
    .update(roomPlayersTable)
    .set({ ready: false })
    .where(eq(roomPlayersTable.id, next.id));
  const [updated] = await tx
    .update(gameRoomsTable)
    .set({ hostUserId: next.userId, updatedAt: new Date() })
    .where(eq(gameRoomsTable.id, room.id))
    .returning();
  return updated;
}

export async function createRoom(hostUserId: string, input: RoomInput): Promise<RoomResult> {
  if (!isKnownBoard(input.boardId)) return { kind: "invalid", message: "Unknown board." };
  if (input.mode !== MULTIPLAYER_MODE) {
    return { kind: "invalid", message: "Rooms are only available for multiplayer." };
  }
  if (!isMultiplayerBoardAvailable(input.boardId)) {
    return { kind: "conflict", message: "This board is not available for multiplayer yet." };
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateRoomCode();
    const result = await db.transaction(async (tx): Promise<RoomResult | null> => {
      const inserted = await tx
        .insert(gameRoomsTable)
        .values({ code, hostUserId, boardId: input.boardId, mode: input.mode })
        .onConflictDoNothing({ target: gameRoomsTable.code })
        .returning();
      const room = inserted[0];
      if (!room) return null;
      await tx.insert(roomPlayersTable).values({ roomId: room.id, userId: hostUserId, slot: 0 });
      return { kind: "ok", details: await buildDetails(tx, room) };
    });
    if (result) return result;
  }
  return { kind: "conflict", message: "Could not allocate a room code. Try again." };
}

export async function joinRoomByCode(userId: string, rawCode: string): Promise<RoomResult> {
  const code = normalizeRoomCode(rawCode);
  return db.transaction(async (tx): Promise<RoomResult> => {
    const room = await lockRoom(tx, eq(gameRoomsTable.code, code));
    if (!room) return { kind: "not_found" };

    const players = await activePlayers(tx, room.id);
    if (players.some((player) => player.userId === userId)) {
      // Duplicate join is idempotent: the user is already in this room.
      await touch(tx, room.id, userId);
      return { kind: "ok", details: await buildDetails(tx, room) };
    }
    if (room.status !== "waiting") {
      return { kind: "conflict", message: "This room has already started or closed." };
    }
    if (!isMultiplayerBoardAvailable(room.boardId)) {
      return { kind: "conflict", message: "This board is not available for multiplayer." };
    }
    if (players.length >= MAX_ROOM_PLAYERS) return { kind: "conflict", message: "This room is full." };

    const taken = new Set(players.map((player) => player.slot));
    let slot = 0;
    while (taken.has(slot)) slot += 1;

    await tx
      .insert(roomPlayersTable)
      .values({ roomId: room.id, userId, slot })
      .onConflictDoUpdate({
        target: [roomPlayersTable.roomId, roomPlayersTable.userId],
        set: { slot, status: "joined", ready: false, lastSeenAt: new Date() },
      });
    await tx
      .update(gameRoomsTable)
      .set({ updatedAt: new Date() })
      .where(eq(gameRoomsTable.id, room.id));
    const [fresh] = await tx.select().from(gameRoomsTable).where(eq(gameRoomsTable.id, room.id));
    return { kind: "ok", details: await buildDetails(tx, fresh) };
  });
}

/** Member-only read. Doubles as the caller's heartbeat and applies host takeover. */
export async function getRoomForMember(roomId: string, userId: string): Promise<RoomResult> {
  return db.transaction(async (tx): Promise<RoomResult> => {
    let room = await lockRoom(tx, eq(gameRoomsTable.id, roomId));
    if (!room) return { kind: "not_found" };
    const players = await activePlayers(tx, roomId);
    if (!players.some((player) => player.userId === userId)) return { kind: "not_found" };

    await touch(tx, roomId, userId);

    if (room.status === "waiting" && room.hostUserId !== userId) {
      const now = Date.now();
      const host = players.find((player) => player.userId === room!.hostUserId);
      if (!host || isStale(host, HOST_TAKEOVER_AFTER_MS, now)) {
        const candidates = players.filter(
          (player) => player.userId !== room!.hostUserId && !isStale(player, DISCONNECT_AFTER_MS, now),
        );
        room = await transferHost(tx, room, candidates);
      }
    }
    return { kind: "ok", details: await buildDetails(tx, room) };
  });
}

export async function leaveRoom(roomId: string, userId: string): Promise<RoomResult> {
  return db.transaction(async (tx): Promise<RoomResult> => {
    let room = await lockRoom(tx, eq(gameRoomsTable.id, roomId));
    if (!room) return { kind: "not_found" };
    const players = await activePlayers(tx, roomId);
    const me = players.find((player) => player.userId === userId);
    if (!me) return { kind: "not_found" };

    if (room.status === "waiting") {
      // Free the slot so others (or the same user) can join again.
      await tx.delete(roomPlayersTable).where(eq(roomPlayersTable.id, me.id));
    } else {
      await tx
        .update(roomPlayersTable)
        .set({ status: "left", ready: false })
        .where(eq(roomPlayersTable.id, me.id));
    }

    const remaining = players.filter((player) => player.userId !== userId);
    if (remaining.length === 0 && room.status !== "completed") {
      [room] = await tx
        .update(gameRoomsTable)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(gameRoomsTable.id, roomId))
        .returning();
    } else if (room.hostUserId === userId) {
      room = await transferHost(tx, room, remaining);
    } else {
      await tx
        .update(gameRoomsTable)
        .set({ updatedAt: new Date() })
        .where(eq(gameRoomsTable.id, roomId));
    }
    return { kind: "ok", details: await buildDetails(tx, room) };
  });
}

export async function setReady(roomId: string, userId: string, ready: boolean): Promise<RoomResult> {
  return db.transaction(async (tx): Promise<RoomResult> => {
    const room = await lockRoom(tx, eq(gameRoomsTable.id, roomId));
    if (!room) return { kind: "not_found" };
    const players = await activePlayers(tx, roomId);
    if (!players.some((player) => player.userId === userId)) return { kind: "not_found" };
    if (room.status !== "waiting") {
      return { kind: "conflict", message: "Ready state cannot change after the room starts." };
    }
    await tx
      .update(roomPlayersTable)
      .set({ ready, lastSeenAt: new Date(), status: "joined" })
      .where(and(eq(roomPlayersTable.roomId, roomId), eq(roomPlayersTable.userId, userId)));
    return { kind: "ok", details: await buildDetails(tx, room) };
  });
}

export async function updateRoomSettingsAsHost(
  roomId: string,
  userId: string,
  settings: RoomSettingsInput,
): Promise<RoomResult> {
  return db.transaction(async (tx): Promise<RoomResult> => {
    const room = await lockRoom(tx, eq(gameRoomsTable.id, roomId));
    if (!room) return { kind: "not_found" };
    const players = await activePlayers(tx, roomId);
    if (!players.some((player) => player.userId === userId)) return { kind: "not_found" };
    if (room.hostUserId !== userId) {
      return { kind: "forbidden", message: "Only the room host can change settings." };
    }
    if (room.status !== "waiting") {
      return { kind: "conflict", message: "Room settings cannot change after the room starts." };
    }
    if (settings.boardId !== undefined) {
      if (!isKnownBoard(settings.boardId)) return { kind: "invalid", message: "Unknown board." };
      if (!isMultiplayerBoardAvailable(settings.boardId)) {
        return { kind: "conflict", message: "This board is not available for multiplayer yet." };
      }
    }
    if (settings.mode !== undefined && settings.mode !== MULTIPLAYER_MODE) {
      return { kind: "invalid", message: "Rooms are only available for multiplayer." };
    }
    if (settings.minPlayers !== undefined && settings.minPlayers > MAX_ROOM_PLAYERS) {
      return { kind: "invalid", message: "Invalid minimum player count." };
    }

    const [updatedRoom] = await tx
      .update(gameRoomsTable)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(gameRoomsTable.id, roomId))
      .returning();
    return { kind: "ok", details: await buildDetails(tx, updatedRoom) };
  });
}

export async function startRoomAsHost(roomId: string, userId: string): Promise<RoomResult> {
  return db.transaction(async (tx): Promise<RoomResult> => {
    const room = await lockRoom(tx, eq(gameRoomsTable.id, roomId));
    if (!room) return { kind: "not_found" };
    const players = await activePlayers(tx, roomId);
    if (!players.some((player) => player.userId === userId)) return { kind: "not_found" };
    if (room.hostUserId !== userId) {
      return { kind: "forbidden", message: "Only the room host can start the game." };
    }
    if (room.status !== "waiting") {
      return { kind: "conflict", message: "This room has already started or closed." };
    }
    if (!isMultiplayerBoardAvailable(room.boardId)) {
      return { kind: "conflict", message: "This board is not available for multiplayer." };
    }

    await touch(tx, roomId, userId);
    const now = Date.now();
    const min = Math.max(room.minPlayers, MIN_ROOM_PLAYERS);
    if (players.length < min) {
      return { kind: "conflict", message: `At least ${min} players are required to start.` };
    }
    const others = players.filter((player) => player.userId !== userId);
    if (others.some((player) => isStale(player, DISCONNECT_AFTER_MS, now))) {
      return { kind: "conflict", message: "A player is disconnected." };
    }
    if (others.some((player) => !player.ready)) {
      return { kind: "conflict", message: "All players must be ready." };
    }

    const [started] = await tx
      .update(gameRoomsTable)
      .set({ status: "in_progress", updatedAt: new Date() })
      .where(eq(gameRoomsTable.id, roomId))
      .returning();
    await tx
      .update(roomPlayersTable)
      .set({ lastSeenAt: new Date() })
      .where(inArray(roomPlayersTable.id, players.map((player) => player.id)));
    return { kind: "ok", details: await buildDetails(tx, started) };
  });
}
