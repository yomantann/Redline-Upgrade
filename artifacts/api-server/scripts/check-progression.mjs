import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, usersTable, achievementProfilesTable, userAchievementsTable, completedGameHistoryTable, userAssetCollectionTable } from "@workspace/db";
import { GetAchievementProfileResponse } from "@workspace/api-zod";
import { getAchievementProfile, recordCompletedGame } from "../src/lib/progression.ts";
import { assets } from "../../redline-upgrade/src/game/assets.ts";
import { characters } from "../../redline-upgrade/src/game/characters.ts";
import { createMatch } from "../../redline-upgrade/src/game/match.ts";
import { validateAchievementCatalog } from "../../redline-upgrade/src/game/achievement-catalog.ts";
import { secretAchievementCatalog } from "../src/lib/secret-achievements.ts";

const userId = `progression-check-${randomUUID()}`;
const gameId = randomUUID();
const car = assets.find((asset) => asset.category === "car");
const property = assets.find((asset) => asset.category === "property");
const lostAsset = assets.find((asset) => asset.category === "lifestyle");
if (!car || !property || !lostAsset) throw new Error("Test asset fixtures are incomplete.");
validateAchievementCatalog(assets.length);
if (secretAchievementCatalog.length !== 25) throw new Error("The secret achievement catalog must contain exactly 25 entries.");
if (new Set(secretAchievementCatalog.map((item) => item.id)).size !== 25) throw new Error("Secret achievement IDs are not unique.");
if (new Set(secretAchievementCatalog.map((item) => item.artwork)).size !== 25) throw new Error("Secret achievement artwork is not unique.");

let assertionsCompleted = false;
try {
  await db.insert(usersTable).values({ id: userId });
  await db.transaction(async (tx) => {
    const start = createMatch(characters[0].id, "REDLINE_UPGRADE", "SINGLE_PLAYER");
    const player = start.players[0];
    const completed = {
      ...start,
      phase: "complete",
      finishOrder: [0, 1, 2, 3],
      players: start.players.map((candidate, index) => index === 0
        ? {
            ...candidate,
            status: "FINISHED",
            wealth: 120_000,
             aiSkill: 25,
             fame: 25,
             lifestyle: 25,
             influence: 25,
            equipment: { ...candidate.equipment, car: car.id, property: property.id },
            assetLevels: { ...candidate.assetLevels, [car.id]: 2, [property.id]: 1 },
          }
        : { ...candidate, status: "FINISHED" }),
    };
    const eventLedger = [
      { eventId: "test-acquired", playerId: player.playerId, playerIndex: 0, type: "ASSET_ACQUIRED", assetId: car.id, targetPlayerId: null, assetLevel: 2 },
      { eventId: "test-purchased", playerId: player.playerId, playerIndex: 0, type: "ASSET_PURCHASED", assetId: car.id, targetPlayerId: null, assetLevel: 2 },
      { eventId: "test-lost", playerId: start.players[1].playerId, playerIndex: 1, type: "ASSET_TRANSFERRED", assetId: lostAsset.id, targetPlayerId: player.playerId, assetLevel: 1 },
    ];

    const unlocked = await recordCompletedGame(tx, "SOLO", gameId, userId, completed, 0, eventLedger);
    const [profile] = await tx.select().from(achievementProfilesTable);
    const storedAchievements = await tx.select().from(userAchievementsTable);
    const historyBeforeReplay = await tx.select().from(completedGameHistoryTable);
    const collectionBeforeReplay = await tx.select().from(userAssetCollectionTable);
    const replayUnlocks = await recordCompletedGame(tx, "SOLO", gameId, userId, completed, 0, eventLedger);
    const [profileAfterReplay] = await tx.select().from(achievementProfilesTable);
    const historyAfterReplay = await tx.select().from(completedGameHistoryTable);

    const owned = collectionBeforeReplay.find((entry) => entry.assetId === car.id);
    const retainedProperty = collectionBeforeReplay.find((entry) => entry.assetId === property.id);
    const lost = collectionBeforeReplay.find((entry) => entry.assetId === lostAsset.id);
    if (profile.metrics.completedGames !== 1) throw new Error("Completion total did not increment once.");
    if (storedAchievements.length !== 125) throw new Error("The account does not have one persistent progress row for all 125 achievements.");
    if (profile.metrics.assetsAcquired !== 1 || profile.metrics.assetsLost !== 1) throw new Error("Acquisition or loss totals are incorrect.");
    if (profile.metrics.assetsRetained !== 2 || profile.metrics.uniqueAssetsRetained !== 2) throw new Error("Endgame retention totals are incorrect.");
    if (profile.metrics.maxSimultaneousAssets !== 2 || profile.metrics.gamesHeldAssets !== 1) throw new Error("Retention milestones are incorrect.");
    if (!owned || owned.acquiredCount !== 1 || owned.retainedCount !== 1 || !retainedProperty || retainedProperty.retainedCount !== 1 || !lost || lost.lostCount !== 1) {
      throw new Error("Per-asset lifetime ownership record is incorrect.");
    }
    if (historyBeforeReplay.length !== 1 || historyBeforeReplay[0].retainedAssets.length !== 2) {
      throw new Error("Completed-game snapshot is missing its retained assets.");
    }
    if (!unlocked.includes("first-asset") || !unlocked.includes("diamond-hands") || replayUnlocks.length !== 0) {
      throw new Error("Achievement unlock or replay idempotency failed.");
    }
    if (!unlocked.includes("secret-12")) throw new Error("The secret perfect-balance achievement did not evaluate from the completed match.");
    const hiddenSecret = storedAchievements.find((entry) => entry.achievementId === "secret-01");
    const revealedSecret = storedAchievements.find((entry) => entry.achievementId === "secret-12");
    if (!hiddenSecret || hiddenSecret.unlockedAt || hiddenSecret.progress !== 0 || !revealedSecret?.unlockedAt) {
      throw new Error("Locked secret progress or unlocked secret persistence is incorrect.");
    }
    if (profileAfterReplay.metrics.completedGames !== 1 || historyAfterReplay.length !== 1) {
      throw new Error("Replaying completion duplicated lifetime progress.");
    }
    assertionsCompleted = true;
  });
  const rawProfile = await getAchievementProfile(userId);
  const profile = GetAchievementProfileResponse.parse(rawProfile);
  const lockedSecret = profile.achievements.find((item) => item.achievementId === "secret-01");
  const revealedSecret = profile.achievements.find((item) => item.achievementId === "secret-12");
  if (profile.totalCount !== 125 || profile.standardCount !== 100 || profile.secretCount !== 25) {
    throw new Error("The profile response does not report the standard, secret, and total counts correctly.");
  }
  if (!lockedSecret?.isSecret || lockedSecret.unlockedAt !== null
      || "name" in lockedSecret || "description" in lockedSecret || "progress" in lockedSecret
      || "rewardCredits" in lockedSecret || "artwork" in lockedSecret || "rarity" in lockedSecret) {
    throw new Error("The locked-secret API response disclosed hidden achievement details.");
  }
  if (!revealedSecret?.isSecret || revealedSecret.name !== "THE PERFECT BALANCE"
      || !revealedSecret.description || !revealedSecret.artwork || revealedSecret.rarity !== "LEGENDARY"
      || revealedSecret.rewardCredits === undefined || !revealedSecret.unlockedAt) {
    throw new Error("The unlocked-secret API response is missing its revealed details.");
  }
  if (Object.keys(profile.metrics).some((key) => key.startsWith("secret"))) {
    throw new Error("The profile response exposed hidden secret metrics.");
  }
} finally {
  await db.delete(usersTable).where(eq(usersTable.id, userId));
}

if (!assertionsCompleted) throw new Error("Progression test transaction did not complete its assertions.");
console.log("PASS: 100 standard + 25 secret catalog, unique artwork, hidden locked progress, secret unlock, retention, asset history and idempotent completion.");
