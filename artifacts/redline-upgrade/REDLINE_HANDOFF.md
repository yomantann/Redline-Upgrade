# Redline Upgrade — Phase 7A handoff

This app is independent from Redline Auction. It is a React/Vite tabletop game; no external repository or service is needed to run its current local match.

## Run and check

From the workspace root: `pnpm --filter @workspace/redline-upgrade run dev`, `pnpm --filter @workspace/redline-upgrade run typecheck`, and `pnpm --filter @workspace/redline-upgrade run build`. From this artifact directory: `node scripts/check-game.mjs` checks the reducer, salary gates, milestone offers, card-space pauses, and CPU decisions. The Replit workflow uses `PORT`; for manual builds outside the workflow, set `PORT` (for example `PORT=24895 pnpm build`).

## Source of truth

- `src/game/characters.ts`: character roster and image file paths (`public/characters/`).
- `src/game/careers.ts`: categories, careers, salary tiers and starting modifiers.
- `src/game/board-data.ts`: 75 board spaces, trigger, icon, tooltip copy and optional deck ID.
- `src/game/assets.ts` and `assets-extra.ts`: fifty asset definitions (ten per category); the latter contains text-first additions without individual artwork.
- `src/game/match.ts`: turn state, pass/landing effects, random three-card milestone offers, purchases, career changes and CPU decisions.
- `src/game/decks.ts` and `cards.ts`: six deck designs and twelve **illustrative** fronts. Counts and card values are placeholders, not a real shuffled deck or active effects.
- `src/game/icon-paths.ts`: reusable vector icons; `src/components/space-icon.tsx` renders them in UI.
- `src/game/asset-manifest.ts`: searchable inventory for art and its exact path/status. Missing individual asset images deliberately use category/vector fallbacks rather than broken links.

## UI boundaries

`src/components/redline-card.tsx` is the reusable card face/back; `card-tabletop.tsx` handles deck preview and draw/reveal. `milestone-choice.tsx` uses only the three IDs stored on the pending decision; never re-randomize on render. `game-board.tsx` keeps scroll zoom opt-in and both WebGL2/SVG space interactions. A card-space landing pauses the human turn for an example draw/continue, with no stat or Wealth changes. CPU turns continue automatically.

Do not treat illustrative values, visual deck counts, investment passive descriptions or the finish boundary as complete game rules. Multiplayer, final card effects, gambling, upgrade mechanics, investment returns and end-game scoring are intentionally absent.

## Phase 17 playtest diagnostics

`node scripts/playtest-diagnostics.mjs [runs] [name.md]` simulates seeded CPU games and writes `docs/phase17-playtest-latest.md` (coverage of events/abilities/cards/careers, Wealth distribution, stall detection). It is a dev-only script; the game has no debug UI. First run found a CPU stall (milestone asset offer left open after the slot was filled), fixed in `autoDecide`. Abilities `character:guardian_h` and `career:doctor` never triggered in 300 games and need a design review.
