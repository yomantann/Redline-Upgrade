import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import {
  cosmeticOwnershipTable,
  creditTransactionsTable,
  creditWalletsTable,
  db,
  equippedCosmeticsTable,
  shopCatalogTable,
} from "@workspace/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Rarity = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC";
const rarityPrice: Record<Rarity, number> = {
  COMMON: 300, UNCOMMON: 600, RARE: 1_200, EPIC: 2_500, LEGENDARY: 5_000, MYTHIC: 10_000,
};
const freeCosmeticIds = new Set(["logo-golden-skull-png", "skin-accuser-dreamer-png"]);
const prefixCharacter: Record<string, string> = {
  accuser: "accuser", alpha: "alpha_prime", anointed: "anointed", click: "click_click",
  dash: "rainbow_dash", executive: "executive_p", frost: "frostbyte", guardian: "guardian_h",
  hotwired: "hotwired", lowflame: "low_flame", pain: "pain_hider", panic: "panic_bot",
  rind: "the_rind", roll: "roll_safe", wandering: "wandering_eye",
};
const rareNames = ["cosmic", "abyssal", "divine", "glitchosaurus", "stormhare", "valhalla", "ragnar", "sovereign"];
const epicNames = ["prime", "apex", "sentinel", "hewn knight", "damning duchess", "grand larceny", "executioner"];
const legendaryNames = ["final evolution", "myth", "immortal", "ultimate", "chosen", "perfect"];
function slug(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function displayName(value: string) {
  return value.replace(/\.png$/i, "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function rarityFor(name: string, category: "LOGO" | "DRIVER_SKIN"): Rarity {
  const lower = name.toLowerCase();
  if (legendaryNames.some((word) => lower.includes(word))) return "LEGENDARY";
  if (epicNames.some((word) => lower.includes(word))) return "EPIC";
  if (rareNames.some((word) => lower.includes(word))) return "RARE";
  if (category === "LOGO") {
    if (["golden skull", "cracked crown", "warlord", "executioner"].some((word) => lower.includes(word))) return "EPIC";
    return "UNCOMMON";
  }
  return "UNCOMMON";
}

function catalogFromAssets() {
  const publicRoot = resolve(process.cwd(), "../redline-upgrade/public");
  const logosDir = resolve(publicRoot, "Icons");
  const skinsDir = resolve(publicRoot, "Skins");
  const logos = readdirSync(logosDir).filter((file) => /\.png$/i.test(file)
    && !file.toLowerCase().startsWith("redline_auction_"));
  const skins = readdirSync(skinsDir).filter((file) => {
    const match = file.match(/^([a-z]+)_(.+)\.png$/i);
    return Boolean(match && prefixCharacter[match[1].toLowerCase()]);
  });
  return [
    ...logos.map((file) => {
      const name = displayName(file);
      const rarity = rarityFor(name, "LOGO");
      const id = `logo-${slug(file)}`;
      return { id, name, category: "LOGO", rarity, price: freeCosmeticIds.has(id) ? 0 : rarityPrice[rarity], assetPath: `Icons/${file}`, characterId: null, available: 1, isDefault: 0 };
    }),
    ...skins.map((file) => {
      const [prefix, ...title] = file.replace(/\.png$/i, "").split("_");
      const name = title.join("_").replace(/([a-z])(\d+)$/i, "$1 ($2)");
      const rarity = rarityFor(name, "DRIVER_SKIN");
      const id = `skin-${slug(file)}`;
      return { id, name: displayName(name), category: "DRIVER_SKIN", rarity, price: freeCosmeticIds.has(id) ? 0 : rarityPrice[rarity], assetPath: `Skins/${file}`, characterId: prefixCharacter[prefix.toLowerCase()], available: 1, isDefault: 0 };
    }),
  ];
}

export async function ensureShopCatalog() {
  const items = catalogFromAssets();
  await db.insert(shopCatalogTable).values(items).onConflictDoUpdate({
      target: shopCatalogTable.id,
      set: {
        name: sql`excluded.name`, category: sql`excluded.category`, rarity: sql`excluded.rarity`,
        price: sql`excluded.price`, assetPath: sql`excluded.asset_path`,
        characterId: sql`excluded.character_id`, available: 1, updatedAt: new Date(),
      },
  });
  await db.update(shopCatalogTable).set({ available: 0, updatedAt: new Date() })
    .where(notInArray(shopCatalogTable.id, items.map((item) => item.id)));
}

export async function getShopCatalog(userId: string) {
  await ensureShopCatalog();
  const [items, owned, equipped] = await Promise.all([
    db.select().from(shopCatalogTable).where(eq(shopCatalogTable.available, 1)),
    db.select({ itemId: cosmeticOwnershipTable.itemId }).from(cosmeticOwnershipTable).where(eq(cosmeticOwnershipTable.userId, userId)),
    db.select().from(equippedCosmeticsTable).where(eq(equippedCosmeticsTable.userId, userId)),
  ]);
  return { items, ownedItemIds: owned.map((row) => row.itemId), equipped };
}

export async function getInventory(userId: string) {
  await ensureShopCatalog();
  const ownership = await db.select({
    acquiredAt: cosmeticOwnershipTable.acquiredAt,
    item: shopCatalogTable,
  }).from(cosmeticOwnershipTable)
    .innerJoin(shopCatalogTable, eq(cosmeticOwnershipTable.itemId, shopCatalogTable.id))
    .where(eq(cosmeticOwnershipTable.userId, userId));
  const equipped = await db.select().from(equippedCosmeticsTable).where(eq(equippedCosmeticsTable.userId, userId));
  return { items: ownership, equipped };
}

export async function purchaseCosmetic(userId: string, itemId: string) {
  await ensureShopCatalog();
  return db.transaction(async (tx) => {
    await tx.insert(creditWalletsTable).values({ userId }).onConflictDoNothing();
    const [wallet] = await tx.select().from(creditWalletsTable).where(eq(creditWalletsTable.userId, userId)).for("update").limit(1);
    if (!wallet) return { kind: "wallet_missing" as const };
    const [item] = await tx.select().from(shopCatalogTable).where(and(eq(shopCatalogTable.id, itemId), eq(shopCatalogTable.available, 1))).limit(1);
    if (!item || item.isDefault === 1) return { kind: "not_found" as const };
    const [alreadyOwned] = await tx.select().from(cosmeticOwnershipTable).where(and(eq(cosmeticOwnershipTable.userId, userId), eq(cosmeticOwnershipTable.itemId, itemId))).limit(1);
    if (alreadyOwned) return { kind: "owned" as const };
    if (wallet.balance < item.price) return { kind: "insufficient" as const, balance: wallet.balance, price: item.price };
    if (item.price === 0) {
      const [ownership] = await tx.insert(cosmeticOwnershipTable).values({ userId, itemId, transactionId: null })
        .onConflictDoNothing().returning({ itemId: cosmeticOwnershipTable.itemId });
      if (!ownership) return { kind: "owned" as const };
      return { kind: "ok" as const, balance: wallet.balance, item };
    }
    const nextBalance = wallet.balance - item.price;
    const [transaction] = await tx.insert(creditTransactionsTable).values({
      userId, amount: -item.price, type: "PURCHASE", sourceId: itemId,
      idempotencyKey: `${userId}:purchase:${itemId}`, balanceAfter: nextBalance,
    }).onConflictDoNothing().returning({ id: creditTransactionsTable.id });
    if (!transaction) return { kind: "owned" as const };
    await tx.update(creditWalletsTable).set({
      balance: nextBalance, lifetimeSpent: wallet.lifetimeSpent + item.price, updatedAt: new Date(),
    }).where(eq(creditWalletsTable.userId, userId));
    await tx.insert(cosmeticOwnershipTable).values({ userId, itemId, transactionId: transaction.id });
    return { kind: "ok" as const, balance: nextBalance, item };
  });
}

export async function equipCosmetic(userId: string, slot: string, itemId: string | null) {
  await ensureShopCatalog();
  return db.transaction(async (tx: Tx) => {
    let item: typeof shopCatalogTable.$inferSelect | undefined;
    if (itemId) {
      const [found] = await tx.select().from(shopCatalogTable).where(eq(shopCatalogTable.id, itemId)).limit(1);
      if (!found || found.available !== 1) return { kind: "not_found" as const };
      const [owned] = await tx.select().from(cosmeticOwnershipTable)
        .where(and(eq(cosmeticOwnershipTable.userId, userId), eq(cosmeticOwnershipTable.itemId, itemId))).limit(1);
      if (!owned) return { kind: "not_owned" as const };
      if ((slot === "logo" && found.category !== "LOGO")
        || (slot.startsWith("skin:") && (found.category !== "DRIVER_SKIN" || found.characterId !== slot.slice(5)))) {
        return { kind: "incompatible" as const };
      }
      item = found;
    } else if (slot !== "logo" && !slot.startsWith("skin:")) {
      return { kind: "incompatible" as const };
    }
    await tx.insert(equippedCosmeticsTable).values({ userId, slot, itemId: item?.id ?? null, updatedAt: new Date() })
      .onConflictDoUpdate({ target: [equippedCosmeticsTable.userId, equippedCosmeticsTable.slot], set: { itemId: item?.id ?? null, updatedAt: new Date() } });
    return { kind: "ok" as const, itemId: item?.id ?? null };
  });
}

export async function getCosmeticIdentity(userIds: string[]) {
  if (!userIds.length) return new Map<string, { logoPath: string | null; skins: Record<string, string> }>();
  const equipped = await db.select({
    userId: equippedCosmeticsTable.userId, slot: equippedCosmeticsTable.slot,
    itemId: equippedCosmeticsTable.itemId, assetPath: shopCatalogTable.assetPath, characterId: shopCatalogTable.characterId,
  }).from(equippedCosmeticsTable)
    .leftJoin(shopCatalogTable, eq(equippedCosmeticsTable.itemId, shopCatalogTable.id))
    .where(inArray(equippedCosmeticsTable.userId, userIds));
  const result = new Map<string, { logoPath: string | null; skins: Record<string, string> }>();
  for (const id of userIds) result.set(id, { logoPath: null, skins: {} });
  for (const row of equipped) {
    const value = result.get(row.userId);
    if (!value || !row.assetPath) continue;
    if (row.slot === "logo") value.logoPath = row.assetPath;
    else if (row.slot.startsWith("skin:") && row.characterId) value.skins[row.characterId] = row.assetPath;
  }
  return result;
}
