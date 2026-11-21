import { useEffect, useRef, type ReactNode } from 'react';
import { X } from '@phosphor-icons/react';
import { gsap, Flip, useGSAP, MOTION } from '../../lib/scroll';
import { stopLenis, startLenis } from '../../lib/lenis';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  triggerEl?: HTMLElement | null;
  variant?: 'modal' | 'drawer';
  hashId?: string;
  children?: ReactNode;
}

/**
 * Shared Dialog component (DESIGN.md 1.6):
 * The only modal in the project.
 * - Opens by expanding from the element that triggered it (GSAP Flip) where visible, otherwise fades up.
 * - Dimmed, blurred backdrop.
 * - Stops Lenis while open; restarts on close.
 * - Traps focus, closes on Escape, backdrop click, close button, and browser back button (URL hash).
 * - Renders as a bottom sheet on mobile, draggable downward to dismiss.
 * - Scrollable body carries `data-lenis-prevent`.
 */
export function Dialog({
  isOpen,
  onClose,
  title = 'Details',
  triggerEl,
  variant = 'modal',
  hashId = 'dialog',
  children,
}: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartYRef = useRef<number | null>(null);

  // Stop/start Lenis & manage URL hash so browser Back closes the Dialog
  useEffect(() => {
    if (!isOpen) return;

    stopLenis();
    const previousFocus = document.activeElement as HTMLElement | null;

    const targetHash = `#${hashId}`;
    if (window.location.hash !== targetHash) {
      window.history.pushState({ dialogOpen: true }, '', targetHash);
    }

    const handlePopState = () => {
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    // Focus first focusable control inside the dialog
    const focusTimer = window.setTimeout(() => {
      const firstControl = panelRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstControl?.focus();
    }, 50);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
      startLenis();

      if (window.location.hash === targetHash) {
        window.history.replaceState(
          null,
          '',
          window.location.pathname + window.location.search
        );
      }

      previousFocus?.focus?.();
    };
  }, [isOpen, onClose, hashId]);

  // Entrance animation (GSAP Flip from triggerEl if visible in viewport, else fade/slide up)
  useGSAP(
    () => {
      if (!isOpen || !panelRef.current || !backdropRef.current) return;

      const mm = gsap.matchMedia();

      mm.add(
        {
          canAnimate: '(prefers-reduced-motion: no-preference)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const { reduceMotion } = context.conditions ?? {};
          const panel = panelRef.current!;
          const backdrop = backdropRef.current!;

          if (reduceMotion) {
            gsap.set(backdrop, { autoAlpha: 1 });
            gsap.set(panel, { autoAlpha: 1, y: 0, scale: 1 });
            return;
          }

          gsap.fromTo(
            backdrop,
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: MOTION.durFast, ease: MOTION.easeOut }
          );

          // Check if trigger element is mounted and visible inside the viewport
          let usedFlip = false;
          if (triggerEl && document.body.contains(triggerEl)) {
            const rect = triggerEl.getBoundingClientRect();
            const isVisible =
              rect.width > 0 &&
              rect.height > 0 &&
              rect.bottom > 0 &&
              rect.top < window.innerHeight;

            if (isVisible) {
              const state = Flip.getState(triggerEl);
              gsap.set(panel, { autoAlpha: 1 });
              Flip.from(state, {
                targets: panel,
                duration: MOTION.durBase,
                ease: MOTION.easeOut,
                scale: true,
              });
              usedFlip = true;
            }
          }

          if (!usedFlip) {
            gsap.fromTo(
              panel,
              { y: 32, autoAlpha: 0, scale: 0.98 },
              {
                y: 0,
                autoAlpha: 1,
                scale: 1,
                duration: MOTION.durBase,
                ease: MOTION.easeOut,
              }
            );
          }
        }
      );

      return () => mm.revert();
    },
    { scope: overlayRef, dependencies: [isOpen, triggerEl] }
  );

  if (!isOpen) return null;

  // Mobile bottom-sheet downward drag handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartYRef.current === null || !panelRef.current) return;
    const deltaY = e.touches[0].clientY - dragStartYRef.current;
    if (deltaY > 0) {
      gsap.set(panelRef.current, { y: deltaY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (dragStartYRef.current === null || !panelRef.current) return;
    const deltaY = e.changedTouches[0].clientY - dragStartYRef.current;
    dragStartYRef.current = null;

    if (deltaY > 90) {
      onClose();
    } else {
      gsap.to(panelRef.current, {
        y: 0,
        duration: MOTION.durFast,
        ease: MOTION.easeOut,
      });
    }
  };

  const isDrawer = variant === 'drawer';

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
    >
      {/* Dimmed, blurred backdrop */}
      <div
        ref={backdropRef}
        onClick={onClose}
        className="fixed inset-0 bg-night-port/65 backdrop-blur-md"
        aria-hidden="true"
      />

      {/* Dialog / Bottom Sheet Panel */}
      <div
        ref={panelRef}
        className={`relative z-10 flex flex-col bg-sea-salt text-deep-hull shadow-hull-lg border border-harbour-mist overflow-hidden w-full ${
          isDrawer
            ? 'max-h-[88dvh] rounded-t-[var(--radius-lg)] md:max-h-[92dvh] md:w-[480px] md:ml-auto md:mr-4 md:rounded-[var(--radius-lg)]'
            : 'max-h-[88dvh] rounded-t-[var(--radius-lg)] md:max-h-[86dvh] md:max-w-4xl md:rounded-[var(--radius-lg)] md:mx-6'
        }`}
      >
        {/* Mobile bottom-sheet drag handle */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex md:hidden items-center justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
        >
          <span className="h-1.5 w-12 rounded-full bg-deep-hull/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-harbour-mist px-6 py-4">
          <h3 className="font-display text-xl font-medium text-deep-hull">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-deep-hull/15 text-deep-hull/75 hover:border-deep-teal hover:text-deep-teal transition-colors"
          >
            <X size={18} weight="regular" />
          </button>
        </div>

        {/* Internally scrolling content area with data-lenis-prevent */}
        <div
          data-lenis-prevent
          className="flex-1 overflow-y-auto overscroll-contain p-6"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default Dialog;
