---
name: Portrait matte cleanup
description: How to remove baked-in portrait margins without distorting roster thumbnails.
---

When a portrait has a baked-in border, crop the source image and reference a new asset path rather than scaling the rendered image. `object-fit: contain` can leave the image edge visible inside letterboxed slots.

**Why:** roster slots are wider than square portraits, so uniform CSS scaling does not reliably crop the actual image edge.

**How to apply:** inspect the asset pixels, crop only the unwanted matte, preserve the artwork composition, and use a new asset path so browsers do not reuse the old image.
