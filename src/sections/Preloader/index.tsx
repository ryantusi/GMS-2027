import { useEffect, useRef, useState } from 'react';
import { gsap, useGSAP, MOTION } from '../../lib/scroll';
import { useAppStore } from '../../lib/store';
import { stopLenis, startLenis } from '../../lib/lenis';
import siteData from '../../content/site.json';

interface BubbleSpec {
  id: number;
  cx: number;
  r: number;
  duration: number;
  delay: number;
  driftX: number;
}

const DESKTOP_BUBBLES: BubbleSpec[] = [
  { id: 1, cx: 34, r: 2.2, duration: 2.1, delay: 0.0, driftX: 4 },
  { id: 2, cx: 52, r: 1.6, duration: 1.8, delay: 0.3, driftX: -3 },
  { id: 3, cx: 68, r: 2.8, duration: 2.4, delay: 0.6, driftX: 5 },
  { id: 4, cx: 84, r: 1.8, duration: 1.9, delay: 0.15, driftX: -4 },
  { id: 5, cx: 98, r: 2.4, duration: 2.2, delay: 0.45, driftX: 3 },
  { id: 6, cx: 114, r: 1.5, duration: 1.7, delay: 0.75, driftX: -3 },
  { id: 7, cx: 128, r: 2.1, duration: 2.3, delay: 0.2, driftX: 4 },
  { id: 8, cx: 60, r: 1.4, duration: 2.0, delay: 0.9, driftX: -2 },
];

const MOBILE_BUBBLES: BubbleSpec[] = DESKTOP_BUBBLES.slice(0, 4);

/**
 * Section 1: Preloader (DESIGN.md Section 1)
 * - Full-viewport Sea Salt screen with a 160px (120px mobile) circular porthole outlined in Signal Blue.
 * - Inside the porthole, water rises from 0% to 100% tracking real asset loading (`loadProgress` in store):
 *   fonts, Hero idle loop (`canplaythrough`), Frame 1, and sparse Hero frames.
 * - Two sine-wave surfaces drift in opposite directions with rising bubbles.
 * - Guards: minimum 1.2s display so it never flashes; maximum 8s timeout so a slow connection still enters.
 * - Exit: water completes fill with slight overshoot, logo and counter fade, and the whole screen crossfades
 *   out (--dur-slow) into the Hero already playing underneath.
 */
export function Preloader() {
  const isPreloaded = useAppStore((s) => s.isPreloaded);
  const skipPreloader = useAppStore((s) => s.skipPreloader);
  const realProgress = useAppStore((s) => s.loadProgress);
  const setPreloaded = useAppStore((s) => s.setPreloaded);
  const setLoadProgress = useAppStore((s) => s.setLoadProgress);

  const rootRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const counterRef = useRef<HTMLParagraphElement>(null);
  const waterFillRef = useRef<SVGGElement>(null);
  const waveFrontRef = useRef<SVGPathElement>(null);
  const waveBackRef = useRef<SVGPathElement>(null);
  const bubblesGroupRef = useRef<SVGGElement>(null);

  const [displayPct, setDisplayPct] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const preloaderCfg = siteData?.preloader;
  const companyName = siteData?.website_info?.company_name ?? '';
  const loadingPrefix = preloaderCfg?.loading_prefix ?? 'Loading';
  const logoSrc = preloaderCfg?.logo ?? '/logos/logo-trans.png';
  const minDurationMs = preloaderCfg?.min_duration_ms ?? 1200;
  const maxTimeoutMs = preloaderCfg?.max_timeout_ms ?? 8000;

  const realProgressRef = useRef(realProgress);
  useEffect(() => {
    realProgressRef.current = realProgress;
  }, [realProgress]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Immediate bypass when ?skipPreloader is present
  useEffect(() => {
    if (skipPreloader && !isPreloaded) {
      setLoadProgress(100);
      setPreloaded(true);
      startLenis();
    }
  }, [skipPreloader, isPreloaded, setLoadProgress, setPreloaded]);

  useGSAP(
    () => {
      if (skipPreloader || isPreloaded) return;

      const root = rootRef.current;
      if (!root) return;

      stopLenis();

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Continuous counter-drifting sine waves & rising bubbles (when motion is allowed)
      const waveTweens: gsap.core.Tween[] = [];
      if (!prefersReducedMotion) {
        if (waveFrontRef.current) {
          waveTweens.push(
            gsap.to(waveFrontRef.current, {
              x: -160,
              duration: 2.2,
              ease: 'none',
              repeat: -1,
            })
          );
        }
        if (waveBackRef.current) {
          waveTweens.push(
            gsap.fromTo(
              waveBackRef.current,
              { x: -160 },
              {
                x: 0,
                duration: 2.9,
                ease: 'none',
                repeat: -1,
              }
            )
          );
        }

        if (bubblesGroupRef.current) {
          const bubbleNodes =
            bubblesGroupRef.current.querySelectorAll<SVGCircleElement>('.preloader-bubble');
          bubbleNodes.forEach((node, idx) => {
            const spec = DESKTOP_BUBBLES[idx] ?? DESKTOP_BUBBLES[0];
            waveTweens.push(
              gsap.fromTo(
                node,
                { y: 155, x: 0, opacity: 0 },
                {
                  y: 20,
                  x: spec.driftX,
                  opacity: 0.65,
                  duration: spec.duration,
                  delay: spec.delay,
                  ease: 'sine.inOut',
                  repeat: -1,
                  onRepeat() {
                    gsap.set(node, { y: 155, opacity: 0 });
                  },
                }
              )
            );
          });
        }
      }

      const startTime = performance.now();
      let currentVisualPct = 0;
      let exitTriggered = false;

      // Maximum 8s safety timeout so slow connections still enter while remaining frames stream in
      const maxTimeoutId = window.setTimeout(() => {
        realProgressRef.current = 100;
        setLoadProgress(100);
      }, maxTimeoutMs);

      const triggerExit = () => {
        if (exitTriggered) return;
        exitTriggered = true;
        window.clearTimeout(maxTimeoutId);
        gsap.ticker.remove(onTick);

        const tl = gsap.timeline({
          onComplete: () => {
            waveTweens.forEach((t) => t.kill());
            startLenis();
            setPreloaded(true);
          },
        });

        // 1. Water completes fill with a slight upward overshoot past the top rim of the porthole
        if (waterFillRef.current && !prefersReducedMotion) {
          tl.to(
            waterFillRef.current,
            {
              y: -14,
              duration: 0.32,
              ease: 'back.out(1.6)',
            },
            0
          );
        } else if (waterFillRef.current) {
          gsap.set(waterFillRef.current, { y: 0 });
        }

        // 2. Logo and tabular counter fade cleanly first
        tl.to(
          [logoRef.current, counterRef.current],
          {
            autoAlpha: 0,
            y: -6,
            duration: MOTION.durFast,
            ease: MOTION.easeOut,
          },
          0.12
        );

        // 3. Whole preloader cross-fades out into the Hero already running underneath
        tl.to(
          root,
          {
            autoAlpha: 0,
            duration: MOTION.durSlow,
            ease: MOTION.easeOut,
          },
          0.24
        );
      };

      const onTick = () => {
        const elapsed = performance.now() - startTime;
        // Minimum duration guard (1.2s): progress ceiling rises from 0 -> 100 over minDurationMs
        const timeCeiling = Math.min(100, (elapsed / minDurationMs) * 100);
        // If maxTimeoutMs reached, force target to 100
        const rawReal = elapsed >= maxTimeoutMs ? 100 : realProgressRef.current;
        const targetPct = Math.min(rawReal, timeCeiling);

        // Smooth interpolation toward targetPct
        currentVisualPct += (targetPct - currentVisualPct) * 0.18;
        if (targetPct >= 100 && currentVisualPct > 99.2) {
          currentVisualPct = 100;
        }

        const rounded = Math.min(100, Math.round(currentVisualPct));
        setDisplayPct(rounded);

        // Position water inside the 160x160 SVG coordinate space:
        // At 0% progress -> water top sits at y = 160 (bottom of porthole)
        // At 100% progress -> water top sits at y = 0 (top of porthole)
        if (waterFillRef.current) {
          const waterY = 160 - (currentVisualPct / 100) * 160;
          gsap.set(waterFillRef.current, { y: waterY });
        }

        if (
          currentVisualPct >= 100 &&
          elapsed >= minDurationMs &&
          (rawReal >= 100 || elapsed >= maxTimeoutMs)
        ) {
          triggerExit();
        }
      };

      gsap.ticker.add(onTick);

      return () => {
        window.clearTimeout(maxTimeoutId);
        gsap.ticker.remove(onTick);
        waveTweens.forEach((t) => t.kill());
      };
    },
    { scope: rootRef, dependencies: [skipPreloader, isPreloaded] }
  );

  if (skipPreloader || isPreloaded) return null;

  const activeBubbles = isMobile ? MOBILE_BUBBLES : DESKTOP_BUBBLES;

  return (
    <div
      ref={rootRef}
      data-nav-theme="light"
      role="status"
      aria-live="polite"
      aria-label={`${loadingPrefix} ${displayPct}%`}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-sea-salt text-deep-hull select-none"
    >
      {/* Brand Logo above the porthole */}
      <img
        ref={logoRef}
        src={logoSrc}
        alt={companyName}
        className="mb-8 h-11 md:h-13 w-auto object-contain"
      />

      {/* Circular Porthole: 120px on mobile, 160px on desktop */}
      <div className="relative h-[120px] w-[120px] md:h-[160px] md:w-[160px] rounded-full shadow-lg">
        <svg
          viewBox="0 0 160 160"
          className="h-full w-full overflow-hidden rounded-full"
          aria-hidden="true"
        >
          <defs>
            <clipPath id="preloader-porthole-clip">
              <circle cx="80" cy="80" r="78" />
            </clipPath>
            <linearGradient id="preloader-water-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--signal-blue)" stopOpacity="0.88" />
              <stop offset="100%" stopColor="var(--deep-hull)" stopOpacity="0.96" />
            </linearGradient>
          </defs>

          {/* Subtle Harbour Mist interior backing */}
          <circle
            cx="80"
            cy="80"
            r="78"
            fill="var(--harbour-mist)"
            fillOpacity="0.32"
          />

          {/* Clipped rising water & bubbles */}
          <g clipPath="url(#preloader-porthole-clip)">
            {/* Subtle porthole horizon hairline */}
            <line
              x1="12"
              y1="80"
              x2="148"
              y2="80"
              stroke="var(--signal-blue)"
              strokeOpacity="0.14"
              strokeWidth="1"
              strokeDasharray="3 3"
            />

            {/* Water group translated vertically from y=160 (0%) to y=0 (100%) */}
            <g ref={waterFillRef} transform="translate(0, 160)">
              {/* Back counter-drifting sine wave */}
              <path
                ref={waveBackRef}
                d="M 0 0 Q 20 -7 40 0 T 80 0 T 120 0 T 160 0 T 200 0 T 240 0 T 280 0 T 320 0 V 200 H 0 Z"
                fill="var(--deep-teal)"
                fillOpacity="0.45"
              />

              {/* Front primary sine wave */}
              <path
                ref={waveFrontRef}
                d="M 0 2 Q 20 9 40 2 T 80 2 T 120 2 T 160 2 T 200 2 T 240 2 T 280 2 T 320 2 V 200 H 0 Z"
                fill="url(#preloader-water-grad)"
              />

              {/* Rising bubbles inside the water column */}
              <g ref={bubblesGroupRef}>
                {activeBubbles.map((b) => (
                  <circle
                    key={b.id}
                    className="preloader-bubble"
                    cx={b.cx}
                    cy="150"
                    r={b.r}
                    fill="var(--sea-salt)"
                    fillOpacity="0.55"
                  />
                ))}
              </g>
            </g>
          </g>

          {/* Thin Signal Blue porthole outer stroke */}
          <circle
            cx="80"
            cy="80"
            r="78.5"
            fill="none"
            stroke="var(--signal-blue)"
            strokeWidth="1.5"
            strokeOpacity="0.78"
          />
          {/* Inner subtle bezel ring */}
          <circle
            cx="80"
            cy="80"
            r="74"
            fill="none"
            stroke="var(--signal-blue)"
            strokeWidth="0.75"
            strokeOpacity="0.22"
          />
        </svg>
      </div>

      {/* Tabular percentage counter below the circle */}
      <p
        ref={counterRef}
        className="mt-6 font-sans text-sm font-medium tracking-wide tabular-nums text-deep-hull/85"
      >
        {loadingPrefix} {displayPct}%
      </p>
    </div>
  );
}

export default Preloader;
