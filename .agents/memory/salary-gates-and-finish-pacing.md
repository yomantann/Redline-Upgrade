---
name: Salary gates and finish pacing
description: Durable rules for salary-tier rerolls and CPU progression after real players finish.
---

- A Salary Gate offers the player a choice to keep the active salary tier or reroll it. The reroll uses the normal salary rules and collects the resulting effective payday immediately.
- Passing a payday pays once automatically; landing on one waits for the player's take-or-reroll choice, then pays exactly once.
- When all non-CPU players have reached the finish, fast-forward remaining CPU turns and endgame decisions. Stop at any unresolved human finish choice; never resolve a real player's choice automatically.
- Fast-forward only compresses the wait: CPUs still roll, move across board spaces, draw cards, resolve effects, and update their values.
- In single-player, pause after ordinary CPU card effects for acknowledgment and after Bio party cards for the human to resolve or pass. Multiplayer CPU card resolution stays automatic.

**Why:** The user requested a salary-tier reroll, no duplicate payday income, and consistent single-player CPU card interactions across boards.

**How to apply:** Keep the canonical reducer actions and board/card effects intact in both automation paths. Pay passing and landing paydays through separate one-time paths; pause solo automation for card acknowledgment, Bio party resolution, and finish choices while keeping multiplayer server autoplay automatic.
