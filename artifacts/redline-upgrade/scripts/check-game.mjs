import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

// Fixtures must not depend on random careers/abilities (use withoutAbilities). Set
// CHECK_SEED=<n> to replay a run with a seeded Math.random; the default is unseeded.
const seedArg = process.env.CHECK_SEED ?? 'random';
if (seedArg !== 'random') {
  let state = Number(seedArg) >>> 0;
  Math.random = () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Vite loads the same TypeScript game modules as the app, without a browser.
const vite = await createServer({
  configFile: false,
  plugins: [react()],
  resolve: { alias: { '@': new URL('../src/', import.meta.url).pathname } },
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true },
  appType: 'custom',
});
try {
  const { createMatch, advanceMatch } = await vite.ssrLoadModule('/src/game/match.ts');
  const { effectiveSalaryAmount } = await vite.ssrLoadModule('/src/game/player.ts');
  const { cards, cardsForDeck } = await vite.ssrLoadModule('/src/game/cards.ts');
  const { CARD_READ_MINIMUM_SECONDS, CPU_CARD_AUTO_CONTINUE_MS, CPU_CARD_RESULT_SECONDS } = await vite.ssrLoadModule('/src/game/card-reveal-timing.ts');
  const { decks } = await vite.ssrLoadModule('/src/game/decks.ts');
  const { getCardArtworkFilePath, getCardArtworkUrl } = await vite.ssrLoadModule('/src/game/card-artwork.ts');
  const { assertCompleteCardPiles, drawCardFromPiles } = await vite.ssrLoadModule('/src/game/card-piles.ts');
  const { resolveEventQueue } = await vite.ssrLoadModule('/src/game/event-engine.ts');
  const { abilities, getAbility } = await vite.ssrLoadModule('/src/game/abilities.ts');
  const { characters } = await vite.ssrLoadModule('/src/game/characters.ts');
  const { careers, categories, getCareer, FINISH_ORDER_WEALTH_REWARDS, STARTING_ATTRIBUTE_POINTS } = await vite.ssrLoadModule('/src/game/careers.ts');
  for (const career of careers) {
    const points = Object.values(career.statModifiers).reduce((sum, value) => sum + value, 0);
    assert.equal(points, STARTING_ATTRIBUTE_POINTS, `${career.id} starts with the shared ${STARTING_ATTRIBUTE_POINTS} career attribute points`);
  }
  const { getPublicAssetUrl } = await vite.ssrLoadModule('/src/lib/public-asset-url.ts');
  const { CharacterPortrait } = await vite.ssrLoadModule('/src/components/character-portrait.tsx');
  const { AssetArtwork } = await vite.ssrLoadModule('/src/components/asset-artwork.tsx');
  const { PlayerAbilityDetails } = await vite.ssrLoadModule('/src/components/player-ability-details.tsx');
  const { PlayerAssets } = await vite.ssrLoadModule('/src/components/player-assets.tsx');
  const { MilestoneChoice } = await vite.ssrLoadModule('/src/components/milestone-choice.tsx');
  const { CardTabletop } = await vite.ssrLoadModule('/src/components/card-tabletop.tsx');
  const { RedlineCard } = await vite.ssrLoadModule('/src/components/redline-card.tsx');
  const { EndgameAttributeBonusSummary } = await vite.ssrLoadModule('/src/components/endgame-attribute-bonus-summary.tsx');
  const { AbilityActivationBanner, PlayerStatChangeOverlay, PLAYER_CHANGE_FEEDBACK_MS, SpaceRewardBanner, formatPlayerStatChange, formatSpaceFeedbackOutcome, getPlayerStatChangePulseDuration, groupPlayerStatChangesByPlayer } = await vite.ssrLoadModule('/src/components/game-event-feedback.tsx');
  const { BOARD_SPACES, PAYDAY_SPACES, getSpace } = await vite.ssrLoadModule('/src/game/board-data.ts');
  const { getSpaceVisual } = await vite.ssrLoadModule('/src/components/board-space-visuals.ts');
  const { BOARD_EFFECTS } = await vite.ssrLoadModule('/src/game/board-effects.ts');
  const { getAsset, assets, MAX_ASSET_LEVEL } = await vite.ssrLoadModule('/src/game/assets.ts');
  const { getAssetArtworkFilePath, getAssetArtworkFilePathForLevel, getAssetArtworkUrl } = await vite.ssrLoadModule('/src/game/asset-artwork.ts');
  const { evaluateEndGameTitle } = await vite.ssrLoadModule('/src/game/endgame-titles.ts');
  const {
    calculateEndgameBaseValue,
    cashOutValue,
    doubleDownValue,
    finalGambleValue,
    createFinishSnapshot,
  } = await vite.ssrLoadModule('/src/game/endgame.ts');
  const { availableUpgradeTokens, getEligibleRecoveryMilestones } = await vite.ssrLoadModule('/src/game/upgrade-tokens.ts');
  const { visualAssets } = await vite.ssrLoadModule('/src/game/asset-manifest.ts');
  const { ICON_PATHS } = await vite.ssrLoadModule('/src/game/icon-paths.ts');
  const id = characters[0].id;

  assert.equal(getPublicAssetUrl('/characters/idol_core.png', '/redline-upgrade'), '/redline-upgrade/characters/idol_core.png');
  assert.equal(getPublicAssetUrl('characters/danger_zone.png', '/redline-upgrade/'), '/redline-upgrade/characters/danger_zone.png');
  assert.equal(getPublicAssetUrl('characters/the_tank.png', '/'), '/characters/the_tank.png');
  assert.equal(new Set(characters.map(character => character.imagePath)).size, 21, 'all characters reference distinct portrait files');
  for (const character of characters) {
    assert(existsSync(new URL(`../public/${character.imagePath}`, import.meta.url)), `${character.name} portrait exists at ${character.imagePath}`);
    const portraitMarkup = renderToStaticMarkup(React.createElement(CharacterPortrait, { character }));
    assert(portraitMarkup.includes(`src="/${character.imagePath}"`), `${character.name} portrait renders at its public URL`);
  }
  for (const characterId of ['idol_core', 'danger_zone', 'the_tank']) {
    const character = characters.find(entry => entry.id === characterId);
    assert(character, `${characterId} remains in the roster`);
    assert(existsSync(new URL(`../public/${character.imagePath}`, import.meta.url)), `${characterId} portrait asset is present`);
  }

  for (const character of characters) {
    for (const career of careers) {
      const abilityMarkup = renderToStaticMarkup(React.createElement(PlayerAbilityDetails, { career, character }));
      assert(abilityMarkup.includes('CAREER ABILITY') && abilityMarkup.includes(career.abilityName), `${career.name} ability is visible on player cards`);
      assert(abilityMarkup.includes('CHARACTER ABILITY') && abilityMarkup.includes(character.abilityName), `${character.name} ability is visible on player cards`);
      assert(abilityMarkup.includes(career.abilityDescription) && abilityMarkup.includes(character.abilityDescription), 'player cards include concise ability descriptions');
    }
  }

  const feedbackEvent = {
    id: 'phase13-ability-fixture',
    kind: 'EVENT',
    eventType: 'ROLL_OF_8',
    source: 'ABILITY',
    playerId: 'phase13-fixture',
    abilityId: 'character:guardian_h',
    label: 'HOLD THE LINE',
    detail: 'Triggered by ROLL OF 8. Protected from penalty.',
    amount: 20000,
    round: 1,
    turnIndex: 0,
    depth: 1,
    timestamp: 0,
  };
  const abilityBannerMarkup = renderToStaticMarkup(React.createElement(AbilityActivationBanner, {
    notice: { event: feedbackEvent, playerName: 'Guardian H', abilityType: 'CHARACTER' },
  }));
  assert(abilityBannerMarkup.includes('ABILITY ACTIVATED'));
  assert(abilityBannerMarkup.includes('Guardian H / CHARACTER'));
  assert(abilityBannerMarkup.includes('ROLL OF 8') && abilityBannerMarkup.includes('Protected from penalty.'));
  assert.match(formatSpaceFeedbackOutcome({ ...feedbackEvent, eventType: 'AI_SKILL_CHANGED', amount: 2 }), /\+2 AI SKILL/);
  assert.match(formatSpaceFeedbackOutcome({ ...feedbackEvent, eventType: 'UPGRADE_TOKEN_GAINED', amount: 1 }), /\+1 UPGRADE TOKEN/);
  assert.match(formatSpaceFeedbackOutcome({ ...feedbackEvent, eventType: 'WEALTH_CHANGED', amount: 20000 }), /WEALTH/);
  const cardSourceEvent = { ...feedbackEvent, id: 'phase15-card-source', eventType: 'CARD_RESOLVED', source: 'GAME', abilityId: undefined, deck: 'wealth', cardId: 'wealth-card' };
  const careerSourceEvent = { ...feedbackEvent, id: 'phase15-career-source', eventType: 'CAREER_CHANGE', source: 'ABILITY', abilityId: 'career:sample' };
  const influenceEvent = { ...feedbackEvent, id: 'phase15-influence', eventType: 'INFLUENCE_CHANGED', stat: 'influence', previousValue: 2, newValue: 3, delta: 1 };
  const wealthEvent = { ...feedbackEvent, id: 'phase15-wealth', eventType: 'WEALTH_CHANGED', source: 'EFFECT', sourceEventId: cardSourceEvent.id, abilityId: undefined, stat: 'wealth', previousValue: 50000, newValue: 60000, delta: 10000, baseDelta: 8000 };
  const targetedFameEvent = { ...feedbackEvent, id: 'phase15-targeted-fame', playerId: 'recipient-player', eventType: 'FAME_CHANGED', source: 'EFFECT', sourceEventId: careerSourceEvent.id, abilityId: careerSourceEvent.abilityId, stat: 'fame', previousValue: 3, newValue: 1, delta: -2 };
  const influenceImpact = formatPlayerStatChange(influenceEvent, [influenceEvent]);
  const wealthImpact = formatPlayerStatChange(wealthEvent, [cardSourceEvent, wealthEvent]);
  const exactWealthImpact = formatPlayerStatChange({ ...wealthEvent, id: 'phase15-exact-wealth', previousValue: 0, newValue: 12345, delta: 12345, baseDelta: 12345 }, [cardSourceEvent]);
  const targetedFameImpact = formatPlayerStatChange(targetedFameEvent, [careerSourceEvent, targetedFameEvent]);
  assert.equal(influenceImpact?.amountText, '+1', 'attribute feedback shows its exact signed delta');
  assert.equal(wealthImpact?.amountText, '+$10K', 'Wealth feedback includes the signed currency delta');
  assert.equal(exactWealthImpact?.amountText, '+$12.345K', 'non-round Wealth amounts use a lossless compact label');
  assert.equal(wealthImpact?.sourceLabel, 'WEALTH CARD · CAREER BONUS', 'card source and career reward modifier remain identifiable');
  assert.equal(targetedFameImpact?.amountText, '−2', 'negative attribute feedback uses a signed negative delta');
  assert.equal(targetedFameImpact?.sourceLabel, 'CAREER ABILITY', 'ability-driven changes name their source family');
  assert.equal(PLAYER_CHANGE_FEEDBACK_MS, 20000, 'each change has a bounded display window');
  assert.equal(getPlayerStatChangePulseDuration(11000, [11000, 11000, 11000, 11000], 1000), 2000, 'same-player changes receive sequential time within the shared display window');
  assert.equal(getPlayerStatChangePulseDuration(11000, [13000], 1000), 5000, 'a change is capped at a readable pulse duration');
  for (const cardId of ['lifestyle-biohack', 'lifestyle-home-gym']) {
    const affinityCard = cards.find(card => card.id === cardId);
    assert.match(affinityCard?.description ?? '', /Lifestyle affinity/i, `${cardId} uses the attribute affinity terminology`);
    assert.doesNotMatch(affinityCard?.description ?? '', /Performance careers/i);
  }
  assert(influenceImpact && wealthImpact && targetedFameImpact, 'all sample player stat changes are available for rendering');
  const groupedImpacts = groupPlayerStatChangesByPlayer(
    [targetedFameEvent, { ...targetedFameEvent, id: 'phase15-unknown-player', playerId: 'unknown-player' }],
    [careerSourceEvent, targetedFameEvent],
    new Set(['recipient-player']),
  );
  assert.equal(groupedImpacts.get('recipient-player')?.length, 1, 'an effect is attributed to the affected player card');
  assert(!groupedImpacts.has('unknown-player'), 'stat changes for players outside the match are ignored');
  const playerStatMarkup = renderToStaticMarkup(React.createElement(PlayerStatChangeOverlay, {
    playerIndex: 1,
    surface: 'summary',
    change: { ...wealthImpact, durationMs: 2000 },
  }));
  assert(playerStatMarkup.includes('+$10K') && playerStatMarkup.includes('WEALTH CARD') && playerStatMarkup.includes('player-stat-change-1-wealth-summary'), 'stat pulse includes the exact delta, source, and affected card');
  const negativeStatMarkup = renderToStaticMarkup(React.createElement(PlayerStatChangeOverlay, {
    playerIndex: 2,
    surface: 'detail',
    change: { ...targetedFameImpact, durationMs: 2000 },
  }));
  assert(negativeStatMarkup.includes('negative') && negativeStatMarkup.includes('−2') && negativeStatMarkup.includes('CAREER ABILITY'), 'negative styling and source remain visible on the changed attribute');
  const rewardBannerMarkup = renderToStaticMarkup(React.createElement(SpaceRewardBanner, {
    event: feedbackEvent,
    playerName: 'Guardian H',
    spaceLabel: 'UPGRADE TOKEN',
    outcome: '+1 UPGRADE TOKEN',
  }));
  assert(rewardBannerMarkup.includes('+1 UPGRADE TOKEN') && rewardBannerMarkup.includes('UPGRADE TOKEN'));
  assert.equal(CPU_CARD_AUTO_CONTINUE_MS, 4600, 'CPU card reveal and result stages fit within the five-second target');
  assert(CPU_CARD_AUTO_CONTINUE_MS <= 5000, 'CPU card reveal cannot block gameplay beyond five seconds');

  for (const deck of decks) {
    const deckCards = cardsForDeck(deck.id);
    assert.equal(deckCards.length, deck.count, `${deck.name} deck count matches its metadata`);
    assert(deckCards.every(card => getCardArtworkUrl(card.id)?.endsWith(getCardArtworkFilePath(card.id))), `${deck.name} cards expose public artwork URLs`);
    const card = deckCards[0];
    for (const cardStage of ['draw', 'resolved']) {
      const cardMarkup = renderToStaticMarkup(React.createElement(CardTabletop, {
        activeDeck: deck.id,
        activeCard: card,
        cardStage,
        actorName: 'Frostbyte',
        actorLabel: 'CPU 1',
        isCPU: true,
        resultSummary: 'Frostbyte received the recorded card result.',
      }));
      assert(cardMarkup.includes(`${deck.name} CARD`), `${deck.name} card panel identifies its deck`);
      assert(cardMarkup.includes(card.title) && cardMarkup.includes(card.effect), `${deck.name} card image, name, and effect are visible`);
      assert(cardMarkup.includes(`src="${getCardArtworkUrl(card.id)}"`), `${deck.name} draw card loads the artwork mapped to ${card.id}`);
      assert(cardMarkup.includes(`data-testid="deck-bay-${deck.id}"`), `${deck.name} stays visible in the non-interactive deck bay`);
      assert(!cardMarkup.includes(`button-preview-deck-${deck.id}`), `${deck.name} deck card is not a preview button`);
      assert(!cardMarkup.includes('PREVIEW NEXT CARD') && !cardMarkup.includes('tabletop-preview'), 'card previews and next-card controls are absent');
      assert(cardMarkup.includes('CPU 1') && cardMarkup.includes('Frostbyte drew this card.'), `${deck.name} draw identifies its player`);
      assert(cardMarkup.includes(cardStage === 'draw' ? `CARD READ / ${CARD_READ_MINIMUM_SECONDS} SEC` : `AUTO-CONTINUE / ${CPU_CARD_RESULT_SECONDS} SEC`), `${deck.name} CPU progress shows the active timed stage`);
      if (cardStage === 'resolved') assert(cardMarkup.includes('RESULT RECORDED // CPU CONTINUES AUTOMATICALLY'), `${deck.name} CPU result stage explains automatic continuation`);
      assert(cardStage === 'draw'
        ? cardMarkup.includes('card is revealed to the table')
        : cardMarkup.includes('Frostbyte received the recorded card result.'), `${deck.name} draw and result are visible to the local table`);
    }
  }
  for (const card of cards) {
    const artworkPath = getCardArtworkFilePath(card.id);
    assert.equal(artworkPath, card.artworkPath, `${card.id} resolves its declared artwork`);
    assert(artworkPath && existsSync(new URL(`../public/${artworkPath}`, import.meta.url)), `${card.id} artwork exists at ${artworkPath}`);
    assert.equal(getCardArtworkUrl(card.id), getPublicAssetUrl(artworkPath, '/'), `${card.id} artwork URL uses the artifact root base`);
    const cardMarkup = renderToStaticMarkup(React.createElement(RedlineCard, {
      deck: card.deck,
      face: 'front',
      card,
    }));
    assert(cardMarkup.includes(`src="${getCardArtworkUrl(card.id)}"`), `${card.id} front renders its own artwork`);
    assert(cardMarkup.includes(`data-card-id="${card.id}"`), `${card.id} artwork is identifiable in the DOM`);
    assert(cardMarkup.includes('loading="eager"'), `${card.id} artwork is not deferred by lazy loading`);
  }

  for (let i = 0; i < 50; i++) {
    const match = createMatch(id);
    assert.equal(match.players.length, 4);
    assert.equal(new Set(match.players.map(player => player.careerId)).size, 4);
    assert(match.players.every(player => player.salaryAmount === getCareer(player.careerId).salaryTiers[player.salaryTier - 1]));
    assert(match.players.every(player => player.wealth === player.salaryAmount), 'starting Wealth equals assigned salary for every player');
    assert(match.players.some(player => !player.isCPU && player.wealth === player.salaryAmount), 'human starting Wealth equals assigned salary');
    assert(match.players.filter(player => player.isCPU).every(player => player.wealth === player.salaryAmount), 'CPU starting Wealth equals assigned salary');
    const doctor = match.players.find(player => player.careerId === 'doctor');
    if (doctor) assert.equal(doctor.upgradeTokens, 1, 'Doctor grants one acquisition Upgrade Token');
    assert(match.players.filter(player => player.careerId !== 'doctor').every(player => player.upgradeTokens === 0), 'no other initially assigned career grants a token');
    assertCompleteCardPiles(match.cardPiles);
  }
  function start(position, slot = 0, wealth = 900000) {
    const match = createMatch(id);
    return {
      ...match, turnIndex: slot,
      players: match.players.map((player, index) => index === slot ? { ...player, position, wealth } : player),
    };
  }
  function startWithoutProtection(position, slot = 0, wealth = 900000) {
    return { ...start(position, slot, wealth), effectProtections: {} };
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
  function readyWithPlayer(base, playerIndex, updates) {
    return {
      ...base,
      phase: 'ready',
      pending: null,
      turnIndex: playerIndex,
      stepsRemaining: 0,
      players: base.players.map((player, index) => index === playerIndex ? { ...player, ...updates } : player),
    };
  }
  function withoutAbilities(base, activePlayerIndex = -1, activeCharacterId = '__test_no_ability__') {
    return {
      ...base,
      players: base.players.map((player, index) => ({
        ...player,
        characterId: index === activePlayerIndex ? activeCharacterId : '__test_no_ability__',
        careerId: null,
      })),
    };
  }
  function withRandomValue(value, callback) {
    const originalRandom = Math.random;
    Math.random = () => value;
    try {
      return callback();
    } finally {
      Math.random = originalRandom;
    }
  }
  function abilityFixture(careerIds = []) {
    const base = withoutAbilities(createMatch(id));
    return {
      ...base,
      phase: 'ready',
      pending: null,
      turnIndex: 0,
      round: 1,
      turnCounter: 10,
      eventLog: [],
      eventCursor: 0,
      abilityUsage: {},
      effectProtections: {},
      players: base.players.map((player, index) => {
        const careerId = careerIds[index] ?? null;
        const career = careerId ? getCareer(careerId) : undefined;
        return {
          ...player,
          characterId: '__test_no_ability__',
          careerId,
          salaryTier: career ? 1 : 0,
          salaryAmount: career?.salaryTiers[0] ?? 0,
          secondCareer: null,
          wealth: 100_000,
          aiSkill: 0,
          fame: 0,
          lifestyle: 0,
          influence: 0,
          position: 7,
          equipment: { car: null, lifestyle: null, companion: null, property: null },
          assetLevels: {},
          upgradeTokens: 0,
          heldUpgradeTokens: 0,
          skipTurns: 0,
        };
      }),
    };
  }
  const playerEvent = (type, playerIndex, extra = {}) => ({ type, playerIndex, ...extra });

  const creatorFixture = abilityFixture(['content-creator']);
  creatorFixture.players[0].aiSkill = 3;
  const creatorGain = playerEvent('AI_SKILL_CHANGED', 0, { stat: 'aiSkill', previousValue: 2, newValue: 3, delta: 1 });
  const creatorPending = resolveEventQueue(creatorFixture, [
    creatorGain,
  ]);
  assert.equal(creatorPending.pending?.kind, 'ABILITY', 'Content Creator pauses for a stat destination');
  assert.equal(creatorPending.pending?.decision, 'STAT_DESTINATION');
  const creatorMarkup = renderToStaticMarkup(React.createElement(MilestoneChoice, {
    pending: creatorPending.pending,
    player: creatorPending.players[0],
    players: creatorPending.players,
    onAction: () => undefined,
  }));
  assert(creatorMarkup.includes('button-ability-stat-aiSkill') && creatorMarkup.includes('button-ability-stat-influence'), 'the Content Creator decision offers all three destinations');
  const creatorResolved = advanceMatch(creatorPending, { type: 'RESOLVE_ABILITY_STAT_DESTINATION', stat: 'fame' });
  assert.equal(creatorResolved.players[0].aiSkill, 2, 'Content Creator removes the gain from its original stat');
  assert.equal(creatorResolved.players[0].fame, 1, 'Content Creator adds the gain to the selected stat');
  const cpuCreatorFixture = abilityFixture(['content-creator']);
  cpuCreatorFixture.players[0].isCPU = true;
  cpuCreatorFixture.players[0].aiSkill = 3;
  const cpuCreatorPending = resolveEventQueue(cpuCreatorFixture, [
    creatorGain,
  ]);
  const cpuCreatorMarkup = renderToStaticMarkup(React.createElement(MilestoneChoice, {
    pending: cpuCreatorPending.pending,
    player: cpuCreatorPending.players[0],
    players: cpuCreatorPending.players,
    onAction: () => undefined,
  }));
  assert(cpuCreatorMarkup.includes('status-cpu-decision'), 'CPU-owned ability decisions show the automatic-decision state');
  const cpuCreatorResolved = advanceMatch(cpuCreatorPending, { type: 'AUTO_DECIDE' });
  assert.equal(cpuCreatorResolved.pending, null, 'CPU stat choices resolve without human input');

  const aiEngineerFixture = abilityFixture(['ai-engineer']);
  const aiEngineerGain = playerEvent('AI_SKILL_CHANGED', 0, { stat: 'aiSkill', previousValue: 0, newValue: 1, delta: 1 });
  let aiEngineerResult = resolveEventQueue(aiEngineerFixture, [aiEngineerGain]);
  assert.equal(aiEngineerResult.players[0].wealth, 107_500, 'AI Engineer earns $7,500 when gaining AI Skill');
  aiEngineerResult = resolveEventQueue(aiEngineerResult, [aiEngineerGain]);
  assert.equal(aiEngineerResult.players[0].wealth, 107_500, 'AI Engineer earns the bonus only once per turn');
  const degenFixture = abilityFixture(['degen-trader']);
  let degenResult = resolveEventQueue(degenFixture, [playerEvent('ROLL_OF_8', 0, { total: 8 })]);
  assert.equal(degenResult.players[0].wealth, 150_000, 'Degen Trader gains $50,000 on an 8');
  degenResult = resolveEventQueue(degenResult, [playerEvent('ROLL_OF_8', 0, { total: 8 })]);
  assert.equal(degenResult.players[0].wealth, 150_000, 'Degen Trader bonus is limited to once per turn');
  const thiefFixture = abilityFixture(['thief']);
  thiefFixture.players[1].wealth = 12_000;
  const thiefResult = resolveEventQueue(thiefFixture, [playerEvent('ROLL_OF_2_OR_8', 1, { total: 2 })]);
  assert.equal(thiefResult.players[0].wealth, 112_000, 'Thief takes available Wealth from another player');
  assert.equal(thiefResult.players[1].wealth, 0, 'Thief transfer never reduces a player below zero Wealth');

  const cars = assets.filter(asset => asset.category === 'car');
  const properties = assets.filter(asset => asset.category === 'property');
  assert(cars.length > 1 && properties.length > 0, 'asset interaction fixtures have Cars and Properties');
  const raceDriverFixture = abilityFixture(['race-driver']);
  raceDriverFixture.players[0].equipment.car = cars[0].id;
  raceDriverFixture.players[0].assetLevels[cars[0].id] = 2;
  raceDriverFixture.players[1].equipment.car = cars[1].id;
  raceDriverFixture.players[1].assetLevels[cars[1].id] = 3;
  const raceDriverPending = resolveEventQueue(raceDriverFixture, [
    playerEvent('LAND_ON_PLAYER', 0, { targetPlayerId: raceDriverFixture.players[1].playerId, targetPlayerIndex: 1, spaceNumber: 7 }),
  ]);
  assert.equal(raceDriverPending.pending?.decision, 'ASSET_INTERACTION', 'Race Driver pauses for a Car interaction');
  const raceDriverMarkup = renderToStaticMarkup(React.createElement(MilestoneChoice, {
    pending: raceDriverPending.pending,
    player: raceDriverPending.players[0],
    players: raceDriverPending.players,
    onAction: () => undefined,
  }));
  assert(raceDriverMarkup.includes('button-ability-asset-transfer') && raceDriverMarkup.includes('button-ability-asset-decline'), 'human asset decisions offer transfer and decline controls');
  const raceDriverResolved = advanceMatch(raceDriverPending, { type: 'RESOLVE_ABILITY_ASSET_INTERACTION', choice: 'SWAP' });
  assert.equal(raceDriverResolved.players[0].equipment.car, cars[1].id);
  assert.equal(raceDriverResolved.players[1].equipment.car, cars[0].id);
  assert.equal(raceDriverResolved.players[0].assetLevels[cars[1].id], 3, 'each Car keeps its level when swapped');
  assert.equal(raceDriverResolved.players[1].assetLevels[cars[0].id], 2, 'the other Car keeps its level when swapped');
  assert(eventTypes(raceDriverResolved).includes('ASSET_TRANSFERRED') && eventTypes(raceDriverResolved).includes('ASSET_ACQUIRED'), 'Car swaps are recorded as transfers and acquisitions');
  const cpuRaceDriver = abilityFixture(['race-driver']);
  cpuRaceDriver.players[0].isCPU = true;
  cpuRaceDriver.players[1].equipment.car = cars[1].id;
  cpuRaceDriver.players[1].assetLevels[cars[1].id] = 3;
  const cpuRacePending = resolveEventQueue(cpuRaceDriver, [
    playerEvent('LAND_ON_PLAYER', 0, { targetPlayerId: cpuRaceDriver.players[1].playerId, targetPlayerIndex: 1, spaceNumber: 7 }),
  ]);
  const cpuRaceResolved = advanceMatch(cpuRacePending, { type: 'AUTO_DECIDE' });
  assert.equal(cpuRaceResolved.players[0].equipment.car, cars[1].id, 'CPU Race Driver choices resolve automatically');
  assert.equal(cpuRaceResolved.players[1].equipment.car, null);

  const propertyInvestor = abilityFixture(['real-estate-investor']);
  propertyInvestor.players[1].equipment.property = properties[0].id;
  propertyInvestor.players[1].assetLevels[properties[0].id] = 2;
  const propertyPending = resolveEventQueue(propertyInvestor, [
    playerEvent('LAND_ON_PLAYER', 0, { targetPlayerId: propertyInvestor.players[1].playerId, targetPlayerIndex: 1, spaceNumber: 7 }),
  ]);
  assert.equal(propertyPending.pending?.decision, 'ASSET_INTERACTION', 'Real Estate Investor can interact with another player’s Property');
  const propertyResolved = advanceMatch(propertyPending, { type: 'RESOLVE_ABILITY_ASSET_INTERACTION', choice: 'STEAL' });
  assert.equal(propertyResolved.players[0].equipment.property, properties[0].id);
  assert.equal(propertyResolved.players[0].assetLevels[properties[0].id], 2, 'stolen Property retains its upgrade level');
  assert.equal(propertyResolved.players[1].equipment.property, null);

  const founderFixture = abilityFixture(['startup-founder']);
  founderFixture.players[0].equipment.car = cars[0].id;
  founderFixture.players[0].assetLevels[cars[0].id] = 1;
  const founderResult = resolveEventQueue(founderFixture, [
    playerEvent('ASSET_ACQUIRED', 0, { assetId: cars[0].id, assetName: cars[0].name, assetLevel: 1, category: 'car' }),
  ]);
  assert.equal(founderResult.players[0].assetLevels[cars[0].id], 2, 'Startup Founder upgrades each acquired asset to Level 2');
  assert(eventTypes(founderResult).includes('ASSET_UPGRADED'), 'the free Startup Founder upgrade is recorded');

  const trainerFixture = abilityFixture(['personal-trainer']);
  trainerFixture.players[1].position = 7;
  trainerFixture.players[2].position = 7;
  trainerFixture.players[3].position = 8;
  const trainerResult = resolveEventQueue(trainerFixture, [playerEvent('LAND_ON_SPACE', 0, { spaceNumber: 7 })]);
  assert.equal(trainerResult.players[0].lifestyle, 1, 'Personal Trainer gains Lifestyle when landing with other players');
  assert.equal(trainerResult.players[1].skipTurns, 1);
  assert.equal(trainerResult.players[2].skipTurns, 1);
  assert.equal(trainerResult.players[3].skipTurns, 0, 'Personal Trainer only affects other players on that space');
  const afterSkippedTurns = advanceMatch({ ...trainerResult, phase: 'landed', turnIndex: 0 }, { type: 'NEXT_TURN' });
  assert.equal(afterSkippedTurns.turnIndex, 3, 'players who must skip are passed over before the next active turn');
  assert.equal(afterSkippedTurns.players[1].skipTurns, 0);
  assert.equal(afterSkippedTurns.players[2].skipTurns, 0);

  const cyberFixture = abilityFixture(['cybersecurity-specialist']);
  cyberFixture.players[0].aiSkill = 2;
  const cyberResult = resolveEventQueue(cyberFixture, [
    playerEvent('LAND_ON_PLAYER', 0, { targetPlayerId: cyberFixture.players[1].playerId, targetPlayerIndex: 1, spaceNumber: 7 }),
  ]);
  assert.equal(cyberResult.players[0].aiSkill, 3, 'Cybersecurity Specialist steals one AI Skill');
  assert.equal(cyberResult.players[1].aiSkill, -1, 'AI Skill can become negative after it is stolen');
  const entertainerFixture = abilityFixture(['entertainer']);
  const entertainerResult = resolveEventQueue(entertainerFixture, [
    playerEvent('LAND_ON_PLAYER', 0, { targetPlayerId: entertainerFixture.players[1].playerId, targetPlayerIndex: 1, spaceNumber: 7 }),
  ]);
  assert.equal(entertainerResult.players[0].fame, 1, 'Entertainer steals one Fame');
  assert.equal(entertainerResult.players[1].fame, -1, 'Fame can become negative after it is stolen');

  const executiveFixture = abilityFixture(['corporate-executive', 'gig-worker']);
  const secondJob = getCareer('ai-engineer');
  executiveFixture.players[1].secondCareer = {
    careerId: secondJob.id,
    salaryTier: 4,
    salaryAmount: secondJob.salaryTiers[3],
  };
  const executivePending = resolveEventQueue(executiveFixture, [
    playerEvent('LAND_ON_PLAYER', 0, { targetPlayerId: executiveFixture.players[1].playerId, targetPlayerIndex: 1, spaceNumber: 7 }),
  ]);
  assert.equal(executivePending.pending?.decision, 'CAREER_SWAP', 'Corporate Executive can choose whether to swap career packages');
  const executiveMarkup = renderToStaticMarkup(React.createElement(MilestoneChoice, {
    pending: executivePending.pending,
    player: executivePending.players[0],
    players: executivePending.players,
    onAction: () => undefined,
  }));
  assert(executiveMarkup.includes('button-ability-career-swap') && executiveMarkup.includes('button-ability-career-decline'), 'career swap decisions explain both choices');
  const executiveResolved = advanceMatch(executivePending, { type: 'RESOLVE_ABILITY_CAREER_SWAP', accept: true });
  assert.equal(executiveResolved.players[0].careerId, 'gig-worker');
  assert.equal(executiveResolved.players[0].secondCareer?.careerId, 'ai-engineer', 'career swaps carry the complete second-career package');
  assert.equal(executiveResolved.players[1].careerId, 'corporate-executive');
  assert.equal(executiveResolved.players[1].secondCareer, null);
  assert.equal(executiveResolved.players[0].aiSkill, executiveFixture.players[0].aiSkill, 'career swaps do not transfer stats');
  assert(eventTypes(executiveResolved).includes('CAREER_SWAPPED'), 'career swaps are recorded');
  const cpuExecutiveFixture = abilityFixture(['corporate-executive', 'doctor']);
  cpuExecutiveFixture.players[0].isCPU = true;
  cpuExecutiveFixture.players[1].salaryTier = 4;
  cpuExecutiveFixture.players[1].salaryAmount = getCareer('doctor').salaryTiers[3];
  const cpuExecutivePending = resolveEventQueue(cpuExecutiveFixture, [
    playerEvent('LAND_ON_PLAYER', 0, { targetPlayerId: cpuExecutiveFixture.players[1].playerId, targetPlayerIndex: 1, spaceNumber: 7 }),
  ]);
  const cpuExecutiveResolved = advanceMatch(cpuExecutivePending, { type: 'AUTO_DECIDE' });
  assert.equal(cpuExecutiveResolved.players[0].careerId, 'doctor', 'CPU career swaps accept a higher effective salary');
  assert.equal(cpuExecutiveResolved.players[0].upgradeTokens, 1, 'newly acquiring Doctor through a swap grants its token');

  const alienFixture = abilityFixture(['alien', 'lawyer']);
  const alienResult = resolveEventQueue(alienFixture, [
    playerEvent('LAND_ON_PLAYER', 1, { targetPlayerId: alienFixture.players[0].playerId, targetPlayerIndex: 0, spaceNumber: 7 }),
  ]);
  assert.equal(alienResult.pending, null, 'Alien career swaps are forced without asking either player');
  assert.equal(alienResult.players[0].careerId, 'lawyer');
  assert.equal(alienResult.players[1].careerId, 'alien');
  assert(eventTypes(alienResult).includes('CAREER_SWAPPED'), 'Alien forced swaps are recorded');

  const doctorCareerChange = abilityFixture(['lawyer']);
  doctorCareerChange.phase = 'decision';
  doctorCareerChange.pending = { kind: 'CAREER', space: 35, stage: 'offers', options: ['doctor', 'ai-engineer'] };
  const newlyDoctor = advanceMatch(doctorCareerChange, { type: 'SELECT_CAREER', careerId: 'doctor' });
  assert.equal(newlyDoctor.players[0].upgradeTokens, 1, 'switching into Doctor grants one acquisition token');

  const gigWorkerStart = abilityFixture(['gig-worker']);
  gigWorkerStart.players[0].position = 33;
  const gigWorkerAt35 = withRandomValue(0.37, () => move(gigWorkerStart, 2));
  assert.equal(gigWorkerAt35.players[0].careerId, 'gig-worker', 'Gig Worker remains the primary career at space 35');
  assert(gigWorkerAt35.players[0].secondCareer, 'Gig Worker receives one second-career package at space 35');
  assert.equal(gigWorkerAt35.pending, null, 'Gig Worker bypasses the normal career-change prompt');
  assert(eventTypes(gigWorkerAt35).includes('SECOND_CAREER_ACQUIRED'), 'the second career is logged');
  const eligibleSecondCareers = careers.filter(career => career.id !== 'gig-worker');
  const doctorSelectionRoll = (eligibleSecondCareers.findIndex(career => career.id === 'doctor') + 0.5) / eligibleSecondCareers.length;
  const gigDoctorFixture = abilityFixture(['gig-worker']);
  gigDoctorFixture.players[0].position = 33;
  const gigDoctorAt35 = withRandomValue(doctorSelectionRoll, () => move(gigDoctorFixture, 2));
  assert.equal(gigDoctorAt35.players[0].secondCareer?.careerId, 'doctor', 'Gig Worker can receive Doctor as its second career');
  assert.equal(gigDoctorAt35.players[0].upgradeTokens, 1, 'a Doctor second career grants its acquisition token');
  const gigDegen = abilityFixture(['gig-worker']);
  const degenCareer = getCareer('degen-trader');
  gigDegen.players[0].secondCareer = { careerId: degenCareer.id, salaryTier: 1, salaryAmount: degenCareer.salaryTiers[0] };
  const gigDegenResult = resolveEventQueue(gigDegen, [playerEvent('ROLL_OF_8', 0, { total: 8 })]);
  assert.equal(gigDegenResult.players[0].wealth, 150_000, 'a Gig Worker second career participates in career ability checks');
  const gigSalaryFixture = abilityFixture(['gig-worker']);
  const gigPrimary = getCareer('gig-worker');
  const gigSecond = getCareer('ai-engineer');
  const gigSecondSalary = Math.max(...gigSecond.salaryTiers);
  gigSalaryFixture.players[0] = {
    ...gigSalaryFixture.players[0],
    position: 4,
    salaryTier: 1,
    salaryAmount: gigPrimary.salaryTiers[0],
    secondCareer: { careerId: gigSecond.id, salaryTier: 4, salaryAmount: gigSecondSalary },
  };
  const gigPayday = move(gigSalaryFixture, 2);
  assert.equal(effectiveSalaryAmount(gigPayday.players[0]), gigSecondSalary);
  assert.equal(gigPayday.players[0].wealth, 100_000 + gigSecondSalary, 'Payday pays Gig Worker the higher of the two salaries');
  assert.equal(gigPayday.wealthEvents.at(-1).amount, gigSecondSalary, 'Payday wealth records use the effective salary');
  assert(gigPayday.eventLog.some(event => event.eventType === 'SALARY_GATE' && event.salaryAmount === gigSecondSalary), 'salary-gate feedback records the effective salary');

  assert.equal(BOARD_SPACES.length, 75, 'the board retains 75 spaces');
  assert.deepEqual(
    BOARD_SPACES.filter(space => space.type === 'CARD').map(space => space.number),
    [3, 5, 7, 12, 13, 17, 20, 22, 24, 26, 27, 32, 33, 36, 37, 39, 42, 47, 48, 49, 52, 57, 58, 62, 64, 67, 69, 72],
    'all generic event spaces now draw from existing card decks',
  );
  assert.equal(BOARD_SPACES[0].label, 'OPEN ROAD', 'Space 1 clearly identifies the start of the route');
  assert.equal(BOARD_SPACES[0].type, 'NORMAL', 'Space 1 is an ordinary no-effect Open Road');
  assert.equal(BOARD_SPACES[0].trigger, 'NONE', 'Space 1 does not trigger gameplay on landing');
  assert.equal(BOARD_SPACES[0].effectId, undefined, 'Space 1 has no board effect');
  assert.equal(BOARD_SPACES[0].icon, 'normal', 'Space 1 uses a neutral road mark instead of an effect icon');
  assert.equal(BOARD_SPACES[0].secondaryIcon, undefined, 'Space 1 has no secondary effect icon');
  assert.match(BOARD_SPACES[0].description, /no gameplay effect/i, 'Space 1 explains that it has no gameplay effect');
  assert.equal(getSpaceVisual(BOARD_SPACES[0]).className, 'start', 'Open Road remains visually distinct without a gameplay effect');
  assert.equal(BOARD_SPACES[1].type, 'UPGRADE_TOKEN', 'Space 2 uses the existing Upgrade Token space mechanic');
  assert.equal(BOARD_SPACES[1].trigger, 'LAND', 'Space 2 awards its token only when a player lands there');
  assert.deepEqual([...PAYDAY_SPACES], [6, 18, 29, 41, 54, 66, 73]);
  assert.deepEqual(BOARD_SPACES.filter(space => space.type === 'MILESTONE' || space.type === 'CAREER_CHANGE').map(space => space.number), [10, 30, 35, 45, 60, 75]);
  assert.deepEqual(BOARD_SPACES.filter(space => space.type === 'GAMBLE').map(space => space.number), [15, 50, 70]);
  const expectedDeckCodes = new Map([
    [3, 'W'], [5, 'W'], [7, 'AI'], [12, 'FM'], [13, 'AI'], [17, 'LS'], [20, 'LS'], [22, 'IN'],
    [24, 'FM'], [26, 'LS'], [27, 'W'], [32, 'W'], [33, 'AI'], [36, 'IN'], [37, 'W'], [39, 'IN'],
    [42, 'AI'], [47, 'FM'], [48, 'W'], [49, 'W'], [52, 'FM'], [57, 'IN'], [58, 'FM'], [62, 'IN'],
    [64, 'W'], [67, 'FM'], [69, 'AI'], [72, 'W'],
  ]);
  for (const [number, code] of expectedDeckCodes) {
    const visual = getSpaceVisual(BOARD_SPACES[number - 1]);
    assert.equal(visual.className, 'deck', `space ${number} is visually identified as a draw space`);
    assert.equal(visual.deckCode, code, `space ${number} keeps the correct deck identifier`);
  }
  const gambleVisual = getSpaceVisual(BOARD_SPACES[14]);
  assert.equal(gambleVisual.className, 'gamble', 'Gamble remains visually below regular card spaces');
  assert.equal(gambleVisual.deckCode, 'GMB', 'Gamble carries its deck identifier');
  assert.equal(gambleVisual.deckName, 'GAMBLE', 'Gamble uses the same deck identity as its cards');
  assert.equal(new Set([...expectedDeckCodes.values(), gambleVisual.deckCode]).size, 6, 'all six deck identities have a visible short code');
  assert.equal(BOARD_EFFECTS.length, 0, 'Open Road has no unique board effect');
  assert.deepEqual(BOARD_SPACES.filter(space => space.effectId).map(space => space.number), []);
  assert.deepEqual(BOARD_SPACES.filter(space => space.type === 'UPGRADE_TOKEN').map(space => space.number), [2, 14, 55], 'Space 2 joins the existing Upgrade Token spaces');
  assert(BOARD_SPACES.filter(space => space.type === 'UPGRADE_TOKEN').every(space => space.trigger === 'LAND' && getSpaceVisual(space).className === 'upgrade'), 'token spaces award only on landing and have a distinct visual');
  assert.equal(BOARD_SPACES.filter(space => space.type === 'NORMAL').length, 28, 'Open Road remains no-effect and the route retains 75 spaces');

  assert.equal(cards.length, 96, 'the full card set has 96 cards');
  assert.equal(new Set(cards.map(card => card.id)).size, 96, 'card IDs are unique');
  assert.equal(new Set(cards.map(card => card.title)).size, 96, 'card names are unique');
  assert.equal(new Set(cards.filter(card => !card.id.endsWith('upgrade-token')).map(card => JSON.stringify(card.effects))).size, 90, 'the original 90 card outcomes remain unique');
  assert.equal(new Set(cards.map(card => card.artCue)).size, 96, 'card art concepts are unique');
  const tokenCards = cards.filter(card => card.id.endsWith('upgrade-token'));
  assert.equal(tokenCards.length, 6, 'there is one Upgrade Token card in each deck');
  assert.deepEqual([...tokenCards.map(card => card.deck)].sort(), ['ai', 'fame', 'gamble', 'influence', 'lifestyle', 'wealth']);
  for (const deck of decks) {
    assert.equal(cardsForDeck(deck.id).length, 16, `${deck.name} contains 16 cards`);
    assert.equal(deck.count, 16, `${deck.name} reports 16 cards`);
  }
  const careerTags = new Set(careers.flatMap(career => career.tags));
  const validStats = new Set(['wealth', 'aiSkill', 'fame', 'lifestyle', 'influence']);
  const validDecks = new Set(decks.map(deck => deck.id));
  const validEventTypes = new Set(['TURN_START', 'TURN_END', 'DICE_ROLL', 'DOUBLES_ROLLED', 'ROLL_OF_2', 'ROLL_OF_8', 'ROLL_OF_2_OR_8', 'PLAYER_MOVED', 'PASS_SPACE', 'LAND_ON_SPACE', 'PASS_PLAYER', 'LAND_ON_PLAYER', 'SALARY_GATE', 'CAREER_CHANGE', 'MILESTONE', 'BOARD_EFFECT_RESOLVED', 'CARD_DRAW', 'CARD_RESOLVED', 'UPGRADE_TOKEN_GAINED', 'UPGRADE_TOKEN_SPENT', 'UPGRADE_TOKEN_HELD', 'ASSET_UPGRADED', 'ASSET_ACQUIRED', 'ASSET_TRANSFERRED', 'MILESTONE_RECOVERED', 'ASSET_PURCHASED', 'CAR_PURCHASED', 'LIFESTYLE_PURCHASED', 'PET_PURCHASED', 'INVESTMENT_PURCHASED', 'PROPERTY_PURCHASED', 'CAREER_SWAP_RESOLVED', 'CAREER_SWAPPED', 'SECOND_CAREER_ACQUIRED', 'TURN_SKIPPED', 'ATTRIBUTE_GAINED', 'WEALTH_CHANGED', 'AI_SKILL_CHANGED', 'FAME_CHANGED', 'LIFESTYLE_CHANGED', 'INFLUENCE_CHANGED', 'PLAYER_AFFECTED']);
  const validEffectTypes = new Set(['ADD_WEALTH', 'REMOVE_WEALTH', 'ADD_AI_SKILL', 'REMOVE_AI_SKILL', 'ADD_FAME', 'REMOVE_FAME', 'ADD_LIFESTYLE', 'REMOVE_LIFESTYLE', 'ADD_INFLUENCE', 'REMOVE_INFLUENCE', 'MOVE_PLAYER', 'DRAW_CARD', 'AFFECT_OTHER_PLAYER', 'PROTECT_FROM_EFFECT', 'MODIFY_REWARD', 'MODIFY_SALARY', 'TRIGGER_EVENT', 'ASSET_INTERACTION', 'SWAP_CAREER', 'TRANSFER_WEALTH_FROM_EVENT_ACTOR', 'SKIP_NEXT_TURN', 'UPGRADE_ACQUIRED_ASSET', 'CHOOSE_STAT_DESTINATION', 'ACQUIRE_SECOND_CAREER']);
  const validConditions = new Set(['ANY', 'EVENT_ACTOR_IS_SELF', 'EVENT_ACTOR_IS_OTHER', 'EVENT_OWNER_IS_EVENT_TARGET', 'EVENT_DELTA_IS_NEGATIVE', 'EVENT_DELTA_IS_POSITIVE', 'EVENT_STAGE_IS', 'EVENT_CAREER_SWITCHED', 'EVENT_HAS_TARGET_PLAYER', 'EVENT_CATEGORY_IS', 'EVENT_DECK_IS', 'EVENT_SPACE_IS', 'EVENT_STAT_IS', 'PLAYER_CAREER_TAG', 'TARGET_IS_OTHER_PLAYER', 'EVENT_TARGET_HAS_ASSET', 'EVENT_SPACE_HAS_OTHER_PLAYERS', 'PLAYER_HAS_NO_SECOND_CAREER']);
  const abilityById = new Map(abilities.map(ability => [ability.id, ability]));
  assert.equal(characters.length, 21, 'the roster retains all 21 characters');
  assert.equal(new Set(characters.flatMap(character => character.abilityIds)).size, 21, 'character ability IDs are unique');
  const characterMechanics = characters.map(character => {
    const ability = getAbility(character.abilityIds[0]);
    return JSON.stringify({
      trigger: ability.trigger,
      conditions: ability.conditions,
      effects: ability.effects,
      usageLimits: ability.usageLimits,
    });
  });
  assert.equal(new Set(characterMechanics).size, 21, 'all 21 character abilities have distinct mechanics');
  for (const character of characters) {
    assert(character.abilityIds.length > 0 && character.abilityName && character.abilityDescription, `${character.id} has non-empty ability metadata`);
    for (const abilityId of character.abilityIds) {
      const ability = getAbility(abilityId);
      if (character.id === 'guardian_h') {
        assert(ability && !ability.trigger && ability.effects.length === 0, 'Guardian is an always-on rule enforced by the stat engine');
        continue;
      }
      assert(ability && ability.trigger && validEventTypes.has(ability.trigger), `${character.id} has a valid ability trigger`);
      assert(ability.effects.length > 0, `${character.id} has a non-empty ability effect list`);
    }
  }
  assert.equal(careers.length, 17, 'the career roster includes all existing careers plus Thief and Alien');
  assert.equal(careers.filter(career => career.acquisitionUpgradeTokens === 1).length, 1, 'Doctor grants one token on each new acquisition');
  for (const career of careers) {
    assert(categories.some(category => category.id === career.categoryId), `${career.id} uses an existing career category`);
    assert(career.abilityIds.length >= 2 && career.abilityName && career.abilityDescription, `${career.id} has a career ability and affinity abilities`);
    assert(validDecks.has(career.deckAffinity.primary), `${career.id} has a valid primary deck affinity`);
    if (career.deckAffinity.secondary) assert(validDecks.has(career.deckAffinity.secondary), `${career.id} has a valid secondary deck affinity`);
    for (const abilityId of career.abilityIds) {
      const ability = getAbility(abilityId);
      assert(ability, `${career.id} references an existing ability`);
      if (!ability.trigger) {
        assert.equal(abilityId, 'career:doctor', 'Doctor acquisition tokens are handled by career-package changes');
        assert.equal(ability.effects.length, 0, 'Doctor has no duplicate event-driven token effect');
      } else {
        assert(validEventTypes.has(ability.trigger), `${career.id} has a valid ability trigger`);
        assert(ability.effects.length > 0, `${career.id} has a non-empty ability effect list`);
      }
    }
  }
  function validateAbilityEffects(effects, abilityId) {
    assert(effects.length > 0, `${abilityId} has a gameplay effect`);
    for (const effect of effects) {
      assert(validEffectTypes.has(effect.type), `${abilityId} uses a valid effect type`);
      if (effect.type.endsWith('_WEALTH') || effect.type.endsWith('_AI_SKILL') || effect.type.endsWith('_FAME') || effect.type.endsWith('_LIFESTYLE') || effect.type.endsWith('_INFLUENCE') || effect.type === 'MOVE_PLAYER' || effect.type === 'MODIFY_SALARY' || effect.type === 'MODIFY_REWARD') {
        assert(Number.isFinite(effect.amount) && effect.amount !== 0, `${abilityId} has a valid numeric effect amount`);
      }
      if (effect.type === 'DRAW_CARD') assert(validDecks.has(effect.deck), `${abilityId} draws from a valid deck`);
      if (effect.type === 'MODIFY_REWARD') assert(validStats.has(effect.stat), `${abilityId} modifies a valid stat reward`);
      if (effect.type === 'AFFECT_OTHER_PLAYER') validateAbilityEffects(effect.effects, abilityId);
      if (effect.type === 'TRIGGER_EVENT') assert(validEventTypes.has(effect.eventType), `${abilityId} triggers a valid event`);
      if (effect.type === 'TRANSFER_WEALTH_FROM_EVENT_ACTOR') assert(effect.amount > 0, `${abilityId} transfers a positive wealth amount`);
      if (effect.type === 'UPGRADE_ACQUIRED_ASSET') assert.equal(effect.level, 2, `${abilityId} upgrades acquired assets to Level 2`);
    }
  }
  for (const ability of abilities) {
    if (!ability.trigger) {
      assert(['career:doctor', 'character:guardian_h'].includes(ability.id), 'only Doctor and Guardian use non-event handling');
      assert.equal(ability.effects.length, 0);
      continue;
    }
    assert(validEventTypes.has(ability.trigger), `${ability.id} has a valid trigger`);
    validateAbilityEffects(ability.effects, ability.id);
    for (const condition of ability.conditions) assert(validConditions.has(condition.kind), `${ability.id} uses a valid condition`);
  }
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
      } else if (effect.kind === 'UPGRADE_TOKEN') {
        assert.equal(effect.amount, 1, `${cardId} grants exactly one Upgrade Token`);
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
    assert(card.id?.trim() && card.title?.trim() && card.deck, 'each active card has an ID, name, and deck');
    assert(card.description?.trim() && card.effect?.trim(), `${card.id} has a description and effect`);
    validateCardEffects(card.effects, card.id);
    const artPath = getCardArtworkFilePath(card.id);
    assert(artPath, `${card.id} has an artwork mapping`);
    assert.equal(artPath, card.artworkPath, `${card.id} uses its authored artwork reference`);
    assert(existsSync(new URL(`../public/${artPath}`, import.meta.url)), `${card.id} artwork exists at ${artPath}`);
    const probe = createMatch(id);
    const tokenCountBefore = probe.players[0].upgradeTokens;
    const resolved = resolveEventQueue(probe, [{ type: 'CARD_RESOLVED', playerIndex: 0, deck: card.deck, cardId: card.id, spaceNumber: 1 }]);
    assert(resolved.eventLog.some(entry => entry.eventType === 'CARD_RESOLVED' && entry.detail.includes(card.title)), `${card.id} resolves through the event engine`);
    assert.equal(resolved.players[0].upgradeTokens, tokenCountBefore + (card.id.endsWith('upgrade-token') ? 1 : 0), `${card.id} applies any token reward through the event engine`);
  }

  const degenDangerFixture = abilityFixture(['degen-trader']);
  degenDangerFixture.players[0].characterId = 'danger_zone';
  degenDangerFixture.players[0].lifestyle = 2;
  const degenDangerRoll = advanceMatch(degenDangerFixture, {
    type: 'ROLL',
    result: { die1: 4, die2: 4, total: 8, doubles: true },
  });
  assert(eventTypes(degenDangerRoll).includes('DICE_ROLL'));
  assert(eventTypes(degenDangerRoll).includes('DOUBLES_ROLLED'));
  assert(eventTypes(degenDangerRoll).includes('ROLL_OF_8'));
  assert.equal(degenDangerRoll.players[0].wealth, 160_000, 'Degen Trader and Danger Zone both reward an 8');
  assert.equal(degenDangerRoll.players[0].fame, 0);
  assert.equal(degenDangerRoll.players[0].lifestyle, 1, 'Danger Zone pays one Lifestyle for its roll-of-8 reward');

  let rollTwo = startWithoutProtection(1);
  rollTwo = {
    ...rollTwo,
    players: rollTwo.players.map((player, index) => index === 0 ? { ...player, characterId: 'sadman' } : player),
  };
  const rollTwoInfluence = rollTwo.players[0].influence;
  rollTwo = resolveEventQueue(rollTwo, [{ type: 'DICE_ROLL', playerIndex: 0, die1: 1, die2: 1, total: 2, doubles: true }]);
  assert(eventTypes(rollTwo).includes('ROLL_OF_2'), 'a total of 2 emits its native roll event');
  assert.equal(rollTwo.players[0].influence, rollTwoInfluence + 2, 'Sadman reacts to roll 2 with Influence');

  let doubles = startWithoutProtection(1);
  doubles = {
    ...doubles,
    players: doubles.players.map((player, index) => index === 0 ? { ...player, characterId: 'primate' } : player),
  };
  const doublesLifestyle = doubles.players[0].lifestyle;
  doubles = resolveEventQueue(doubles, [{ type: 'DICE_ROLL', playerIndex: 0, die1: 3, die2: 3, total: 6, doubles: true }]);
  assert(eventTypes(doubles).includes('DOUBLES_ROLLED'), 'doubles emit their native roll event');
  assert.equal(doubles.players[0].lifestyle, doublesLifestyle + 1, 'Primate reacts to doubles');

  let passPlayer = startWithoutProtection(1);
  passPlayer = {
    ...passPlayer,
    players: passPlayer.players.map((player, index) => index === 0 ? { ...player, characterId: 'rainbow_dash' } : player),
  };
  const passLifestyle = passPlayer.players[0].lifestyle;
  passPlayer = resolveEventQueue(passPlayer, [{
    type: 'PASS_PLAYER',
    playerIndex: 0,
    targetPlayerId: passPlayer.players[1].playerId,
    targetPlayerIndex: 1,
    previousPosition: 1,
    newPosition: 2,
    targetPosition: 2,
  }]);
  assert.equal(passPlayer.players[0].lifestyle, passLifestyle + 1, 'Rainbow Dash reacts to passing a player');

  let landedOnOwner = startWithoutProtection(7);
  landedOnOwner = {
    ...landedOnOwner,
    players: landedOnOwner.players.map((player, index) => {
      if (index === 0) return { ...player, characterId: 'the_rind', wealth: 900000 };
      if (index === 1) return { ...player, position: 7 };
      return player;
    }),
  };
  const ownerWealth = landedOnOwner.players[0].wealth;
  landedOnOwner = resolveEventQueue(landedOnOwner, [{
    type: 'LAND_ON_PLAYER',
    playerIndex: 1,
    targetPlayerId: landedOnOwner.players[0].playerId,
    targetPlayerIndex: 0,
    targetPosition: 7,
    previousPosition: 6,
    newPosition: 7,
    spaceNumber: 7,
  }]);
  assert.equal(landedOnOwner.players[0].wealth, ownerWealth + 2500, 'the landed-on owner receives The Rind reaction');
  assert(landedOnOwner.eventLog.some(entry => entry.abilityId === 'character:the_rind'), 'owner reaction is visible in the event log');
  const ownerAbilityLog = landedOnOwner.eventLog.find(entry => entry.abilityId === 'character:the_rind' && entry.source === 'ABILITY');
  assert(ownerAbilityLog.detail.includes('LAND ON PLAYER'), 'ability log identifies its trigger');
  assert(ownerAbilityLog.detail.includes('$2,500'), 'ability log records the resulting Wealth change');

  let affinity = startWithoutProtection(1);
  affinity = {
    ...affinity,
    players: affinity.players.map((player, index) => index === 0 ? { ...player, careerId: 'ai-engineer' } : player),
  };
  const affinityAi = affinity.players[0].aiSkill;
  affinity = resolveEventQueue(affinity, [{
    type: 'CARD_DRAW',
    playerIndex: 0,
    deck: 'ai',
    cardId: 'ai-pattern',
    spaceNumber: 1,
  }]);
  assert.equal(affinity.players[0].aiSkill, affinityAi + 1, 'matching primary career affinity grants a small card-draw benefit');
  assert(affinity.eventLog.some(entry => entry.abilityId?.startsWith('career-affinity:ai-engineer:ai')), 'career affinity ability is logged');
  const firstAffinityWealth = affinity.players[0].wealth;
  affinity = resolveEventQueue(affinity, [{
    type: 'CARD_DRAW',
    playerIndex: 0,
    deck: 'ai',
    cardId: 'ai-pattern',
    spaceNumber: 1,
  }]);
  assert.equal(affinity.players[0].aiSkill, affinityAi + 1, 'primary affinity cannot grant twice in the same turn');
  assert.equal(affinity.players[0].wealth, firstAffinityWealth, 'career AI Skill ability also respects its once-per-turn limit');
  let secondaryAffinity = startWithoutProtection(1);
  secondaryAffinity = {
    ...secondaryAffinity,
    players: secondaryAffinity.players.map((player, index) => index === 0 ? { ...player, careerId: 'ai-engineer' } : player),
  };
  const secondaryWealth = secondaryAffinity.players[0].wealth;
  secondaryAffinity = resolveEventQueue(secondaryAffinity, [{
    type: 'CARD_DRAW',
    playerIndex: 0,
    deck: 'wealth',
    cardId: 'wealth-seed',
    spaceNumber: 1,
  }]);
  assert.equal(secondaryAffinity.players[0].wealth, secondaryWealth + 1000, 'matching secondary career affinity grants a smaller benefit');

  let characterCardReaction = startWithoutProtection(1);
  characterCardReaction = {
    ...characterCardReaction,
    players: characterCardReaction.players.map((player, index) => index === 0 ? { ...player, characterId: 'idol_core', careerId: 'doctor' } : player),
  };
  const characterCardFame = characterCardReaction.players[0].fame;
  characterCardReaction = resolveEventQueue(characterCardReaction, [{
    type: 'CARD_DRAW',
    playerIndex: 0,
    deck: 'fame',
    cardId: 'fame-clip',
    spaceNumber: 1,
  }]);
  assert.equal(characterCardReaction.players[0].fame, characterCardFame + 1, 'Idol Core reacts to a Fame card draw');
  const cardEffectBefore = affinity.players[0].aiSkill;
  affinity = resolveEventQueue(affinity, [{
    type: 'CARD_RESOLVED',
    playerIndex: 0,
    deck: 'ai',
    cardId: 'ai-pattern',
    spaceNumber: 1,
    description: 'Pattern Found: Gain 3 AI Skill.',
  }]);
  assert.equal(affinity.players[0].aiSkill, cardEffectBefore + 3, 'existing card effects still resolve through the event engine');

  let carPurchase = startWithoutProtection(8);
  carPurchase = {
    ...carPurchase,
    players: carPurchase.players.map((player, index) => index === 0 ? { ...player, careerId: 'race-driver' } : player),
  };
  const carFame = carPurchase.players[0].fame;
  carPurchase = resolveEventQueue(carPurchase, [{
    type: 'CAR_PURCHASED',
    playerIndex: 0,
    category: 'car',
    assetId: 'sport-coupe',
    assetName: 'Sport Coupe',
    cost: 1000,
  }]);
  assert.equal(carPurchase.players[0].fame, carFame, 'Race Driver triggers on meeting another player, not buying a Car');

  let propertyPurchase = startWithoutProtection(8);
  propertyPurchase = {
    ...propertyPurchase,
    players: propertyPurchase.players.map((player, index) => index === 0 ? { ...player, careerId: 'real-estate-investor' } : player),
  };
  const propertyWealth = propertyPurchase.players[0].wealth;
  propertyPurchase = resolveEventQueue(propertyPurchase, [{
    type: 'PROPERTY_PURCHASED',
    playerIndex: 0,
    category: 'property',
    assetId: 'property-loft',
    assetName: 'Property Loft',
    cost: 1000,
  }]);
  assert.equal(propertyPurchase.players[0].wealth, propertyWealth, 'Real Estate Investor interacts with Properties when meeting another player');

  const humanAbilityFixture = startWithoutProtection(1);
  const cpuAbilityFixture = {
    ...humanAbilityFixture,
    players: humanAbilityFixture.players.map((player, index) => index === 0
      ? { ...player, isCPU: true }
      : player),
  };
  const humanAbility = resolveEventQueue({
    ...humanAbilityFixture,
    players: humanAbilityFixture.players.map((player, index) => index === 0 ? { ...player, characterId: 'sadman' } : player),
  }, [{ type: 'ROLL_OF_2', playerIndex: 0, total: 2, die1: 1, die2: 1 }]);
  const cpuAbility = resolveEventQueue({
    ...cpuAbilityFixture,
    players: cpuAbilityFixture.players.map((player, index) => index === 0 ? { ...player, characterId: 'sadman' } : player),
  }, [{ type: 'ROLL_OF_2', playerIndex: 0, total: 2, die1: 1, die2: 1 }]);
  assert.equal(cpuAbility.players[0].influence, humanAbility.players[0].influence, 'CPU and human fixtures resolve the same character ability outcome');
  assert.equal(
    cpuAbility.eventLog.filter(entry => entry.abilityId === 'character:sadman').length,
    humanAbility.eventLog.filter(entry => entry.abilityId === 'character:sadman').length,
    'CPU and human fixtures log the same ability activation',
  );

  // Phase 16.5: every character passive fires once, for human and CPU slots, with a stat-change log entry for the player card.
  {
    const other = (m) => m.players[1].playerId;
    const cases = [
      ['click_click', 'influence', 1, [{ type: 'LAND_ON_PLAYER', playerIndex: 0, targetPlayerIndex: 1, spaceNumber: 5, previousPosition: 4, newPosition: 5, targetPosition: 5 }], true],
      ['frostbyte', 'influence', 1, [{ type: 'AI_SKILL_CHANGED', playerIndex: 0, stat: 'aiSkill', previousValue: 3, newValue: 2, delta: -1 }]],
      ['sadman', 'influence', 2, [{ type: 'ROLL_OF_2', playerIndex: 0, total: 2, die1: 1, die2: 1 }]],
      ['rainbow_dash', 'lifestyle', 1, [{ type: 'PASS_PLAYER', playerIndex: 0, targetPlayerIndex: 1, previousPosition: 1, newPosition: 2, targetPosition: 2 }], true],
      ['low_flame', 'wealth', 2500, [{ type: 'SALARY_GATE', playerIndex: 0, spaceNumber: 4, salaryAmount: 0 }]],
      ['wandering_eye', 'aiSkill', 5, [{ type: 'CAREER_CHANGE', playerIndex: 0, stage: 'RESOLVED', spaceNumber: 35, previousCareerId: 'lawyer', newCareerId: 'doctor' }]],
      ['anointed', 'fame', 2, [{ type: 'CAREER_CHANGE', playerIndex: 0, stage: 'RESOLVED', spaceNumber: 35, previousCareerId: 'lawyer', newCareerId: 'doctor' }]],
      ['executive_p', 'influence', 1, [{ type: 'PASS_PLAYER', playerIndex: 0, targetPlayerIndex: 1, previousPosition: 1, newPosition: 2, targetPosition: 2 }], true],
      ['hotwired', 'lifestyle', 1, [{ type: 'ASSET_PURCHASED', playerIndex: 0, assetId: 'x', assetName: 'X', previousWealth: 10, newWealth: 5 }]],
      ['panic_bot', 'influence', 1, [{ type: 'CARD_DRAW', playerIndex: 0, deck: 'gamble' }]],
      ['primate', 'lifestyle', 1, [{ type: 'DOUBLES_ROLLED', playerIndex: 0, total: 6, die1: 3, die2: 3 }]],
      ['prom_king', 'fame', 1, [{ type: 'LAND_ON_PLAYER', playerIndex: 0, targetPlayerIndex: 1, spaceNumber: 5, previousPosition: 4, newPosition: 5, targetPosition: 5 }], true],
      ['idol_core', 'fame', 1, [{ type: 'CARD_DRAW', playerIndex: 0, deck: 'fame' }]],
      ['danger_zone', 'wealth', 10000, [{ type: 'ROLL_OF_8', playerIndex: 0, total: 8, die1: 4, die2: 4 }]],
      ['the_tank', 'wealth', 2500, [{ type: 'PLAYER_MOVED', playerIndex: 0, previousPosition: 1, newPosition: 2, distance: 1 }]],
    ];
    for (const isCPU of [false, true]) {
      for (const [characterId, stat, amount, drafts, needsTarget] of cases) {
        let m = startWithoutProtection(1);
        m = { ...m, players: m.players.map((player, index) => index === 0 ? { ...player, characterId, isCPU, careerId: null } : { ...player, characterId: '__test_no_ability__', careerId: null }) };
        m = { ...m, abilityUsage: {}, eventLog: [] };
        const before = m.players[0][stat];
        const resolved = resolveEventQueue(m, drafts.map(d => needsTarget ? { ...d, targetPlayerId: other(m) } : d));
        const statEvents = resolved.eventLog.filter(e => e.abilityId === `character:${characterId}` && e.source === 'EFFECT' && /_CHANGED$/.test(e.eventType) && e.stat === stat && e.playerId === m.players[0].playerId);
        assert(statEvents.length >= 1, `${characterId} (${isCPU ? 'CPU' : 'human'}) logs a ${stat} change for the player card`);
        const expectedDelta = characterId === 'danger_zone' ? amount : amount;
        assert.equal(statEvents.reduce((sum, e) => sum + e.delta, 0), expectedDelta, `${characterId} (${isCPU ? 'CPU' : 'human'}) changes ${stat} by ${amount}`);
        assert.equal(resolved.players[0][stat] - before, amount, `${characterId} permanent ${stat} value updated`);
      }
    }
    let exec = startWithoutProtection(1);
    exec = { ...exec, abilityUsage: {}, players: exec.players.map((p, i) => i === 0 ? { ...p, characterId: 'executive_p', careerId: null, influence: 2 } : { ...p, characterId: '__test_no_ability__', careerId: null, influence: 2 }) };
    const passEvent = { type: 'PASS_PLAYER', playerIndex: 0, targetPlayerId: exec.players[1].playerId, targetPlayerIndex: 1, previousPosition: 1, newPosition: 2, targetPosition: 2 };
    exec = resolveEventQueue(exec, [passEvent, passEvent]);
    assert.equal(exec.players[1].influence, 1, 'Executive steals 1 Influence from the passed player');
    assert.equal(exec.players[0].influence, 3, 'Executive steals Influence only once per turn');
    // Danger Zone also costs 1 Lifestyle.
    let danger = startWithoutProtection(1);
    danger = { ...danger, abilityUsage: {}, players: danger.players.map((p, i) => i === 0 ? { ...p, characterId: 'danger_zone', careerId: null, lifestyle: 3 } : { ...p, characterId: '__test_no_ability__', careerId: null }) };
    danger = resolveEventQueue(danger, [{ type: 'ROLL_OF_8', playerIndex: 0, total: 8, die1: 4, die2: 4 }]);
    assert.equal(danger.players[0].lifestyle, 2, 'Danger Zone still costs 1 Lifestyle');

    // Alpha Prime: first roll only.
    let alpha = startWithoutProtection(1);
    alpha = { ...alpha, abilityUsage: {}, players: alpha.players.map((p, i) => i === 0 ? { ...p, characterId: 'alpha_prime', careerId: null } : { ...p, characterId: '__test_no_ability__', careerId: null }) };
    const salary = alpha.players[0].salaryAmount;
    alpha = resolveEventQueue(alpha, [{ type: 'DICE_ROLL', playerIndex: 0, total: 5, die1: 2, die2: 3 }]);
    alpha = resolveEventQueue(alpha, [{ type: 'DICE_ROLL', playerIndex: 0, total: 5, die1: 2, die2: 3 }]);
    assert.equal(alpha.players[0].salaryAmount, salary + 5000, 'Alpha Prime raises salary on the first roll only');

    // Roll Safe: a roll of 2 grants protection.
    let roll = startWithoutProtection(1);
    roll = { ...roll, abilityUsage: {}, players: roll.players.map((p, i) => i === 0 ? { ...p, characterId: 'roll_safe', careerId: null } : { ...p, characterId: '__test_no_ability__', careerId: null }) };
    roll = resolveEventQueue(roll, [{ type: 'ROLL_OF_2', playerIndex: 0, total: 2, die1: 1, die2: 1 }]);
    assert.equal(roll.effectProtections[roll.players[0].playerId]?.length, 1, 'Roll Safe grants protection on a roll of 2');

    // Sadman has no usage limit.
    let sad = startWithoutProtection(1);
    sad = { ...sad, abilityUsage: {}, players: sad.players.map((p, i) => i === 0 ? { ...p, characterId: 'sadman', careerId: null } : { ...p, characterId: '__test_no_ability__', careerId: null }) };
    const sadInfluence = sad.players[0].influence;
    for (let i = 0; i < 2; i++) sad = resolveEventQueue(sad, [{ type: 'ROLL_OF_2', playerIndex: 0, total: 2, die1: 1, die2: 1 }]);
    assert.equal(sad.players[0].influence, sadInfluence + 4, 'Sadman can trigger on every roll of 2');

    // Wandering Eye: passing space 35 or keeping the same career grants nothing.
    let wander = startWithoutProtection(1);
    wander = { ...wander, abilityUsage: {}, players: wander.players.map((p, i) => i === 0 ? { ...p, characterId: 'wandering_eye', careerId: null } : { ...p, characterId: '__test_no_ability__', careerId: null }) };
    const wanderSkill = wander.players[0].aiSkill;
    wander = resolveEventQueue(wander, [{ type: 'PASS_SPACE', playerIndex: 0, spaceNumber: 35 }, { type: 'CAREER_CHANGE', playerIndex: 0, stage: 'RESOLVED', previousCareerId: 'doctor', newCareerId: 'doctor' }]);
    assert.equal(wander.players[0].aiSkill, wanderSkill, 'Wandering Eye does not reward passing or keeping a career');

    // Guardian: Fame can never be lost; others still can.
    let guardian = startWithoutProtection(1);
    guardian = { ...guardian, abilityUsage: {}, players: guardian.players.map((p, i) => i === 0 ? { ...p, characterId: 'guardian_h', careerId: null, fame: 3 } : { ...p, characterId: '__test_no_ability__', careerId: null, fame: 3 }) };
    const fameLossCard = cards.find(c => c.effects.some(e => e.kind === 'STAT' && e.stat === 'fame' && e.amount < 0 && (e.target ?? 'SELF') === 'SELF'));
    assert(fameLossCard, 'a self Fame-loss card exists to exercise Guardian');
    const guardianFameBefore = guardian.players[0].fame;
    const guardianHit = resolveEventQueue(guardian, [{ type: 'CARD_RESOLVED', playerIndex: 0, deck: fameLossCard.deck, cardId: fameLossCard.id, spaceNumber: 1 }]);
    const normalHit = resolveEventQueue({ ...guardian, players: guardian.players.map((p, i) => i === 0 ? { ...p, characterId: '__test_no_ability__' } : p) }, [{ type: 'CARD_RESOLVED', playerIndex: 0, deck: fameLossCard.deck, cardId: fameLossCard.id, spaceNumber: 1 }]);
    assert(normalHit.players[0].fame < guardianFameBefore, 'control: the Fame-loss card normally lowers Fame');
    guardian = guardianHit;
    assert(guardian.players[0].fame >= guardianFameBefore, 'Guardian fame never decreases');
    for (const stat of ['aiSkill', 'fame', 'lifestyle', 'influence']) {
      const base = { ...guardian, abilityUsage: {}, players: guardian.players.map((p, i) => i === 0 ? { ...p, [stat]: 1 } : p) };
      const hit = resolveEventQueue(base, [{ type: 'PLAYER_AFFECTED', playerIndex: 1, targetPlayerId: base.players[0].playerId, targetPlayerIndex: 0, effectType: 'REMOVE_' + stat.toUpperCase(), spaceNumber: 1 }]);
      assert(hit.players[0][stat] >= 0, `Guardian ${stat} never goes negative`);
    }
    const statLossCards = cards.filter(c => c.effects.some(e => e.kind === 'STAT' && e.stat !== 'wealth' && e.amount < 0 && (e.target ?? 'SELF') === 'SELF'));
    for (const card of statLossCards) {
      const g = resolveEventQueue(guardian, [{ type: 'CARD_RESOLVED', playerIndex: 0, deck: card.deck, cardId: card.id, spaceNumber: 1 }]);
      for (const stat of ['aiSkill', 'fame', 'lifestyle', 'influence']) assert(g.players[0][stat] >= guardian.players[0][stat], `Guardian ${stat} not reduced by ${card.id}`);
    }
  }

  const paydayStart = start(4);
  const stablePaydayStart = withoutAbilities(paydayStart);
  let match = move(stablePaydayStart, 3);
  assert.equal(match.players[0].wealth, 900000 + match.players[0].salaryAmount);
  assert.equal(match.wealthEvents.length, 1);
  assert(eventTypes(match).includes('SALARY_GATE'));
  assert.equal(advanceMatch(match, { type: 'STEP' }), match);
  match = move({ ...stablePaydayStart, phase: 'ready', stepsRemaining: 0, pending: null, roll: null, lastLanding: null }, 2);
  assert.equal(match.players[0].wealth, 900000 + match.players[0].salaryAmount);
  assert.equal(match.wealthEvents.length, 1);
  const salaryDebug = start(4);
  const originalSalary = salaryDebug.players[0].salaryAmount;
  match = move(withoutAbilities(salaryDebug, 0, 'alpha_prime'), 2);
  assert.equal(match.players[0].salaryAmount, originalSalary + 5000);
  assert.equal(match.players[0].wealth, 900000 + originalSalary + 5000);
  assert(eventTypes(match).includes('PLAYER_AFFECTED'));
  const secondPlayerStart = start(4, 1);
  match = move(withoutAbilities(secondPlayerStart, 1), 2);
  assert.equal(match.players[1].wealth, 900000 + match.players[1].salaryAmount);
  match = advanceMatch(match, { type: 'NEXT_TURN' });
  assert.equal(match.players[1].wealth, 900000 + match.players[1].salaryAmount);

  const carMilestoneStart = start(8);
  match = move({
    ...carMilestoneStart,
    players: carMilestoneStart.players.map((player, index) => index === 0 ? { ...player, characterId: 'frostbyte', careerId: 'doctor' } : player),
  }, 2);
  assert.equal(match.phase, 'decision');
  assert.equal(match.pending.slot, 'car');
  assert(eventTypes(match).includes('MILESTONE'));
  assert.equal(match.pending.offeredAssetIds.length, 3);
  assert.equal(new Set(match.pending.offeredAssetIds).size, 3);
  const milestoneMarkup = renderToStaticMarkup(React.createElement(MilestoneChoice, {
    pending: match.pending,
    player: match.players[0],
    players: match.players,
    onAction: () => {},
  }));
  assert.equal((milestoneMarkup.match(/class="milestone-art-image/g) ?? []).length, 3, 'all three milestone options render shared asset artwork');
  assert(milestoneMarkup.includes('LEVEL 1') && milestoneMarkup.includes('COST / WEALTH'), 'milestone choices label initial level and purchase cost');
  assert.equal(assets.length, 100, 'the complete milestone catalog has 100 choices');
  for (const category of ['car', 'lifestyle', 'pet', 'investment', 'property']) {
    assert.equal(assets.filter(asset => asset.category === category).length, 20);
  }
  const levelOneArtworkPaths = assets.map(asset => getAssetArtworkFilePath(asset.id));
  const allLevelArtworkPaths = assets.flatMap(asset => [1, 2, 3, 4].map(level => getAssetArtworkFilePathForLevel(asset.id, level)));
  assert.equal(allLevelArtworkPaths.length, 400, 'the complete catalog has 400 level-specific artwork paths');
  assert.equal(new Set(allLevelArtworkPaths).size, 400, 'each asset level resolves to its own artwork file');
  assert(allLevelArtworkPaths.every(path => path && existsSync(new URL(`../public/${path}`, import.meta.url))), 'all 400 L1–L4 artwork files exist');
  assert(levelOneArtworkPaths.every(Boolean), 'all milestone choices map to Level 1 artwork');
  assert.equal(new Set(levelOneArtworkPaths).size, 100, 'every milestone choice has a distinct Level 1 artwork path');
  for (const asset of assets) {
    const artworkUrl = getAssetArtworkUrl(asset.id, 1);
    const artworkMarkup = renderToStaticMarkup(React.createElement(AssetArtwork, {
      assetId: asset.id,
      level: 1,
      className: 'asset-artwork-audit',
      alt: `${asset.name}, level 1`,
    }));
    assert(artworkUrl, `${asset.id} has a Level 1 artwork URL`);
    assert(artworkMarkup.includes(`src="${artworkUrl}"`), `${asset.id} card renders its own Level 1 artwork`);
    assert(artworkMarkup.includes(`data-asset-id="${asset.id}"`), `${asset.id} artwork is identifiable in the DOM`);
    assert(artworkMarkup.includes('loading="eager"'), `${asset.id} artwork is not deferred by lazy loading`);
  }
  assert.equal(getAssetArtworkFilePath('budget-racer'), 'milestone-assets/cars/CAR_01.webp', 'legacy car artwork mapping remains stable');
  assert.equal(getAssetArtworkFilePath('luxury-travel'), 'milestone-assets/lifestyles/LIFESTYLE_01.webp', 'legacy lifestyle artwork mapping remains stable');
  for (const category of ['car', 'lifestyle', 'pet', 'investment', 'property']) {
    const representative = assets.find(asset => asset.category === category);
    assert(representative, `${category} has an asset artwork fixture`);
    for (const level of [1, 2, 3, 4]) {
      const artworkMarkup = renderToStaticMarkup(React.createElement(AssetArtwork, {
        assetId: representative.id,
        level,
        className: 'test-asset-artwork',
        alt: `${representative.name} level ${level}`,
      }));
      assert(artworkMarkup.includes(getAssetArtworkUrl(representative.id, level)), `${category} level ${level} renders its level-specific artwork`);
      assert(artworkMarkup.includes(`data-visual-variant="${representative.visualVariants[level]}"`), `${category} level ${level} identifies its visual variant`);
      assert(artworkMarkup.includes('asset-upgrade-overlay') && artworkMarkup.includes(`LEVEL ${level}`), `${category} level ${level} displays its level marker over the correct asset art`);
    }
  }
  const playerAssetFixture = Object.fromEntries(
    ['car', 'lifestyle', 'pet', 'property'].map(category => [
      category === 'pet' ? 'companion' : category,
      assets.find(asset => asset.category === category).id,
    ]),
  );
  const playerAssetLevels = Object.fromEntries(Object.values(playerAssetFixture).map(assetId => [assetId, 4]));
  const playerAssetsMarkup = renderToStaticMarkup(React.createElement(PlayerAssets, {
    equipment: playerAssetFixture,
    assetLevels: playerAssetLevels,
    upgradeTokens: 2,
    heldUpgradeTokens: 0,
    playerIndex: 0,
  }));
  for (const category of ['car', 'lifestyle', 'pet', 'property']) {
    const asset = assets.find(entry => entry.category === category);
    assert(playerAssetsMarkup.includes(asset.name) && playerAssetsMarkup.includes('LEVEL 4'), `${category} Level 4 artwork appears on the player card`);
  }
  assert(playerAssetsMarkup.includes('ENDGAME +$'), 'the player card labels asset contribution as endgame value');
  const investment = assets.find(asset => asset.category === 'investment');
  const investmentAssetsMarkup = renderToStaticMarkup(React.createElement(PlayerAssets, {
    equipment: { ...playerAssetFixture, companion: investment.id },
    assetLevels: { ...playerAssetLevels, [investment.id]: 3 },
    upgradeTokens: 0,
    heldUpgradeTokens: 0,
    playerIndex: 1,
  }));
  assert(investmentAssetsMarkup.includes(investment.name) && investmentAssetsMarkup.includes('LEVEL 3'), 'investment artwork and level appear in the shared companion slot');
  for (const asset of assets) {
    assert.equal(Object.keys(asset.visualVariants ?? {}).length, MAX_ASSET_LEVEL, `${asset.id} has a visual reference at every upgrade level`);
    assert.deepEqual([2, 3, 4].map(level => asset.visualVariants[level]), [
      `${asset.id}:level-2`,
      `${asset.id}:level-3`,
      `${asset.id}:level-4`,
    ], `${asset.id} has asset-specific Level 2–4 references`);
  }
  assert(levelOneArtworkPaths.every(path => existsSync(new URL(`../public/${path}`, import.meta.url))), 'all 100 Level 1 artwork files exist');
  assert.equal(new Set(assets.map(asset => asset.id)).size, assets.length);
  assert.equal(new Set(visualAssets.map(asset => asset.id)).size, visualAssets.length);
  assert(visualAssets.every(asset => existsSync(asset.filePath)));
  const specialSpaces = BOARD_SPACES.filter(space => space.type !== 'NORMAL');
  assert(specialSpaces.length > 0 && specialSpaces.every(space => ICON_PATHS[space.icon]), 'every special board space has an available icon');
  assert(Array.from({ length: 75 }, (_, index) => getSpace(index + 1)).every(space => ICON_PATHS[space.icon] && (!space.secondaryIcon || ICON_PATHS[space.secondaryIcon])));
  const offeredCar = getAsset(match.pending.offeredAssetIds[0]);
  const hiddenCar = assets.find(asset => asset.category === 'car' && !match.pending.offeredAssetIds.includes(asset.id));
  const assetPurchaseBase = withoutAbilities(match);
  assert.equal(advanceMatch(assetPurchaseBase, { type: 'BUY_ASSET', assetId: hiddenCar.id }), assetPurchaseBase);
  const poor = { ...assetPurchaseBase, players: assetPurchaseBase.players.map((player, index) => index ? player : { ...player, wealth: 0 }) };
  assert.equal(advanceMatch(poor, { type: 'BUY_ASSET', assetId: offeredCar.id }), poor);
  const purchased = advanceMatch(assetPurchaseBase, { type: 'BUY_ASSET', assetId: offeredCar.id });
  assert.equal(purchased.players[0].wealth, assetPurchaseBase.players[0].wealth - offeredCar.cost + (offeredCar.effects.wealth ?? 0));
  assert.equal(purchased.players[0].fame, assetPurchaseBase.players[0].fame + (offeredCar.effects.fame ?? 0));
  assert.equal(purchased.players[0].equipment.car, offeredCar.id);
  assert.equal(purchased.players[0].assetLevels[offeredCar.id], 1, 'purchased assets begin at Level 1');
  assert(eventTypes(purchased).includes('ASSET_PURCHASED'));
  assert(eventTypes(purchased).includes('CAR_PURCHASED'));
  assert.equal(advanceMatch(purchased, { type: 'BUY_ASSET', assetId: offeredCar.id }), purchased);

  const tokenSpaceStart = start(12);
  const tokenSpaceLanding = move({
    ...tokenSpaceStart,
    eventLog: [],
    eventCursor: 0,
    players: tokenSpaceStart.players.map((player, index) => index === 0
      ? { ...player, position: 12, upgradeTokens: 0, heldUpgradeTokens: 0 }
      : player),
  }, 2);
  assert.equal(tokenSpaceLanding.players[0].position, 14);
  assert.equal(tokenSpaceLanding.players[0].upgradeTokens, 1, 'landing on a token space grants one token');
  assert.equal(countEvent(tokenSpaceLanding, 'UPGRADE_TOKEN_GAINED'), 1);
  assert.equal(advanceMatch(tokenSpaceLanding, { type: 'HOLD_UPGRADE_TOKEN' }), tokenSpaceLanding, 'token actions are blocked outside the ready phase');

  const upgradeReady = readyWithPlayer(purchased, 0, { upgradeTokens: 1, heldUpgradeTokens: 0 });
  const upgradeBasePlayer = upgradeReady.players[0];
  const upgraded = advanceMatch(upgradeReady, { type: 'UPGRADE_ASSET', assetId: offeredCar.id });
  assert.equal(upgraded.players[0].assetLevels[offeredCar.id], 2);
  assert.equal(upgraded.players[0].upgradeTokens, 0);
  assert.equal(upgraded.players[0].wealth, upgradeBasePlayer.wealth + (offeredCar.effects.wealth ?? 0), 'upgrading does not charge the purchase price again');
  for (const stat of ['aiSkill', 'fame', 'lifestyle', 'influence']) {
    assert.equal(upgraded.players[0][stat], upgradeBasePlayer[stat] + (offeredCar.effects[stat] ?? 0), `Level 2 repeats the asset's ${stat} effect`);
  }
  assert(upgraded.eventLog.find(entry => entry.eventType === 'ASSET_UPGRADED')?.detail.includes('Level 2'), 'asset upgrade level is included in the event log');
  assert.equal(upgraded.eventLog.some(entry => entry.eventType === 'UPGRADE_TOKEN_SPENT'), true);
  assert.equal(upgraded.players[0].history.upgradeTokensSpent, 1, 'spent Upgrade Tokens remain countable for the final record');
  assert.equal(upgraded.players[0].history.assetUpgrades, 1, 'asset upgrades are retained for title evaluation');
  assert.equal(availableUpgradeTokens(readyWithPlayer(upgradeReady, 0, { heldUpgradeTokens: 1 } ).players[0]), 0, 'held tokens cannot be spent mid-match');
  const capped = readyWithPlayer(upgradeReady, 0, {
    assetLevels: { ...upgradeReady.players[0].assetLevels, [offeredCar.id]: MAX_ASSET_LEVEL },
    upgradeTokens: 1,
  });
  assert.equal(advanceMatch(capped, { type: 'UPGRADE_ASSET', assetId: offeredCar.id }), capped, 'Level 4 is the maximum');

  const emptyEquipment = { car: null, lifestyle: null, companion: null, property: null };
  const recoverBase = readyWithPlayer(withoutAbilities(start(31), 0), 0, {
    position: 31,
    equipment: emptyEquipment,
    assetLevels: {},
    upgradeTokens: 1,
    heldUpgradeTokens: 0,
  });
  assert.deepEqual(getEligibleRecoveryMilestones(recoverBase.players[0]).map(milestone => milestone.space), [10, 30]);
  const previousRandom = Math.random;
  let recovered;
  try {
    Math.random = () => 0;
    recovered = advanceMatch(recoverBase, { type: 'RECOVER_MILESTONE' });
  } finally {
    Math.random = previousRandom;
  }
  assert.equal(recovered.phase, 'ready', 'milestone recovery does not open an asset-choice screen');
  assert.equal(recovered.players[0].equipment.car, assets.find(asset => asset.category === 'car').id, 'recovery chooses a random eligible milestone asset');
  assert.equal(recovered.players[0].assetLevels[recovered.players[0].equipment.car], 1);
  assert.equal(recovered.players[0].upgradeTokens, 0);
  assert.equal(eventTypes(recovered).includes('MILESTONE_RECOVERED'), true);
  assert.equal(eventTypes(recovered).includes('UPGRADE_TOKEN_SPENT'), true);
  const notPassed = readyWithPlayer(recoverBase, 0, { position: 9 });
  assert.equal(advanceMatch(notPassed, { type: 'RECOVER_MILESTONE' }), notPassed, 'future milestone assets cannot be recovered');

  const holdStart = readyWithPlayer(start(10), 0, { upgradeTokens: 1, heldUpgradeTokens: 0 });
  const held = advanceMatch(holdStart, { type: 'HOLD_UPGRADE_TOKEN' });
  assert.equal(held.players[0].upgradeTokens, 1, 'holding preserves the match token total');
  assert.equal(held.players[0].heldUpgradeTokens, 1);
  assert.equal(availableUpgradeTokens(held.players[0]), 0);
  assert.equal(advanceMatch(held, { type: 'HOLD_UPGRADE_TOKEN' }), held, 'a reserved token cannot be held twice');

  const cpuTurnStart = {
    ...purchased,
    phase: 'landed',
    pending: null,
    turnIndex: 0,
    players: purchased.players.map((player, index) => index === 1 ? {
      ...player,
      position: 0,
      equipment: { ...player.equipment, car: offeredCar.id },
      assetLevels: { [offeredCar.id]: 1 },
      upgradeTokens: 1,
      heldUpgradeTokens: 0,
    } : player),
  };
  let cpuTurn;
  try {
    Math.random = () => 0;
    cpuTurn = advanceMatch(cpuTurnStart, { type: 'NEXT_TURN' });
  } finally {
    Math.random = previousRandom;
  }
  assert.equal(cpuTurn.turnIndex, 1);
  assert.equal(cpuTurn.players[1].assetLevels[offeredCar.id], 2, 'CPU spends its available token when starting a turn');
  assert.equal(cpuTurn.players[1].upgradeTokens, 0);

  match = move(withoutAbilities(start(28), 0), 2);
  assert.equal(match.pending.slot, 'lifestyle');
  assert.equal(advanceMatch(match, { type: 'SKIP_ASSET' }).phase, 'landed');

  match = move(withoutAbilities(start(31), 0), 5);
  assert.equal(match.players[0].position, 35);
  assert.equal(match.phase, 'decision');
  const passedSpaces = match.eventLog.filter((entry) => entry.eventType === 'PASS_SPACE').map((entry) => Number(entry.detail.match(/space (\d+)/)?.[1]));
  assert.deepEqual(passedSpaces.slice(-4), [32, 33, 34, 35]);
  match = advanceMatch(match, { type: 'KEEP_CAREER' });
  match = advanceMatch(match, { type: 'STEP' });
  assert.equal(match.players[0].position, 36);
  assert.equal(countEvent(match, 'LAND_ON_SPACE') >= 1, true);

  match = move(withoutAbilities(start(33), 0), 3);
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
  match = withoutAbilities({
    ...match,
    players: match.players.map((player, index) => index ? player : { ...player, position: 40 }),
    phase: 'ready',
  }, 0);
  assert.equal(match.players[0].salaryAmount, changedSalary);
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
  let wealthStart = withoutAbilities(start(1));
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
assert.equal(reshuffled.cardPiles.wealth.drawPile.length, 15);
  assert.equal(reshuffled.cardPiles.wealth.discardPile.length, 0);
  assert.equal(reshuffled.cardPiles.wealth.inFlight.length, 1);
  assertCompleteCardPiles(reshuffled.cardPiles);
  match = move(withoutAbilities(start(13, 1), 1), 2);
  assert.equal(match.pending.deck, 'gamble');
  const cpuCardId = match.pending.cardId;
  const cpuCardResult = advanceMatch(match, { type: 'AUTO_DECIDE' });
  assert.equal(cpuCardResult.phase, 'decision', 'CPU card result stays visible before acknowledgement');
  assert.equal(cpuCardResult.pending.stage, 'resolved');
  assert(eventTypes(cpuCardResult).includes('CARD_RESOLVED'));
  match = advanceMatch(cpuCardResult, { type: 'AUTO_DECIDE' });
  assert.equal(match.phase, 'landed', 'the second timed CPU stage resumes the turn');
  assert(eventTypes(match).includes('CARD_RESOLVED'));
  assert(match.cardPiles.gamble.discardPile.includes(cpuCardId));
  assert.equal(match.cardPiles.gamble.inFlight.length, 0);
  assertCompleteCardPiles(match.cardPiles);

  let consecutiveCpuMatch = withoutAbilities(start(1, 1));
  const consecutiveCardStops = [
    { before: 1, deck: 'wealth' },
    { before: 5, deck: 'ai' },
    { before: 10, deck: 'fame' },
  ];
  for (let index = 0; index < consecutiveCardStops.length; index += 1) {
    if (index > 0) {
      consecutiveCpuMatch = {
        ...consecutiveCpuMatch,
        phase: 'ready',
        pending: null,
        roll: null,
        stepsRemaining: 0,
        turnIndex: 1,
        players: consecutiveCpuMatch.players.map((player, playerIndex) => playerIndex === 1
          ? { ...player, position: consecutiveCardStops[index].before, status: 'ACTIVE' }
          : player),
      };
    }
    consecutiveCpuMatch = move(consecutiveCpuMatch, 2);
    assert.equal(consecutiveCpuMatch.pending.kind, 'CARD');
    assert.equal(consecutiveCpuMatch.pending.deck, consecutiveCardStops[index].deck);
    const resultStage = advanceMatch(consecutiveCpuMatch, { type: 'AUTO_DECIDE' });
    assert.equal(resultStage.pending.stage, 'resolved');
    consecutiveCpuMatch = advanceMatch(resultStage, { type: 'AUTO_DECIDE' });
    assert.equal(consecutiveCpuMatch.phase, 'landed');
    assert.equal(consecutiveCpuMatch.pending, null);
  }
  assertCompleteCardPiles(consecutiveCpuMatch.cardPiles);
  match = move(withoutAbilities(start(58, 1)), 2);
  assert.equal(match.pending.slot, 'property');
  match = advanceMatch(match, { type: 'AUTO_DECIDE' });
  assert.equal(match.phase, 'landed');
  assert(match.players[1].equipment.property);
  match = move(withoutAbilities(start(33, 1), 1), 3);
  match = withRandomValue(0.9, () => advanceMatch(match, { type: 'AUTO_DECIDE' }));
  assert.equal(match.phase, 'moving');
  assert.equal(match.players[1].position, 35);
  const finishLineStart = withoutAbilities(start(73), 0);
  const finishLinePlayer = finishLineStart.players[0];
  const finishLineFixture = {
    ...finishLineStart,
    players: finishLineStart.players.map((player, index) => index === 0 ? {
      ...player,
      wealth: 640000,
      aiSkill: 3,
      fame: 5,
      lifestyle: 2,
      influence: 4,
      equipment: { ...player.equipment, car: 'budget-racer' },
      assetLevels: { ...player.assetLevels, 'budget-racer': 3 },
      upgradeTokens: 5,
      heldUpgradeTokens: 3,
      upgrades: ['finish-line-fixture'],
    } : player),
  };
  match = move(finishLineFixture, 2);
  assert.equal(match.players[0].position, 75);
  assert.equal(match.phase, 'endgame');
  assert.equal(match.players[0].status, 'FINISHED');
  assert.equal(match.players[0].endgame.status, 'PENDING');
  assert.equal(match.players[0].endgame.choice, undefined, 'the endgame requires an explicit player choice');
  assert.equal(match.players[0].endgame.baseValue, calculateEndgameBaseValue(match.players[0]));
  assert.equal(match.players[0].endgame.snapshot.position, 75);
  assert.equal(match.players[0].endgame.snapshot.characterId, finishLinePlayer.characterId);
  assert.equal(match.players[0].endgame.snapshot.careerId, finishLinePlayer.careerId);
  assert.equal(match.players[0].endgame.snapshot.salaryAmount, finishLinePlayer.salaryAmount);
  assert.equal(match.players[0].endgame.snapshot.assetLevels['budget-racer'], 3);
  assert.equal(match.players[0].endgame.snapshot.equipment.car, 'budget-racer');
  assert.equal(match.players[0].endgame.snapshot.heldUpgradeTokens, 3);
  assert.equal(match.players[0].endgame.snapshot.upgradeTokens, 5);
  assert.deepEqual(match.players[0].endgame.snapshot.upgrades, ['finish-line-fixture']);
  assert(eventTypes(match).includes('FINISH_LINE_REACHED'));
  assert(eventTypes(match).includes('ENDGAME_STARTED'));
  assert(eventTypes(match).includes('TURN_END'), 'reaching the finish line closes that player’s normal turn');
  assert(match.eventLog.some(entry => entry.eventType === 'LAND_ON_SPACE'), 'the finish-space landing resolves before the player is frozen');
  assert.equal(
    advanceMatch(match, { type: 'ROLL', result: { die1: 1, die2: 1, total: 2, doubles: true } }),
    match,
    'a finished player cannot roll while choosing an endgame path',
  );

  // Finish rewards use arrival order, not Wealth, and are included in the
  // immutable finish snapshot exactly once for both human and CPU players.
  assert.deepEqual([...FINISH_ORDER_WEALTH_REWARDS], [100000, 75000, 50000, 25000]);
  let finishOrderFixture = withoutAbilities(createMatch(id));
  finishOrderFixture = {
    ...finishOrderFixture,
    players: finishOrderFixture.players.map((player, index) => ({
      ...player,
      aiSkill: [10, 10, 4, 3][index],
      fame: [2, 12, 10, 1][index],
      lifestyle: [5, 4, 16, 3][index],
      influence: [5, 8, 2, 18][index],
    })),
  };
  const arrivalWealths = [900000, 1000, 500000, 250000];
  for (let rank = 0; rank < 4; rank += 1) {
    const playerIndex = rank;
    finishOrderFixture = {
      ...finishOrderFixture,
      phase: 'ready',
      turnIndex: playerIndex,
      players: finishOrderFixture.players.map((player, index) => index === playerIndex
        ? { ...player, position: 74, wealth: arrivalWealths[index], isCPU: index === 1 }
        : player),
    };
    const finished = move(finishOrderFixture, 2);
    const player = finished.players[playerIndex];
    assert.equal(player.status, 'FINISHED');
    assert.equal(finished.finishOrder[rank], playerIndex);
    assert.equal(
      player.wealth,
      arrivalWealths[playerIndex] + FINISH_ORDER_WEALTH_REWARDS[rank] + (rank === 3 ? 50_000 : 0),
    );
    assert.equal(player.endgame.snapshot.wealth, player.wealth, 'finish snapshot includes the reward');
    assert.equal(finished.wealthEvents.filter(event => event.playerIndex === playerIndex && event.space === 75).length, 1);
    assert.equal(finished.wealthEvents.find(event => event.playerIndex === playerIndex && event.space === 75)?.kind, 'FINISH_BONUS');
    assert.equal(advanceMatch(finished, { type: 'STEP' }), finished, 'finish reward cannot repeat');
    finishOrderFixture = {
      ...finished,
      phase: 'ready',
      pending: null,
      roll: null,
      stepsRemaining: 0,
    };
  }
  assert.deepEqual(
    finishOrderFixture.endgameAttributeBonuses.map((award) => [award.attribute, award.playerIndex, award.amount]),
    [
      ['aiSkill', 0, 50_000],
      ['fame', 1, 50_000],
      ['lifestyle', 2, 50_000],
      ['influence', 3, 50_000],
    ],
    'each final attribute has one $50K winner; the earlier finisher wins the AI Skill tie',
  );
  const finalBonusMarkup = renderToStaticMarkup(React.createElement(EndgameAttributeBonusSummary, {
    awards: finishOrderFixture.endgameAttributeBonuses,
    players: finishOrderFixture.players,
  }));
  assert(finalBonusMarkup.includes('Four leaders. Four $50K awards.'), 'the final leaderboard summary shows the four attribute awards');
  assert(finalBonusMarkup.includes('lower player slot wins'), 'the tie-break rule is documented in the visible summary');
  for (let playerIndex = 0; playerIndex < finishOrderFixture.players.length; playerIndex += 1) {
    const player = finishOrderFixture.players[playerIndex];
    assert.equal(player.wealth, arrivalWealths[playerIndex] + FINISH_ORDER_WEALTH_REWARDS[playerIndex] + 50_000);
    assert.equal(player.endgame.snapshot.wealth, player.wealth, 'final attribute bonus is included in every finish snapshot');
    assert.equal(player.endgame.baseValue, calculateEndgameBaseValue(player), 'pending endgame value includes the bonus wealth');
  }
  assert.equal(
    advanceMatch(finishOrderFixture, { type: 'STEP' }),
    finishOrderFixture,
    'the final attribute bonuses cannot be awarded twice',
  );

  assert.equal(advanceMatch(match, { type: 'CHOOSE_ENDGAME', choice: 'CASH_OUT' }).players[0].endgame.status, 'RESOLVED');
  assert.equal(cashOutValue(100000).multiplier, 1);
  assert.equal(cashOutValue(100000).finalGameValue, 100000, 'Cash Out preserves the locked base value');
  assert.equal(doubleDownValue(100000, 2).effectiveRoll, 2);
  assert.equal(doubleDownValue(100000, 2).multiplier, 0.25);
  assert.equal(doubleDownValue(100000, 8).effectiveRoll, 8);
  assert.equal(doubleDownValue(100000, 8).multiplier, 2.75);
  assert.equal(finalGambleValue(100000, 10000).adjustedDelta, 10000);
  assert.equal(finalGambleValue(100000, -10000).adjustedDelta, -10000);
  const cashResult = advanceMatch(match, { type: 'CHOOSE_ENDGAME', choice: 'CASH_OUT' });
  assert.equal(cashResult.phase, 'landed');
  assert.equal(cashResult.players[0].endgame.status, 'RESOLVED');
  assert.equal(cashResult.players[0].endgame.choice, 'CASH_OUT');
  assert.equal(
    cashResult.players[0].endgame.finalGameValue,
    cashOutValue(cashResult.players[0].endgame.baseValue).finalGameValue,
  );
  assert.equal(cashResult.players[0].heldUpgradeTokens, 3, 'endgame modifiers do not spend held tokens');
  assert.equal(cashResult.players[0].upgradeTokens, 5, 'endgame resolution does not mutate the unheld token pool');
  assert(eventTypes(cashResult).includes('ENDGAME_CHOICE_SELECTED'));
  assert(eventTypes(cashResult).includes('CASH_OUT_RESOLVED'));
  assert(eventTypes(cashResult).includes('ENDGAME_COMPLETED'));
  assert.equal(
    cashResult.eventLog.find(entry => entry.eventType === 'ENDGAME_COMPLETED').amount,
    cashResult.players[0].endgame.finalGameValue,
    'the final value is retained in the event log',
  );
  const continued = advanceMatch(cashResult, { type: 'NEXT_TURN' });
  assert.equal(continued.turnIndex, 1);
  assert.equal(continued.phase, 'ready');
  assert.equal(continued.players[0].status, 'FINISHED');
  assert.equal(continued.players[1].status, 'ACTIVE', 'the remaining players continue after a finisher resolves');
  assert.equal(continued.turnCounter, 2, 'the finishing player’s last normal turn is counted exactly once');
  assert.equal(continued.round, 1);
  const queuedEndgame = {
    ...cashResult,
    players: cashResult.players.map((player, index) => {
      if (index !== 3) return player;
      const finishedPlayer = { ...player, position: 75, status: 'FINISHED' };
      return {
        ...finishedPlayer,
        endgame: {
          status: 'PENDING',
          snapshot: createFinishSnapshot(finishedPlayer, index, player.isCPU, cashResult.round, cashResult.turnCounter),
          baseValue: 100000,
        },
      };
    }),
  };
  const nextScheduledPlayer = advanceMatch(queuedEndgame, { type: 'NEXT_TURN' });
  assert.equal(nextScheduledPlayer.turnIndex, 1, 'a distant pending endgame does not jump ahead of nearer active players');
  assert.equal(nextScheduledPlayer.phase, 'ready');
  assert.equal(nextScheduledPlayer.players[3].endgame.status, 'PENDING');

  const doubleStartBase = withoutAbilities(start(73), 0);
  const doubleStart = {
    ...doubleStartBase,
    players: doubleStartBase.players.map((player, index) => index === 0
      ? { ...player, heldUpgradeTokens: 4, upgradeTokens: 4 }
      : player),
  };
  const doublePending = move(doubleStart, 2);
  const doubleResult = withRandomValue(0.999, () =>
    advanceMatch(doublePending, { type: 'CHOOSE_ENDGAME', choice: 'DOUBLE_DOWN' }),
  );
  assert.equal(doubleResult.players[0].endgame.status, 'RESOLVED');
  assert.deepEqual(doubleResult.players[0].endgame.dice, { die1: 4, die2: 4, total: 8, doubles: true });
  assert.equal(doubleResult.players[0].endgame.effectiveRoll, 8);
  assert.equal(doubleResult.players[0].endgame.multiplier, 2.75);
  assert.equal(doubleResult.players[0].endgame.finalGameValue, Math.round(doubleResult.players[0].endgame.baseValue * 2.75));
  assert(eventTypes(doubleResult).includes('DOUBLE_DOWN_RESOLVED'));
  assert(eventTypes(doubleResult).includes('ENDGAME_COMPLETED'));
  assert.equal(doubleResult.players[0].history.doubleDowns, 1, 'resolved Double Downs are retained in match history');

  const gambleStartBase = withoutAbilities(start(73), 0);
  const gambleDeck = gambleStartBase.cardPiles.gamble;
  const gambleCardId = 'gamble-edge';
  const gambleStart = {
    ...gambleStartBase,
    cardPiles: {
      ...gambleStartBase.cardPiles,
      gamble: {
        ...gambleDeck,
        drawPile: [gambleCardId, ...gambleDeck.drawPile.filter(cardId => cardId !== gambleCardId)],
      },
    },
  };
  const gamblePending = move(gambleStart, 2);
  const gambleResult = advanceMatch(gamblePending, { type: 'CHOOSE_ENDGAME', choice: 'FINAL_GAMBLE' });
  assert.equal(gambleResult.players[0].endgame.status, 'RESOLVED');
  assert.equal(gambleResult.players[0].endgame.choice, 'FINAL_GAMBLE');
  assert.equal(gambleResult.players[0].endgame.gambleCardId, gambleCardId);
  assert(Number.isFinite(gambleResult.players[0].endgame.gambleRawDelta));
  assert(Number.isFinite(gambleResult.players[0].endgame.gambleAdjustedDelta));
  assert(gambleResult.players[0].endgame.finalGameValue >= 0);
  assert(gambleResult.cardPiles.gamble.discardPile.includes(gambleCardId));
  assert.equal(gambleResult.cardPiles.gamble.inFlight.length, 0);
  assert(eventTypes(gambleResult).includes('CARD_DRAW'));
  assert(eventTypes(gambleResult).includes('CARD_RESOLVED'));
  assert(eventTypes(gambleResult).includes('FINAL_GAMBLE_RESOLVED'));
  assert(eventTypes(gambleResult).includes('ENDGAME_COMPLETED'));
  assert.equal(gambleResult.players[0].history.gambleCardsDrawn, 1, 'Final Gamble card draws are retained in match history');
  assert.equal(gambleResult.players[0].history.finalGambles, 1, 'Final Gamble choices are counted for title evaluation');
  assertCompleteCardPiles(gambleResult.cardPiles);

  const titleFixture = createMatch(id);
  const titleCompletionStart = {
    ...titleFixture,
    phase: 'landed',
    turnIndex: 0,
    players: titleFixture.players.map((player, index) => {
      const featuredAsset = assets.find(asset => asset.category === 'car');
      const titledPlayer = {
        ...player,
        position: 75,
        wealth: index < 2 ? 100000 : 300000,
        aiSkill: index < 2 ? 14 : 0,
        fame: index === 2 ? 14 : 0,
        lifestyle: 0,
        influence: 0,
        equipment: index === 0 && featuredAsset
          ? { ...player.equipment, car: featuredAsset.id }
          : player.equipment,
        assetLevels: index === 0 && featuredAsset
          ? { ...player.assetLevels, [featuredAsset.id]: 3 }
          : player.assetLevels,
        upgradeTokens: index === 0 ? 0 : player.upgradeTokens,
        heldUpgradeTokens: index === 0 ? 0 : player.heldUpgradeTokens,
        history: {
          ...player.history,
          gambleCardsDrawn: index === 3 ? 4 : 0,
          finalGambles: index === 3 ? 1 : 0,
          upgradeTokensSpent: index === 0 ? 2 : player.history.upgradeTokensSpent,
        },
      };
      const choice = index === 3 ? 'FINAL_GAMBLE' : 'CASH_OUT';
      const endgame = {
        status: 'RESOLVED',
        snapshot: createFinishSnapshot(titledPlayer, player.slot, player.isCPU, 3, 1),
        baseValue: 300000,
        choice,
        finalGameValue: 350000,
      };
      return { ...titledPlayer, status: 'FINISHED', endgame };
    }),
  };
  assert.equal(
    evaluateEndGameTitle(titleCompletionStart.players[0], titleCompletionStart.players[0].endgame).endGameTitle,
    'THE MACHINE',
    'high AI skill produces a behavior-specific title',
  );
  assert.equal(
    evaluateEndGameTitle(titleCompletionStart.players[2], titleCompletionStart.players[2].endgame).endGameTitle,
    'THE MAIN CHARACTER',
    'high Fame produces a distinct title',
  );
  assert.equal(
    evaluateEndGameTitle(titleCompletionStart.players[3], titleCompletionStart.players[3].endgame).endGameTitle,
    'THE DEGEN',
    'actual gamble history and the final choice inform the title',
  );
  const titledCompleteMatch = advanceMatch(titleCompletionStart, { type: 'NEXT_TURN' });
  assert.equal(titledCompleteMatch.phase, 'complete');
  assert(titledCompleteMatch.players.every(player =>
    typeof player.endgame?.endGameTitle === 'string'
      && typeof player.endgame?.endGameTitleDescription === 'string',
  ), 'all human and CPU players receive one stored title when the match completes');
  assert.equal(
    titledCompleteMatch.players[0].endgame.endGameTitle,
    titledCompleteMatch.players[1].endgame.endGameTitle,
    'equivalent player histories receive the same title regardless of human or CPU control',
  );
  const { FinishLinePanel, MatchResultsPanel } = await vite.ssrLoadModule('/src/components/finish-line-panel.tsx');
  const resultsMarkup = renderToStaticMarkup(
    React.createElement(MatchResultsPanel, { players: titledCompleteMatch.players, finishOrder: [2, 3, 0, 1] }),
  );
  assert.equal((resultsMarkup.match(/class="finish-line-result-row/g) ?? []).length, 4, 'the final record renders all four resolved players');
  assert(resultsMarkup.includes('THE MACHINE'), 'the final record displays each assigned end-game title');
  assert(resultsMarkup.includes('HELD TOKENS / FUTURE CREDITS') && resultsMarkup.includes('held tokens are not included in this match value'), 'final records explain that held tokens carry forward without affecting match value');
  assert(resultsMarkup.includes('level 3'), 'final assets retain their captured upgrade level');
  assert(resultsMarkup.includes('1ST TO FINISH') && resultsMarkup.includes('FINISH BONUS'), 'final records distinguish arrival order from final-value placement');

  const lastFinisher = finishOrderFixture.players[3];
  const finishPanelMarkup = renderToStaticMarkup(React.createElement(FinishLinePanel, {
    player: lastFinisher,
    endgame: lastFinisher.endgame,
    finishPlace: 4,
    finishBonus: FINISH_ORDER_WEALTH_REWARDS[3],
    onChoose: () => {},
    onContinue: () => {},
  }));
  assert(finishPanelMarkup.includes('4TH TO FINISH!') && finishPanelMarkup.includes('FINISH BONUS'), 'finish screen announces arrival place and the Wealth bonus');
  assert(finishPanelMarkup.includes('HELD TOKENS / FUTURE CREDITS'), 'the finish screen labels held tokens as future Credits conversion');

  const cpuFinishStart = withoutAbilities(start(73, 1), 1);
  const cpuPending = move(cpuFinishStart, 2);
  assert.equal(cpuPending.phase, 'endgame');
  assert.equal(cpuPending.players[1].endgame.status, 'PENDING');
  const cpuResult = advanceMatch(cpuPending, { type: 'AUTO_DECIDE' });
  assert.equal(cpuResult.phase, 'landed');
  assert.equal(cpuResult.players[1].endgame.status, 'RESOLVED');
  assert(['CASH_OUT', 'DOUBLE_DOWN', 'FINAL_GAMBLE'].includes(cpuResult.players[1].endgame.choice));
  assert(eventTypes(cpuResult).includes('ENDGAME_COMPLETED'), 'CPU endgame choices resolve and log without human input');
  const lastSlotPending = move(withoutAbilities(start(73, 3), 3), 2);
  const lastSlotResolved = advanceMatch(lastSlotPending, { type: 'AUTO_DECIDE' });
  const nextRound = advanceMatch(lastSlotResolved, { type: 'NEXT_TURN' });
  assert.equal(nextRound.turnIndex, 0);
  assert.equal(nextRound.round, 2, 'finishing in the final player slot advances the round');
  assert.equal(nextRound.turnCounter, 2);
  assert.equal(eventTypes(lastSlotResolved).filter(type => type === 'TURN_END').length, 1, 'finish resolution does not emit a duplicate turn end');
  const lastSlotFinishedEarlier = {
    ...lastSlotResolved,
    turnCounter: 2,
    players: lastSlotResolved.players.map((player, index) => index === 3 ? {
      ...player,
      endgame: {
        ...player.endgame,
        snapshot: { ...player.endgame.snapshot, capturedTurnCounter: 1 },
      },
    } : player),
  };
  const nextRoundAfterSkippedLastSlot = advanceMatch(lastSlotFinishedEarlier, { type: 'NEXT_TURN' });
  assert.equal(nextRoundAfterSkippedLastSlot.round, 2, 'a previously finished final-slot player still closes the round');
  assert.equal(nextRoundAfterSkippedLastSlot.turnCounter, 2, 'skipping a finished player does not count another normal turn');
  const completeFixture = {
    ...cashResult,
    phase: 'landed',
    turnIndex: 0,
    players: cashResult.players.map((player, index) => {
      if (index === 0) return player;
      const finishedPlayer = { ...player, position: 75, status: 'FINISHED' };
      return {
        ...finishedPlayer,
        endgame: {
          status: 'RESOLVED',
          snapshot: createFinishSnapshot(finishedPlayer, index, player.isCPU, cashResult.round, cashResult.turnCounter),
          baseValue: 100000,
          choice: 'CASH_OUT',
          finalGameValue: 100000,
        },
      };
    }),
  };
  const matchComplete = advanceMatch(completeFixture, { type: 'NEXT_TURN' });
  assert.equal(matchComplete.phase, 'complete');
  assert.equal(advanceMatch(matchComplete, { type: 'ROLL', result: { die1: 1, die2: 1, total: 2, doubles: true } }), matchComplete);
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
  assert.equal(match.players[0].influence, influenceBefore + 1);

  const purchaseDebug = start(8);
  match = move({
    ...purchaseDebug,
    players: purchaseDebug.players.map((player, index) => index === 0 ? { ...player, characterId: 'hotwired', careerId: 'real-estate-investor', wealth: 900000 } : player),
  }, 2);
  const lifestyleBefore = match.players[0].lifestyle;
  const carId = match.pending.offeredAssetIds[0];
  match = advanceMatch(match, { type: 'BUY_ASSET', assetId: carId });
  assert.equal(match.players[0].lifestyle, lifestyleBefore + (getAsset(carId).effects.lifestyle ?? 0) + 1);

  const convertedEventLanding = move(withoutAbilities(start(3)), 2);
  assert.equal(convertedEventLanding.players[0].position, 5);
  assert.equal(convertedEventLanding.pending.kind, 'CARD');
  assert.equal(convertedEventLanding.pending.deck, 'wealth');
  assert.equal(countEvent(convertedEventLanding, 'BOARD_EFFECT_RESOLVED'), 0);
  const passedConvertedSpace = move(withoutAbilities(start(3)), 4);
  assert.equal(passedConvertedSpace.players[0].position, 7);
  assert.equal(countEvent(passedConvertedSpace, 'CARD_DRAW'), 1, 'passing space 5 does not draw; landing on space 7 draws once');

  assert.deepEqual(
    BOARD_SPACES.filter(space => space.type === 'EVENT').map(space => space.number),
    [],
    'Space 1 Open Road has no event effect',
  );
  console.log('CARD ARTWORK AUDIT');
  console.log('DECK | TOTAL | WITH IMAGE | MISSING');
  for (const deck of decks) {
    const deckCards = cardsForDeck(deck.id);
    const withImages = deckCards.filter(card => {
      const path = getCardArtworkFilePath(card.id);
      return Boolean(path && existsSync(new URL(`../public/${path}`, import.meta.url)));
    }).length;
    assert.equal(withImages, deckCards.length, `${deck.name} deck has a mapped, existing image for every draw card`);
    console.log(`${deck.name} | ${deckCards.length} | ${withImages} | ${deckCards.length - withImages}`);
  }
  console.log(`PASS: 21 portraits, 21 character ability displays, ${careers.length} career ability displays, 96 cards, 100 milestone visuals, four-level artwork, all 75 board icons, finish-order rewards, endgame and board regressions`);
} finally {
  await vite.close();
}