import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const soloGameStatusEnum = pgEnum("solo_game_status", ["active", "completed", "abandoned"]);

/** Server-owned single-player match state. The user owns all client-controlled actions and CPUs run server-side. */
export const soloGamesTable = pgTable(
  "solo_games",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(0),
    state: jsonb("state").$type<unknown>().notNull(),
    status: soloGameStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    check("solo_games_version_nonnegative", sql`${table.version} >= 0`),
    index("solo_games_user_status_updated_idx").on(table.userId, table.status, table.updatedAt),
  ],
);

/** Compact account totals used to calculate milestone progress and lifetime summaries. */
export const achievementProfilesTable = pgTable(
  "achievement_profiles",
  {
    userId: varchar("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
    metrics: jsonb("metrics").$type<Record<string, number>>().notNull().default({}),
    lifetimeFacts: jsonb("lifetime_facts").$type<Record<string, string[]>>().notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

/** One row per unlocked or progressed achievement; unique keys make awards idempotent. */
export const userAchievementsTable = pgTable(
  "user_achievements",
  {
    userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    achievementId: varchar("achievement_id", { length: 100 }).notNull(),
    progress: integer("progress").notNull().default(0),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }),
    unlockGameId: varchar("unlock_game_id", { length: 80 }),
    rewardCredits: integer("reward_credits").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.achievementId], name: "user_achievements_pk" }),
    check("user_achievements_progress_nonnegative", sql`${table.progress} >= 0`),
    index("user_achievements_user_unlock_idx").on(table.userId, table.unlockedAt),
  ],
);

/** Per-asset lifetime ownership, retained endgames, transfers/losses and first/last dates. */
export const userAssetCollectionTable = pgTable(
  "user_asset_collection",
  {
    userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    assetId: varchar("asset_id", { length: 100 }).notNull(),
    acquiredCount: integer("acquired_count").notNull().default(0),
    retainedCount: integer("retained_count").notNull().default(0),
    lostCount: integer("lost_count").notNull().default(0),
    gamesAcquired: integer("games_acquired").notNull().default(0),
    gamesRetained: integer("games_retained").notNull().default(0),
    firstAcquiredAt: timestamp("first_acquired_at", { withTimezone: true }),
    firstRetainedAt: timestamp("first_retained_at", { withTimezone: true }),
    lastAcquiredAt: timestamp("last_acquired_at", { withTimezone: true }),
    lastRetainedAt: timestamp("last_retained_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.assetId], name: "user_asset_collection_pk" }),
    index("user_asset_collection_user_idx").on(table.userId),
  ],
);

/** Immutable account-specific copy of each completed game's final authoritative state. */
export const completedGameHistoryTable = pgTable(
  "completed_game_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    source: varchar("source", { length: 20 }).notNull(),
    gameId: varchar("game_id", { length: 80 }).notNull(),
    boardId: varchar("board_id", { length: 80 }).notNull(),
    mode: varchar("mode", { length: 40 }).notNull(),
    placement: integer("placement").notNull(),
    finalValue: integer("final_value").notNull(),
    portfolioValue: integer("portfolio_value").notNull(),
    characterId: varchar("character_id", { length: 80 }).notNull(),
    careerId: varchar("career_id", { length: 80 }),
    finalStats: jsonb("final_stats").$type<Record<string, number>>().notNull(),
    acquiredAssetIds: jsonb("acquired_asset_ids").$type<string[]>().notNull().default([]),
    lostAssetIds: jsonb("lost_asset_ids").$type<string[]>().notNull().default([]),
    retainedAssets: jsonb("retained_assets").$type<Array<{ assetId: string; level: number }>>().notNull().default([]),
    unlockedAchievementIds: jsonb("unlocked_achievement_ids").$type<string[]>().notNull().default([]),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("completed_game_user_source_game_unique").on(table.userId, table.source, table.gameId),
    check("completed_game_placement_positive", sql`${table.placement} >= 1`),
    index("completed_game_user_completed_idx").on(table.userId, table.completedAt),
  ],
);
