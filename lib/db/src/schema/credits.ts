import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, primaryKey, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const creditWalletsTable = pgTable("credit_wallets", {
  userId: varchar("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(0),
  lifetimeEarned: integer("lifetime_earned").notNull().default(0),
  lifetimeSpent: integer("lifetime_spent").notNull().default(0),
  achievementEarned: integer("achievement_earned").notNull().default(0),
  gameEarned: integer("game_earned").notNull().default(0),
  endgameEarned: integer("endgame_earned").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("credit_wallet_balance_nonnegative", sql`${table.balance} >= 0`),
  check("credit_wallet_totals_nonnegative", sql`${table.lifetimeEarned} >= 0 AND ${table.lifetimeSpent} >= 0`),
]);

export const creditTransactionsTable = pgTable("credit_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  type: varchar("type", { length: 32 }).notNull(),
  sourceId: varchar("source_id", { length: 160 }).notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 200 }).notNull().unique(),
  balanceAfter: integer("balance_after").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("credit_transaction_nonzero", sql`${table.amount} <> 0`),
  check("credit_transaction_balance_nonnegative", sql`${table.balanceAfter} >= 0`),
  index("credit_transactions_user_created_idx").on(table.userId, table.createdAt),
]);

export const shopCatalogTable = pgTable("shop_catalog", {
  id: varchar("id", { length: 160 }).primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  category: varchar("category", { length: 32 }).notNull(),
  rarity: varchar("rarity", { length: 24 }).notNull(),
  price: integer("price").notNull(),
  assetPath: varchar("asset_path", { length: 300 }).notNull(),
  characterId: varchar("character_id", { length: 80 }),
  available: integer("available").notNull().default(1),
  isDefault: integer("is_default").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("shop_catalog_price_nonnegative", sql`${table.price} >= 0`),
]);

export const cosmeticOwnershipTable = pgTable("cosmetic_ownership", {
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  itemId: varchar("item_id", { length: 160 }).notNull().references(() => shopCatalogTable.id, { onDelete: "cascade" }),
  acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull().defaultNow(),
  transactionId: uuid("transaction_id").references(() => creditTransactionsTable.id),
}, (table) => [
  primaryKey({ columns: [table.userId, table.itemId], name: "cosmetic_ownership_pk" }),
  index("cosmetic_ownership_user_idx").on(table.userId),
]);

export const equippedCosmeticsTable = pgTable("equipped_cosmetics", {
  userId: varchar("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  slot: varchar("slot", { length: 32 }).notNull(),
  itemId: varchar("item_id", { length: 160 }).references(() => shopCatalogTable.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.userId, table.slot], name: "equipped_cosmetics_pk" })]);
