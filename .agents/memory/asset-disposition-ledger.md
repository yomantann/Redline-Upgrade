---
name: Asset disposition records
description: Preserve explicit per-asset reasons whenever game effects remove or transfer equipment.
---

Every route that removes an asset from a player's equipment must emit an individual disposition or transfer event, including the asset's level and the cause. A missing asset at endgame is not enough evidence to call it lost; unresolved cases stay flagged as unexplained.

**Why:** A gamble-card failure can clear multiple assets before the finish, so a final inventory alone cannot distinguish an actual loss from missing history.

**How to apply:** When adding a card, ability, or endgame effect that removes assets, emit one event per asset and verify its reason survives into completed-game history and the profile ledger.
