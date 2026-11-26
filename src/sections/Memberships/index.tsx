import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from 'react';
import {
  Anchor,
  ArrowLeft,
  ArrowRight,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
} from '@phosphor-icons/react';
import { gsap, SplitText, useGSAP, MOTION } from '../../lib/scroll';
import { useAppStore } from '../../lib/store';
import { Dialog } from '../../components/Dialog';
import { MediaPlaceholder } from '../../components/MediaPlaceholder';
import certificatesData from '../../content/certificates.json';
import siteData from '../../content/site.json';

interface CertificateItem {
  name: string;
  logo?: string;
  standard?: string;
  issuer?: string;
  status?: string;
  description?: string;
  verify_url?: string;
}

const VISIBLE_OFFSETS = [-3, -2, -1, 0, 1, 2, 3];
const ROW_SPACING_DESKTOP = 66;
const ROW_SPACING_MOBILE = 48;

function wrapIndex(idx: number, length: number): number {
  return ((idx % length) + length) % length;
}

/**
 * Section 4: Memberships & Certifications (DESIGN.md Section 4 & Section 5 Transition In)
 * - Left column: Editorial heading and supporting line on Sea Salt.
 * - Right column: Endless vertical wheel picker (480px desktop, 300px mobile) with
 *   distance-based opacity (1.0 -> 0.15) and scale (1.0 -> 0.80) falloff, soft top/bottom masks,
 *   and thin Deep Teal hairlines framing the Gambetta focal row.
 * - Autoscroll advances 1 item every ~2.8s with focal snap; pauses on hover, drag, wheel, focus,
 *   off-screen, or viewer open, and resumes after 5s of stillness.
 * - Clicking any item opens the Certificate Viewer in the shared Dialog (A4 portrait MediaPlaceholder,
 *   full-screen pointer-panning zoom, left/right navigation, and issuer verification link).
 * - Transition Out into Stores: Dissolves from Sea Salt into Deep Hull as darkness rises from the bottom,
 *   flipping data-nav-theme to "dark" at the midpoint of the crossfade.
 */
export function Memberships() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentWrapRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const missionRef = useRef<HTMLParagraphElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dissolveOverlayRef = useRef<HTMLDivElement>(null);
  const wheelViewportRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Continuous floating-point wheel index (e.g. 0.0, 1.0, 2.35, -1.0...)
  const wheelPosObj = useRef({ value: 0 });
  const targetPosRef = useRef(0);
  const activeStepTween = useRef<gsap.core.Tween | null>(null);
  const isSectionInViewRef = useRef(false);
  const isPageVisibleRef = useRef(true);
  const isHoveredRef = useRef(false);
  const isFocusedRef = useRef(false);
  const idleResumeTimerRef = useRef<number | null>(null);
  const autoscrollTimerRef = useRef<number | null>(null);
  const wheelAccumRef = useRef(0);
  const wheelAccumResetTimerRef = useRef<number | null>(null);

  // Drag state
  const dragStateRef = useRef<{
    active: boolean;
    pointerId: number | null;
    captured: boolean;
    startY: number;
    startValue: number;
    lastY: number;
    lastTime: number;
    velocity: number;
    moved: boolean;
  }>({
    active: false,
    pointerId: null,
    captured: false,
    startY: 0,
    startValue: 0,
    lastY: 0,
    lastTime: 0,
    velocity: 0,
    moved: false,
  });

  // React state for rendered virtual wheel rows & Certificate Viewer Dialog
  const [wheelValue, setWheelValue] = useState(0);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [triggerEl, setTriggerEl] = useState<HTMLElement | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPan, setZoomPan] = useState({ x: 0, y: 0 });
  const zoomTouchRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const viewerSwipeStartXRef = useRef<number | null>(null);

  const sectionCopy = certificatesData?.section;
  const viewerLabels = sectionCopy?.viewer_labels;
  const companyName = siteData?.website_info?.company_name ?? '';

  // Build normalized items list from certificates.json (supporting both `items` and raw `memberships` strings)
  const items: CertificateItem[] = useMemo(() => {
    const rawNames = certificatesData?.memberships ?? [];
    const detailed = certificatesData?.items ?? [];
    const byName = new Map<string, CertificateItem>();
    detailed.forEach((d) => byName.set(d.name.toLowerCase(), d));

    if (rawNames.length > 0) {
      return rawNames.map((name) => {
        const match = byName.get(name.toLowerCase());
        return (
          match ?? {
            name,
          }
        );
      });
    }
    return detailed;
  }, []);

  const itemCount = items.length;
  const rowSpacing = isMobile ? ROW_SPACING_MOBILE : ROW_SPACING_DESKTOP;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Snap or animate wheel to a target floating-point or integer position
  const animateWheelTo = useCallback(
    (targetVal: number, duration = 0.68, ease = 'power3.out') => {
      activeStepTween.current?.kill();
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion || duration <= 0) {
        wheelPosObj.current.value = targetVal;
        setWheelValue(targetVal);
        return;
      }

      activeStepTween.current = gsap.to(wheelPosObj.current, {
        value: targetVal,
        duration,
        ease,
        onUpdate: () => {
          setWheelValue(wheelPosObj.current.value);
        },
      });
    },
    []
  );

  // Schedule or pause autoscroll (1 item every ~2.8s when idle & visible)
  const clearAutoscroll = useCallback(() => {
    if (autoscrollTimerRef.current !== null) {
      window.clearInterval(autoscrollTimerRef.current);
      autoscrollTimerRef.current = null;
    }
  }, []);

  const canAutoscroll = useCallback(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    return (
      itemCount > 0 &&
      !prefersReducedMotion &&
      isSectionInViewRef.current &&
      isPageVisibleRef.current &&
      !isHoveredRef.current &&
      !isFocusedRef.current &&
      !dragStateRef.current.active &&
      viewerIndex === null
    );
  }, [itemCount, viewerIndex]);

  const stepAutoscrollForward = useCallback(() => {
    if (!canAutoscroll()) return;
    const nextInt = Math.round(wheelPosObj.current.value) + 1;
    targetPosRef.current = nextInt;
    animateWheelTo(nextInt, 0.72, 'power3.inOut');
  }, [animateWheelTo, canAutoscroll]);

  const startAutoscrollIfEligible = useCallback(
    (immediate = false) => {
      clearAutoscroll();
      if (!canAutoscroll()) {
        return;
      }

      if (immediate) {
        stepAutoscrollForward();
      }

      autoscrollTimerRef.current = window.setInterval(() => {
        stepAutoscrollForward();
      }, 2800);
    },
    [canAutoscroll, clearAutoscroll, stepAutoscrollForward]
  );

  const markUserInteraction = useCallback(() => {
    clearAutoscroll();
    if (idleResumeTimerRef.current !== null) {
      window.clearTimeout(idleResumeTimerRef.current);
      idleResumeTimerRef.current = null;
    }
    if (!isHoveredRef.current) {
      idleResumeTimerRef.current = window.setTimeout(() => {
        if (!isHoveredRef.current && !dragStateRef.current.active) {
          startAutoscrollIfEligible(true);
        }
      }, 1400);
    }
  }, [clearAutoscroll, startAutoscrollIfEligible]);

  // IntersectionObserver & visibilitychange so wheel only autoscrolls while visible
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        isSectionInViewRef.current = entry.isIntersecting;
        if (entry.isIntersecting) {
          startAutoscrollIfEligible();
        } else {
          clearAutoscroll();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(section);

    const onVisChange = () => {
      isPageVisibleRef.current = document.visibilityState === 'visible';
      if (isPageVisibleRef.current) {
        startAutoscrollIfEligible();
      } else {
        clearAutoscroll();
      }
    };
    document.addEventListener('visibilitychange', onVisChange);

    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisChange);
      clearAutoscroll();
      if (idleResumeTimerRef.current !== null) {
        window.clearTimeout(idleResumeTimerRef.current);
      }
    };
  }, [clearAutoscroll, startAutoscrollIfEligible]);

  // Re-evaluate autoscroll when viewer opens/closes
  useEffect(() => {
    if (viewerIndex !== null) {
      clearAutoscroll();
    } else {
      setIsZoomed(false);
      startAutoscrollIfEligible(false);
    }
  }, [viewerIndex, clearAutoscroll, startAutoscrollIfEligible]);

  // Native non-passive wheel listener on the wheel container so scrolling it never scrolls the page
  useEffect(() => {
    const el = wheelViewportRef.current;
    if (!el) return;

    const onNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (itemCount === 0 || viewerIndex !== null) return;

      clearAutoscroll();
      if (idleResumeTimerRef.current !== null) {
        window.clearTimeout(idleResumeTimerRef.current);
        idleResumeTimerRef.current = null;
      }

      if (!isHoveredRef.current) {
        idleResumeTimerRef.current = window.setTimeout(() => {
          if (!isHoveredRef.current && !dragStateRef.current.active) {
            startAutoscrollIfEligible(true);
          }
        }, 900);
      }

      if (Math.abs(e.deltaY) < 0.5) return;

      if (
        wheelAccumRef.current !== 0 &&
        Math.sign(e.deltaY) !== Math.sign(wheelAccumRef.current)
      ) {
        wheelAccumRef.current = 0;
      }

      wheelAccumRef.current += e.deltaY;

      if (wheelAccumResetTimerRef.current !== null) {
        window.clearTimeout(wheelAccumResetTimerRef.current);
      }
      wheelAccumResetTimerRef.current = window.setTimeout(() => {
        wheelAccumRef.current = 0;
      }, 160);

      const STEP_PX = 56;
      if (Math.abs(wheelAccumRef.current) >= STEP_PX) {
        const rawSteps = Math.trunc(wheelAccumRef.current / STEP_PX);
        const isDiscreteNotch = Math.abs(e.deltaY) >= 80 && Math.abs(rawSteps) <= 2;
        const steps = isDiscreteNotch
          ? Math.sign(e.deltaY)
          : Math.max(-2, Math.min(2, rawSteps));

        wheelAccumRef.current = isDiscreteNotch
          ? 0
          : wheelAccumRef.current - rawSteps * STEP_PX;

        const baseTarget = activeStepTween.current?.isActive()
          ? targetPosRef.current
          : Math.round(wheelPosObj.current.value);
        const nextTarget = baseTarget + steps;
        targetPosRef.current = nextTarget;
        animateWheelTo(nextTarget, 0.42, 'power3.out');
      }
    };

    el.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onNativeWheel);
      if (wheelAccumResetTimerRef.current !== null) {
        window.clearTimeout(wheelAccumResetTimerRef.current);
      }
    };
  }, [animateWheelTo, clearAutoscroll, itemCount, startAutoscrollIfEligible, viewerIndex]);

  // Left / Right arrow keys inside Certificate Viewer Dialog
  useEffect(() => {
    if (viewerIndex === null || itemCount === 0) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsZoomed(false);
        setViewerIndex((prev) => (prev === null ? 0 : wrapIndex(prev + 1, itemCount)));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsZoomed(false);
        setViewerIndex((prev) => (prev === null ? 0 : wrapIndex(prev - 1, itemCount)));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [viewerIndex, itemCount]);

  // Scroll choreography:
  // 1. Title masked line reveal + Stage runway entrance
  // 2. Preserved SplitText word-by-word scroll illumination (0.18 -> 1.0) on editorial paragraph
  // 3. Dissolve transition out into Stores (Sea Salt -> Deep Hull)
  useGSAP(
    () => {
      const section = sectionRef.current;
      const contentWrap = contentWrapRef.current;
      const dissolveOverlay = dissolveOverlayRef.current;
      if (!section || !contentWrap || !dissolveOverlay) return;

      const mm = gsap.matchMedia();

      mm.add(
        {
          canAnimate: '(prefers-reduced-motion: no-preference)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const { reduceMotion } = context.conditions ?? {};

          if (reduceMotion) {
            if (missionRef.current) {
              gsap.set(missionRef.current, { opacity: 1 });
            }
            return;
          }

          let titleSplit: SplitText | undefined;
          let wordSplit: SplitText | undefined;

          if (titleRef.current) {
            titleSplit = SplitText.create(titleRef.current, {
              type: 'lines',
              mask: 'lines',
              autoSplit: true,
              onSplit(self) {
                return gsap.from(self.lines, {
                  yPercent: 105,
                  duration: MOTION.durSlow,
                  ease: MOTION.easeOut,
                  stagger: 0.08,
                  scrollTrigger: {
                    trigger: titleRef.current,
                    start: 'top 86%',
                    once: true,
                  },
                });
              },
            });
          }

          // Preserved word-by-word scroll illumination (0.18 -> 1.0, completing cleanly before leaving center)
          if (missionRef.current) {
            wordSplit = SplitText.create(missionRef.current, {
              type: 'words',
            });

            if (wordSplit.words && wordSplit.words.length > 0) {
              gsap.set(wordSplit.words, { opacity: 0.18 });

              gsap.to(wordSplit.words, {
                opacity: 1,
                duration: 0.5,
                stagger: 0.035,
                ease: 'none',
                scrollTrigger: {
                  trigger: missionRef.current,
                  start: 'top 90%',
                  end: 'top 50%',
                  scrub: 0.4,
                },
              });
            }
          }

          // Runway & Wheel stage entrance transition
          if (stageRef.current) {
            const runwayLines = stageRef.current.querySelectorAll<HTMLElement>('.runway-line');
            const runwayAnchor = stageRef.current.querySelectorAll<HTMLElement>('.runway-anchor');
            const wheelStage = stageRef.current.querySelector<HTMLElement>('.wheel-stage');

            const stageTl = gsap.timeline({
              scrollTrigger: {
                trigger: stageRef.current,
                start: 'top 86%',
                once: true,
              },
            });

            if (runwayAnchor.length > 0) {
              stageTl.fromTo(
                runwayAnchor,
                { y: 16, autoAlpha: 0 },
                { y: 0, autoAlpha: 1, duration: 0.8, ease: MOTION.easeOut, stagger: 0.08 },
                0
              );
            }

            if (runwayLines.length > 0) {
              stageTl.fromTo(
                runwayLines,
                { scaleX: 0, transformOrigin: 'left center' },
                { scaleX: 1, duration: 0.85, ease: MOTION.easeOut, stagger: 0.12 },
                0.14
              );
            }

            if (wheelStage) {
              stageTl.fromTo(
                wheelStage,
                { y: 24, autoAlpha: 0 },
                { y: 0, autoAlpha: 1, duration: 0.9, ease: MOTION.easeOut },
                0.08
              );
            }
          }

          // Bottom edge seam dissolve into Stores without dimming Memberships content
          gsap.fromTo(
            dissolveOverlay,
            { opacity: 0 },
            {
              opacity: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: section,
                start: 'bottom 70%',
                end: 'bottom 15%',
                scrub: MOTION.scrub,
                onUpdate: (self) => {
                  const nextTheme = self.progress >= 0.65 ? 'dark' : 'light';
                  if (section.getAttribute('data-nav-theme') !== nextTheme) {
                    section.setAttribute('data-nav-theme', nextTheme);
                    useAppStore.getState().setNavTheme(nextTheme);
                  }
                  useAppStore.getState().setBottomTheme(self.progress >= 0.35 ? 'dark' : 'light');
                },
                onLeaveBack: () => {
                  section.setAttribute('data-nav-theme', 'light');
                  useAppStore.getState().setNavTheme('light');
                  useAppStore.getState().setBottomTheme('light');
                },
              },
            }
          );

          return () => {
            titleSplit?.revert();
            wordSplit?.revert();
          };
        }
      );

      return () => mm.revert();
    },
    { scope: sectionRef, dependencies: [sectionCopy?.heading, sectionCopy?.subtitle] }
  );

  // Pointer drag handlers on the wheel
  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    markUserInteraction();
    activeStepTween.current?.kill();
    dragStateRef.current = {
      active: true,
      pointerId: e.pointerId,
      captured: false,
      startY: e.clientY,
      startValue: wheelPosObj.current.value,
      lastY: e.clientY,
      lastTime: performance.now(),
      velocity: 0,
      moved: false,
    };
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const st = dragStateRef.current;
    if (!st.active) return;

    const dy = e.clientY - st.startY;
    if (Math.abs(dy) > 5) {
      st.moved = true;
      if (!st.captured && st.pointerId !== null) {
        try {
          e.currentTarget.setPointerCapture(st.pointerId);
          st.captured = true;
        } catch {
          // Ignore if pointer capture is unavailable
        }
      }
    }

    const now = performance.now();
    const dt = Math.max(1, now - st.lastTime);
    st.velocity = (e.clientY - st.lastY) / dt;
    st.lastY = e.clientY;
    st.lastTime = now;

    // Dragging upward (negative dy) advances the wheel forward (+value)
    const nextVal = st.startValue - dy / rowSpacing;
    wheelPosObj.current.value = nextVal;
    targetPosRef.current = Math.round(nextVal);
    setWheelValue(nextVal);
  };

  const handlePointerUpOrCancel = (e: ReactPointerEvent<HTMLDivElement>) => {
    const st = dragStateRef.current;
    if (!st.active) return;
    st.active = false;

    if (st.captured && st.pointerId !== null) {
      try {
        if (e.currentTarget.hasPointerCapture(st.pointerId)) {
          e.currentTarget.releasePointerCapture(st.pointerId);
        }
      } catch {
        // Ignore if pointer capture already released
      }
    }
    st.captured = false;
    st.pointerId = null;

    // Apply inertia from release velocity and snap to nearest integer slot
    const inertiaItems = (-st.velocity * 140) / rowSpacing;
    const snapped = Math.round(wheelPosObj.current.value + inertiaItems);
    targetPosRef.current = snapped;
    animateWheelTo(snapped, 0.55, 'power3.out');

    if (!isHoveredRef.current && !isFocusedRef.current) {
      startAutoscrollIfEligible(false);
    }
  };

  // Keyboard Up/Down arrow navigation on the wheel
  const handleWheelKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      markUserInteraction();
      const next = Math.round(wheelPosObj.current.value) + 1;
      targetPosRef.current = next;
      animateWheelTo(next, 0.45, 'power3.out');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      markUserInteraction();
      const next = Math.round(wheelPosObj.current.value) - 1;
      targetPosRef.current = next;
      animateWheelTo(next, 0.45, 'power3.out');
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      markUserInteraction();
      const focalIndex = wrapIndex(Math.round(wheelPosObj.current.value), itemCount);
      const focalBtn = rowRefs.current.get(0) ?? wheelViewportRef.current;
      setTriggerEl(focalBtn);
      setViewerIndex(focalIndex);
    }
  };

  const handleItemClick = (offset: number, itemIdx: number, btnEl: HTMLButtonElement) => {
    if (dragStateRef.current.moved) {
      dragStateRef.current.moved = false;
      return;
    }
    markUserInteraction();
    if (offset !== 0) {
      // Snap clicked row into focal position and open its certificate viewer
      const targetVal = Math.round(wheelPosObj.current.value) + offset;
      targetPosRef.current = targetVal;
      animateWheelTo(targetVal, 0.45, 'power3.out');
    }
    setTriggerEl(btnEl);
    setViewerIndex(itemIdx);
  };

  const baseInt = Math.round(wheelValue);
  const fracOffset = wheelValue - baseInt;
  const activeCertificate = viewerIndex !== null ? items[viewerIndex] : null;

  return (
    <section
      ref={sectionRef}
      id="memberships"
      data-section="memberships"
      data-nav-theme="light"
      aria-label={sectionCopy?.heading ?? 'Our Memberships'}
      className="relative w-full overflow-hidden bg-sea-salt text-deep-hull pt-4 pb-28 sm:pt-6 sm:pb-32 md:pt-8 md:pb-40"
    >
      {/* Subtle bottom-edge dissolve band bridging cleanly into Deep Hull Stores */}
      <div
        ref={dissolveOverlayRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28 md:h-36 z-0 opacity-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(14, 34, 51, 0) 0%, rgba(14, 34, 51, 0.55) 62%, var(--deep-hull) 100%)',
        }}
      />

      <div
        ref={contentWrapRef}
        className="relative z-10 mx-auto w-full max-w-7xl px-6 sm:px-10 md:px-12 lg:px-16"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-12 lg:gap-12 xl:gap-16">
          {/* Left Grid: Title, Blue Subtitle Below It, and Scroll-Illuminated Paragraph */}
          <div className="lg:col-span-5 flex flex-col items-start">
            <h2
              ref={titleRef}
              className="font-display text-[length:var(--text-xl)] md:text-[length:var(--text-2xl)] font-normal leading-[1.06] tracking-tight text-deep-hull"
            >
              {sectionCopy?.heading ?? 'Our Memberships'}
            </h2>

            {sectionCopy?.eyebrow && (
              <span className="mt-3 block font-sans text-xs md:text-sm font-semibold uppercase tracking-[0.14em] text-signal-blue">
                {sectionCopy.eyebrow}
              </span>
            )}

            {sectionCopy?.subtitle && (
              <p
                ref={missionRef}
                aria-label={sectionCopy.subtitle}
                className="mt-5 max-w-[38ch] font-sans text-[15px] sm:text-base md:text-[17px] font-normal leading-[1.68] text-deep-hull"
              >
                {sectionCopy.subtitle}
              </p>
            )}
          </div>

          {/* Right Grid: "Accredited" Focal Runway + Endless Vertical Wheel Picker */}
          <div
            ref={stageRef}
            className="lg:col-span-7 flex items-center justify-center lg:justify-end gap-2.5 sm:gap-4 xl:gap-5"
          >
            {/* Runway Axis: "Accredited" + Hairlines + Maritime Emblem */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <span className="runway-anchor font-display text-lg sm:text-2xl md:text-[26px] font-normal tracking-[-0.02em] text-deep-hull shrink-0">
                {(sectionCopy as { runway_label?: string })?.runway_label ?? 'Accredited'}
              </span>

              <span
                aria-hidden="true"
                className="runway-line h-px w-4 sm:w-7 md:w-10 lg:w-7 xl:w-10 bg-gradient-to-r from-deep-hull/20 via-deep-teal/50 to-deep-teal/75"
              />

              <span
                aria-hidden="true"
                className="runway-anchor flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border border-deep-teal/30 bg-sea-salt text-signal-blue shadow-[0_4px_14px_rgba(14,34,51,0.06)]"
              >
                <Anchor size={15} weight="duotone" />
              </span>

              <span
                aria-hidden="true"
                className="runway-line h-px w-4 sm:w-7 md:w-10 lg:w-7 xl:w-10 bg-gradient-to-r from-deep-teal/75 via-sonar-cyan/75 to-transparent"
              />
            </div>

            {/* Endless Vertical Wheel Picker */}
            <div className="wheel-stage w-[185px] sm:w-[250px] md:w-[270px] lg:w-[255px] xl:w-[280px] shrink-0">
              <div
                ref={wheelViewportRef}
                data-lenis-prevent
                tabIndex={0}
                role="listbox"
                aria-label={sectionCopy?.heading ?? 'Our Memberships wheel'}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUpOrCancel}
                onPointerCancel={handlePointerUpOrCancel}
                onMouseEnter={() => {
                  isHoveredRef.current = true;
                  clearAutoscroll();
                  if (idleResumeTimerRef.current !== null) {
                    window.clearTimeout(idleResumeTimerRef.current);
                    idleResumeTimerRef.current = null;
                  }
                }}
                onMouseLeave={() => {
                  isHoveredRef.current = false;
                  setHoveredSlot(null);
                  if (idleResumeTimerRef.current !== null) {
                    window.clearTimeout(idleResumeTimerRef.current);
                    idleResumeTimerRef.current = null;
                  }
                  if (!dragStateRef.current.active) {
                    startAutoscrollIfEligible(true);
                  }
                }}
                onFocus={(e) => {
                  if (e.target.matches(':focus-visible')) {
                    isFocusedRef.current = true;
                    clearAutoscroll();
                  }
                }}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    isFocusedRef.current = false;
                    if (!isHoveredRef.current && !dragStateRef.current.active) {
                      startAutoscrollIfEligible(false);
                    }
                  }
                }}
                onKeyDown={handleWheelKeyDown}
                className="relative h-[300px] md:h-[400px] w-full touch-none select-none cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-sonar-cyan rounded-[var(--radius-md)]"
                style={{
                  WebkitMaskImage:
                    'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
                  maskImage:
                    'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
                }}
              >
                {/* Virtual Wheel Items around the focal index */}
                <div className="relative h-full w-full flex items-center justify-start">
                  {itemCount > 0 &&
                    VISIBLE_OFFSETS.map((offset) => {
                      const virtualSlot = baseInt + offset;
                      const itemIdx = wrapIndex(virtualSlot, itemCount);
                      const cert = items[itemIdx];
                      // Exact continuous distance from the focal centre
                      const relOffset = offset - fracOffset;
                      const absDist = Math.abs(relOffset);

                      // High-contrast focal separation purely through size and tone
                      const opacity = Math.max(0.12, 1 - absDist * 0.32);
                      const scale = Math.max(0.82, 1 - absDist * 0.065);
                      const translateY = relOffset * rowSpacing;
                      const translateX = isMobile ? 0 : -Math.pow(absDist, 1.3) * 2.5;
                      const isFocal = absDist < 0.45;
                      const isRowHovered = hoveredSlot === virtualSlot;
                      const isWideLogo = cert.name.toLowerCase() === 'impa';

                      return (
                        <button
                          key={virtualSlot}
                          ref={(el) => {
                            if (el) rowRefs.current.set(offset, el);
                            else rowRefs.current.delete(offset);
                          }}
                          type="button"
                          role="option"
                          aria-selected={isFocal}
                          data-cursor="view"
                          onMouseEnter={() => setHoveredSlot(virtualSlot)}
                          onMouseLeave={() =>
                            setHoveredSlot((prev) => (prev === virtualSlot ? null : prev))
                          }
                          onClick={(e) => handleItemClick(offset, itemIdx, e.currentTarget)}
                          style={{
                            transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`,
                            opacity: isRowHovered ? Math.max(opacity, 0.96) : opacity,
                          }}
                          className={`group absolute inset-x-1 sm:inset-x-2 flex items-center justify-start gap-2 sm:gap-3 py-2 text-left origin-left transition-[color,opacity] duration-300 will-change-transform whitespace-nowrap ${
                            isFocal
                              ? 'font-display text-[clamp(1.2rem,2.2vw,2.1rem)] font-medium text-deep-hull tracking-[-0.02em] leading-none'
                              : 'font-sans text-sm sm:text-base md:text-[18px] font-normal text-deep-hull/45 hover:text-deep-hull/85 leading-none'
                          }`}
                        >
                          <span>{cert.name}</span>
                          {cert.logo && (
                            <img
                              src={cert.logo}
                              alt=""
                              aria-hidden="true"
                              draggable={false}
                              className={`shrink-0 object-contain select-none transition-[filter,opacity,width,height] duration-300 ease-out ${
                                isWideLogo
                                  ? isFocal
                                    ? 'h-6 sm:h-8 md:h-9 w-auto max-w-[66px] sm:max-w-[88px] md:max-w-[96px]'
                                    : 'h-4 sm:h-5 md:h-6 w-auto max-w-[46px] sm:max-w-[58px]'
                                  : isFocal
                                    ? 'h-7 w-7 sm:h-9 sm:w-9 md:h-10 md:w-10'
                                    : 'h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7'
                              } ${
                                isFocal || isRowHovered
                                  ? 'grayscale-0 opacity-100 contrast-100'
                                  : 'grayscale opacity-50 contrast-90 group-hover:grayscale-0 group-hover:opacity-100 group-hover:contrast-100'
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shared Dialog: Centered Certificate Viewer */}
      <Dialog
        isOpen={viewerIndex !== null && activeCertificate !== null}
        onClose={() => setViewerIndex(null)}
        title={activeCertificate?.name ?? ''}
        triggerEl={triggerEl}
        variant="modal"
        hideHeader
        maxWidthClassName="md:max-w-[500px]"
        hashId={
          activeCertificate
            ? `certificate-${activeCertificate.name.toLowerCase().replace(/\s+/g, '-')}`
            : 'certificate'
        }
      >
        {activeCertificate && viewerIndex !== null && (
          <div
            onTouchStart={(e: ReactTouchEvent<HTMLDivElement>) => {
              if (isZoomed) return;
              viewerSwipeStartXRef.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e: ReactTouchEvent<HTMLDivElement>) => {
              if (isZoomed || viewerSwipeStartXRef.current === null) return;
              const endX = e.changedTouches[0]?.clientX ?? viewerSwipeStartXRef.current;
              const dx = endX - viewerSwipeStartXRef.current;
              viewerSwipeStartXRef.current = null;
              if (Math.abs(dx) > 48) {
                if (dx < 0) {
                  setViewerIndex(wrapIndex(viewerIndex + 1, itemCount));
                } else {
                  setViewerIndex(wrapIndex(viewerIndex - 1, itemCount));
                }
              }
            }}
            className="flex flex-col items-center text-center gap-5 pt-1"
          >
            {/* 1. Centered Membership Title + Logo */}
            <div className="flex items-center justify-center gap-3 px-10">
              <h3 className="font-display text-2xl sm:text-[28px] font-normal text-deep-hull leading-tight">
                {activeCertificate.name}
              </h3>
              {activeCertificate.logo && (
                <img
                  src={activeCertificate.logo}
                  alt={`${activeCertificate.name} logo`}
                  draggable={false}
                  className={`shrink-0 object-contain select-none ${
                    activeCertificate.name.toLowerCase() === 'impa'
                      ? 'h-7 sm:h-8 w-auto max-w-[96px]'
                      : 'h-8 w-8 sm:h-9 sm:w-9'
                  }`}
                />
              )}
            </div>

            {/* 2. Centered Certification Image Placeholder + Click-to-Zoom */}
            <div className="flex w-full max-w-[270px] sm:max-w-[295px] flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setZoomPan({ x: 0, y: 0 });
                  setIsZoomed(true);
                }}
                className="group relative w-full overflow-hidden rounded-[var(--radius-md)] border border-deep-hull/15 shadow-md text-left focus-visible:outline-2 focus-visible:outline-sonar-cyan"
                aria-label={`${activeCertificate.name} — ${viewerLabels?.zoom_hint ?? 'Zoom'}`}
              >
                <MediaPlaceholder
                  label={activeCertificate.name}
                  sublabel={activeCertificate.standard ?? companyName}
                  icon="certificate"
                  aspectRatio="1 / 1.414"
                  theme="light"
                  className="w-full transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-deep-hull/85 px-3 py-1.5 font-sans text-xs font-medium text-sea-salt backdrop-blur-sm">
                  <MagnifyingGlassPlus size={14} weight="bold" />
                  <span>Zoom</span>
                </span>
              </button>
              {viewerLabels?.zoom_hint && (
                <p className="font-sans text-[11px] text-deep-hull/60 text-center">
                  {viewerLabels.zoom_hint}
                </p>
              )}
            </div>

            {/* 3. Centered Pagination Buttons at Bottom of Image */}
            <div className="flex w-full max-w-[360px] items-center justify-center gap-3 sm:gap-4 border-t border-deep-hull/10 pt-4">
              <button
                type="button"
                onClick={() =>
                  setViewerIndex(wrapIndex(viewerIndex - 1, itemCount))
                }
                aria-label={viewerLabels?.prev_label ?? 'Previous certificate'}
                className="inline-flex items-center gap-2 rounded-full border border-deep-hull/15 px-3.5 py-2 font-sans text-xs font-medium text-deep-hull transition-colors hover:border-signal-blue hover:text-signal-blue cursor-pointer"
              >
                <ArrowLeft size={15} weight="bold" />
                <span>{items[wrapIndex(viewerIndex - 1, itemCount)]?.name}</span>
              </button>

              <span className="font-sans text-xs tabular-nums text-deep-hull/55 px-1">
                {viewerIndex + 1} / {itemCount}
              </span>

              <button
                type="button"
                onClick={() =>
                  setViewerIndex(wrapIndex(viewerIndex + 1, itemCount))
                }
                aria-label={viewerLabels?.next_label ?? 'Next certificate'}
                className="inline-flex items-center gap-2 rounded-full border border-deep-hull/15 px-3.5 py-2 font-sans text-xs font-medium text-deep-hull transition-colors hover:border-signal-blue hover:text-signal-blue cursor-pointer"
              >
                <span>{items[wrapIndex(viewerIndex + 1, itemCount)]?.name}</span>
                <ArrowRight size={15} weight="bold" />
              </button>
            </div>

            {/* Full-screen Pointer-Panning Zoom Overlay */}
            {isZoomed && (
              <div
                role="dialog"
                aria-label={`${activeCertificate.name} zoomed view`}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const relX = (e.clientX - rect.left) / rect.width - 0.5;
                  const relY = (e.clientY - rect.top) / rect.height - 0.5;
                  setZoomPan({ x: -relX * 220, y: -relY * 280 });
                }}
                onTouchStart={(e) => {
                  const t = e.touches[0];
                  if (!t) return;
                  zoomTouchRef.current = {
                    startX: t.clientX,
                    startY: t.clientY,
                    baseX: zoomPan.x,
                    baseY: zoomPan.y,
                  };
                }}
                onTouchMove={(e) => {
                  const t = e.touches[0];
                  const st = zoomTouchRef.current;
                  if (!t || !st) return;
                  setZoomPan({
                    x: Math.max(-180, Math.min(180, st.baseX + (t.clientX - st.startX))),
                    y: Math.max(-240, Math.min(240, st.baseY + (t.clientY - st.startY))),
                  });
                }}
                onClick={() => setIsZoomed(false)}
                className="fixed inset-0 z-50 flex items-center justify-center bg-night-port/90 p-6 backdrop-blur-md cursor-zoom-out"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsZoomed(false);
                  }}
                  className="fixed top-6 right-6 z-50 inline-flex items-center gap-2 rounded-full bg-sea-salt px-4 py-2 font-sans text-xs font-semibold text-deep-hull shadow-lg"
                >
                  <MagnifyingGlassMinus size={16} weight="bold" />
                  <span>{viewerLabels?.zoom_close ?? 'Exit zoom'}</span>
                </button>

                <div
                  style={{
                    transform: `translate3d(${zoomPan.x}px, ${zoomPan.y}px, 0) scale(1.38)`,
                  }}
                  className="w-full max-w-[460px] transition-transform duration-75 ease-out will-change-transform"
                >
                  <MediaPlaceholder
                    label={activeCertificate.name}
                    sublabel={activeCertificate.standard ?? companyName}
                    icon="certificate"
                    aspectRatio="1 / 1.414"
                    theme="light"
                    className="w-full shadow-xl"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </section>
  );
}

export default Memberships;
