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

`src/game/boards.ts` owns stable `REDLINE_UPGRADE`, `BIO_UPGRADE` and `HAUNTED_UPGRADE` identifiers plus each board's content-set IDs, artwork, and availability (`AVAILABLE` / `IN_DEVELOPMENT` / `COMING_SOON`). The Home hub routes through board selection (`/boards`) and mode selection (`/mode`); Redline single player enters the unchanged character/setup/game flow, Bio Upgrade and Haunted Upgrade show Coming Soon screens (Haunted is a placeholder only). Multiplayer (`/multiplayer`, Redline only) requires sign-in and uses the server-authoritative room API (`/api/rooms`: create, join by code, leave, ready, start, host settings; GET doubles as the heartbeat and applies host takeover). The server's board registry lives in `artifacts/api-server/src/lib/boards.ts` and must match `boards.ts`. Rooms/lobby hold no gameplay state (see Phase 22 for the match layer). `/profile` (auth required) and `/shop` (coming soon, no Credits or purchases) are placeholders.

Player records are already plain match data with stable player IDs, and gameplay changes already pass through serializable `MatchAction` values into `advanceMatch`. `GameSessionAction` names lobby/setup actions, and `MatchActionEnvelope` binds a reducer action to a match and acting player for a future transport/action log. A `Match` includes a match ID, selected board/mode, host player ID, player roles, player list, and current turn index; multiplayer work should build authorization and transport around this reducer boundary rather than duplicate game state in UI or rewrite the single-player reducer. The current match creator intentionally accepts only playable single-player configurations; no networking, authentication, or persistence is implemented.

## Phase 22 multiplayer game state and synchronization

`src/game/multiplayer.ts` is the shared, pure authority layer: `applyPlayerAction(state, userId, ClientAction)` maps a user to a seat, enforces whose turn it is (a pending ability decision belongs to `pending.playerIndex`), translates intent-level actions (`ROLL_DICE`, `MOVE`, `DRAW_CARD`/`ACKNOWLEDGE_CARD`, `USE_ABILITY`, `BUY_ASSET`, `USE_UPGRADE_TOKEN`, `GAMBLE`, `CHANGE_CAREER`, `END_TURN`, plus asset/career sub-steps) into existing `MatchAction`s and runs them through `advanceMatch`. Anything the reducer ignores is rejected, so legality comes from the single-player rules and the same event engine/`eventLog`. The server rolls the dice; movement steps after a move/decision are settled automatically. `createMultiplayerMatch` in `match.ts` builds a match from lobby seats (unpicked characters/careers are filled uniquely at random).

Server (`artifacts/api-server`): `startRoomAsHost` creates the match and stores it in `room_matches` (`version` increments per accepted action). New endpoints: `POST /rooms/:id/selection` (character/career, unique per room, clears ready), `GET /rooms/:id/match` (snapshot + heartbeat; clients poll it and compare `version`), `POST /rooms/:id/match/actions` (`expectedVersion` optional; 403 not your turn, 409 illegal/stale/over). Seats are fixed by user for the whole match, so refreshing or rejoining by code (`/rooms/join`) recovers the slot and current state. The api-server imports the game modules directly from this artifact (tsconfig `paths` and esbuild alias for `@/`).

### Idle players (Phase 22 completion)

`autoplayIfStale` (in `multiplayer.ts`, run on every `GET /match` poll and before each action, so no server timers) plays the acting player's turn once `AUTOPLAY_AFTER_MS` (60 s) passes without an accepted action. It reuses the reducer's CPU decision logic (`AUTO_DECIDE`) by lending the seat CPU status for one step. A turn auto-played this way counts as missed; 3 consecutive missed turns (`MAX_MISSED_TURNS`) kick the player: they are marked `left` in the room, get 403 from the match endpoints, and their seat stays in the match as a ghost that is auto-played instantly so turn order and shared state are undisturbed. Any accepted action resets the player's missed counter. Snapshots expose `actionAt`, `autoplayAfterMs`, `maxMissedTurns` and per-seat `missedTurns`/`kicked`.

## Phase 23 multiplayer gameplay

Single and multiplayer share one engine: `advanceMatch`, the event engine, decks, abilities, assets, tokens and endgame are untouched. `GameProvider` (`state.tsx`) has a remote mode (`setRemoteSnapshot`): `match` mirrors the server snapshot (other seats are presented with `isCPU: true` so the existing UI renders them as non-interactive), and `dispatchMatch` converts UI actions with `toClientAction` and posts them to `/match/actions`, so `GameScreen` and its panels are the same components in both modes. In remote mode `GameScreen` skips local CPU/auto timers (the server does roll/step/auto-play) and only paces the local player's own reveal/landed steps. `/multiplayer` has character and career pickers in the lobby, polls `/match` every 1.5 s while a room is in progress/completed, and a refresh restores the same seat via the stored room ID. `check-game.mjs` plays full 2-player matches through the client-action API. Known limits: updates are polling (no push), and ghost seats of kicked players stay on the board.

## Phase 24 multiplayer UX

`RemoteStatus` (in `game-screen.tsx`) now shows a turn banner (YOUR TURN / WAITING FOR … / SPECTATING once finished / MATCH COMPLETE), a per-player roster with board position and state (acting, waiting, offline, finished, removed), a recent-activity feed from the shared event log (other players' rolls, cards and abilities), and a reconnect banner driven by `remoteConnected` in `GameProvider` (set false when `/match` polling fails with a network/5xx error, cleared on the next successful poll). Mobile layout collapses the roster/feed in `game-screen.css`. Dice/card/ability visuals still reuse the single-player components; there is no push channel, so remote dice animation follows polled state.
