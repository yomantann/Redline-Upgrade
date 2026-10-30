---
name: Production shop asset paths
description: Shop catalog discovery must account for packaged frontend assets in the API production runtime.
---

The API deployment runtime contains the API build output but neither the frontend source `public` directory nor the frontend `dist/public` output. The catalog generator only needs cosmetic filenames; the web artifact serves the actual images through their asset paths.

**Why:** Production shop requests returned 500s because the API package did not contain either frontend asset directory. Copying the large image files into the API package is unnecessary and would substantially increase its size.

**How to apply:** Generate a compact logo/skin filename manifest from the frontend source during the API build, place it in the API build output, and read it at runtime. Keep the actual images in the web artifact and preserve their existing public asset paths.
