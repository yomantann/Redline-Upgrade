---
name: Personal Best baselines
description: Rules for comparing new Personal Best records with historical completed games.
---

Seed Personal Best baselines from authenticated completed-game history when the new record table has no entry for a mode/category. Use only categories whose values were actually persisted in those historical snapshots; categories without comparable history establish a baseline on the first eligible game after the feature exists. A new record requires a strictly greater value.

**Why:** Existing players' prior completed games are valid comparison points, but older snapshots may not contain every newer statistic, so missing values must not be inferred.

**How to apply:** When adding or revising per-account records, derive legacy values from authoritative completed-game records, keep modes isolated, and exclude unavailable categories until new games persist them.
