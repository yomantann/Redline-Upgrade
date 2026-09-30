---
name: Deferred ability decision ownership
description: Ability decision prompts may belong to someone other than the active player.
---

When an ability pauses the event queue, `pending.playerIndex` identifies who must decide, even when that player differs from `turnIndex`. Resolve the choice for the pending owner and preserve the active turn; resume the queued events and movement through the normal reducer path.

**Why:** A queued effect can be triggered by one player's event but require a choice from another player's ability. Using the active turn owner can show the wrong controls or auto-resolve the wrong player's choice.

**How to apply:** For new deferred abilities, store the owner on the pending decision and use that index for player identity, human/CPU handling, and choices. Do not change `turnIndex` while a decision is pending.