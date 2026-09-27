import { assets, type AssetCategory } from './assets';

const artworkGroups: Record<AssetCategory, { directory: string; prefix: string }> = {
  car: { directory: 'cars', prefix: 'CAR' },
  lifestyle: { directory: 'lifestyles', prefix: 'LIFESTYLE' },
  investment: { directory: 'investments', prefix: 'INVESTMENT' },
  pet: { directory: 'pets', prefix: 'PET' },
  property: { directory: 'properties', prefix: 'PROPERTY' },
};

const categoryIndexes: Record<AssetCategory, number> = {
  car: 0,
  lifestyle: 0,
  investment: 0,
  pet: 0,
  property: 0,
};

const artworkByAssetId = Object.fromEntries(
  assets.map((asset) => {
    const group = artworkGroups[asset.category];
    const index = ++categoryIndexes[asset.category];
    const filename = `${group.prefix}_${String(index).padStart(2, '0')}.webp`;
    return [asset.id, `milestone-assets/${group.directory}/${filename}`];
  }),
) as Record<string, string>;

export function getAssetArtworkFilePath(assetId: string): string | undefined {
  return artworkByAssetId[assetId];
}

export function getAssetArtworkUrl(assetId: string): string | undefined {
  const filePath = getAssetArtworkFilePath(assetId);
  return filePath ? `${import.meta.env.BASE_URL}${filePath}` : undefined;
}

export function getCategoryArtworkUrl(category: AssetCategory): string | undefined {
  const firstAsset = assets.find((asset) => asset.category === category);
  return firstAsset ? getAssetArtworkUrl(firstAsset.id) : undefined;
}