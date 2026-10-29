import { and, desc, eq } from "drizzle-orm";
import {
  achievementProfilesTable,
  completedGameHistoryTable,
  db,
  userAchievementsTable,
  userAssetCollectionTable,
} from "@workspace/db";
import {
  achievementCatalog,
  getAchievementProgress,
  validateAchievementCatalog,
} from "../../../redline-upgrade/src/game/achievement-catalog";
import { assets, getAsset } from "../../../redline-upgrade/src/game/assets";
import { calculateAssetValue } from "../../../redline-upgrade/src/game/endgame";
import type { Match } from "../../../redline-upgrade/src/game/match";
import type { MatchAssetEvent } from "../../../redline-upgrade/src/game/multiplayer";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type GameSource = "SOLO" | "MULTIPLAYER";

const emptyMetrics = (): Record<string, number> => ({
  assetsAcquired: 0,
  assetsLost: 0,
  uniqueAssets: 0,
  uniqueAssetsRetained: 0,
  maxSimultaneousAssets: 0,
  rareAcquired: 0,
  eliteAcquired: 0,
  expensiveAcquired: 0,
  uniqueAssetCategories: 0,
  fullCarCollection: 0,
  fullPropertyCollection: 0,
  reacquiredAssets: 0,
  repeatAssetAcrossGames: 0,
  assetsRetained: 0,
  maxRetainedInOneGame: 0,
  retainedAcquiredAssets: 0,
  gamesHeldAssets: 0,
  perfectRetentionGames: 0,
  maxRetainedCategories: 0,
  eliteAssetsRetained: 0,
  highestWealth: 0,
  highestAssetPortfolio: 0,
  highestFinalValue: 0,
  bestAiSkill: 0,
  bestFame: 0,
  bestLifestyle: 0,
  bestInfluence: 0,
  bestCombinedAttributes: 0,
  uniqueCharacters: 0,
  uniqueCareers: 0,
  careerChanges: 0,
  wins: 0,
  podiumFinishes: 0,
  standardWins: 0,
  bioWins: 0,
  multiplayerWins: 0,
  completedGames: 0,
  purchases: 0,
  assetUpgrades: 0,
  assetTransfers: 0,
});

export interface CompletionPlayer {
  userId: string;
  playerIndex: number;
}

function toFacts(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, list]) => [
      key,
      Array.isArray(list) ? list.filter((entry): entry is string => typeof entry === "string") : [],
    ]),
  );
}

function toMetrics(value: unknown): Record<string, number> {
  const result = emptyMetrics();
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;
  for (const [key, metric] of Object.entries(value)) {
    if (typeof metric === "number" && Number.isFinite(metric)) result[key] = metric;
  }
  return result;
}

function assetEventsFromMatch(match: Match): MatchAssetEvent[] {
  if (match.assetEventLog?.length) {
    return match.assetEventLog.map((event) => ({
      eventId: event.eventId,
      playerIndex: event.playerIndex,
      playerId: event.playerId,
      type: event.type,
      assetId: event.assetId,
      targetPlayerId: event.targetPlayerId ?? null,
      assetLevel: event.assetLevel ?? null,
    }));
  }
  return match.eventLog.flatMap((event) => {
    if (
      !["ASSET_ACQUIRED", "ASSET_PURCHASED", "ASSET_TRANSFERRED", "ASSET_UPGRADED"].includes(event.eventType)
      || !event.assetId
    ) return [];
    const playerIndex = match.players.findIndex((player) => player.playerId === event.playerId);
    if (playerIndex < 0) return [];
    return [{
      eventId: event.id,
      playerIndex,
      playerId: event.playerId,
      type: event.eventType as MatchAssetEvent["type"],
      assetId: event.assetId,
      targetPlayerId: event.targetPlayerId ?? null,
      assetLevel: event.assetLevel ?? null,
    }];
  });
}

/** Finalizes one authenticated seat from a completed, server-owned match. Replays are no-ops. */
export async function recordCompletedGame(
  tx: Tx,
  source: GameSource,
  gameId: string,
  userId: string,
  match: Match,
  playerIndex: number,
  eventLedger?: readonly MatchAssetEvent[],
  completedAt = new Date(),
): Promise<string[]> {
  if (match.phase !== "complete" || !match.players.every((player) => player.status === "FINISHED")) return [];
  const player = match.players[playerIndex];
  if (!player || player.isCPU) return [];

  // Serialize completions per account before reading counters, ensuring no two games lose updates.
  await tx.insert(achievementProfilesTable)
    .values({ userId, metrics: emptyMetrics() })
    .onConflictDoNothing();
  const [profile] = await tx.select().from(achievementProfilesTable)
    .where(eq(achievementProfilesTable.userId, userId)).for("update").limit(1);
  if (!profile) return [];

  const existing = await tx.select({ id: completedGameHistoryTable.id })
    .from(completedGameHistoryTable)
    .where(and(
      eq(completedGameHistoryTable.userId, userId),
      eq(completedGameHistoryTable.source, source),
      eq(completedGameHistoryTable.gameId, gameId),
    )).limit(1);
  if (existing.length) return [];

  validateAchievementCatalog(assets.length);
  const allAssetEvents = eventLedger?.length ? [...eventLedger] : assetEventsFromMatch(match);
  const playerEvents = allAssetEvents.filter((event) => event.playerIndex === playerIndex);
  const acquiredEvents = playerEvents.filter((event) => event.type === "ASSET_ACQUIRED");
  const acquiredAssetIds = acquiredEvents.map((event) => event.assetId);
  const acquiredUniqueIds = [...new Set(acquiredAssetIds)];
  const lostAssetIds = allAssetEvents
    .filter((event) => event.type === "ASSET_TRANSFERRED" && event.targetPlayerId === player.playerId)
    .map((event) => event.assetId);
  const retainedAssets = [...new Set(Object.values(player.equipment).filter((assetId): assetId is string => Boolean(assetId)))]
    .map((assetId) => ({ assetId, level: player.assetLevels[assetId] ?? 1 }));
  const retainedIds = retainedAssets.map((asset) => asset.assetId);
  const retainedSet = new Set(retainedIds);
  const retainedAcquiredIds = acquiredUniqueIds.filter((assetId) => retainedSet.has(assetId));
  const portfolioValue = calculateAssetValue(player);
  const finalValue = player.endgame?.finalGameValue ?? player.endgame?.baseValue ?? 0;
  const placement = (match.finishOrder.indexOf(playerIndex) + 1) || match.players.length;
  const previousMetrics = toMetrics(profile.metrics);
  const facts = toFacts(profile.lifetimeFacts);
  const oldAssetRows = await tx.select().from(userAssetCollectionTable)
    .where(eq(userAssetCollectionTable.userId, userId));
  const oldAssets = new Map(oldAssetRows.map((row) => [row.assetId, row]));

  const lostThisGame = new Set(lostAssetIds);
  const reacquiredThisGame = new Set<string>();
  const lostInOrder = new Set<string>();
  for (const event of allAssetEvents) {
    if (event.type === "ASSET_TRANSFERRED" && event.targetPlayerId === player.playerId) {
      lostInOrder.add(event.assetId);
    } else if (event.type === "ASSET_ACQUIRED" && event.playerIndex === playerIndex) {
      const prior = oldAssets.get(event.assetId);
      if ((prior?.lostCount ?? 0) > 0 || lostInOrder.has(event.assetId)) reacquiredThisGame.add(event.assetId);
    }
  }

  const knownAssets = new Set(oldAssetRows.filter((row) => row.acquiredCount > 0).map((row) => row.assetId));
  acquiredUniqueIds.forEach((assetId) => knownAssets.add(assetId));
  retainedIds.forEach((assetId) => knownAssets.add(assetId));
  const everRetainedAssets = new Set(oldAssetRows.filter((row) => row.retainedCount > 0).map((row) => row.assetId));
  retainedIds.forEach((assetId) => everRetainedAssets.add(assetId));
  const categories = new Set([...knownAssets].flatMap((assetId) => {
    const category = getAsset(assetId)?.category;
    return category ? [category] : [];
  }));
  const fullCategory = (category: string) => {
    const members = assets.filter((asset) => asset.category === category);
    return members.length > 0 && members.every((asset) => knownAssets.has(asset.id));
  };
  const retainedCategories = new Set(retainedIds.map((assetId) => {
    const asset = getAsset(assetId);
    return asset ? (asset.category === "pet" || asset.category === "investment" ? "companion" : asset.category) : "";
  }).filter(Boolean));
  const retainedEliteCount = retainedIds.filter((assetId) => getAsset(assetId)?.rarity === "ELITE").length;
  const purchaseCount = playerEvents.filter((event) => event.type === "ASSET_PURCHASED").length;
  const transferCount = playerEvents.filter((event) => event.type === "ASSET_TRANSFERRED").length;
  const upgradeCount = player.history.assetUpgrades;
  const isWin = placement === 1;
  const completedAttributes = player.aiSkill + player.fame + player.lifestyle + player.influence;
  const careerIds = [...new Set([...(player.history.careerIds ?? []), player.careerId, player.secondCareer?.careerId]
    .filter((id): id is string => Boolean(id)))];
  const characterIds = new Set([...(facts.characterIds ?? []), player.characterId]);
  const careers = new Set([...(facts.careerIds ?? []), ...careerIds]);
  const completedGames = previousMetrics.completedGames + 1;
  const gamesAcquiredByAsset = new Map(oldAssetRows.map((row) => [row.assetId, row.gamesAcquired]));
  const repeatAssets = new Set(oldAssetRows.filter((row) => row.gamesAcquired >= 2).map((row) => row.assetId));
  for (const assetId of acquiredUniqueIds) {
    if ((gamesAcquiredByAsset.get(assetId) ?? 0) >= 1) repeatAssets.add(assetId);
  }

  const nextMetrics: Record<string, number> = {
    ...previousMetrics,
    assetsAcquired: previousMetrics.assetsAcquired + acquiredEvents.length,
    assetsLost: previousMetrics.assetsLost + lostAssetIds.length,
    uniqueAssets: knownAssets.size,
    uniqueAssetsRetained: everRetainedAssets.size,
    maxSimultaneousAssets: Math.max(previousMetrics.maxSimultaneousAssets, retainedIds.length),
    rareAcquired: previousMetrics.rareAcquired + acquiredEvents.filter((event) => getAsset(event.assetId)?.rarity === "RARE").length,
    eliteAcquired: previousMetrics.eliteAcquired + acquiredEvents.filter((event) => getAsset(event.assetId)?.rarity === "ELITE").length,
    expensiveAcquired: previousMetrics.expensiveAcquired + acquiredEvents.filter((event) => (getAsset(event.assetId)?.cost ?? 0) >= 300_000).length,
    uniqueAssetCategories: categories.size,
    fullCarCollection: fullCategory("car") ? 1 : previousMetrics.fullCarCollection,
    fullPropertyCollection: fullCategory("property") ? 1 : previousMetrics.fullPropertyCollection,
    reacquiredAssets: previousMetrics.reacquiredAssets + reacquiredThisGame.size,
    repeatAssetAcrossGames: repeatAssets.size,
    assetsRetained: previousMetrics.assetsRetained + retainedIds.length,
    maxRetainedInOneGame: Math.max(previousMetrics.maxRetainedInOneGame, retainedIds.length),
    retainedAcquiredAssets: previousMetrics.retainedAcquiredAssets + retainedAcquiredIds.length,
    gamesHeldAssets: previousMetrics.gamesHeldAssets + (retainedIds.length > 0 ? 1 : 0),
    perfectRetentionGames: previousMetrics.perfectRetentionGames + (acquiredUniqueIds.length > 0 && lostThisGame.size === 0 ? 1 : 0),
    maxRetainedCategories: Math.max(previousMetrics.maxRetainedCategories, retainedCategories.size),
    eliteAssetsRetained: previousMetrics.eliteAssetsRetained + retainedEliteCount,
    highestWealth: Math.max(previousMetrics.highestWealth, player.wealth),
    highestAssetPortfolio: Math.max(previousMetrics.highestAssetPortfolio, portfolioValue),
    highestFinalValue: Math.max(previousMetrics.highestFinalValue, finalValue),
    bestAiSkill: Math.max(previousMetrics.bestAiSkill, player.aiSkill),
    bestFame: Math.max(previousMetrics.bestFame, player.fame),
    bestLifestyle: Math.max(previousMetrics.bestLifestyle, player.lifestyle),
    bestInfluence: Math.max(previousMetrics.bestInfluence, player.influence),
    bestCombinedAttributes: Math.max(previousMetrics.bestCombinedAttributes, completedAttributes),
    uniqueCharacters: characterIds.size,
    uniqueCareers: careers.size,
    careerChanges: previousMetrics.careerChanges + player.history.careerChanges,
    wins: previousMetrics.wins + (isWin ? 1 : 0),
    podiumFinishes: previousMetrics.podiumFinishes + (placement <= 3 ? 1 : 0),
    standardWins: previousMetrics.standardWins + (isWin && match.boardId === "REDLINE_UPGRADE" ? 1 : 0),
    bioWins: previousMetrics.bioWins + (isWin && match.boardId === "BIO_UPGRADE" ? 1 : 0),
    multiplayerWins: previousMetrics.multiplayerWins + (isWin && source === "MULTIPLAYER" ? 1 : 0),
    completedGames,
    purchases: previousMetrics.purchases + purchaseCount,
    assetUpgrades: previousMetrics.assetUpgrades + upgradeCount,
    assetTransfers: previousMetrics.assetTransfers + transferCount,
  };

  const oldAchievementRows = await tx.select().from(userAchievementsTable)
    .where(eq(userAchievementsTable.userId, userId));
  const previousAchievements = new Map(oldAchievementRows.map((row) => [row.achievementId, row]));
  const unlockedIds: string[] = [];
  for (const achievement of achievementCatalog) {
    const previous = previousAchievements.get(achievement.id);
    const target = achievement.id === "complete-asset-catalog" ? assets.length : achievement.target;
    const progress = getAchievementProgress(achievement, nextMetrics, assets.length);
    const newlyUnlocked = !previous?.unlockedAt && progress >= target;
    if (newlyUnlocked) unlockedIds.push(achievement.id);
    const unlockedAt = previous?.unlockedAt ?? (newlyUnlocked ? completedAt : null);
    await tx.insert(userAchievementsTable).values({
      userId,
      achievementId: achievement.id,
      progress,
      unlockedAt,
      unlockGameId: previous?.unlockGameId ?? (newlyUnlocked ? gameId : null),
      rewardCredits: achievement.creditReward,
      updatedAt: completedAt,
    }).onConflictDoUpdate({
      target: [userAchievementsTable.userId, userAchievementsTable.achievementId],
      set: { progress, unlockedAt, unlockGameId: previous?.unlockGameId ?? (newlyUnlocked ? gameId : null), updatedAt: completedAt },
    });
  }

  for (const assetId of new Set([...acquiredAssetIds, ...lostAssetIds, ...retainedIds])) {
    const old = oldAssets.get(assetId);
    const acquiredCount = acquiredAssetIds.filter((id) => id === assetId).length;
    const lostCount = lostAssetIds.filter((id) => id === assetId).length;
    const retainedCount = retainedIds.includes(assetId) ? 1 : 0;
    await tx.insert(userAssetCollectionTable).values({
      userId,
      assetId,
      acquiredCount: (old?.acquiredCount ?? 0) + acquiredCount,
      retainedCount: (old?.retainedCount ?? 0) + retainedCount,
      lostCount: (old?.lostCount ?? 0) + lostCount,
      gamesAcquired: (old?.gamesAcquired ?? 0) + (acquiredUniqueIds.includes(assetId) ? 1 : 0),
      gamesRetained: (old?.gamesRetained ?? 0) + retainedCount,
      firstAcquiredAt: old?.firstAcquiredAt ?? (acquiredCount > 0 ? completedAt : null),
      firstRetainedAt: old?.firstRetainedAt ?? (retainedCount > 0 ? completedAt : null),
      lastAcquiredAt: acquiredCount > 0 ? completedAt : old?.lastAcquiredAt ?? null,
      lastRetainedAt: retainedCount > 0 ? completedAt : old?.lastRetainedAt ?? null,
    }).onConflictDoUpdate({
      target: [userAssetCollectionTable.userId, userAssetCollectionTable.assetId],
      set: {
        acquiredCount: (old?.acquiredCount ?? 0) + acquiredCount,
        retainedCount: (old?.retainedCount ?? 0) + retainedCount,
        lostCount: (old?.lostCount ?? 0) + lostCount,
        gamesAcquired: (old?.gamesAcquired ?? 0) + (acquiredUniqueIds.includes(assetId) ? 1 : 0),
        gamesRetained: (old?.gamesRetained ?? 0) + retainedCount,
        firstAcquiredAt: old?.firstAcquiredAt ?? (acquiredCount > 0 ? completedAt : null),
        firstRetainedAt: old?.firstRetainedAt ?? (retainedCount > 0 ? completedAt : null),
        lastAcquiredAt: acquiredCount > 0 ? completedAt : old?.lastAcquiredAt ?? null,
        lastRetainedAt: retainedCount > 0 ? completedAt : old?.lastRetainedAt ?? null,
      },
    });
  }

  facts.characterIds = [...characterIds];
  facts.careerIds = [...careers];
  await tx.update(achievementProfilesTable).set({
    metrics: nextMetrics,
    lifetimeFacts: facts,
    updatedAt: completedAt,
  }).where(eq(achievementProfilesTable.userId, userId));

  await tx.insert(completedGameHistoryTable).values({
    userId,
    source,
    gameId,
    boardId: match.boardId,
    mode: match.mode,
    placement,
    finalValue,
    portfolioValue,
    characterId: player.characterId,
    careerId: player.careerId,
    finalStats: {
      wealth: player.wealth,
      aiSkill: player.aiSkill,
      fame: player.fame,
      lifestyle: player.lifestyle,
      influence: player.influence,
    },
    acquiredAssetIds,
    lostAssetIds,
    retainedAssets,
    unlockedAchievementIds: unlockedIds,
    completedAt,
  }).onConflictDoNothing();

  return unlockedIds;
}

export async function getAchievementProfile(userId: string) {
  const [profile] = await db.select().from(achievementProfilesTable)
    .where(eq(achievementProfilesTable.userId, userId)).limit(1);
  const rows = await db.select().from(userAchievementsTable)
    .where(eq(userAchievementsTable.userId, userId));
  const savedAchievements = new Map(rows.map((row) => [row.achievementId, row]));
  const collection = await db.select().from(userAssetCollectionTable)
    .where(eq(userAssetCollectionTable.userId, userId));
  const history = await db.select().from(completedGameHistoryTable)
    .where(eq(completedGameHistoryTable.userId, userId))
    .orderBy(desc(completedGameHistoryTable.completedAt));
  const metrics = toMetrics(profile?.metrics);
  const unlockedCount = achievementCatalog.filter((achievement) => Boolean(savedAchievements.get(achievement.id)?.unlockedAt)).length;
  return {
    metrics,
    achievements: achievementCatalog.map((achievement) => {
      const row = savedAchievements.get(achievement.id);
      return {
        achievementId: achievement.id,
        progress: row?.progress ?? 0,
        unlockedAt: row?.unlockedAt ?? null,
        unlockGameId: row?.unlockGameId ?? null,
        rewardCredits: achievement.creditReward,
      };
    }),
    unlockedCount,
    totalCount: achievementCatalog.length,
    collection,
    history,
  };
}
