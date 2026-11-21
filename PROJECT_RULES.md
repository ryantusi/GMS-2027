# Project rules: GMS ship chandling website

## Read first
- DESIGN.md is the source of truth for design, behaviour, build and acceptance
  criteria. Follow it exactly; where it's silent, decide consistently with
  its tokens and principles and note the decision.
- All text content comes from src/content/*.json. Never hard-code copy, numbers
  or contact details in a component.
- All media comes from public/, at the paths DESIGN.md section 1.8 gives.
  These are placeholder-quality, not final — never hard-code a dimension,
  frame count or duration; read it at runtime or from a manifest.
- For GSAP, Lenis and react-globe.gl, follow docs/INDEX.md and the specific
  files it points to. They override your own memory of these libraries.
- This is a static website. Never call the Gemini API or use an API key.

## Stack
React + TypeScript + Vite, Tailwind, GSAP (ScrollTrigger, SplitText, Flip,
DrawSVG, MorphSVG, MotionPath) via @gsap/react's useGSAP, Lenis, Zustand,
react-globe.gl.

## Few rules
- Exactly one Lenis instance (src/lib/lenis.ts), wired to the GSAP ticker.
  Never create a second one or a second rAF loop.
- No emojis to be used in text content.
- Any internally scrolling element (modal body, directory list) carries
  data-lenis-prevent.
- Every section lives in src/sections/[Name]/ and owns its own
  ScrollTriggers. No global timeline reaching across sections.
- When working on one section, don't modify other sections unless asked.
- Animate only transform and opacity. Never width, height, top, left,
  filter on large elements, or backdrop-filter.
- Use gsap.matchMedia() for desktop/tablet/mobile and for
  prefers-reduced-motion variants. Clean up every animation, ScrollTrigger
  and listener on unmount (useGSAP handles GSAP's side of this).
- Every section sets data-nav-theme="light" or "dark".
- All modals use src/components/Dialog. Never build a one-off modal.
- Interactive elements declare cursor state with data-cursor attributes;
  sections never control the cursor component directly.
- Lines use Deep Teal (--deep-teal) on light sections, Sonar Cyan
  (--sonar-cyan) on dark sections or anywhere a line should glow. Sonar
  Cyan is never used for text on a light background.
- Where an asset doesn't exist yet, generate a placeholder with
  MediaPlaceholder (DESIGN.md 1.6) — never a plain grey box — and record it
  in your report.
- Pause every off-screen effect (video, canvas, globe, autoplay, bobbing)
  with IntersectionObserver and on visibilitychange.
- Cap canvas and WebGL pixel ratio at Math.min(devicePixelRatio, 2); globe
  renderer has antialiasing off.
- After anything that changes page height, call ScrollTrigger.refresh().
