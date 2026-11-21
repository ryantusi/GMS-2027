# Global Marine Supplies — Maritime Engineering & Ship Supply Platform

A modular Vite + React 19 + TypeScript single-page experience powered by Tailwind CSS v4, GSAP (`3.15.0` with ScrollTrigger, SplitText, DrawSVGPlugin, Flip), Lenis smooth scroll, Zustand state management, and `react-globe.gl` / Three.js.

## Local Development in VS Code

### 1. Prerequisites
- **Node.js**: `v20.x` or `v22.x` LTS recommended (with `npm`)

### 2. Installation & Running Locally
```bash
# 1. Install dependencies
npm install

# 2. (Optional) Copy environment variables
cp .env.example .env

# 3. Start the Vite development server on http://localhost:3000
npm run dev
```

### 3. Available NPM Scripts
- `npm run dev` — Starts the local development server at `http://localhost:3000` with Hot Module Replacement (HMR) enabled.
- `npm run lint` — Runs TypeScript type-checking (`tsc --noEmit`).
- `npm run build` — Builds the production bundle into `dist/`.
- `npm run preview` — Previews the production build locally.

### 4. Developer Query Parameters
Append these query strings in your browser during development:
- `http://localhost:3000/?skipPreloader` — Bypasses the porthole preloader and jumps straight into the site.
- `http://localhost:3000/?debug` — Enables GSAP `ScrollTrigger` visual markers across all pinned and scrubbed sections.

### 5. Optional Production Assets & Endpoints
- **Contact Form Endpoint**: Set `VITE_CONTACT_ENDPOINT="https://your-endpoint"` in `.env` to send live `POST` payloads. When unset, the form simulates a `1.1s` submission so you can test the 3-state ship departure video choreography offline.
- **Placeholder Media Assets**: The codebase includes crisp procedural SVG/UI fallbacks for a few 0-byte placeholder files. Drop real files into these paths at any time and they will load automatically:
  - `public/services/ship.png` & `public/services/blueprint.png` (pixel-aligned 16:9 tanker photo & blueprint)
  - `public/sectors/merchant.png`, `offshore.png`, `cruise.png`, `navy.png`, `yachts.png` (transparent side-profile vessel cutouts)
  - `public/audio/ambient.mp3` (looping maritime ambient audio)

## Folder Structure

```text
src/
  content/          site.json, stores.json, services.json, sectors.json, offices.json, memberships.json
  engines/          FrameSequence/, GlobeBase/, VideoStates/
  sections/         Navbar/, Cursor/, Preloader/, Hero/, About/, Memberships/, Stores/, Services/,
                    WhyUs/, Sectors/, Network/, Contact/, Footer/, ContactDirectory/
  components/       Dialog/ (shared by the certificate viewer, services modal and contact directory)
  lib/              lenis.ts, scroll.ts, theme.ts, store.ts (Zustand), loader.ts
  styles/           tokens.css, globals.css
public/
  frames/hero/desktop/   frames/hero/mobile/
  frames/stores/desktop/ frames/stores/mobile/
  video/  images/  logos/  geo/
references/         moodboard images and links
```

## UI Components & Sections Documentation

### Core Engines (`src/engines/`)
- **`FrameSequence/`**: HTML5 `<canvas>` frame-scrubbing engine synchronized with GSAP `ScrollTrigger` and `src/lib/loader.ts`. Automatically switches between `desktop/` and `mobile/` frame directories.
- **`GlobeBase/`**: WebGL 3D interactive globe built on `react-globe.gl` and `three`, rendering global office pins, connection arcs, and GeoJSON polygons from `public/geo/`.
- **`VideoStates/`**: Managed video player engine handling seamless state transitions (idle, hover, active) with buffered preloading.

### Shared Components (`src/components/`)
- **`Dialog/`**: Shared modal container controlled via `useAppStore` (`src/lib/store.ts`). Powers:
  1. **Certificate Viewer** (triggered from `Memberships`)
  2. **Services Modal** (triggered from `Services`)
  3. **Contact Directory** (triggered from `Navbar`, `Network`, or `Contact`)

### Page Sections (`src/sections/`)
- **`Preloader/`**: Tracks initial frame sequence and asset manifest loading via `src/lib/loader.ts`.
- **`Cursor/`**: Custom pointer follower reacting to interactive hover targets.
- **`Navbar/`**: Top navigation bar adhering to the 3-zone contract.
- **`Hero/`**: Primary viewport anchor backed by `FrameSequence`.
- **`About/`**: Company narrative and key quantitative proof points.
- **`Memberships/`**: Industry accreditations and certifications; opens the shared `Dialog` certificate viewer.
- **`Stores/`**: Scroll-scrubbed stores showcase powered by `FrameSequence`.
- **`Services/`**: Numbered capability breakdown; opens detailed specifications in `Dialog`.
- **`WhyUs/`**: Value proposition and operational differentiators.
- **`Sectors/`**: Industry verticals served, driven by `src/content/sectors.json`.
- **`Network/`**: Global presence showcase integrating `GlobeBase` and `src/content/offices.json`.
- **`Contact/`**: Direct inquiry capture section.
- **`ContactDirectory/`**: Global office and regional contact directory view rendered inside `Dialog`.
- **`Footer/`**: Site index, legal notices, and social links from `src/content/site.json`.
