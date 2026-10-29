export type AchievementCategory =
  | 'ASSET_COLLECTION'
  | 'ENDGAME_RETENTION'
  | 'WEALTH'
  | 'ATTRIBUTES'
  | 'CAREER_CHARACTER'
  | 'WINNING'
  | 'GAMEPLAY';

export type AchievementTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'LEGENDARY';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  metric: string;
  target: number;
  rarity: AchievementTier;
  icon: string;
  creditReward: number;
}

type AchievementRow = readonly [
  id: string,
  name: string,
  description: string,
  metric: string,
  target: number,
  rarity: AchievementTier,
  icon: string,
  creditReward?: number,
];

const assetCollection: AchievementRow[] = [
  ['first-asset', 'First Acquisition', 'Acquire your first asset in a completed game.', 'assetsAcquired', 1, 'BRONZE', 'car-front'],
  ['five-assets', 'Building a Collection', 'Acquire five assets across completed games.', 'assetsAcquired', 5, 'BRONZE', 'layers'],
  ['ten-assets', 'Asset Regular', 'Acquire ten assets across completed games.', 'assetsAcquired', 10, 'SILVER', 'layers'],
  ['twenty-five-assets', 'Growing Portfolio', 'Acquire twenty-five assets across completed games.', 'assetsAcquired', 25, 'GOLD', 'layers'],
  ['fifty-assets', 'Seasoned Collector', 'Acquire fifty assets across completed games.', 'assetsAcquired', 50, 'PLATINUM', 'layers'],
  ['hundred-assets', 'Century Collection', 'Acquire one hundred assets across completed games.', 'assetsAcquired', 100, 'LEGENDARY', 'trophy'],
  ['five-unique-assets', 'Variety Pack', 'Collect five different asset types.', 'uniqueAssets', 5, 'BRONZE', 'shapes'],
  ['ten-unique-assets', 'Wide Selection', 'Collect ten different asset types.', 'uniqueAssets', 10, 'SILVER', 'shapes'],
  ['complete-asset-catalog', 'Complete Catalog', 'Collect every currently available asset type.', 'uniqueAssets', 0, 'LEGENDARY', 'library'],
  ['two-assets-at-once', 'Two-Piece Portfolio', 'Finish a game holding two assets at once.', 'maxSimultaneousAssets', 2, 'BRONZE', 'briefcase-business'],
  ['three-assets-at-once', 'Three-Part Portfolio', 'Finish a game holding three assets at once.', 'maxSimultaneousAssets', 3, 'GOLD', 'briefcase-business'],
  ['full-slots', 'Four-Slot Portfolio', 'Finish a game with all four asset slots filled.', 'maxSimultaneousAssets', 4, 'PLATINUM', 'briefcase-business'],
  ['rare-asset', 'Rare Find', 'Acquire a rare asset.', 'rareAcquired', 1, 'BRONZE', 'gem'],
  ['three-rare-assets', 'Rare Rotation', 'Acquire three rare assets.', 'rareAcquired', 3, 'GOLD', 'gem'],
  ['ten-rare-assets', 'Rare Collector', 'Acquire ten rare assets.', 'rareAcquired', 10, 'PLATINUM', 'gem'],
  ['elite-asset', 'Top of the Line', 'Acquire an elite asset.', 'eliteAcquired', 1, 'SILVER', 'star'],
  ['five-elite-assets', 'Elite Collection', 'Acquire five elite assets.', 'eliteAcquired', 5, 'LEGENDARY', 'star'],
  ['high-value-asset', 'Big Ticket', 'Acquire an asset valued at $300,000 or more.', 'expensiveAcquired', 1, 'SILVER', 'circle-dollar-sign'],
  ['five-high-value-assets', 'High-Value Collector', 'Acquire five assets valued at $300,000 or more.', 'expensiveAcquired', 5, 'LEGENDARY', 'circle-dollar-sign'],
  ['three-asset-categories', 'Category Hopper', 'Collect assets from three categories.', 'uniqueAssetCategories', 3, 'BRONZE', 'shapes'],
  ['all-asset-categories', 'Full Spectrum', 'Collect an asset from every category.', 'uniqueAssetCategories', 5, 'GOLD', 'shapes'],
  ['complete-car-collection', 'Garage Complete', 'Collect every car asset.', 'fullCarCollection', 1, 'PLATINUM', 'car-front'],
  ['complete-property-collection', 'Property Portfolio', 'Collect every property asset.', 'fullPropertyCollection', 1, 'PLATINUM', 'building-2'],
  ['asset-reacquired', 'Second Chance', 'Reacquire an asset you previously lost.', 'reacquiredAssets', 1, 'SILVER', 'rotate-ccw'],
  ['repeat-collector', 'Back for More', 'Acquire the same asset in at least two different completed games.', 'repeatAssetAcrossGames', 1, 'GOLD', 'repeat-2'],
];

const retention: AchievementRow[] = [
  ['diamond-hands', 'Diamond Hands', 'Finish a completed game holding at least one asset.', 'assetsRetained', 1, 'BRONZE', 'shield-check'],
  ['asset-guardian', 'Asset Guardian', 'Finish a completed game holding three assets.', 'maxRetainedInOneGame', 3, 'SILVER', 'shield-check'],
  ['portfolio-king', 'Portfolio Keeper', 'Finish a completed game holding all four available asset slots.', 'maxRetainedInOneGame', 4, 'GOLD', 'crown'],
  ['untouchable', 'Untouchable', 'Acquire and retain at least one asset in the same completed game.', 'retainedAcquiredAssets', 1, 'SILVER', 'lock-keyhole'],
  ['lifetime-holder', 'Lifetime Holder', 'Finish ten completed games holding at least one asset.', 'gamesHeldAssets', 10, 'GOLD', 'calendar-check'],
  ['the-collector', 'The Collector', 'Finish completed games holding twenty-five assets cumulatively.', 'assetsRetained', 25, 'GOLD', 'archive'],
  ['legacy-portfolio', 'Legacy Portfolio', 'Finish completed games holding one hundred assets cumulatively.', 'assetsRetained', 100, 'LEGENDARY', 'landmark'],
  ['perfect-portfolio', 'Perfect Portfolio', 'Finish a game holding an acquired asset without losing an asset during that game.', 'perfectRetentionGames', 1, 'GOLD', 'badge-check'],
  ['first-retained', 'Held to the End', 'Retain an asset through the finish for the first time.', 'assetsRetained', 1, 'BRONZE', 'hand-coins'],
  ['ten-retained', 'Steady Hands', 'Retain ten assets cumulatively.', 'assetsRetained', 10, 'SILVER', 'hand-coins'],
  ['fifty-retained', 'Long-Term Holder', 'Retain fifty assets cumulatively.', 'assetsRetained', 50, 'PLATINUM', 'hand-coins'],
  ['five-games-retaining', 'Reliable Portfolio', 'Finish five completed games holding at least one asset.', 'gamesHeldAssets', 5, 'SILVER', 'calendar-check'],
  ['twenty-five-games-retaining', 'Portfolio Tradition', 'Finish twenty-five completed games holding at least one asset.', 'gamesHeldAssets', 25, 'PLATINUM', 'calendar-check'],
  ['fifty-games-retaining', 'Legacy Holder', 'Finish fifty completed games holding at least one asset.', 'gamesHeldAssets', 50, 'LEGENDARY', 'calendar-check'],
  ['four-retained-at-once', 'Full House', 'Hold four assets at the end of one game.', 'maxRetainedInOneGame', 4, 'PLATINUM', 'boxes'],
  ['two-retained-categories', 'Balanced Portfolio', 'Retain assets from two different categories in one game.', 'maxRetainedCategories', 2, 'SILVER', 'chart-no-axes-combined'],
  ['all-retained-categories', 'Category Complete', 'Retain assets from all four equipped slots in one game.', 'maxRetainedCategories', 4, 'PLATINUM', 'chart-no-axes-combined'],
  ['premium-retained', 'Kept the Best', 'Finish holding an elite asset.', 'eliteAssetsRetained', 1, 'GOLD', 'gem'],
  ['no-loss-ten', 'Careful Steward', 'Finish ten games without losing an asset acquired during each game.', 'perfectRetentionGames', 10, 'PLATINUM', 'shield'],
  ['no-loss-twenty-five', 'Impeccable Record', 'Finish twenty-five games without losing an acquired asset.', 'perfectRetentionGames', 25, 'LEGENDARY', 'shield'],
];

const wealth: AchievementRow[] = [
  ['wealth-50k', 'First $50K', 'Reach $50,000 in Wealth at the end of a completed game.', 'highestWealth', 50_000, 'BRONZE', 'wallet'],
  ['wealth-100k', 'Six Figures', 'Reach $100,000 in Wealth at the end of a completed game.', 'highestWealth', 100_000, 'SILVER', 'wallet'],
  ['wealth-250k', 'Quarter Million', 'Reach $250,000 in Wealth at the end of a completed game.', 'highestWealth', 250_000, 'GOLD', 'wallet'],
  ['wealth-500k', 'Half Million', 'Reach $500,000 in Wealth at the end of a completed game.', 'highestWealth', 500_000, 'PLATINUM', 'wallet'],
  ['wealth-million', 'Millionaire', 'Reach $1,000,000 in Wealth at the end of a completed game.', 'highestWealth', 1_000_000, 'LEGENDARY', 'wallet'],
  ['portfolio-250k', 'Investment Grade', 'Build a $250,000 endgame asset portfolio.', 'highestAssetPortfolio', 250_000, 'SILVER', 'chart-no-axes-column-increasing'],
  ['portfolio-500k', 'High-Roller Portfolio', 'Build a $500,000 endgame asset portfolio.', 'highestAssetPortfolio', 500_000, 'GOLD', 'chart-no-axes-column-increasing'],
  ['portfolio-million', 'Million-Dollar Portfolio', 'Build a $1,000,000 endgame asset portfolio.', 'highestAssetPortfolio', 1_000_000, 'LEGENDARY', 'chart-no-axes-column-increasing'],
  ['final-value-million', 'Seven-Figure Finish', 'Reach a $1,000,000 final game value.', 'highestFinalValue', 1_000_000, 'GOLD', 'circle-dollar-sign'],
  ['final-value-five-million', 'Big League Finish', 'Reach a $5,000,000 final game value.', 'highestFinalValue', 5_000_000, 'LEGENDARY', 'circle-dollar-sign'],
];

const attributes: AchievementRow[] = [
  ['ai-5', 'Learning System', 'Reach 5 AI Skill in a completed game.', 'bestAiSkill', 5, 'BRONZE', 'brain'],
  ['ai-10', 'Adaptive Intelligence', 'Reach 10 AI Skill in a completed game.', 'bestAiSkill', 10, 'SILVER', 'brain'],
  ['ai-25', 'Thinking Ahead', 'Reach 25 AI Skill in a completed game.', 'bestAiSkill', 25, 'GOLD', 'brain'],
  ['ai-50', 'Singularity', 'Reach 50 AI Skill in a completed game.', 'bestAiSkill', 50, 'LEGENDARY', 'brain'],
  ['fame-25', 'On the Radar', 'Reach 25 Fame in a completed game.', 'bestFame', 25, 'BRONZE', 'sparkles'],
  ['fame-50', 'Main-Stage Name', 'Reach 50 Fame in a completed game.', 'bestFame', 50, 'GOLD', 'sparkles'],
  ['fame-100', 'Household Name', 'Reach 100 Fame in a completed game.', 'bestFame', 100, 'LEGENDARY', 'sparkles'],
  ['lifestyle-25', 'Good Living', 'Reach 25 Lifestyle in a completed game.', 'bestLifestyle', 25, 'BRONZE', 'sun'],
  ['lifestyle-50', 'The Upgrade', 'Reach 50 Lifestyle in a completed game.', 'bestLifestyle', 50, 'GOLD', 'sun'],
  ['lifestyle-100', 'Life in Full', 'Reach 100 Lifestyle in a completed game.', 'bestLifestyle', 100, 'LEGENDARY', 'sun'],
  ['influence-25', 'Known Contact', 'Reach 25 Influence in a completed game.', 'bestInfluence', 25, 'BRONZE', 'network'],
  ['influence-50', 'Power Broker', 'Reach 50 Influence in a completed game.', 'bestInfluence', 50, 'GOLD', 'network'],
  ['influence-100', 'Room Shaper', 'Reach 100 Influence in a completed game.', 'bestInfluence', 100, 'LEGENDARY', 'network'],
  ['balanced-100', 'Well Rounded', 'Reach a combined 100 across AI Skill, Fame, Lifestyle, and Influence.', 'bestCombinedAttributes', 100, 'GOLD', 'chart-no-axes-combined'],
  ['balanced-250', 'Complete Package', 'Reach a combined 250 across AI Skill, Fame, Lifestyle, and Influence.', 'bestCombinedAttributes', 250, 'LEGENDARY', 'chart-no-axes-combined'],
];

const careerCharacter: AchievementRow[] = [
  ['character-one', 'Choose Your Identity', 'Complete a game with a character.', 'uniqueCharacters', 1, 'BRONZE', 'user-round'],
  ['characters-five', 'Five Perspectives', 'Complete games with five different characters.', 'uniqueCharacters', 5, 'SILVER', 'users-round'],
  ['characters-ten', 'Many Sides', 'Complete games with ten different characters.', 'uniqueCharacters', 10, 'GOLD', 'users-round'],
  ['characters-all', 'Full Roster', 'Complete games with every available character.', 'uniqueCharacters', 21, 'LEGENDARY', 'users-round'],
  ['career-one', 'First Career', 'Complete a game with a career.', 'uniqueCareers', 1, 'BRONZE', 'briefcase-business'],
  ['careers-five', 'Career Explorer', 'Complete games with five different careers.', 'uniqueCareers', 5, 'SILVER', 'briefcase-business'],
  ['careers-ten', 'Career Network', 'Complete games with ten different careers.', 'uniqueCareers', 10, 'GOLD', 'briefcase-business'],
  ['careers-all', 'Every Profession', 'Complete games with every available career.', 'uniqueCareers', 17, 'LEGENDARY', 'briefcase-business'],
  ['career-change', 'New Direction', 'Change careers at least once in a completed game.', 'careerChanges', 1, 'SILVER', 'route'],
  ['career-five-changes', 'Reinvention', 'Change careers five times across completed games.', 'careerChanges', 5, 'PLATINUM', 'route'],
];

const winning: AchievementRow[] = [
  ['first-win', 'First Place', 'Win a completed game.', 'wins', 1, 'BRONZE', 'trophy'],
  ['five-wins', 'On a Run', 'Win five completed games.', 'wins', 5, 'GOLD', 'trophy'],
  ['ten-wins', 'Champion Circuit', 'Win ten completed games.', 'wins', 10, 'PLATINUM', 'trophy'],
  ['first-podium', 'On the Podium', 'Finish in the top three.', 'podiumFinishes', 1, 'BRONZE', 'medal'],
  ['ten-podiums', 'Podium Regular', 'Finish in the top three ten times.', 'podiumFinishes', 10, 'GOLD', 'medal'],
  ['final-value-2m', 'Two-Million Finish', 'Reach a $2,000,000 final game value.', 'highestFinalValue', 2_000_000, 'PLATINUM', 'award'],
  ['final-value-10m', 'Eight-Figure Finish', 'Reach a $10,000,000 final game value.', 'highestFinalValue', 10_000_000, 'LEGENDARY', 'award'],
  ['standard-win', 'Standard Winner', 'Win a Standard Redline game.', 'standardWins', 1, 'SILVER', 'flag'],
  ['bio-win', 'Bio Winner', 'Win a Bio Upgrade game.', 'bioWins', 1, 'SILVER', 'heart-handshake'],
  ['multiplayer-wins', 'Table Champion', 'Win five multiplayer games.', 'multiplayerWins', 5, 'LEGENDARY', 'users-round'],
];

const gameplay: AchievementRow[] = [
  ['first-completion', 'Run Complete', 'Finish your first game.', 'completedGames', 1, 'BRONZE', 'check'],
  ['five-completions', 'Getting Started', 'Finish five games.', 'completedGames', 5, 'SILVER', 'check'],
  ['twenty-five-completions', 'Long Game', 'Finish twenty-five games.', 'completedGames', 25, 'GOLD', 'check'],
  ['hundred-completions', 'Century Run', 'Finish one hundred games.', 'completedGames', 100, 'LEGENDARY', 'check'],
  ['first-purchase', 'First Purchase', 'Acquire an asset through a purchase.', 'purchases', 1, 'BRONZE', 'shopping-bag'],
  ['ten-purchases', 'Repeat Buyer', 'Purchase ten assets across completed games.', 'purchases', 10, 'SILVER', 'shopping-bag'],
  ['twenty-five-purchases', 'Portfolio Builder', 'Purchase twenty-five assets across completed games.', 'purchases', 25, 'GOLD', 'shopping-bag'],
  ['first-upgrade', 'Level Up', 'Upgrade an asset.', 'assetUpgrades', 1, 'BRONZE', 'arrow-up-circle'],
  ['ten-upgrades', 'Refined Portfolio', 'Upgrade assets ten times.', 'assetUpgrades', 10, 'GOLD', 'arrow-up-circle'],
  ['first-asset-transfer', 'Deal-Maker', 'Complete an asset transfer in a finished game.', 'assetTransfers', 1, 'SILVER', 'arrow-left-right'],
];

const tierCredits: Record<AchievementTier, number> = {
  BRONZE: 25,
  SILVER: 50,
  GOLD: 100,
  PLATINUM: 200,
  LEGENDARY: 500,
};

function categoryRows(category: AchievementCategory, rows: AchievementRow[]): AchievementDefinition[] {
  return rows.map(([id, name, description, metric, target, rarity, icon, creditReward]) => ({
    id, name, description, category, metric, target, rarity, icon, creditReward: creditReward ?? tierCredits[rarity],
  }));
}

export const achievementCatalog: readonly AchievementDefinition[] = [
  ...categoryRows('ASSET_COLLECTION', assetCollection),
  ...categoryRows('ENDGAME_RETENTION', retention),
  ...categoryRows('WEALTH', wealth),
  ...categoryRows('ATTRIBUTES', attributes),
  ...categoryRows('CAREER_CHARACTER', careerCharacter),
  ...categoryRows('WINNING', winning),
  ...categoryRows('GAMEPLAY', gameplay),
];

export const achievementCategoryLabels: Record<AchievementCategory, string> = {
  ASSET_COLLECTION: 'Asset Collection & Ownership',
  ENDGAME_RETENTION: 'Endgame Asset Retention',
  WEALTH: 'Wealth & Financial Success',
  ATTRIBUTES: 'AI Skill, Fame, Lifestyle & Influence',
  CAREER_CHARACTER: 'Career & Character Progression',
  WINNING: 'Winning & Endgame Performance',
  GAMEPLAY: 'Gameplay Challenges & Special Events',
};

export const achievementCategoryCounts: Record<AchievementCategory, number> = {
  ASSET_COLLECTION: 25,
  ENDGAME_RETENTION: 20,
  WEALTH: 10,
  ATTRIBUTES: 15,
  CAREER_CHARACTER: 10,
  WINNING: 10,
  GAMEPLAY: 10,
};

export function getAchievementProgress(
  definition: AchievementDefinition,
  metrics: Readonly<Record<string, number>>,
  availableAssetCount: number,
): number {
  const target = definition.id === 'complete-asset-catalog' ? availableAssetCount : definition.target;
  return Math.min(target, Math.max(0, metrics[definition.metric] ?? 0));
}

export function validateAchievementCatalog(availableAssetCount: number): void {
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const definition of achievementCatalog) {
    if (ids.has(definition.id)) throw new Error(`Duplicate achievement ID: ${definition.id}`);
    if (names.has(definition.name)) throw new Error(`Duplicate achievement name: ${definition.name}`);
    if (!definition.id || !definition.name || !definition.description || !definition.metric || !definition.icon) {
      throw new Error(`Incomplete achievement definition: ${definition.id}`);
    }
    const target = definition.id === 'complete-asset-catalog' ? availableAssetCount : definition.target;
    if (!Number.isFinite(target) || target <= 0) throw new Error(`Invalid achievement target: ${definition.id}`);
    ids.add(definition.id);
    names.add(definition.name);
  }
  for (const [category, expected] of Object.entries(achievementCategoryCounts)) {
    const actual = achievementCatalog.filter((item) => item.category === category).length;
    if (actual !== expected) throw new Error(`${category} contains ${actual} achievements; expected ${expected}`);
  }
  if (achievementCatalog.length !== 100) throw new Error(`Expected 100 achievements, found ${achievementCatalog.length}`);
}
