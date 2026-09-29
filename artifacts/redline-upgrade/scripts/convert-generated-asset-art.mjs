import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = [
  readFileSync(path.join(root, 'src/game/assets.ts'), 'utf8'),
  readFileSync(path.join(root, 'src/game/assets-extra.ts'), 'utf8'),
  readFileSync(path.join(root, 'src/game/assets-phase11.ts'), 'utf8'),
].join('\n');
const protectedLevelOneIds = {
  car: ['budget-racer', 'flex-car', 'supercar', 'electric-hypercar', 'street-tuner', 'electric-coupe', 'executive-sedan', 'track-special', 'grand-tourer', 'prototype-one'],
  lifestyle: ['luxury-travel', 'vip-life', 'low-key-life', 'creator-lifestyle', 'studio-life', 'city-weekends', 'wellness-club', 'art-collector', 'private-retreat', 'global-elite'],
  pet: ['cyber-dog', 'golden-retriever', 'robot-cat', 'chaos-monkey', 'rescue-pup', 'street-cat', 'drone-bird', 'fox-companion', 'holo-hound', 'legendary-companion'],
  investment: ['index-fund', 'tech-investment', 'degen-investment', 'savings-bond', 'community-fund', 'green-energy', 'venture-seed', 'creator-fund', 'deep-tech-fund', 'moonshot-portfolio'],
  property: ['starter-condo', 'luxury-apartment', 'beach-house', 'mansion', 'shared-loft', 'townhouse', 'smart-home', 'skyline-penthouse', 'country-estate', 'landmark-residence'],
};
const folders = {
  car: 'cars',
  lifestyle: 'lifestyles',
  pet: 'pets',
  investment: 'investments',
  property: 'properties',
};
const generatedRoot = path.join(root, 'attached_assets/generated_images/redline-upgrade');
const publicRoot = path.join(root, 'public/milestone-assets');
const assets = [...source.matchAll(/id:\s*'([^']+)'[^}]*?category:\s*'(car|lifestyle|pet|investment|property)'/g)]
  .map((match) => ({ id: match[1], category: match[2] }))
  .filter((asset, index, all) => all.findIndex((candidate) => candidate.id === asset.id) === index);

assert.equal(assets.length, 100, 'expected exactly 100 catalog assets');
assert(Object.values(protectedLevelOneIds).every((ids) => ids.length === 10), 'each category must keep its ten approved Level 1 images');

const conversions = [];
for (const asset of assets) {
  for (const level of [1, 2, 3, 4]) {
    if (level === 1 && protectedLevelOneIds[asset.category].includes(asset.id)) continue;
    const input = path.join(generatedRoot, asset.category, `${asset.id}-level-${level}.png`);
    const outputDirectory = path.join(publicRoot, folders[asset.category], 'phase14');
    const output = path.join(outputDirectory, `${asset.id}-level-${level}.webp`);
    assert(existsSync(input), `generated source image exists: ${input}`);
    conversions.push({ asset, level, input, output, outputDirectory });
  }
}

assert.equal(conversions.length, 350, 'expected 50 new Level 1 images and 300 upgraded depictions');

const sourceImageCount = Object.keys(folders).reduce((total, category) => {
  const directory = path.join(generatedRoot, category);
  const files = readdirSync(directory).filter((file) => /^.+-level-[1-4]\.png$/.test(file));
  return total + files.length;
}, 0);
assert.equal(sourceImageCount, conversions.length, 'source folders contain only the expected generated depictions');

for (const { input, output, outputDirectory, asset, level } of conversions) {
  mkdirSync(outputDirectory, { recursive: true });
  execFileSync('magick', [
    input,
    '-fuzz', '12%',
    '-fill', 'none',
    '-draw', 'color 0,0 floodfill',
    '-resize', '640x640!',
    '-strip',
    '-quality', '90',
    output,
  ], { stdio: 'inherit' });
  console.log(`${asset.id} level ${level} -> ${path.relative(root, output)}`);
}

console.log(`Converted ${conversions.length} independent WebP depictions. The 50 approved Level 1 files were skipped.`);