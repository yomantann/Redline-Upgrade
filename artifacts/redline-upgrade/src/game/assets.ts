import type { CareerStat } from './careers';
import { additionalAssets } from './assets-extra';
import { expansionAssets } from './assets-expansion';

export type AssetCategory = 'car' | 'lifestyle' | 'pet' | 'investment' | 'property';
export type AssetSlot = 'car' | 'lifestyle' | 'companion' | 'property';
export type AssetStat = CareerStat | 'wealth';
export type AssetLevel = 1 | 2 | 3 | 4;
export const MAX_ASSET_LEVEL: AssetLevel = 4;
export const ASSET_ATTRIBUTE_STATS = ['aiSkill', 'fame', 'lifestyle', 'influence'] as const;
export type AssetAttributeStat = typeof ASSET_ATTRIBUTE_STATS[number];
export type AssetAttributeContributions = Record<AssetAttributeStat, number>;
export const MAX_ASSET_ATTRIBUTE_POINTS_PER_ASSET = 10;
const MAX_BASE_ASSET_ATTRIBUTE_BONUS = 3;

export interface AssetDefinition {
  id: string;
  name: string;
  category: AssetCategory;
  visual: string;
  cost: number;
  description: string;
  effects: Partial<Record<AssetStat, number>>;
  passiveEffect?: string;
  rarity: 'STANDARD' | 'RARE' | 'ELITE';
  /** Asset-specific level references; the base artwork stays tied to this exact asset. */
  visualVariants?: Partial<Record<AssetLevel, string>>;
}

// Balancing and descriptive effects live here, never in the purchase UI.
// Investment passives are descriptive only until a later investment phase.
const assetRecords: readonly AssetDefinition[] = [
  { id: 'budget-racer', name: 'Budget Racer', category: 'car', visual: '↗', cost: 50000, description: 'A nimble first set of wheels.', effects: { fame: 3 }, rarity: 'STANDARD' },
  { id: 'flex-car', name: 'Flex Car', category: 'car', visual: '◈', cost: 150000, description: 'Makes an entrance wherever you pull up.', effects: { fame: 10, influence: 5 }, rarity: 'RARE' },
  { id: 'supercar', name: 'Supercar', category: 'car', visual: '◆', cost: 300000, description: 'Built to command every lane.', effects: { fame: 20, influence: 10 }, rarity: 'ELITE' },
  { id: 'electric-hypercar', name: 'Electric Hypercar', category: 'car', visual: '⌁', cost: 250000, description: 'Tomorrow’s speed, today.', effects: { fame: 15, aiSkill: 10 }, rarity: 'ELITE' },
  { id: 'luxury-travel', name: 'Luxury Travel', category: 'lifestyle', visual: '✧', cost: 130000, description: 'A passport full of first-class stories.', effects: { lifestyle: 15, fame: 5 }, rarity: 'RARE' },
  { id: 'vip-life', name: 'VIP Life', category: 'lifestyle', visual: '✦', cost: 200000, description: 'Access changes everything.', effects: { lifestyle: 20, influence: 10 }, rarity: 'ELITE' },
  { id: 'low-key-life', name: 'Low-Key Life', category: 'lifestyle', visual: '◌', cost: 70000, description: 'Make room for the good things.', effects: { lifestyle: 10 }, rarity: 'STANDARD' },
  { id: 'creator-lifestyle', name: 'Creator Lifestyle', category: 'lifestyle', visual: '▣', cost: 125000, description: 'Live the story you are making.', effects: { lifestyle: 10, fame: 10 }, rarity: 'RARE' },
  { id: 'cyber-dog', name: 'Cyber Dog', category: 'pet', visual: '⬡', cost: 60000, description: 'Loyalty with a processor.', effects: { lifestyle: 5, fame: 5 }, rarity: 'STANDARD' },
  { id: 'golden-retriever', name: 'Golden Retriever', category: 'pet', visual: '✳', cost: 70000, description: 'The best friend on any route.', effects: { lifestyle: 10 }, rarity: 'STANDARD' },
  { id: 'robot-cat', name: 'Robot Cat', category: 'pet', visual: '⌘', cost: 85000, description: 'Independent, precise, occasionally affectionate.', effects: { aiSkill: 5, lifestyle: 5 }, rarity: 'RARE' },
  { id: 'chaos-monkey', name: 'Chaos Monkey', category: 'pet', visual: '↯', cost: 100000, description: 'Never a quiet day.', effects: { lifestyle: 10 }, passiveEffect: 'Future special interactions may involve this companion.', rarity: 'RARE' },
  { id: 'index-fund', name: 'Index Fund', category: 'investment', visual: '▥', cost: 100000, description: 'A diversified long-term position.', effects: {}, passiveEffect: 'Stable future Wealth potential; returns are not active yet.', rarity: 'STANDARD' },
  { id: 'tech-investment', name: 'Tech Investment', category: 'investment', visual: '⌁', cost: 150000, description: 'Invest in the next wave.', effects: {}, passiveEffect: 'High-growth potential; returns are not active yet.', rarity: 'RARE' },
  { id: 'degen-investment', name: 'Degen Investment', category: 'investment', visual: '⇋', cost: 100000, description: 'High risk, high ambition.', effects: {}, passiveEffect: 'High-risk potential; returns are not active yet.', rarity: 'ELITE' },
  { id: 'starter-condo', name: 'Starter Condo', category: 'property', visual: '▤', cost: 100000, description: 'Your first place on the map.', effects: { lifestyle: 5 }, rarity: 'STANDARD' },
  { id: 'luxury-apartment', name: 'Luxury Apartment', category: 'property', visual: '▥', cost: 250000, description: 'A view worth coming home to.', effects: { lifestyle: 10, influence: 5 }, rarity: 'RARE' },
  { id: 'beach-house', name: 'Beach House', category: 'property', visual: '◒', cost: 400000, description: 'A permanent escape route.', effects: { lifestyle: 15, fame: 10 }, rarity: 'ELITE' },
  { id: 'mansion', name: 'Mansion', category: 'property', visual: '◇', cost: 500000, description: 'An address everyone knows.', effects: { influence: 20, lifestyle: 15 }, rarity: 'ELITE' },
  ...additionalAssets,
  ...expansionAssets,
];

export const assets: readonly AssetDefinition[] = assetRecords.map((asset) => ({
  ...asset,
  effects: rebalanceAssetAttributeEffects(asset.effects),
  visualVariants: {
    1: `${asset.id}:level-1`,
    2: `${asset.id}:level-2`,
    3: `${asset.id}:level-3`,
    4: `${asset.id}:level-4`,
  },
}));

export const getAsset = (id: string): AssetDefinition | undefined => assets.find(asset => asset.id === id);
export const assetOptions = (category: AssetCategory): readonly AssetDefinition[] => assets.filter(asset => asset.category === category);

function rebalanceAssetAttributeEffects(effects: AssetDefinition['effects']): AssetDefinition['effects'] {
  const balanced = { ...effects };
  for (const stat of ASSET_ATTRIBUTE_STATS) {
    const value = balanced[stat];
    if (value === undefined || value === 0) continue;
    const scaled = Math.max(1, Math.round(Math.abs(value) / 5));
    balanced[stat] = Math.sign(value) * Math.min(MAX_BASE_ASSET_ATTRIBUTE_BONUS, scaled);
  }
  return balanced;
}

function allocateAssetAttributePoints(
  weights: AssetAttributeContributions,
  points: number,
): AssetAttributeContributions {
  const totalWeight = ASSET_ATTRIBUTE_STATS.reduce((sum, stat) => sum + weights[stat], 0);
  const allocated: AssetAttributeContributions = { aiSkill: 0, fame: 0, lifestyle: 0, influence: 0 };
  if (totalWeight <= 0 || points <= 0) return allocated;

  const remainders = ASSET_ATTRIBUTE_STATS.map((stat, order) => {
    const exact = points * weights[stat] / totalWeight;
    allocated[stat] = Math.floor(exact);
    return { stat, order, remainder: exact - allocated[stat] };
  });
  let left = points - ASSET_ATTRIBUTE_STATS.reduce((sum, stat) => sum + allocated[stat], 0);
  remainders.sort((a, b) => b.remainder - a.remainder || a.order - b.order);
  for (let index = 0; left > 0; index = (index + 1) % remainders.length) {
    allocated[remainders[index].stat] += 1;
    left -= 1;
  }
  return allocated;
}

export function calculateAssetAttributeAward(
  assetId: string,
  level: AssetLevel = 1,
): AssetAttributeContributions {
  const asset = getAsset(assetId);
  const weights: AssetAttributeContributions = { aiSkill: 0, fame: 0, lifestyle: 0, influence: 0 };
  if (!asset) return weights;

  for (const stat of ASSET_ATTRIBUTE_STATS) {
    weights[stat] = Math.max(0, asset.effects[stat] ?? 0);
  }
  const totalWeight = ASSET_ATTRIBUTE_STATS.reduce((sum, stat) => sum + weights[stat], 0);
  const points: AssetAttributeContributions = { aiSkill: 0, fame: 0, lifestyle: 0, influence: 0 };
  if (totalWeight <= 0) return points;

  for (let currentLevel = 1; currentLevel <= level; currentLevel += 1) {
    const alreadyAwarded = ASSET_ATTRIBUTE_STATS.reduce((sum, stat) => sum + points[stat], 0);
    const increment = Math.min(totalWeight, MAX_ASSET_ATTRIBUTE_POINTS_PER_ASSET - alreadyAwarded);
    if (increment <= 0) break;
    const allocation = allocateAssetAttributePoints(weights, increment);
    for (const stat of ASSET_ATTRIBUTE_STATS) points[stat] += allocation[stat];
  }
  return points;
}

function calculateLegacyAssetAttributeContributions(
  equipment: Record<AssetSlot, string | null>,
  assetLevels: Record<string, AssetLevel>,
): AssetAttributeContributions {
  const totals: AssetAttributeContributions = { aiSkill: 0, fame: 0, lifestyle: 0, influence: 0 };
  const equippedIds = new Set(Object.values(equipment).filter((assetId): assetId is string => Boolean(assetId)));
  for (const assetId of equippedIds) {
    const asset = assetRecords.find((item) => item.id === assetId);
    if (!asset) continue;
    const level = assetLevels[assetId] ?? 1;
    for (const stat of ASSET_ATTRIBUTE_STATS) {
      totals[stat] += (asset.effects[stat] ?? 0) * level;
    }
  }
  return totals;
}

export function getAssetAttributeAwardTransition(
  player: {
    equipment: Record<AssetSlot, string | null>;
    assetLevels: Record<string, AssetLevel>;
    assetAttributeContributions?: AssetAttributeContributions;
  },
  nextEquipment: Record<AssetSlot, string | null> = player.equipment,
  nextAssetLevels: Record<string, AssetLevel> = player.assetLevels,
): { contributions: AssetAttributeContributions; deltas: AssetAttributeContributions } {
  // Older active-game snapshots already include their original equipped-asset
  // effects in player stats. Keep those points, then add only new acquisitions
  // and level increases; asset removal never subtracts an award.
  const previous = player.assetAttributeContributions
    ?? calculateLegacyAssetAttributeContributions(player.equipment, player.assetLevels);
  const contributions = { ...previous };
  const previouslyEquipped = new Set(Object.values(player.equipment).filter((assetId): assetId is string => Boolean(assetId)));
  const nowEquipped = new Set(Object.values(nextEquipment).filter((assetId): assetId is string => Boolean(assetId)));

  for (const assetId of nowEquipped) {
    const previousLevel = previouslyEquipped.has(assetId) ? player.assetLevels[assetId] ?? 1 : null;
    const nextLevel = nextAssetLevels[assetId] ?? 1;
    if (previousLevel !== null && nextLevel <= previousLevel) continue;
    const previousAward = previousLevel !== null ? calculateAssetAttributeAward(assetId, previousLevel) : null;
    const nextAward = calculateAssetAttributeAward(assetId, nextLevel);
    for (const stat of ASSET_ATTRIBUTE_STATS) {
      contributions[stat] += Math.max(0, nextAward[stat] - (previousAward?.[stat] ?? 0));
    }
  }

  return {
    contributions,
    deltas: {
      aiSkill: contributions.aiSkill - previous.aiSkill,
      fame: contributions.fame - previous.fame,
      lifestyle: contributions.lifestyle - previous.lifestyle,
      influence: contributions.influence - previous.influence,
    },
  };
}