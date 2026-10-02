import type { CareerStat } from './careers';
import { additionalAssets } from './assets-extra';

export type AssetCategory = 'car' | 'lifestyle' | 'pet' | 'investment' | 'property';
export type AssetSlot = 'car' | 'lifestyle' | 'companion' | 'property';
export type AssetStat = CareerStat | 'wealth';
export type AssetLevel = 1 | 2 | 3 | 4;
export const MAX_ASSET_LEVEL: AssetLevel = 4;

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
];

export const assets: readonly AssetDefinition[] = assetRecords.map((asset) => ({
  ...asset,
  visualVariants: {
    1: `${asset.id}:level-1`,
    2: `${asset.id}:level-2`,
    3: `${asset.id}:level-3`,
    4: `${asset.id}:level-4`,
  },
}));

export const getAsset = (id: string): AssetDefinition | undefined => assets.find(asset => asset.id === id);
export const assetOptions = (category: AssetCategory): readonly AssetDefinition[] => assets.filter(asset => asset.category === category);