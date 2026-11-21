import {
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  ArrowRight,
  Clock,
  Coins,
  GlobeHemisphereWest,
  SealCheck,
} from '@phosphor-icons/react';
import { gsap, useGSAP, MOTION } from '../../lib/scroll';
import { scrollToTarget } from '../../lib/lenis';
import whyData from '../../content/why.json';

type CardVariant = 'light' | 'dark' | 'blue';
type CardSpan = 'long' | 'short';

interface WhyItem {
  id: string;
  variant: CardVariant;
  span: CardSpan;
  icon: string;
  href: string;
  feature: string;
  description: string;
}

const ICON_MAP: Record<
  string,
  ComponentType<{ size?: number; weight?: 'regular' | 'duotone' | 'bold'; className?: string }>
> = {
  quality: SealCheck,
  clock: Clock,
  pricing: Coins,
  network: GlobeHemisphereWest,
};

interface WhyFlipTiltCardProps {
  item: WhyItem;
  isFlipped: boolean;
  onToggleFlip: () => void;
  className?: string;
  maxTilt?: number;
}

/**
 * Interactive 3D Flip + 3D Hover Tilt Card:
 * - Outer slot provides clean CSS `perspective: 1200px` (never rotated or overflow-clipped)
 * - Middle `tiltRef` handles Hero bento-style pointer 3D tilt & subtle hover lift
 * - Inner `flipRef` rotates `rotateY: 0 <-> 180deg` on click with `preserve-3d`
 * - Front (`rotateY(0deg) translateZ(1px)`) and Back (`rotateY(180deg) translateZ(1px)`)
 *   use `backface-visibility: hidden` + `overflow-hidden` strictly per-face so content
 *   never mirrors and swaps crisply mid-flip without requiring mouse movement.
 */
function WhyFlipTiltCard({
  item,
  isFlipped,
  onToggleFlip,
  className = '',
  maxTilt = 4,
}: WhyFlipTiltCardProps) {
  const tiltRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<HTMLDivElement>(null);
  const frontFaceRef = useRef<HTMLDivElement>(null);
  const backFaceRef = useRef<HTMLDivElement>(null);
  const frontGlareRef = useRef<HTMLDivElement>(null);
  const backGlareRef = useRef<HTMLDivElement>(null);

  const IconComp = ICON_MAP[item.icon] ?? SealCheck;
  const isDarkVariant = item.variant === 'dark' || item.variant === 'blue';

  const restShadow = isDarkVariant
    ? '0 20px 40px -12px rgba(8, 20, 32, 0.28), 0 6px 16px -4px rgba(8, 20, 32, 0.16)'
    : '0 20px 40px -12px rgba(8, 20, 32, 0.12), 0 6px 16px -4px rgba(14, 34, 51, 0.06)';

  const surfaceClasses =
    item.variant === 'dark'
      ? 'bg-night-port text-sea-salt border border-white/10'
      : item.variant === 'blue'
        ? 'bg-[#0B4168] text-sea-salt border border-white/12'
        : 'bg-white text-deep-hull border border-deep-hull/10';

  const iconBadgeClasses = isDarkVariant
    ? 'bg-white/10 border border-white/15 text-sonar-cyan'
    : 'bg-harbour-mist/55 border border-signal-blue/12 text-signal-blue';

  // Smooth 3D flip animation driven strictly by `rotateY` inside outer `perspective: 1200px`
  useGSAP(
    () => {
      const stage = flipRef.current;
      if (!stage) return;

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion) {
        gsap.set(stage, {
          rotateY: isFlipped ? 180 : 0,
        });
        return;
      }

      gsap.to(stage, {
        rotateY: isFlipped ? 180 : 0,
        duration: 0.72,
        ease: 'power3.inOut',
        overwrite: 'auto',
      });
    },
    { scope: tiltRef, dependencies: [isFlipped] }
  );

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
    const shadowX = -relX * 14;
    const shadowY = 24 - relY * 10;

    gsap.to(el, {
      rotateX,
      rotateY,
      scale: 1.014,
      y: -4,
      duration: 0.35,
      ease: 'power2.out',
      overwrite: 'auto',
    });

    const activeShadow = isDarkVariant
      ? `${shadowX.toFixed(1)}px ${shadowY.toFixed(1)}px 48px -10px rgba(8, 20, 32, 0.42), 0 12px 24px -6px rgba(8, 20, 32, 0.24)`
      : `${shadowX.toFixed(1)}px ${shadowY.toFixed(1)}px 48px -10px rgba(8, 20, 32, 0.22), 0 12px 24px -6px rgba(14, 34, 51, 0.11)`;

    const activeFace = isFlipped ? backFaceRef.current : frontFaceRef.current;
    if (activeFace) {
      activeFace.style.boxShadow = activeShadow;
    }

    const pctX = (isFlipped ? 1 - px : px) * 100;
    const pctY = py * 100;
    const activeGlare = isFlipped ? backGlareRef.current : frontGlareRef.current;

    if (activeGlare) {
      activeGlare.style.background = isDarkVariant
        ? `radial-gradient(420px circle at ${pctX.toFixed(1)}% ${pctY.toFixed(1)}%, rgba(3, 197, 236, 0.18), rgba(255, 255, 255, 0.08) 42%, transparent 72%)`
        : `radial-gradient(420px circle at ${pctX.toFixed(1)}% ${pctY.toFixed(1)}%, rgba(255, 255, 255, 0.9), rgba(224, 242, 254, 0.24) 42%, transparent 72%)`;
      gsap.to(activeGlare, {
        autoAlpha: 1,
        duration: 0.25,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }
  };

  const handlePointerLeave = () => {
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
    }
    if (frontFaceRef.current) frontFaceRef.current.style.boxShadow = restShadow;
    if (backFaceRef.current) backFaceRef.current.style.boxShadow = restShadow;

    [frontGlareRef.current, backGlareRef.current].forEach((glareEl) => {
      if (glareEl) {
        gsap.to(glareEl, {
          autoAlpha: 0,
          duration: 0.4,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }
    });
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggleFlip();
    }
  };

  return (
    <div
      style={{ perspective: '1200px' }}
      className={`why-card relative h-[195px] sm:h-[200px] lg:h-[210px] ${className}`}
    >
      {/* Hover 3D Tilt Wrapper (no overflow-hidden so preserve-3d stays intact) */}
      <div
        ref={tiltRef}
        role="button"
        tabIndex={0}
        aria-pressed={isFlipped}
        aria-label={`${item.feature}. ${isFlipped ? 'Click to flip card back' : 'Click to read details'}`}
        data-cursor="view"
        onClick={onToggleFlip}
        onKeyDown={handleKeyDown}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={{ transformStyle: 'preserve-3d' }}
        className="group relative h-full w-full rounded-3xl cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-sonar-cyan focus-visible:ring-offset-2 will-change-transform"
      >
        {/* Inner 3D Flipping Stage */}
        <div
          ref={flipRef}
          style={{ transformStyle: 'preserve-3d' }}
          className="relative h-full w-full will-change-transform"
        >
          {/* Front Face: Icon + Title Only */}
          <div
            ref={frontFaceRef}
            style={{
              transform: 'rotateY(0deg) translateZ(1px)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              boxShadow: restShadow,
            }}
            className={`absolute inset-0 overflow-hidden rounded-3xl p-6 md:p-7 flex flex-col justify-between ${surfaceClasses} ${
              isFlipped ? 'pointer-events-none' : 'pointer-events-auto'
            }`}
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBadgeClasses}`}
            >
              <IconComp size={22} weight="duotone" />
            </span>

            <h3
              className={`font-display text-[length:clamp(1.25rem,1.75vw,1.6rem)] font-normal tracking-[-0.015em] leading-snug text-balance ${
                isDarkVariant ? 'text-sea-salt' : 'text-deep-hull'
              }`}
            >
              {item.feature}
            </h3>

            <div
              ref={frontGlareRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-20 opacity-0 mix-blend-soft-light"
            />
          </div>

          {/* Back Face: Full Description + Learn More Button */}
          <div
            ref={backFaceRef}
            style={{
              transform: 'rotateY(180deg) translateZ(1px)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              boxShadow: restShadow,
            }}
            className={`absolute inset-0 overflow-hidden rounded-3xl p-5 sm:p-6 md:p-7 flex flex-col justify-between gap-3 ${surfaceClasses} ${
              isFlipped ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
          >
            <p
              className={`font-sans text-[13.5px] sm:text-[14px] lg:text-[14.5px] leading-relaxed ${
                isDarkVariant ? 'text-sea-salt/85' : 'text-deep-hull/80'
              }`}
            >
              {item.description}
            </p>

            <div className="flex items-center justify-start pt-1">
              <a
                href={item.href}
                tabIndex={isFlipped ? 0 : -1}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  scrollToTarget(item.href);
                }}
                className={`group/btn inline-flex items-center gap-2 rounded-full px-4 py-2 font-sans text-xs font-semibold tracking-wide transition-all duration-200 whitespace-nowrap shrink-0 ${
                  isDarkVariant
                    ? 'bg-sea-salt text-deep-hull hover:bg-sonar-cyan hover:text-night-port shadow-sm'
                    : 'bg-deep-hull text-sea-salt hover:bg-signal-blue shadow-sm'
                }`}
              >
                <span>Learn More</span>
                <ArrowRight
                  size={14}
                  weight="bold"
                  className="transition-transform duration-200 group-hover/btn:translate-x-0.5"
                />
              </a>
            </div>

            <div
              ref={backGlareRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-20 opacity-0 mix-blend-soft-light"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Section 7: Why Choose Us
 * - Uniform Sea Salt (`--sea-salt`) single-frame showcase (`min-h-[100dvh]`, `data-nav-theme="light"`).
 * - Mirrored diagonal 4-card bento grid (7/5 top row + 5/7 bottom row) fitting completely in one viewport:
 *   - Front face: icon + heading only
 *   - Click toggles smooth 3D card flip (`rotateY: 180deg`) to reveal description + "Learn More" button
 *   - Click again flips smoothly back to front
 *   - Pointer hover adds Bento-style 3D perspective tilt and glare
 */
export function WhyUs() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [flippedMap, setFlippedMap] = useState<Record<string, boolean>>({});

  const sectionCopy = whyData?.section;
  const items = (whyData?.why_choose_us ?? []) as WhyItem[];

  const toggleCardFlip = (id: string) => {
    setFlippedMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

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
          const cards = gridRef.current?.querySelectorAll<HTMLElement>('.why-card');

          if (reduceMotion) {
            if (headerRef.current) gsap.set(headerRef.current, { autoAlpha: 1, y: 0 });
            if (cards?.length) gsap.set(cards, { autoAlpha: 1, y: 0 });
            return;
          }

          if (headerRef.current) {
            gsap.fromTo(
              headerRef.current,
              { y: 20, autoAlpha: 0 },
              {
                y: 0,
                autoAlpha: 1,
                duration: MOTION.durBase,
                ease: MOTION.easeOut,
                scrollTrigger: {
                  trigger: section,
                  start: 'top 80%',
                  once: true,
                },
              }
            );
          }

          if (cards && cards.length > 0) {
            gsap.fromTo(
              cards,
              { y: 24, autoAlpha: 0 },
              {
                y: 0,
                autoAlpha: 1,
                duration: MOTION.durBase,
                ease: MOTION.easeOut,
                stagger: 0.08,
                clearProps: 'transform,opacity,visibility',
                scrollTrigger: {
                  trigger: gridRef.current,
                  start: 'top 82%',
                  once: true,
                },
              }
            );
          }
        }
      );

      return () => mm.revert();
    },
    { scope: sectionRef }
  );

  const getSpanClasses = (span: CardSpan) =>
    span === 'long' ? 'lg:col-span-7' : 'lg:col-span-5';

  return (
    <section
      ref={sectionRef}
      id="why-us"
      data-section="why-us"
      data-nav-theme="light"
      aria-label={sectionCopy?.heading ?? 'Why Choose Us?'}
      className="relative min-h-[100dvh] w-full flex items-center bg-sea-salt text-deep-hull pt-20 pb-8 md:pt-20 md:pb-8 overflow-hidden"
    >
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-10 md:px-12 lg:px-16">
        {/* Centered Header Lockup */}
        <div
          ref={headerRef}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="font-display text-[length:clamp(1.8rem,3vw,2.6rem)] font-normal tracking-[-0.02em] text-deep-hull leading-[1.1] text-balance">
            {sectionCopy?.heading}
          </h2>
          {sectionCopy?.subtitle && (
            <p className="mt-2.5 mx-auto max-w-2xl font-sans text-sm md:text-[15px] text-deep-hull/75 leading-relaxed">
              {sectionCopy.subtitle}
            </p>
          )}
        </div>

        {/* Mirrored Diagonal 4-Card 3D Flip Bento Grid fitting cleanly in one viewport */}
        <div
          ref={gridRef}
          className="mt-6 md:mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 lg:gap-5"
        >
          {items.map((item) => (
            <WhyFlipTiltCard
              key={item.id}
              item={item}
              isFlipped={Boolean(flippedMap[item.id])}
              onToggleFlip={() => toggleCardFlip(item.id)}
              maxTilt={4}
              className={getSpanClasses(item.span)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default WhyUs;
