const artworkByCardId: Record<string, string> = {
  'wealth-seed': 'cards/wealth/wealth-seed.webp',
  'wealth-windfall': 'cards/wealth/wealth-windfall.webp',
  'ai-pattern': 'cards/ai/ai-pattern.webp',
  'ai-model': 'cards/ai/ai-model.webp',
  'fame-clip': 'cards/fame/fame-clip.webp',
  'fame-cover': 'cards/fame/fame-cover.webp',
  'lifestyle-detour': 'cards/lifestyle/lifestyle-detour.webp',
  'lifestyle-reset': 'cards/lifestyle/lifestyle-reset.webp',
  'influence-intro': 'cards/influence/influence-intro.webp',
  'influence-room': 'cards/influence/influence-room.webp',
  'gamble-call': 'cards/gamble/gamble-call.webp',
  'gamble-edge': 'cards/gamble/gamble-edge.webp',
};

export function getCardArtworkFilePath(cardId: string): string | undefined {
  return artworkByCardId[cardId];
}

export function getCardArtworkUrl(cardId: string): string | undefined {
  const filePath = getCardArtworkFilePath(cardId);
  return filePath ? `${import.meta.env.BASE_URL}${filePath}` : undefined;
}