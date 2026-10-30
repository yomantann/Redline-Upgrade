import { existsSync, readFileSync } from "node:fs";
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
  primate: "primate", rind: "the_rind", roll: "roll_safe", sad: "sadman", wandering: "wandering_eye",
};
const stableIdsByAsset: Record<string, string> = {
  "click_tommy.png": "skin-click2-png",
};
const namedSkinsByAsset: Record<string, string> = {
  "executive4.png": "Skyline Last Look",
  "executive5.png": "Prototype Negotiator",
  "guardian1.png": "Glacier Bastion",
  "guardian2.png": "Event Horizon Warden",
  "hotwired1.png": "Ignition Watch",
  "hotwired3.png": "Afterburn Operator",
  "hotwired5.png": "Emberline Mechanic",
  "hotwired6.png": "Pyre Circuit",
  "lowflame1.png": "Quiet Prowler",
  "lowflame3.png": "Last Stop Drifter",
  "lowflame4.png": "Quiet Current",
  "pain1.png": "Unfinished Portrait",
  "pain2.png": "Scarlight Resolve",
  "panic1.png": "Closing Bell Dealer",
  "panic2.png": "Backdoor Operator",
  "panic3.png": "Static in the Walls",
  "panic4.png": "Blue Siren Exo",
  "panic5.png": "Ashfall Enforcer",
  "primate1.png": "Roofline Pouncer",
  "primate2.png": "Canopy Circuit",
  "primate3.png": "Verdant Echo",
  "sad2.png": "Rainbound Stranger",
  "sad3.png": "Blue Hour Operator",
  "sad4.png": "The Last Warm Cup",
  "sad5.png": "Quiet Exit",
  "wandering3.png": "Neon Wayfinder",
  "wandering4.png": "Crossing Shadows",
  "wandering5.png": "Rootbound Watcher",
  "wandering6.png": "Cinder Pilgrim",
  "wandering7.png": "Lantern-Eyed Stranger",
  "wandering8.png": "All-Seeing Veil",
  "wandering9.png": "Gloamwing Sovereign",
};
const rarityByNewSkinAsset: Record<string, Rarity> = {
  "executive4.png": "RARE",
  "executive5.png": "EPIC",
  "guardian1.png": "EPIC",
  "guardian2.png": "LEGENDARY",
  "hotwired1.png": "RARE",
  "hotwired3.png": "RARE",
  "hotwired5.png": "EPIC",
  "hotwired6.png": "EPIC",
  "lowflame1.png": "EPIC",
  "lowflame3.png": "RARE",
  "lowflame4.png": "UNCOMMON",
  "pain1.png": "UNCOMMON",
  "pain2.png": "RARE",
  "panic1.png": "UNCOMMON",
  "panic2.png": "RARE",
  "panic3.png": "RARE",
  "panic4.png": "EPIC",
  "panic5.png": "LEGENDARY",
  "primate1.png": "EPIC",
  "primate2.png": "RARE",
  "primate3.png": "RARE",
  "sad2.png": "RARE",
  "sad3.png": "EPIC",
  "sad4.png": "UNCOMMON",
  "sad5.png": "RARE",
  "wandering3.png": "RARE",
  "wandering4.png": "UNCOMMON",
  "wandering5.png": "EPIC",
  "wandering6.png": "EPIC",
  "wandering7.png": "RARE",
  "wandering8.png": "LEGENDARY",
  "wandering9.png": "LEGENDARY",
};
const rareNames = ["cosmic", "abyssal", "divine", "glitchosaurus", "stormhare", "valhalla", "ragnar", "sovereign"];
const epicNames = ["prime", "apex", "sentinel", "hewn knight", "damning duchess", "grand larceny", "executioner"];
const legendaryNames = ["final evolution", "myth", "immortal", "ultimate", "chosen", "perfect"];
const rarityOverridesById: Partial<Record<string, Rarity>> = {
  "skin-alpha-alphimus-png": "EPIC",
  "skin-click2-png": "RARE",
  "skin-dash-board-burst-png": "RARE",
  "skin-anointed-clean-cut-png": "EPIC",
  "skin-frost-corporal-whiteout-png": "EPIC",
  "skin-wandering-dohyun-s-last-run-png": "EPIC",
  "skin-frost-frozen-front-png": "LEGENDARY",
  "skin-frost-cryo-png": "RARE",
  "skin-rind-gutter-gladiator-png": "RARE",
  "skin-pain-highborn-elder-png": "RARE",
  "skin-accuser-little-witness-png": "RARE",
  "skin-lowflame-orbital-rest-png": "LEGENDARY",
  "skin-frost-cold-conjurer-png": "RARE",
  "skin-lowflame-sakura-session-png": "EPIC",
  "skin-lowflame-high-noon-nothing-png": "RARE",
  "skin-lowflame-suspended-peace-png": "RARE",
  "skin-executive-the-rail-baron-png": "EPIC",
  "skin-alpha-graviton-png": "RARE",
  "skin-roll-intel-officer-png": "LEGENDARY",
  "skin-roll-tatsu-of-the-tab-png": "EPIC",
  "skin-anointed-masquerade-sovereign-png": "EPIC",
  "skin-accuser-prime-suspect-png": "RARE",
  "skin-anointed-grand-larceny-png": "RARE",
  "skin-anointed-pontifex-of-masks-png": "RARE",
  "skin-hotwired-pyra-png": "RARE",
  "skin-hotwired-pyra2-png": "RARE",
  "skin-rind-sewer-sharpshooter-png": "EPIC",
  "skin-click-sir-whiskers-wrong-png": "LEGENDARY",
  "skin-lowflame-the-bounty-can-wait-png": "EPIC",
  "skin-pain-the-walking-wound-png": "LEGENDARY",
  "skin-guardian-unmoved-marshal-png": "RARE",
  "skin-dash-yatai-yang-png": "EPIC",
  "skin-alpha-abyssal-prime-png": "RARE",
  "skin-alpha-abyssal-prime2-png": "RARE",
  "skin-anointed-divine-sentinel-png": "RARE",
  "skin-alpha-prime-time-png": "UNCOMMON",
  "skin-frost-skaldi-s-chosen-png": "RARE",
  "skin-alpha-the-hewn-knight-png": "LEGENDARY",
  "skin-rind-ronin-rind-png": "LEGENDARY",
};
function slug(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function displayName(value: string) {
  return value.replace(/\.png$/i, "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function rarityFor(name: string, category: "LOGO" | "DRIVER_SKIN", id?: string): Rarity {
  const override = id ? rarityOverridesById[id] : undefined;
  if (override) return override;
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

type CosmeticAssetManifest = { logos: string[]; skins: string[] };

function cosmeticAssetManifest(): CosmeticAssetManifest {
  const candidates = [
    resolve(process.cwd(), "artifacts/api-server/dist/cosmetic-assets.json"),
    resolve(process.cwd(), "dist/cosmetic-assets.json"),
  ];
  const manifestPath = candidates.find((candidate) => existsSync(candidate));
  if (!manifestPath) {
    throw new Error(`Cosmetic asset manifest not found. Checked: ${candidates.join(", ")}`);
  }
  const parsed = JSON.parse(readFileSync(manifestPath, "utf8")) as Partial<CosmeticAssetManifest>;
  if (!Array.isArray(parsed.logos) || !Array.isArray(parsed.skins)
    || [...parsed.logos, ...parsed.skins].some((file) => typeof file !== "string")) {
    throw new Error(`Cosmetic asset manifest is invalid: ${manifestPath}`);
  }
  return { logos: parsed.logos, skins: parsed.skins };
}

function skinAssetParts(file: string): { prefix: string; title?: string } | undefined {
  const namedAsset = file.match(/^([a-z]+)_(.+)\.png$/i);
  if (namedAsset) return { prefix: namedAsset[1].toLowerCase(), title: namedAsset[2] };
  const unnamedAsset = file.match(/^([a-z]+)\d+\.png$/i);
  if (unnamedAsset && namedSkinsByAsset[file.toLowerCase()]) {
    return { prefix: unnamedAsset[1].toLowerCase() };
  }
  return undefined;
}

function catalogFromAssets() {
  const manifest = cosmeticAssetManifest();
  const skins = manifest.skins.filter((file) => {
    const parts = skinAssetParts(file);
    return Boolean(parts && prefixCharacter[parts.prefix]);
  });
  return [
    ...manifest.logos.map((file) => {
      const name = displayName(file);
      const id = `logo-${slug(file)}`;
      const rarity = rarityFor(name, "LOGO", id);
      return { id, name, category: "LOGO", rarity, price: freeCosmeticIds.has(id) ? 0 : rarityPrice[rarity], assetPath: `Icons/${file}`, characterId: null, available: 1, isDefault: 0 };
    }),
    ...skins.map((file) => {
      const assetKey = file.toLowerCase();
      const parts = skinAssetParts(file)!;
      const name = namedSkinsByAsset[assetKey] ?? parts.title!.replace(/([a-z])(\d+)$/i, "$1 ($2)");
      const id = stableIdsByAsset[assetKey] ?? `skin-${slug(file)}`;
      const rarity = rarityByNewSkinAsset[assetKey] ?? rarityFor(name, "DRIVER_SKIN", id);
      const characterId = prefixCharacter[parts.prefix];
      return { id, name: displayName(name), category: "DRIVER_SKIN", rarity, price: freeCosmeticIds.has(id) ? 0 : rarityPrice[rarity], assetPath: `Skins/${file}`, characterId, available: 1, isDefault: 0 };
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
