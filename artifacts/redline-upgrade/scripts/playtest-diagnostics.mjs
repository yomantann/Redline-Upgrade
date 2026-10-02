// Phase 17 developer diagnostics: simulates full CPU games and reports mechanic
// coverage (events, abilities, cards, careers, assets) and abnormal outcomes.
// Console/Markdown output only; nothing here is imported by the shipped game.
// Usage: node scripts/playtest-diagnostics.mjs [runs] [output.md]
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const RUNS = Number(process.argv[2] ?? 200);
const outputFile = process.argv[3] ?? 'phase17-playtest-latest.md';
if (!Number.isInteger(RUNS) || RUNS < 1 || !/^[a-z0-9][a-z0-9._-]*\.md$/i.test(outputFile)) {
  throw new Error('Usage: playtest-diagnostics.mjs [runs>=1] [simple-name.md]');
}
const MAX_ACTIONS = 8_000;
let seed = 0x17a11;
const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0x1_0000_0000; };
const originalRandom = Math.random;
Math.random = random;
const vite = await createServer({
  configFile: false, plugins: [react()],
  resolve: { alias: { '@': new URL('../src/', import.meta.url).pathname } },
  optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true }, appType: 'custom',
});
const bump = (map, key, n = 1) => map.set(key, (map.get(key) ?? 0) + n);
try {
  const { createMatch, advanceMatch } = await vite.ssrLoadModule('/src/game/match.ts');
  const { characters } = await vite.ssrLoadModule('/src/game/characters.ts');
  const { careers } = await vite.ssrLoadModule('/src/game/careers.ts');
  const { cards } = await vite.ssrLoadModule('/src/game/cards.ts');
  const { assets } = await vite.ssrLoadModule('/src/game/assets.ts');
  const { abilities } = await vite.ssrLoadModule('/src/game/abilities.ts');

  const eventTypes = new Map(), abilityHits = new Map(), cardHits = new Map(), careerHolds = new Map(),
    assetHolds = new Map(), routes = new Map(), wins = new Map(), titles = new Map();
  const careerValues = new Map(), characterValues = new Map(), assetCountValues = new Map(), finalWealth = [], turnsPerGame = [], anomalies = [];
  const routeCycle = ['CASH_OUT', 'DOUBLE_DOWN', 'FINAL_GAMBLE'];
  let cycle = 0;

  for (let run = 0; run < RUNS; run++) {
    let match = createMatch(characters[run % characters.length].id);
    match = { ...match, players: match.players.map((p) => ({ ...p, isCPU: true })) };
    const seen = new Set();
    let actions = 0, turns = 0, stagnant = 0;
    const harvest = () => {
      for (const e of match.eventLog) {
        if (seen.has(e.id)) continue;
        seen.add(e.id);
        bump(eventTypes, e.eventType ?? e.kind);
        if (e.abilityId) bump(abilityHits, e.abilityId);
        if (e.cardId && e.eventType === 'CARD_RESOLVED') bump(cardHits, e.cardId);
      }
    };
    try {
      while (match.phase !== 'complete') {
        if (++actions > MAX_ACTIONS) throw new Error('stall: action cap exceeded');
        const before = JSON.stringify([match.phase, match.turnIndex, match.players.map((p) => p.position)]);
        const beforeMatch = match;
        const p = match.phase;
        if (p === 'ready') {
          const d1 = Math.floor(random() * 4) + 1, d2 = Math.floor(random() * 4) + 1;
          match = advanceMatch(match, { type: 'ROLL', result: { die1: d1, die2: d2, total: d1 + d2, doubles: d1 === d2 } });
          turns++;
        } else if (p === 'rolling') match = advanceMatch(match, { type: 'REVEAL' });
        else if (p === 'reveal') match = advanceMatch(match, { type: 'MOVE' });
        else if (p === 'moving') match = advanceMatch(match, { type: 'STEP' });
        else if (p === 'decision') match = advanceMatch(match, { type: 'AUTO_DECIDE' });
        else if (p === 'landed') match = advanceMatch(match, { type: 'NEXT_TURN' });
        else if (p === 'endgame') {
          const i = match.turnIndex, choice = routeCycle[cycle++ % 3];
          bump(routes, choice);
          const flip = (cpu) => ({ ...match, players: match.players.map((q, j) => (j === i ? { ...q, isCPU: cpu } : q)) });
          match = advanceMatch(flip(false), { type: 'CHOOSE_ENDGAME', choice });
          match = { ...match, players: match.players.map((q, j) => (j === i ? { ...q, isCPU: true } : q)) };
        } else throw new Error(`unexpected phase ${p}`);
        harvest();
        if (match === beforeMatch || JSON.stringify([match.phase, match.turnIndex, match.players.map((q) => q.position)]) === before) {
          if (++stagnant > 40) throw new Error(`dead turn: stuck in ${match.phase} pending=${JSON.stringify(match.pending)?.slice(0,160)} wealth=${match.players[match.turnIndex].wealth} eq=${JSON.stringify(match.players[match.turnIndex].equipment)}`);
        } else stagnant = 0;
        for (const pl of match.players) {
          if (!Number.isFinite(pl.wealth)) throw new Error('non-finite wealth');
        }
      }
    } catch (err) {
      anomalies.push(`run ${run}: ${err.message}`);
      continue;
    }
    turnsPerGame.push(turns);
    for (const pl of match.players) {
      finalWealth.push(pl.endgame?.finalGameValue ?? pl.wealth);
      bump(careerHolds, pl.careerId);
      const v = pl.endgame?.finalGameValue ?? pl.wealth;
      const add = (m, k) => { const r = m.get(k) ?? [0, 0]; m.set(k, [r[0] + v, r[1] + 1]); };
      add(careerValues, pl.careerId); add(characterValues, pl.characterId);
      add(assetCountValues, `${Object.values(pl.equipment).filter(Boolean).length} assets`);
      if (pl.secondCareer?.careerId) bump(careerHolds, pl.secondCareer.careerId);
      for (const a of Object.values(pl.equipment).filter(Boolean)) bump(assetHolds, a);
      if (pl.endgame?.title) bump(titles, typeof pl.endgame.title === 'string' ? pl.endgame.title : pl.endgame.title.name ?? 'untitled');
    }
    const best = match.players.reduce((b, pl, i) => ((pl.endgame?.finalGameValue ?? 0) > (match.players[b].endgame?.finalGameValue ?? 0) ? i : b), 0);
    bump(wins, `seat ${best + 1}${best === 0 ? ' (first mover)' : ''}`);
  }

  const sorted = [...finalWealth].sort((a, b) => a - b);
  const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))] ?? 0;
  const avg = (a) => (a.length ? a.reduce((n, x) => n + x, 0) / a.length : 0);
  const table = (map) => [...map.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`).join('\n');
  const never = (ids, map) => ids.filter((id) => !map.has(id));
  const unreachable = {
    abilities: never(abilities.filter((a) => a.trigger).map((a) => a.id), abilityHits),
    cards: never(cards.map((c) => c.id), cardHits),
    careers: never(careers.map((c) => c.id), careerHolds),
    assets: never(assets.map((a) => a.id), assetHolds),
  };
  const finalMedian = q(0.5);
  const flags = [];
  if (anomalies.length) flags.push(`${anomalies.length} run(s) stalled or errored`);
  if (finalMedian > 0 && q(0.975) > finalMedian * 6) flags.push('Wealth inflation: p97.5 final value exceeds 6x the median');
  if (sorted.some((v) => v < 0)) flags.push('Some players finished with negative final value');

  // ---- Static audit: cards, careers, assets, endgame scale ----
  const { ENDGAME_BALANCE } = await vite.ssrLoadModule('/src/game/endgame.ts');
  const { assetValueAtLevel } = await vite.ssrLoadModule('/src/game/upgrade-tokens.ts');
  const { FINISH_ORDER_WEALTH_REWARDS } = await vite.ssrLoadModule('/src/game/careers.ts');
  const STAT_VALUE = { wealth: 1, ...ENDGAME_BALANCE.statValues };
  const flatten = (effects) => effects.flatMap((e) => (e.kind === 'RISK' ? [e, ...flatten(e.win), ...flatten(e.loss)] : [e]));
  const effectValue = (e) => {
    if (e.kind === 'STAT') return e.amount * (STAT_VALUE[e.stat] ?? 1);
    if (e.kind === 'TRANSFER_WEALTH') return e.amount;
    if (e.kind === 'MODIFY_SALARY') return e.amount * 5;
    if (e.kind === 'UPGRADE_TOKEN') return 50_000;
    return 0;
  };
  const cardRows = cards.map((c) => {
    const flat = flatten(c.effects);
    const kinds = new Set(flat.map((e) => e.kind));
    const targetsOthers = flat.some((e) => (e.target && e.target !== 'SELF') || e.kind === 'TRANSFER_WEALTH');
    const choiceLike = kinds.has('RISK') || targetsOthers || kinds.has('PROTECT') || kinds.has('REWARD_MODIFIER') || flat.some((e) => e.careerTag);
    const ev = c.effects.reduce((n, e) => n + (e.kind === 'RISK' ? e.chance * e.win.reduce((a, x) => a + effectValue(x), 0) + (1 - e.chance) * e.loss.reduce((a, x) => a + effectValue(x), 0) : effectValue(e)), 0);
    return { c, kinds, targetsOthers, choiceLike, ev, flat };
  });
  const flatCards = cardRows.filter((r) => !r.choiceLike);
  const byDeck = new Map();
  for (const r of cardRows) {
    const d = byDeck.get(r.c.deck) ?? { n: 0, ev: 0, inter: 0, kinds: new Set() };
    d.n++; d.ev += r.ev; d.inter += r.choiceLike ? 1 : 0; r.kinds.forEach((k) => d.kinds.add(k));
    byDeck.set(r.c.deck, d);
  }
  const deckEvs = [...byDeck.values()].map((d) => d.ev / d.n);
  const deckSig = new Map([...byDeck.entries()].map(([k, d]) => [k, [...d.kinds].sort().join(' ')]));
  const sigCounts = new Map(); [...deckSig.values()].forEach((v) => bump(sigCounts, v));
  const outliers = cardRows.filter((r) => Math.abs(r.ev) > 250_000).map((r) => `${r.c.id} (${Math.round(r.ev).toLocaleString()})`);
  const careerRows = careers.map((c) => {
    const sal = c.salaryTiers;
    return { id: c.id, sal, avg: avg([...sal]), stats: Object.entries(c.statModifiers).map(([k, v]) => `${k}+${v}`).join(' '), tokens: c.acquisitionUpgradeTokens ?? 0, aff: c.deckAffinity.primary + (c.deckAffinity.secondary ? '/' + c.deckAffinity.secondary : '') };
  });
  const avgSal = avg(careerRows.map((r) => r.avg));
  const salaryFlags = careerRows.filter((r) => r.avg > avgSal * 1.4 || r.avg < avgSal * 0.6).map((r) => `${r.id} avg salary ${Math.round(r.avg).toLocaleString()} vs mean ${Math.round(avgSal).toLocaleString()}`);
  const affinityCount = new Map(); careerRows.forEach((r) => bump(affinityCount, r.aff.split('/')[0]));
  const unaffined = [...byDeck.keys()].filter((d) => !affinityCount.has(d));
  const assetRows = assets.map((a) => {
    const statV = Object.entries(a.effects).reduce((n, [k, v]) => n + v * (STAT_VALUE[k] ?? 1), 0);
    return { a, statV, ratio: (statV + assetValueAtLevel(a, 1)) / a.cost, l4gain: assetValueAtLevel(a, 4) - assetValueAtLevel(a, 1) };
  });
  const byCat = new Map();
  for (const r of assetRows) { const l = byCat.get(r.a.category) ?? []; l.push(r); byCat.set(r.a.category, l); }
  const assetFlags = assetRows.filter((r) => r.ratio > 2.5 || r.ratio < 1.0).map((r) => `${r.a.id} (${r.a.category}) value/cost ${r.ratio.toFixed(2)}`);
  const catTable = [...byCat.entries()].map(([k, l]) => `| ${k} | ${l.length} | ${Math.round(avg(l.map((r) => r.a.cost))).toLocaleString()} | ${avg(l.map((r) => r.ratio)).toFixed(2)} | ${Math.round(Math.max(...l.map((r) => r.a.cost))).toLocaleString()} |`).join('\n');
  const startWealth = createMatch(characters[0].id).players[0].wealth;
  const avgPayday = avgSal;
  const reward = FINISH_ORDER_WEALTH_REWARDS;
  const summarizeValues = (m) => [...m.entries()].map(([k, [t, n]]) => [k, t / n, n]).sort((a, b) => b[1] - a[1]);
  const spread = (rows) => (rows.length ? rows[0][1] / Math.max(1, rows.at(-1)[1]) : 0);
  const careerPerf = summarizeValues(careerValues);
  const charPerf = summarizeValues(characterValues);
  const dominance = [];
  if (careerPerf.length && careerPerf[0][1] > avg(finalWealth) * 1.35) dominance.push(`career ${careerPerf[0][0]} averages ${Math.round(careerPerf[0][1]).toLocaleString()} (>1.35x global mean)`);
  if (charPerf.length && charPerf[0][1] > avg(finalWealth) * 1.35) dominance.push(`character ${charPerf[0][0]} averages ${Math.round(charPerf[0][1]).toLocaleString()} (>1.35x global mean)`);
  const staticReport = `
## Static audit

### Economy scale
Starting Wealth ${startWealth.toLocaleString()}; mean career salary ${Math.round(avgPayday).toLocaleString()} per Payday; finish rewards ${reward.map((x) => x.toLocaleString()).join(' / ')}; stat endgame values ${JSON.stringify(ENDGAME_BALANCE.statValues)}.
Finish-order 1st reward is ${(reward[0] / startWealth * 100).toFixed(1)}% of starting Wealth and ${(reward[0] / Math.max(1, finalMedian) * 100).toFixed(1)}% of median final value.
Wealth-card amounts of $2,500/$5,000/$10,000 are ${(2500 / Math.max(1, avgPayday) * 100).toFixed(1)}% / ${(5000 / Math.max(1, avgPayday) * 100).toFixed(1)}% / ${(10000 / Math.max(1, avgPayday) * 100).toFixed(1)}% of one average Payday.

### Cards (${cards.length})
Decks: ${[...byDeck.entries()].map(([k, d]) => `${k}: ${d.n} cards, avg value ${Math.round(d.ev / d.n).toLocaleString()}, ${d.inter} interactive/risk/conditional`).join('; ')}.
Cards with only plain self stat/wealth changes (no risk, target, protection, modifier or career tag): ${flatCards.length}.
Cards with |expected value| > 250,000: ${outliers.join(', ') || 'none'}.
Decks sharing an identical effect-kind signature: ${[...sigCounts.values()].filter((n) => n > 1).length ? 'YES - ' + [...deckSig.entries()].map(([k, v]) => `${k}=[${v}]`).join('; ') : 'none (all distinct)'}.
Deck-average EV spread (max/min): ${(Math.max(...deckEvs) / Math.max(1, Math.min(...deckEvs))).toFixed(2)}.
Decks with no career using them as primary affinity: ${unaffined.join(', ') || 'none'}.

### Careers
| career | salary tiers | avg | start stats | tokens | affinity |
|---|---|---:|---|---:|---|
${careerRows.map((r) => `| ${r.id} | ${r.sal.map((x) => x.toLocaleString()).join(' / ')} | ${Math.round(r.avg).toLocaleString()} | ${r.stats} | ${r.tokens} | ${r.aff} |`).join('\n')}

Salary outliers (±40% of mean): ${salaryFlags.join('; ') || 'none'}.

### Assets (${assets.length})
| category | count | avg cost | avg endgame-value/cost at L1 | max cost |
|---|---:|---:|---:|---:|
${catTable}

Value/cost outliers (<1.0 or >2.5): ${assetFlags.join('; ') || 'none'}.
Level 4 adds exactly 3x cost over Level 1 (cost x level), so upgrades always beat a plain Wealth hold at purchase price.

### Simulated strategy outcomes (avg final value / players)
Careers: ${careerPerf.map(([k, v, n]) => `${k} ${Math.round(v).toLocaleString()} (${n})`).join(', ')}.
Characters: ${charPerf.map(([k, v, n]) => `${k} ${Math.round(v).toLocaleString()} (${n})`).join(', ')}.
By number of assets held at finish: ${summarizeValues(assetCountValues).map(([k, v, n]) => `${k} ${Math.round(v).toLocaleString()} (${n})`).join(', ')}.
Best/worst career spread: ${spread(careerPerf).toFixed(2)}x; best/worst character spread: ${spread(charPerf).toFixed(2)}x.
Dominance flags: ${dominance.join('; ') || 'none'}.
`;
  if (dominance.length) flags.push(...dominance);
  if (salaryFlags.length) flags.push(`salary outliers: ${salaryFlags.length}`);
  if (assetFlags.length) flags.push(`asset value/cost outliers: ${assetFlags.length}`);
  if (flatCards.length) flags.push(`${flatCards.length} cards are plain self stat changes with no decision/interaction`);

  const report = `# Phase 17 playtest diagnostics

Runs: ${RUNS} CPU-played 4-player games (seeded LCG). Completed: ${turnsPerGame.length}. Average rolls per game: ${avg(turnsPerGame).toFixed(0)}.

## Final value per player
min ${q(0)} / p2.5 ${q(0.025)} / median ${finalMedian} / p97.5 ${q(0.975)} / max ${q(1)} / mean ${avg(finalWealth).toFixed(0)}

## Flags
${flags.length ? flags.map((f) => `- ${f}`).join('\n') : '- none'}
${anomalies.slice(0, 10).map((a) => `- ${a}`).join('\n')}

## Never observed (unreachable or rare in this sample)
- Abilities: ${unreachable.abilities.join(', ') || 'none'}
- Cards resolved: ${unreachable.cards.join(', ') || 'none'}
- Careers held: ${unreachable.careers.join(', ') || 'none'}
- Assets held at finish: ${unreachable.assets.length} of ${assets.length}

${staticReport}
## Event counts
| event | count |
|---|---:|
${table(eventTypes)}

## Ability triggers
| ability | count |
|---|---:|
${table(abilityHits)}

## Card resolutions (top)
| card | count |
|---|---:|
${table(new Map([...cardHits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)))}

## Career holdings at finish
| career | count |
|---|---:|
${table(careerHolds)}

## Endgame route usage (rotated) / winners by seat / titles
${table(routes)}

${table(wins)}

${table(titles)}
`;
  mkdirSync(new URL('../docs/', import.meta.url), { recursive: true });
  writeFileSync(new URL(`../docs/${outputFile}`, import.meta.url), report);
  console.log(report.split('## Event counts')[0]);
} finally {
  Math.random = originalRandom;
  await vite.close();
}
