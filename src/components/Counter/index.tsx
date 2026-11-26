import { useRef } from 'react';
import { gsap, useGSAP, MOTION } from '../../lib/scroll';

export interface CounterProps {
  value: number | string;
  label?: string;
  suffix?: string;
  duration?: number;
  ease?: string;
  className?: string;
  numberClassName?: string;
  labelClassName?: string;
}

/**
 * Shared Counter component (DESIGN.md 1.6):
 * Counts to a target when it first enters view (--dur-slow, --ease-out, tabular figures),
 * with the final value rendered in the DOM from the start for screen readers and reduced motion.
 */
export function Counter({
  value,
  label,
  suffix: explicitSuffix,
  duration = MOTION.durSlow,
  ease = MOTION.easeOut,
  className = '',
  numberClassName = '',
  labelClassName = '',
}: CounterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animatedSpanRef = useRef<HTMLSpanElement>(null);

  // Parse numeric target and any trailing symbol (e.g., "15+" -> 15 and "+")
  const rawString = String(value ?? '0');
  const numericMatch = rawString.match(/[\d,]+(\.\d+)?/);
  const numericTarget = numericMatch
    ? parseFloat(numericMatch[0].replace(/,/g, ''))
    : 0;
  const parsedSuffix =
    explicitSuffix !== undefined
      ? explicitSuffix
      : rawString.replace(/[\d,.]+/g, '').trim() || (typeof value === 'number' ? '+' : '');

  const formattedFinal = `${numericTarget.toLocaleString('en-US')}${parsedSuffix}`;

  useGSAP(
    () => {
      const el = animatedSpanRef.current;
      if (!el || numericTarget <= 0) return;

      const mm = gsap.matchMedia();

      mm.add(
        {
          canAnimate: '(prefers-reduced-motion: no-preference)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const { reduceMotion } = context.conditions ?? {};
          if (reduceMotion) {
            el.textContent = formattedFinal;
            return;
          }

          const proxy = { val: 0 };
          el.textContent = `0${parsedSuffix}`;

          gsap.to(proxy, {
            val: numericTarget,
            duration,
            ease,
            scrollTrigger: {
              trigger: containerRef.current,
              start: 'top 85%',
              toggleActions: 'restart reset restart reset',
              onLeave: () => {
                proxy.val = 0;
                el.textContent = `0${parsedSuffix}`;
              },
              onLeaveBack: () => {
                proxy.val = 0;
                el.textContent = `0${parsedSuffix}`;
              },
            },
            onUpdate: () => {
              const current = Math.round(proxy.val);
              el.textContent = `${current.toLocaleString('en-US')}${parsedSuffix}`;
            },
            onComplete: () => {
              el.textContent = formattedFinal;
            },
          });
        }
      );

      return () => mm.revert();
    },
    { scope: containerRef, dependencies: [numericTarget, parsedSuffix, formattedFinal, duration, ease] }
  );

  return (
    <div ref={containerRef} className={`flex flex-col ${className}`}>
      {/* Screen-reader accessible final value from the start */}
      <span className="sr-only">
        {formattedFinal} {label ?? ''}
      </span>
      <span
        ref={animatedSpanRef}
        aria-hidden="true"
        className={`font-display tabular-nums leading-none tracking-tight ${numberClassName}`}
      >
        {formattedFinal}
      </span>
      {label && (
        <span className={`mt-2 font-sans text-sm md:text-base ${labelClassName}`}>
          {label}
        </span>
      )}
    </div>
  );
}

export default Counter;
