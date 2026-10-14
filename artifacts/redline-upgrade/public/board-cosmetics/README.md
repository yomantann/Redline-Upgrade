# Board Cosmetics

## Obsidian Frequency

- PNG: `obsidian-frequency.png`
- Browser asset URL: `/board-cosmetics/obsidian-frequency.png`
- Texture dimensions: 1024 × 670 (approximately the board deck's 46.8 × 30.6 surface ratio)

This is a full-bleed base-deck texture. To apply it to the WebGL board, map it to the top face of the deck slab, not the scene background. Keep the existing route, tiles, zone inlays, labels, and tabletop structures layered above it.

The static SVG fallback draws its own deck polygon, so it also needs to reference this PNG if the equipped cosmetic should appear when WebGL is unavailable. Cosmetic ownership/equipping is not wired up yet; this folder only supplies the art and its intended surface.
