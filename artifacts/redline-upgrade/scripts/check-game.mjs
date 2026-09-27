import assert from 'node:assert/strict';
import { createServer } from 'vite';

// Vite loads the same TypeScript game modules as the app, without a browser.
const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true }, appType: 'custom' });
try {
  const { createMatch, advanceMatch } = await vite.ssrLoadModule('/src/game/match.ts');
  const { characters } = await vite.ssrLoadModule('/src/game/characters.ts');
  const { getCareer } = await vite.ssrLoadModule('/src/game/careers.ts');
  const { getSpace } = await vite.ssrLoadModule('/src/game/board-data.ts');
  const id = characters[0].id;

  for (let i = 0; i < 50; i++) {
    const match = createMatch(id);
    assert.equal(match.players.length, 4);
    assert.equal(new Set(match.players.map(player => player.careerId)).size, 4);
    assert(match.players.every(player => player.salaryAmount === getCareer(player.careerId).salaryTiers[player.salaryTier - 1]));
  }
  function start(position, slot = 0, wealth = 900000) {
    const match = createMatch(id);
    return {
      ...match, turnIndex: slot,
      players: match.players.map((player, index) => index === slot ? { ...player, position, wealth } : player),
    };
  }
  function move(match, total) {
    match = advanceMatch(match, { type: 'ROLL', result: { die1: 1, die2: total - 1, total } });
    match = advanceMatch(match, { type: 'REVEAL' });
    match = advanceMatch(match, { type: 'MOVE' });
    for (let i = 0; i < total && match.phase === 'moving'; i++) match = advanceMatch(match, { type: 'STEP' });
    return match;
  }

  let match = move(start(4), 3);
  assert.equal(match.players[0].wealth, 900000 + match.players[0].salaryAmount);
  assert.equal(match.wealthEvents.length, 1);
  assert.equal(advanceMatch(match, { type: 'STEP' }), match);
  match = move(start(4), 2);
  assert.equal(match.players[0].wealth, 900000 + match.players[0].salaryAmount);
  assert.equal(match.wealthEvents.length, 1);
  match = move(start(4, 1), 2);
  assert.equal(match.players[1].wealth, 900000 + match.players[1].salaryAmount);
  match = advanceMatch(match, { type: 'NEXT_TURN' });
  assert.equal(match.players[1].wealth, 900000 + match.players[1].salaryAmount);

  match = move(start(8), 2);
  assert.equal(match.phase, 'decision');
  assert.equal(match.pending.slot, 'car');
  const poor = { ...match, players: match.players.map((player, index) => index ? player : { ...player, wealth: 40000 }) };
  assert.equal(advanceMatch(poor, { type: 'BUY_ASSET', assetId: 'budget-racer' }), poor);
  const purchased = advanceMatch(match, { type: 'BUY_ASSET', assetId: 'budget-racer' });
  assert.equal(purchased.players[0].wealth, 850000);
  assert.equal(purchased.players[0].fame, match.players[0].fame + 3);
  assert.equal(purchased.players[0].equipment.car, 'budget-racer');
  assert.equal(advanceMatch(purchased, { type: 'BUY_ASSET', assetId: 'budget-racer' }), purchased);
  match = move(start(28), 2);
  assert.equal(match.pending.slot, 'lifestyle');
  assert.equal(advanceMatch(match, { type: 'SKIP_ASSET' }).phase, 'landed');

  match = move(start(33), 3);
  assert.equal(match.players[0].position, 35);
  assert.equal(match.phase, 'decision');
  assert.equal(match.stepsRemaining, 1);
  const oldCareer = match.players[0].careerId;
  const oldSalary = match.players[0].salaryAmount;
  const oldWealth = match.players[0].wealth;
  let kept = advanceMatch(match, { type: 'KEEP_CAREER' });
  assert.equal(kept.phase, 'moving');
  assert.equal(kept.players[0].salaryAmount, oldSalary);
  kept = advanceMatch(kept, { type: 'STEP' });
  assert.equal(kept.players[0].position, 36);
  match = advanceMatch(match, { type: 'SWITCH_CAREER' });
  assert.equal(match.pending.options.length, 2);
  assert.equal(new Set(match.pending.options).size, 2);
  assert(!match.pending.options.includes(oldCareer));
  match = advanceMatch(match, { type: 'SELECT_CAREER', careerId: match.pending.options[0] });
  assert.equal(match.pending.stage, 'salary');
  assert.equal(match.players[0].wealth, oldWealth);
  assert.equal(match.players[0].salaryAmount, getCareer(match.players[0].careerId).salaryTiers[match.players[0].salaryTier - 1]);
  match = advanceMatch(match, { type: 'ACKNOWLEDGE_CAREER' });
  assert.equal(match.phase, 'moving');
  match = advanceMatch(match, { type: 'STEP' });
  assert.equal(match.players[0].position, 36);
  const changedSalary = match.players[0].salaryAmount;
  match = { ...match, players: match.players.map((player, index) => index ? player : { ...player, position: 40 }), phase: 'ready' };
  const beforeGate = match.players[0].wealth;
  match = move(match, 2);
  assert.equal(match.players[0].wealth, beforeGate + changedSalary);

  match = move(start(43), 2);
  assert.equal(match.pending.slot, 'companion');
  assert.equal(advanceMatch(match, { type: 'BUY_ASSET', assetId: 'cyber-dog' }), match);
  match = advanceMatch(match, { type: 'CHOOSE_ASSET_CATEGORY', category: 'pet' });
  match = advanceMatch(match, { type: 'BUY_ASSET', assetId: 'cyber-dog' });
  assert.equal(match.players[0].equipment.companion, 'cyber-dog');
  match = move(start(58, 1), 2);
  assert.equal(match.pending.slot, 'property');
  match = advanceMatch(match, { type: 'AUTO_DECIDE' });
  assert.equal(match.phase, 'landed');
  assert(match.players[1].equipment.property);
  match = move(start(33, 1), 3);
  match = advanceMatch(match, { type: 'AUTO_DECIDE' });
  assert.equal(match.phase, 'moving');
  assert.equal(match.players[1].position, 35);
  match = move(start(73), 2);
  assert.equal(match.players[0].position, 75);
  assert.equal(match.phase, 'landed');
  assert.equal(getSpace(75).type, 'MILESTONE');
  console.log('PASS: career assignment, exact salary gates, guarded payouts, assets, career switch, CPU choices and finish');
} finally {
  await vite.close();
}