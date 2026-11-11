# Phase 29 implementation and verification

## Delivered

- Compact gameplay and preview headers, smaller margins, viewport-aware board heights, and responsive desktop board/control columns.
- Board Focus layout with player summary drawer, turn/roll and pending-decision shortcuts, explicit exit and Escape.
- Separate fit-board/reset actions, follow toggle, selected-player and selected-space focus, zoom buttons, optional wheel zoom and touch pinch.
- Manual drag freezes the camera target instead of allowing the active pawn to move the view underneath the pan offset.
- Portrait, short landscape and desktop default zoom settings. Existing orthographic camera angles, board geometry, pawn models and gameplay rules are preserved.
- Higher-contrast outlined Standard labels/icons and larger Bio numbers and labels.
- Memoized board scenes ignore wealth/attribute-only changes while retaining position, identity, slot, name, status and camera updates.
- Shared focus targeting and corrected drag scale for the no-WebGL fallback.
- Pending cards use a non-blocking, inline presentation in gameplay, preserving decision state while leaving inspection controls accessible.

## Root causes addressed

Oversized headings, page margins and stacked controls consumed the available viewport. Mobile inherited camera framing with excessive zoom. A movement effect forcibly switched back to follow mode. Camera targeting only supported the active pawn. Full-board view was not a dedicated focus layout. Fixed card overlays blocked inspection controls.

## Evidence

Comparable guest preview screenshots (not live-match before/after evidence):

- `screenshots/phase29-before-mobile.jpg` and `screenshots/phase29-after-mobile.jpg`: 390 × 844.
- `screenshots/phase29-before-desktop.jpg` and `screenshots/phase29-after-desktop.jpg`: 1440 × 900.

The screenshot renderer displayed live WebGL. The interactive browser tester instead reported WebGL2 unavailable and exercised the fallback.

## Browser checks

Viewport emulation, not physical devices: 360×800, 390×844, 430×932, 844×390, 1024×768, 1366×768, 1440×900 and 1920×1080. No horizontal document overflow observed.

Passed: guest Standard and Bio startup, human roll/movement, AI card resolution, solo CPU acknowledgment, Bio participant/vote targeting and resolution, Board Focus, compact player drawer, turn shortcut, exit/Escape, fit/zoom/follow/player focus, wheel opt-in. Targeted follow-up passed persistent Bio space selection and CENTER without changing turn state.

Found and corrected:

1. Old mobile grid spans inflated the new camera toolbar; verified visually after correction.
2. Bio fallback click selection was disrupted by parent pointer capture; selection now uses pointerdown and supports keyboard activation. Browser follow-up passed.
3. Fixed card overlays intercepted focus/inspection controls. Cards now remain inline in both normal and Focus gameplay layouts, with matching nonmodal accessibility semantics and explicit responsive grid rows. This final broadening was checked in source/build, not rerun in the browser.

## Automated checks

TypeScript, production build, the board footprint check (75 spaces and existing scenery), and the existing gameplay regression harness were run. The gameplay harness covers all six decks, career/character effects, salary gates, asset upgrades, endgame, and complete Standard/Bio solo/multiplayer simulations. These checks are not equivalent to browser testing every decision surface.

## Remaining acceptance gaps

- No physical phone/laptop GPU or FPS measurements; software rendering cannot establish typical-device performance.
- Live WebGL drag during movement and touch pinch were not interactively verified.
- Fallback labels are crowded on small phones at full-board zoom; close views and space details remain available.
- Asset-purchase, upgrade, protection/transfer and endgame decision interfaces were not all exercised in the browser matrix.
- The final non-blocking card layout requires targeted browser confirmation.
- Before/after screenshots compare the guest preview, not identical active-match states.

Implementation is delivered, but the full Phase 29 device/performance and exhaustive browser acceptance gate is not yet established.
