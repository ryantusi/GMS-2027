import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { gsap, useGSAP, MOTION } from '../../lib/scroll';
import { useAppStore } from '../../lib/store';
import sectorsData from '../../content/sectors.json';

interface SectorEntry {
  id: string;
  sector: string;
  numericTarget: number;
  suffix: string;
  subtypes: string[];
}

function parseSectorCount(raw: string, explicitSuffix?: string): { num: number; suffix: string } {
  const digits = parseInt(raw.replace(/[^0-9]/g, ''), 10);
  const hasPlus = raw.includes('+') || explicitSuffix === '+';
  return {
    num: Number.isNaN(digits) ? 0 : digits,
    suffix: hasPlus ? '+' : explicitSuffix ?? '',
  };
}

interface SectorTiltCardProps {
  item: SectorEntry;
  idx: number;
  isHovered: boolean;
  isDimmed: boolean;
  onHoverChange: (idx: number | null) => void;
  cardRefs: MutableRefObject<(HTMLDivElement | null)[]>;
  countSpanRefs: MutableRefObject<(HTMLSpanElement | null)[]>;
  maxTilt?: number;
}

/**
 * Interactive Dark Frosted Glass Sector Card with 3D Pointer Hover Tilt:
 * - Outer slot (`cardRefs`) handles GSAP scroll entrance cleanly and provides `perspective: 1200px`
 * - Inner `tiltRef` handles 3D pointer rotation, aqua specular glare, and hover lift without conflict
 * - Top-aligned internal flow ensures the count, sector title, and horizontal divider line sit
 *   at the exact same vertical elevation across all 4 cards.
 */
function SectorTiltCard({
  item,
  idx,
  isHovered,
  isDimmed,
  onHoverChange,
  cardRefs,
  countSpanRefs,
  maxTilt = 4.5,
}: SectorTiltCardProps) {
  const tiltRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  const restShadow =
    '0 14px 32px -12px rgba(4, 12, 20, 0.65), 0 4px 12px -4px rgba(4, 12, 20, 0.45)';

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const el = tiltRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const px = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    const py = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1);

    const relX = px * 2 - 1;
    const relY = py * 2 - 1;

    const rotateX = -relY * maxTilt;
    const rotateY = relX * maxTilt;
    const shadowX = -relX * 12;
    const shadowY = 22 - relY * 8;

    gsap.to(el, {
      rotateX,
      rotateY,
      scale: 1.016,
      y: -4,
      duration: 0.35,
      ease: 'power2.out',
      overwrite: 'auto',
    });

    el.style.boxShadow = `${shadowX.toFixed(1)}px ${shadowY.toFixed(1)}px 44px -10px rgba(4, 12, 20, 0.85), 0 0 26px -8px rgba(3, 197, 236, 0.24)`;

    if (glareRef.current) {
      glareRef.current.style.background = `radial-gradient(340px circle at ${(px * 100).toFixed(1)}% ${(py * 100).toFixed(1)}%, rgba(3, 197, 236, 0.2), rgba(255, 255, 255, 0.06) 44%, transparent 72%)`;
      gsap.to(glareRef.current, {
        autoAlpha: 1,
        duration: 0.25,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }
  };

  const handlePointerLeave = () => {
    onHoverChange(null);
    const el = tiltRef.current;
    if (el) {
      gsap.to(el, {
        rotateX: 0,
        rotateY: 0,
        scale: 1,
        y: 0,
        duration: 0.55,
        ease: 'power3.out',
        overwrite: 'auto',
      });
      el.style.boxShadow = restShadow;
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
      ref={(el) => {
        cardRefs.current[idx] = el;
      }}
      style={{ perspective: '1200px' }}
      className={`pointer-events-auto relative h-full transition-opacity duration-300 ${
        isDimmed ? 'opacity-70' : 'opacity-100'
      }`}
    >
      <div
        ref={tiltRef}
        tabIndex={0}
        role="group"
        aria-label={`${item.sector}: ${item.numericTarget.toLocaleString('en-US')}${item.suffix}`}
        data-cursor="sector"
        data-cursor-label={item.sector}
        onMouseEnter={() => onHoverChange(idx)}
        onFocus={() => onHoverChange(idx)}
        onBlur={handlePointerLeave}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={{ boxShadow: restShadow, transformStyle: 'preserve-3d' }}
        className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border p-4 backdrop-blur-md transition-colors duration-300 outline-none will-change-transform focus-visible:ring-2 focus-visible:ring-sonar-cyan lg:p-5 ${
          isHovered
            ? 'border-sonar-cyan/60 bg-night-port/76'
            : 'border-sea-salt/15 bg-night-port/58'
        }`}
      >
        {/* Dynamic Aqua Pointer Glare Overlay */}
        <div
          ref={glareRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 rounded-2xl opacity-0"
        />

        {/* Top-Aligned Counter + Title + Hairline Rule (aligned horizontally across all 4 cards) */}
        <div className="relative z-20">
          <div className="font-display text-3xl leading-none tracking-[-0.02em] text-sea-salt tabular-nums lg:text-[2.35rem]">
            <span
              ref={(el) => {
                countSpanRefs.current[idx] = el;
              }}
            >
              {item.numericTarget.toLocaleString('en-US')}
            </span>
            {item.suffix && (
              <span className="text-sonar-cyan">{item.suffix}</span>
            )}
          </div>

          <h3 className="mt-2 font-sans text-[15px] font-semibold leading-snug tracking-[-0.01em] text-sea-salt lg:text-base">
            {item.sector}
          </h3>

          <div
            aria-hidden="true"
            className={`my-3 h-px w-full transition-colors duration-300 ${
              isHovered ? 'bg-sonar-cyan/40' : 'bg-sea-salt/15'
            }`}
          />

          <p className="font-sans text-[11.5px] leading-relaxed text-sea-salt/78 lg:text-xs">
            {item.subtypes.join(' · ')}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Section 8: Sectors
 * - Cinema-first golden-hour fleet panorama powered by `/sectors/Sectors1.mp4`.
 * - Centered header lockup over the sunset sky with a subtle top atmospheric dark gradient scrim.
 * - Unobstructed center horizon showing all four ships directly in the video loop.
 * - Four dark frosted glass cards positioned cleanly over the deep lower ocean water beneath each vessel,
 *   featuring 3D pointer hover tilt, aqua-blue hover accents, aligned horizontal dividers,
 *   and always-visible dot-separated subtypes.
 */
export function Sectors() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoWrapRef = useRef<HTMLDivElement>(null);
  const whiteEntryVeilRef = useRef<HTMLDivElement>(null);
  const goldenWarmOverlayRef = useRef<HTMLDivElement>(null);
  const daylightExitVeilRef = useRef<HTMLDivElement>(null);
  const mobileTrackRef = useRef<HTMLDivElement>(null);

  const countSpanRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const mobileCountSpanRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [mobileActiveIdx, setMobileActiveIdx] = useState(0);

  const sectionCopy = sectorsData?.section;
  const videoSrc = sectionCopy?.background_video ?? '/sectors/Sectors1.mp4';

  const sectors: SectorEntry[] = useMemo(() => {
    const raw = sectorsData?.sectors_served ?? [];
    return raw.map((item) => {
      const parsed = parseSectorCount(
        item.data,
        (item as { suffix?: string }).suffix
      );
      return {
        id:
          (item as { id?: string }).id ??
          item.sector.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        sector: item.sector,
        numericTarget: parsed.num,
        suffix: parsed.suffix,
        subtypes: (item as { subtypes?: string[] }).subtypes ?? [],
      };
    });
  }, []);

  // Pause background sea video when off-screen or tab is hidden
  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let inView = false;

    const syncPlayback = () => {
      if (prefersReducedMotion) {
        video.pause();
        return;
      }
      if (inView && document.visibilityState === 'visible') {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        inView = entry.isIntersecting;
        syncPlayback();
      },
      { threshold: 0.08 }
    );
    io.observe(section);

    document.addEventListener('visibilitychange', syncPlayback);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', syncPlayback);
    };
  }, []);

  // Track active card on mobile horizontal scroll snap
  const handleMobileScroll = () => {
    const track = mobileTrackRef.current;
    if (!track) return;
    const idx = Math.round(track.scrollLeft / Math.max(1, track.clientWidth * 0.8));
    setMobileActiveIdx(Math.max(0, Math.min(sectors.length - 1, idx)));
  };

  // GSAP Pinned 200% Scroll Choreography (entry/exit veils, optical drift, card count-up)
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

          if (reduceMotion) {
            if (whiteEntryVeilRef.current) {
              gsap.set(whiteEntryVeilRef.current, { opacity: 0 });
            }
            if (daylightExitVeilRef.current) {
              gsap.set(daylightExitVeilRef.current, { opacity: 0 });
            }
            sectors.forEach((s, idx) => {
              const formatted = s.numericTarget.toLocaleString('en-US');
              const desktopSpan = countSpanRefs.current[idx];
              const mobileSpan = mobileCountSpanRefs.current[idx];
              if (desktopSpan) desktopSpan.textContent = formatted;
              if (mobileSpan) mobileSpan.textContent = formatted;
            });
            return;
          }

          const countProxies = sectors.map(() => ({ val: 0 }));
          sectors.forEach((_, idx) => {
            const desktopSpan = countSpanRefs.current[idx];
            const mobileSpan = mobileCountSpanRefs.current[idx];
            if (desktopSpan) desktopSpan.textContent = '0';
            if (mobileSpan) mobileSpan.textContent = '0';
          });

          cardRefs.current.forEach((card) => {
            if (card) gsap.set(card, { opacity: 0, y: 24 });
          });

          const tl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: section,
              start: 'top top',
              end: '+=135%',
              pin: true,
              scrub: MOTION.scrub,
              invalidateOnRefresh: true,
              onEnter: () => {
                useAppStore.getState().setNavTheme('dark');
                useAppStore.getState().setBottomTheme('dark');
              },
              onLeaveBack: () => {
                useAppStore.getState().setNavTheme('light');
                useAppStore.getState().setBottomTheme('light');
              },
              onUpdate: (self) => {
                if (self.progress < 0.96) {
                  useAppStore.getState().setNavTheme('dark');
                  useAppStore.getState().setBottomTheme('dark');
                } else {
                  useAppStore.getState().setNavTheme('light');
                  useAppStore.getState().setBottomTheme('light');
                }
              },
            },
          });

          // Quick edge crossfade from WhyUs into Sectors as it enters the viewport (zero blank white gap)
          if (whiteEntryVeilRef.current) {
            gsap.fromTo(
              whiteEntryVeilRef.current,
              { opacity: 1 },
              {
                opacity: 0,
                ease: 'power1.out',
                scrollTrigger: {
                  trigger: section,
                  start: 'top 92%',
                  end: 'top 50%',
                  scrub: MOTION.scrub,
                  onUpdate: (self) => {
                    if (self.progress >= 0.55) {
                      useAppStore.getState().setNavTheme('dark');
                    } else {
                      useAppStore.getState().setNavTheme('light');
                    }
                    useAppStore.getState().setBottomTheme(self.progress >= 0.3 ? 'dark' : 'light');
                  },
                },
              }
            );
          }

          // 0–100%: Gentle optical drift on video layer
          if (videoWrapRef.current) {
            tl.fromTo(
              videoWrapRef.current,
              { scale: 1.035 },
              { scale: 1.0, duration: 100, ease: 'none' },
              0
            );
          }

          // 4–55%: Lower-ocean frosted cards reveal left-to-right and numbers count up
          sectors.forEach((s, idx) => {
            const startAt = 4 + idx * 11;
            const card = cardRefs.current[idx];
            const proxy = countProxies[idx];

            if (card) {
              tl.to(
                card,
                {
                  opacity: 1,
                  y: 0,
                  duration: 14,
                  ease: 'power2.out',
                },
                startAt
              );
            }

            tl.to(
              proxy,
              {
                val: s.numericTarget,
                duration: 16,
                ease: 'power2.out',
                onUpdate: () => {
                  const formatted = Math.round(proxy.val).toLocaleString('en-US');
                  const desktopSpan = countSpanRefs.current[idx];
                  const mobileSpan = mobileCountSpanRefs.current[idx];
                  if (desktopSpan) desktopSpan.textContent = formatted;
                  if (mobileSpan) mobileSpan.textContent = formatted;
                },
              },
              startAt
            );
          });

          // 55–95%: Golden-hour ambient glow deepens subtly
          if (goldenWarmOverlayRef.current) {
            tl.fromTo(
              goldenWarmOverlayRef.current,
              { opacity: 0 },
              { opacity: 0.28, duration: 40, ease: 'sine.inOut' },
              55
            );
          }

          // Subtle Sea Salt edge dissolve only as Sectors unpins and scrolls out into Network
          if (daylightExitVeilRef.current) {
            gsap.fromTo(
              daylightExitVeilRef.current,
              { opacity: 0 },
              {
                opacity: 0.85,
                ease: 'none',
                scrollTrigger: {
                  trigger: section,
                  start: 'bottom 95%',
                  end: 'bottom 25%',
                  scrub: MOTION.scrub,
                },
              }
            );
          }
        }
      );
    },
    { scope: sectionRef, dependencies: [sectors] }
  );

  return (
    <section
      ref={sectionRef}
      id="sectors"
      data-section="sectors"
      data-nav-theme="dark"
      aria-label={sectionCopy?.heading ?? 'Sectors We Serve'}
      className="relative h-[100dvh] w-full overflow-hidden bg-night-port text-sea-salt select-none"
    >
      {/* Background Golden-Hour Fleet Panorama Video (`public/sectors/Sectors1.mp4`) */}
      <div
        ref={videoWrapRef}
        className="pointer-events-none absolute inset-0 z-0 will-change-transform"
      >
        <video
          ref={videoRef}
          src={videoSrc}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          className="h-full w-full object-cover object-center"
        />

        {/* Subtle Top Dark Atmospheric Scrim for Header Readability over Sunset Sky */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[38%]"
          style={{
            background:
              'linear-gradient(to bottom, rgba(8, 20, 32, 0.72) 0%, rgba(8, 20, 32, 0.36) 55%, rgba(8, 20, 32, 0) 100%)',
          }}
        />

        {/* Subtle Bottom Water Scrim Supporting Lower Frosted Cards */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[42%]"
          style={{
            background:
              'linear-gradient(to top, rgba(8, 20, 32, 0.72) 0%, rgba(8, 20, 32, 0.32) 55%, rgba(8, 20, 32, 0) 100%)',
          }}
        />
      </div>

      {/* 60–90% Deepening Golden-Hour Warmth Overlay */}
      <div
        ref={goldenWarmOverlayRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 opacity-0"
        style={{
          background:
            'radial-gradient(90% 65% at 50% 55%, rgba(233, 199, 154, 0.45) 0%, rgba(192, 138, 62, 0.28) 54%, rgba(8, 20, 32, 0.16) 100%)',
        }}
      />

      {/* Centered Header Lockup Over Upper Sky */}
      <header className="relative z-20 mx-auto flex w-full max-w-4xl flex-col items-center px-6 pt-20 text-center sm:px-10 sm:pt-24">
        <h2 className="font-display text-3xl font-normal leading-[1.08] tracking-[-0.02em] text-sea-salt drop-shadow-[0_2px_18px_rgba(8,20,32,0.45)] sm:text-4xl lg:text-[2.75rem]">
          {sectionCopy?.heading ?? 'Sectors We Serve'}
        </h2>
        <p className="mt-2.5 max-w-xl font-sans text-sm leading-relaxed text-sea-salt/85 drop-shadow-[0_1px_10px_rgba(8,20,32,0.5)] sm:text-[15px]">
          {sectionCopy?.subtitle ??
            'We serve, supply and cater any ship requirements across various shipping sectors'}
        </p>
      </header>

      {/* DESKTOP 4-Column Dark Frosted Glass Cards Over Lower Ocean Band (md and up) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 hidden md:block lg:bottom-8">
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-4 items-stretch gap-3.5 px-6 sm:px-8 md:px-10 lg:gap-5 lg:px-12">
          {sectors.map((item, idx) => (
            <SectorTiltCard
              key={item.id}
              item={item}
              idx={idx}
              isHovered={hoveredIdx === idx}
              isDimmed={hoveredIdx !== null && hoveredIdx !== idx}
              onHoverChange={setHoveredIdx}
              cardRefs={cardRefs}
              countSpanRefs={countSpanRefs}
            />
          ))}
        </div>
      </div>

      {/* MOBILE Horizontally Swipeable Dark Frosted Glass Cards Over Lower Ocean Band (< md) */}
      <div className="absolute inset-x-0 bottom-5 z-20 md:hidden">
        <div
          ref={mobileTrackRef}
          data-lenis-prevent
          onScroll={handleMobileScroll}
          className="no-scrollbar flex w-full snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-6 pb-2"
        >
          {sectors.map((item, idx) => {
            const isFocused = idx === mobileActiveIdx;

            return (
              <div
                key={item.id}
                className={`flex w-[78vw] max-w-[320px] shrink-0 snap-center flex-col rounded-2xl border p-4 backdrop-blur-md transition-all duration-300 ${
                  isFocused
                    ? 'border-sonar-cyan/55 bg-night-port/72 shadow-[0_16px_34px_-12px_rgba(4,12,20,0.8)] opacity-100'
                    : 'border-sea-salt/15 bg-night-port/54 opacity-80'
                }`}
              >
                <div className="font-display text-3xl leading-none tracking-[-0.02em] text-sea-salt tabular-nums">
                  <span
                    ref={(el) => {
                      mobileCountSpanRefs.current[idx] = el;
                    }}
                  >
                    {item.numericTarget.toLocaleString('en-US')}
                  </span>
                  {item.suffix && (
                    <span className="text-sonar-cyan">{item.suffix}</span>
                  )}
                </div>

                <h3 className="mt-2 font-sans text-[15px] font-semibold leading-snug tracking-[-0.01em] text-sea-salt">
                  {item.sector}
                </h3>

                <div
                  aria-hidden="true"
                  className="my-3 h-px w-full bg-sea-salt/15"
                />

                <p className="font-sans text-[11.5px] leading-relaxed text-sea-salt/78">
                  {item.subtypes.join(' · ')}
                </p>
              </div>
            );
          })}
        </div>

        {/* Quiet Mobile Scroll Indicator Dots */}
        <div className="mt-2 flex justify-center gap-1.5" aria-hidden="true">
          {sectors.map((item, idx) => (
            <span
              key={item.id}
              className={`h-1 rounded-full transition-all duration-300 ${
                idx === mobileActiveIdx
                  ? 'w-5 bg-sonar-cyan'
                  : 'w-1.5 bg-sea-salt/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Quick Edge Crossfade Entry Veil from WhyUs */}
      <div
        ref={whiteEntryVeilRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-30 bg-sea-salt opacity-0"
      />

      {/* Soft Exit Veil as Sectors Unpins into Network */}
      <div
        ref={daylightExitVeilRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-30 bg-sea-salt opacity-0"
      />
    </section>
  );
}

export default Sectors;
