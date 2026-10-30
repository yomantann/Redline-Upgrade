---
name: Production shop asset paths
description: Shop catalog discovery must account for packaged frontend assets in the API production runtime.
---

The API service is packaged separately from the frontend source directory. In production, the source `public` folder is absent, while the frontend's configured `dist/public` output is available alongside the API service.

**Why:** Production shop requests failed when catalog generation scanned the frontend source folder, even though the published frontend build contained the skin and logo assets.

**How to apply:** API code that discovers shop assets should support both the source folder used in development and the packaged frontend build output used in production. Confirm the current deployment layout before changing these paths.
