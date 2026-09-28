---
name: Asset progression evidence
description: How to validate meaningful level-based artwork rather than file uniqueness alone.
---

For level-based asset art, a different file or hash is necessary but does not prove that an upgrade looks meaningful. Keep the underlying subject recognizable and verify that each tier adds visible, category-specific detail aligned with the asset.

**Why:** Early generated variants passed uniqueness checks while their visual additions were too small and included distracting labels; wheel accents also needed screenshot-based alignment corrections.

**How to apply:** Inspect representative renders across all categories and levels, check overlays against their base images, and retain file/reference audits as a separate validation layer.

When converting layered artwork to WebP, render transparent vector overlays separately and composite them over the base image before export. Do not rely on SVG `<image href>` links surviving ImageMagick's direct SVG conversion.

**Why:** The workspace's ImageMagick renderer ignored linked SVG base artwork in direct conversion, leaving only overlay marks on a blank background.

**How to apply:** Convert the base and overlay to raster images, composite them, export the final WebP, and inspect samples from each category for placement errors.