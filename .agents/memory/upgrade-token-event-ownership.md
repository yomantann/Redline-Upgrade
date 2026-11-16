---
name: Upgrade-token event ownership
description: Prevent double-awarding tokens when reducers emit progression events.
---

Token gains must update the player count through the `UPGRADE_TOKEN_GAINED` event only. Do not also increment `player.upgradeTokens` directly in the reducer before emitting that event.

**Why:** The event queue applies the token delta to match state. A direct state update plus the event awards the same token twice.

**How to apply:** When adding a token reward, emit the gain event and test the exact before/after count, including nested encounter outcomes.
