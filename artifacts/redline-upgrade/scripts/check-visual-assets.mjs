import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const publicRoot = path.join(projectRoot, 'public');
const catalogPath = path.join(publicRoot, 'visual-library/assets.json');
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const vite = await createServer({
  root: projectRoot,
  configFile: false,
  resolve: { alias: { '@': path.join(projectRoot, 'src') } },
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true },
  appType: 'custom',
});

try {
  const { visualAssets } = await vite.ssrLoadModule('/src/game/asset-manifest.ts');
  const { assets } = await vite.ssrLoadModule('/src/game/assets.ts');
  const { expansionAssetIds } = await vite.ssrLoadModule('/src/game/assets-expansion.ts');
  const { approvedLevelOneArtworkIds, getAssetArtworkFilePath, getAssetArtworkFilePathForLevel } = await vite.ssrLoadModule('/src/game/asset-artwork.ts');
  const { careers } = await vite.ssrLoadModule('/src/game/careers.ts');
  const { cardExpansion } = await vite.ssrLoadModule('/src/game/cards-expansion.ts');
  const { hauntedCards } = await vite.ssrLoadModule('/src/game/haunted-cards.ts');
  const manifestIds = visualAssets.map((asset) => asset.id);
  assert.equal(new Set(manifestIds).size, manifestIds.length, 'visual asset IDs are unique');
  assert.equal(assets.length, 200, 'milestone catalog has exactly 200 assets');
  const approvedFolders = {
    car: ['cars', 'CAR'],
    lifestyle: ['lifestyles', 'LIFESTYLE'],
    pet: ['pets', 'PET'],
    investment: ['investments', 'INVESTMENT'],
    property: ['properties', 'PROPERTY'],
  };
  const allApprovedLevelOneIds = Object.values(approvedLevelOneArtworkIds).flat();
  assert.equal(allApprovedLevelOneIds.length, 50, 'exactly 10 approved Level 1 images are retained per category');
  assert.equal(new Set(allApprovedLevelOneIds).size, 50, 'approved Level 1 IDs are unique');
  for (const [category, ids] of Object.entries(approvedLevelOneArtworkIds)) {
    assert.equal(ids.length, 10, `${category} retains its 10 approved Level 1 artworks`);
    const [directory, prefix] = approvedFolders[category];
    ids.forEach((id, index) => {
      assert.equal(
        getAssetArtworkFilePath(id),
        `milestone-assets/${directory}/${prefix}_${String(index + 1).padStart(2, '0')}.webp`,
        `${id} continues to use its approved original Level 1 WebP`,
      );
    });
  }
  const artworkPaths = assets.map((asset) => getAssetArtworkFilePath(asset.id));
  assert.equal(new Set(artworkPaths).size, artworkPaths.length, 'asset artwork paths are unique');
  const categoryGroups = new Map();
  const artworkHashes = [];
  const levelHashes = [];
  for (const asset of assets) {
    const categoryAssets = categoryGroups.get(asset.category) ?? [];
    categoryAssets.push(asset);
    categoryGroups.set(asset.category, categoryAssets);

    const artworkPath = getAssetArtworkFilePath(asset.id);
    assert(artworkPath, `${asset.id} has an artwork path`);
    const isExpansion = expansionAssetIds.has(asset.id);
    if (isExpansion) {
      assert.equal(artworkPath, `api/asset-art/${asset.id}/1`, `${asset.id} uses its own level 1 storage image`);
    } else {
      assert.match(artworkPath, /\.webp$/i, `${asset.id} points to WebP artwork`);
    }
    assert(!/\/(?:generic|placeholders?)\//i.test(artworkPath), `${asset.id} does not use a generic placeholder path`);
    const artworkFile = isExpansion
      ? path.resolve(projectRoot, '../../attached_assets/generated_images/asset-expansion/webp', `${asset.id}-level-1.webp`)
      : path.join(publicRoot, artworkPath.replace(/^\/+/, ''));
    if (!isExpansion || existsSync(artworkFile)) {
      assert(existsSync(artworkFile), `${asset.id} artwork file exists: ${artworkPath}`);
      artworkHashes.push(createHash('sha256').update(readFileSync(artworkFile)).digest('hex'));
    }
    for (const level of [1, 2, 3, 4]) {
      assert.equal(asset.visualVariants?.[level], `${asset.id}:level-${level}`, `${asset.id} has an asset-specific level ${level} visual reference`);
      const levelPath = getAssetArtworkFilePathForLevel(asset.id, level);
      assert(levelPath, `${asset.id} level ${level} has an artwork path`);
      if (isExpansion) {
        assert.equal(levelPath, `api/asset-art/${asset.id}/${level}`, `${asset.id} level ${level} has its unique storage route`);
        const levelFile = path.resolve(projectRoot, '../../attached_assets/generated_images/asset-expansion/webp', `${asset.id}-level-${level}.webp`);
        if (existsSync(levelFile)) {
          const levelContents = readFileSync(levelFile);
          assert.equal(levelContents.toString('ascii', 0, 4), 'RIFF', `${asset.id} level ${level} has a WebP RIFF header`);
          assert.equal(levelContents.toString('ascii', 8, 12), 'WEBP', `${asset.id} level ${level} has a WebP signature`);
          levelHashes.push({ assetId: asset.id, level, hash: createHash('sha256').update(levelContents).digest('hex') });
        }
      } else {
        const levelFile = path.join(publicRoot, levelPath);
        assert(existsSync(levelFile), `${asset.id} level ${level} artwork exists: ${levelPath}`);
        const levelContents = readFileSync(levelFile);
        assert.match(levelPath, /\.webp$/i, `${asset.id} level ${level} is a rendered WebP`);
        assert.equal(levelContents.toString('ascii', 0, 4), 'RIFF', `${asset.id} level ${level} has a WebP RIFF header`);
        assert.equal(levelContents.toString('ascii', 8, 12), 'WEBP', `${asset.id} level ${level} has a WebP signature`);
        levelHashes.push({ assetId: asset.id, level, hash: createHash('sha256').update(levelContents).digest('hex') });
      }
    }
  }
  assert.equal(categoryGroups.size, 5, 'the catalog has all five milestone categories');
  for (const [category, categoryAssets] of categoryGroups) {
    assert.equal(categoryAssets.length, 40, `${category} contains exactly 40 assets`);
  }
  assert.equal(new Set(artworkHashes).size, artworkHashes.length, 'every available Level 1 asset image has distinct content');
  assert.equal(levelHashes.length, 400 + (existsSync(path.resolve(projectRoot, '../../attached_assets/generated_images/asset-expansion/webp/nightjar-courier-level-1.webp')) ? 400 : 0), 'every local or static asset level image is checked');
  assert.equal(new Set(levelHashes.map(entry => entry.hash)).size, levelHashes.length, 'every checked asset and level has unique image content');
  for (const asset of assets) {
    const hashes = levelHashes.filter(entry => entry.assetId === asset.id).map(entry => entry.hash);
    if (!expansionAssetIds.has(asset.id) || hashes.length > 0) {
      assert.equal(new Set(hashes).size, 4, `${asset.id} changes artwork at every level`);
    }
  }

  for (const file of [
    'components/milestone-choice.tsx',
    'components/player-assets.tsx',
    'components/upgrade-token-controls.tsx',
    'components/finish-line-panel.tsx',
    'components/endgame-presentation.tsx',
  ]) {
    const source = readFileSync(path.join(projectRoot, 'src', file), 'utf8');
    assert.match(source, /AssetArtwork/, `${file} renders asset-specific artwork`);
  }
  const phase11Assets = assets.filter((asset) => !expansionAssetIds.has(asset.id) && asset.id.includes('-') && ![
    'budget-racer', 'flex-car', 'supercar', 'electric-hypercar', 'street-tuner', 'electric-coupe', 'executive-sedan',
    'track-special', 'grand-tourer', 'prototype-one', 'luxury-travel', 'vip-life', 'low-key-life', 'creator-lifestyle',
    'studio-life', 'city-weekends', 'wellness-club', 'art-collector', 'private-retreat', 'global-elite', 'cyber-dog',
    'golden-retriever', 'robot-cat', 'chaos-monkey', 'rescue-pup', 'street-cat', 'drone-bird', 'fox-companion',
    'holo-hound', 'legendary-companion', 'index-fund', 'tech-investment', 'degen-investment', 'savings-bond',
    'community-fund', 'green-energy', 'venture-seed', 'creator-fund', 'deep-tech-fund', 'moonshot-portfolio',
    'starter-condo', 'luxury-apartment', 'beach-house', 'mansion', 'shared-loft', 'townhouse', 'smart-home',
    'skyline-penthouse', 'country-estate', 'landmark-residence',
  ].includes(asset.id));
  assert.equal(phase11Assets.length, 50, 'Phase 11 has exactly 50 new assets');
  for (const asset of phase11Assets) {
    const pathName = getAssetArtworkFilePath(asset.id);
    assert(pathName?.endsWith('.webp'), `${asset.id} uses a WebP Phase 11 illustration`);
    assert(pathName?.includes(`/phase14/${asset.id}-level-1.webp`), `${asset.id} has an ID-specific Level 1 WebP path`);
  }

  for (const asset of visualAssets) {
    if (asset.filePath.startsWith('api/asset-art/')) {
      assert.match(asset.filePath, /^api\/asset-art\/[a-z0-9-]+\/1$/, `asset storage route is valid: ${asset.filePath}`);
    } else if (asset.filePath.startsWith('api/card-art/')) {
      assert.match(asset.filePath, /^api\/card-art\/[a-z0-9-]+$/, `card storage route is valid: ${asset.filePath}`);
    } else {
      assert(existsSync(path.resolve(projectRoot, asset.filePath)), `asset path exists: ${asset.filePath}`);
    }
  }
  const cardAssets = visualAssets.filter((asset) => asset.category === 'cards' && asset.filePath.startsWith('api/card-art/'));
  const expansionCardIds = new Set(cardExpansion.map((card) => card.id));
  const hauntedCardIds = new Set(hauntedCards.map((card) => card.id));
  const expansionCardAssets = cardAssets.filter((asset) => expansionCardIds.has(asset.filePath.replace(/^api\/card-art\//, '')));
  const hauntedCardAssets = cardAssets.filter((asset) => hauntedCardIds.has(asset.filePath.replace(/^api\/card-art\//, '')));
  assert.equal(expansionCardAssets.length, 100, 'all 100 added cards are included in the visual catalog with unique stored artwork');
  assert.equal(new Set(expansionCardAssets.map((asset) => asset.filePath)).size, 100, 'every added card maps to its own image route');
  const cardArtworkRoot = path.resolve(projectRoot, '../../attached_assets/generated_images/card-expansion/webp');
  const cardArtworkHashes = [];
  for (const asset of expansionCardAssets) {
    const cardId = asset.filePath.replace(/^api\/card-art\//, '');
    const artworkFile = path.join(cardArtworkRoot, `${cardId}.webp`);
    assert(existsSync(artworkFile), `${cardId} generated image exists for its stored artwork route`);
    const image = readFileSync(artworkFile);
    assert.equal(image.toString('ascii', 0, 4), 'RIFF', `${cardId} illustration has a WebP RIFF header`);
    assert.equal(image.toString('ascii', 8, 12), 'WEBP', `${cardId} illustration has a WebP signature`);
    cardArtworkHashes.push(createHash('sha256').update(image).digest('hex'));
  }
  assert.equal(new Set(cardArtworkHashes).size, 100, 'all 100 added card images have unique image content');
  assert.equal(hauntedCardAssets.length, 100, 'all 100 Haunted cards have unique stored artwork entries');
  assert.equal(new Set(hauntedCardAssets.map((asset) => asset.filePath)).size, 100, 'every Haunted card maps to its own image route');
  const hauntedArtworkRoot = path.resolve(projectRoot, '../../attached_assets/generated_images/haunted-card-expansion/webp');
  const hauntedArtworkHashes = [];
  for (const asset of hauntedCardAssets) {
    const cardId = asset.filePath.replace(/^api\/card-art\//, '');
    const artworkFile = path.join(hauntedArtworkRoot, `${cardId}.webp`);
    assert(existsSync(artworkFile), `${cardId} generated Haunted illustration exists`);
    const image = readFileSync(artworkFile);
    assert.equal(image.toString('ascii', 0, 4), 'RIFF', `${cardId} Haunted illustration has a WebP RIFF header`);
    assert.equal(image.toString('ascii', 8, 12), 'WEBP', `${cardId} Haunted illustration has a WebP signature`);
    hauntedArtworkHashes.push(createHash('sha256').update(image).digest('hex'));
  }
  assert.equal(new Set(hauntedArtworkHashes).size, 100, 'all Haunted card images have unique image content');

  const allItemIds = [];
  const allSymbols = [];
  for (const collection of catalog.collections) {
    assert(catalog.sprites[collection.sprite], `${collection.id} references a known sprite sheet`);
    const spritePath = path.join(publicRoot, 'visual-library', catalog.sprites[collection.sprite]);
    assert(existsSync(spritePath), `${collection.sprite} sprite exists`);
    const sprite = readFileSync(spritePath, 'utf8');
    assert(collection.items.length > 0, `${collection.id} is not empty`);

    for (const item of collection.items) {
      allItemIds.push(item.id);
      allSymbols.push(item.symbol);
      assert.match(sprite, new RegExp(`<symbol\\s+id="${escapeRegex(item.symbol)}"`), `${item.symbol} is defined in ${collection.sprite}`);
      assert.match(item.accent ?? '', /^#[0-9a-f]{6}$/i, `${item.id} has a six-digit accent color`);
    }
  }

  assert.equal(new Set(allItemIds).size, allItemIds.length, 'catalog item IDs are unique');
  assert.equal(new Set(allSymbols).size, allSymbols.length, 'sprite symbol mappings are unique');

  const careerItems = catalog.collections.find((collection) => collection.id === 'career-insignia').items;
  assert.deepEqual(
    careerItems.map((item) => item.id).sort(),
    careers.map((career) => career.id).sort(),
    'every existing career has exactly one mapped emblem',
  );
  assert.equal(catalog.collections.find((collection) => collection.id === 'deck-motifs').items.length, 6, 'all six decks have an emblem');
  assert.equal(catalog.collections.find((collection) => collection.id === 'milestone-states').items.length, 4, 'all four milestone states have a marker');
  assert.equal(catalog.collections.find((collection) => collection.id === 'endgame-support').items.length, 7, 'all seven endgame support symbols are mapped');

  console.log(`PASS: ${allSymbols.length} unique SVG symbols, ${careerItems.length} mapped careers, ${assets.length} assets (40 per category), ${levelHashes.length} unique WebP level images checked, five asset display surfaces, and ${visualAssets.length} valid manifest paths.`);
} finally {
  await vite.close();
}