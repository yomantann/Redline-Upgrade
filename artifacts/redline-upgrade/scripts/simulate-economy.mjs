import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const RUNS = 1_000;
const SEED = 0x15ea5e;
const MAX_ACTIONS = 8_000;
const outputFile = process.argv[2] ?? 'phase15-economy-latest.md';
if (!/^[a-z0-9][a-z0-9._-]*\.md$/i.test(outputFile)) {
  throw new Error('Output must be a simple Markdown filename.');
}
const vite = await createServer({
  configFile: false, plugins: [react()],
  resolve: { alias: { '@': new URL('../src/', import.meta.url).pathname } },
  optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true }, appType: 'custom',
});

let seed = SEED;
const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0x1_0000_0000;
};
const originalRandom = Math.random;
Math.random = random;

try {
  const { createMatch, advanceMatch } = await vite.ssrLoadModule('/src/game/match.ts');
  const { characters } = await vite.ssrLoadModule('/src/game/characters.ts');
  const { assets } = await vite.ssrLoadModule('/src/game/assets.ts');
  const { assertCompleteCardPiles } = await vite.ssrLoadModule('/src/game/card-piles.ts');
  const { calculateEndgameBaseValue } = await vite.ssrLoadModule('/src/game/endgame.ts');

  const fixture = createMatch(characters[0].id);
  assert.equal(fixture.players.length, 4);
  assertCompleteCardPiles(fixture.cardPiles);

  const records = [];
  const routeCounts = { CASH_OUT: 0, DOUBLE_DOWN: 0, FINAL_GAMBLE: 0 };
  let routeCursor = 0;
  const routes = ['CASH_OUT', 'DOUBLE_DOWN', 'FINAL_GAMBLE'];
  const progress = (before, after) => JSON.stringify(before) !== JSON.stringify(after);

  function playMatch(run) {
    // AUTO_DECIDE is intentionally used for all ordinary CPU policy decisions.
    // The first player is temporarily treated as human only for the audited,
    // explicitly rotated endgame action (the reducer rejects CPU CHOOSE_ENDGAME).
    let match = createMatch(characters[0].id);
    match = { ...match, players: match.players.map((p) => ({ ...p, isCPU: true })) };
    const startWealth = match.players.map((p) => p.wealth);
    const observed = match.players.map((p) => ({
      positive: 0, negative: 0, salary: 0, assetSpend: 0,
      tokenEarned: p.upgradeTokens + p.heldUpgradeTokens, tokenRecovered: 0, milestoneExposure: 0, milestonePurchases: 0,
      seenEvents: new Set(), seenSalary: new Set(),
    }));
    let actions = 0;
    let stagnant = 0;
    while (match.phase !== 'complete') {
      if (++actions > MAX_ACTIONS) throw new Error(`hard stall guard: run ${run} exceeded ${MAX_ACTIONS} actions`);
      const before = match;
      if (match.phase === 'ready') {
        const die1 = Math.floor(random() * 4) + 1;
        const die2 = Math.floor(random() * 4) + 1;
        match = advanceMatch(match, { type: 'ROLL', result: { die1, die2, total: die1 + die2, doubles: die1 === die2 } });
      } else if (match.phase === 'rolling') match = advanceMatch(match, { type: 'REVEAL' });
      else if (match.phase === 'reveal') match = advanceMatch(match, { type: 'MOVE' });
      else if (match.phase === 'moving') match = advanceMatch(match, { type: 'STEP' });
      else if (match.phase === 'decision') match = advanceMatch(match, { type: 'AUTO_DECIDE' });
      else if (match.phase === 'endgame') {
        const playerIndex = match.turnIndex;
        const choice = routes[routeCursor++ % routes.length];
        routeCounts[choice]++;
        // CPU policy remains in force everywhere except this reducer-accepted
        // route observation, whose choice is deliberately balanced by rotation.
        match = {
          ...match,
          players: match.players.map((p, i) => i === playerIndex ? { ...p, isCPU: false } : p),
        };
        match = advanceMatch(match, { type: 'CHOOSE_ENDGAME', choice });
        match = {
          ...match,
          players: match.players.map((p, i) => i === playerIndex ? { ...p, isCPU: true } : p),
        };
      } else if (match.phase === 'landed') match = advanceMatch(match, { type: 'NEXT_TURN' });
      else throw new Error(`unexpected phase ${match.phase}`);
      // Harvest before the reducer's capped display log evicts older entries.
      // Snapshots also provide complete Wealth and equipment deltas.
      for (let i = 0; i < match.players.length; i++) {
        const prior = before.players[i];
        const current = match.players[i];
        const wealthDelta = current.wealth - prior.wealth;
        if (wealthDelta > 0) observed[i].positive += wealthDelta;
        if (wealthDelta < 0) observed[i].negative += wealthDelta;
        const tokenDelta = (current.upgradeTokens + current.heldUpgradeTokens)
          - (prior.upgradeTokens + prior.heldUpgradeTokens);
        if (tokenDelta > 0) observed[i].tokenEarned += tokenDelta;
        const priorAssets = new Set(Object.values(prior.equipment).filter(Boolean));
        for (const assetId of Object.values(current.equipment).filter(Boolean)) {
          if (!priorAssets.has(assetId)) {
            const asset = assets.find((a) => a.id === assetId);
            if (asset && wealthDelta <= -asset.cost) {
              observed[i].assetSpend += asset.cost;
              observed[i].milestonePurchases++;
            }
          }
        }
      }
      if (match.pending?.kind === 'ASSET' && before.pending?.kind !== 'ASSET') {
        observed[match.turnIndex].milestoneExposure++;
      }
      for (const entry of match.eventLog) {
        const bucket = observed[entry.playerIndex];
        if (!bucket || bucket.seenEvents.has(entry.id)) continue;
        bucket.seenEvents.add(entry.id);
        if (entry.eventType === 'SALARY_GATE') bucket.salary += entry.salaryAmount ?? 0;
        if (entry.eventType === 'MILESTONE_RECOVERED') bucket.tokenRecovered++;
      }
      for (const wealthEvent of match.wealthEvents) {
        const bucket = observed[wealthEvent.playerIndex];
        if (bucket && wealthEvent.kind === 'PAYDAY' && !bucket.seenSalary.has(wealthEvent.id)) {
          bucket.seenSalary.add(wealthEvent.id);
          bucket.salary += wealthEvent.amount;
        }
      }
      if (!progress(before, match)) {
        if (++stagnant > 12) throw new Error(`hard no-op guard: run ${run} stalled in ${match.phase}`);
      } else stagnant = 0;
    }
    assert.equal(match.finishOrder.length, 4, `run ${run} has four finishers`);
    assert(match.players.every((p) => p.endgame?.status === 'RESOLVED'), `run ${run} resolved every endgame`);
    assertCompleteCardPiles(match.cardPiles);

    const byPlayer = match.players.map((player, playerIndex) => {
      const events = match.eventLog.filter((e) => e.playerId === player.playerId || e.playerIndex === playerIndex);
      const positive = observed[playerIndex].positive;
      const negative = observed[playerIndex].negative;
      const salaryIncome = observed[playerIndex].salary;
      const equipment = Object.values(player.equipment).filter(Boolean);
      const categories = {};
      for (const id of equipment) {
        const asset = assets.find((a) => a.id === id);
        if (asset) categories[asset.category] = (categories[asset.category] ?? 0) + 1;
      }
      const levels = Object.values(player.assetLevels);
      const endgame = player.endgame;
      const finishRank = match.finishOrder.indexOf(playerIndex) + 1;
      const attributeBonus = (match.endgameAttributeBonuses ?? [])
        .filter((b) => b.playerIndex === playerIndex).reduce((n, b) => n + b.amount, 0);
      return {
        startWealth: startWealth[playerIndex], finalWealth: player.wealth,
        salaryIncome, positiveWealthMovement: positive, negativeWealthMovement: negative,
        assetSpend: observed[playerIndex].assetSpend,
        assetCount: equipment.length, assetCategories: categories,
        assetLevels: levels.length ? levels.reduce((n, x) => n + x, 0) : 0,
        endgameAssetValue: Math.max(0, (endgame?.baseValue ?? 0) - player.wealth
          - player.aiSkill * 15000 - player.fame * 8000 - player.lifestyle * 10000 - player.influence * 7500),
        upgradeTokensEarned: observed[playerIndex].tokenEarned,
        upgradeTokensSpent: player.history.upgradeTokensSpent,
        upgradeTokensHeld: player.heldUpgradeTokens, upgradeTokensRecovered: observed[playerIndex].tokenRecovered,
        finishRank, finishReward: match.wealthEvents.find((e) => e.playerIndex === playerIndex && e.kind === 'FINISH_BONUS')?.amount ?? 0,
        attributeBonus, baseEndgameValue: endgame?.baseValue ?? calculateEndgameBaseValue(player),
        route: endgame?.choice, finalValue: endgame?.finalGameValue ?? 0,
        multiplier: endgame?.multiplier ?? 0, routeDelta: (endgame?.finalGameValue ?? 0) - (endgame?.baseValue ?? 0),
        milestoneExposures: observed[playerIndex].milestoneExposure,
        milestonePurchases: observed[playerIndex].milestonePurchases,
      };
    });
    return byPlayer;
  }

  for (let run = 1; run <= RUNS; run++) records.push(...playMatch(run));
  const percentile = (values, p) => {
    const a = [...values].sort((x, y) => x - y);
    return a[Math.min(a.length - 1, Math.floor((a.length - 1) * p))];
  };
  const numeric = ['startWealth', 'finalWealth', 'salaryIncome', 'positiveWealthMovement', 'negativeWealthMovement',
    'assetSpend', 'assetCount', 'assetLevels', 'endgameAssetValue', 'upgradeTokensEarned', 'upgradeTokensSpent',
    'upgradeTokensHeld', 'upgradeTokensRecovered', 'finishRank', 'finishReward', 'attributeBonus', 'baseEndgameValue',
    'finalValue', 'multiplier', 'routeDelta', 'milestoneExposures', 'milestonePurchases'];
  const summary = Object.fromEntries(numeric.map((key) => {
    const values = records.map((r) => r[key]);
    return [key, { average: values.reduce((n, x) => n + x, 0) / values.length, median: percentile(values, .5), p2_5: percentile(values, .025), p97_5: percentile(values, .975) }];
  }));
  const routeSummary = Object.fromEntries(routes.map((route) => {
    const values = records.filter((r) => r.route === route);
    return [route, { observations: values.length, finalValueAverage: values.reduce((n, x) => n + x.finalValue, 0) / values.length,
      baseValueAverage: values.reduce((n, x) => n + x.baseEndgameValue, 0) / values.length,
      multiplierAverage: values.reduce((n, x) => n + x.multiplier, 0) / values.length,
      deltaAverage: values.reduce((n, x) => n + x.routeDelta, 0) / values.length }];
  }));
  const categoryCounts = Object.fromEntries([...new Set(assets.map((a) => a.category))].map((c) => [c, records.reduce((n, r) => n + (r.assetCategories[c] ?? 0), 0)]));
  const report = `# Phase 15 economy audit

## Policy and scope

- **Runs:** ${RUNS} complete 4-player matches (4,000 player observations), seed ${SEED} (32-bit LCG replacing Math.random for the entire run).
- **Policy:** ordinary milestone, card, career, token and asset decisions use reducer \`AUTO_DECIDE\`; seeded 2d4 rolls are manually supplied as \`ROLL\` actions and movement is manually stepped. Endgame choices rotate CASH_OUT, DOUBLE_DOWN, FINAL_GAMBLE in a single global cycle, with the reducer's CPU restriction temporarily disabled only to submit the chosen \`CHOOSE_ENDGAME\` action. This is CPU-policy evidence, not human optimal-play evidence.
- **Guards/invariants:** ${MAX_ACTIONS}-action hard stall guard, 12 consecutive no-op guard, four finishers, all endgames resolved, and \`assertCompleteCardPiles\` after every match. A deterministic fixture was created and its four-player/pile invariants asserted.

## Per-player distributions

Values are average / median / 2.5th percentile / 97.5th percentile across player observations.

| measure | average | median | p2.5 | p97.5 |
|---|---:|---:|---:|---:|
${numeric.map((k) => `| ${k} | ${summary[k].average.toFixed(1)} | ${summary[k].median.toFixed(1)} | ${summary[k].p2_5.toFixed(1)} | ${summary[k].p97_5.toFixed(1)} |`).join('\n')}

Asset category counts (final equipment): ${Object.entries(categoryCounts).map(([k, v]) => `${k}=${v}`).join(', ')}.

## Endgame route observations

| route | observations | base value avg | final value avg | multiplier avg | delta avg |
|---|---:|---:|---:|---:|---:|
${routes.map((r) => `| ${r} | ${routeSummary[r].observations} | ${routeSummary[r].baseValueAverage.toFixed(1)} | ${routeSummary[r].finalValueAverage.toFixed(1)} | ${routeSummary[r].multiplierAverage.toFixed(3)} | ${routeSummary[r].deltaAverage.toFixed(1)} |`).join('\n')}

## Milestones, purchases, and limitations

Milestone exposure and purchase counts are derived from \`MILESTONE\` and \`ASSET_PURCHASED\` reducer events; purchase rate is reported as aggregate purchases / aggregate milestone exposures in the recorded observations: ${(records.reduce((n, r) => n + r.milestonePurchases, 0) / Math.max(1, records.reduce((n, r) => n + r.milestoneExposures, 0))).toFixed(3)}. Wealth deltas use \`WEALTH_CHANGED\` event \`delta\` values; salary uses \`SALARY_GATE.salaryAmount\`; finish rewards use \`wealthEvents\`; asset spend uses purchase event cost/delta. Endgame asset value is derived as locked base value minus finish Wealth and stat-value components because the reducer does not emit a separate asset-value total. Token recovery is counted from \`MILESTONE_RECOVERED\`.

This report reflects the game rules loaded when the simulation runs; it is not a historical baseline unless its output filename and source revision are recorded separately. It does not estimate optimal play, causal balance, or human behavior. AUTO_DECIDE has stochastic policy choices, and card effects/abilities can affect other players, so source attribution is not always uniquely assignable beyond reducer event player indexes. Events are harvested after every reducer transition and deduplicated by event id; Wealth and token totals, equipment changes, milestone offer exposure, and purchase costs are additionally measured from before/after state snapshots. Asset category counts are final holdings (not every historical holding), and levels are summed observed levels. Asset spend is charged only when a newly equipped asset reduces Wealth by at least its authored cost, avoiding no-cost milestone recovery. The simulation writes a report but does not edit game rules. Sources: \`scripts/simulate-economy.mjs\`, \`src/game/match.ts\`, \`src/game/endgame.ts\`, \`src/game/card-piles.ts\`.
`;
  const reportPath = new URL(`../docs/${outputFile}`, import.meta.url);
  mkdirSync(new URL('../docs/', import.meta.url), { recursive: true });
  writeFileSync(reportPath, report);
  console.log(`phase15 audit complete: ${RUNS} matches; wrote docs/${outputFile}`);
} finally {
  Math.random = originalRandom;
  await vite.close();
}