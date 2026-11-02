---
name: Salary gates and finish pacing
description: Durable rules for salary-tier rerolls and CPU progression after real players finish.
---

- A Salary Gate offers the player a choice to keep the active salary tier or reroll it. The reroll uses the normal salary rules and collects the resulting effective payday immediately.
- When all non-CPU players have reached the finish, fast-forward remaining CPU turns and endgame decisions. Stop at any unresolved human finish choice; never resolve a real player's choice automatically.
- Fast-forward only compresses the wait: CPUs still roll, move across board spaces, draw cards, resolve effects, and update their values.
- In single-player, pause after each ordinary CPU card effect so the human can acknowledge it. Multiplayer CPU card resolution stays automatic.

**Why:** The user requested a salary-tier reroll at Salary Gates and asked that CPU-only play not delay finished real players, while still showing CPU card effects in solo play.

**How to apply:** Keep the canonical reducer actions and board/card effects intact in both automation paths. Pause solo automation for human card acknowledgment and finish choices; keep multiplayer server autoplay automatic.
