import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true }, appType: 'custom' });
try {
  const { createMatch, advanceMatch } = await vite.ssrLoadModule('/src/game/match.ts');
  const { resolveEventQueue } = await vite.ssrLoadModule('/src/game/event-engine.ts');
  const { characters } = await vite.ssrLoadModule('/src/game/characters.ts');
  const { getCareer } = await vite.ssrLoadModule('/src/game/careers.ts');
  const { getSpace } = await vite.ssrLoadModule('/src/game/board-data.ts');
  const { getAsset, assets } = await vite.ssrLoadModule('/src/game/assets.ts');
  const { getCard } = await vite.ssrLoadModule('/src/game/cards.ts');
  const { visualAssets } = await vite.ssrLoadModule('/src/game/asset-manifest.ts');
  const { ICON_PATHS } = await vite.ssrLoadModule('/src/game/icon-paths.ts');
  const id = characters[0].id;

  const eventTypes = (match) => match.eventLog.map((entry) => entry.eventType);
  const countEvent = (match, type) => match.eventLog.filter((entry) => entry.eventType === type).length;
  const setPlayer = (match, index, patch) => ({
    ...match,
    players: match.players.map((player, playerIndex) => playerIndex === index ? { ...player, ...patch } : player),
  });
  const setPlayers = (match, patches) => ({
    ...match,
    players: match.players.map((player, index) => ({ ...player, ...(patches[index] ?? {}) })),
  });
  const STABLE_PATCHES = {
    0: { characterId: 'guardian_h', careerId: 'lawyer' },
    1: { characterId: 'low_flame', careerId: 'personal-trainer' },
    2: { characterId: 'executive_p', careerId: 'real-estate-investor' },
    3: { characterId: 'anointed', careerId: 'corporate-executive' },
  };
  const createStableMatch = () => setPlayers(createMatch(id), STABLE_PATCHES);

  for (let i = 0; i < 50; i++) {
    const match = createMatch(id);
    assert.equal(match.players.length, 4);
    assert.equal(new Set(match.players.map((player) => player.careerId)).size, 4);
    assert(match.players.every((player) => player.salaryAmount === getCareer(player.careerId).salaryTiers[player.salaryTier - 1]));
  }

  function start(position, slot = 0, wealth = 900000) {
    const match = createStableMatch();
    return {
      ...match,
      turnIndex: slot,
      players: match.players.map((player, index) => index === slot ? { ...player, position, wealth } : player),
    };
  }

  function move(match, total) {
    match = advanceMatch(match, { type: 'ROLL', result: { die1: 1, die2: total - 1, total, doubles: total === 2 } });
    match = advanceMatch(match, { type: 'REVEAL' });
    match = advanceMatch(match, { type: 'MOVE' });
    for (let i = 0; i < total && match.phase === 'moving'; i++) match = advanceMatch(match, { type: 'STEP' });
    return match;
  }

  let seeded = createStableMatch();
  assert.equal(seeded.eventLog.at(-1).eventType, 'TURN_START');
  const seededWealth = seeded.players[0].wealth;
  const seededFame = seeded.players[0].fame;
  seeded = setPlayers(seeded, {
    0: { careerId: 'degen-trader', characterId: 'idol_core' },
  });
  seeded = advanceMatch(seeded, { type: 'ROLL', result: { die1: 4, die2: 4, total: 8, doubles: true } });
  assert(eventTypes(seeded).includes('DICE_ROLL'));
  assert(eventTypes(seeded).includes('DOUBLES_ROLLED'));
  assert(eventTypes(seeded).includes('ROLL_OF_8'));
  assert.equal(seeded.players[0].wealth, seededWealth + 10000);
  assert.equal(seeded.players[0].fame, seededFame + 5);

  let match = move(start(4), 3);
  assert.equal(match.players[0].wealth, 900000 + match.players[0].salaryAmount);
  assert.equal(match.wealthEvents.length, 1);
  assert(eventTypes(match).includes('SALARY_GATE'));
  assert.equal(advanceMatch(match, { type: 'STEP' }), match);

  match = move(start(4), 2);
  assert.equal(match.players[0].wealth, 900000 + match.players[0].salaryAmount);
  assert.equal(match.wealthEvents.length, 1);
  const salaryDebug = setPlayer(start(4), 0, { characterId: 'alpha_prime' });
  const originalSalary = salaryDebug.players[0].salaryAmount;
  match = move(salaryDebug, 2);
  assert.equal(match.players[0].salaryAmount, originalSalary + 5000);
  assert.equal(match.players[0].wealth, 900000 + originalSalary + 5000);
  assert(eventTypes(match).includes('PLAYER_AFFECTED'));

  match = move(start(4, 1), 2);
  assert.equal(match.players[1].wealth, 900000 + match.players[1].salaryAmount);
  match = advanceMatch(match, { type: 'NEXT_TURN' });
  assert.equal(match.players[1].wealth, 900000 + match.players[1].salaryAmount);

  match = move(start(8), 2);
  assert.equal(match.phase, 'decision');
  assert.equal(match.pending.slot, 'car');
  assert(eventTypes(match).includes('MILESTONE'));
  assert.equal(match.pending.offeredAssetIds.length, 3);
  assert.equal(new Set(match.pending.offeredAssetIds).size, 3);
  for (const category of ['car', 'lifestyle', 'pet', 'investment', 'property']) {
    assert.equal(assets.filter((asset) => asset.category === category).length, 10);
  }
  assert.equal(new Set(assets.map((asset) => asset.id)).size, assets.length);
  assert.equal(new Set(visualAssets.map((asset) => asset.id)).size, visualAssets.length);
  assert(visualAssets.every((asset) => existsSync(asset.filePath)));
  assert(Array.from({ length: 75 }, (_, index) => getSpace(index + 1)).every((space) => ICON_PATHS[space.icon] && (!space.secondaryIcon || ICON_PATHS[space.secondaryIcon])));
  const offeredCar = getAsset(match.pending.offeredAssetIds[0]);
  const hiddenCar = assets.find((asset) => asset.category === 'car' && !match.pending.offeredAssetIds.includes(asset.id));
  assert.equal(advanceMatch(match, { type: 'BUY_ASSET', assetId: hiddenCar.id }), match);
  const poor = setPlayer(match, 0, { wealth: 0 });
  assert.equal(advanceMatch(poor, { type: 'BUY_ASSET', assetId: offeredCar.id }), poor);
  const purchased = advanceMatch(match, { type: 'BUY_ASSET', assetId: offeredCar.id });
  assert.equal(purchased.players[0].wealth, 900000 - offeredCar.cost + (offeredCar.effects.wealth ?? 0));
  assert.equal(purchased.players[0].fame, match.players[0].fame + (offeredCar.effects.fame ?? 0));
  assert.equal(purchased.players[0].equipment.car, offeredCar.id);
  assert(eventTypes(purchased).includes('ASSET_PURCHASED'));
  assert(eventTypes(purchased).includes('CAR_PURCHASED'));
  assert.equal(advanceMatch(purchased, { type: 'BUY_ASSET', assetId: offeredCar.id }), purchased);

  match = move(start(28), 2);
  assert.equal(match.pending.slot, 'lifestyle');
  assert.equal(advanceMatch(match, { type: 'SKIP_ASSET' }).phase, 'landed');

  match = move(start(31), 5);
  assert.equal(match.players[0].position, 35);
  assert.equal(match.phase, 'decision');
  const passedSpaces = match.eventLog.filter((entry) => entry.eventType === 'PASS_SPACE').map((entry) => Number(entry.detail.match(/space (\d+)/)?.[1]));
  assert.deepEqual(passedSpaces.slice(-4), [32, 33, 34, 35]);
  match = advanceMatch(match, { type: 'KEEP_CAREER' });
  match = advanceMatch(match, { type: 'STEP' });
  assert.equal(match.players[0].position, 36);
  assert.equal(countEvent(match, 'LAND_ON_SPACE') >= 1, true);

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
  assert.equal(match.pending.offeredAssetIds.length, 3);
  const petId = match.pending.offeredAssetIds[0];
  match = advanceMatch(match, { type: 'BUY_ASSET', assetId: petId });
  assert.equal(match.players[0].equipment.companion, petId);

  match = move(start(1), 2);
  assert.equal(match.pending.kind, 'CARD');
  assert.equal(match.pending.deck, 'wealth');
  assert(match.pending.cardId);
  assert(eventTypes(match).includes('CARD_DRAW'));
  const cardBeforeResolve = getCard(match.pending.cardId);
  match = advanceMatch(match, { type: 'ACKNOWLEDGE_CARD' });
  assert.equal(match.phase, 'landed');
  assert(eventTypes(match).includes('CARD_RESOLVED'));
  assert(match.eventLog.some((entry) => entry.label === cardBeforeResolve.title.toUpperCase()));

  match = move(start(13, 1), 2);
  assert.equal(match.pending.deck, 'gamble');
  assert.equal(advanceMatch(match, { type: 'AUTO_DECIDE' }).phase, 'landed');
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

  let contentMatch = createStableMatch();
  contentMatch = setPlayers(contentMatch, {
    0: { careerId: 'lawyer', aiSkill: 1 },
    1: { careerId: 'ai-engineer', aiSkill: 3 },
    2: { careerId: 'pro-gamer', aiSkill: 2 },
    3: { careerId: 'doctor', aiSkill: 1 },
  });
  const aiBefore = contentMatch.players.map((player) => player.aiSkill);
  contentMatch = resolveEventQueue(contentMatch, [{ type: 'CARD_RESOLVED', playerIndex: 0, deck: 'ai', cardId: 'ai-ai-boom' }]);
  assert.equal(contentMatch.players[0].aiSkill, aiBefore[0]);
  assert.equal(contentMatch.players[1].aiSkill, aiBefore[1] + 4);
  assert.equal(contentMatch.players[2].aiSkill, aiBefore[2] + 3);
  assert.equal(contentMatch.players[3].aiSkill, aiBefore[3]);

  contentMatch = createStableMatch();
  contentMatch = setPlayers(contentMatch, {
    0: { careerId: 'lawyer', wealth: 100000 },
    1: { careerId: 'race-driver', wealth: 100000 },
    2: { careerId: 'degen-trader', wealth: 100000 },
    3: { careerId: 'doctor', wealth: 100000 },
  });
  contentMatch = resolveEventQueue(contentMatch, [{ type: 'CARD_RESOLVED', playerIndex: 0, deck: 'gamble', cardId: 'gamble-market-crash' }]);
  assert.equal(contentMatch.players[0].wealth, 100000);
  assert.equal(contentMatch.players[1].wealth, 85000);
  assert.equal(contentMatch.players[2].wealth, 85000);
  assert.equal(contentMatch.players[3].wealth, 100000);

  let lowFlame = createStableMatch();
  lowFlame = setPlayer(lowFlame, 0, { characterId: 'low_flame', wealth: 120000 });
  lowFlame = resolveEventQueue(lowFlame, [{ type: 'TURN_START', playerIndex: 0 }]);
  assert.equal(lowFlame.players[0].wealth, 130000);

  let raceDriver = move(setPlayers(start(8), {
    0: { characterId: 'hotwired', careerId: 'race-driver', wealth: 900000 },
  }), 2);
  const raceLifestyleBefore = raceDriver.players[0].lifestyle;
  const raceInfluenceBefore = raceDriver.players[0].influence;
  const raceWealthBefore = raceDriver.players[0].wealth;
  const raceCarId = raceDriver.pending.offeredAssetIds[0];
  const raceCar = getAsset(raceCarId);
  raceDriver = advanceMatch(raceDriver, { type: 'BUY_ASSET', assetId: raceCarId });
  assert.equal(raceDriver.players[0].wealth, raceWealthBefore - raceCar.cost + (raceCar.effects.wealth ?? 0) + 10000);
  assert.equal(raceDriver.players[0].lifestyle, raceLifestyleBefore + (raceCar.effects.lifestyle ?? 0) + 5);
  assert.equal(raceDriver.players[0].influence, raceInfluenceBefore + (raceCar.effects.influence ?? 0) + 1);

  let interaction = createStableMatch();
  interaction = setPlayers(interaction, {
    0: { wealth: 100000, influence: 5 },
    1: { wealth: 100000, influence: 5 },
    2: { wealth: 100000, influence: 5 },
    3: { wealth: 100000, influence: 5 },
  });
  interaction = resolveEventQueue(interaction, [{ type: 'CARD_RESOLVED', playerIndex: 0, deck: 'influence', cardId: 'influence-call-in-favor' }]);
  assert.equal(interaction.players[0].influence, 7);
  assert.equal(interaction.players[1].influence, 4);
  assert.equal(interaction.players[2].influence, 4);
  assert.equal(interaction.players[3].influence, 4);

  let landFight = start(5);
  landFight = setPlayers(landFight, {
    0: { characterId: 'the_tank', position: 5 },
    1: { position: 7 },
  });
  landFight = move(landFight, 2);
  assert(eventTypes(landFight).includes('LAND_ON_PLAYER'));
  assert.equal(landFight.players[1].position, 6);

  let doublesMatch = createStableMatch();
  doublesMatch = setPlayers(doublesMatch, {
    0: { careerId: 'pro-gamer', fame: 2 },
  });
  doublesMatch = advanceMatch(doublesMatch, { type: 'ROLL', result: { die1: 1, die2: 1, total: 2, doubles: true } });
  assert.equal(doublesMatch.players[0].fame, 4);

  let rollEight = createStableMatch();
  rollEight = setPlayers(rollEight, {
    0: { characterId: 'danger_zone', wealth: 100000, fame: 1 },
  });
  rollEight = advanceMatch(rollEight, { type: 'ROLL', result: { die1: 4, die2: 4, total: 8, doubles: true } });
  assert.equal(rollEight.players[0].wealth, 110000);
  assert.equal(rollEight.players[0].fame, 3);

  let protectedMatch = createStableMatch();
  protectedMatch = setPlayers(protectedMatch, {
    0: { characterId: 'guardian_h', wealth: 100000, position: 5 },
    1: { wealth: 100000, position: 5 },
    2: { wealth: 100000 },
  });
  protectedMatch = resolveEventQueue(protectedMatch, [{ type: 'LAND_ON_PLAYER', playerIndex: 0, targetPlayerId: protectedMatch.players[1].playerId, targetPlayerIndex: 1, targetPosition: 5, spaceNumber: 5 }]);
  protectedMatch = resolveEventQueue(protectedMatch, [{ type: 'CARD_RESOLVED', playerIndex: 2, deck: 'wealth', cardId: 'wealth-rent-spike' }]);
  assert.equal(protectedMatch.players[0].wealth, 95000);
  assert.equal(protectedMatch.players[1].wealth, 100000);
  assert.equal(protectedMatch.players[2].wealth, 110000);
  assert(protectedMatch.eventLog.some((entry) => entry.label === 'PENALTY BLOCKED' && entry.targetPlayerId === protectedMatch.players[1].playerId && entry.blocked));

  const humanCard = getCard('wealth-seed-capital');
  let human = setPlayers(start(1, 0, 50000), {
    0: { wealth: 50000, isCPU: false },
  });
  human = { ...human, phase: 'decision', pending: { kind: 'CARD', deck: humanCard.deck, cardId: humanCard.id, space: 3 } };
  human = advanceMatch(human, { type: 'ACKNOWLEDGE_CARD' });
  let cpu = setPlayers(start(1, 1, 50000), {
    1: { wealth: 50000, isCPU: true },
  });
  cpu = { ...cpu, turnIndex: 1, phase: 'decision', pending: { kind: 'CARD', deck: humanCard.deck, cardId: humanCard.id, space: 3 } };
  cpu = advanceMatch(cpu, { type: 'AUTO_DECIDE' });
  assert.equal(human.players[0].wealth, 65000);
  assert.equal(cpu.players[1].wealth, 65000);
  assert(eventTypes(human).includes('CARD_RESOLVED'));
  assert(eventTypes(cpu).includes('CARD_RESOLVED'));

  let clickClick = createStableMatch();
  clickClick = setPlayers(clickClick, {
    0: { characterId: 'click_click', fame: 5 },
  });
  clickClick = resolveEventQueue(clickClick, [{ type: 'FAME_CHANGED', playerIndex: 0, stat: 'fame', previousValue: 5, newValue: 8, delta: 3, reason: 'Test fame' }]);
  assert.equal(clickClick.players[0].fame, 7);

  console.log('PASS: phase 9 abilities, cards, category targeting, player interaction, CPU parity, movement, salary, milestones, careers, and purchases');
} finally {
  await vite.close();
}
