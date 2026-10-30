---
name: Profile identity fields
description: Scope for the app's editable profile name and authentication email
---

Users may edit their app display name from the profile screen. This is separate from the OIDC identity name and persists in the app account. The sign-in email remains provider-managed and read-only; the app does not claim to change the user's login credentials.

**Why:** The user selected editable name only and explicitly declined email editing.

**How to apply:** Keep display-name edits authenticated and server-persisted. Keep email sourced from the identity provider unless the user explicitly changes this scope.
