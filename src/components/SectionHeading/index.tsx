import { useRef, type ElementType } from 'react';
import { gsap, SplitText, useGSAP, MOTION } from '../../lib/scroll';

export interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  as?: 'h1' | 'h2' | 'h3';
  theme?: 'light' | 'dark';
  align?: 'left' | 'center';
  className?: string;
}

/**
 * Shared SectionHeading component (DESIGN.md 1.6):
 * Display heading in Gambetta plus optional eyebrow label and supporting line,
 * with a masked line-reveal entrance (each line slides up from behind a hidden edge, staggered).
 */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  as = 'h2',
  theme = 'light',
  align = 'left',
  className = '',
}: SectionHeadingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);

  const HeadingTag: ElementType = as;
  const isDark = theme === 'dark';

  useGSAP(
    () => {
      if (!headingRef.current) return;

      const mm = gsap.matchMedia();

      mm.add(
        {
          canAnimate: '(prefers-reduced-motion: no-preference)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const { reduceMotion } = context.conditions ?? {};
          if (reduceMotion || !headingRef.current) return;

          const split = SplitText.create(headingRef.current, {
            type: 'lines',
            mask: 'lines',
            autoSplit: true,
            onSplit(self) {
              const tl = gsap.timeline({
                scrollTrigger: {
                  trigger: containerRef.current,
                  start: 'top 85%',
                  once: true,
                },
              });

              tl.from(self.lines, {
                yPercent: 105,
                duration: MOTION.durSlow,
                ease: MOTION.easeOut,
                stagger: 0.08,
              });

              if (subtitleRef.current) {
                tl.from(
                  subtitleRef.current,
                  {
                    y: 16,
                    autoAlpha: 0,
                    duration: MOTION.durBase,
                    ease: MOTION.easeOut,
                  },
                  '-=0.8'
                );
              }

              return tl;
            },
          });

          return () => split.revert();
        }
      );

      return () => mm.revert();
    },
    { scope: containerRef, dependencies: [title, subtitle] }
  );

  const alignClass = align === 'center' ? 'items-center text-center' : 'items-start text-left';
  const headingColor = isDark ? 'text-sea-salt' : 'text-deep-hull';
  const subtitleColor = isDark ? 'text-sea-salt/75' : 'text-deep-hull/75';
  const eyebrowColor = isDark ? 'text-sonar-cyan' : 'text-deep-teal';

  return (
    <div ref={containerRef} className={`flex flex-col ${alignClass} ${className}`}>
      {eyebrow && (
        <span className={`mb-3 font-sans text-sm font-medium ${eyebrowColor}`}>
          {eyebrow}
        </span>
      )}
      <HeadingTag
        ref={headingRef}
        className={`font-display text-[length:var(--text-xl)] md:text-[length:var(--text-2xl)] font-normal leading-[1.06] tracking-tight ${headingColor}`}
      >
        {title}
      </HeadingTag>
      {subtitle && (
        <p
          ref={subtitleRef}
          className={`mt-4 max-w-[65ch] font-sans text-[length:var(--text-sm)] md:text-[length:var(--text-md)] leading-relaxed ${subtitleColor}`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default SectionHeading;
