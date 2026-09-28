# Redline Upgrade visual asset library

`assets.json` is the source-of-truth index for the symbols. Open `/visual-library/index.html` in the running artifact for the local atlas preview.

## Library files

- `support.svg` — reusable deck emblems, career-category marks, milestone state badges, endgame symbols, and quiet presentation details.
- `careers.svg` — one transparent, career-specific emblem for each of the 15 existing careers.
- `assets.json` — symbol IDs, category accents, intended uses, and references to existing primary artwork.
- `index.html` — static browser preview of the mapped symbols; it has no game state or gameplay controls.

Both SVG files are symbol sprites. In the running Vite app, include the artifact base path so the sprite works under both local and deployed routes:

```tsx
const iconHref = `${import.meta.env.BASE_URL}visual-library/support.svg#deck-wealth`;
```

Then reference `iconHref` from `<use href={iconHref} />`. In the static atlas, the local `support.svg#symbol-id` reference is sufficient. Preserve `currentColor` and apply the mapped accent color from `assets.json`; the source artwork remains transparent and recolorable. For the divider, use its `0 0 120 12` viewBox.

## Existing assets to reuse

- Characters and pieces: 21 portrait PNGs in `public/characters/`; 21 pawn models are code-authored in `src/components/pawns/PawnModel.tsx`.
- Card fronts: all 90 WebP illustrations under `public/cards/{wealth,ai,fame,lifestyle,influence,gamble}/`.
- Card backs: existing six-deck CSS treatment in `src/components/card-tabletop.css`.
- Milestones and purchases: all 50 primary illustrations under `public/milestone-assets/{cars,lifestyles,investments,pets,properties}/`.
- Board-space icons: shared paths in `src/game/icon-paths.ts` already cover safe, wealth, salary, AI, fame, lifestyle, influence, car, career, pet, investment, property, Gamble, event, start, finish, and milestone.
- Career definitions, names, categories, and category accents: `src/game/careers.ts` and `src/components/milestone-choice.css`.
- Board surfaces and Gamble treatment: rendered in `src/components/board-scene.tsx` and `src/components/board-fallback.tsx`.
- Endgame presentation: `src/components/endgame-presentation.tsx`; the new symbols complement its visual foundation only.

## Boundaries

Do not replace the 21 character portraits/pawns, 90 card illustrations, or 50 milestone illustrations with these support symbols. Asset category symbols for cars, lifestyle, pets, investments, and property should continue to reuse `src/game/icon-paths.ts` and the existing milestone art. This library adds presentation assets only; it does not define game state, scoring, card effects, career rules, or endgame choices.