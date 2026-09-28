import assert from 'node:assert/strict';
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
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true },
  appType: 'custom',
});

try {
  const { visualAssets } = await vite.ssrLoadModule('/src/game/asset-manifest.ts');
  const { careers } = await vite.ssrLoadModule('/src/game/careers.ts');
  const manifestIds = visualAssets.map((asset) => asset.id);
  assert.equal(new Set(manifestIds).size, manifestIds.length, 'visual asset IDs are unique');

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

  console.log(`PASS: ${allSymbols.length} unique SVG symbols, ${careerItems.length} mapped careers, and ${visualAssets.length} valid manifest paths.`);
} finally {
  await vite.close();
}