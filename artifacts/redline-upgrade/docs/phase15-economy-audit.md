# Phase 15 economy audit

## Policy and scope

- **Runs:** 1000 complete 4-player matches (4,000 player observations), seed 1436254 (32-bit LCG replacing Math.random for the entire run).
- **Policy:** ordinary milestone, card, career, token and asset decisions use reducer `AUTO_DECIDE`; seeded 2d4 rolls are manually supplied as `ROLL` actions and movement is manually stepped. Endgame choices rotate CASH_OUT, DOUBLE_DOWN, FINAL_GAMBLE in a single global cycle, with the reducer's CPU restriction temporarily disabled only to submit the chosen `CHOOSE_ENDGAME` action. This is CPU-policy evidence, not human optimal-play evidence.
- **Guards/invariants:** 8000-action hard stall guard, 12 consecutive no-op guard, four finishers, all endgames resolved, and `assertCompleteCardPiles` after every match. A deterministic fixture was created and its four-player/pile invariants asserted.

## Per-player distributions

Values are average / median / 2.5th percentile / 97.5th percentile across player observations.

| measure | average | median | p2.5 | p97.5 |
|---|---:|---:|---:|---:|
| startWealth | 136948.8 | 120000.0 | 20000.0 | 350000.0 |
| finalWealth | 1091675.7 | 978500.0 | 244000.0 | 2687000.0 |
| salaryIncome | 972630.6 | 910000.0 | 140000.0 | 2450000.0 |
| positiveWealthMovement | 1124427.3 | 1063000.0 | 282000.0 | 2571750.0 |
| negativeWealthMovement | -169700.4 | -76000.0 | -709000.0 | 0.0 |
| assetSpend | 144730.0 | 25000.0 | 0.0 | 670000.0 |
| assetCount | 1.3 | 1.0 | 0.0 | 3.0 |
| assetLevels | 1.4 | 1.0 | 0.0 | 4.0 |
| endgameAssetValue | 263602.4 | 206000.0 | 0.0 | 890000.0 |
| upgradeTokensEarned | 1.1 | 1.0 | 0.0 | 4.0 |
| upgradeTokensSpent | 0.7 | 1.0 | 0.0 | 2.0 |
| upgradeTokensHeld | 0.2 | 0.0 | 0.0 | 1.0 |
| upgradeTokensRecovered | 0.0 | 0.0 | 0.0 | 0.0 |
| finishRank | 2.5 | 2.0 | 1.0 | 4.0 |
| finishReward | 62500.0 | 50000.0 | 25000.0 | 100000.0 |
| attributeBonus | 50000.0 | 50000.0 | 0.0 | 150000.0 |
| baseEndgameValue | 1745822.4 | 1630500.0 | 504000.0 | 3570000.0 |
| finalValue | 1840366.1 | 1632500.0 | 356000.0 | 4790625.0 |
| multiplier | 1.0 | 1.0 | 0.3 | 2.8 |
| routeDelta | 94543.7 | 35000.0 | -1434375.0 | 2547900.0 |
| milestoneExposures | 0.8 | 1.0 | 0.0 | 2.0 |
| milestonePurchases | 0.6 | 1.0 | 0.0 | 2.0 |

Asset category counts (final equipment): car=1929, lifestyle=1172, pet=855, investment=265, property=779.

## Endgame route observations

| route | observations | base value avg | final value avg | multiplier avg | delta avg |
|---|---:|---:|---:|---:|---:|
| CASH_OUT | 1334 | 1741376.3 | 1799279.0 | 1.012 | 57902.6 |
| DOUBLE_DOWN | 1333 | 1763844.9 | 1943232.1 | 1.084 | 179387.2 |
| FINAL_GAMBLE | 1333 | 1732249.2 | 1778618.0 | 1.003 | 46368.7 |

## Milestones, purchases, and limitations

Milestone exposure and purchase counts are derived from `MILESTONE` and `ASSET_PURCHASED` reducer events; purchase rate is reported as aggregate purchases / aggregate milestone exposures in the recorded observations: 0.831. Wealth deltas use `WEALTH_CHANGED` event `delta` values; salary uses `SALARY_GATE.salaryAmount`; finish rewards use `wealthEvents`; asset spend uses purchase event cost/delta. Endgame asset value is derived as locked base value minus finish Wealth and stat-value components because the reducer does not emit a separate asset-value total. Token recovery is counted from `MILESTONE_RECOVERED`.

This is the pre-Phase-15 endgame baseline, recorded before held-token score modifiers were removed. It does not estimate optimal play, causal balance, or human behavior. AUTO_DECIDE has stochastic policy choices, and card effects/abilities can affect other players, so source attribution is not always uniquely assignable beyond reducer event player indexes. Events are harvested after every reducer transition and deduplicated by event id; Wealth and token totals, equipment changes, milestone offer exposure, and purchase costs are additionally measured from before/after state snapshots. Asset category counts are final holdings (not every historical holding), and levels are summed observed levels. Asset spend is charged only when a newly equipped asset reduces Wealth by at least its authored cost, avoiding no-cost milestone recovery. This document preserves the pre-change measurements; re-running the script should use a separate output file. Sources: `scripts/simulate-economy.mjs`, `src/game/match.ts`, `src/game/endgame.ts`, `src/game/card-piles.ts`.
