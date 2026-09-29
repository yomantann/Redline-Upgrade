---
name: Browser preview limits
description: Browser verification constraints for Redline's 3D pawns and turn-based gameplay
---

The screenshot browser may fail to create a WebGL context even when the app and React Three Fiber code compile successfully. Keep character selection functional and show a no-WebGL representation rather than allowing the rendering error to take down the route.

**Why:** In this environment, Three.js reported a WebGL context creation failure during the Phase 3 preview. The browser could display normal React and SVG content but could not display the live 3D scene.

**How to apply:** When changing pawns, preserve the capability check and fallback, then check the app preview for route stability. A screenshot of that fallback does not validate the actual GPU scene; verify live geometry in a WebGL-capable browser when one is available.

The automated browser tester can return infrastructure errors before reporting gameplay results, and the screenshot proxy can return 504 while local Vite and the development-domain URL both return 200. Treat those as verification gaps, not evidence of an app bug.

**Why:** Turn timing and visual movement need a running browser, but automation availability is outside the app's control. Claiming an end-to-end pass after an infrastructure failure would misrepresent what was checked.

**How to apply:** When browser testing fails, check the local Vite and development-domain responses, then use deterministic reducer and layout checks for what they cover. Retry a screenshot once if the endpoints are healthy; stop after repeated capture failures, avoid restart loops, and report the visual-verification gap plainly.

For board redesigns, keep the WebGL tabletop as the primary renderer, but give its no-WebGL path a physical-looking route projected from the same world positions—not a separate card grid.

**Why:** The Replit screenshot browser displayed the fallback instead of the GPU scene. A flat fallback would make a successful 3D redesign appear unchanged there, and separate coordinates would misrepresent player movement.

**How to apply:** Keep one ordered route source for both renderers, preserve visible pawns and numbered spaces in the fallback, and report that a fallback screenshot does not prove the live WebGL view.

## R3F preview sizing

Give the React Three Fiber canvas host an explicit responsive height on its first layout, and use the default continuous frame loop unless demand rendering has a reliable invalidation path. Keep a visible no-WebGL fallback; a fallback screenshot does not verify that the 3D scene itself rendered.

**Why:** A 3D mockup route can load and typecheck while its first screenshot is blank or falls back, so route success alone does not establish that the canvas has usable dimensions or WebGL.

**How to apply:** Verify the fallback in the screenshot browser, then separately verify the scene in a WebGL-capable browser before claiming the 3D view is visually confirmed.