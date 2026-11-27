import { useEffect, useRef, useState, type ReactNode, type PointerEvent } from 'react';
import { GlobeHemisphereWest, ChatCircleDots } from '@phosphor-icons/react';
import { gsap, ScrollTrigger, useGSAP, MOTION } from '../../lib/scroll';
import { scrollToLocations } from '../../lib/lenis';
import { useAppStore } from '../../lib/store';
import { FrameSequence, type FrameSequenceHandle } from '../../engines/FrameSequence';
import heroData from '../../content/hero.json';
import certificatesData from '../../content/certificates.json';
import siteData from '../../content/site.json';

interface BentoTiltTileProps {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
  isImageTile?: boolean;
}

function BentoTiltTile({
  children,
  className = '',
  maxTilt = 4,
  isImageTile = false,
}: BentoTiltTileProps) {
  const tileRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const el = tileRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const px = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    const py = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1);

    const relX = px * 2 - 1;
    const relY = py * 2 - 1;

    const rotateX = -relY * maxTilt;
    const rotateY = relX * maxTilt;
    const shadowX = -relX * 14;
    const shadowY = 24 - relY * 10;

    gsap.to(el, {
      rotateX,
      rotateY,
      scale: 1.014,
      y: -4,
      transformPerspective: 1100,
      boxShadow: `${shadowX.toFixed(1)}px ${shadowY.toFixed(1)}px 48px -10px rgba(8, 20, 32, 0.25), 0 12px 24px -6px rgba(14, 34, 51, 0.12)`,
      duration: 0.35,
      ease: 'power2.out',
      overwrite: 'auto',
    });

    if (glareRef.current) {
      const pctX = (px * 100).toFixed(1);
      const pctY = (py * 100).toFixed(1);
      glareRef.current.style.background = isImageTile
        ? `radial-gradient(520px circle at ${pctX}% ${pctY}%, rgba(255, 255, 255, 0.16), transparent 62%)`
        : `radial-gradient(380px circle at ${pctX}% ${pctY}%, rgba(255, 255, 255, 0.9), rgba(224, 242, 254, 0.22) 42%, transparent 72%)`;
      gsap.to(glareRef.current, {
        autoAlpha: 1,
        duration: 0.25,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }
  };

  const handlePointerLeave = () => {
    const el = tileRef.current;
    if (el) {
      gsap.to(el, {
        rotateX: 0,
        rotateY: 0,
        scale: 1,
        y: 0,
        transformPerspective: 1100,
        boxShadow:
          '0 20px 40px -12px rgba(8, 20, 32, 0.15), 0 6px 16px -4px rgba(14, 34, 51, 0.07)',
        duration: 0.55,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    }
    if (glareRef.current) {
      gsap.to(glareRef.current, {
        autoAlpha: 0,
        duration: 0.4,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }
  };

  return (
    <div
      ref={tileRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{
        transformStyle: 'preserve-3d',
        boxShadow:
          '0 20px 40px -12px rgba(8, 20, 32, 0.15), 0 6px 16px -4px rgba(14, 34, 51, 0.07)',
      }}
      className={`will-change-transform ${className}`}
    >
      {children}
      <div
        ref={glareRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-30 opacity-0 mix-blend-soft-light"
      />
    </div>
  );
}

/**
 * Section 2: Hero
 * - Full viewport, pinned for ~475% of viewport height; all overlay elements driven by one scrubbed timeline.
 * - Idle loop video plays at scroll 0, crossfading on scroll into the scrubbed frame sequence.
 * - True Single Continuous Logo Journey:
 *   - The single `#navbar-logo-slot` starts at `#hero-logo-anchor` scaled large (h-20 to h-32).
 *   - As you scroll down (0 -> 25%), it smoothly glides towards the top-left Navbar position,
 *     decreasing its scale continuously, and docks firmly into the Navbar slot.
 *   - No premature fade-away and no separate fading logos: one continuous physical element.
 * - Centered vertically & left-aligned horizontally.
 * - Shortened "SCROLL TO EXPLORE" with extended golden gradient rule.
 * - Integrated Heading & Subheading lockup in Marcellus and DM Sans.
 * - Sized buttons matching the membership logos card width.
 * - Solid white background card for membership logos.
 */
export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const frameEngineRef = useRef<FrameSequenceHandle>(null);

  const heroLogoAnchorRef = useRef<HTMLDivElement>(null);
  const titleLockupRef = useRef<HTMLDivElement>(null);
  const buttonsRowRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const scrollCueRef = useRef<HTMLDivElement>(null);
  const bgContainerRef = useRef<HTMLDivElement>(null);

  // Apple-style Bento Grid Showcase Refs
  const bentoGridRef = useRef<HTMLDivElement>(null);
  const carouselImg2Ref = useRef<HTMLDivElement>(null);
  const carouselImg3Ref = useRef<HTMLDivElement>(null);
  const stageTag1Ref = useRef<HTMLDivElement>(null);
  const stageTag2Ref = useRef<HTMLDivElement>(null);
  const stageTag3Ref = useRef<HTMLDivElement>(null);
  const contentPara1Ref = useRef<HTMLDivElement>(null);
  const contentPara2Ref = useRef<HTMLDivElement>(null);
  const contentPara3Ref = useRef<HTMLDivElement>(null);
  const progBar1Ref = useRef<HTMLDivElement>(null);
  const progBar2Ref = useRef<HTMLDivElement>(null);
  const progBar3Ref = useRef<HTMLDivElement>(null);
  const seaSaltVeilRef = useRef<HTMLDivElement>(null);

  const [failedLogos, setFailedLogos] = useState<Record<string, boolean>>({});
  const setHeroPinned = useAppStore((s) => s.setHeroPinned);

  const hero = heroData?.hero_section;
  const media = hero?.media;
  const pillLogos = hero?.pill_logos ?? [];
  const fallbackMemberships = certificatesData?.memberships ?? [];

  // Build pill items from hero.json pill_logos (or certificates.json fallback)
  const pillItems =
    pillLogos.length > 0
      ? pillLogos
      : fallbackMemberships.slice(0, 5).map((name) => ({ name, logo: '' }));

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      const mm = gsap.matchMedia();

      mm.add(
        {
          canAnimate: '(prefers-reduced-motion: no-preference)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const { reduceMotion } = context.conditions ?? {};

          const navLogoSlot = document.getElementById('navbar-logo-slot');
          const navbarBgLayer = document.getElementById('navbar-bg-layer');

          if (reduceMotion) {
            setHeroPinned(false);
            frameEngineRef.current?.setProgress(0);
            if (navLogoSlot) {
              gsap.set(navLogoSlot, { clearProps: 'transform,transformOrigin' });
            }
            if (navbarBgLayer) {
              gsap.set(navbarBgLayer, { autoAlpha: 1 });
            }
            if (bentoGridRef.current) {
              gsap.set(bentoGridRef.current, { autoAlpha: 1, yPercent: 0 });
            }
            return;
          }

          // Compute delta and scale for the single traveling logo journey
          let cachedLogoJourney: { x: number; y: number; scale: number } | null = null;
          const computeLogoJourney = (force = false) => {
            if (cachedLogoJourney && !force) return cachedLogoJourney;
            const navSlot = document.getElementById('navbar-logo-slot');
            const anchor = heroLogoAnchorRef.current;
            if (!navSlot || !anchor) return { x: 0, y: 0, scale: 1 };

            // Temporarily reset transform to get true untransformed layout bounding boxes
            const savedTransform = navSlot.style.transform;
            navSlot.style.transform = 'none';
            const navRect = navSlot.getBoundingClientRect();
            const anchorRect = anchor.getBoundingClientRect();
            navSlot.style.transform = savedTransform;

            const navHeight = navRect.height || (window.innerWidth >= 768 ? 40 : 36);
            const anchorHeight =
              anchorRect.height ||
              (window.innerWidth >= 1280
                ? 120
                : window.innerWidth >= 1024
                ? 110
                : window.innerWidth >= 768
                ? 96
                : 72);

            const scale = anchorHeight / navHeight;
            const x = anchorRect.left - navRect.left;
            const y = anchorRect.top - navRect.top;

            cachedLogoJourney = { x, y, scale };
            return cachedLogoJourney;
          };

          // Initial position for the single traveling logo at the Hero anchor (scaled large)
          if (navLogoSlot && heroLogoAnchorRef.current) {
            const initialLogo = computeLogoJourney(true);
            gsap.set(navLogoSlot, {
              transformOrigin: 'left top',
              x: initialLogo.x,
              y: initialLogo.y,
              scale: initialLogo.scale,
              autoAlpha: 1,
            });
          }

          // Initial state for navbar background layer & progress bar during initial Hero state
          if (navbarBgLayer) {
            gsap.set(navbarBgLayer, { autoAlpha: 0 });
          }
          const initialProgressTrack = document.querySelector('[data-nav-progress]');
          if (initialProgressTrack) {
            gsap.set(initialProgressTrack, { autoAlpha: 0 });
          }

          // Entrance animation as preloader completes
          const playHeroEntrance = () => {
            const tlEntrance = gsap.timeline({ defaults: { ease: MOTION.easeOut } });
            if (navLogoSlot) {
              tlEntrance.to(
                navLogoSlot,
                { autoAlpha: 1, duration: 0.8 },
                0
              );
            }
            if (scrollCueRef.current) {
              tlEntrance.fromTo(
                scrollCueRef.current,
                { autoAlpha: 0, y: 12 },
                { autoAlpha: 1, y: 0, duration: 0.8 },
                0.1
              );
            }
            if (titleLockupRef.current) {
              tlEntrance.fromTo(
                titleLockupRef.current,
                { autoAlpha: 0, y: 20 },
                { autoAlpha: 1, y: 0, duration: 0.9 },
                0.2
              );
            }
            if (buttonsRowRef.current) {
              tlEntrance.fromTo(
                buttonsRowRef.current,
                { autoAlpha: 0 },
                { autoAlpha: 1, duration: 0.8 },
                0.35
              );
            }
            if (pillRef.current) {
              tlEntrance.fromTo(
                pillRef.current,
                { autoAlpha: 0, y: 16 },
                { autoAlpha: 1, y: 0, duration: 0.8 },
                0.45
              );
            }
          };

          if (useAppStore.getState().isPreloaded) {
            playHeroEntrance();
          } else {
            const unsub = useAppStore.subscribe((state, prevState) => {
              if (state.isPreloaded && !prevState.isPreloaded) {
                unsub();
                playHeroEntrance();
              }
            });
            context.add(() => unsub());
          }

          // Resize handler to recalculate coordinates cleanly
          const handleResize = () => {
            computeLogoJourney(true);
            ScrollTrigger.refresh();
          };
          window.addEventListener('resize', handleResize);
          context.add(() => window.removeEventListener('resize', handleResize));

          // Master scrubbed timeline across 0 -> 100 units (pinned for 475% viewport height)
          const frameProxy = { progress: 0 };

          const tl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: section,
              start: 'top top',
              end: '+=580%',
              pin: true,
              scrub: MOTION.scrub,
              invalidateOnRefresh: true,
              onRefreshInit: () => {
                cachedLogoJourney = null;
                if (navLogoSlot) {
                  gsap.set(navLogoSlot, { x: 0, y: 0, scale: 1 });
                }
                if (progBar1Ref.current) gsap.set(progBar1Ref.current, { backgroundColor: '#0284c7' });
                if (progBar2Ref.current) gsap.set(progBar2Ref.current, { backgroundColor: '#e2e8f0' });
                if (progBar3Ref.current) gsap.set(progBar3Ref.current, { backgroundColor: '#e2e8f0' });
              },
              onUpdate: (self) => {
                // Intro is active while main logo travels to navbar (0 -> ~32%)
                const isIntro = self.progress < 0.32;
                setHeroPinned(isIntro);

                // As soon as this About Us grid appears, activate the 'about' navlink immediately
                if (self.progress >= 0.32) {
                  if (useAppStore.getState().activeSection !== 'about') {
                    useAppStore.getState().setActiveSection('about');
                  }
                } else {
                  if (useAppStore.getState().activeSection !== 'hero') {
                    useAppStore.getState().setActiveSection('hero');
                  }
                }
              },
              onLeave: () => {
                setHeroPinned(false);
                useAppStore.getState().setActiveSection('about');
              },
              onEnterBack: () => {
                setHeroPinned(false);
                useAppStore.getState().setActiveSection('about');
              },
            },
          });

          if (scrollCueRef.current) {
            tl.fromTo(
              scrollCueRef.current,
              { autoAlpha: 1 },
              { autoAlpha: 0, duration: 8, ease: 'power1.out' },
              18
            );
          }

          // 0 -> 95: Scrub frame sequence from first frame to final sunlit aqua frame
          tl.to(
            frameProxy,
            {
              progress: 1,
              duration: 95,
              onUpdate: () => {
                frameEngineRef.current?.setProgress(frameProxy.progress);
              },
            },
            0
          );

          // 0 -> 32%: Single logo continuous journey from Hero anchor into docked Navbar slot
          if (navLogoSlot && heroLogoAnchorRef.current) {
            tl.fromTo(
              navLogoSlot,
              {
                x: () => computeLogoJourney().x,
                y: () => computeLogoJourney().y,
                scale: () => computeLogoJourney().scale,
                autoAlpha: 1,
              },
              {
                x: 0,
                y: 0,
                scale: 1,
                duration: 32,
                ease: 'power1.inOut',
                immediateRender: true,
              },
              0
            );
          }

          // 24 -> 36%: Navbar background & progress bar slowly form after logo docks
          if (navbarBgLayer) {
            tl.fromTo(
              navbarBgLayer,
              { autoAlpha: 0 },
              { autoAlpha: 1, duration: 12, ease: 'power1.out' },
              24
            );
          }

          const progressTrack = document.querySelector('[data-nav-progress]');
          if (progressTrack) {
            tl.fromTo(
              progressTrack,
              { autoAlpha: 0 },
              { autoAlpha: 1, duration: 12, ease: 'power1.out' },
              24
            );
          }

          // 0 -> 18%: Hero copy and badges fade out gently and drift slightly upward
          const heroContentGroup = [
            titleLockupRef.current,
            buttonsRowRef.current,
            pillRef.current,
          ].filter(Boolean);

          if (heroContentGroup.length > 0) {
            tl.to(
              heroContentGroup,
              {
                autoAlpha: 0,
                y: -28,
                stagger: 0.8,
                duration: 18,
                ease: 'power1.out',
              },
              0
            );
          }

          // Initial state of progress indicators
          if (progBar1Ref.current) tl.set(progBar1Ref.current, { backgroundColor: '#0284c7' }, 0);
          if (progBar2Ref.current) tl.set(progBar2Ref.current, { backgroundColor: '#e2e8f0' }, 0);
          if (progBar3Ref.current) tl.set(progBar3Ref.current, { backgroundColor: '#e2e8f0' }, 0);

          // 32 -> 38%: Apple-style Bento Grid enters from bottom and fixes cleanly in center
          if (bentoGridRef.current) {
            tl.fromTo(
              bentoGridRef.current,
              { autoAlpha: 0, yPercent: 110 },
              { autoAlpha: 1, yPercent: 0, duration: 6, ease: 'power2.out' },
              32
            );
          }

          // 38 -> 52%: Stage 1 holds (Part 1 + Image 1) in view

          // 52 -> 60%: Fade in Image 2 (crossfade)
          if (carouselImg2Ref.current) {
            tl.fromTo(
              carouselImg2Ref.current,
              { autoAlpha: 0 },
              { autoAlpha: 1, duration: 8, ease: 'power1.inOut' },
              52
            );
          }
          if (contentPara1Ref.current && contentPara2Ref.current) {
            tl.to(
              contentPara1Ref.current,
              { autoAlpha: 0, y: -16, duration: 4, ease: 'power2.in' },
              52
            ).fromTo(
              contentPara2Ref.current,
              { autoAlpha: 0, y: 16 },
              { autoAlpha: 1, y: 0, duration: 5, ease: 'power2.out' },
              56
            );
          }
          if (stageTag1Ref.current && stageTag2Ref.current) {
            tl.to(stageTag1Ref.current, { autoAlpha: 0, y: -10, duration: 4 }, 52)
              .fromTo(stageTag2Ref.current, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 5 }, 56);
          }
          if (progBar1Ref.current && progBar2Ref.current) {
            tl.to(progBar1Ref.current, { backgroundColor: '#e2e8f0', duration: 4 }, 52)
              .to(progBar2Ref.current, { backgroundColor: '#0284c7', duration: 4 }, 55);
          }

          // 62 -> 74%: Stage 2 holds (Part 2 + Image 2) in view

          // 74 -> 82%: Fade in Image 3 (crossfade)
          if (carouselImg3Ref.current) {
            tl.fromTo(
              carouselImg3Ref.current,
              { autoAlpha: 0 },
              { autoAlpha: 1, duration: 8, ease: 'power1.inOut' },
              74
            );
          }
          if (contentPara2Ref.current && contentPara3Ref.current) {
            tl.to(
              contentPara2Ref.current,
              { autoAlpha: 0, y: -16, duration: 4, ease: 'power2.in' },
              74
            ).fromTo(
              contentPara3Ref.current,
              { autoAlpha: 0, y: 16 },
              { autoAlpha: 1, y: 0, duration: 5, ease: 'power2.out' },
              78
            );
          }
          if (stageTag2Ref.current && stageTag3Ref.current) {
            tl.to(stageTag2Ref.current, { autoAlpha: 0, y: -10, duration: 4 }, 74)
              .fromTo(stageTag3Ref.current, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 5 }, 78);
          }
          if (progBar2Ref.current && progBar3Ref.current) {
            tl.to(progBar2Ref.current, { backgroundColor: '#e2e8f0', duration: 4 }, 74)
              .to(progBar3Ref.current, { backgroundColor: '#0284c7', duration: 4 }, 77);
          }

          // 75 -> 95%: Smooth continuous crossfade from background video/sequence to Sea Salt light background
          if (seaSaltVeilRef.current && bgContainerRef.current) {
            tl.fromTo(
              seaSaltVeilRef.current,
              { autoAlpha: 0 },
              { autoAlpha: 1, duration: 20, ease: 'power1.inOut' },
              75
            ).to(
              bgContainerRef.current,
              { autoAlpha: 0, duration: 20, ease: 'power1.inOut' },
              75
            );
          }

          // 84 -> 96%: Stage 3 holds (Part 3 + Image 3) in view while the background dissolves to pure white

          // 96 -> 101%: Grid stays till background dissolves to white, then cleanly slides up and unfixes
          if (bentoGridRef.current) {
            tl.to(
              bentoGridRef.current,
              { autoAlpha: 0, yPercent: -110, duration: 5, ease: 'power2.in' },
              96
            );
          }

          return () => {
            if (navLogoSlot) {
              gsap.set(navLogoSlot, { clearProps: 'transform,transformOrigin' });
            }
            if (navbarBgLayer) {
              gsap.set(navbarBgLayer, { clearProps: 'autoAlpha' });
            }
            if (bentoGridRef.current) {
              gsap.set(bentoGridRef.current, { clearProps: 'all' });
            }
            if (carouselImg2Ref.current) {
              gsap.set(carouselImg2Ref.current, { clearProps: 'opacity,visibility' });
            }
            if (carouselImg3Ref.current) {
              gsap.set(carouselImg3Ref.current, { clearProps: 'opacity,visibility' });
            }
            if (progBar1Ref.current) {
              gsap.set(progBar1Ref.current, { clearProps: 'backgroundColor' });
            }
            if (progBar2Ref.current) {
              gsap.set(progBar2Ref.current, { clearProps: 'backgroundColor' });
            }
            if (progBar3Ref.current) {
              gsap.set(progBar3Ref.current, { clearProps: 'backgroundColor' });
            }
          };
        }
      );

      return () => mm.revert();
    },
    { scope: sectionRef }
  );

  // Refresh ScrollTrigger when images in the pill load
  useEffect(() => {
    ScrollTrigger.refresh();
  }, []);

  return (
    <section
      id="hero"
      ref={sectionRef}
      data-nav-theme="light"
      className="relative h-[100dvh] w-full overflow-hidden bg-deep-hull text-white select-none"
    >
      {/* Layer 1: Full-Viewport Frame Sequence & Idle Video Loop */}
      <div ref={bgContainerRef} className="absolute inset-0 z-0 bg-deep-hull">
        <FrameSequence
          ref={frameEngineRef}
          desktopDir={media?.desktop_frames_dir ?? '/frames/hero/desktop'}
          mobileDir={media?.mobile_frames_dir ?? '/frames/hero/mobile'}
          frameCount={media?.frame_count ?? 170}
          framePad={media?.frame_pad ?? 4}
          frameExt={media?.frame_ext ?? 'webp'}
          idleVideoUrl={media?.idle_video ?? '/hero/C0.mp4'}
          posterUrl={media?.poster ?? '/frames/hero/desktop/0001.webp'}
        />
      </div>

      {/* Layer 2: Primary Hero Content — Centered vertically in viewport, aligned on the left with balanced breathing room */}
      <div className="relative z-10 flex h-full w-full max-w-7xl flex-col justify-center items-start pl-8 sm:pl-14 md:pl-20 lg:pl-24 xl:pl-32 pr-6 sm:pr-10 md:pr-12 lg:pr-16 text-left">
        <div className="flex flex-col items-start text-left max-w-3xl">
          {/* Brand Logo Anchor: Defines slightly smaller starting size for the single traveling logo.
              The #navbar-logo-slot element begins here, and glides into the Navbar on scroll. */}
          <div
            id="hero-logo-anchor"
            ref={heroLogoAnchorRef}
            aria-hidden="true"
            className="mb-5 sm:mb-6 h-16 sm:h-20 md:h-24 lg:h-28 xl:h-30 w-auto max-w-[260px] sm:max-w-[320px] md:max-w-[360px] lg:max-w-[400px] pointer-events-none select-none"
          />

          {/* Integrated Heading & Subheading Lockup (as in inspiration reference), left-aligned */}
          <div
            ref={titleLockupRef}
            className="inline-flex flex-col items-start select-text text-left max-w-[94vw] sm:max-w-none"
          >
            <h1 className="sr-only">Worldwide Ship Supplies & Services</h1>

            {/* Line 1: Worldwide */}
            <div
              aria-hidden="true"
              className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-normal leading-[1.05] tracking-tight text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.65)]"
            >
              Worldwide
            </div>

            {/* Line 2: Ship + Subheading nested right next to it */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-5 md:gap-6 my-1 sm:my-2">
              <span
                aria-hidden="true"
                className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-normal leading-[1.05] tracking-tight text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.65)] shrink-0"
              >
                Ship
              </span>
              <p className="max-w-[280px] sm:max-w-[340px] md:max-w-[380px] lg:max-w-[420px] font-sans text-xs sm:text-sm md:text-sm lg:text-[15px] font-normal leading-snug text-white/95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]">
                {hero?.subtitle ??
                  'Determined to serve your vessels with Complete Ship Store requirements across every Major & Minor Ports, Globally.'}
              </p>
            </div>

            {/* Line 3: Supplies & Services */}
            <div
              aria-hidden="true"
              className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-normal leading-[1.05] tracking-tight text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.65)]"
            >
              Supplies & Services
            </div>
          </div>

          {/* Action Buttons Row: Explore Our Locations (Blue Gradient) & Contact Us */}
          <div
            ref={buttonsRowRef}
            className="mt-6 sm:mt-8 flex flex-nowrap items-center justify-start gap-3 sm:gap-3.5"
          >
            {/* Button 1: Theme Blue Gradient Button */}
            <button
              id="hero-explore-btn"
              type="button"
              onClick={scrollToLocations}
              className="group relative flex h-[42px] items-center gap-2 sm:gap-2.5 rounded-full px-4 sm:px-4.5 font-sans text-xs sm:text-[13px] font-bold tracking-wide transition-all duration-300 shadow-[0_4px_24px_rgba(11,94,142,0.45)] bg-gradient-to-r from-[#005268] via-[#0B5E8E] to-[#03C5EC] text-white border border-[#03C5EC]/60 hover:bg-none hover:bg-transparent hover:border-[#03C5EC] hover:shadow-[0_0_24px_rgba(3,197,236,0.6)] cursor-pointer shrink-0"
            >
              <span>Explore Our Locations</span>
              <GlobeHemisphereWest
                size={16}
                weight="bold"
                className="transition-transform duration-300 group-hover:rotate-12"
              />
            </button>

            {/* Button 2: Contact Us Button */}
            <button
              type="button"
              onClick={() => useAppStore.getState().setActiveDialog('directory')}
              aria-haspopup="dialog"
              className="group flex h-[42px] items-center gap-2 rounded-full px-4 sm:px-4.5 font-sans text-xs sm:text-[13px] font-semibold tracking-wide border border-white/40 bg-white/15 hover:bg-white/25 text-white backdrop-blur-md transition-all duration-300 shadow-md cursor-pointer shrink-0"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[#F3E5AB]">
                <ChatCircleDots size={14} weight="duotone" />
              </span>
              <span>Contact Us</span>
            </button>
          </div>

          {/* Memberships Logos below the buttons: Crisp solid white background, tight spacing & balanced sizes */}
          {pillItems.length > 0 && (
            <div
              ref={pillRef}
              className="mt-4 sm:mt-5 inline-flex flex-nowrap items-center justify-start gap-1.5 sm:gap-2 md:gap-2.5 rounded-2xl bg-white shadow-xl border border-white px-4 sm:px-5 py-2 sm:py-2.5"
            >
              {pillItems.map((item) => {
                const showTextFallback = !item.logo || failedLogos[item.name];
                const isShipServe = item.name.toLowerCase().includes('ship') || (item.logo && item.logo.includes('Ship-Serve'));
                return (
                  <span key={item.name} className="inline-flex items-center shrink-0 px-0.5">
                    {showTextFallback ? (
                      <span className="font-sans text-xs sm:text-sm font-semibold tracking-wide text-deep-hull whitespace-nowrap">
                        {item.name}
                      </span>
                    ) : (
                      <img
                        src={item.logo}
                        alt={item.name}
                        onError={() =>
                          setFailedLogos((prev) => ({ ...prev, [item.name]: true }))
                        }
                        className={isShipServe ? "h-7 sm:h-8 md:h-9 w-auto object-contain filter drop-shadow-sm" : "h-9 sm:h-10 md:h-11 lg:h-12 w-auto object-contain filter drop-shadow-sm"}
                      />
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Center-Bottom Simplistic Scroll Indicator with Proper Line Animation */}
      <div
        ref={scrollCueRef}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 text-white/80 pointer-events-none select-none"
      >
        <span className="font-sans text-[10px] sm:text-[11px] font-semibold tracking-[0.24em] uppercase text-white/90">
          Scroll to Explore
        </span>
        <div className="w-[1.5px] h-7 bg-white/20 overflow-hidden relative rounded-full">
          <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-transparent via-white to-transparent animate-[scrollLine_2s_cubic-bezier(0.77,0,0.175,1)_infinite]" />
        </div>
      </div>

      {/* Layer 3: Apple-Style Bento Grid Showcase (34–92% scroll) */}
      <div
        ref={bentoGridRef}
        aria-label="About Us and Marine Supply Showcase"
        className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center p-3 sm:p-5 md:p-6 pt-16 sm:pt-20 md:pt-24 pb-6 sm:pb-8 opacity-0"
      >
        <div className="w-[78vw] max-w-5xl h-[72vh] max-h-[600px] min-h-[420px] flex flex-row gap-3.5 sm:gap-4.5 md:gap-5 mt-4 sm:mt-6">
          {/* Tile 1: Left Image Carousel (60% width, 100% height) */}
          <BentoTiltTile
            isImageTile
            maxTilt={3}
            className="relative w-[60%] h-full rounded-2xl md:rounded-3xl overflow-hidden bg-white flex flex-col justify-end"
          >
            {/* Image 1 (Base): Provisions & Ship Stores */}
            <img
              src="/hero/chandlery_provisions.jpg"
              alt="Ship provisions and vessel stores loading"
              className="absolute inset-0 w-full h-full object-cover select-none"
            />

            {/* Image 2 (Fade Crossfade): Technical & Deck Stores */}
            <div
              ref={carouselImg2Ref}
              className="absolute inset-0 w-full h-full overflow-hidden opacity-0"
            >
              <img
                src="/hero/chandlery_technical.jpg"
                alt="Technical ship chandlery and deck equipment"
                className="w-full h-full object-cover select-none"
              />
            </div>

            {/* Image 3 (Fade Crossfade): Modern Port Warehouse */}
            <div
              ref={carouselImg3Ref}
              className="absolute inset-0 w-full h-full overflow-hidden opacity-0"
            >
              <img
                src="/hero/chandlery_warehouse.jpg"
                alt="Global port warehouse maritime logistics"
                className="w-full h-full object-cover select-none"
              />
            </div>

            {/* Subtle top gradient vignette */}
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-slate-950/40 via-slate-950/10 to-transparent pointer-events-none" />

            {/* Image Tile Bottom Overlay Text */}
            <div className="relative z-10 w-full p-4 sm:p-6 md:p-8 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent pt-16 text-white">
              <h3 className="font-display text-lg sm:text-2xl md:text-[28px] lg:text-[32px] font-medium tracking-tight leading-[1.2] text-white drop-shadow-md">
                One stop Ship Chandlers; At a Global level
              </h3>
            </div>
          </BentoTiltTile>

          {/* Right Column (40% width, 100% height): 2 tiles stacked */}
          <div className="w-[40%] h-full flex flex-col gap-3 sm:gap-4 md:gap-5">
            {/* Tile 2 (Top, 50% height - Fixed): Section Title & Subtitle */}
            <BentoTiltTile
              maxTilt={4.5}
              className="relative flex-1 h-1/2 rounded-2xl md:rounded-3xl bg-white p-5 sm:p-6 md:p-7 flex flex-col justify-between border border-slate-100/90 overflow-hidden"
            >
              <div className="my-auto flex flex-col items-start justify-center">
                {/* Larger GMS Plain Icon from /logos/GMS-Icon.png */}
                <img
                  src="/logos/GMS-Icon.png"
                  alt="GMS Icon"
                  className="h-11 sm:h-12 md:h-14 w-auto object-contain mb-2.5 sm:mb-3 drop-shadow-sm select-none"
                />
                <h2 className="font-display text-2xl sm:text-3xl md:text-[36px] font-semibold text-deep-hull tracking-tight leading-none">
                  About Us
                </h2>
                <p className="font-sans text-xs sm:text-sm md:text-[15px] text-slate-600 leading-relaxed font-normal mt-2 sm:mt-2.5">
                  Your trusted Marine Supply Partner; Ensuring smooth sailing of your vessels
                </p>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 w-full">
                <span className="font-mono text-[10px] sm:text-[11px] text-slate-400 uppercase tracking-wider">
                  Excellence in Port Procurement
                </span>
                <div className="h-1 w-12 bg-gradient-to-r from-[#00609C] to-[#00A3E0] rounded-full" />
              </div>
            </BentoTiltTile>

            {/* Tile 3 (Bottom, 50% height - Dynamic / Scroll-Driven Content) */}
            <BentoTiltTile
              maxTilt={4.5}
              className="relative flex-1 h-1/2 rounded-2xl md:rounded-3xl bg-white p-5 sm:p-6 md:p-7 flex flex-col justify-between border border-slate-100/90 overflow-hidden"
            >
              {/* Header: Content title without 01/03, and 3-Segment Progress bar */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5 mb-2">
                <div className="relative h-5 overflow-hidden flex-1">
                  <div ref={stageTag1Ref} className="absolute inset-0 flex items-center font-mono text-[11px] sm:text-xs">
                    <span className="text-slate-600 uppercase tracking-wider font-semibold truncate">
                      Complete Chandlers
                    </span>
                  </div>
                  <div ref={stageTag2Ref} className="absolute inset-0 flex items-center font-mono text-[11px] sm:text-xs opacity-0">
                    <span className="text-slate-600 uppercase tracking-wider font-semibold truncate">
                      Strategic Network
                    </span>
                  </div>
                  <div ref={stageTag3Ref} className="absolute inset-0 flex items-center font-mono text-[11px] sm:text-xs opacity-0">
                    <span className="text-slate-600 uppercase tracking-wider font-semibold truncate">
                      A to Z Supply Scope
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div ref={progBar1Ref} className="h-1.5 w-6 sm:w-7 rounded-full bg-[#0284c7] transition-colors duration-300" />
                  <div ref={progBar2Ref} className="h-1.5 w-6 sm:w-7 rounded-full bg-slate-200 transition-colors duration-300" />
                  <div ref={progBar3Ref} className="h-1.5 w-6 sm:w-7 rounded-full bg-slate-200 transition-colors duration-300" />
                </div>
              </div>

              {/* Dynamic Paragraphs (User's exact texts, zero scrollbars) */}
              <div className="relative flex-1 flex items-center my-auto overflow-hidden">
                {/* Paragraph 1 */}
                <div ref={contentPara1Ref} className="w-full">
                  <p className="font-sans text-xs sm:text-sm md:text-[14.5px] lg:text-[15.5px] text-slate-700 leading-relaxed">
                    We at Global Marine Supplies, are Complete Ship Store Suppliers (Ship Chandlers), dealing complete supplies for vessels calling any port, Globally.
                  </p>
                </div>

                {/* Paragraph 2 */}
                <div ref={contentPara2Ref} className="w-full absolute inset-0 flex items-center opacity-0 pointer-events-none">
                  <p className="font-sans text-xs sm:text-sm md:text-[14.5px] lg:text-[15.5px] text-slate-700 leading-relaxed">
                    With our head office in the UAE, and warehouse branches at India, Egypt, Turkey, Singapore, Sri Lanka &amp; Bangladesh, Our group comprises a team of highly skilled and professional workforce, with more than 30+ years of experience in the maritime supply industry.
                  </p>
                </div>

                {/* Paragraph 3 */}
                <div ref={contentPara3Ref} className="w-full absolute inset-0 flex items-center opacity-0 pointer-events-none">
                  <p className="font-sans text-[11px] sm:text-xs md:text-[13px] lg:text-[14px] text-slate-700 leading-relaxed">
                    Our scope covers the supply of A to Z, Complete Ship Supplies which includes Provisions, Technical, Engine, Deck, Cabin, Safety/Anti Piracy, Wire &amp; Mooring Ropes, Marine Chemicals &amp; Gases, LSA FFA, Bonded Stores, etc. We also undertake various ship services like Waste Disposal, Cash to Master, Motor Rewinding, Maintenance &amp; Repair, Delivery of Spares, etc.
                  </p>
                </div>
              </div>
            </BentoTiltTile>
          </div>
        </div>
      </div>



      {/* Layer 6: Rising Sea Salt Veil — dissolves water background into Sea Salt white behind the Bento Grid */}
      <div
        ref={seaSaltVeilRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-15 bg-sea-salt opacity-0"
      />
    </section>
  );
}

export default Hero;
