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
  const { abilities, getAbility } = await vite.ssrLoadModule('/src/game/abilities.ts');
  const { characters } = await vite.ssrLoadModule('/src/game/characters.ts');
  const { careers, categories, getCareer } = await vite.ssrLoadModule('/src/game/careers.ts');
  const { BOARD_SPACES, PAYDAY_SPACES, getSpace } = await vite.ssrLoadModule('/src/game/board-data.ts');
  const { getSpaceVisual } = await vite.ssrLoadModule('/src/components/board-space-visuals.ts');
  const { BOARD_EFFECTS } = await vite.ssrLoadModule('/src/game/board-effects.ts');
  const { getAsset, assets, MAX_ASSET_LEVEL } = await vite.ssrLoadModule('/src/game/assets.ts');
  const { getAssetArtworkFilePath } = await vite.ssrLoadModule('/src/game/asset-artwork.ts');
  const {
    calculateEndgameBaseValue,
    getEndgameTokenTier,
    cashOutValue,
    doubleDownValue,
    finalGambleValue,
    createFinishSnapshot,
  } = await vite.ssrLoadModule('/src/game/endgame.ts');
  const { availableUpgradeTokens, getEligibleRecoveryMilestones } = await vite.ssrLoadModule('/src/game/upgrade-tokens.ts');
  const { visualAssets } = await vite.ssrLoadModule('/src/game/asset-manifest.ts');
  const { ICON_PATHS } = await vite.ssrLoadModule('/src/game/icon-paths.ts');
  const id = characters[0].id;

  for (let i = 0; i < 50; i++) {
    const match = createMatch(id);
    assert.equal(match.players.length, 4);
    assert.equal(new Set(match.players.map(player => player.careerId)).size, 4);
    assert(match.players.every(player => player.salaryAmount === getCareer(player.careerId).salaryTiers[player.salaryTier - 1]));
    const doctor = match.players.find(player => player.careerId === 'doctor');
    if (doctor) assert.equal(doctor.upgradeTokens, 1, 'Doctor grants one match-start Upgrade Token');
    assert(match.players.filter(player => player.careerId !== 'doctor').every(player => player.upgradeTokens === 0), 'no other starting career grants a token');
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

  assert.equal(BOARD_SPACES.length, 75, 'the board retains 75 spaces');
  assert.deepEqual(BOARD_SPACES.filter(space => space.type === 'CARD').map(space => space.number), [3, 7, 12, 17, 22, 32, 42, 52, 62]);
  assert.deepEqual([...PAYDAY_SPACES], [6, 18, 29, 41, 54, 66, 73]);
  assert.deepEqual(BOARD_SPACES.filter(space => space.type === 'MILESTONE' || space.type === 'CAREER_CHANGE').map(space => space.number), [10, 30, 35, 45, 60, 75]);
  assert.deepEqual(BOARD_SPACES.filter(space => space.type === 'GAMBLE').map(space => space.number), [15, 50, 70]);
  const expectedDeckCodes = new Map([[3, 'W'], [7, 'AI'], [12, 'FM'], [17, 'LS'], [22, 'IN'], [32, 'W'], [42, 'AI'], [52, 'FM'], [62, 'IN']]);
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
  assert.equal(BOARD_EFFECTS.length, 15, 'the board has 15 active predictable effects');
  assert.deepEqual(BOARD_SPACES.filter(space => space.effectId).map(space => space.number), [1, 5, 13, 20, 24, 27, 33, 37, 39, 47, 49, 57, 64, 67, 72]);
  assert.deepEqual(BOARD_SPACES.filter(space => space.type === 'UPGRADE_TOKEN').map(space => space.number), [14, 55], 'exactly two existing board spaces award Upgrade Tokens');
  assert(BOARD_SPACES.filter(space => space.type === 'UPGRADE_TOKEN').every(space => space.trigger === 'LAND' && getSpaceVisual(space).className === 'upgrade'), 'token spaces award only on landing and have a distinct visual');
  assert.equal(BOARD_SPACES.filter(space => space.type === 'NORMAL').length, 33, 'the two token spaces replace NORMAL spaces without changing route length');

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
  const validEventTypes = new Set(['TURN_START', 'TURN_END', 'DICE_ROLL', 'DOUBLES_ROLLED', 'ROLL_OF_2', 'ROLL_OF_8', 'PLAYER_MOVED', 'PASS_SPACE', 'LAND_ON_SPACE', 'PASS_PLAYER', 'LAND_ON_PLAYER', 'SALARY_GATE', 'CAREER_CHANGE', 'MILESTONE', 'BOARD_EFFECT_RESOLVED', 'CARD_DRAW', 'CARD_RESOLVED', 'UPGRADE_TOKEN_GAINED', 'UPGRADE_TOKEN_SPENT', 'UPGRADE_TOKEN_HELD', 'ASSET_UPGRADED', 'MILESTONE_RECOVERED', 'ASSET_PURCHASED', 'CAR_PURCHASED', 'LIFESTYLE_PURCHASED', 'PET_PURCHASED', 'INVESTMENT_PURCHASED', 'PROPERTY_PURCHASED', 'WEALTH_CHANGED', 'AI_SKILL_CHANGED', 'FAME_CHANGED', 'LIFESTYLE_CHANGED', 'INFLUENCE_CHANGED', 'PLAYER_AFFECTED']);
  const validEffectTypes = new Set(['ADD_WEALTH', 'REMOVE_WEALTH', 'ADD_AI_SKILL', 'REMOVE_AI_SKILL', 'ADD_FAME', 'REMOVE_FAME', 'ADD_LIFESTYLE', 'REMOVE_LIFESTYLE', 'ADD_INFLUENCE', 'REMOVE_INFLUENCE', 'MOVE_PLAYER', 'DRAW_CARD', 'AFFECT_OTHER_PLAYER', 'PROTECT_FROM_EFFECT', 'MODIFY_REWARD', 'MODIFY_SALARY', 'TRIGGER_EVENT']);
  const validConditions = new Set(['ANY', 'EVENT_ACTOR_IS_SELF', 'EVENT_ACTOR_IS_OTHER', 'EVENT_OWNER_IS_EVENT_TARGET', 'EVENT_DELTA_IS_NEGATIVE', 'EVENT_DELTA_IS_POSITIVE', 'EVENT_STAGE_IS', 'EVENT_HAS_TARGET_PLAYER', 'EVENT_CATEGORY_IS', 'EVENT_DECK_IS', 'EVENT_SPACE_IS', 'EVENT_STAT_IS', 'PLAYER_CAREER_TAG', 'TARGET_IS_OTHER_PLAYER']);
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
      assert(ability && ability.trigger && validEventTypes.has(ability.trigger), `${character.id} has a valid ability trigger`);
      assert(ability.effects.length > 0, `${character.id} has a non-empty ability effect list`);
    }
  }
  assert.equal(careers.length, 15, 'the career roster retains all 15 careers');
  assert.equal(careers.filter(career => career.startingUpgradeTokens === 1).length, 1, 'exactly one existing career grants a starting token');
  for (const career of careers) {
    assert(categories.some(category => category.id === career.categoryId), `${career.id} uses an existing career category`);
    assert(career.abilityIds.length >= 2 && career.abilityName && career.abilityDescription, `${career.id} has a career ability and affinity abilities`);
    assert(validDecks.has(career.deckAffinity.primary), `${career.id} has a valid primary deck affinity`);
    if (career.deckAffinity.secondary) assert(validDecks.has(career.deckAffinity.secondary), `${career.id} has a valid secondary deck affinity`);
    for (const abilityId of career.abilityIds) {
      const ability = getAbility(abilityId);
      assert(ability && ability.trigger && validEventTypes.has(ability.trigger), `${career.id} has a valid ability trigger`);
      assert(ability.effects.length > 0, `${career.id} has a non-empty ability effect list`);
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
    }
  }
  for (const ability of abilities) {
    assert(ability.trigger && validEventTypes.has(ability.trigger), `${ability.id} has a valid trigger`);
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
    validateCardEffects(card.effects, card.id);
    const artPath = getCardArtworkFilePath(card.id);
    assert(artPath, `${card.id} has an artwork mapping`);
    assert(existsSync(new URL(`../public/${artPath}`, import.meta.url)), `${card.id} artwork exists at ${artPath}`);
    const probe = createMatch(id);
    const tokenCountBefore = probe.players[0].upgradeTokens;
    const resolved = resolveEventQueue(probe, [{ type: 'CARD_RESOLVED', playerIndex: 0, deck: card.deck, cardId: card.id, spaceNumber: 1 }]);
    assert(resolved.eventLog.some(entry => entry.eventType === 'CARD_RESOLVED' && entry.detail.includes(card.title)), `${card.id} resolves through the event engine`);
    assert.equal(resolved.players[0].upgradeTokens, tokenCountBefore + (card.id.endsWith('upgrade-token') ? 1 : 0), `${card.id} applies any token reward through the event engine`);
  }

  let seeded = createMatch(id);
  assert.equal(seeded.eventLog.at(-1).eventType, 'TURN_START');
  const seededWealth = seeded.players[0].wealth;
  const seededFame = seeded.players[0].fame;
  const seededLifestyle = seeded.players[0].lifestyle;
  seeded = { ...seeded, players: seeded.players.map((player, index) => index ? player : { ...player, careerId: 'degen-trader', characterId: 'danger_zone' }) };
  seeded = advanceMatch(seeded, { type: 'ROLL', result: { die1: 4, die2: 4, total: 8, doubles: true } });
  assert(eventTypes(seeded).includes('DICE_ROLL'));
  assert(eventTypes(seeded).includes('DOUBLES_ROLLED'));
  assert(eventTypes(seeded).includes('ROLL_OF_8'));
  assert.equal(seeded.players[0].wealth, seededWealth + 10000);
  assert.equal(seeded.players[0].fame, seededFame);
  assert.equal(seeded.players[0].lifestyle, seededLifestyle);

  let rollTwo = startWithoutProtection(1);
  rollTwo = {
    ...rollTwo,
    players: rollTwo.players.map((player, index) => index === 0 ? { ...player, characterId: 'sadman' } : player),
  };
  const rollTwoFame = rollTwo.players[0].fame;
  rollTwo = resolveEventQueue(rollTwo, [{ type: 'DICE_ROLL', playerIndex: 0, die1: 1, die2: 1, total: 2, doubles: true }]);
  assert(eventTypes(rollTwo).includes('ROLL_OF_2'), 'a total of 2 emits its native roll event');
  assert.equal(rollTwo.players[0].fame, rollTwoFame + 2, 'Sadman reacts to roll 2');

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
  assert.equal(carPurchase.players[0].fame, carFame + 1, 'Race Driver reacts to a car purchase');

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
  assert.equal(propertyPurchase.players[0].wealth, propertyWealth + 2500, 'Real Estate Investor reacts to a property purchase');

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
  assert.equal(cpuAbility.players[0].fame, humanAbility.players[0].fame, 'CPU and human fixtures resolve the same character ability outcome');
  assert.equal(
    cpuAbility.eventLog.filter(entry => entry.abilityId === 'character:sadman').length,
    humanAbility.eventLog.filter(entry => entry.abilityId === 'character:sadman').length,
    'CPU and human fixtures log the same ability activation',
  );

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
  assert.equal(assets.length, 100, 'the complete milestone catalog has 100 choices');
  for (const category of ['car', 'lifestyle', 'pet', 'investment', 'property']) {
    assert.equal(assets.filter(asset => asset.category === category).length, 20);
  }
  const levelOneArtworkPaths = assets.map(asset => getAssetArtworkFilePath(asset.id));
  assert(levelOneArtworkPaths.every(Boolean), 'all milestone choices map to Level 1 artwork');
  assert.equal(new Set(levelOneArtworkPaths).size, 100, 'every milestone choice has a distinct Level 1 artwork path');
  assert.equal(getAssetArtworkFilePath('budget-racer'), 'milestone-assets/cars/CAR_01.webp', 'legacy car artwork mapping remains stable');
  assert.equal(getAssetArtworkFilePath('luxury-travel'), 'milestone-assets/lifestyles/LIFESTYLE_01.webp', 'legacy lifestyle artwork mapping remains stable');
  for (const asset of assets) {
    assert.equal(Object.keys(asset.visualVariants ?? {}).length, MAX_ASSET_LEVEL, `${asset.id} has a visual reference at every upgrade level`);
    assert.deepEqual([2, 3, 4].map(level => asset.visualVariants[level]), [
      `${asset.category}:reinforcement`,
      `${asset.category}:expansion`,
      `${asset.category}:signature`,
    ], `${asset.id} has category-appropriate Level 2–4 visuals`);
  }
  assert(levelOneArtworkPaths.every(path => existsSync(new URL(`../public/${path}`, import.meta.url))), 'all 100 Level 1 artwork files exist');
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
  assert.equal(availableUpgradeTokens(readyWithPlayer(upgradeReady, 0, { heldUpgradeTokens: 1 } ).players[0]), 0, 'held tokens cannot be spent mid-match');
  const capped = readyWithPlayer(upgradeReady, 0, {
    assetLevels: { ...upgradeReady.players[0].assetLevels, [offeredCar.id]: MAX_ASSET_LEVEL },
    upgradeTokens: 1,
  });
  assert.equal(advanceMatch(capped, { type: 'UPGRADE_ASSET', assetId: offeredCar.id }), capped, 'Level 4 is the maximum');

  const emptyEquipment = { car: null, lifestyle: null, companion: null, property: null };
  const recoverBase = readyWithPlayer(start(31), 0, {
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
  let wealthStart = start(1);
  wealthStart = {
    ...wealthStart,
    players: wealthStart.players.map((player, index) => index === 0 ? { ...player, careerId: 'doctor', characterId: 'frostbyte' } : player),
  };
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
  assert.equal(match.players[0].endgame.tokenTier, 3);
  assert(eventTypes(match).includes('FINISH_LINE_REACHED'));
  assert(eventTypes(match).includes('ENDGAME_STARTED'));
  assert(eventTypes(match).includes('TURN_END'), 'reaching the finish line closes that player’s normal turn');
  assert(match.eventLog.some(entry => entry.eventType === 'LAND_ON_SPACE'), 'the finish-space landing resolves before the player is frozen');
  assert.equal(
    advanceMatch(match, { type: 'ROLL', result: { die1: 1, die2: 1, total: 2, doubles: true } }),
    match,
    'a finished player cannot roll while choosing an endgame path',
  );
  assert.equal(advanceMatch(match, { type: 'CHOOSE_ENDGAME', choice: 'CASH_OUT' }).players[0].endgame.status, 'RESOLVED');
  assert.deepEqual([0, 1, 2, 3, 4, 12].map(getEndgameTokenTier), [0, 1, 2, 3, 4, 4]);
  assert(cashOutValue(100000, 4).finalGameValue > cashOutValue(100000, 0).finalGameValue, 'held tokens enhance Cash Out without becoming cash');
  assert.equal(doubleDownValue(100000, 2, 0).multiplier, 0.25);
  assert.equal(doubleDownValue(100000, 2, 4).effectiveRoll, 6, 'four held tokens add four points to the final roll');
  assert.equal(doubleDownValue(100000, 2, 4).multiplier, 1.25);
  assert.equal(finalGambleValue(100000, 10000, 0).adjustedDelta, 10000);
  assert(finalGambleValue(100000, 10000, 4).adjustedDelta > 10000, 'held tokens amplify Final Gamble upside');
  assert(finalGambleValue(100000, -10000, 4).adjustedDelta > -10000, 'held tokens reduce Final Gamble downside');
  const cashResult = advanceMatch(match, { type: 'CHOOSE_ENDGAME', choice: 'CASH_OUT' });
  assert.equal(cashResult.phase, 'landed');
  assert.equal(cashResult.players[0].endgame.status, 'RESOLVED');
  assert.equal(cashResult.players[0].endgame.choice, 'CASH_OUT');
  assert.equal(
    cashResult.players[0].endgame.finalGameValue,
    cashOutValue(cashResult.players[0].endgame.baseValue, 3).finalGameValue,
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
          tokenTier: 0,
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
  assert.equal(doubleResult.players[0].endgame.effectiveRoll, 12);
  assert.equal(doubleResult.players[0].endgame.multiplier, 3.6);
  assert.equal(doubleResult.players[0].endgame.finalGameValue, Math.round(doubleResult.players[0].endgame.baseValue * 3.6));
  assert(eventTypes(doubleResult).includes('DOUBLE_DOWN_RESOLVED'));
  assert(eventTypes(doubleResult).includes('ENDGAME_COMPLETED'));

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
  assertCompleteCardPiles(gambleResult.cardPiles);

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
          tokenTier: 0,
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

  function isolatedEffectStart(position, slot = 0) {
    const match = startWithoutProtection(position, slot);
    return {
      ...match,
      players: match.players.map((player, index) => index === slot
        ? { ...player, characterId: 'guardian_h', careerId: 'doctor' }
        : player),
    };
  }
  const penaltyLanding = move(isolatedEffectStart(2), 3);
  assert.equal(penaltyLanding.players[0].position, 5);
  assert.equal(penaltyLanding.players[0].wealth, 897000);
  assert.equal(countEvent(penaltyLanding, 'BOARD_EFFECT_RESOLVED'), 1);
  const passedEffect = move(isolatedEffectStart(3), 4);
  assert.equal(passedEffect.players[0].position, 7);
  assert.equal(countEvent(passedEffect, 'BOARD_EFFECT_RESOLVED'), 0, 'passing an effect space does not trigger it');

  const cpuStart = isolatedEffectStart(2);
  const cpuMatch = {
    ...cpuStart,
    players: cpuStart.players.map((player, index) => index === 0 ? { ...player, isCPU: true } : player),
  };
  const cpuLanding = move(cpuMatch, 3);
  assert.equal(cpuLanding.players[0].wealth, 897000, 'CPU landings resolve the same board effect');

  const protectedStart = startWithoutProtection(2);
  const protectedPlayerId = protectedStart.players[0].playerId;
  const protectedMatch = move({
    ...protectedStart,
    effectProtections: {
      ...protectedStart.effectProtections,
      [protectedPlayerId]: [{ remaining: 1, blockedEffectTypes: ['REMOVE_WEALTH'] }],
    },
  }, 3);
  assert.equal(protectedMatch.players[0].wealth, 900000, 'existing protection blocks a matching board penalty');
  assert.equal(protectedMatch.effectProtections[protectedPlayerId].length, 0, 'blocked effect consumes its protection');

  const digitalCareer = careers.find(career => career.tags.includes('digital'));
  const digitalStart = startWithoutProtection(10);
  const digitalMatch = {
    ...digitalStart,
    players: digitalStart.players.map((player, index) => index === 0 ? { ...player, careerId: digitalCareer.id } : player),
  };
  const aiBefore = digitalMatch.players[0].aiSkill;
  const digitalLanding = move(digitalMatch, 3);
  assert.equal(digitalLanding.players[0].aiSkill, aiBefore + 2, 'career-tagged effects grant the digital-career bonus');

  const rivalStart = startWithoutProtection(36);
  const rivalMatch = {
    ...rivalStart,
    players: rivalStart.players.map((player, index) => {
      if (index === 0) return { ...player, position: 36, wealth: 40000 };
      if (index === 1) return { ...player, position: 42, wealth: 50000 };
      return { ...player, wealth: 900000 };
    }),
  };
  const rivalLanding = move(rivalMatch, 3);
  assert.equal(rivalLanding.players[0].influence, rivalMatch.players[0].influence + 1);
  assert.equal(rivalLanding.players[0].wealth, 42000, 'the rival-contract effect transfers wealth to the landing player');
  assert.equal(rivalLanding.players[1].wealth, 48000, 'the rival-contract effect targets the nearest player ahead');

  const spotlightStart = startWithoutProtection(44);
  const spotlightMatch = {
    ...spotlightStart,
    players: spotlightStart.players.map((player, index) => {
      if (index === 0) return { ...player, position: 44 };
      if (index === 1) return { ...player, position: 42 };
      if (index === 2) return { ...player, position: 50 };
      return player;
    }),
  };
  const actorFameBefore = spotlightMatch.players[0].fame;
  const trailingFameBefore = spotlightMatch.players[1].fame;
  const leadingFameBefore = spotlightMatch.players[2].fame;
  const spotlightLanding = move(spotlightMatch, 3);
  assert.equal(spotlightLanding.players[0].fame, actorFameBefore + 1);
  assert.equal(spotlightLanding.players[1].fame, trailingFameBefore - 1, 'rival spotlight targets the nearest player behind');
  assert.equal(spotlightLanding.players[2].fame, leadingFameBefore, 'rival spotlight does not target players ahead');

  const rollStart = startWithoutProtection(46);
  const rollBefore = rollStart.players[0].wealth;
  const rollLanding = move(rollStart, 3);
  assert.equal(rollLanding.players[0].wealth, rollBefore + 3000, 'roll-linked effects use the current roll total');
  console.log('PASS: 96 cards, 100 unique milestone visuals, finish-line choices, held-token endgame tiers, CPU endgame, event logs and finite piles');
} finally {
  await vite.close();
}