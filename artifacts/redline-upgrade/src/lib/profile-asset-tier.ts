import type { AssetDefinition } from '@/game/assets';

export type ProfileAssetTier = 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export const profileAssetTierOrder: readonly ProfileAssetTier[] = ['UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];
export const profileAssetTierRank: Record<ProfileAssetTier, number> = {
  UNCOMMON: 0,
  RARE: 1,
  EPIC: 2,
  LEGENDARY: 3,
};

const sourceRarityFloor: Record<AssetDefinition['rarity'], number> = {
  STANDARD: 0,
  RARE: 1,
  ELITE: 2,
};

// Earlier standard-board asset milestones leave more turns to realize an asset's value.
const milestoneTimingMultiplier: Record<AssetDefinition['category'], number> = {
  car: 1.1,
  lifestyle: 1.06,
  pet: 1.03,
  investment: 1.03,
  property: 1,
};

export function getProfileAssetTier(definition: AssetDefinition): ProfileAssetTier {
  const effectiveCost = definition.cost * milestoneTimingMultiplier[definition.category];
  const priceTier = effectiveCost >= 350_000 ? 3 : effectiveCost >= 200_000 ? 2 : effectiveCost >= 100_000 ? 1 : 0;
  return profileAssetTierOrder[Math.max(sourceRarityFloor[definition.rarity], priceTier)]!;
}
