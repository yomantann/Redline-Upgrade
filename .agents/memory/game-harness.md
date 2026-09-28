---
name: Game harness setup
description: Current-directory, environment, and randomized-fixture constraints for Redline's Vite-based game checks
---

Run the game harness from `artifacts/redline-upgrade`; its Vite middleware server resolves `/src/...` against the current directory. Manual Vite builds also need `PORT` and `BASE_PATH` values from the artifact configuration.

**Why:** Running the harness from the repository root cannot resolve game modules. Matches select a random subset of careers, so the Doctor starting benefit may be absent, and stat values can vary with the selected careers.

**How to apply:** Use `cd artifacts/redline-upgrade && node scripts/check-game.mjs`. For reducer tests, set career, position, assets, and token counts explicitly; when testing a modified player, compare against captured starting stats rather than fixed values. When isolating an event such as Salary Gate, disable unrelated abilities on every other player: a randomly assigned career can also affect the acting player's result.