import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createServer } from 'vite';

// Vite loads the same TypeScript game modules as the app, without a browser.
const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true }, appType: 'custom' });
try {
  const { createMatch, advanceMatch } = await vite.ssrLoadModule('/src/game/match.ts');
  const { cards, cardsForDeck } = await vite.ssrLoadModule('/src/game/cards.ts');
  const { decks } = await vite.ssrLoadModule('/src/game/decks.ts');
  const { getCardArtworkFilePath } = await vite.ssrLoadModule('/src/game/card-artwork.ts');
  const { assertCompleteCardPiles, drawCardFromPiles } = await vite.ssrLoadModule('/src/game/card-piles.ts');
  const { resolveEventQueue } = await vite.ssrLoadModule('/src/game/event-engine.ts');
  const { characters } = await vite.ssrLoadModule('/src/game/characters.ts');
  const { careers, getCareer } = await vite.ssrLoadModule('/src/game/careers.ts');
  const { getSpace } = await vite.ssrLoadModule('/src/game/board-data.ts');
  const { getAsset, assets } = await vite.ssrLoadModule('/src/game/assets.ts');
  const { visualAssets } = await vite.ssrLoadModule('/src/game/asset-manifest.ts');
  const { ICON_PATHS } = await vite.ssrLoadModule('/src/game/icon-paths.ts');
  const id = characters[0].id;

  for (let i = 0; i < 50; i++) {
    const match = createMatch(id);
    assert.equal(match.players.length, 4);
    assert.equal(new Set(match.players.map(player => player.careerId)).size, 4);
    assert(match.players.every(player => player.salaryAmount === getCareer(player.careerId).salaryTiers[player.salaryTier - 1]));
    assertCompleteCardPiles(match.cardPiles);
  }
  function start(position, slot = 0, wealth = 900000) {
    const match = createMatch(id);
    return {
      ...match, turnIndex: slot,
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
  const eventTypes = (match) => match.eventLog.map((entry) => entry.eventType);
  const countEvent = (match, type) => match.eventLog.filter((entry) => entry.eventType === type).length;

  assert.equal(cards.length, 90, 'the full card set has 90 cards');
  assert.equal(new Set(cards.map(card => card.id)).size, 90, 'card IDs are unique');
  assert.equal(new Set(cards.map(card => card.title)).size, 90, 'card names are unique');
  assert.equal(new Set(cards.map(card => JSON.stringify(card.effects))).size, 90, 'card gameplay outcomes are unique');
  assert.equal(new Set(cards.map(card => card.artCue)).size, 90, 'card art concepts are unique');
  for (const deck of decks) {
    assert.equal(cardsForDeck(deck.id).length, 15, `${deck.name} contains 15 cards`);
    assert.equal(deck.count, 15, `${deck.name} reports 15 cards`);
  }
  const careerTags = new Set(careers.flatMap(career => career.tags));
  const validStats = new Set(['wealth', 'aiSkill', 'fame', 'lifestyle', 'influence']);
  const validEffectTypes = new Set(['ADD_WEALTH', 'REMOVE_WEALTH', 'ADD_AI_SKILL', 'REMOVE_AI_SKILL', 'ADD_FAME', 'REMOVE_FAME', 'ADD_LIFESTYLE', 'REMOVE_LIFESTYLE', 'ADD_INFLUENCE', 'REMOVE_INFLUENCE']);
  function validateCardEffects(effects, cardId) {
    assert(effects.length > 0, `${cardId} has a gameplay effect`);
    for (const effect of effects) {
      if (effect.kind === 'RISK') {
        assert(effect.chance >= 0 && effect.chance <= 1, `${cardId} has a valid risk probability`);
        validateCardEffects(effect.win, cardId);
        validateCardEffects(effect.loss, cardId);
      } else if (effect.kind === 'STAT') {
        assert(validStats.has(effect.stat) && Number.isFinite(effect.amount) && effect.amount !== 0, `${cardId} has a valid stat effect`);
        if (effect.careerTag) assert(careerTags.has(effect.careerTag), `${cardId} uses an existing career tag`);
      } else if (effect.kind === 'TRANSFER_WEALTH') {
        assert(effect.amount > 0 && ['RANDOM_OPPONENT', 'WEALTH_LEADER', 'WEALTH_TRAILER'].includes(effect.target), `${cardId} has a valid wealth transfer`);
      } else if (effect.kind === 'MODIFY_SALARY') {
        assert(Number.isFinite(effect.amount) && effect.amount !== 0, `${cardId} has a valid salary effect`);
        if (effect.careerTag) assert(careerTags.has(effect.careerTag), `${cardId} uses an existing salary career tag`);
      } else if (effect.kind === 'PROTECT') {
        assert((effect.amount ?? 1) > 0, `${cardId} has a valid protection effect`);
        for (const type of effect.blockedEffectTypes ?? []) assert(validEffectTypes.has(type), `${cardId} blocks a valid effect`);
      } else if (effect.kind === 'REWARD_MODIFIER') {
        assert(validStats.has(effect.stat) && Number.isFinite(effect.amount) && effect.amount !== 0, `${cardId} has a valid reward modifier`);
      } else {
        assert.fail(`${cardId} uses an unsupported effect kind`);
      }
    }
  }
  for (const card of cards) {
    validateCardEffects(card.effects, card.id);
    const artPath = getCardArtworkFilePath(card.id);
    assert(artPath, `${card.id} has an artwork mapping`);
    assert(existsSync(new URL(`../public/${artPath}`, import.meta.url)), `${card.id} artwork exists at ${artPath}`);
    const probe = createMatch(id);
    const resolved = resolveEventQueue(probe, [{ type: 'CARD_RESOLVED', playerIndex: 0, deck: card.deck, cardId: card.id, spaceNumber: 1 }]);
    assert(resolved.eventLog.some(entry => entry.eventType === 'CARD_RESOLVED' && entry.detail.includes(card.title)), `${card.id} resolves through the event engine`);
  }

  let seeded = createMatch(id);
  assert.equal(seeded.eventLog.at(-1).eventType, 'TURN_START');
  const seededWealth = seeded.players[0].wealth;
  const seededFame = seeded.players[0].fame;
  seeded = { ...seeded, players: seeded.players.map((player, index) => index ? player : { ...player, careerId: 'degen-trader', characterId: 'idol_core' }) };
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
  const salaryDebug = start(4);
  const originalSalary = salaryDebug.players[0].salaryAmount;
  match = move({
    ...salaryDebug,
    players: salaryDebug.players.map((player, index) => index === 0 ? { ...player, characterId: 'alpha_prime' } : player),
  }, 2);
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
    assert.equal(assets.filter(asset => asset.category === category).length, 10);
  }
  assert.equal(new Set(assets.map(asset => asset.id)).size, assets.length);
  assert.equal(new Set(visualAssets.map(asset => asset.id)).size, visualAssets.length);
  assert(visualAssets.every(asset => existsSync(asset.filePath)));
  assert(Array.from({ length: 75 }, (_, index) => getSpace(index + 1)).every(space => ICON_PATHS[space.icon] && (!space.secondaryIcon || ICON_PATHS[space.secondaryIcon])));
  const offeredCar = getAsset(match.pending.offeredAssetIds[0]);
  const hiddenCar = assets.find(asset => asset.category === 'car' && !match.pending.offeredAssetIds.includes(asset.id));
  assert.equal(advanceMatch(match, { type: 'BUY_ASSET', assetId: hiddenCar.id }), match);
  const poor = { ...match, players: match.players.map((player, index) => index ? player : { ...player, wealth: 0 }) };
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
  let wealthStart = start(1);
  const wealthDrawPile = wealthStart.cardPiles.wealth.drawPile.filter(cardId => cardId !== 'wealth-seed');
  wealthStart = {
    ...wealthStart,
    cardPiles: {
      ...wealthStart.cardPiles,
      wealth: { ...wealthStart.cardPiles.wealth, drawPile: ['wealth-seed', ...wealthDrawPile] },
    },
  };
  const seedWealthBefore = wealthStart.players[0].wealth;
  match = move(wealthStart, 2);
  assert.equal(match.pending.kind, 'CARD');
  assert.equal(match.pending.deck, 'wealth');
  assert.equal(match.pending.cardId, 'wealth-seed');
  assert(eventTypes(match).includes('CARD_DRAW'));
  assertCompleteCardPiles(match.cardPiles);
  match = advanceMatch(match, { type: 'RESOLVE_CARD' });
  assert.equal(match.pending.stage, 'resolved');
  assert.equal(match.players[0].wealth, seedWealthBefore + 12500);
  assert(match.cardPiles.wealth.discardPile.includes('wealth-seed'));
  assert.equal(match.cardPiles.wealth.inFlight.length, 0);
  assertCompleteCardPiles(match.cardPiles);
  match = advanceMatch(match, { type: 'ACKNOWLEDGE_CARD' });
  assert.equal(match.phase, 'landed');
  assert(eventTypes(match).includes('CARD_RESOLVED'));
  const reshuffleTestPile = {
    ...match.cardPiles,
    wealth: {
      drawPile: [],
      discardPile: cardsForDeck('wealth').map(card => card.id),
      inFlight: [],
    },
  };
  const reshuffled = drawCardFromPiles(reshuffleTestPile, 'wealth');
  assert.equal(reshuffled.cardPiles.wealth.drawPile.length, 14);
  assert.equal(reshuffled.cardPiles.wealth.discardPile.length, 0);
  assert.equal(reshuffled.cardPiles.wealth.inFlight.length, 1);
  assertCompleteCardPiles(reshuffled.cardPiles);
  match = move(start(13, 1), 2);
  assert.equal(match.pending.deck, 'gamble');
  const cpuCardId = match.pending.cardId;
  match = advanceMatch(match, { type: 'AUTO_DECIDE' });
  assert.equal(match.phase, 'landed');
  assert(eventTypes(match).includes('CARD_RESOLVED'));
  assert(match.cardPiles.gamble.discardPile.includes(cpuCardId));
  assert.equal(match.cardPiles.gamble.inFlight.length, 0);
  assertCompleteCardPiles(match.cardPiles);
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

  match = start(5);
  match = {
    ...match,
    players: match.players.map((player, index) => {
      if (index === 0) return { ...player, characterId: 'click_click', position: 5 };
      if (index === 1) return { ...player, position: 7 };
      return player;
    }),
  };
  const influenceBefore = match.players[0].influence;
  match = move(match, 2);
  assert(eventTypes(match).includes('LAND_ON_PLAYER'));
  assert.equal(match.players[0].influence, influenceBefore + 5);

  const purchaseDebug = start(8);
  match = move({
    ...purchaseDebug,
    players: purchaseDebug.players.map((player, index) => index === 0 ? { ...player, characterId: 'hotwired', careerId: 'real-estate-investor', wealth: 900000 } : player),
  }, 2);
  const lifestyleBefore = match.players[0].lifestyle;
  const carId = match.pending.offeredAssetIds[0];
  match = advanceMatch(match, { type: 'BUY_ASSET', assetId: carId });
  assert.equal(match.players[0].lifestyle, lifestyleBefore + (getAsset(carId).effects.lifestyle ?? 0) + 5);
  console.log('PASS: 90 unique cards, effects and artwork; finite piles and reshuffle; existing careers, assets and CPU turns');
} finally {
  await vite.close();
}