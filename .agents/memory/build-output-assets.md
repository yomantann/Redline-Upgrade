---
name: Build-output asset durability
description: Keep user-provided assets out of generated build directories.
---

Treat files in `dist` as disposable build output. Before a build, check whether user-provided assets exist only there and preserve them in durable source folders first.

**Why:** A Vite production build regenerates `dist` and can remove manually added files that are not represented in source assets. Pawn images were found in build output and were no longer present there after a build.

**How to apply:** Inspect relevant `dist` asset folders before running builds; copy or restore user assets into the artifact's source-owned public/asset directory, then verify the build output contains them.
