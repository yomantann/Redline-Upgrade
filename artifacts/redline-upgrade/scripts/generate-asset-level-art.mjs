import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = [
  readFileSync(path.join(root, 'src/game/assets.ts'), 'utf8'),
  readFileSync(path.join(root, 'src/game/assets-extra.ts'), 'utf8'),
  readFileSync(path.join(root, 'src/game/assets-phase11.ts'), 'utf8'),
].join('\n');
const legacyByCategory = {
  car: ['budget-racer', 'flex-car', 'supercar', 'electric-hypercar', 'street-tuner', 'electric-coupe', 'executive-sedan', 'track-special', 'grand-tourer', 'prototype-one'],
  lifestyle: ['luxury-travel', 'vip-life', 'low-key-life', 'creator-lifestyle', 'studio-life', 'city-weekends', 'wellness-club', 'art-collector', 'private-retreat', 'global-elite'],
  pet: ['cyber-dog', 'golden-retriever', 'robot-cat', 'chaos-monkey', 'rescue-pup', 'street-cat', 'drone-bird', 'fox-companion', 'holo-hound', 'legendary-companion'],
  investment: ['index-fund', 'tech-investment', 'degen-investment', 'savings-bond', 'community-fund', 'green-energy', 'venture-seed', 'creator-fund', 'deep-tech-fund', 'moonshot-portfolio'],
  property: ['starter-condo', 'luxury-apartment', 'beach-house', 'mansion', 'shared-loft', 'townhouse', 'smart-home', 'skyline-penthouse', 'country-estate', 'landmark-residence'],
};
const groups = {
  car: ['cars', 'CAR'], lifestyle: ['lifestyles', 'LIFESTYLE'], pet: ['pets', 'PET'],
  investment: ['investments', 'INVESTMENT'], property: ['properties', 'PROPERTY'],
};
const assets = [...source.matchAll(/id:\s*'([^']+)'[^}]*?category:\s*'(car|lifestyle|pet|investment|property)'/g)]
  .map(match => ({ id: match[1], category: match[2] }))
  .filter((asset, index, all) => all.findIndex(candidate => candidate.id === asset.id) === index);
const hash = value => [...value].reduce((total, char) => (total * 33 + char.charCodeAt(0)) >>> 0, 5381);
const palettes = ['#d4e981', '#e9c477', '#88c6c2', '#a8df8d', '#f5a67e', '#83c5e8'];

function signatureFor(asset, level, seed, accent, secondary) {
  const shift = (seed % 18) - 9;
  switch (asset.category) {
    case 'car':
      return [
        `<path d="M470 ${150 + shift}h92l22 15h-98zM500 ${147 + shift}v-13m55 13v-13" />`,
        `<path d="M91 486q205 34 456 1" stroke-width="9" opacity=".78"/>`,
        `<circle cx="${376 + shift}" cy="420" r="34"/><circle cx="${584 - shift}" cy="342" r="34"/>`,
        ...(level >= 3 ? [`<path d="M120 465q172 23 376 0" stroke="${secondary}" stroke-width="13" opacity=".7"/>`, `<path d="M285 345h151m-126 12h98" stroke="${secondary}" stroke-width="7" opacity=".85"/>`] : []),
        ...(level >= 4 ? [`<circle cx="${376 + shift}" cy="420" r="20" stroke="${secondary}" stroke-width="6"/>`, `<circle cx="${584 - shift}" cy="342" r="20" stroke="${secondary}" stroke-width="6"/>`, `<path d="M252 134h108l-8-13h-92zM77 468l-32 16 24 12 36-11" stroke="${secondary}" stroke-width="8"/>`] : []),
      ].join('');
    case 'lifestyle': {
      const id = asset.id;
      if (/travel|retreat|global|elite|luxury/.test(id)) {
        return [
          `<path d="M136 ${145 + shift}l34-18 35 18v47l-35 18-34-18zM170 ${127 + shift}v83m-34-42h69" stroke-width="7"/>`,
          `<path d="M457 118a62 62 0 1 1-1 0m-42 0h84m-42-58c-28 29-28 89 0 120m0-120c28 29 28 89 0 120" stroke="${secondary}" stroke-width="5" opacity=".86"/>`,
          ...(level >= 3 ? [`<path d="M170 126v-35m-15 15h30M454 224q28 22 58 0" stroke-width="7"/>`, `<circle cx="516" cy="250" r="22" stroke="${secondary}" stroke-width="7"/>`] : []),
          ...(level >= 4 ? [`<path d="M102 175q68-74 136 0M470 253l28-28 28 28-28 28z" stroke-width="7"/>`, `<path d="M170 87v-18m-12 10h24" stroke="${secondary}" stroke-width="7"/>`] : []),
        ].join('');
      }
      if (/creator|studio|art/.test(id)) {
        return [
          `<rect x="${450 + shift}" y="120" width="78" height="58" rx="12" stroke-width="7"/><circle cx="${489 + shift}" cy="149" r="18" stroke="${secondary}" stroke-width="7"/>`,
          `<path d="M452 210h96m-78 0 30-28 30 28m-30-28v-25" stroke-width="7"/>`,
          ...(level >= 3 ? [`<circle cx="516" cy="250" r="40" stroke="${secondary}" stroke-width="7"/><path d="M516 193v-20m0 154v-20m-57-57h-20m154 0h-20" stroke-width="7"/>`] : []),
          ...(level >= 4 ? [`<path d="M430 98l18-24 18 24m70 2 18-24 18 24M458 295l20-21 20 21 20-21 20 21" stroke="${secondary}" stroke-width="7"/>`] : []),
        ].join('');
      }
      if (/wellness|low-key|city/.test(id)) {
        return [
          `<path d="M496 189c-54-12-55-68 0-84 55 16 54 72 0 84zM496 181v-66" stroke-width="7"/>`,
          `<circle cx="496" cy="222" r="24" stroke="${secondary}" stroke-width="7"/><path d="M460 222h72m-36-36v72" stroke-width="5"/>`,
          ...(level >= 3 ? [`<path d="M438 284q58-52 116 0m-102 19q44-39 88 0" stroke-width="7"/>`, `<circle cx="496" cy="284" r="8" fill="${secondary}" stroke="none"/>`] : []),
          ...(level >= 4 ? [`<path d="M496 96V64m-16 16h32M446 132l-20-20m120 20 20-20" stroke="${secondary}" stroke-width="7"/>`, `<circle cx="496" cy="80" r="54" stroke-width="5" opacity=".72"/>`] : []),
        ].join('');
      }
      return [
        `<path d="M486 126l30-28 30 28-30 30zM516 158v65m-30-32h60" stroke-width="7"/>`,
        `<circle cx="516" cy="254" r="32" stroke="${secondary}" stroke-width="7"/>`,
        ...(level >= 3 ? [`<path d="M447 278q69-61 138 0M460 296q56-47 112 0" stroke-width="7"/>`, `<path d="M516 212v84m-42-42h84" stroke="${secondary}" stroke-width="5"/>`] : []),
        ...(level >= 4 ? [`<path d="M516 91v-20m-10 10h20M454 123l-15-15m124 15 15-15" stroke-width="7"/>`, `<circle cx="516" cy="254" r="49" stroke="${secondary}" stroke-width="5"/>`] : []),
      ].join('');
    }
    case 'pet':
      return [
        `<path d="M137 ${315 + shift}q74 28 152 0l7 21q-83 39-166 0z" stroke-width="9"/>`,
        `<path d="M208 ${342 + shift}l15 18-15 18-15-18z" fill="${secondary}" stroke-width="4"/>`,
        ...(level >= 3 ? [`<path d="M147 281l22-22 24 16-3 31-31 8zM303 279l25-22 25 19-3 32-32 8z" stroke="${secondary}" stroke-width="7"/>`, `<circle cx="224" cy="360" r="7" fill="${accent}" stroke="none"/>`] : []),
        ...(level >= 4 ? [`<path d="M120 165a112 112 0 0 1 218 0" stroke="${secondary}" stroke-width="8"/>`, `<circle cx="229" cy="83" r="10" fill="${accent}" stroke="none"/>`, `<path d="M189 98l40-26 40 26" stroke-width="7"/>`] : []),
      ].join('');
    case 'investment':
      return [
        `<circle cx="${520 + shift}" cy="151" r="35" fill="${accent}" fill-opacity=".22" stroke-width="7"/><path d="M${505 + shift} 151h30m-15-15v30" stroke="${secondary}" stroke-width="6"/>`,
        `<path d="M454 230l30-30 26 15 44-53m-21 0h21v21" stroke="${secondary}" stroke-width="8"/>`,
        ...(level >= 3 ? [`<circle cx="454" cy="230" r="9" fill="${accent}" stroke="none"/><circle cx="484" cy="200" r="9" fill="${accent}" stroke="none"/><circle cx="510" cy="215" r="9" fill="${accent}" stroke="none"/><circle cx="554" cy="162" r="9" fill="${accent}" stroke="none"/>`, `<path d="M489 305h74v60h-74zM502 321h48m-48 16h35m-35 16h24" stroke-width="5"/>`] : []),
        ...(level >= 4 ? [`<circle cx="520" cy="151" r="51" stroke="${secondary}" stroke-width="5"/>`, `<path d="M520 77v-18m-74 92h-18m184 0h-18m-126-53-14-14m132 132-14-14" stroke-width="7"/>`, `<path d="M485 380h95" stroke="${secondary}" stroke-width="7"/>`] : []),
      ].join('');
    case 'property':
      return [
        `<path d="M264 ${91 + shift}h136v13H264z" stroke-width="5"/>`,
        `<path d="M292 93v9m34-9v9m34-9v9m34-9v9" stroke="${secondary}" stroke-width="4"/>`,
        ...(level >= 3 ? [`<path d="M220 198h200m-188 10v82m176-82v82M252 290h136" stroke="${secondary}" stroke-width="7"/>`, `<path d="M241 182l18-18 18 18m88 0 18-18 18 18" stroke-width="6"/>`] : []),
        ...(level >= 4 ? [`<path d="M230 160h208v155H230zM230 214h208M283 160v155m103-155v155" stroke="${secondary}" stroke-width="5" opacity=".82"/>`, `<circle cx="333" cy="140" r="72" stroke-width="6" opacity=".7"/>`, `<path d="M333 68V45m-12 12h24" stroke="${accent}" stroke-width="7"/>`] : []),
      ].join('');
    default:
      return '';
  }
}

for (const asset of assets) {
  const [directory, prefix] = groups[asset.category];
  const ordinal = legacyByCategory[asset.category].indexOf(asset.id);
  const base = ordinal >= 0 ? `../${prefix}_${String(ordinal + 1).padStart(2, '0')}.webp` : `../phase11/${asset.id}.svg`;
  const seed = hash(asset.id);
  const accent = palettes[seed % palettes.length];
  const secondary = palettes[(seed >>> 8) % palettes.length];
  for (const level of [2, 3, 4]) {
    const dir = path.join(root, 'public/milestone-assets', directory, 'phase14');
    mkdirSync(dir, { recursive: true });
    const details = signatureFor(asset, level, seed, accent, secondary);
    const cornerFrame = level >= 3
      ? `<path d="M34 124V34h90m402 0h90v90M34 516v90h90m402 0h90v-90" fill="none" stroke="${accent}" stroke-width="${level === 4 ? 8 : 5}" stroke-linecap="round" opacity=".72"/>`
      : '';
    const halo = `<circle cx="${480 + (seed % 48)}" cy="${110 + ((seed >>> 5) % 72)}" r="${72 + level * 8}" fill="${accent}" opacity=".08"/>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><defs><filter id="asset-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><image href="${base}" width="640" height="640"/><g>${halo}</g><g fill="none" stroke="${accent}" stroke-width="${level === 2 ? 7 : level === 3 ? 8 : 9}" stroke-linecap="round" stroke-linejoin="round" opacity=".82" filter="url(#asset-glow)">${details}</g><g fill="none" stroke="${secondary}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".74">${details}</g>${cornerFrame}</svg>`;
    writeFileSync(path.join(dir, `${asset.id}-level-${level}.svg`), svg);
  }
}
console.log(`Generated ${assets.length * 3} level-specific Phase 14 upgrade artworks.`);