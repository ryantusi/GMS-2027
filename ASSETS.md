# Asset Pipeline & Manifest (`ASSETS.md`)

## Public Asset Directories (`public/`)

### 1. Scroll Frame Sequences (`public/frames/`)
- `public/frames/hero/desktop/` — 16:9 WebP/AVIF frame sequence for the desktop Hero canvas scrubber.
- `public/frames/hero/mobile/` — 9:16 portrait frame sequence optimized for mobile viewports.
- `public/frames/stores/desktop/` — 16:9 frame sequence for the Stores showcase scrubber.
- `public/frames/stores/mobile/` — 9:16 portrait frame sequence for mobile Stores scrubbing.

### 2. Video Assets (`public/video/`)
- Loops and state-driven clips consumed by `src/engines/VideoStates/`.

### 3. Still Photography & Certificates (`public/images/`)
- High-resolution editorial photography, sector imagery, and membership/ISO certificate scans.

### 4. Brand & Accreditation Marks (`public/logos/`)
- SVG wordmarks, partner insignias, and accreditation emblems (`Memberships`).

### 5. Geospatial Data (`public/geo/`)
- GeoJSON topology files (`world.geojson`), custom Hub coordinates, and arc definitions for `src/engines/GlobeBase/`.
