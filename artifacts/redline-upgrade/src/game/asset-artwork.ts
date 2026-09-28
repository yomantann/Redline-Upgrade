import { assets, type AssetCategory, type AssetLevel } from './assets';
import { getPublicAssetUrl } from '@/lib/public-asset-url';

const artworkGroups: Record<AssetCategory, { directory: string; prefix: string }> = {
  car: { directory: 'cars', prefix: 'CAR' },
  lifestyle: { directory: 'lifestyles', prefix: 'LIFESTYLE' },
  investment: { directory: 'investments', prefix: 'INVESTMENT' },
  pet: { directory: 'pets', prefix: 'PET' },
  property: { directory: 'properties', prefix: 'PROPERTY' },
};

// Keep commissioned Phase 1-10 Level 1 WebPs stable. New assets use their own
// Phase 14 WebP files rather than shifting the ordinal legacy mapping.
const legacyArtworkIds: Record<AssetCategory, readonly string[]> = {
  car: ['budget-racer', 'flex-car', 'supercar', 'electric-hypercar', 'street-tuner', 'electric-coupe', 'executive-sedan', 'track-special', 'grand-tourer', 'prototype-one'],
  lifestyle: ['luxury-travel', 'vip-life', 'low-key-life', 'creator-lifestyle', 'studio-life', 'city-weekends', 'wellness-club', 'art-collector', 'private-retreat', 'global-elite'],
  pet: ['cyber-dog', 'golden-retriever', 'robot-cat', 'chaos-monkey', 'rescue-pup', 'street-cat', 'drone-bird', 'fox-companion', 'holo-hound', 'legendary-companion'],
  investment: ['index-fund', 'tech-investment', 'degen-investment', 'savings-bond', 'community-fund', 'green-energy', 'venture-seed', 'creator-fund', 'deep-tech-fund', 'moonshot-portfolio'],
  property: ['starter-condo', 'luxury-apartment', 'beach-house', 'mansion', 'shared-loft', 'townhouse', 'smart-home', 'skyline-penthouse', 'country-estate', 'landmark-residence'],
};

const artworkByAssetId = Object.fromEntries(assets.map((asset) => {
  const legacyIndex = legacyArtworkIds[asset.category].indexOf(asset.id);
  if (legacyIndex >= 0) {
    const group = artworkGroups[asset.category];
    return [asset.id, `milestone-assets/${group.directory}/${group.prefix}_${String(legacyIndex + 1).padStart(2, '0')}.webp`];
  }
  const phase11Directory = asset.category === 'car' ? 'cars' : asset.category === 'property' ? 'properties' : `${asset.category}s`;
  return [asset.id, `milestone-assets/${phase11Directory}/phase14/${asset.id}-level-1.webp`];
})) as Record<string, string>;

export function getAssetArtworkFilePath(assetId: string): string | undefined {
  return artworkByAssetId[assetId];
}

export function getAssetArtworkFilePathForLevel(assetId: string, level: AssetLevel = 1): string | undefined {
  const asset = assets.find(candidate => candidate.id === assetId);
  const basePath = getAssetArtworkFilePath(assetId);
  if (!asset || !basePath) return undefined;
  if (level === 1) return basePath;
  const directory = artworkGroups[asset.category].directory;
  return `milestone-assets/${directory}/phase14/${asset.id}-level-${level}.webp`;
}

export function getAssetArtworkUrl(assetId: string, level: AssetLevel = 1): string | undefined {
  const filePath = getAssetArtworkFilePathForLevel(assetId, level);
  return filePath ? getPublicAssetUrl(filePath) : undefined;
}

export function getCategoryArtworkUrl(category: AssetCategory): string | undefined {
  const firstAsset = assets.find((asset) => asset.category === category);
  return firstAsset ? getAssetArtworkUrl(firstAsset.id) : undefined;
}