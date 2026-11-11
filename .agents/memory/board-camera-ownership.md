---
name: Board camera ownership
description: Preserve manual board inspection across gameplay events and responsive layout changes
---

Manual camera placement belongs to the viewer, not the active turn. Dragging must freeze the camera target as well as its pan offset; otherwise a moving pawn still pulls the user's view.

**Why:** The board-first overhaul explicitly requires uninterrupted inspection while other players move or resolve events.

**How to apply:** Only explicit follow, reset, fit, player-focus or space-focus actions should change camera ownership. Preserve the mounted board and its camera state while toggling layout or inspecting decisions. Keep WebGL and fallback targeting behavior aligned.
