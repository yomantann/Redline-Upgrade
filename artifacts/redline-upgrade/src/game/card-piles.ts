import { getCard, cardsForDeck } from './cards';
import { decks, type DeckId } from './decks';
import type { BoardId } from './boards';

export interface CardPile {
  boardId?: BoardId;
  drawPile: string[];
  discardPile: string[];
  inFlight: string[];
}

export type CardPileMap = Record<DeckId, CardPile>;

function matchesBoard(card: NonNullable<ReturnType<typeof getCard>>, boardId: BoardId): boolean {
  return boardId === 'BIO_UPGRADE' ? card.boardId === 'BIO_UPGRADE' : card.boardId !== 'BIO_UPGRADE';
}

function shuffle<T>(items: readonly T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function createCardPiles(boardId: BoardId = 'REDLINE_UPGRADE'): CardPileMap {
  const createPile = (deck: DeckId): CardPile => ({
    boardId,
    drawPile: shuffle(cardsForDeck(deck, boardId).flatMap(card =>
      Array.from({ length: card.drawCopies ?? 1 }, () => card.id),
    )),
    discardPile: [],
    inFlight: [],
  });
  return {
    wealth: createPile('wealth'),
    ai: createPile('ai'),
    fame: createPile('fame'),
    lifestyle: createPile('lifestyle'),
    influence: createPile('influence'),
    gamble: createPile('gamble'),
  };
}

export function drawCardFromPiles(piles: CardPileMap, deck: DeckId): { cardId: string; cardPiles: CardPileMap } {
  const current = piles[deck];
  const replenished = current.drawPile.length === 0
    ? shuffle(current.discardPile)
    : current.drawPile;
  if (replenished.length === 0) throw new Error(`Cannot draw from empty ${deck} deck`);
  const [cardId, ...drawPile] = replenished;
  const card = getCard(cardId);
  if (!card || card.deck !== deck || !matchesBoard(card, current.boardId ?? 'REDLINE_UPGRADE')) {
    throw new Error(`Invalid card ${cardId} in ${deck} draw pile`);
  }
  return {
    cardId,
    cardPiles: {
      ...piles,
      [deck]: {
        boardId: current.boardId,
        drawPile,
        discardPile: current.drawPile.length === 0 ? [] : current.discardPile,
        inFlight: [...current.inFlight, cardId],
      },
    },
  };
}

export function drawTwoDistinctCardsFromPiles(
  piles: CardPileMap,
  deck: DeckId,
): { cardIds: [string, string]; cardPiles: CardPileMap } {
  const first = drawCardFromPiles(piles, deck);
  let current = first.cardPiles;
  const maximumAttempts = cardsForDeck(deck, current[deck].boardId ?? 'REDLINE_UPGRADE')
    .reduce((total, card) => total + (card.drawCopies ?? 1), 0);
  for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
    const available = [...current[deck].drawPile, ...current[deck].discardPile];
    if (!available.some(id => id !== first.cardId)) {
      throw new Error(`Cannot draw two distinct cards from ${deck} deck`);
    }
    const second = drawCardFromPiles(current, deck);
    if (second.cardId !== first.cardId) {
      return { cardIds: [first.cardId, second.cardId], cardPiles: second.cardPiles };
    }
    current = returnCardToBottom(second.cardPiles, deck, second.cardId);
  }
  throw new Error(`Could not find a distinct second card in ${deck} deck`);
}

export function discardCardToPiles(piles: CardPileMap, deck: DeckId, cardId: string): CardPileMap {
  const card = getCard(cardId);
  const current = piles[deck];
  if (!card || card.deck !== deck || !matchesBoard(card, current.boardId ?? 'REDLINE_UPGRADE')) {
    throw new Error(`Cannot discard ${cardId} into ${deck} deck for ${current.boardId ?? 'REDLINE_UPGRADE'}`);
  }
  if (!current.inFlight.includes(cardId)) throw new Error(`Card ${cardId} is not in flight from the ${deck} deck`);
  return {
    ...piles,
    [deck]: {
      ...current,
      discardPile: [...current.discardPile, cardId],
      inFlight: removeOne(current.inFlight, cardId),
    },
  };
}

export function returnCardToBottom(piles: CardPileMap, deck: DeckId, cardId: string): CardPileMap {
  const current = piles[deck];
  const card = getCard(cardId);
  if (!card || card.deck !== deck || !matchesBoard(card, current.boardId ?? 'REDLINE_UPGRADE')) {
    throw new Error(`Cannot return ${cardId} to ${deck} deck for ${current.boardId ?? 'REDLINE_UPGRADE'}`);
  }
  if (!current.inFlight.includes(cardId)) throw new Error(`Card ${cardId} is not in flight from the ${deck} deck`);
  return {
    ...piles,
    [deck]: { ...current, drawPile: [...current.drawPile, cardId], inFlight: removeOne(current.inFlight, cardId) },
  };
}

function removeOne(ids: string[], target: string): string[] {
  const index = ids.indexOf(target);
  return index < 0 ? ids : [...ids.slice(0, index), ...ids.slice(index + 1)];
}

export function assertCompleteCardPiles(piles: CardPileMap, requestedBoardId?: BoardId): void {
  const boardId = requestedBoardId ?? piles.wealth.boardId ?? 'REDLINE_UPGRADE';
  let totalEntries = 0;
  for (const deck of decks) {
    const pile = piles[deck.id];
    if (!pile) throw new Error(`Missing ${deck.id} card pile`);
    const ids = [...pile.drawPile, ...pile.discardPile, ...pile.inFlight];
    const expected = cardsForDeck(deck.id, boardId);
    const expectedCounts = new Map(expected.map(card => [card.id, card.drawCopies ?? 1]));
    const actualCounts = new Map<string, number>();
    for (const id of ids) {
      const card = getCard(id);
      if (!card || card.deck !== deck.id || !matchesBoard(card, boardId)) {
        throw new Error(`Invalid card in ${boardId} ${deck.id} pile: ${id}`);
      }
      actualCounts.set(id, (actualCounts.get(id) ?? 0) + 1);
    }
    for (const [id, expectedCount] of expectedCounts) {
      if (actualCounts.get(id) !== expectedCount) {
        throw new Error(`${boardId} ${deck.id} pile has ${actualCounts.get(id) ?? 0} copies of ${id}; expected ${expectedCount}`);
      }
    }
    if (ids.length !== [...expectedCounts.values()].reduce((sum, count) => sum + count, 0)
      || [...actualCounts.keys()].some(id => !expectedCounts.has(id))) {
      throw new Error(`${boardId} ${deck.id} card pile does not contain its complete draw pool`);
    }
    totalEntries += ids.length;
  }
  const expectedEntries = decks.flatMap(deck => cardsForDeck(deck.id, boardId))
    .reduce((sum, card) => sum + (card.drawCopies ?? 1), 0);
  if (totalEntries !== expectedEntries) throw new Error(`${boardId} card piles contain ${totalEntries} entries; expected ${expectedEntries}`);
}