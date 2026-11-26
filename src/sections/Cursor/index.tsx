import { useEffect, useRef, useState } from 'react';
import { gsap, useGSAP } from '../../lib/scroll';
import { useAppStore } from '../../lib/store';

type CursorMode = 'default' | 'hover' | 'input';

/**
 * Global Custom Cursor (desktop fine-pointer only):
 * - Two parts:
 *   1. Small dot (6px) following pointer almost instantly (~0.08s).
 *   2. Ring (34px, 1px stroke) following with a smooth liquid delay (~0.35s).
 * - On hover (links, buttons, tabs, interactive cards):
 *   - Circle ring smoothly grows (from 34px to 52px).
 *   - Inner dot smoothly shrinks (from 6px to 3px).
 *   - Absolutely NO text or velocity lines. Clean, minimalist, and responsive.
 * - Adaptive colour:
 *   - Light in Hero section (since Hero is a dark ocean theme) and in dark sections:
 *     Glowing Sonar Cyan dot + soft Sea Salt white ring.
 *   - Dark in light sections (About, Stores, etc.):
 *     Deep Teal dot + Deep Teal ring.
 * - Text inputs: both smoothly hide to restore the native text caret.
 * - Mouse down: ring slightly compresses and springs back.
 */
export function Cursor() {
  const rootRef = useRef<HTMLDivElement>(null);
  const dotPosRef = useRef<HTMLDivElement>(null);
  const dotShapeRef = useRef<HTMLDivElement>(null);
  const ringPosRef = useRef<HTMLDivElement>(null);
  const ringShapeRef = useRef<HTMLDivElement>(null);

  const navTheme = useAppStore((s) => s.navTheme);
  const activeSection = useAppStore((s) => s.activeSection);
  const isHeroPinned = useAppStore((s) => s.isHeroPinned);
  const activeDialog = useAppStore((s) => s.activeDialog);

  const [isFinePointer, setIsFinePointer] = useState(false);
  const [cursorMode, setCursorMode] = useState<CursorMode>('default');
  const [isPressed, setIsPressed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Detect @media (pointer: fine) and toggle html.has-custom-cursor
  useEffect(() => {
    const mql = window.matchMedia('(pointer: fine)');
    const updateMatch = () => {
      setIsFinePointer(mql.matches);
      if (mql.matches) {
        document.documentElement.classList.add('has-custom-cursor');
      } else {
        document.documentElement.classList.remove('has-custom-cursor');
      }
    };

    updateMatch();
    mql.addEventListener('change', updateMatch);
    return () => {
      mql.removeEventListener('change', updateMatch);
      document.documentElement.classList.remove('has-custom-cursor');
    };
  }, []);

  // Pointer tracking and hover delegation
  useGSAP(
    () => {
      if (!isFinePointer || !dotPosRef.current || !ringPosRef.current) {
        return;
      }

      const dotEl = dotPosRef.current;
      const ringEl = ringPosRef.current;

      const mm = gsap.matchMedia();

      mm.add(
        {
          canAnimate: '(prefers-reduced-motion: no-preference)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const { reduceMotion } = context.conditions ?? {};

          const dotX = gsap.quickTo(dotEl, 'x', {
            duration: reduceMotion ? 0 : 0.08,
            ease: 'power3.out',
          });
          const dotY = gsap.quickTo(dotEl, 'y', {
            duration: reduceMotion ? 0 : 0.08,
            ease: 'power3.out',
          });

          const ringX = gsap.quickTo(ringEl, 'x', {
            duration: reduceMotion ? 0 : 0.35,
            ease: 'power3.out',
          });
          const ringY = gsap.quickTo(ringEl, 'y', {
            duration: reduceMotion ? 0 : 0.35,
            ease: 'power3.out',
          });

          const onPointerMove = (e: MouseEvent) => {
            if (!isVisible) setIsVisible(true);
            dotX(e.clientX);
            dotY(e.clientY);
            ringX(e.clientX);
            ringY(e.clientY);
          };

          const onPointerOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            if (!target) return;

            // 1. Text inputs: restore native text caret
            const inputMatch = target.closest(
              'input[type="text"], input[type="email"], input[type="tel"], input[type="search"], input[type="url"], input[type="number"], input[type="password"], textarea, [contenteditable="true"]'
            );
            if (inputMatch) {
              setCursorMode('input');
              return;
            }

            // 2. Interactive elements (links, buttons, tabs, interactive cards, data-cursor)
            const interactiveEl = target.closest(
              'a[href], button:not([disabled]), [role="button"], [role="tab"], [data-cursor], summary, select'
            );
            if (interactiveEl) {
              setCursorMode('hover');
              return;
            }

            setCursorMode('default');
          };

          const onMouseDown = () => setIsPressed(true);
          const onMouseUp = () => setIsPressed(false);
          const onMouseLeaveWindow = (e: MouseEvent) => {
            if (!e.relatedTarget) {
              setIsVisible(false);
            }
          };
          const onMouseEnterWindow = () => setIsVisible(true);

          window.addEventListener('mousemove', onPointerMove, { passive: true });
          window.addEventListener('mouseover', onPointerOver, { passive: true });
          window.addEventListener('mousedown', onMouseDown);
          window.addEventListener('mouseup', onMouseUp);
          document.addEventListener('mouseout', onMouseLeaveWindow);
          document.addEventListener('mouseover', onMouseEnterWindow);

          return () => {
            window.removeEventListener('mousemove', onPointerMove);
            window.removeEventListener('mouseover', onPointerOver);
            window.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('mouseout', onMouseLeaveWindow);
            document.removeEventListener('mouseover', onMouseEnterWindow);
          };
        }
      );

      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [isFinePointer, isVisible] }
  );

  // Morph dot & ring sizes when cursorMode or isPressed changes
  useGSAP(
    () => {
      if (!isFinePointer || !dotShapeRef.current || !ringShapeRef.current) return;

      const dot = dotShapeRef.current;
      const ring = ringShapeRef.current;

      const pressMultiplier = isPressed ? 0.88 : 1;

      if (cursorMode === 'input' || !isVisible) {
        gsap.to([dot, ring], {
          autoAlpha: 0,
          scale: 0.5,
          duration: 0.2,
          ease: 'power2.out',
        });
        return;
      }

      // Ring grows on hover (from 34px to 52px), dot shrinks (from 6px to 3px)
      const isHover = cursorMode === 'hover';
      const targetRingSize = isHover ? 52 : 34;
      const targetDotScale = isHover ? 0.5 : 1; // 6px * 0.5 = 3px

      gsap.to(dot, {
        autoAlpha: 1,
        scale: targetDotScale,
        duration: 0.25,
        ease: 'power3.out',
      });

      gsap.to(ring, {
        autoAlpha: 1,
        scale: (targetRingSize / 34) * pressMultiplier,
        duration: 0.3,
        ease: 'power3.out',
      });
    },
    { scope: rootRef, dependencies: [isFinePointer, cursorMode, isPressed, isVisible] }
  );

  if (!isFinePointer) return null;

  // Use light-themed Deep Teal cursor on modal pop-up views (bg-sea-salt) regardless of underlying section
  const isCursorLight = activeDialog
    ? false
    : isHeroPinned || activeSection === 'hero' || navTheme === 'dark';
  const isHovered = cursorMode === 'hover';

  // Adaptive theme colors: crisp and luminous on dark, deep and sharp on light
  const dotColorStyle = isCursorLight
    ? {
        backgroundColor: '#03C5EC',
        boxShadow:
          '0 0 10px rgba(3, 197, 236, 0.85), 0 0 20px rgba(3, 197, 236, 0.45)',
      }
    : {
        backgroundColor: 'var(--deep-teal)',
        boxShadow:
          '0 0 8px rgba(0, 119, 134, 0.55), 0 0 16px rgba(0, 119, 134, 0.28)',
      };

  const ringColorStyle = isCursorLight
    ? {
        borderColor: 'rgba(245, 249, 251, 0.8)',
        backgroundColor: isHovered ? 'rgba(3, 197, 236, 0.12)' : 'transparent',
        boxShadow: isHovered ? '0 0 16px rgba(3, 197, 236, 0.25)' : 'none',
      }
    : {
        borderColor: 'var(--deep-teal)',
        backgroundColor: isHovered ? 'rgba(0, 119, 134, 0.08)' : 'transparent',
        boxShadow: isHovered ? '0 0 14px rgba(0, 119, 134, 0.15)' : 'none',
      };

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[90] overflow-hidden select-none"
    >
      {/* Ring Follower (34px base diameter, grows to 52px on hover) */}
      <div
        ref={ringPosRef}
        className="fixed top-0 left-0 -translate-x-1/2 -translate-y-1/2 will-change-transform"
      >
        <div
          ref={ringShapeRef}
          style={ringColorStyle}
          className="flex h-[34px] w-[34px] items-center justify-center rounded-full border transition-colors duration-300 opacity-0"
        />
      </div>

      {/* Dot Follower (6px base diameter, shrinks to 3px on hover) */}
      <div
        ref={dotPosRef}
        className="fixed top-0 left-0 -translate-x-1/2 -translate-y-1/2 will-change-transform"
      >
        <div
          ref={dotShapeRef}
          style={dotColorStyle}
          className="h-[6px] w-[6px] rounded-full transition-colors duration-300 opacity-0"
        />
      </div>
    </div>
  );
}

export default Cursor;
