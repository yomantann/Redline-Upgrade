---
name: Browser preview limits
description: Browser verification constraints for Redline's 3D pawns and turn-based gameplay
---

The screenshot browser may fail to create a WebGL context even when the app and React Three Fiber code compile successfully. Keep character selection functional and show a no-WebGL representation rather than allowing the rendering error to take down the route.

**Why:** In this environment, Three.js reported a WebGL context creation failure during the Phase 3 preview. The browser could display normal React and SVG content but could not display the live 3D scene.

**How to apply:** When changing pawns, preserve the capability check and fallback, then check the app preview for route stability. A screenshot of that fallback does not validate the actual GPU scene; verify live geometry in a WebGL-capable browser when one is available.

On September 26, 2026, the automated browser tester returned infrastructure errors twice before reporting any gameplay result; a standalone Chromium debugging attempt connected but did not load the app. This is a verification gap, not evidence of an app bug. Use deterministic reducer checks and app screenshots for the parts they can verify, and clearly distinguish those from a completed interactive browser test.

**Why:** Turn timing and visual movement need a running browser, but automation availability is outside the app's control. Claiming an end-to-end pass after an infrastructure failure would misrepresent what was checked.

**How to apply:** When browser testing fails independently of the app, attempt a distinct low-cost check, stop after repeated infrastructure failures, and report the limitation plainly.