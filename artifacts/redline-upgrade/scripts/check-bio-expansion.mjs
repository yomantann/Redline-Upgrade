import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const hash = value => createHash('sha256').update(value).digest('hex');
const vite = await createServer({
  configFile: false, plugins: [react()],
  resolve: { alias: { '@': new URL('../src/', import.meta.url).pathname } },
  optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true }, appType: 'custom',
});
try {
  const { bioPartyCards, bioPartyExpansionCards: added } = await vite.ssrLoadModule('/src/game/bio-party-cards.ts');
  const { cards, cardsForDeck } = await vite.ssrLoadModule('/src/game/cards.ts');
  const { createMatch, createMultiplayerMatch, advanceMatch } = await vite.ssrLoadModule('/src/game/match.ts');
  const { createCardPiles, drawCardFromPiles, assertCompleteCardPiles } = await vite.ssrLoadModule('/src/game/card-piles.ts');
  const { applyPlayerAction, createMultiplayerState } = await vite.ssrLoadModule('/src/game/multiplayer.ts');
  const { getPartyParticipantIds } = await vite.ssrLoadModule('/src/game/bio-party-targets.ts');
  const { characters } = await vite.ssrLoadModule('/src/game/characters.ts');
  const { careers } = await vite.ssrLoadModule('/src/game/careers.ts');
  const { CardTabletop } = await vite.ssrLoadModule('/src/components/card-tabletop.tsx');
  const expected = [
    ['corporate-restructuring', 'wealth', 'SELECTED_PLAYER'],
    ['system-overload', 'ai', 'SELF_AND_SELECTED'],
    ['neural-meltdown', 'ai', 'ALL_PLAYERS'],
    ['emergency-broadcast', 'ai', 'ALL_PLAYERS'],
    ['crowned-legend', 'fame', 'ALL_PLAYERS'],
    ['secret-superstar', 'fame', 'SELF'],
    ['love-on-the-rocks', 'fame', 'SELECTED_PLAYER'],
    ['access-denied', 'lifestyle', 'SELF'],
    ['partner-protocol', 'lifestyle', 'SELF_AND_SELECTED'],
    ['rainbow-experiment', 'lifestyle', 'SELF_AND_SELECTED'],
    ['midnight-scavenger', 'lifestyle', 'SELF_AND_SELECTED'],
    ['perfectly-synchronized', 'lifestyle', 'ALL_PLAYERS'],
    ['the-pop-effect', 'influence', 'ALL_PLAYERS'],
    ['false-accusation', 'influence', 'SELECTED_PLAYER'],
    ['royal-decree', 'influence', 'ALL_PLAYERS'],
    ['victory-flames', 'influence', 'ALL_EXCEPT_SELF'],
    ['spicy-confession', 'gamble', 'SELF_OR_ALL_PLAYERS'],
    ['greedy-showdown', 'gamble', 'SELF_AND_SELECTED'],
  ];
  assert.equal(added.length, 18);
  assert.deepEqual(added.map(c => [c.id, c.deck, c.partyChallenge.target]), expected.map(([id, ...rest]) => [`bio-${id}`, ...rest]));
  for (const key of ['id', 'title', 'description', 'artworkPath']) assert.equal(new Set(bioPartyCards.map(c => c[key])).size, 82, `${key} is unique across all 82 Bio cards`);
  const addedIds = new Set(added.map(c => c.id));
  const original = bioPartyCards.filter(c => !addedIds.has(c.id));
  assert.equal(original.length, 64);
  assert.equal(hash(JSON.stringify(original)), 'd94798821dc63159c13ac816ed21af88515235b2eca07de0e71041e628d5cad7', 'all original 64 Bio definitions are unchanged');
  assert.equal(hash(JSON.stringify(original.map(c => [c.artworkPath, hash(readFileSync(`public/${c.artworkPath}`))]))), '2fec1b7b3f696e6f8276a5c8c3fc3fd28ff68b6f3eaf050064a9a5ac4e840c94', 'all original Bio image bytes are unchanged');
  const source = readFileSync('src/game/cards.ts', 'utf8');
  assert.equal(hash(source.slice(source.indexOf('const stat ='), source.indexOf('export const allCards'))), 'a91c8fc057e8bf843871b39414fb0cad3db4d96344a41b83255b0cbb8d9edcba', 'Standard card construction and definitions are unchanged');
  const imageHashes = new Set([...original, ...cards].map(c => hash(readFileSync(`public/${c.artworkPath}`))));
  for (const card of added) {
    const image = readFileSync(`public/${card.artworkPath}`);
    assert.equal(image.toString('ascii', 0, 4), 'RIFF');
    assert.equal(image.toString('ascii', 8, 12), 'WEBP');
    assert(!imageHashes.has(hash(image)), `${card.id} uses genuinely new image bytes`);
    imageHashes.add(hash(image));
    assert.equal(card.boardId, 'BIO_UPGRADE');
    assert.deepEqual(card.effects, []);
    assert.equal(card.drawCopies ?? 1, 1);
    assert(cardsForDeck(card.deck, 'BIO_UPGRADE').some(c => c.id === card.id));
    assert(!cardsForDeck(card.deck, 'REDLINE_UPGRADE').some(c => c.id === card.id));
    assert.match(card.partyChallenge.safetyNote, /water.*nonalcoholic.*no-drink.*pass with no penalty/);
    for (const character of characters) {
      assert(!card.description.toLowerCase().includes(character.name.toLowerCase()), `${card.id} does not reference ${character.name}`);
    }
  }
  const dimensions = execFileSync('magick', ['identify', '-format', '%wx%h\n', ...added.map(c => `public/${c.artworkPath}`)], { encoding: 'utf8' }).trim().split('\n');
  assert.deepEqual(dimensions, Array(18).fill('1024x1024'));
  const piles = createCardPiles('BIO_UPGRADE');
  assertCompleteCardPiles(piles);
  assert.equal(Object.values(piles).reduce((n, p) => n + p.drawPile.length, 0), 86);
  const base = createMatch('guardian_h', 'BIO_UPGRADE');
  // Isolate social cards from random character/career mechanics.
  const players = base.players.map(p => ({ ...p, characterId: '__test_no_ability__', careerId: null, isCPU: false, position: 1 }));
  const fixture = (card, turnIndex = 0) => {
    const ordered = { ...piles, [card.deck]: { ...piles[card.deck], drawPile: [card.id, ...piles[card.deck].drawPile.filter(id => id !== card.id)] } };
    const draw = drawCardFromPiles(ordered, card.deck);
    assert.equal(draw.cardId, card.id);
    return { ...base, turnIndex, players, cardPiles: draw.cardPiles, phase: 'decision', pending: { kind: 'CARD', deck: card.deck, cardId: card.id, space: 4, stage: 'draw' } };
  };
  let completed = 0, cpuCompleted = 0, multiplayerCompleted = 0, passiveChecks = 0;
  for (const card of added) {
    for (let actor = 0; actor < players.length; actor++) {
      const drawn = fixture(card, actor);
      const revealed = advanceMatch(drawn, { type: 'RESOLVE_CARD' });
      assert.equal(revealed.pending.stage, 'resolved');
      assert.deepEqual(revealed.players, drawn.players, `${card.id} reveal changes no gameplay data`);
      assert.equal(advanceMatch(revealed, { type: 'ACKNOWLEDGE_CARD' }), revealed, 'generic acknowledgement cannot bypass party confirmation');
      const required = ['SELECTED_PLAYER', 'SELF_AND_SELECTED'].includes(card.partyChallenge.target) ? 1 : 0;
      const selection = players.filter(p => p.playerId !== players[actor].playerId).slice(0, required).map(p => p.playerId);
      const outcomes = card.partyChallenge.choices?.map(c => c.label) ?? [card.partyChallenge.flow === 'CONFIRM' ? undefined : 'Table recorded its result'];
      for (const resolution of outcomes) {
        const result = advanceMatch(revealed, { type: 'RESOLVE_PARTY_CHALLENGE', participantIds: selection, passed: false, resolution });
        assert.equal(result.phase, 'landed', `${card.id} immediately completes for seat ${actor}`);
        assert.equal(result.pending, null);
        assert.deepEqual(result.players, drawn.players, `${card.id} alters no stats, wealth, salary, assets, tokens or endgame state`);
        assert.deepEqual(result.abilityUsage, drawn.abilityUsage);
        const participants = getPartyParticipantIds(card.partyChallenge, players.map(p => p.playerId), players[actor].playerId, selection, resolution);
        if (card.partyChallenge.target === 'ALL_EXCEPT_SELF') assert(!participants.includes(players[actor].playerId));
        if (card.partyChallenge.choices) assert.equal(participants.length, resolution === 'Harmless confession' ? 1 : players.length);
        const event = result.eventLog.findLast(e => e.eventType === 'CARD_RESOLVED');
        assert.equal(event.cardId, card.id);
        for (const id of participants) assert(event.detail.includes(players.find(p => p.playerId === id).displayName));
        completed++;
      }
      const passed = advanceMatch(revealed, { type: 'RESOLVE_PARTY_CHALLENGE', participantIds: [], passed: true });
      assert.equal(passed.phase, 'landed');
      assert.deepEqual(passed.players, revealed.players);
      if (required) {
        for (const invalid of [[], [players[actor].playerId], ['not-a-player']]) {
          assert.equal(advanceMatch(revealed, { type: 'RESOLVE_PARTY_CHALLENGE', participantIds: invalid, passed: false, resolution: outcomes[0] }), revealed);
        }
      }
      if (card.partyChallenge.flow !== 'CONFIRM') assert.equal(advanceMatch(revealed, { type: 'RESOLVE_PARTY_CHALLENGE', participantIds: selection, passed: false }), revealed);
      if (card.partyChallenge.choices) assert.equal(advanceMatch(revealed, { type: 'RESOLVE_PARTY_CHALLENGE', participantIds: [], passed: false, resolution: 'Unrecognized choice' }), revealed);
      const cpuFixture = { ...revealed, players: revealed.players.map(p => ({ ...p, isCPU: true })) };
      const cpuResult = advanceMatch(cpuFixture, { type: 'AUTO_DECIDE' });
      assert.equal(cpuResult.phase, 'landed', `${card.id} CPU cannot block play`);
      assert.deepEqual(cpuResult.players, cpuFixture.players);
      cpuCompleted++;
    }
    // Real character and career passives must not convert a social result into resource changes.
    for (const identity of [
      ...characters.map(character => ({ characterId: character.id, careerId: null })),
      ...careers.map(career => ({ characterId: 'guardian_h', careerId: career.id })),
    ]) {
      const drawn = fixture(card);
      drawn.players = drawn.players.map((p, index) => index === 0 ? { ...p, ...identity } : p);
      const shown = advanceMatch(drawn, { type: 'RESOLVE_CARD' });
      const selected = ['SELECTED_PLAYER', 'SELF_AND_SELECTED'].includes(card.partyChallenge.target) ? [shown.players[1].playerId] : [];
      const result = advanceMatch(shown, { type: 'RESOLVE_PARTY_CHALLENGE', participantIds: selected, passed: false, resolution: card.partyChallenge.choices?.[0]?.label ?? (card.partyChallenge.flow === 'CONFIRM' ? undefined : 'Completed safely') });
      assert.equal(result.phase, 'landed');
      assert.deepEqual(result.players, drawn.players, `${card.id} remains social-only with ${identity.characterId}/${identity.careerId}`);
      passiveChecks++;
    }
    if (['SELECTED_PLAYER', 'SELF_AND_SELECTED', 'ALL_EXCEPT_SELF'].includes(card.partyChallenge.target)) {
      const solo = fixture(card);
      solo.players = [{ ...solo.players[0], isCPU: false }];
      const revealedSolo = advanceMatch(solo, { type: 'RESOLVE_CARD' });
      const soloShown = { ...revealedSolo, players: revealedSolo.players.map(p => ({ ...p, isCPU: true })) };
      const soloResult = advanceMatch(soloShown, { type: 'AUTO_DECIDE' });
      assert.equal(soloResult.phase, 'landed', 'CPU passes safely when no other participant exists');
      assert.match(soloResult.eventLog.findLast(e => e.eventType === 'CARD_RESOLVED').detail, /passed the Bio party challenge/);
    }
    const mpBase = createMultiplayerMatch([
      { characterId: 'guardian_h', careerId: null, displayName: 'Host' },
      { characterId: 'frostbyte', careerId: null, displayName: 'Guest' },
    ], 'BIO_UPGRADE');
    const mpDrawn = { ...fixture(card), mode: 'MULTIPLAYER', players: mpBase.players.map(p => ({ ...p, characterId: '__test_no_ability__', careerId: null, position: 1 })) };
    const shown = advanceMatch(mpDrawn, { type: 'RESOLVE_CARD' });
    const state = createMultiplayerState(shown, ['host', 'guest']);
    const selection = ['SELECTED_PLAYER', 'SELF_AND_SELECTED'].includes(card.partyChallenge.target) ? [shown.players[1].playerId] : [];
    const outcomes = card.partyChallenge.choices?.map(c => c.label) ?? [card.partyChallenge.flow === 'CONFIRM' ? undefined : 'Group result'];
    for (const resolution of outcomes) {
      const action = { type: 'RESOLVE_PARTY_CHALLENGE', participantIds: selection, passed: false, resolution };
      assert.equal(applyPlayerAction(state, 'guest', action).reason, 'NOT_YOUR_TURN');
      assert.equal(applyPlayerAction(state, 'intruder', action).reason, 'NOT_A_PLAYER');
      const response = applyPlayerAction(state, 'host', action);
      assert.equal(response.ok, true, `${card.id} accepted by authoritative multiplayer reducer`);
      assert.equal(response.state.match.phase, 'landed');
      assert.deepEqual(response.state.match.players, state.match.players);
      const restored = JSON.parse(JSON.stringify(response.state));
      assert.deepEqual(restored.match.pending, null);
      const nextTurn = applyPlayerAction(restored, 'host', { type: 'END_TURN' });
      assert.equal(nextTurn.ok, true);
      assert.equal(nextTurn.state.match.turnIndex, 1, 'multiplayer continues to the next player after synchronization');
      multiplayerCompleted++;
    }
    assert.equal(applyPlayerAction(state, 'host', { type: 'RESOLVE_PARTY_CHALLENGE', participantIds: [], passed: true }).ok, true);
    const markup = renderToStaticMarkup(React.createElement(CardTabletop, { activeDeck: card.deck, activeCard: card, cardStage: 'resolved', partyPlayers: players, partyActorId: players[0].playerId, onResolvePartyChallenge: () => {} }));
    assert(markup.includes(card.title) && markup.includes(card.artworkPath) && markup.includes('PASS / NO PENALTY'));
    if (card.partyChallenge.choices) assert(markup.includes('select-party-choice'));
    if (selection.length) assert(markup.includes('bio-party-targets'));
  }
  console.log(`PASS: exactly 18 additions; original 64 definitions/images and Standard definitions preserved; 18 unique 1024×1024 WebPs; ${completed} completed seat/choice cases; ${cpuCompleted} CPU cases; ${multiplayerCompleted} authoritative multiplayer cases; ${passiveChecks} real character/career passive cases; pass/invalid-target/invalid-choice/no-gameplay-change/UI checks.`);
} finally {
  await vite.close();
}
