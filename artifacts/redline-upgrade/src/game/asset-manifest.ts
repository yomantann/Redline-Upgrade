import { characters } from './characters';
import { assets } from './assets';
import { cards } from './cards';
import { decks } from './decks';
import { ICON_PATHS } from './icon-paths';
import { getAssetArtworkFilePath } from './asset-artwork';
import { getCardArtworkFilePath } from './card-artwork';

/** Paths are relative to the redline-upgrade artifact root, not deployment URLs.
 * Image-backed entries are actual files; fallback entries are deliberately code-drawn.
 */
export interface VisualAsset {
  id: string;
  name: string;
  category: 'characters' | 'cars' | 'lifestyles' | 'pets' | 'investments' | 'properties' | 'cards' | 'icons' | 'ui';
  filePath: string;
  assetType: 'image' | 'vector' | 'css-art' | 'symbol';
  description: string;
  status: 'available' | 'fallback' | 'example';
}

const assetCategories = {
  car: 'cars', lifestyle: 'lifestyles', pet: 'pets', investment: 'investments', property: 'properties',
} as const;

export const visualAssets: readonly VisualAsset[] = [
  ...characters.map(character => ({
    id: `character_${character.id}`, name: character.name, category: 'characters' as const,
    filePath: `public/${character.imagePath}`, assetType: 'image' as const,
    description: character.description, status: 'available' as const,
  })),
  ...assets.map(asset => {
    const artworkPath = getAssetArtworkFilePath(asset.id);
    return {
      id: `asset_${asset.id}`, name: asset.name, category: assetCategories[asset.category],
      filePath: artworkPath ? `public/${artworkPath}` : 'src/components/milestone-choice.tsx',
      assetType: artworkPath ? 'image' as const : 'symbol' as const,
      description: artworkPath ? `${asset.description} Individual milestone artwork.` : `${asset.description} Shared category artwork fallback.`,
      status: artworkPath ? 'available' as const : 'fallback' as const,
    };
  }),
  ...decks.map(deck => ({
    id: `deck_${deck.id}`, name: `${deck.name} deck back`, category: 'cards' as const,
    filePath: 'src/components/card-tabletop.css', assetType: 'css-art' as const,
    description: `Reusable ${deck.name} card back; illustrative count only.`,
    status: 'available' as const,
  })),
  ...cards.map(card => {
    const artworkPath = getCardArtworkFilePath(card.id);
    return {
      id: `card_${card.id}`, name: card.title, category: 'cards' as const,
      filePath: artworkPath ? `public/${artworkPath}` : 'src/components/redline-card.tsx',
      assetType: artworkPath ? 'image' as const : 'css-art' as const,
      description: artworkPath ? `${card.deck} example card illustration. Gameplay text remains in the card UI.` : `${card.deck} example front; no dedicated artwork mapped.`,
      status: artworkPath ? 'available' as const : 'example' as const,
    };
  }),
  ...Object.keys(ICON_PATHS).map(icon => ({
    id: `icon_${icon}`, name: icon.replaceAll('-', ' '), category: 'icons' as const,
    filePath: 'src/game/icon-paths.ts', assetType: 'vector' as const,
    description: 'Shared vector icon for board, decks, player cards and HUD.',
    status: 'available' as const,
  })),
  { id: 'ui_favicon', name: 'Redline favicon', category: 'ui', filePath: 'public/favicon.svg', assetType: 'vector', description: 'Browser favicon.', status: 'available' },
  { id: 'ui_board', name: '3D circuit board', category: 'ui', filePath: 'src/components/board-scene.tsx', assetType: 'vector', description: 'Code-rendered 3D board and tabletop.', status: 'available' },
  { id: 'ui_board_fallback', name: '2D circuit board', category: 'ui', filePath: 'src/components/board-fallback.tsx', assetType: 'vector', description: 'Interactive fallback when WebGL2 is unavailable.', status: 'available' },
];