import catalog from './asset-expansion.json';
import type { AssetCategory, AssetDefinition, AssetStat } from './assets';

// IDs are explicit and permanent. Adding names or changing presentation must not
// change identifiers referenced by saved matches or lifetime collection records.
export const expansionAssets: readonly AssetDefinition[] = Object.entries(catalog).flatMap(([category, rows]) =>
  rows.map(([id, name, cost, description], index) => {
    const weights: Record<AssetCategory, readonly [AssetStat, AssetStat]> = {
      car: ['fame', 'aiSkill'],
      lifestyle: ['lifestyle', 'influence'],
      pet: ['lifestyle', 'fame'],
      investment: ['aiSkill', 'influence'],
      property: ['lifestyle', 'influence'],
    };
    const typedCategory = category as AssetCategory;
    const [primary, secondary] = weights[typedCategory];
    const price = Number(cost);
    return {
      id: String(id),
      name: String(name),
      category: typedCategory,
      visual: { car: '↗', lifestyle: '✦', pet: '⬡', investment: '▥', property: '▤' }[typedCategory],
      cost: price,
      description: String(description),
      // Same raw weight units as the original catalog. assets.ts applies the
      // shared balancing and cumulative level-award cap, not a separate system.
      effects: { [primary]: index < 6 ? 5 : index < 14 ? 10 : 15, [secondary]: index % 3 === 0 ? 5 : index < 10 ? 0 : 5 },
      rarity: price < 130000 ? 'STANDARD' as const : price < 300000 ? 'RARE' as const : 'ELITE' as const,
    };
  }),
);

export const expansionAssetIds = new Set(expansionAssets.map(asset => asset.id));
