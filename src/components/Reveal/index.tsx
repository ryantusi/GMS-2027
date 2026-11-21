import { useRef, type ReactNode } from 'react';
import { gsap, SplitText, useGSAP, MOTION } from '../../lib/scroll';

export interface MaskedLinesProps {
  children: string;
  as?: 'p' | 'div' | 'span' | 'h3';
  className?: string;
  stagger?: number;
}

/**
 * Reveal primitive (DESIGN.md 1.6):
 * Splits text by lines with overflow masks and slides each line up smoothly on view.
 */
export function MaskedLines({
  children,
  as: Tag = 'p',
  className = '',
  stagger = 0.06,
}: MaskedLinesProps) {
  const textRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!textRef.current) return;

      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        if (!textRef.current) return;
        const split = SplitText.create(textRef.current, {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit(self) {
            return gsap.from(self.lines, {
              yPercent: 105,
              duration: MOTION.durBase,
              ease: MOTION.easeOut,
              stagger,
              scrollTrigger: {
                trigger: textRef.current,
                start: 'top 88%',
                once: true,
              },
            });
          },
        });

        return () => split.revert();
      });

      return () => mm.revert();
    },
    { scope: textRef, dependencies: [children, stagger] }
  );

  return (
    <Tag ref={textRef as never} className={className}>
      {children}
    </Tag>
  );
}

export interface StaggerGroupProps {
  children: ReactNode;
  className?: string;
  selector?: string;
  stagger?: number;
  yOffset?: number;
}

/**
 * Reveal primitive (DESIGN.md 1.6):
 * Reveals child items with a gentle transform + autoAlpha stagger for quiet sections.
 */
export function StaggerGroup({
  children,
  className = '',
  selector = '[data-reveal-item]',
  stagger = 0.08,
  yOffset = 20,
}: StaggerGroupProps) {
  const groupRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!groupRef.current) return;

      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const items = groupRef.current?.querySelectorAll(selector);
        if (!items || items.length === 0) return;

        gsap.from(items, {
          y: yOffset,
          autoAlpha: 0,
          duration: MOTION.durBase,
          ease: MOTION.easeOut,
          stagger,
          scrollTrigger: {
            trigger: groupRef.current,
            start: 'top 85%',
            once: true,
          },
        });
      });

      return () => mm.revert();
    },
    { scope: groupRef, dependencies: [selector, stagger, yOffset] }
  );

  return (
    <div ref={groupRef} className={className}>
      {children}
    </div>
  );
}
