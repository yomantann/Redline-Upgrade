import { cards } from './cards';

const artworkByCardId: Record<string, string> = Object.fromEntries(
  cards.map(card => [card.id, card.artworkPath]),
);

export function getCardArtworkFilePath(cardId: string): string | undefined {
  return artworkByCardId[cardId];
}

export function getCardArtworkUrl(cardId: string): string | undefined {
  const filePath = getCardArtworkFilePath(cardId);
  return filePath ? `${import.meta.env.BASE_URL}${filePath}` : undefined;
}