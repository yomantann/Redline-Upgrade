import { and, asc, eq, ne } from "drizzle-orm";
import {
  db,
  gameRoomsTable,
  roomPlayersTable,
  type GameRoom,
  type RoomPlayer,
} from "@workspace/db";
import type { RoomInput, RoomSettingsInput } from "@workspace/api-zod";

export type RoomDetailsRecords = {
  room: GameRoom;
  players: RoomPlayer[];
};

export type UpdateRoomSettingsResult =
  | { kind: "ok"; details: RoomDetailsRecords }
  | { kind: "not_found" }
  | { kind: "forbidden" }
  | { kind: "conflict" };

export async function createRoom(
  hostUserId: string,
  input: RoomInput,
): Promise<RoomDetailsRecords> {
  return db.transaction(async (tx) => {
    const [room] = await tx
      .insert(gameRoomsTable)
      .values({
        hostUserId,
        boardId: input.boardId,
        mode: input.mode,
      })
      .returning();

    await tx.insert(roomPlayersTable).values({
      roomId: room.id,
      userId: hostUserId,
      slot: 0,
    });

    const players = await tx
      .select()
      .from(roomPlayersTable)
      .where(eq(roomPlayersTable.roomId, room.id))
      .orderBy(asc(roomPlayersTable.slot));

    return { room, players };
  });
}

export async function getRoomForMember(
  roomId: string,
  userId: string,
): Promise<RoomDetailsRecords | null> {
  const [membership] = await db
    .select({ status: roomPlayersTable.status })
    .from(roomPlayersTable)
    .where(
      and(
        eq(roomPlayersTable.roomId, roomId),
        eq(roomPlayersTable.userId, userId),
        ne(roomPlayersTable.status, "left"),
      ),
    )
    .limit(1);
  if (!membership) return null;

  const [room] = await db
    .select()
    .from(gameRoomsTable)
    .where(eq(gameRoomsTable.id, roomId))
    .limit(1);
  if (!room) return null;

  const players = await db
    .select()
    .from(roomPlayersTable)
    .where(and(eq(roomPlayersTable.roomId, roomId), ne(roomPlayersTable.status, "left")))
    .orderBy(asc(roomPlayersTable.slot));

  return { room, players };
}

export async function updateRoomSettingsAsHost(
  roomId: string,
  userId: string,
  settings: RoomSettingsInput,
): Promise<UpdateRoomSettingsResult> {
  return db.transaction(async (tx) => {
    const [room] = await tx
      .select()
      .from(gameRoomsTable)
      .where(eq(gameRoomsTable.id, roomId))
      .for("update")
      .limit(1);
    if (!room) return { kind: "not_found" };

    const [membership] = await tx
      .select({ status: roomPlayersTable.status })
      .from(roomPlayersTable)
      .where(
        and(
          eq(roomPlayersTable.roomId, roomId),
          eq(roomPlayersTable.userId, userId),
          ne(roomPlayersTable.status, "left"),
        ),
      )
      .limit(1);
    if (!membership) return { kind: "not_found" };
    if (room.hostUserId !== userId) return { kind: "forbidden" };
    if (room.status !== "waiting") return { kind: "conflict" };

    const [updatedRoom] = await tx
      .update(gameRoomsTable)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(gameRoomsTable.id, roomId))
      .returning();
    const players = await tx
      .select()
      .from(roomPlayersTable)
      .where(and(eq(roomPlayersTable.roomId, roomId), ne(roomPlayersTable.status, "left")))
      .orderBy(asc(roomPlayersTable.slot));

    return { kind: "ok", details: { room: updatedRoom, players } };
  });
}