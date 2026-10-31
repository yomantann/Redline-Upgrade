import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, usersTable, achievementProfilesTable, userAchievementsTable, completedGameHistoryTable, personalBestRecordsTable, userAssetCollectionTable } from "@workspace/db";
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
const forfeitedAsset = assets.find((asset) => asset.category === "pet");
if (!car || !property || !lostAsset || !forfeitedAsset) throw new Error("Test asset fixtures are incomplete.");
validateAchievementCatalog(assets.length);
const expectedSecretCount = 30;
const expectedAchievementCount = 100 + expectedSecretCount;
if (secretAchievementCatalog.length !== expectedSecretCount) throw new Error(`The secret achievement catalog must contain exactly ${expectedSecretCount} entries.`);
if (new Set(secretAchievementCatalog.map((item) => item.id)).size !== expectedSecretCount) throw new Error("Secret achievement IDs are not unique.");
if (new Set(secretAchievementCatalog.map((item) => item.artwork)).size !== expectedSecretCount) throw new Error("Secret achievement artwork is not unique.");

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
             endgame: {
               status: "RESOLVED",
               choice: "CASH_OUT",
               baseValue: 500_000,
               finalGameValue: 620_000,
             },
          }
        : { ...candidate, status: "FINISHED" }),
    };
    const eventLedger = [
      { eventId: "test-acquired", playerId: player.playerId, playerIndex: 0, type: "ASSET_ACQUIRED", assetId: car.id, targetPlayerId: null, assetLevel: 2 },
      { eventId: "test-purchased", playerId: player.playerId, playerIndex: 0, type: "ASSET_PURCHASED", assetId: car.id, targetPlayerId: null, assetLevel: 2 },
      { eventId: "test-forfeit-acquired", playerId: player.playerId, playerIndex: 0, type: "ASSET_ACQUIRED", assetId: forfeitedAsset.id, targetPlayerId: null, assetLevel: 3 },
      { eventId: "test-forfeit", playerId: player.playerId, playerIndex: 0, type: "ASSET_DISPOSED", assetId: forfeitedAsset.id, targetPlayerId: null, assetLevel: 3, effectId: "GAMBLE_CARD_FORFEITURE", reason: "Double Or Nothing" },
      { eventId: "test-lost", playerId: start.players[1].playerId, playerIndex: 1, type: "ASSET_TRANSFERRED", assetId: lostAsset.id, targetPlayerId: player.playerId, assetLevel: 1 },
    ];

    const unlocked = await recordCompletedGame(tx, "SOLO", gameId, userId, completed, 0, eventLedger);
    const [profile] = await tx.select().from(achievementProfilesTable).where(eq(achievementProfilesTable.userId, userId));
    const storedAchievements = await tx.select().from(userAchievementsTable).where(eq(userAchievementsTable.userId, userId));
    const historyBeforeReplay = await tx.select().from(completedGameHistoryTable).where(eq(completedGameHistoryTable.userId, userId));
    const collectionBeforeReplay = await tx.select().from(userAssetCollectionTable).where(eq(userAssetCollectionTable.userId, userId));
    const replayUnlocks = await recordCompletedGame(tx, "SOLO", gameId, userId, completed, 0, eventLedger);
    const [profileAfterReplay] = await tx.select().from(achievementProfilesTable).where(eq(achievementProfilesTable.userId, userId));
    const historyAfterReplay = await tx.select().from(completedGameHistoryTable).where(eq(completedGameHistoryTable.userId, userId));

    const owned = collectionBeforeReplay.find((entry) => entry.assetId === car.id);
    const retainedProperty = collectionBeforeReplay.find((entry) => entry.assetId === property.id);
    const lost = collectionBeforeReplay.find((entry) => entry.assetId === lostAsset.id);
    const forfeited = collectionBeforeReplay.find((entry) => entry.assetId === forfeitedAsset.id);
    if (profile.metrics.completedGames !== 1) throw new Error("Completion total did not increment once.");
    if (storedAchievements.length !== expectedAchievementCount) throw new Error(`The account does not have one persistent progress row for all ${expectedAchievementCount} achievements.`);
    if (profile.metrics.assetsAcquired !== 2 || profile.metrics.assetsLost !== 2) throw new Error("Acquisition or loss totals are incorrect.");
    if (profile.metrics.assetsRetained !== 2 || profile.metrics.uniqueAssetsRetained !== 2) throw new Error("Endgame retention totals are incorrect.");
    if (profile.metrics.maxSimultaneousAssets !== 2 || profile.metrics.gamesHeldAssets !== 1) throw new Error("Retention milestones are incorrect.");
    if (!owned || owned.acquiredCount !== 1 || owned.retainedCount !== 1 || !retainedProperty || retainedProperty.retainedCount !== 1 || !lost || lost.lostCount !== 1) {
      throw new Error("Per-asset lifetime ownership record is incorrect.");
    }
    if (!forfeited || forfeited.acquiredCount !== 1 || forfeited.lostCount !== 1) {
      throw new Error("Gamble-card asset forfeiture was not applied to the lifetime ownership record.");
    }
    if (historyBeforeReplay.length !== 1 || historyBeforeReplay[0].retainedAssets.length !== 2) {
      throw new Error("Completed-game snapshot is missing its retained assets.");
    }
    const history = historyBeforeReplay[0];
    if (history.boardFinishOrder !== 1 || history.placement !== 1 || history.finalValue !== 620_000) {
      throw new Error("The completed-game record lost board finish order or final-value placement.");
    }
    if (history.endgameResult?.choice !== "CASH_OUT" || history.endgameResult.finalValue !== 620_000) {
      throw new Error("The completed-game record is missing its confirmed endgame result.");
    }
    if (!history.creditRewardReceipt || history.creditRewardReceipt.total <= 0 || history.creditRewardReceipt.game <= 0) {
      throw new Error("The completed-game record is missing the Credits receipt.");
    }
    if (history.assetDispositions?.length !== 4
        || !history.assetDispositions.some((item) => item.assetId === car.id && item.status === "RETAINED" && item.level === 2)
        || !history.assetDispositions.some((item) => item.assetId === lostAsset.id && item.status === "LOST" && item.reason === "TRANSFERRED_OUT")
        || !history.assetDispositions.some((item) => item.assetId === forfeitedAsset.id && item.status === "LOST" && item.reason === "GAMBLE_CARD_FORFEITURE" && item.sourceName === "Double Or Nothing")) {
      throw new Error("Per-asset disposition and retained level history are incorrect.");
    }
    const diamondHands = storedAchievements.find((entry) => entry.achievementId === "diamond-hands");
    if (!unlocked.includes("first-asset") || unlocked.includes("diamond-hands") || diamondHands?.progress !== 1
        || diamondHands.unlockedAt || replayUnlocks.length !== 0) {
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
  // Simulate a returning account whose completed-game history predates the PB table.
  await db.delete(personalBestRecordsTable).where(eq(personalBestRecordsTable.userId, userId));
  const createRecordRun = (boardId, finalValue, wealth) => {
    const start = createMatch(characters[0].id, boardId, "SINGLE_PLAYER");
    const players = start.players.map((candidate, index) => {
      const basePlayer = index === 0 ? {
        ...candidate,
        status: "FINISHED",
        wealth,
        aiSkill: 25,
        fame: 25,
        lifestyle: 25,
        influence: 25,
        equipment: { ...candidate.equipment, car: car.id, property: property.id },
        assetLevels: { ...candidate.assetLevels, [car.id]: 2, [property.id]: 1 },
      } : { ...candidate, status: "FINISHED" };
      return index === 0 ? {
        ...basePlayer,
        endgame: {
          status: "RESOLVED",
          choice: "CASH_OUT",
          baseValue: finalValue,
          finalGameValue: finalValue,
          snapshot: { ...basePlayer },
        },
      } : basePlayer;
    });
    return { ...start, phase: "complete", finishOrder: [0, 1, 2, 3], players };
  };
  const tieGameId = randomUUID();
  const improvedGameId = randomUUID();
  const bioGameId = randomUUID();
  await db.transaction(async (tx) => {
    const tieRun = createRecordRun("REDLINE_UPGRADE", 620_000, 120_000);
    await recordCompletedGame(tx, "SOLO", tieGameId, userId, tieRun, 0, []);
    if (tieRun.players[0].personalBestCategories?.length) {
      throw new Error("An equal result was incorrectly labeled a new Personal Best.");
    }
    const improvedRun = createRecordRun("REDLINE_UPGRADE", 620_001, 120_001);
    await recordCompletedGame(tx, "SOLO", improvedGameId, userId, improvedRun, 0, []);
    if (improvedRun.players[0].personalBestCategories?.join(",") !== "FINAL_SCORE,FINAL_WEALTH") {
      throw new Error(`Personal Bests were not awarded only for strictly improved categories: ${improvedRun.players[0].personalBestCategories?.join(",") ?? "(none)"}.`);
    }
    const bioRun = createRecordRun("BIO_UPGRADE", 620_000, 120_000);
    await recordCompletedGame(tx, "SOLO", bioGameId, userId, bioRun, 0, []);
    if (bioRun.players[0].personalBestCategories?.length) {
      throw new Error("The first Bio result should establish baselines without announcing a sweep of new records.");
    }
  });
  const rawProfile = await getAchievementProfile(userId);
  const profile = GetAchievementProfileResponse.parse(rawProfile);
  const standardFinalScore = profile.personalBests.find((record) => record.mode === "STANDARD" && record.category === "FINAL_SCORE");
  const bioFinalScore = profile.personalBests.find((record) => record.mode === "BIO" && record.category === "FINAL_SCORE");
  if (profile.personalBests.length !== 20 || standardFinalScore?.recordValue !== 620_001
      || standardFinalScore.previousValue !== 620_000 || standardFinalScore.gameId === gameId
      || bioFinalScore?.recordValue !== 620_000 || bioFinalScore.gameId === standardFinalScore.gameId) {
    throw new Error("Mode-specific Personal Best persistence or strict improvement tracking is incorrect.");
  }
  const lockedSecret = profile.achievements.find((item) => item.achievementId === "secret-01");
  const revealedSecret = profile.achievements.find((item) => item.achievementId === "secret-12");
  if (profile.totalCount !== expectedAchievementCount || profile.standardCount !== 100 || profile.secretCount !== expectedSecretCount) {
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
  const savedRuns = await db.select().from(completedGameHistoryTable)
    .where(eq(completedGameHistoryTable.userId, userId));
  if (savedRuns.length !== 4) throw new Error("The test did not store each distinct completed game exactly once.");
} finally {
  await db.delete(usersTable).where(eq(usersTable.id, userId));
}

if (!assertionsCompleted) throw new Error("Progression test transaction did not complete its assertions.");
console.log(`PASS: 100 standard + ${expectedSecretCount} secret catalog, unique artwork, hidden locked progress, secret unlock, retention, asset history and idempotent completion.`);
