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
import { characters } from "../../../redline-upgrade/src/game/characters";
import { careers } from "../../../redline-upgrade/src/game/careers";
import { calculateAssetValue } from "../../../redline-upgrade/src/game/endgame";
import type { Match } from "../../../redline-upgrade/src/game/match";
import type { MatchAssetEvent } from "../../../redline-upgrade/src/game/multiplayer";
import { secretAchievementCatalog, SECRET_ACHIEVEMENT_IDS } from "./secret-achievements";

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

type SecretRun = {
  retainedCount: number;
  lossFree: boolean;
  topDecileWealth: boolean;
  won: boolean;
  startingCareerId: string | null;
  endingCareerId: string | null;
};

const SECRET_ASSET_CATALOG_VERSION = "redline-assets-v1";
// Frozen v1 eligibility: future additions to the normal asset catalog do not
// retroactively change collection achievements already earned under this set.
const SECRET_ASSET_CATALOG_V1 = [
  "budget-racer", "flex-car", "supercar", "electric-hypercar", "luxury-travel", "vip-life", "low-key-life",
  "creator-lifestyle", "cyber-dog", "golden-retriever", "robot-cat", "chaos-monkey", "index-fund", "tech-investment",
  "degen-investment", "starter-condo", "luxury-apartment", "beach-house", "mansion", "street-tuner", "electric-coupe",
  "executive-sedan", "track-special", "grand-tourer", "prototype-one", "studio-life", "city-weekends", "wellness-club",
  "art-collector", "private-retreat", "global-elite", "rescue-pup", "street-cat", "drone-bird", "fox-companion",
  "holo-hound", "legendary-companion", "savings-bond", "community-fund", "green-energy", "venture-seed",
  "creator-fund", "deep-tech-fund", "moonshot-portfolio", "shared-loft", "townhouse", "smart-home",
  "skyline-penthouse", "country-estate", "landmark-residence", "aero-sprint", "solar-sculptor", "rally-specter",
  "vector-roadster", "chrono-coupe", "biofuel-rally", "monocoque-gt", "drift-phantom", "tidal-ev", "orbital-racer",
  "smart-wardrobe", "immersive-theater", "wellness-capsule", "private-chef", "orbital-tour", "vinyl-room",
  "aurora-sauna", "ceramic-studio", "night-market-pass", "slow-living-retreat", "nanodrone-owl", "shiba-companion",
  "pocket-hedgehog", "signal-parrot", "therapy-llama", "coral-axolotl", "mechanical-ferret", "moon-rabbit",
  "miniature-pony", "rescue-crow", "fusion-grid", "quantum-basket", "robotics-fund", "municipal-bonds",
  "lunar-mining", "water-rights", "synthetic-biology", "art-market-fund", "agri-tech", "retrofit-trust",
  "forest-cabin", "modular-urban-home", "floating-villa", "desert-observatory", "micro-loft", "lakeside-compound",
  "vertical-garden-tower", "eco-farmhouse", "heritage-hotel", "coastal-lighthouse",
] as const;

function secretRecentRuns(facts: Record<string, string[]>): SecretRun[] {
  return (facts.secretRecentRuns ?? []).flatMap((value) => {
    try {
      const run = JSON.parse(value) as SecretRun;
      return typeof run.won === "boolean" ? [run] : [];
    } catch {
      return [];
    }
  });
}

function trailingCount<T>(items: readonly T[], predicate: (item: T) => boolean): number {
  let count = 0;
  for (let index = items.length - 1; index >= 0 && predicate(items[index]); index -= 1) count += 1;
  return count;
}

function countFacts(facts: Record<string, string[]>, key: string): string[] {
  return [...new Set(facts[key] ?? [])];
}

function computeSecretMetrics(args: {
  currentMetrics: Record<string, number>;
  facts: Record<string, string[]>;
  run: SecretRun;
  oldAssets: Map<string, { acquiredCount: number; gamesRetained: number; retainedCount: number }>;
  acquiredAssetIds: string[];
  retainedIds: string[];
  lostAssetIds: string[];
  player: Match["players"][number];
  match: Match;
  playerIndex: number;
  portfolioValue: number;
  topDecileWealth: boolean;
  isWin: boolean;
  standardUnlockedCount: number;
}): Record<string, number> {
  const {
    currentMetrics, facts, run, oldAssets, acquiredAssetIds, retainedIds, lostAssetIds,
    player, match, playerIndex, portfolioValue, topDecileWealth, isWin, standardUnlockedCount,
  } = args;
  facts.secretAssetCatalogVersion = [SECRET_ASSET_CATALOG_VERSION];
  const recentRuns = [...secretRecentRuns(facts), run].slice(-25);
  facts.secretRecentRuns = recentRuns.map((entry) => JSON.stringify(entry));

  const wonCharacterIds = countFacts(facts, "secretWonCharacterIds");
  const wonCareerIds = countFacts(facts, "secretWonCareerIds");
  const characterCareerWins = new Map<string, number>();
  for (const value of facts.secretCharacterCareerWins ?? []) {
    try {
      const [key, count] = JSON.parse(value) as [string, number];
      if (typeof key === "string" && Number.isFinite(count)) characterCareerWins.set(key, count);
    } catch {
      // Ignore an incomplete legacy fact rather than preventing game completion.
    }
  }
  const startingCareerId = run.startingCareerId;
  const careerPair = startingCareerId ? `${player.characterId}|${startingCareerId}` : "";
  if (isWin) {
    wonCharacterIds.push(player.characterId);
    (player.history.careerIds ?? []).forEach((id) => wonCareerIds.push(id));
    if (careerPair) characterCareerWins.set(careerPair, (characterCareerWins.get(careerPair) ?? 0) + 1);
  }
  facts.secretWonCharacterIds = [...new Set(wonCharacterIds)];
  facts.secretWonCareerIds = [...new Set(wonCareerIds)];
  facts.secretCharacterCareerWins = [...characterCareerWins].map(([key, count]) => JSON.stringify([key, count]));

  const retainedSet = new Set(retainedIds);
  const assetGamesRetained = new Map([...oldAssets].map(([id, row]) => [id, row.gamesRetained + (retainedSet.has(id) ? 1 : 0)]));
  const immortalStreak = trailingCount(recentRuns, (entry) => entry.retainedCount >= 3);
  const noLossStreak = trailingCount(recentRuns, (entry) => entry.lossFree);
  const undefeatedStreak = trailingCount(recentRuns, (entry) => entry.won);
  const careerImmortalityStreak = trailingCount(recentRuns, (entry) =>
    entry.won && Boolean(entry.startingCareerId) && entry.startingCareerId === entry.endingCareerId,
  );
  const qualifiesSixDimensions = player.wealth >= 1_000_000
    && player.aiSkill >= 50
    && player.fame >= 100
    && player.lifestyle >= 100
    && player.influence >= 100
    && portfolioValue >= 1_000_000;
  const trackedValues = [player.wealth, player.aiSkill, player.fame, player.lifestyle, player.influence, portfolioValue];
  const absoluteDominance = isWin && trackedValues.every((value, index) =>
    match.players.every((opponent, opponentIndex) => opponentIndex === playerIndex || value > [
      opponent.wealth,
      opponent.aiSkill,
      opponent.fame,
      opponent.lifestyle,
      opponent.influence,
      calculateAssetValue(opponent),
    ][index]),
  );
  const checkpointPositions = match.lateGameCheckpoint?.positions ?? [];
  const atLastCheckpoint = checkpointPositions.length === match.players.length
    && checkpointPositions[playerIndex] === Math.min(...checkpointPositions);
  const endgameBases = match.players.map((candidate) => candidate.endgame?.baseValue);
  const atLastFinalDecision = endgameBases.every((value): value is number => typeof value === "number")
    && player.endgame !== null
    && player.endgame.baseValue === Math.min(...endgameBases);
  const visitedMilestones = new Set(player.history.milestoneSpacesVisited ?? []);
  const completedMilestones = new Set(player.history.milestoneSpacesCompleted ?? []);
  const perfectMilestones = isWin && visitedMilestones.size > 0
    && [...visitedMilestones].every((space) => completedMilestones.has(space));
  const eligibleAssets = SECRET_ASSET_CATALOG_V1;
  const everyAssetRetained = eligibleAssets.length > 0 && eligibleAssets.every((assetId) =>
    (oldAssets.get(assetId)?.retainedCount ?? 0) > 0 || retainedSet.has(assetId),
  );
  const everyAssetAcquiredTwice = eligibleAssets.length > 0 && eligibleAssets.every((assetId) =>
    (oldAssets.get(assetId)?.acquiredCount ?? 0) + acquiredAssetIds.filter((id) => id === assetId).length >= 2,
  );
  const acquiredUnique = new Set(acquiredAssetIds);
  // No sale action exists in the current game rules; this tracks asset transfers away.
  const lostThisGame = new Set(lostAssetIds);
  const perfectHeist = retainedIds.length === 4 && acquiredUnique.size === 4
    && retainedIds.every((assetId) => acquiredUnique.has(assetId)) && lostThisGame.size === 0;
  const minStartingSalary = Math.min(...careers.flatMap((career) => career.salaryTiers));
  const winningCareerPairCount = careerPair ? characterCareerWins.get(careerPair) ?? 0 : 0;
  return {
    ...currentMetrics,
    secretImmortalPortfolio: immortalStreak,
    secretDiamondHands: Math.max(currentMetrics.secretDiamondHands ?? 0, ...assetGamesRetained.values(), 0),
    secretGrandCollector: everyAssetRetained ? 1 : 0,
    secretUntouchableEmpire: noLossStreak,
    secretVault: currentMetrics.gamesHeldAssets ?? 0,
    secretCollectorsParadox: everyAssetAcquiredTwice ? 1 : 0,
    secretPerfectHeist: perfectHeist ? 1 : 0,
    secretBillionairesClub: (currentMetrics.secretBillionairesClub ?? 0) + (topDecileWealth ? 1 : 0),
    secretSixDimensionalGenius: qualifiesSixDimensions ? 1 : 0,
    secretAbsoluteDominance: absoluteDominance ? 1 : 0,
    secretImpossibleComeback: isWin && atLastCheckpoint ? 1 : 0,
    secretPerfectBalance: [player.aiSkill, player.fame, player.lifestyle, player.influence].every((value) =>
      value >= 25 && value === player.aiSkill,
    ) ? 1 : 0,
    secretMasterOfAllTrades: wonCharacterIds.length,
    secretChameleon: wonCareerIds.length,
    secretCareerImmortality: careerImmortalityStreak,
    secretUnderdogLegend: isWin && player.history.startingSalary === minStartingSalary ? 1 : 0,
    secretUltimateSpecialist: winningCareerPairCount,
    secretUndefeated: undefeatedStreak,
    secretFinalGambler: (currentMetrics.secretFinalGambler ?? 0) + (isWin && player.history.finalGambles > 0 ? 1 : 0),
    secretDoubleDownDynasty: (currentMetrics.secretDoubleDownDynasty ?? 0) + (isWin && player.history.doubleDowns > 0 ? 1 : 0),
    secretLastSecondLegend: isWin && atLastFinalDecision ? 1 : 0,
    secretPerfectRun: perfectMilestones ? 1 : 0,
    secretCenturion: currentMetrics.wins ?? 0,
    secretRedlineMyth: standardUnlockedCount,
    secretBeyondTheRedline: 0,
  };
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
  const wealthRankThreshold = [...match.players]
    .filter((candidate) => candidate.status === "FINISHED")
    .map((candidate) => candidate.wealth)
    .sort((a, b) => b - a)[Math.max(0, Math.ceil(match.players.filter((candidate) => candidate.status === "FINISHED").length * 0.1) - 1)];
  const topDecileWealth = wealthRankThreshold !== undefined && player.wealth >= wealthRankThreshold;
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
  const standardUnlockedCount = achievementCatalog.filter((achievement) => {
    const previous = previousAchievements.get(achievement.id);
    const target = achievement.id === "complete-asset-catalog" ? assets.length : achievement.target;
    return Boolean(previous?.unlockedAt) || getAchievementProgress(achievement, nextMetrics, assets.length) >= target;
  }).length;
  const startingCareerId = player.history.careerIds?.[0] ?? player.careerId;
  const secretRun: SecretRun = {
    retainedCount: retainedIds.length,
    lossFree: lostAssetIds.length === 0,
    topDecileWealth,
    won: isWin,
    startingCareerId,
    endingCareerId: player.careerId,
  };
  const nextMetricsWithSecrets = computeSecretMetrics({
    currentMetrics: nextMetrics,
    facts,
    run: secretRun,
    oldAssets,
    acquiredAssetIds,
    retainedIds,
    lostAssetIds,
    player,
    match,
    playerIndex,
    portfolioValue,
    topDecileWealth,
    isWin,
    standardUnlockedCount,
  });
  const priorSecretUnlocks = new Set(oldAchievementRows.filter((row) => row.unlockedAt).map((row) => row.achievementId));
  const otherSecretUnlocks = secretAchievementCatalog.slice(0, 24).filter((achievement) =>
    priorSecretUnlocks.has(achievement.id)
    || (nextMetricsWithSecrets[achievement.metric] ?? 0) >= achievement.target,
  ).length;
  nextMetricsWithSecrets.secretBeyondTheRedline = standardUnlockedCount + otherSecretUnlocks;

  const unlockedIds: string[] = [];
  for (const achievement of achievementCatalog) {
    const previous = previousAchievements.get(achievement.id);
    const target = achievement.id === "complete-asset-catalog" ? assets.length : achievement.target;
    const progress = getAchievementProgress(achievement, nextMetricsWithSecrets, assets.length);
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
  for (const achievement of secretAchievementCatalog) {
    const previous = previousAchievements.get(achievement.id);
    const progress = Math.min(achievement.target, Math.max(0, nextMetricsWithSecrets[achievement.metric] ?? 0));
    const newlyUnlocked = !previous?.unlockedAt && progress >= achievement.target;
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
    metrics: nextMetricsWithSecrets,
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
  const allMetrics = toMetrics(profile?.metrics);
  const metrics = Object.fromEntries(Object.entries(allMetrics).filter(([key]) => !key.startsWith("secret")));
  const standardUnlockedCount = achievementCatalog.filter((achievement) => Boolean(savedAchievements.get(achievement.id)?.unlockedAt)).length;
  const secretUnlockedCount = secretAchievementCatalog.filter((achievement) => Boolean(savedAchievements.get(achievement.id)?.unlockedAt)).length;
  const unlockedCount = standardUnlockedCount + secretUnlockedCount;
  return {
    metrics,
    achievements: [
      ...achievementCatalog.map((achievement) => {
        const row = savedAchievements.get(achievement.id);
        return {
          achievementId: achievement.id,
          isSecret: false,
          name: achievement.name,
          description: achievement.description,
          rarity: achievement.rarity,
          progress: row?.progress ?? 0,
          unlockedAt: row?.unlockedAt ?? null,
          unlockGameId: row?.unlockGameId ?? null,
          rewardCredits: achievement.creditReward,
        };
      }),
      ...secretAchievementCatalog.map((achievement) => {
        const row = savedAchievements.get(achievement.id);
        const unlocked = Boolean(row?.unlockedAt);
        return {
          achievementId: achievement.id,
          isSecret: true,
          unlockedAt: row?.unlockedAt ?? null,
          unlockGameId: row?.unlockGameId ?? null,
          ...(unlocked ? {
            name: achievement.name,
            description: achievement.description,
            rarity: achievement.rarity,
            artwork: achievement.artwork,
            progress: achievement.target,
            rewardCredits: achievement.creditReward,
          } : {}),
        };
      }),
    ],
    unlockedCount,
    totalCount: achievementCatalog.length + secretAchievementCatalog.length,
    standardCount: achievementCatalog.length,
    secretCount: secretAchievementCatalog.length,
    standardUnlockedCount,
    secretUnlockedCount,
    collection,
    history,
  };
}
