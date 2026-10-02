# Phase 17 playtest diagnostics

Runs: 300 CPU-played 4-player games (seeded LCG). Completed: 300. Average rolls per game: 62.

## Final value per player
min 95875 / p2.5 348375 / median 1676500 / p97.5 4742050 / max 8983688 / mean 1835947

## Flags
- salary outliers: 2
- 44 cards are plain self stat changes with no decision/interaction


## Never observed (unreachable or rare in this sample)
- Abilities: none
- Cards resolved: none
- Careers held: none
- Assets held at finish: 1 of 100


## Static audit

### Economy scale
Starting Wealth 120,000; mean career salary 139,265 per Payday; finish rewards 100,000 / 75,000 / 50,000 / 25,000; stat endgame values {"aiSkill":15000,"fame":8000,"lifestyle":10000,"influence":7500}.
Finish-order 1st reward is 83.3% of starting Wealth and 6.0% of median final value.
Wealth-card amounts of $2,500/$5,000/$10,000 are 1.8% / 3.6% / 7.2% of one average Payday.

### Cards (96)
Decks: wealth: 16 cards, avg value 11,797, 8 interactive/risk/conditional; ai: 16 cards, avg value 28,313, 9 interactive/risk/conditional; fame: 16 cards, avg value 19,156, 6 interactive/risk/conditional; lifestyle: 16 cards, avg value 25,813, 3 interactive/risk/conditional; influence: 16 cards, avg value 20,438, 11 interactive/risk/conditional; gamble: 16 cards, avg value 7,706, 15 interactive/risk/conditional.
Cards with only plain self stat/wealth changes (no risk, target, protection, modifier or career tag): 44.
Cards with |expected value| > 250,000: none.
Decks sharing an identical effect-kind signature: YES - wealth=[MODIFY_SALARY REWARD_MODIFIER RISK STAT TRANSFER_WEALTH UPGRADE_TOKEN]; ai=[PROTECT REWARD_MODIFIER STAT UPGRADE_TOKEN]; fame=[PROTECT STAT UPGRADE_TOKEN]; lifestyle=[PROTECT STAT UPGRADE_TOKEN]; influence=[PROTECT STAT TRANSFER_WEALTH UPGRADE_TOKEN]; gamble=[RISK STAT TRANSFER_WEALTH UPGRADE_TOKEN].
Deck-average EV spread (max/min): 3.67.
Decks with no career using them as primary affinity: none.

### Careers
| career | salary tiers | avg | start stats | tokens | affinity |
|---|---|---:|---|---:|---|
| ai-engineer | 70,000 / 100,000 / 140,000 / 200,000 | 127,500 | aiSkill+2 | 0 | ai/wealth |
| race-driver | 45,000 / 85,000 / 150,000 / 300,000 | 145,000 | influence+1 lifestyle+1 | 0 | fame/lifestyle |
| content-creator | 30,000 / 75,000 / 130,000 / 240,000 | 118,750 | fame+2 | 0 | fame/lifestyle |
| gig-worker | 25,000 / 50,000 / 85,000 / 140,000 | 75,000 | lifestyle+1 influence+1 | 0 | gamble/wealth |
| lawyer | 85,000 / 120,000 / 165,000 / 220,000 | 147,500 | influence+2 | 0 | influence/wealth |
| pro-gamer | 20,000 / 65,000 / 140,000 / 300,000 | 131,250 | aiSkill+1 fame+1 | 0 | gamble/ai |
| doctor | 100,000 / 140,000 / 180,000 / 240,000 | 165,000 | lifestyle+1 influence+1 | 1 | lifestyle/ai |
| personal-trainer | 35,000 / 60,000 / 95,000 / 150,000 | 85,000 | lifestyle+2 | 0 | lifestyle/fame |
| degen-trader | 20,000 / 75,000 / 200,000 / 500,000 | 198,750 | aiSkill+1 influence+1 | 0 | gamble/wealth |
| startup-founder | 20,000 / 65,000 / 150,000 / 350,000 | 146,250 | aiSkill+1 influence+1 | 0 | wealth/influence |
| influencer | 30,000 / 70,000 / 145,000 / 300,000 | 136,250 | fame+2 | 0 | fame/wealth |
| corporate-executive | 110,000 / 145,000 / 185,000 / 240,000 | 170,000 | influence+2 | 0 | wealth/influence |
| cybersecurity-specialist | 75,000 / 105,000 / 140,000 / 190,000 | 127,500 | aiSkill+2 | 0 | ai/wealth |
| entertainer | 25,000 / 70,000 / 160,000 / 350,000 | 151,250 | fame+2 | 0 | fame/lifestyle |
| real-estate-investor | 40,000 / 90,000 / 175,000 / 320,000 | 156,250 | influence+1 lifestyle+1 | 0 | wealth/influence |
| thief | 40,000 / 85,000 / 145,000 / 250,000 | 130,000 | influence+1 aiSkill+1 | 0 | gamble/wealth |
| alien | 50,000 / 100,000 / 175,000 / 300,000 | 156,250 | aiSkill+1 influence+1 | 0 | ai/influence |

Salary outliers (±40% of mean): gig-worker avg salary 75,000 vs mean 139,265; degen-trader avg salary 198,750 vs mean 139,265.

### Assets (100)
| category | count | avg cost | avg endgame-value/cost at L1 | max cost |
|---|---:|---:|---:|---:|
| car | 20 | 215,500 | 1.77 | 375,000 |
| lifestyle | 20 | 155,250 | 2.29 | 400,000 |
| pet | 20 | 92,000 | 2.40 | 150,000 |
| investment | 20 | 143,750 | 1.00 | 300,000 |
| property | 20 | 334,250 | 1.61 | 600,000 |

Value/cost outliers (<1.0 or >2.5): none.
Level 4 adds exactly 3x cost over Level 1 (cost x level), so upgrades always beat a plain Wealth hold at purchase price.

### Simulated strategy outcomes (avg final value / players)
Careers: doctor 2,214,716 (75), corporate-executive 2,139,380 (82), startup-founder 2,114,696 (50), pro-gamer 2,107,893 (61), lawyer 1,927,575 (88), real-estate-investor 1,816,684 (63), entertainer 1,812,476 (62), race-driver 1,810,010 (74), cybersecurity-specialist 1,795,983 (75), alien 1,776,382 (87), content-creator 1,744,257 (75), degen-trader 1,724,769 (72), influencer 1,713,400 (55), gig-worker 1,696,922 (74), thief 1,671,067 (69), ai-engineer 1,666,296 (82), personal-trainer 1,444,642 (56).
Characters: danger_zone 2,069,618 (56), panic_bot 2,002,757 (69), accuser 1,960,192 (69), the_rind 1,942,388 (56), click_click 1,931,488 (61), alpha_prime 1,926,032 (50), roll_safe 1,907,006 (60), pain_hider 1,881,179 (61), rainbow_dash 1,873,634 (57), executive_p 1,866,485 (60), wandering_eye 1,838,038 (50), frostbyte 1,828,795 (51), sadman 1,819,794 (63), guardian_h 1,802,895 (61), primate 1,787,678 (49), hotwired 1,786,329 (56), the_tank 1,773,078 (47), idol_core 1,768,578 (44), anointed 1,686,999 (61), prom_king 1,573,958 (62), low_flame 1,471,420 (57).
By number of assets held at finish: 4 assets 3,109,767 (15), 3 assets 2,373,372 (100), 2 assets 2,092,455 (347), 1 assets 1,728,107 (529), 0 assets 1,334,461 (209).
Best/worst career spread: 1.53x; best/worst character spread: 1.41x.
Dominance flags: none.

## Event counts
| event | count |
|---|---:|
| PLAYER_MOVED | 90733 |
| PASS_SPACE | 90000 |
| WEALTH_CHANGED | 19650 |
| DICE_ROLL | 18546 |
| TURN_START | 18496 |
| TURN_END | 18496 |
| LAND_ON_SPACE | 18410 |
| SALARY_GATE | 17198 |
| PASS_PLAYER | 16355 |
| ATTRIBUTE_GAINED | 11324 |
| CARD_DRAW | 10764 |
| CARD_RESOLVED | 7729 |
| LAND_ON_PLAYER | 6171 |
| INFLUENCE_CHANGED | 5467 |
| FAME_CHANGED | 5260 |
| DOUBLES_ROLLED | 5140 |
| LIFESTYLE_CHANGED | 3274 |
| ROLL_OF_2_OR_8 | 2719 |
| AI_SKILL_CHANGED | 2672 |
| CAREER_CHANGE | 1773 |
| PLAYER_AFFECTED | 1621 |
| ROLL_OF_8 | 1284 |
| ROLL_OF_2 | 1268 |
| FINISH_LINE_REACHED | 1200 |
| ENDGAME_STARTED | 1200 |
| ENDGAME_CHOICE_SELECTED | 1200 |
| ENDGAME_COMPLETED | 1200 |
| UPGRADE_TOKEN_GAINED | 1140 |
| ASSET_ACQUIRED | 1007 |
| MILESTONE | 1003 |
| ASSET_PURCHASED | 952 |
| UPGRADE_TOKEN_SPENT | 863 |
| MILESTONE_RECOVERED | 668 |
| CAREER_SWAPPED | 594 |
| CASH_OUT_RESOLVED | 400 |
| DOUBLE_DOWN_RESOLVED | 400 |
| FINAL_GAMBLE_RESOLVED | 400 |
| TURN_SKIPPED | 294 |
| UPGRADE_TOKEN_HELD | 246 |
| LIFESTYLE_PURCHASED | 241 |
| PET_PURCHASED | 235 |
| ASSET_UPGRADED | 227 |
| PROPERTY_PURCHASED | 213 |
| CAR_PURCHASED | 193 |
| ASSET_TRANSFERRED | 60 |
| SECOND_CAREER_ACQUIRED | 57 |
| CAREER_SWAP_RESOLVED | 49 |
| INVESTMENT_PURCHASED | 33 |

## Ability triggers
| ability | count |
|---|---:|
| character:executive_p | 2004 |
| career:influencer | 1767 |
| career:lawyer | 1569 |
| character:the_tank | 1466 |
| career:thief | 1214 |
| character:rainbow_dash | 912 |
| character:low_flame | 796 |
| career:pro-gamer | 786 |
| career:alien | 764 |
| career:entertainer | 744 |
| character:click_click | 723 |
| career:content-creator | 630 |
| character:prom_king | 550 |
| career:personal-trainer | 466 |
| character:accuser | 441 |
| career:corporate-executive | 402 |
| career:cybersecurity-specialist | 384 |
| character:primate | 366 |
| character:the_rind | 348 |
| career-affinity:content-creator:fame | 336 |
| career-affinity:race-driver:fame | 318 |
| career-affinity:alien:influence | 291 |
| career-affinity:thief:wealth | 286 |
| career-affinity:corporate-executive:wealth | 272 |
| career-affinity:lawyer:wealth | 266 |
| career:ai-engineer | 262 |
| career-affinity:ai-engineer:wealth | 256 |
| career-affinity:degen-trader:wealth | 256 |
| career-affinity:alien:ai | 252 |
| career-affinity:cybersecurity-specialist:wealth | 250 |
| career-affinity:personal-trainer:fame | 240 |
| career-affinity:real-estate-investor:wealth | 238 |
| career-affinity:entertainer:fame | 237 |
| career-affinity:influencer:wealth | 236 |
| career-affinity:lawyer:influence | 234 |
| career-affinity:corporate-executive:influence | 234 |
| career-affinity:gig-worker:wealth | 228 |
| career-affinity:influencer:fame | 222 |
| career-affinity:pro-gamer:ai | 219 |
| career-affinity:cybersecurity-specialist:ai | 213 |
| character:panic_bot | 207 |
| career-affinity:doctor:ai | 204 |
| career-affinity:ai-engineer:ai | 198 |
| career-affinity:startup-founder:wealth | 194 |
| career:degen-trader | 186 |
| character:sadman | 177 |
| career-affinity:real-estate-investor:influence | 174 |
| character:danger_zone | 165 |
| career-affinity:startup-founder:influence | 162 |
| career:race-driver | 159 |
| character:idol_core | 156 |
| career:startup-founder | 153 |
| career-affinity:gig-worker:gamble | 150 |
| career-affinity:degen-trader:gamble | 140 |
| character:pain_hider | 138 |
| career-affinity:thief:gamble | 136 |
| career:gig-worker | 117 |
| career-affinity:pro-gamer:gamble | 114 |
| career-affinity:race-driver:lifestyle | 114 |
| career-affinity:content-creator:lifestyle | 112 |
| character:alpha_prime | 100 |
| character:anointed | 87 |
| career-affinity:personal-trainer:lifestyle | 82 |
| career-affinity:doctor:lifestyle | 76 |
| character:hotwired | 74 |
| career-affinity:entertainer:lifestyle | 66 |
| character:wandering_eye | 60 |
| character:frostbyte | 57 |
| career:real-estate-investor | 39 |
| character:roll_safe | 32 |

## Card resolutions (top)
| card | count |
|---|---:|
| wealth-liquidation | 144 |
| wealth-seed | 140 |
| wealth-late-fee | 139 |
| wealth-side-contract | 139 |
| wealth-insider-bid | 136 |
| wealth-handshake | 135 |
| wealth-windfall | 134 |
| wealth-repair-bill | 132 |
| wealth-market-volatility | 131 |
| wealth-tax-refund | 130 |
| wealth-silent-partner | 126 |
| wealth-upgrade-token | 125 |
| wealth-angel-check | 123 |
| wealth-patent-payout | 122 |
| wealth-rent-hike | 121 |

## Career holdings at finish
| career | count |
|---|---:|
| alien | 95 |
| lawyer | 89 |
| corporate-executive | 89 |
| ai-engineer | 85 |
| content-creator | 78 |
| doctor | 78 |
| cybersecurity-specialist | 76 |
| degen-trader | 76 |
| race-driver | 75 |
| gig-worker | 74 |
| thief | 72 |
| real-estate-investor | 67 |
| pro-gamer | 66 |
| entertainer | 64 |
| influencer | 62 |
| personal-trainer | 58 |
| startup-founder | 53 |

## Endgame route usage (rotated) / winners by seat / titles
| CASH_OUT | 400 |
| DOUBLE_DOWN | 400 |
| FINAL_GAMBLE | 400 |

| seat 1 (first mover) | 80 |
| seat 4 | 78 |
| seat 3 | 76 |
| seat 2 | 66 |


