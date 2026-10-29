import { randomUUID } from "node:crypto";
import { db, usersTable, achievementProfilesTable, userAchievementsTable, completedGameHistoryTable, userAssetCollectionTable } from "@workspace/db";
import { recordCompletedGame } from "../src/lib/progression.ts";
import { assets } from "../../redline-upgrade/src/game/assets.ts";
import { characters } from "../../redline-upgrade/src/game/characters.ts";
import { createMatch } from "../../redline-upgrade/src/game/match.ts";
import { validateAchievementCatalog } from "../../redline-upgrade/src/game/achievement-catalog.ts";

const rollback = new Error("PROGRESSION_CHECK_ROLLBACK");
const userId = `progression-check-${randomUUID()}`;
const gameId = randomUUID();
const car = assets.find((asset) => asset.category === "car");
const property = assets.find((asset) => asset.category === "property");
const lostAsset = assets.find((asset) => asset.category === "lifestyle");
if (!car || !property || !lostAsset) throw new Error("Test asset fixtures are incomplete.");
validateAchievementCatalog(assets.length);

let assertionsCompleted = false;
try {
  await db.transaction(async (tx) => {
    await tx.insert(usersTable).values({ id: userId });
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
    if (storedAchievements.length !== 100) throw new Error("The account does not have one persistent progress row for every achievement.");
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
    if (profileAfterReplay.metrics.completedGames !== 1 || historyAfterReplay.length !== 1) {
      throw new Error("Replaying completion duplicated lifetime progress.");
    }
    assertionsCompleted = true;
    throw rollback;
  });
} catch (error) {
  if (error !== rollback) throw error;
}

if (!assertionsCompleted) throw new Error("Progression test transaction did not complete its assertions.");
console.log("PASS: 100-achievement catalog, endgame retention, loss/acquisition totals, asset history and idempotent completion.");
