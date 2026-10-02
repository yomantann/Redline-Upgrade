# Phase 17 playtest diagnostics

Runs: 300 CPU-played 4-player games (seeded LCG). Completed: 300. Average rolls per game: 62.

## Final value per player
min 68750 / p2.5 358875 / median 1653500 / p97.5 4090225 / max 10498125 / mean 1792302

## Flags
- none


## Never observed (unreachable or rare in this sample)
- Abilities: character:guardian_h, career:doctor
- Cards resolved: none
- Careers held: none
- Assets held at finish: 0 of 100

## Event counts
| event | count |
|---|---:|
| PLAYER_MOVED | 90910 |
| PASS_SPACE | 90000 |
| WEALTH_CHANGED | 20095 |
| DICE_ROLL | 18556 |
| TURN_START | 18499 |
| TURN_END | 18499 |
| LAND_ON_SPACE | 18426 |
| SALARY_GATE | 17163 |
| PASS_PLAYER | 16704 |
| ATTRIBUTE_GAINED | 11324 |
| CARD_DRAW | 10975 |
| CARD_RESOLVED | 7884 |
| LAND_ON_PLAYER | 6230 |
| INFLUENCE_CHANGED | 5643 |
| DOUBLES_ROLLED | 5135 |
| FAME_CHANGED | 5085 |
| LIFESTYLE_CHANGED | 3447 |
| ROLL_OF_2_OR_8 | 2855 |
| AI_SKILL_CHANGED | 2852 |
| CAREER_CHANGE | 1771 |
| PLAYER_AFFECTED | 1544 |
| ROLL_OF_8 | 1273 |
| ROLL_OF_2 | 1269 |
| FINISH_LINE_REACHED | 1200 |
| ENDGAME_STARTED | 1200 |
| ENDGAME_CHOICE_SELECTED | 1200 |
| ENDGAME_COMPLETED | 1200 |
| UPGRADE_TOKEN_GAINED | 1143 |
| ASSET_ACQUIRED | 969 |
| MILESTONE | 937 |
| ASSET_PURCHASED | 915 |
| UPGRADE_TOKEN_SPENT | 866 |
| MILESTONE_RECOVERED | 671 |
| CAREER_SWAPPED | 496 |
| CASH_OUT_RESOLVED | 400 |
| DOUBLE_DOWN_RESOLVED | 400 |
| FINAL_GAMBLE_RESOLVED | 400 |
| TURN_SKIPPED | 311 |
| UPGRADE_TOKEN_HELD | 258 |
| LIFESTYLE_PURCHASED | 241 |
| ASSET_UPGRADED | 238 |
| PROPERTY_PURCHASED | 209 |
| PET_PURCHASED | 207 |
| CAR_PURCHASED | 185 |
| SECOND_CAREER_ACQUIRED | 74 |
| CAREER_SWAP_RESOLVED | 66 |
| ASSET_TRANSFERRED | 56 |
| INVESTMENT_PURCHASED | 27 |

## Ability triggers
| ability | count |
|---|---:|
| character:the_tank | 1820 |
| career:influencer | 1788 |
| character:executive_p | 1780 |
| career:lawyer | 1617 |
| career:thief | 1567 |
| character:rainbow_dash | 1108 |
| career:entertainer | 868 |
| character:click_click | 861 |
| career:pro-gamer | 759 |
| character:low_flame | 726 |
| career:alien | 562 |
| career:content-creator | 525 |
| career:personal-trainer | 490 |
| career:cybersecurity-specialist | 448 |
| career:corporate-executive | 442 |
| character:prom_king | 425 |
| character:primate | 418 |
| character:the_rind | 410 |
| character:accuser | 369 |
| career-affinity:thief:wealth | 336 |
| career-affinity:alien:ai | 300 |
| career-affinity:lawyer:wealth | 292 |
| career-affinity:lawyer:influence | 291 |
| career-affinity:cybersecurity-specialist:wealth | 284 |
| career-affinity:doctor:ai | 282 |
| career-affinity:cybersecurity-specialist:ai | 282 |
| career-affinity:corporate-executive:wealth | 282 |
| career:ai-engineer | 258 |
| career-affinity:corporate-executive:influence | 258 |
| career-affinity:gig-worker:wealth | 256 |
| career-affinity:personal-trainer:fame | 255 |
| career-affinity:startup-founder:wealth | 254 |
| career-affinity:real-estate-investor:influence | 249 |
| career-affinity:alien:influence | 246 |
| career-affinity:degen-trader:wealth | 246 |
| career-affinity:content-creator:fame | 240 |
| career-affinity:ai-engineer:wealth | 238 |
| career-affinity:race-driver:fame | 231 |
| career-affinity:influencer:fame | 231 |
| career-affinity:pro-gamer:ai | 222 |
| career-affinity:influencer:wealth | 222 |
| career-affinity:real-estate-investor:wealth | 216 |
| career-affinity:startup-founder:influence | 207 |
| career:startup-founder | 205 |
| career-affinity:ai-engineer:ai | 192 |
| career-affinity:entertainer:fame | 192 |
| character:panic_bot | 177 |
| career-affinity:thief:gamble | 158 |
| career:gig-worker | 154 |
| career:degen-trader | 152 |
| character:pain_hider | 144 |
| career:race-driver | 143 |
| character:sadman | 141 |
| career-affinity:gig-worker:gamble | 140 |
| character:danger_zone | 138 |
| career-affinity:degen-trader:gamble | 132 |
| character:alpha_prime | 114 |
| career-affinity:pro-gamer:gamble | 100 |
| character:idol_core | 99 |
| career-affinity:content-creator:lifestyle | 94 |
| character:hotwired | 92 |
| career-affinity:personal-trainer:lifestyle | 86 |
| career-affinity:doctor:lifestyle | 82 |
| character:wandering_eye | 72 |
| career-affinity:entertainer:lifestyle | 72 |
| character:frostbyte | 69 |
| character:anointed | 57 |
| career-affinity:race-driver:lifestyle | 56 |
| character:roll_safe | 41 |
| career:real-estate-investor | 31 |

## Card resolutions (top)
| card | count |
|---|---:|
| wealth-repair-bill | 145 |
| wealth-liquidation | 144 |
| wealth-late-fee | 143 |
| wealth-handshake | 141 |
| wealth-audit | 139 |
| wealth-market-volatility | 138 |
| wealth-insider-bid | 136 |
| wealth-patent-payout | 132 |
| wealth-seed | 129 |
| wealth-tax-refund | 128 |
| wealth-windfall | 127 |
| wealth-angel-check | 126 |
| wealth-silent-partner | 124 |
| wealth-side-contract | 123 |
| wealth-upgrade-token | 122 |

## Career holdings at finish
| career | count |
|---|---:|
| corporate-executive | 95 |
| thief | 94 |
| doctor | 90 |
| lawyer | 88 |
| cybersecurity-specialist | 86 |
| gig-worker | 85 |
| alien | 76 |
| real-estate-investor | 73 |
| influencer | 69 |
| startup-founder | 68 |
| ai-engineer | 68 |
| entertainer | 68 |
| degen-trader | 67 |
| personal-trainer | 67 |
| content-creator | 66 |
| race-driver | 59 |
| pro-gamer | 55 |

## Endgame route usage (rotated) / winners by seat / titles
| CASH_OUT | 400 |
| DOUBLE_DOWN | 400 |
| FINAL_GAMBLE | 400 |

| seat 1 (first mover) | 83 |
| seat 4 | 75 |
| seat 3 | 72 |
| seat 2 | 70 |


