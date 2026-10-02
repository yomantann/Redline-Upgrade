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
  const finalWealth = [], turnsPerGame = [], anomalies = [];
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
    abilities: never(abilities.map((a) => a.id), abilityHits),
    cards: never(cards.map((c) => c.id), cardHits),
    careers: never(careers.map((c) => c.id), careerHolds),
    assets: never(assets.map((a) => a.id), assetHolds),
  };
  const finalMedian = q(0.5);
  const flags = [];
  if (anomalies.length) flags.push(`${anomalies.length} run(s) stalled or errored`);
  if (finalMedian > 0 && q(0.975) > finalMedian * 6) flags.push('Wealth inflation: p97.5 final value exceeds 6x the median');
  if (sorted.some((v) => v < 0)) flags.push('Some players finished with negative final value');
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
