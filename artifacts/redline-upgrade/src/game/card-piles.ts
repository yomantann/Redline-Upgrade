import { cards, getCard, cardsForDeck, type CardDefinition } from './cards';
import { decks, type DeckId } from './decks';

export interface CardPile {
  drawPile: string[];
  discardPile: string[];
  inFlight: string[];
}

export type CardPileMap = Record<DeckId, CardPile>;

function shuffle<T>(items: readonly T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function createCardPiles(boardCards: readonly CardDefinition[] = cards): CardPileMap {
  const createPile = (deck: DeckId): CardPile => ({
    drawPile: shuffle(cardsForDeck(deck, boardCards).map(card => card.id)),
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
  if (!card || card.deck !== deck) throw new Error(`Invalid card ${cardId} in ${deck} draw pile`);
  return {
    cardId,
    cardPiles: {
      ...piles,
      [deck]: {
        drawPile,
        discardPile: current.drawPile.length === 0 ? [] : current.discardPile,
        inFlight: [...current.inFlight, cardId],
      },
    },
  };
}

export function discardCardToPiles(piles: CardPileMap, deck: DeckId, cardId: string): CardPileMap {
  const card = getCard(cardId);
  if (!card || card.deck !== deck) throw new Error(`Cannot discard ${cardId} into ${deck} deck`);
  const current = piles[deck];
  if (!current.inFlight.includes(cardId)) throw new Error(`Card ${cardId} is not in flight from the ${deck} deck`);
  return {
    ...piles,
    [deck]: {
      ...current,
      discardPile: [...current.discardPile, cardId],
      inFlight: current.inFlight.filter(id => id !== cardId),
    },
  };
}

export function assertCompleteCardPiles(piles: CardPileMap, boardCards: readonly CardDefinition[] = cards): void {
  const seen = new Set<string>();
  for (const deck of decks) {
    const pile = piles[deck.id];
    if (!pile) throw new Error(`Missing ${deck.id} card pile`);
    const ids = [...pile.drawPile, ...pile.discardPile, ...pile.inFlight];
    const expected = boardCards.filter(card => card.deck === deck.id);
    if (ids.length !== expected.length || new Set(ids).size !== expected.length) {
      throw new Error(`${deck.id} card pile does not contain each card exactly once`);
    }
    for (const id of ids) {
      const card = getCard(id);
      if (!card || card.deck !== deck.id || seen.has(id)) throw new Error(`Invalid or duplicate card in piles: ${id}`);
      seen.add(id);
    }
  }
  if (seen.size !== boardCards.length) throw new Error('Card piles do not contain the full card set');
}