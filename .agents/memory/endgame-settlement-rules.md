---
name: Endgame settlement rules
description: User-defined scoring, asset risk, and Upgrade Token conversion rules for Redline Upgrade.
---

- Final dollar score includes Wealth after finish-order and attribute-leader bonuses, attribute point value, choice-adjusted asset value, and the selected endgame adjustment.
- Cash Out scores assets at 50%; Double Down scores them at 70% before the existing 2d4 multiplier; Final Gamble scores assets at 140% on a win and 0% on a loss.
- Acquiring or upgrading an attribute-bearing asset awards its configured attribute points. Each asset-level award is capped at 10 total points, but there is no match-wide attribute-point cap; using an Upgrade Token applies the upgrade's added points when available.
- Asset attribute points already awarded are not removed when the asset is sold, transferred, or lost. A recipient may earn their own award when acquiring a transferred asset.
- Final Gamble risks assets only. Wealth and attributes remain unchanged whether it wins or loses.
- Upgrade Tokens are not dollar score. Consume them after conversion: 200 Credits each for Cash Out or Double Down, 400 each for a Final Gamble win, and 0 for a loss.

**Why:** the user defined these scoring, asset-award, and settlement rules, including that attribute points can accumulate without a match-wide cap and are kept after asset loss.

**How to apply:** keep the shared solo/multiplayer reducer, authenticated wallet settlement, result records, and profile history consistent. Never include token Credits in dollar score, subtract awarded attributes on asset disposition, or risk Wealth and attributes in Final Gamble.
