# DESIGN.md

The complete design and build specification for this ship chandling website. Read this before writing any code. Where this document and your own instincts disagree, follow this document.

**How to use it.** Part 1 is the system: the story, the tokens, the rules and the shared components. Everything in Part 1 applies to every section. Part 2 specifies each section in page order: what it looks like, how it behaves, which content and assets it uses, and how it hands over to the next section. Part 3 covers responsiveness, performance, accessibility and the order to build in.

**Scope of your decisions.** This document fixes the *what* and the *why*: layout, behaviour, colour, motion intent, content source and acceptance criteria. The *how* is yours: component structure, timeline construction, class names, state handling, helper functions. Where a value is given (a colour, a radius, a duration, a scroll percentage), use it. Where none is given, choose something consistent with the tokens and say what you chose.

---

# Part 1: The system

## 1.1 What this site is

A single-page premium website for a ship chandling company: a business that supplies ships in port with provisions, spare parts, safety equipment and everything else a vessel needs, and provides port services around them. The audience is ship owners, managers, captains and purchasing superintendents. They are technical, busy, and judge suppliers on competence.

So the site has to do two things at once: feel genuinely premium and cinematic, and read as credible to someone who works on ships. Cinematic without substance reads as marketing; a plain list of categories reads as a supplier of last resort. Every big visual moment in this site is attached to real information.

## 1.2 The story: one working day

The page is a voyage through a day. Each section sits at a point in that day, and the light changes as the visitor scrolls. This is why the backgrounds change: not for variety, but because time is passing.

| # | Section | Light | Background | Character |
|---|---|---|---|---|
| 1 | Preloader | First light | Sea Salt | Quiet |
| 2 | Hero | Bright morning on open water | Film (frame sequence) | **Loud** |
| 3 | About | Morning, clear | Sea Salt | Quiet |
| 4 | Memberships | Morning, clear | Sea Salt | Quiet |
| 5 | Stores | Inside the ship, below deck | **Dark** (Deep Hull) | **Loud** |
| 6 | Services | The drawing office, warm light | Warm paper (beige / soft gold) | **Loud** |
| 7 | Why choose us | Back out into clear daylight | Sea Salt / Harbour Mist | Medium |
| 8 | Sectors | Golden hour at sea | Film (video plate) | **Loud** |
| 9 | Network | Clear global daylight | Sea Salt | **Loud** |
| 10 | Contact | Night at the port | Film (night video) over Night Port | **Loud** |
| 11 | Footer | Night | Night Port | Quiet |

Two structural rules follow from this table.

**Loud and quiet alternate.** A loud section has one signature moment and earns full attention. A quiet section is calm, typographic and informative, and exists so the next loud section lands. A medium section is a mixture of both.

**Every transition is a change of light**, and is specified per section in Part 2. No section simply ends and another begins. The three biggest changes — morning white into the dark of the ship, dark into warm paper, and warm paper back into cool daylight — are the hinges of the page and deserve the most care.

## 1.3 Design tokens

Define all of these once in `src/styles/tokens.css` as CSS custom properties and mirror them into the Tailwind theme. Never hard-code a colour, radius, shadow, easing or duration in a component.

### Colour

| Token | Hex | Role |
|---|---|---|
| `--sea-salt` | `#F5F9FB` | Primary light background. A cool, slightly blue white; deliberately not cream |
| `--harbour-mist` | `#DCE8EE` | Secondary light background, tile surfaces, dividers |
| `--signal-blue` | `#0B5E8E` | Primary brand colour: buttons, active states, map markers |
| `--deep-hull` | `#0E2233` | Text on light backgrounds; the dark section background |
| `--night-port` | `#081420` | The deepest dark: contact details band and footer |
| `--brass` | `#C08A3E` | Sparing accent: coverage markers, small highlights |
| `--warm-paper` | `#F6EFE3` | Services background: warm white with a hint of gold |
| `--warm-sand` | `#E9C79A` | Services secondary warmth, golden-hour accents |

Two colours are reserved for **lines**: dividers, progress lines, leader lines, blueprint linework, arcs, scan lines and the cursor ring.

| Token | Hex | Role |
|---|---|---|
| `--deep-teal` | `#007786` | Lines on light backgrounds. Dark enough (about 5:1 on Sea Salt) for small text where needed |
| `--sonar-cyan` | `#03C5EC` | Lines that glow, and lines on dark backgrounds. On light backgrounds decorative only (about 2:1 contrast) — never used for text |

The rule: on light sections lines are Deep Teal; on dark sections lines are Sonar Cyan; anything that should glow is Sonar Cyan everywhere.

### Type

Two families, both already in the project.

| Role | Face | Notes |
|---|---|---|
| Display: headlines, counters, big numbers | **Gambetta** (serif) | Large, tight leading (1.0–1.1), generous size. This is where the premium feel comes from |
| Text: body, UI, labels, forms, tabs | **Switzer** (sans) | Neutral and legible. Always `font-variant-numeric: tabular-nums` for counters, phone numbers, times and IMO numbers so digits don't jitter |

Desktop scale: 14 / 16 / 20 / 28 / 44 / 72 / 120 px, fluid with `clamp()` between breakpoints. Body line length under 70 characters. Labels in sentence case, never tracked-out capitals. Do not decorate a headline with one italic or coloured word; size and the serif do the work.

### Shape, depth, glass

Radius follows hierarchy: large containers 32px, tiles and panels 24px, buttons and inputs 14px, chips fully rounded.

Shadows are layered and tinted with Deep Hull, never neutral grey:
`0 1px 2px rgba(14,34,51,.06), 0 12px 32px rgba(14,34,51,.08)`

Glass has two recipes:
- **Light glass** (navbar, floating button): background `rgba(245,249,251,.65)`, `backdrop-filter: blur(16px) saturate(160%)`, 1px border `rgba(255,255,255,.7)`.
- **Dark glass** (over dark video): background `rgba(255,255,255,.08)`, `blur(20px) saturate(140%)`, 1px border `rgba(255,255,255,.18)`, plus a 1px inner highlight on the top edge.

Always provide a solid fallback for browsers without `backdrop-filter`.

### Motion

| Token | Value | Use |
|---|---|---|
| `--ease-out` | `expo.out` | Things arriving |
| `--ease-in-out` | `power3.inOut` | Things travelling between two places (logo flight, globe camera) |
| `--ease-scrub` | `none` | Anything bound directly to scroll |
| `--dur-fast` | 0.25s | Hovers, button states |
| `--dur-base` | 0.6s | Panels, tabs, modals |
| `--dur-slow` | 1.2s | Section entrances, globe flights |
| `--scrub` | 0.6 | Smoothing on scroll-linked timelines |

Two motion laws:

1. **Motion answers something** — the scroll, a click, a hover, or loading. Nothing animates to fill space.
2. **No universal "fade up on enter."** Each section has its own entrance, specified in Part 2. If you find yourself applying the same reveal to every block, you have skipped the spec.

## 1.4 Hard rules

These are not stylistic preferences. Breaking any of them breaks the site.

**Scrolling**
- Exactly one Lenis instance, created in `src/lib/lenis.ts`, wired to the GSAP ticker and ScrollTrigger exactly as `docs/lenis.md` specifies. Never create a second instance, never add a second rAF loop.
- Any internally scrolling element (modal body, directory list) carries `data-lenis-prevent`.
- `lenis.stop()` while the preloader is visible or any modal is open; `lenis.start()` on close.
- Call `ScrollTrigger.refresh()` after fonts load, images load, and anything that changes page height.

**Animation**
- Read `docs/INDEX.md` and the files it lists before writing any animation, scroll or globe code. Those docs outrank your own memory of these libraries.
- GSAP in React only through `useGSAP`. Every animation, ScrollTrigger and listener is cleaned up on unmount.
- Animate `transform` and `opacity` only. Never animate `width`, `height`, `top`, `left`, `filter` on large elements, or `backdrop-filter`.
- Each section owns its own ScrollTriggers inside its own folder. No global timeline that reaches across sections.
- Use `gsap.matchMedia()` for desktop / tablet / mobile variants and for `prefers-reduced-motion`.

**Content and assets**
- All text, numbers, names and contact details come from `src/content/*.json`. Never hard-code copy in a component. If a needed field does not exist in the JSON, add it to the JSON rather than inlining the string.
- All media comes from `public/`, at the paths given per section.
- Treat every content file as possibly incomplete. Render gracefully when a field is missing; never crash, never print `undefined`.

**Rendering and performance**
- Cap canvas and WebGL pixel ratio at `Math.min(devicePixelRatio, 2)`.
- Pause every off-screen effect with IntersectionObserver: video playback, canvas drawing, globe rendering, autoplay timers, bobbing loops.
- Pause everything when the tab is hidden (`visibilitychange`).
- Lazy-mount anything heavy (globe, sectors video, contact video) only when its section approaches the viewport.

**Modals**
- One shared `Dialog` component in `src/components/Dialog/` used by the certificate viewer, the contact directory and any other overlay. Never build a one-off modal.

**Cursor**
- Interactive elements declare cursor state with data attributes (`data-cursor="view"`, `data-cursor-label="Commercial"`). Sections never reach into the cursor component directly.

**Theme**
- Every section carries `data-nav-theme="light"` or `"dark"`, where the value describes the *background*: `light` = dark text and dark cursor, `dark` = light text and light cursor. The navbar and the cursor both read it.

## 1.5 Assets in this build

**The assets in `public/` are placeholders for structure, not final production assets.** They exist so the site can be built, scrolled and judged now. They will be replaced later with final, graded, correctly sized versions. Build accordingly:

- Never hard-code an asset's pixel dimensions, frame count or duration into component logic. Read counts and paths from content/manifest JSON, or measure at runtime.
- Expect final assets to have different frame counts, durations and crops. Swapping them in must not require touching component code.
- Reserve layout space for every image and video (`aspect-ratio` or explicit width/height) so nothing shifts when a heavier asset arrives.

**Where an asset does not exist yet, generate a placeholder yourself — a good one.** A placeholder must be on-brand, not a grey box with a label: use the token palette, a subtle gradient or pattern in Deep Teal at low opacity, a Phosphor icon, and the item's real name from the content JSON. It should look like a deliberate design state. Put the placeholder logic in one shared helper so every missing image looks consistent and so swapping in real files later is one change.

Record anything you invent in a short list at the end of your work: which placeholders you created and what real asset should replace each one.

## 1.6 Shared components

Build these once, in `src/components/`, before the sections that depend on them.

**`Dialog`** — the only modal in the project. Opens by expanding from the element that triggered it (GSAP Flip) where that element is visible, otherwise fades up. Dimmed, blurred backdrop. Stops Lenis, traps focus, closes on Escape, on backdrop click and on the close button. Adds a URL hash so the browser back button closes it. Renders as a bottom sheet on mobile, draggable downward to dismiss. Content is passed in; Dialog owns only behaviour and chrome.

**`SectionHeading`** — display heading plus optional eyebrow label and supporting line, with the masked line-reveal entrance (each line slides up from behind a hidden edge, staggered). Takes the theme from the section.

**`Counter`** — counts to a target when it first enters view, `--dur-slow`, `--ease-out`, tabular figures, with the final value rendered in the DOM from the start for screen readers and reduced motion.

**`MediaPlaceholder`** — the on-brand fallback from 1.5, taking a label and an optional icon and aspect ratio.

**`CopyField`** — a phone number or email with a copy button that briefly confirms "Copied".

**`Reveal` primitives** — a small set of masked-reveal and stagger helpers used by the quiet sections, so their entrances are consistent without being identical.

## 1.7 Content files

| File | Feeds |
|---|---|
| `src/content/site.json` | Company name, tagline, emails, 24/7 line, WhatsApp, socials, addresses, stats — navbar, contact, footer, directory |
| `src/content/hero.json` | Hero title, subtitle, mid-sequence tagline, scroll cue text |
| `src/content/about.json` | About statement, paragraph, counters, mission text |
| `src/content/certificates.json` | Certification and membership names (text only for now) |
| `src/content/stores.json` | The store categories: names, descriptions, item lists |
| `src/content/services.json` | Service names and descriptions |
| `src/content/why.json` | The four reasons and their supporting lines |
| `src/content/sectors.json` | The four vessel sectors, counts and subtypes |
| `src/content/locations.json` | Continents, countries, offices, coordinates, contact details |

Inspect each file's actual shape before building its section and follow the real structure rather than assuming one. If a file's structure makes a specified behaviour impossible (for example, no coordinates for the globe), implement the rest and report the gap.

## 1.8 Asset locations

| Path | Contents |
|---|---|
| `public/logos/` | `logo.png`, `logo-trans.png` (transparent), plus membership logos |
| `public/hero/C0.mp4` | Hero idle loop video |
| `public/hero-frames/desktop/`, `public/hero-frames/mobile/` | Hero frame sequences |
| `public/stores/` | One image per store, named after the store |
| `public/services/` | Tanker photo and tanker blueprint |
| `public/sectors/` | `plate.mp4` plus the container, cruise, tug and navy cutouts |
| `public/contact/` | `contact1`, `contact2`, `contact3` videos |
| `docs/` | Library references — read `docs/INDEX.md` first |

Use `logo-trans.png` anywhere the logo sits over imagery or a coloured background (hero, navbar over film, footer). Use `logo.png` where a solid version is wanted. Never recolour the logo by filter; if a light-on-dark version is needed and missing, note it.

---

# Part 2: Section by section

Each section below gives its purpose, layout, behaviour, content and asset sources, and the transition into the next section, then a "done when" checklist that is the acceptance criteria for that section.

## G1. Navbar (global)

**Purpose.** Navigation that always stays fixed.

**Layout.** A slim bar (72px desktop, 64px mobile): logo left, section links centre (About, Stores, Services, Sectors, Network, Contact), then an audio toggle and a "Request a quote" button on the right. Along the bottom edge of the bar runs a **1px full-width scroll progress line** in Deep Teal (Sonar Cyan over dark sections), filling from left to right in proportion to the whole page's scroll progress, eased so it glides rather than snaps.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [logo]   About  Stores  Services  Sectors  Network  Contact  ♪[Toggle] │
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━──────────────────────────────────────── │ progress
└──────────────────────────────────────────────────────────────────────────┘
```

**States.** The navbar exists from the start and has the light primary background color.

| State | When | Visible |
|---|---|---|
| Hero logo | Top of page, before scrolling | The logo alone, large in the hero. No bar, no links, no progress line |
| Logo in transit | 0–30% of hero scroll | The logo travels and shrinks from the hero into the navbar's logo slot, scrubbed. Scrolling up reverses it at the same pace |
| Logo docked | 30–100% of hero scroll | The small logo sits in the top-left over the film. Its colour crossfades to suit the frames beneath it near the end of the dive |
| Bar formed | The moment the hero's pin releases | The glass bar fades in around the docked logo; links, toggle and button follow with a 0.05s stagger; the progress line appears |
| Active | Rest of the page | Hides on scroll down, returns on scroll up |

Use one logo element moved with Flip, never two logos crossfading. Set `invalidateOnRefresh: true` so the journey recalculates on resize.

**Audio toggle.** A small icon button on the right. There is no audio in the site yet, so build the control, not the sound: it holds an on/off state, persists for the session, shows a clear on and off icon with an accessible label, and defaults to **off**. Expose the state through a small shared store so ambient audio can be attached later without touching the navbar. If pressed while there is nothing to play, it simply changes state silently — no error, no tooltip apologising.

**Behaviour.** Each section's `data-nav-theme` switches the navbar's text, logo and progress-line colour as it passes, so the bar is always legible. A 2px Deep Teal active indicator slides between links. Links scroll via `lenis.scrollTo` with an offset of the navbar height; verify every link lands at the true top of its section, including the pinned ones. "Request a quote" scrolls to Contact and focuses the first form field.

**Mobile.** Logo, audio toggle and a menu button. The menu opens a full-screen Sea Salt overlay revealed by an SVG wave rising from the bottom (MorphSVG: flat → wave → full). Links set large in Gambetta. Tapping a link closes the menu, then scrolls.

**Done when:** no bar or links appear anywhere inside the hero; the logo travels and reverses with the scroll and survives a resize; the bar forms around the docked logo when the hero ends; the progress line tracks whole-page scroll; the audio toggle holds state and is labelled; text is legible over every section; every link lands correctly; the mobile menu traps focus and closes on Escape.

---

## G2. Custom cursor (global, desktop only)

**Purpose.** A refined pointer that also tells the visitor what is interactive.

**Form.** Two parts. A small **dot** (6px) with a soft two-layer glow, following the pointer almost instantly. A **ring** (34px, 1px stroke) following with a smooth delay — that delay is what makes it feel liquid. When the pointer moves fast the ring stretches slightly along the direction of travel and relaxes back to a circle.

**Colour is adaptive and must never camouflage.** The cursor reads the current section's `data-nav-theme` and crossfades over 0.3s:

| Section theme | Dot | Ring |
|---|---|---|
| `light` (Sea Salt, warm paper, white) | Deep Teal with a soft glow | Deep Teal |
| `dark` (stores, sectors film, contact, footer) | Sonar Cyan with a soft glow | Sea Salt at 60% |

**The hero is the exception.** There, the cursor becomes the scroll cue itself: the dot sits inside a ring with the hero's scroll text (from `src/content/hero.json`) set small beneath it, and the whole thing breathes — a slow glow pulse between about 70% and 100% over roughly 2.4s. It is the invitation to scroll. Once the hero's pin releases, it transitions back to the standard cursor.

**States elsewhere.**

| Over | Behaviour |
|---|---|
| Nothing interactive | Dot 6px, ring 34px |
| Links, buttons, tabs | Dot shrinks to 4px, ring grows to 56px with an 8% tint fill. Primary buttons lean up to 6px toward the cursor |
| Certificates, store tabs, service boxes | Ring 56px with "View" |
| The globe | Dot hidden, ring 64px with "Drag" |
| A sector vessel | Dot hidden, ring 72px with the sector's name |
| Text inputs | Both hidden; the native text caret returns |
| Mouse down | Ring to 0.85×, springs back on release |
| Pointer leaves the window | Both fade out |

**Build notes.** A single fixed element at the app root with `pointer-events: none`, moved only by transform, using `gsap.quickTo` (about 0.08s for the dot, 0.45s `power3.out` for the ring). Hide the native cursor only under `@media (pointer: fine)`. Keyboard focus rings stay fully visible — the cursor is never the only indication of what is selected. Not rendered at all on touch devices. Under reduced motion, dot and ring move together with no trail, stretch or breathing.

**Done when:** the ring trails smoothly with no jitter; colour switches correctly at every section boundary and is always visible against its background; the hero cursor shows the breathing scroll text; text inputs restore the native caret; nothing renders on touch.

---

## 1. Preloader

**Purpose.** Cover the loading of heavy media and set the tone in the first second.

**Layout.** A Sea Salt screen. Centred, a circle about 160px across outlined in a thin Signal Blue stroke, like a porthole. Inside, water rises from the bottom: two sine-wave surfaces drifting in opposite directions, with small bubbles rising and fading. The logo sits above the circle; below it, "Loading 64%" in Switzer with tabular figures.

```
            [ LOGO ]

          ╭─────────╮
         │     ○     │
         │ ∿∿∿∿∿∿∿∿∿ │   ← water level = real load progress
         │▓▓▓▓▓▓▓▓▓▓▓│
          ╰─────────╯

          Loading 64%
```

**Behaviour.** The water level tracks **real** loading progress, not a timer: fonts, the hero idle loop (`canplaythrough`), the hero's first frame, and a sparse set of hero frames (roughly every eighth). Everything else continues loading after the site opens. Two guards: a minimum display of 1.2s so it never flashes, and a maximum of about 8s so a slow connection still gets in, with remaining frames arriving progressively.

**Exit.** On reaching 100%: the water completes its fill with a slight overshoot, the logo and counter fade, and the whole preloader **fades out into the hero**, which is already playing its loop underneath. A clean cross-fade, around `--dur-base` to `--dur-slow` — no bars, no wipe, no slide. The hero headline begins its entrance as the fade completes.

**Assets.** None; all code. Logo from `public/logos/logo.png` (or `logo-trans.png` if it sits on the Sea Salt field more cleanly).

**Build notes.** Lenis stopped throughout; restarted after the fade. Provide `?skipPreloader` for development — you will reload hundreds of times. Mobile: 120px circle, fewer bubbles.

**Done when:** progress reflects real loading; never under 1.2s or over about 8s; the page cannot scroll beneath it; the fade reveals a hero already in motion with no black or blank frame between.

---

## 2. Hero

**Purpose.** The first impression, and the clearest statement of what the company does.

**Layout.** Full viewport. The film fills the screen. Over it:

```
┌──────────────────────────────────────────────────────────┐
|                                                          |
|                                                          |
│                      [ LOGO ]                            │
│                                                          │
│   ( IMPA · ISSA · ISO 9001 )   ← white pill, small logos │
│                                                          │
│   [Title]                                                │
│   [Subtitle]                           [ the ship ]      │
│                                                          │
│                                                          │
│                        (cursor carries the scroll cue)   │
└──────────────────────────────────────────────────────────┘
```

Title and subtitle sit **centre-left, left aligned**, in the left half of the frame where the sea is open. Title in Gambetta at display size, subtitle in Switzer beneath it. Directly **above the title** sits a small **membership pill**: a white (Sea Salt), fully rounded, slightly glassy capsule containing the membership logos from `public/logos/`, small and tightly spaced in sequence, with thin dividers between them. It is a quiet credibility signal in the first view — keep it small enough that it never competes with the title. If a membership logo file is missing, render its name as text in the same pill rather than a gap.

The scroll cue lives in the cursor (G2), not as a separate element on the page.

**Content.** `src/content/hero.json` — title, subtitle, mid-sequence tagline, scroll cue text. Membership names from `src/content/certificates.json` if needed for alt text or text fallbacks.

**Assets.** Idle loop `public/hero/C0.mp4`. Frames `public/hero-frames/desktop/` and `public/hero-frames/mobile/`. Read the frame count from the directory manifest or a content file — never hard-code it.

**How the film works.** Before any scroll, the idle loop plays on top of the pinned canvas: the ship bobs gently in bright morning light. On the first scroll the canvas takes over, drawing frames from scroll position, and the loop hides behind a short crossfade (about 0.25s). Because the loop begins and ends on the sequence's first frame, the handover is invisible.

The section is **pinned** for roughly 450–500% of viewport height, and every overlay element is driven by the same scrubbed timeline, so scrolling back up reverses everything exactly.

| Scroll | Film | Overlay |
|---|---|---|
| 0% | Idle loop | Logo large; pill, title, subtitle visible; breathing cursor cue |
| 0–10% | Sequence starts from the aerial view | Title lines slide up behind a mask one by one; subtitle and pill fade |
| 0–30% | Camera descends toward the ship | The logo travels into the navbar slot (G1) |
| 10–50% | Camera arcs in; the ship turns broadside and grows to fill the width | — |
| ~50–65% | The broadside moment, calm water in the lower band | The **tagline** from `hero.json` rises into the water band, holds, then leaves. Give these frames extra scroll distance so it can be read |
| 65–75% | Camera lowers to the waterline | Brief water droplets on the "lens" |
| 75–88% | The camera dips through the surface | A bright wavy surface line sweeps up the screen; small bubbles rise |
| 88–100% | Bright sunlit water, ending on a near-white aqua frame | A Sea Salt veil rises from the bottom, turning the water to white; the About heading begins rising into view |

**The unpin, which matters.** Release the pin a few frames **before** the sequence's last frame, while the veil is still completing. The visitor should never see the sequence stop and then the page start moving; the two overlap. Tune this on a real device: if there is a visible hitch at the hand-off, release earlier.

**Smoothness.** Progressive frame loading (sparse first, then fill in). Decode off the main thread. Draw cover-style, pixel ratio capped at 2. While the visitor pauses mid-scroll the frame holds still, so give the canvas a very slight hover drift (1–2px float, 0.3% scale breathe on a slow sine) so it never looks frozen. Use `gsap.matchMedia()` to load the mobile sequence on portrait screens.

**Reduced motion.** First frame as a still, title and subtitle visible, no pin, normal scrolling into About.

**Transition out.** The final 12% *is* the transition: the near-white frame and the rising Sea Salt veil meet, the pin releases, and About is already in place beneath. There must be no visible seam or colour step between the last frame and the About background.

**Done when:** the loop-to-sequence hand-over is invisible; scrolling up reverses everything; the pill reads clearly without competing with the title; the tagline appears at the broadside moment with time to read; the unpin has no hitch; the hero ends in white with no seam; it holds up on a mid-range phone.

---

## 3. About

**Purpose.** Who the company is, told simply. The site shifts from film to calm editorial clarity.

**Layout.** Sea Salt. A large statement left, a short paragraph and key facts right. Below, a collage of three images at different sizes. Below that, the mission paragraph set large.

```
┌──────────────────────────────────────────────────────────┐
│  We keep ships                 Founded in 19XX, we supply│
│  moving, port                  vessels across 40 ports…  │
│  after port.                                             │
│                                                          │
│   ┌────────┐      ┌───────────────┐                      │
│   │ img 1  │      │     img 2     │   ┌────────┐         │
│   └────────┘      │               │   │ img 3  │         │
│                   └───────────────┘   └────────┘         │
│                                                          │
│         75+            750+           1,000+             │
│         Countries     Ports         Vessels/yr           │
│                                                          │
│   A mission paragraph in large type whose words light up │
│   from faint to full as it scrolls through the middle.   │
└──────────────────────────────────────────────────────────┘
```

Use whatever counters `about.json` actually contains; the four above are illustrative.

**Behaviour.** The statement is what the hero's veil hands over to — it rises out of the white as the hero ends, so the two sections read as one movement. Continue the thought from the hero rather than restating it.

The collage uses **inner parallax**: each image sits in a fixed frame with `overflow: hidden`, the image inside is ~120% of the frame height and moves slower than the page, each at a slightly different rate (0.85 / 0.90 / 0.95). Subtle — the frame's edges must never be revealed.

Counters count up once on entering view (`Counter` component).

The mission paragraph is the section's signature: every word starts near 18% opacity and rises to full as the paragraph passes through the middle of the viewport, reversing on scroll up. It slows the visitor down to actually read the mission. Use SplitText by words, and keep the text selectable and readable to assistive technology.

**Content.** `src/content/about.json`.

**Assets.** No real photographs yet. Use `MediaPlaceholder` for all three collage slots, each labelled from the content (for example "Warehouse", "Launch boat delivery", "Our team") and styled on-brand per 1.5. Keep the exact aspect ratios you choose documented so real photographs drop straight in.

**Mobile.** Single column; collage becomes two side by side then one full width. The word-highlight effect stays — it works well on phones.

**Transition out.** None needed: Memberships continues on the same Sea Salt field with generous space between.

**Done when:** the statement rises seamlessly out of the hero's white; parallax never reveals a frame edge; counters animate once and reverse-safe; the word highlight reverses on scroll up; placeholders look deliberate.

---

## 4. Memberships and certifications

**Purpose.** Trust. The memberships and certifications the company holds, presented as a quiet, hypnotic focal element rather than a logo strip.

**Layout.** Sea Salt. A short heading and supporting line on the left; on the right, a **vertical wheel picker**: a tall, narrow column (roughly 420–520px high) in which the certification names scroll upward in a continuous loop, like a physical dial.

```
┌──────────────────────────────────────────────────────────┐
│                                   ·  ISO 14001 ·         │  ← far: faint, small
│  Recognised,                      ·   ISSA member ·      │
│  audited,                      ────────────────────────  │
│  accountable.                      IMPA  MEMBER          │  ← focal row: full
│                                ────────────────────────  │
│  Every order is handled            ·  ISO 9001 ·         │
│  under certified process.          ·  Port approval ·    │  ← far: faint, small
└──────────────────────────────────────────────────────────┘
```

**Behaviour — the wheel.**
- **Distance-based falloff.** The item at the focal row is full opacity and full size; items above and below fall off in opacity (to roughly 15%) and scale (to roughly 0.8) with distance from the focus. Optionally add a slight horizontal recession or rotation to suggest a cylinder. Soft masks at the top and bottom edges fade items out rather than clipping them.
- **Autoscroll with focal snap.** The wheel advances on its own, roughly one item every 2.5–3s, easing into each focal position and holding briefly, so each name is readable. It loops endlessly with no visible seam or reset.
- **Interaction.** It can be dragged or scroll-wheeled, snapping to the nearest item on release, with inertia. Autoscroll pauses on hover, drag or focus, and resumes after about 5s of stillness. Keyboard: up and down arrows move the focus.
- **Reading the focus.** The focal item is slightly emphasised — Gambetta at display size, with a thin Deep Teal hairline above and below the focal row.

**Text only for now.** There are no membership logos yet for this section, so the wheel shows names from `src/content/certificates.json` as type. The design must be strong enough that logos are an enhancement, not a requirement: when logos arrive, a small mark can sit beside the focal name without changing the structure. (The hero's membership pill is separate and uses the logo files that do exist.)

**Clicking an item** opens the **certificate viewer** in the shared `Dialog`: the certificate image large on one side, and on the other the name, issuer, number, validity and a one-sentence explanation of what it means, plus a "Verify with issuer" link where one exists. Arrows and left/right keys move between certificates without closing. Clicking the image opens a full-screen zoom that pans with the pointer (pinch and drag on touch). The wheel pauses while the viewer is open.

**Certificate images do not exist yet** — use `MediaPlaceholder` in a portrait A4 ratio, labelled with the certification name, so real scans drop in later. Read whatever fields `certificates.json` provides and omit rows it does not have rather than showing empty labels.

**Also here:** if `about.json` or `site.json` carries the headline statistics and About does not use them, they can instead sit as a quiet row beneath the heading on the left. Do not duplicate the same numbers in both sections.

**Mobile.** Heading above, wheel below, full width, shorter (about 300px), with the same falloff and snap. Touch dragging is the primary interaction. The viewer opens as a full-screen sheet with the certificate on top and details below, swiping left and right between items.

**Transition out.** Into Stores: described in section 5.

**Done when:** the wheel loops with no seam; falloff and snap make exactly one item clearly focal; autoscroll pauses on interaction and resumes; drag, wheel and keyboard all work; every item opens its viewer; the viewer closes on Escape, backdrop, button and browser back; it reads well with text alone.

---

## 5. Stores

**Purpose.** The heart of the business: everything the company supplies. The visitor goes below deck, and the site turns dark for the first time.

**Theme: dark.** Background Deep Hull, with Night Port at the extremes for depth. Text in Sea Salt, lines in Sonar Cyan, store imagery glowing against the dark. `data-nav-theme="dark"`. This is deliberate: it is the inside of a ship, it makes the store photography the brightest thing on screen, and it makes the warm paper of Services that follows feel like stepping into daylight again.

**Transition in — a dissolve.** Memberships does not scroll away; it **dissolves** into Stores. As the boundary approaches, the Sea Salt background crossfades to Deep Hull while the Memberships content fades out and the Stores content fades in, with a soft vertical gradient leading the change so the darkness arrives from the bottom like descending into a hold. No hard edge, no slide, no wipe. The navbar and cursor flip to dark theme during the crossfade, not after it.

**Layout.** A full-viewport section. Left (about 58%), a large rounded media panel (32px radius) showing the current store's image. Right, the heading, the store tabs, and the active store's details.

```
┌──────────────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────┐   What we supply                │
│ │                              │                                 │
│ │                              │   Provision Stores    ━━━━━──── │ ← progress
│ │                              │     Daily essentials, quality   │
│ │     STORE IMAGE              │     groceries and fresh produce │
│ │     (cross-dissolves)        │     · Fresh produce             │
│ │                              │     · Dairy and eggs            │
│ │                              │     · Meat, poultry, seafood    │
│ │                              │     [ Request provisions ]      │
│ │                              │   Engine Stores                 │
│ │                              │   Deck Stores                   │
│ │                              │   Electrical Stores             │
│ │                              │   Cabin Stores                  │
│ │                              │   Safety Stores                 │
│ │                              │   Stationery Stores             │
│ │                              │   Bonded Stores                 │
│ └──────────────────────────────┘   Chemical & Gases              │
└──────────────────────────────────────────────────────────────────┘
```

**Behaviour — an automatic, smooth carousel with details.** There is no frame sequence or camera movement here. Each store is one still image, and the section cycles through them.

- **Autoplay.** While the section is in view, each store holds for **5 seconds**, then advances to the next; after the last it wraps to the first. A thin Sonar Cyan progress line fills alongside the active tab over those 5 seconds, so the visitor can see the rhythm and that it is deliberate.
- **The image change is a smooth cross-dissolve** (around `--dur-base`), with the outgoing image easing out as the incoming eases in, and a very slight scale drift on the incoming image so the panel always feels alive rather than slide-show-like. Never a hard cut, slide or flip.
- **The still image breathes.** During its hold, the active image drifts with a slow push-in (1.0 → about 1.03) so the panel is never completely static.
- **Tabs.** All stores are listed as tabs in the right column, each clickable. The active tab expands in place to reveal its description and item list from `stores.json`, plus a "Request [store]" button; inactive tabs collapse to a single compact row. The detail text changes with a short masked line reveal, not a fade.
- **Clicking a tab** switches immediately to that store's image and details, with the same cross-dissolve, and restarts that store's 5-second progress. Autoplay pauses after a click and resumes after about 12s of no interaction.
- **Stopping.** Autoplay stops entirely when the section leaves the viewport or the tab is hidden, and resumes from where it was.
- **The Request button** scrolls to Contact and pre-fills the enquiry with that store, so the section converts as well as informs.

With nine or so tabs, check the right column at a laptop height of about 760px. If it does not fit, shorten the expanded description to a single line plus items rather than letting the list scroll internally.

**Accessibility.** Implement as the standard tabs pattern: `role="tablist"`, arrow keys to move, Enter or Space to select, correct `aria-selected`, and the panel associated with its tab. Autoplay must never move focus. Provide a visible pause control or ensure interacting with any tab pauses it (interacting is sufficient).

**Content.** `src/content/stores.json` — follow its real field names.

**Assets.** `public/stores/`, one image per store named after that store. Resolve each store's image from its id or name with a small helper, falling back to `MediaPlaceholder` with the store's name when a file is missing, so the section is complete even with gaps. Preload the next store's image during the current hold so the dissolve never shows a blank panel.

**Mobile.** Stacked: media panel on top (4:5), tabs as a horizontally scrollable row of chips with the active chip scrolled into view automatically, details below. Same autoplay and dissolve. Swiping the image left and right moves between stores.

**Reduced motion.** No autoplay; the visitor chooses a tab, and the image changes with a plain crossfade and no scale drift.

**Transition out.** Into Services: the dark background lifts to warm paper, described in section 6.

**Done when:** autoplay cycles every store at 5s and wraps; every tab click shows the correct image and details; the dissolve never shows an empty panel; the progress line matches the timing; autoplay pauses off-screen and on interaction and resumes; the right column fits at 760px; the Request button pre-fills Contact; the tabs are keyboard operable.

---

## 6. Services

**Purpose.** The services the company provides beyond supply, delivered as one precise, memorable scroll sequence: a ship becoming its own technical drawing.

**Theme: warm paper.** Background `--warm-paper`, with `--warm-sand` for gradients and glow, over a very faint technical grid (Deep Teal at about 6%, 40px squares). Text in Deep Hull, lines in Deep Teal, the scan line in Sonar Cyan. This is the drawing office: warm, precise, gold-tinted. `data-nav-theme="light"`.

**Transition in — out of the dark, into warm light.** As Stores ends, the Deep Hull background lifts cleanly to warm paper. Make it a *clean* change rather than a muddy one: let the dark recede as a warm glow spreads from the centre, as though a desk lamp has been switched on, with the faint grid fading in as the colour settles. Flip the navbar and cursor to light theme as the background passes its midpoint.

**The sequence.** The section is pinned for roughly 350% of viewport height. Every step below is bound to scroll, so all of it reverses on the way back up.

| Scroll | What happens |
|---|---|
| 0–15% | **The title arrives.** The big services title (from `services.json`) appears large in the centre of the screen, rising line by line from behind a mask |
| 15–30% | **It makes room.** The title moves up toward the top and scales down to roughly 55–60%, settling as the section's heading; the **description fades in just below it** |
| 25–50% | **The ship arrives.** The tanker photo slides in from the **left** edge and settles centred, spanning almost the full width |
| 50–80% | **The wipe.** Left to right, the ship becomes its blueprint: the blueprint layer is revealed from the left while the photo layer is hidden by the same moving edge, so at any moment the ship is part photograph, part drawing. A 2px Sonar Cyan scan line with a soft glow rides exactly on the boundary. The background grid strengthens from about 6% to 12% as the drawing takes over |
| 80–100% | **The services appear.** With the blueprint complete and the scan line faded, the service items appear as small modern boxes positioned over the drawing, in a short stagger |

**The two layers must align pixel for pixel.** Stack the photo and the blueprint in one container with a fixed aspect ratio, reveal with `clip-path: inset()` driven by a single progress value, and position the scan line from that same value. If the current assets do not align perfectly, do not compensate with per-asset offsets in code — build it correctly, and note the misalignment so the assets can be fixed. Final assets will align.

**The service boxes.** Small cards on the blueprint: a Phosphor icon, the service name in Switzer, in a semi-transparent warm-paper panel with a thin Deep Teal border and the layered shadow — modern, light, not heavy chips. They sit at sensible points over the drawing (bridge, accommodation, mid-deck, stern, bow) and may be positioned from a manifest or chosen sensibly and documented. Hover: the box lifts slightly, its border brightens to Sonar Cyan, a short Deep Teal leader line draws from the box to its point on the hull (DrawSVG), and the description from `services.json` expands beneath the name. Cursor shows "View". Only one box is expanded at a time.

Positions must be percentage-based so they stay correct at any width, and the boxes must never overlap each other or obscure the accommodation block.

**Content.** `src/content/services.json` — the big title, the description and the service list.

**Assets.** `public/services/` — the tanker photo and the tanker blueprint. Read both paths from a manifest or resolve them by filename; do not assume dimensions.

**Mobile.** The ship rotates to vertical (bow up) and slides in from the right, and the wipe runs top to bottom. Show fewer boxes (three or four), placed below or beside the drawing rather than on top of it where space is tight. The title, description and sequence order stay the same.

**Reduced motion.** The title and description in their settled positions, the completed blueprint, and the service boxes shown statically.

**Transition out.** Into Why choose us: described in section 7.

**Done when:** the title sequence runs in order (centre → up and small → description); the ship slides in from the left; the wipe shows no jump at the scan line and the line always sits exactly on the boundary; the whole sequence reverses on scroll up; the service boxes hover and expand cleanly without overlapping; mobile uses the vertical arrangement.

---

## 7. Why choose us

**Purpose.** Four reasons to choose this company, each proven by a small live detail rather than a claim. The most "product page" moment in the site, and it should feel as considered as an Apple product page.

**Transition in — warm back to cool.** The warm paper **dissolves** back to the cool light theme: `--warm-paper` crossfades to Sea Salt / Harbour Mist, the grid fades out, and the warmth drains away as the daylight returns. Keep it smooth and even — this is the counterpart to the Services entrance and should feel like the same door closing.

**Layout.** Heading, then four tiles of unequal size in an asymmetric grid. Tiles are Sea Salt on a Harbour Mist field, 24px radius, layered tinted shadow, with generous whitespace between them.

```
┌───────────────────────────────────┬────────────────────┐
│  A  (wide)                        │  B  (tall)         │
│                                   │                    │
├─────────────────┬─────────────────┤                    │
│  C  (compact)   │  D  (compact)   │                    │
└─────────────────┴─────────────────┴────────────────────┘
```

Map the four reasons from `src/content/why.json` onto the four tiles by what each needs: the one about global reach or network takes the **wide** tile (it needs horizontal room for a map); the one about quality or certification takes the **tall** tile (it suits a vertical checklist); the remaining two take the compact tiles.

**Each tile carries a live detail** — something that demonstrates the claim:

| Kind of claim | Live detail |
|---|---|
| Global network and reach | A flat dotted world map in the same dot language animation: dots lighting up in sequence, thin Sonar Cyan arcs drawing between offices. |
| Quality of stores | An inspection checklist with Deep Teal checkmarks animation, drawing in one by one |
| 24/7 availability | A live clock cycling animation |
| Competitive prices / quoting | A small quote card animation: three store lines sliding together into one consolidated quote. |

Use the client's real wording from `why.json` for titles and supporting lines; the details above illustrate the kind of proof each tile should carry. Never invent prices or comparisons with competitors — show process, not claims.

**One shared hover language**, so the grid feels like one object: a soft radial spotlight follows the cursor across the tile (a radial gradient positioned from CSS variables updated on pointer move), the tile tilts at most **3 degrees** toward the cursor, and the 1px border brightens to Deep Teal around the cursor with a faint Sonar Cyan glow at its brightest point. The animations play faster when hovered. Then the tile's own detail plays. Keep the tilt subtle; beyond 4 degrees it looks cheap.

**Entrance: one orchestrated moment,** not four fade-ups. As the section settles, the tiles unmask in a single diagonal sweep from top-left to bottom-right, each tile revealed with a `clip-path` from its own corner, about 0.08s apart.

**Content.** `src/content/why.json`, plus `locations.json` for the map and clock and `certificates.json` for the badge names.

**Mobile.** Single column, strongest two reasons first (network, then 24/7). No hover on touch, so each tile's detail plays automatically once as it enters view; the clock keeps cycling.

**Transition out.** Into Sectors: described in section 8.

**Done when:** titles and copy come from `why.json`; the map and clock use real data and correct local times; all four tiles share one hover language and each has its own detail; the entrance is one sweep; mobile plays each detail on entering view; the warm-to-cool dissolve is smooth.

---

## 8. Sectors

**Purpose.** The types of vessel the company serves, with the numbers behind them. The day reaches golden hour and the site returns to film.

**Transition in — a fade through white.** Why choose us gives way by **fading up through its own light tone**: the Sea Salt field brightens slightly and the content fades out, and the sectors scene fades in from that brightness, like a camera recovering from an overexposed frame. White into warm gold, with no hard edge. The navbar and cursor switch to dark theme as the film establishes.

**Layout.** A pinned, full-viewport scene. The background is a looping video of the open sea at golden hour, filmed low and close to the water. Over it, four vessel cutouts sit on the water, spread left to right with open water between them: container, cruise, tug, navy. Above each, a very large number with its label beneath.

```
┌──────────────────────────────────────────────────────────┐
│     1,240          320            180           60       │ ← huge numbers, sky
│     Commercial     Passenger      Tugs          Navy     │
│  ───────────────────── horizon ───────────────────────── │
│   [container]     [cruise]       [tug]        [navy]     │
│   ~ reflections ~                                        │
│            looping sea video, golden hour                │
└──────────────────────────────────────────────────────────┘
```

**The numbers.** Gambetta, very large (around 9vw), sitting in the clean sky above each vessel. Give them a **soft vertical gradient fill** — brighter at the top, fading toward the horizon — so they read as part of the light rather than text pasted on film, plus a gentle fade at their lower edge where they meet the horizon. Labels in Switzer beneath, with subtypes from `sectors.json` revealed on hover.

**The vessels.** Each cutout is positioned over the video where it belongs in the scene, and each **bobs continuously**: about 3px vertically and about 0.4 degrees of roll on a slow sine, each with its own speed and phase so they never move in unison. Three code-made details sell the float: a soft fade where hull meets water, a reflection beneath (a flipped, blurred, faded copy of the cutout), and a thin slowly breathing foam line at the waterline.

**Scroll choreography** (pinned for about 200% of viewport height):

| Scroll | What happens |
|---|---|
| 0–10% | The fade-in completes and the scene establishes |
| 10–60% | The four sectors arrive one at a time: each number counts up, its label rises, its vessel brightens slightly |
| 0–100% | The video layer scales slowly from 1.05 to 1.0 — a sense of drifting down over the water |
| 60–100% | The light warms: a golden-hour gradient overlay deepens from transparent to about 30% |

**Hover (the signature interaction).** Each vessel and its number form **one hover area**, so hovering either works:
- the vessel grows to about **1.12×** and lifts about 10px, its reflection spreading and fading so it appears to rise off the water;
- its number grows to about **1.08×**, moves up slightly and **brightens** — raise its gradient's luminance and add a faint Sonar Cyan or warm glow;
- its subtypes appear beneath the label;
- the other three vessels dim to about 60% and desaturate slightly, and their numbers fade back;
- the cursor ring carries the sector name.
Everything eases back over about 0.5s when the pointer leaves. Only one sector is ever focused.

**Content.** `src/content/sectors.json` — sector names, counts, subtypes.

**Assets.** `public/sectors/` — `plate.mp4` (the looping background) and the four cutouts. The video plays muted, looped, inline and autoplaying, pinned behind the vessels, paused when the section is off-screen or the tab is hidden. Map each cutout to its sector from a manifest or by filename, with `MediaPlaceholder` as the fallback. Vessel positions and sizes must be percentages of the scene so they stay correct at any size; take them from a manifest if one exists, otherwise place them to match the plate and document the values.

**Mobile.** The video stays as the background (or its poster frame under data-saver); the four sectors become a horizontally swipeable row of cards with scroll snap, the card in view behaving like the hovered state.

**Reduced motion.** A still frame of the plate, no bobbing, numbers at their final values.

**Transition out.** Into Network: the golden hour gives way to clear global daylight — the warm overlay drains, the scene brightens and dissolves into the Network section's Sea Salt field, and the globe begins to appear from the centre.

**Done when:** the plate loops with no visible seam; the vessels sit convincingly on the water with reflection, waterline fade and foam; bobbing never synchronises; numbers come from `sectors.json`, count up on scroll, and read clearly against the sky; hovering a vessel *or* its number grows both, brightens the number, reveals subtypes and dims the rest; the video pauses off-screen.

---

## 9. Network

**Purpose.** Where the company operates, and every country's contact details in one interactive view. The most technical section in the site: every part must stay in sync with every other.

**Theme.** Background **Sea Salt** (clear global daylight), text Deep Hull, `data-nav-theme="light"`. The globe itself is **dark**: a deep Deep Hull / Night Port sphere, with the land rendered as **light dots** (Sea Salt or Harbour Mist at moderate opacity) and the location pointers in the **theme colours** — Signal Blue for offices, Brass for coverage-only countries, Sonar Cyan for the arcs. A dark globe on a light field is the point: it becomes a solid object sitting in bright space, not a screen effect.

**Layout.** Split: globe left (about 55%), panel right (about 45%) with the heading, a search field, and an accordion of continents.

```
┌───────────────────────────────────┬────────────────────────────┐
│                                   │  Where we operate          │
│          .  · ··  ·               │  [ Search a country…    ]  │
│       ·  ·●···· ·  ·    ╭──────╮  │                            │
│      · ··· ·· ●· ·· ·   │ Egypt│  │  ▸ Asia             12     │
│      ·· ·· ··· ·· ·     │ Port │  │  ▾ Africa            6     │
│       ·  · ·· ·  ·      │ Said │  │      ● Egypt  (office)     │
│          · · ·          ╰──────╯  │      ○ Kenya               │
│         DARK GLOBE                │  ▸ Europe            9     │
│      (light dots, blue pins)      │  ▸ Americas          7     │
└───────────────────────────────────┴────────────────────────────┘
```

**Structure of the globe.** Three layers that read as one object:

| Layer | Treatment |
|---|---|
| Sphere | Dark, near-opaque, with a soft light atmosphere glow so it separates from the Sea Salt background. A blurred ellipse shadow beneath it (plain CSS) makes it sit in the space rather than float on it |
| Land | A field of light dots, no borders, no photographic Earth texture. Start with the built-in dotted-hex layer from the countries outlines; a custom twinkling dot layer is an optional later upgrade, not part of this build |
| Pointers and arcs | Office and coverage pointers, pulsing rings, and travelling arcs |

**Pointers.** Two clearly different kinds, driven by the data in `locations.json`:
- **Office** (a country with a physical address): a large Signal Blue pointer with a slow pulsing ring.
- **Coverage** (a country served without an office): a small Brass pointer.
Render pointers as HTML elements pinned to coordinates so they stay crisp and can be styled with CSS like the rest of the site. The selected country's outline lifts slightly off the sphere with a soft Signal Blue tint.

**Live arcs.** Arcs show something real: an office supplying a country it serves, plus a few between offices. About every 1.2s a new arc begins at an office and travels to one of its countries as a bright Sonar Cyan streak over roughly 2.5s, with a small ring pulsing where it lands, then fading. **At most six visible at once** — the globe should feel alive, never busy. Selecting a country plays its serving office's arc immediately and holds it highlighted while selected.

**One shared selection.** The globe and the panel both read and write a single piece of state (the selected country id). That is what keeps them in sync; never let either keep its own copy.

| The visitor does | What happens |
|---|---|
| Nothing | The globe rotates slowly on its own while arcs travel |
| Drags the globe | It rotates under the pointer with inertia; auto-rotate stops and resumes after about 8s of stillness if nothing is selected |
| Hovers a pointer | A small preview tooltip beside it: country name, and for offices the city and main phone. The pointer grows slightly, the cursor shows "View", auto-rotate pauses while hovering |
| Opens a continent | The accordion expands; office countries listed first with a filled dot, coverage countries after with a ring |
| Clicks a country in the list | The globe flies to it smoothly (about 1.2s, `--ease-in-out`) and the detail tooltip opens on its pointer |
| Clicks a pointer | The same selection: the matching continent opens, the list scrolls to that country, its row highlights, the detail tooltip opens |
| Types in search | The list filters instantly across all continents; Enter selects the first match |
| Clicks away or presses Escape | Selection clears, tooltip closes, auto-rotate resumes |

**Two tooltips**, both HTML elements pinned to the pointer's coordinates so they travel with the rotating globe. The **preview** (hover) is small: country name, plus city and phone for offices. The **detail** (selected) holds the full record from `locations.json`: city and office name, address, phone and email as tappable links, local time with an open / 24-7 badge, and a directions link. For a coverage country it states which office serves it ("Served by our Mumbai office") with that office's contact and a "Show office" button that flies the globe there.

**Build notes.** Read `docs/react-globe-gl.md` and `docs/stripe-globe.md` before starting. Create the renderer with **antialiasing off** and a transparent background. **Disable wheel zoom**, or scrolling the page over the globe will zoom it instead. Mount the globe only when the section approaches the viewport, pause rendering when off-screen or the tab is hidden, and cap pixel ratio at 2.

**The list is the accessible path**: it contains every piece of information the globe conveys, so keyboard and screen-reader users get the whole section. Mark the canvas as decorative. Accordion and search follow standard patterns.

**Entrance.** As the daylight arrives, the globe fades in at about 85% size while rotating a little faster, then settles to full size and its slow rotation. Pointers pop in with a quick stagger, offices first.

**Content.** `src/content/locations.json`. Follow its real structure; it is also the source for the Why choose us map and clock, the contact directory, and the footer.

**Mobile.** Globe on top (square, about 90% of screen width), panel below. The floating detail tooltip becomes a card that slides up from the bottom of the globe area instead, since pinned tooltips crowd small screens.

**Reduced motion.** No auto-rotate and no arc animation; selecting a country moves the camera in a single short step.

**Transition out.** Into Contact: the Sea Salt field darkens to Night Port as daylight gives way to night, and the contact video fades in out of the dark.

**Done when:** list and globe stay in sync in both directions every time; office and coverage pointers are clearly different; the globe is dark with light dots and theme-coloured pointers on a light field; hovering shows the preview and clicking opens the detail; tooltips travel with rotation; arcs follow real relationships and never exceed six; scrolling over the globe scrolls the page; search finds any country; everything is reachable without the globe.

---

## 10. Contact

**Purpose.** Turn interest into an enquiry, and close the day. Clean and structured: one video, one form, one row of details.

**Theme: night.** Night Port and Deep Hull, Sea Salt text, Sonar Cyan hairlines. `data-nav-theme="dark"`.

**Structure — three layers, each with one job:**

```
┌──────────────────────────────────────────────────────────────────────┐
│ quay │   SHIP (top-down)   │        dark harbour water                │
│      │                     │              ┌──────────────────────┐    │
│ Talk to us.                │              │ Send an enquiry      │    │
│ Replies within 2 hours,    │              │ Name                 │    │
│ day and night.             │              │ Company              │    │
│ ● Operations online · 21:40 Mumbai        │ Email      Phone     │    │
├────────────────────────────┴──────────────│ How can we help?     │    │
│ 24/7 operations   │ Email us        │ Head│ ⊕ Attach a file      │    │
│ +91 22 0000 0000  │ General  info@… │ Unit│ [ Send enquiry ]     │    │
│ [ WhatsApp us ]   │ Sales    sales@…│ Mumb└──────────────────────┘    │
│                   │ Ops      ops@…  │ Directions · See all offices    │
├──────────────────────────────────────────────────────────────────────┤
│ footer continues on the same Night Port background                   │
└──────────────────────────────────────────────────────────────────────┘
```

1. **The night port video** — full width, about 68% of viewport height, `object-fit: cover`, keeping the important content in the middle 70% of its height.
2. **The form card** — floating over the dark water on the right, overlapping the video's bottom edge by about 120px so it bridges the video and the band below.
3. **The details band** — below the video on Night Port, flowing straight into the footer.

**The heading** sits at the lower left of the video over a soft Night Port gradient: a short display line, one line of reassurance (response time), and a small live detail — a gently pulsing dot with "Operations online" and the head office's current local time from `site.json` / `locations.json`. That proves 24/7 rather than claiming it.

**The form card.** A **solid Sea Salt card** (24px radius, layered shadow), about 460px wide. Light, not glass: over moving video, glass makes inputs hard to read and competes with the footage. The card is the clear focus; the video supplies the mood around it.

Fields, in this order: **Name**, **Company**, **Email**, **Phone**, **How can we help?** (multiline), and an optional **attach a file** control. Email and phone may share a row. Labels above fields. Validation on blur and on submit: errors appear beneath the field they belong to and say how to fix it ("Enter an email like name@company.com"). The attachment control states accepted types and the size limit, shows the chosen file's name with a remove button, and is clearly optional.

If a store's "Request" button in Stores sent the visitor here, pre-fill the message with that store and focus the first empty field.

**Form handling.** Wire the form to a submit handler that can be pointed at a service (such as Web3Forms) later via a single config value. Until it is configured, the form must still validate, run its full submit sequence and show success — put the endpoint in one place so connecting it is a one-line change, and include a hidden honeypot field from the start. Beneath the form, offer the operations email as an alternative route for sending requisition lists.

**The details band.** Three columns divided by thin low-opacity Sonar Cyan hairlines, filling the space left of the card, all from `site.json`:

| Column | Content |
|---|---|
| 24/7 operations | The main operations number set large, plus a "WhatsApp us" button |
| Email us | General, sales and operations emails, each with a copy button (`CopyField`) |
| Head office | Address, "Get directions", and "See all offices" (opens the contact directory) |

**The signature: the ship leaves when the enquiry is sent.** Three videos in `public/contact/`:

| State | Video | Trigger |
|---|---|---|
| Docked | `contact1` — the initial loop: port operations continue | Default |
| Departing | `contact2` — the ship pulls away and sails out of frame | Plays after a **successful** submit, once the docked loop reaches the end of its current cycle |
| Departed | `contact3` — the empty berth, water and lights moving, on loop | When `contact2` ends |

**It must never cut mid-loop.** After a successful send, wait for `contact1` to finish its current cycle, then start `contact2`, so the departure begins from the same frame the loop ends on and reads as continuous. Safety valve: if the end of the loop is more than about 3s away, crossfade to `contact2` over about 0.4s instead, so nobody waits. Crossfade about 0.3s from `contact2` into `contact3`.

Implement with two stacked video elements: the docked loop plays without the native `loop` attribute and is restarted manually at each end (so you can intercept), `contact2` sits preloaded and paused beneath it, and `contact3` preloads while `contact2` plays. Use `requestVideoFrameCallback` where available to know how far the loop is from its end. Read all three paths from `src/content/` or resolve them by filename; do not hard-code durations — measure them.

**The button** runs its own sequence, independent of the video:

| State | Behaviour |
|---|---|
| Idle | "Send enquiry", Signal Blue |
| Pressed | Scales to 0.97 |
| Sending | The label slides up and out; the button narrows to a circle with a thin spinning Sea Salt ring |
| Sent | The ring closes into a check mark that draws itself (DrawSVG), then the button widens back to read "Enquiry sent" |
| Error | A small horizontal shake, back to "Send enquiry", with a clear message beneath and the operations email offered instead |

Beneath a sent button: one line confirming the response time, and a small "Send another enquiry" link that resets the form and crossfades the video from `contact3` back to `contact1` over about 0.8s, as if the next ship has come in. Announce success and errors to screen readers.

**Content.** `src/content/site.json`.

**Mobile.** Video band about 55% of screen height, cropped to keep the quay and ship in view, with the heading over it. The form card moves below the video as a full-width card, then the details as stacked rows. The departure still plays on a successful send.

**Reduced motion.** Poster frames instead of video; the departure becomes a crossfade from the docked poster to the empty-berth poster.

**Done when:** video, card and details band are all visible together on a 1440×900 screen with no awkward overlap; the ship departs only after a successful send and only at the end of a loop cycle (or via the short crossfade); there is no visible jump between the three videos; failure keeps the ship docked and explains why; all five fields plus the optional attachment validate correctly; the endpoint is configurable in one place; the button runs every state including error; "Send another enquiry" brings a ship back.

---

## 11. Footer

**Purpose.** A calm, complete close. Everything a visitor might still be looking for, easy to scan.

**Theme: dark.** It continues directly below the Contact details band on the same Night Port background, separated only by a thin low-opacity Sonar Cyan hairline — one continuous dark field, not a new section with its own edge. `data-nav-theme="dark"`.

**Layout.** The company wordmark large, a short line beneath it, then columns, then a bottom row.

```
┌──────────────────────────────────────────────────────────────────┐
│ ──────────────────────────────────────────────────────────────── │
│  COMPANY WORDMARK (large)                                        │
│  Ship supply and services, since 19XX.                           │
│                                                                  │
│  Explore        Stores            Contact          Follow        │
│  About          Provisions        info@…           LinkedIn      │
│  Stores         Engine stores     All offices                    │
│  Services       Deck stores                                      │
│  Sectors        …                                                │
│  Network                                                         │
│                                                                  │
│  © 2026 Company   Privacy   Terms                  Back to top   │
└──────────────────────────────────────────────────────────────────┘
```

**Behaviour.** Deliberately quiet. The only motion is a single entrance: the wordmark's letters rise into place once, the first time the footer appears. Links scroll smoothly to their sections, and store links also select that store's tab in Stores. "All offices" opens the contact directory. "Back to top" scrolls up with Lenis.

**No duplication.** Because the Contact details band sits immediately above with the phone numbers, emails and address, the footer's contact column keeps only the main email and "All offices". Repeating the same details twice in one dark field makes the page feel padded.

**Content.** `src/content/site.json` for the wordmark line, email and socials; `stores.json` for the store links; `locations.json` behind "All offices".

**Mobile.** Columns stack to two, then one; the wordmark scales down.

**Done when:** every link works, including store tab selection; all details come from the content files; nothing from the Contact band is repeated; the entrance plays once.

---

## G3. Floating contact button and contact directory (global)

**Purpose.** A way to reach the company from anywhere on the page, and every office's details in one organised place.

**Form.** A small **glassmorphism pill** fixed at the bottom right, about 56px tall, reading "Contact us" with a small icon — light glass on light sections, dark glass on dark ones, always with a solid fallback.

**Visibility follows context.** Hidden during the preloader and the hero (it would clutter the cinematic opening); appears after the hero with a small rise; hidden again while the Contact section is on screen (where it is redundant) and while the mobile menu or any modal is open.

**Opening.** The pill itself expands into the panel (Flip via the shared `Dialog`), so it is clear where the directory came from; closing reverses it back into the pill. On desktop the panel sits on the right (about 480px wide); on mobile it is a bottom sheet, draggable down to dismiss.

**Contents**, ordered most general to most specific:

```
┌──────────────────────────────┐
│ Contact directory         ✕  │
│ Main contacts                │
│  24/7 operations  +91 …  ⧉   │
│  General          info@… ⧉   │
│  [ WhatsApp us ]             │
│ By department                │
│  Sales · Operations · Accounts│
│ By country                   │
│ [ Search a country…       ]  │
│  ▸ Asia                      │
│  ▾ Africa                    │
│     Egypt, Port Said         │
│     Address…  +20 …  ⧉       │
│     [ Show on globe ]        │
└──────────────────────────────┘
```

Every phone number and email has a copy button (`CopyField`). Each office has a **"Show on globe"** button that closes the directory, scrolls to Network, and selects that country — through the same shared selection the globe uses. That single connection is what makes the site feel like one system rather than a stack of sections.

**Content.** `src/content/site.json` and `src/content/locations.json`.

**Done when:** the button appears and hides at the right moments; the pill morphs into the panel and back; the content comes entirely from the content files; "Show on globe" scrolls and selects correctly; focus trap, Escape, backdrop and browser back all close it; the internally scrolling list carries `data-lenis-prevent`.

---

# Part 3: Building it

## 3.1 Build order

Build in this order. It front-loads the hardest, most uncertain work, so problems surface early while they are cheap to fix, and it makes sure shared pieces exist before the sections that depend on them.

| # | What | Depends on |
|---|---|---|
| 1 | Tokens, fonts, one Lenis instance wired to ScrollTrigger, the `data-nav-theme` system, debug flags | — |
| 2 | Shared components: `Dialog`, `SectionHeading`, `Counter`, `MediaPlaceholder`, `CopyField`, reveal primitives | Tokens |
| 3 | Section stubs for all eleven sections with correct heights and background colours | Theme system |
| 4 | Navbar (without the logo journey) and the custom cursor | Theme system |
| 5 | **Hero** — the frame sequence engine, then the logo journey and the navbar's formation | Frames, `hero.json` |
| 6 | **Network** — the globe engine and the shared selection | `locations.json`, globe docs |
| 7 | **Contact** — the three-state video system and the form | Contact videos, `site.json` |
| 8 | Preloader | Real loading signals from the hero |
| 9 | About, Memberships | Content files |
| 10 | Stores, Services | Store images, service assets |
| 11 | Why choose us, Sectors | `why.json`, `sectors.json`, sector assets |
| 12 | Footer, floating button and contact directory | All content, `Dialog`, shared selection |
| 13 | Transitions pass: every section boundary, scrolled slowly in both directions | Everything |
| 14 | Responsive pass, then performance and accessibility pass | Everything |

Steps 5, 6 and 7 are the three technically risky pieces. Build each one in isolation first — on its own route or with the other sections stubbed — and only integrate it once it works on its own.

After every two or three sections, scroll the whole page top to bottom and back. **Transitions between sections are where problems hide**, especially around pinned sections.

## 3.2 Working method

For each section: read its spec in Part 2 and the library docs it needs; propose a plan (components, timeline structure, data flow) before writing code; build it; then check it against that section's "done when" list and report each item as passed or not. Keep each piece of work to one section, or one part of a large section — small changes produce better code and are easier to undo.

Report anything you had to decide that this document did not specify, anything in a content file that did not match what the spec assumed, and every placeholder you generated.

## 3.3 Responsive

Three targets, not two. Tablets are a real audience here — superintendents read on iPads.

| Target | Width | Approach |
|---|---|---|
| Desktop | ≥1280px | As specified in Part 2 |
| Tablet / iPad | 768–1279px | Keep the layouts but reduce scale and spacing; see below |
| Mobile | <768px | The mobile layout given in each section |

**Tablet specifics.** Split sections (Stores, Network, Contact) keep their two-panel layouts in landscape but may stack in portrait — decide per section by whether both halves stay legible at that width, and say which you chose. Hero and Sectors keep their pinned behaviour; the hero uses the desktop frames in landscape and the mobile frames in portrait. Tiles in Why choose us go to a two-column grid. Reduce display type a step; keep the whitespace generous.

**Everywhere:**
- Use `gsap.matchMedia()` for breakpoint variants so animations are created and cleaned up per breakpoint, not left running for the wrong layout.
- Use `dvh` units rather than `vh` for full-height sections, so mobile browser chrome does not cause jumps.
- Touch targets at least 44px.
- No hover-only information anywhere: every hover reveal has a touch equivalent (tap, swipe, or plays automatically on entering view, as specified per section).
- The custom cursor does not render on touch devices.
- Test orientation changes: rotating a device must not break pinning. Call `ScrollTrigger.refresh()` on orientation change.

## 3.4 Performance

The media in this site is heavy, so this is not an afterthought.

- **Load order.** The preloader waits only for what the first view needs (fonts, hero loop, first frame, sparse frames). Everything else loads after the site opens. Lazy-mount the globe, the sectors video and the contact videos only as their sections approach.
- **Progressive frames.** Load the hero sequence sparsely first, then fill in; draw the nearest loaded frame if the exact one has not arrived.
- **Pause everything off-screen.** Video, canvas drawing, globe rendering, autoplay timers, bobbing loops — all stopped by IntersectionObserver and on `visibilitychange`.
- **Images.** `aspect-ratio` or explicit dimensions on every image to prevent layout shift. `fetchpriority="high"` and a preload for the hero's first frame; `loading="lazy"` below the fold. AVIF or WebP with fallbacks.
- **Video.** Always `muted autoplay loop playsinline` with a `poster`; `preload="metadata"` for anything not immediately visible.
- **Canvas and WebGL.** Pixel ratio capped at 2; antialiasing off on the globe; textures no larger than needed.
- **Never animate** layout properties, `filter` on large elements, or `backdrop-filter`.

Target good Core Web Vitals, and test on a **mid-range Android phone**, not only a laptop or an iPhone. A site that is smooth on a developer machine can be unusable on a typical phone.

## 3.5 Accessibility

- Text contrast at least 4.5:1 everywhere, including over film and video — check the actual frames behind the text, not just the gradient.
- Sonar Cyan is never used for text on light backgrounds.
- One `h1` (the hero title), then a correct heading order down the page.
- Everything reachable and operable by keyboard: tabs (arrow keys), accordions, the wheel picker (up and down arrows), modals (focus trap, Escape), the globe's list as the accessible path to all its information.
- Focus rings always visible: 2px Deep Teal on light sections, Sonar Cyan on dark, 3px offset. Never removed, and never replaced by the custom cursor as the only indicator.
- Alt text on meaningful images; decorative canvases marked as such.
- Live regions for form success and errors, and for the stores carousel's change of panel.
- Autoplay (stores carousel, memberships wheel) pauses on interaction and never moves focus.
- Honour `prefers-reduced-motion` with the calm variant specified in each section: no pinning or scrubbing, no bobbing, no auto-rotation, counters at final values, crossfades instead of sequences. The site must remain fully usable and complete, not degraded.

## 3.6 Debug and conventions

- `?debug` shows ScrollTrigger markers; `?skipPreloader` skips the preloader. Keep both working — they will be used constantly.
- Section components live in `src/sections/[Name]/`, shared components in `src/components/`, engines in `src/engines/`, helpers in `src/lib/`, tokens and globals in `src/styles/`.
- Name things after what they are in this document (Stores, Sectors, Network, Services), so the code and the spec stay readable together.
- Keep asset resolution (store id → image path, sector id → cutout path) in small helpers rather than scattered across components, so swapping in production assets is a single change.

## 3.7 What "done" means for the whole site

Beyond each section's own checklist:

- [ ] The page scrolls smoothly top to bottom and back, with no jump, hitch or flash at any section boundary
- [ ] The light genuinely reads as one day: morning white → below deck dark → warm drawing office → cool daylight → golden hour → clear daylight → night
- [ ] Each loud section has exactly one signature moment, and the quiet sections stay quiet
- [ ] No text is hard-coded; changing a value in a content file changes it everywhere it appears
- [ ] No asset dimension, frame count or duration is hard-coded; production assets can be dropped in without code changes
- [ ] Every placeholder looks deliberate and on-brand, and is listed in your report
- [ ] The navbar progress line, the audio toggle and the adaptive cursor all work across every section
- [ ] Nothing animates off-screen; nothing animates in a hidden tab
- [ ] Keyboard-only navigation reaches every piece of information in the site
- [ ] The reduced-motion version is complete and calm, not broken
- [ ] It is smooth on a mid-range Android phone and correct on an iPad in both orientations