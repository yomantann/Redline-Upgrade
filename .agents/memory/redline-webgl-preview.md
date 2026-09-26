---
name: WebGL preview availability
description: Replit's screenshot browser and its implications for the Redline pawn renderer
---

The screenshot browser may fail to create a WebGL context even when the app and React Three Fiber code compile successfully. Keep character selection functional and show a no-WebGL representation rather than allowing the rendering error to take down the route.

**Why:** In this environment, Three.js reported a WebGL context creation failure during the Phase 3 preview. The browser could display normal React and SVG content but could not display the live 3D scene.

**How to apply:** When changing pawns, preserve the capability check and fallback, then check the app preview for route stability. A screenshot of that fallback does not validate the actual GPU scene; verify live geometry in a WebGL-capable browser when one is available.