import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import {
  Anchor,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  SealCheck,
} from '@phosphor-icons/react';
import { gsap, SplitText, useGSAP, MOTION } from '../../lib/scroll';
import { useAppStore } from '../../lib/store';
import { Dialog } from '../../components/Dialog';
import { MediaPlaceholder } from '../../components/MediaPlaceholder';
import certificatesData from '../../content/certificates.json';
import siteData from '../../content/site.json';

interface CertificateItem {
  name: string;
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
  const activeStepTween = useRef<gsap.core.Tween | null>(null);
  const isSectionInViewRef = useRef(false);
  const isPageVisibleRef = useRef(true);
  const isInteractingRef = useRef(false);
  const idleResumeTimerRef = useRef<number | null>(null);
  const autoscrollTimerRef = useRef<number | null>(null);

  // Drag state
  const dragStateRef = useRef<{
    active: boolean;
    startY: number;
    startValue: number;
    lastY: number;
    lastTime: number;
    velocity: number;
    moved: boolean;
  }>({
    active: false,
    startY: 0,
    startValue: 0,
    lastY: 0,
    lastTime: 0,
    velocity: 0,
    moved: false,
  });

  // React state for rendered virtual wheel rows & Certificate Viewer Dialog
  const [wheelValue, setWheelValue] = useState(0);
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

  const startAutoscrollIfEligible = useCallback(() => {
    clearAutoscroll();
    if (itemCount === 0) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (
      prefersReducedMotion ||
      !isSectionInViewRef.current ||
      !isPageVisibleRef.current ||
      isInteractingRef.current ||
      viewerIndex !== null
    ) {
      return;
    }

    autoscrollTimerRef.current = window.setInterval(() => {
      if (
        !isSectionInViewRef.current ||
        !isPageVisibleRef.current ||
        isInteractingRef.current ||
        viewerIndex !== null
      ) {
        return;
      }
      const nextInt = Math.round(wheelPosObj.current.value) + 1;
      animateWheelTo(nextInt, 0.75, 'power3.inOut');
    }, 2800);
  }, [animateWheelTo, clearAutoscroll, itemCount, viewerIndex]);

  const markUserInteraction = useCallback(() => {
    isInteractingRef.current = true;
    clearAutoscroll();
    if (idleResumeTimerRef.current !== null) {
      window.clearTimeout(idleResumeTimerRef.current);
    }
    idleResumeTimerRef.current = window.setTimeout(() => {
      isInteractingRef.current = false;
      startAutoscrollIfEligible();
    }, 5000);
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
      startAutoscrollIfEligible();
    }
  }, [viewerIndex, clearAutoscroll, startAutoscrollIfEligible]);

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
                },
                onLeaveBack: () => {
                  section.setAttribute('data-nav-theme', 'light');
                  useAppStore.getState().setNavTheme('light');
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
    }

    const now = performance.now();
    const dt = Math.max(1, now - st.lastTime);
    st.velocity = (e.clientY - st.lastY) / dt;
    st.lastY = e.clientY;
    st.lastTime = now;

    // Dragging upward (negative dy) advances the wheel forward (+value)
    const nextVal = st.startValue - dy / rowSpacing;
    wheelPosObj.current.value = nextVal;
    setWheelValue(nextVal);
  };

  const handlePointerUpOrCancel = () => {
    const st = dragStateRef.current;
    if (!st.active) return;
    st.active = false;

    // Apply inertia from release velocity and snap to nearest integer slot
    const inertiaItems = (-st.velocity * 140) / rowSpacing;
    const snapped = Math.round(wheelPosObj.current.value + inertiaItems);
    animateWheelTo(snapped, 0.55, 'power3.out');
  };

  // Wheel handler inside the dial
  const handleWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    e.stopPropagation();
    markUserInteraction();
    const deltaItems = Math.sign(e.deltaY) * Math.min(1.5, Math.max(0.35, Math.abs(e.deltaY) / 90));
    const snapped = Math.round(wheelPosObj.current.value + deltaItems);
    animateWheelTo(snapped, 0.45, 'power3.out');
  };

  // Keyboard Up/Down arrow navigation on the wheel
  const handleWheelKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      markUserInteraction();
      animateWheelTo(Math.round(wheelPosObj.current.value) + 1, 0.45, 'power3.out');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      markUserInteraction();
      animateWheelTo(Math.round(wheelPosObj.current.value) - 1, 0.45, 'power3.out');
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
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-12 lg:gap-16 xl:gap-20">
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
                className="mt-5 max-w-[46ch] font-sans text-[15px] sm:text-base md:text-[17px] font-normal leading-[1.68] text-deep-hull"
              >
                {sectionCopy.subtitle}
              </p>
            )}
          </div>

          {/* Right Grid: "Accredited" Focal Runway + Endless Vertical Wheel Picker */}
          <div
            ref={stageRef}
            className="lg:col-span-7 flex items-center justify-center lg:justify-end gap-4 sm:gap-6"
          >
            {/* Runway Axis: "Accredited" + Hairlines + Maritime Emblem */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              <span className="runway-anchor font-display text-xl sm:text-2xl md:text-[26px] font-normal tracking-[-0.02em] text-deep-hull shrink-0">
                {(sectionCopy as { runway_label?: string })?.runway_label ?? 'Accredited'}
              </span>

              <span
                aria-hidden="true"
                className="runway-line h-px w-6 sm:w-10 md:w-14 bg-gradient-to-r from-deep-hull/20 via-deep-teal/50 to-deep-teal/75"
              />

              <span
                aria-hidden="true"
                className="runway-anchor flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border border-deep-teal/30 bg-sea-salt text-signal-blue shadow-[0_4px_14px_rgba(14,34,51,0.06)]"
              >
                <Anchor size={16} weight="duotone" />
              </span>

              <span
                aria-hidden="true"
                className="runway-line h-px w-6 sm:w-10 md:w-14 bg-gradient-to-r from-deep-teal/75 via-sonar-cyan/75 to-transparent"
              />
            </div>

            {/* Endless Vertical Wheel Picker (Highlight strictly via larger & darker typography) */}
            <div className="wheel-stage w-[170px] sm:w-[220px] md:w-[240px] shrink-0">
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
                  isInteractingRef.current = true;
                  clearAutoscroll();
                }}
                onMouseLeave={() => {
                  isInteractingRef.current = false;
                  startAutoscrollIfEligible();
                }}
                onFocus={() => {
                  isInteractingRef.current = true;
                  clearAutoscroll();
                }}
                onBlur={() => {
                  isInteractingRef.current = false;
                  startAutoscrollIfEligible();
                }}
                onWheel={handleWheel}
                onKeyDown={handleWheelKeyDown}
                className="relative h-[300px] md:h-[400px] w-full select-none cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-sonar-cyan rounded-[var(--radius-md)]"
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

                      return (
                        <button
                          key={offset}
                          ref={(el) => {
                            if (el) rowRefs.current.set(offset, el);
                            else rowRefs.current.delete(offset);
                          }}
                          type="button"
                          role="option"
                          aria-selected={isFocal}
                          data-cursor="view"
                          onClick={(e) => handleItemClick(offset, itemIdx, e.currentTarget)}
                          style={{
                            transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`,
                            opacity,
                          }}
                          className={`absolute inset-x-1 sm:inset-x-2 flex items-center justify-start py-2 text-left origin-left transition-colors duration-200 will-change-transform whitespace-nowrap ${
                            isFocal
                              ? 'font-display text-[clamp(1.65rem,2.8vw,2.55rem)] font-medium text-deep-hull tracking-[-0.02em]'
                              : 'font-sans text-base md:text-[18px] font-normal text-deep-hull/45'
                          }`}
                        >
                          <span>{cert.name}</span>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shared Dialog: Certificate Viewer */}
      <Dialog
        isOpen={viewerIndex !== null && activeCertificate !== null}
        onClose={() => setViewerIndex(null)}
        title={activeCertificate?.name ?? ''}
        triggerEl={triggerEl}
        variant="modal"
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
            className="flex flex-col gap-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start">
              {/* Left Column: Portrait A4 Certificate Scan Placeholder + Click-to-Zoom */}
              <div className="md:col-span-5 flex flex-col gap-2">
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
                  <p className="font-sans text-[11px] text-deep-hull/60">
                    {viewerLabels.zoom_hint}
                  </p>
                )}
              </div>

              {/* Right Column: Structured Certificate Details */}
              <div className="md:col-span-7 flex flex-col justify-between gap-6">
                <div className="flex flex-col gap-4">
                  <div className="inline-flex items-center gap-2 self-start rounded-full bg-signal-blue/10 px-3 py-1 font-sans text-xs font-semibold text-signal-blue">
                    <SealCheck size={16} weight="fill" />
                    <span>{activeCertificate.status ?? 'Verified'}</span>
                  </div>

                  <h3 className="font-display text-h2 font-normal text-deep-hull leading-tight">
                    {activeCertificate.name}
                  </h3>

                  {activeCertificate.standard && (
                    <div>
                      <p className="font-sans text-xs font-semibold uppercase tracking-[0.08em] text-deep-hull/55">
                        {viewerLabels?.standard}
                      </p>
                      <p className="mt-0.5 font-sans text-sm font-medium text-deep-hull">
                        {activeCertificate.standard}
                      </p>
                    </div>
                  )}

                  {activeCertificate.issuer && (
                    <div>
                      <p className="font-sans text-xs font-semibold uppercase tracking-[0.08em] text-deep-hull/55">
                        {viewerLabels?.issuer}
                      </p>
                      <p className="mt-0.5 font-sans text-sm text-deep-hull/90">
                        {activeCertificate.issuer}
                      </p>
                    </div>
                  )}

                  {activeCertificate.description && (
                    <div>
                      <p className="font-sans text-xs font-semibold uppercase tracking-[0.08em] text-deep-hull/55">
                        {viewerLabels?.scope}
                      </p>
                      <p className="mt-1 font-sans text-base leading-relaxed text-deep-hull/80">
                        {activeCertificate.description}
                      </p>
                    </div>
                  )}

                  {activeCertificate.verify_url && (
                    <div className="pt-2">
                      <a
                        href={activeCertificate.verify_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-signal-blue/30 bg-signal-blue/5 px-4 py-2 font-sans text-xs font-semibold uppercase tracking-[0.06em] text-signal-blue transition-colors hover:bg-signal-blue hover:text-sea-salt"
                      >
                        <span>{viewerLabels?.verify_cta}</span>
                        <ArrowUpRight size={15} weight="bold" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Prev / Next Certificate Navigation Bar */}
                <div className="flex items-center justify-between border-t border-deep-hull/10 pt-4 mt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setViewerIndex(wrapIndex(viewerIndex - 1, itemCount))
                    }
                    aria-label={viewerLabels?.prev_label ?? 'Previous certificate'}
                    className="inline-flex items-center gap-2 rounded-full border border-deep-hull/15 px-3.5 py-2 font-sans text-xs font-medium text-deep-hull transition-colors hover:border-signal-blue hover:text-signal-blue"
                  >
                    <ArrowLeft size={15} weight="bold" />
                    <span>{ items[wrapIndex(viewerIndex - 1, itemCount)]?.name }</span>
                  </button>

                  <span className="font-sans text-xs tabular-nums text-deep-hull/55">
                    {viewerIndex + 1} / {itemCount}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setViewerIndex(wrapIndex(viewerIndex + 1, itemCount))
                    }
                    aria-label={viewerLabels?.next_label ?? 'Next certificate'}
                    className="inline-flex items-center gap-2 rounded-full border border-deep-hull/15 px-3.5 py-2 font-sans text-xs font-medium text-deep-hull transition-colors hover:border-signal-blue hover:text-signal-blue"
                  >
                    <span>{ items[wrapIndex(viewerIndex + 1, itemCount)]?.name }</span>
                    <ArrowRight size={15} weight="bold" />
                  </button>
                </div>
              </div>
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
