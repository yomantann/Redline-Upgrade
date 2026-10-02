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

`node scripts/playtest-diagnostics.mjs [runs] [name.md]` simulates seeded CPU games and writes `docs/phase17-playtest-latest.md` (coverage of events/abilities/cards/careers, Wealth distribution, stall detection). It is a dev-only script; the game has no debug UI. First run found a CPU stall (milestone asset offer left open after the slot was filled), fixed in `autoDecide`. The report also has a static audit (card effect mix per deck, career salaries/affinities, asset value-per-cost, strategy outcomes). Findings: Guardian H's Hold the Line now blocks any loss of AI Skill, Fame, Lifestyle or Influence (never below zero; Wealth is not an attribute); 18 cheap pet/lifestyle assets were repriced so no asset's endgame value exceeds 2.5x its cost; Doctor is a non-event ability (token on acquisition) and is exempt from trigger coverage. Open design items: 44 of 96 cards are plain self stat changes; Gig Worker/Degen Trader salaries are outliers (by design, offset by affinity/variance); Personal Trainer is the weakest simulated career (~1.5x spread to the best).

## Phase 19 polish

Optional music: `src/lib/music.tsx` plays a random `lobby` track outside a match and rotates random `game` tracks in a match; files and names live in `public/music/` (`manifest.json`). Header toggle persists in localStorage. Match results now list final Wealth, attributes, final choice and final Gamble per player; the board legend is open by default; round-1 how-to-play hint added.

## Phase 20 board and multiplayer foundation

`src/game/boards.ts` owns stable `REDLINE_UPGRADE` and `BIO_MODE` identifiers plus each board's data-set, ruleset, visual-theme, and availability metadata. The Home screen routes through board selection (`/boards`) and mode selection (`/mode`); Redline single player enters the unchanged character/setup/game flow, while BIO Mode and Multiplayer show player-facing Coming Soon screens. Add a board's data modules and mark it playable only when its board content and rules exist.

Player records are already plain match data with stable player IDs, and gameplay changes already pass through serializable `MatchAction` values into `advanceMatch`. `GameSessionAction` names lobby/setup actions, and `MatchActionEnvelope` binds a reducer action to a match and acting player for a future transport/action log. A `Match` includes a match ID, selected board/mode, host player ID, player roles, player list, and current turn index; multiplayer work should build authorization and transport around this reducer boundary rather than duplicate game state in UI or rewrite the single-player reducer. The current match creator intentionally accepts only playable single-player configurations; no networking, authentication, or persistence is implemented.
