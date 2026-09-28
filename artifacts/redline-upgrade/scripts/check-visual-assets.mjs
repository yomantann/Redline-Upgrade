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
  const { getAssetArtworkFilePath, getAssetArtworkFilePathForLevel } = await vite.ssrLoadModule('/src/game/asset-artwork.ts');
  const { careers } = await vite.ssrLoadModule('/src/game/careers.ts');
  const manifestIds = visualAssets.map((asset) => asset.id);
  assert.equal(new Set(manifestIds).size, manifestIds.length, 'visual asset IDs are unique');
  assert.equal(assets.length, 100, 'milestone catalog has exactly 100 assets');
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
    assert.match(artworkPath, /\.(?:svg|webp|png|jpe?g)$/i, `${asset.id} points to an image file`);
    assert(!/\/(?:generic|placeholders?)\//i.test(artworkPath), `${asset.id} does not use a generic placeholder path`);
    const artworkFile = path.join(publicRoot, artworkPath.replace(/^\/+/, ''));
    assert(existsSync(artworkFile), `${asset.id} artwork file exists: ${artworkPath}`);
    artworkHashes.push(createHash('sha256').update(readFileSync(artworkFile)).digest('hex'));
    for (const level of [1, 2, 3, 4]) {
      assert.equal(asset.visualVariants?.[level], `${asset.id}:level-${level}`, `${asset.id} has an asset-specific level ${level} visual reference`);
      const levelPath = getAssetArtworkFilePathForLevel(asset.id, level);
      assert(levelPath, `${asset.id} level ${level} has an artwork path`);
      const levelFile = path.join(publicRoot, levelPath);
      assert(existsSync(levelFile), `${asset.id} level ${level} artwork exists: ${levelPath}`);
      const levelContents = readFileSync(levelFile);
      if (level > 1) {
        const embeddedImage = levelContents.toString('utf8').match(/<image[^>]+href="([^"]+)"/)?.[1];
        assert(embeddedImage, `${asset.id} level ${level} includes its underlying asset artwork`);
        assert(existsSync(path.resolve(path.dirname(levelFile), embeddedImage)), `${asset.id} level ${level} underlying artwork resolves: ${embeddedImage}`);
      }
      levelHashes.push({ assetId: asset.id, level, hash: createHash('sha256').update(levelContents).digest('hex') });
    }
  }
  assert.equal(categoryGroups.size, 5, 'the catalog has all five milestone categories');
  for (const [category, categoryAssets] of categoryGroups) {
    assert.equal(categoryAssets.length, 20, `${category} contains exactly 20 assets`);
  }
  assert.equal(new Set(artworkHashes).size, assets.length, 'every asset artwork file has distinct image content');
  assert.equal(levelHashes.length, 400, 'all 100 assets have four artwork files');
  assert.equal(new Set(levelHashes.map(entry => entry.hash)).size, 400, 'every asset and level has unique image content');
  for (const asset of assets) {
    const hashes = levelHashes.filter(entry => entry.assetId === asset.id).map(entry => entry.hash);
    assert.equal(new Set(hashes).size, 4, `${asset.id} changes artwork at every level`);
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
  const phase11Assets = assets.filter((asset) => asset.id.includes('-') && ![
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
    assert(pathName?.endsWith('.svg'), `${asset.id} uses an SVG Phase 11 illustration`);
    assert(pathName?.includes(`/phase11/${asset.id}.svg`), `${asset.id} has an ID-specific Phase 11 path`);
  }

  for (const asset of visualAssets) {
    assert(existsSync(path.resolve(projectRoot, asset.filePath)), `asset path exists: ${asset.filePath}`);
  }

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

  console.log(`PASS: ${allSymbols.length} unique SVG symbols, ${careerItems.length} mapped careers, ${assets.length} distinct Level 1 artworks (20 per category), 400 unique Level 1–4 artworks, five asset display surfaces, and ${visualAssets.length} valid manifest paths.`);
} finally {
  await vite.close();
}