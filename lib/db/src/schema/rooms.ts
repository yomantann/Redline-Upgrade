import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { usersTable } from "./auth";

export const roomStatusEnum = pgEnum("room_status", [
  "waiting",
  "in_progress",
  "completed",
  "cancelled",
]);

export const roomPlayerStatusEnum = pgEnum("room_player_status", [
  "joined",
  "disconnected",
  "left",
]);

export const gameRoomsTable = pgTable(
  "game_rooms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 12 }).notNull().unique(),
    hostUserId: varchar("host_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    boardId: varchar("board_id", { length: 80 }).notNull(),
    mode: varchar("mode", { length: 40 }).notNull(),
    status: roomStatusEnum("status").notNull().default("waiting"),
    minPlayers: smallint("min_players").notNull().default(2),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check("game_rooms_min_players_range", sql`${table.minPlayers} >= 2 AND ${table.minPlayers} <= 4`),
    index("game_rooms_host_user_idx").on(table.hostUserId),
  ],
);

export const roomPlayersTable = pgTable(
  "room_players",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => gameRoomsTable.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    slot: smallint("slot").notNull(),
    status: roomPlayerStatusEnum("status").notNull().default("joined"),
    selectedCharacterId: varchar("selected_character_id", { length: 80 }),
    selectedCareerId: varchar("selected_career_id", { length: 80 }),
    ready: boolean("ready").notNull().default(false),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("room_players_room_user_unique").on(table.roomId, table.userId),
    unique("room_players_room_slot_unique").on(table.roomId, table.slot),
    check("room_players_slot_range", sql`${table.slot} >= 0 AND ${table.slot} <= 3`),
    index("room_players_user_idx").on(table.userId),
  ],
);

/** Canonical, server-owned match state for a room; `version` increments on every accepted action. */
export const roomMatchesTable = pgTable("room_matches", {
  roomId: uuid("room_id")
    .primaryKey()
    .references(() => gameRoomsTable.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(0),
  state: jsonb("state").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGameRoomSchema = createInsertSchema(gameRoomsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertRoomPlayerSchema = createInsertSchema(roomPlayersTable).omit({
  id: true,
  joinedAt: true,
  updatedAt: true,
});

export type GameRoom = typeof gameRoomsTable.$inferSelect;
export type NewGameRoom = z.infer<typeof insertGameRoomSchema>;
export type RoomPlayer = typeof roomPlayersTable.$inferSelect;
export type NewRoomPlayer = z.infer<typeof insertRoomPlayerSchema>;
export type RoomMatch = typeof roomMatchesTable.$inferSelect;
export type RoomStatus = (typeof roomStatusEnum.enumValues)[number];
export type RoomPlayerStatus = (typeof roomPlayerStatusEnum.enumValues)[number];