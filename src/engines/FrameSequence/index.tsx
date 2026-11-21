import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useState,
} from 'react';
import { gsap, useGSAP } from '../../lib/scroll';
import { loadHeroSequence, type FrameSequenceBank } from '../../lib/loader';

export interface FrameSequenceHandle {
  setProgress: (progress0to1: number) => void;
}

export interface FrameSequenceProps {
  desktopDir: string;
  mobileDir: string;
  frameCount: number;
  framePad?: number;
  frameExt?: string;
  idleVideoUrl?: string;
  posterUrl?: string;
  className?: string;
}

/**
 * FrameSequence Engine (`src/engines/FrameSequence/index.tsx`):
 * - Fixed, full-viewport canvas and video element with zero panning, drifting, or zooming.
 * - Perfectly still at scroll = 0 while the idle video loop (`C0.mp4`) plays.
 * - Smoothly crossfades to the scrubbed frame sequence on first scroll and renders frames efficiently.
 * - Canvas dimensions are updated on resize (via ResizeObserver) to avoid layout reflows during scroll.
 * - Frame drawing is coalesced with requestAnimationFrame and skips redundant renders if the frame hasn't changed.
 */
export const FrameSequence = forwardRef<FrameSequenceHandle, FrameSequenceProps>(
  function FrameSequence(
    {
      desktopDir,
      mobileDir,
      frameCount,
      framePad = 4,
      frameExt = 'webp',
      idleVideoUrl,
      posterUrl,
      className = '',
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const bankRef = useRef<FrameSequenceBank | null>(null);
    const currentProgressRef = useRef<number>(0);
    const isIdleVisibleRef = useRef<boolean>(true);
    const isInViewRef = useRef<boolean>(true);
    const lastDrawnIndexRef = useRef<number>(-1);
    const rafIdRef = useRef<number | null>(null);
    const [reduceMotion, setReduceMotion] = useState(false);

    // Update canvas buffer resolution to match container rect * DPR (capped at 2)
    const updateCanvasDimensions = useCallback(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = container.getBoundingClientRect();
      const targetWidth = Math.max(1, Math.round(rect.width * dpr));
      const targetHeight = Math.max(1, Math.round(rect.height * dpr));

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        lastDrawnIndexRef.current = -1; // Force redraw on resize
      }
    }, []);

    // Draw the nearest frame onto the canvas using cover-fit math
    const drawCurrentFrame = useCallback(() => {
      const canvas = canvasRef.current;
      const bank = bankRef.current;
      if (!canvas || !bank || canvas.width === 0 || canvas.height === 0) return;

      const targetIndex = Math.round(
        currentProgressRef.current * (bank.frameCount - 1)
      );

      // Skip draw if this frame is already rendered and canvas dimensions are intact
      if (targetIndex === lastDrawnIndexRef.current) return;

      const img = bank.getNearestFrame(targetIndex);
      if (!img || !img.naturalWidth || !img.naturalHeight) return;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      const targetWidth = canvas.width;
      const targetHeight = canvas.height;
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const canvasRatio = targetWidth / targetHeight;

      let drawWidth = targetWidth;
      let drawHeight = targetHeight;
      let offsetX = 0;
      let offsetY = 0;

      if (canvasRatio > imgRatio) {
        drawWidth = targetWidth;
        drawHeight = targetWidth / imgRatio;
        offsetY = (targetHeight - drawHeight) * 0.5;
      } else {
        drawHeight = targetHeight;
        drawWidth = targetHeight * imgRatio;
        offsetX = (targetWidth - drawWidth) * 0.5;
      }

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      lastDrawnIndexRef.current = targetIndex;
    }, []);

    // Expose imperative setProgress(progress0to1) for the Hero ScrollTrigger scrub
    useImperativeHandle(
      ref,
      () => ({
        setProgress(progress0to1: number) {
          const clamped = Math.max(0, Math.min(1, progress0to1));
          currentProgressRef.current = clamped;

          // Coalesce draw calls with requestAnimationFrame for smooth 60fps/120fps scrolling
          if (rafIdRef.current === null) {
            rafIdRef.current = requestAnimationFrame(() => {
              rafIdRef.current = null;
              drawCurrentFrame();
            });
          }

          // Crossfade between idle video loop (progress <= 0.003) and scrubbed canvas
          const shouldShowIdle = clamped <= 0.003;
          if (shouldShowIdle !== isIdleVisibleRef.current) {
            isIdleVisibleRef.current = shouldShowIdle;
            const video = videoRef.current;
            if (video) {
              gsap.to(video, {
                autoAlpha: shouldShowIdle ? 1 : 0,
                duration: 0.2,
                ease: 'power2.out',
                overwrite: true,
              });
              if (shouldShowIdle && isInViewRef.current && !document.hidden) {
                video.play().catch(() => {});
              } else if (!shouldShowIdle) {
                video.pause();
              }
            }
          }
        },
      }),
      [drawCurrentFrame]
    );

    // Load portrait vs landscape sequence
    useGSAP(
      () => {
        const mm = gsap.matchMedia();

        mm.add(
          {
            isPortrait: '(orientation: portrait)',
            isLandscape: '(orientation: landscape)',
            reduceMotion: '(prefers-reduced-motion: reduce)',
          },
          (context) => {
            const { isPortrait, reduceMotion: rm } = context.conditions ?? {};
            setReduceMotion(Boolean(rm));

            const activeDir = isPortrait ? mobileDir : desktopDir;
            bankRef.current = loadHeroSequence(
              {
                framesDir: activeDir,
                frameCount,
                framePad,
                frameExt,
                idleVideoUrl: rm ? undefined : idleVideoUrl,
              },
              undefined,
              () => {
                drawCurrentFrame();
              }
            );

            updateCanvasDimensions();
            drawCurrentFrame();
          }
        );

        return () => mm.revert();
      },
      {
        scope: containerRef,
        dependencies: [
          desktopDir,
          mobileDir,
          frameCount,
          framePad,
          frameExt,
          idleVideoUrl,
          updateCanvasDimensions,
          drawCurrentFrame,
        ],
      }
    );

    // Keep canvas pixel dimensions in sync with container size via ResizeObserver
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      updateCanvasDimensions();
      drawCurrentFrame();

      const ro = new ResizeObserver(() => {
        updateCanvasDimensions();
        drawCurrentFrame();
      });
      ro.observe(container);

      const onResize = () => {
        updateCanvasDimensions();
        drawCurrentFrame();
      };
      window.addEventListener('resize', onResize);

      return () => {
        ro.disconnect();
        window.removeEventListener('resize', onResize);
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
      };
    }, [updateCanvasDimensions, drawCurrentFrame]);

    // Pause off-screen (IntersectionObserver) and when tab is hidden (visibilitychange)
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const syncPlayback = () => {
        const active = isInViewRef.current && !document.hidden && !reduceMotion;
        const video = videoRef.current;
        if (video) {
          if (active && isIdleVisibleRef.current) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        }
      };

      const observer = new IntersectionObserver(
        ([entry]) => {
          isInViewRef.current = entry.isIntersecting;
          syncPlayback();
        },
        { threshold: 0.01 }
      );

      observer.observe(container);
      document.addEventListener('visibilitychange', syncPlayback);

      return () => {
        observer.disconnect();
        document.removeEventListener('visibilitychange', syncPlayback);
      };
    }, [reduceMotion]);

    return (
      <div
        ref={containerRef}
        className={`relative h-full w-full overflow-hidden bg-deep-hull select-none ${className}`}
      >
        {/* Scrubbed Frame Sequence Canvas (pixel-aligned, cover-fit, zero drift) */}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 block h-full w-full object-cover pointer-events-none"
        />

        {/* Idle Loop Video on top at scroll = 0 (completely still, fixed, zero jitter/pan) */}
        {!reduceMotion && idleVideoUrl && (
          <video
            ref={videoRef}
            src={idleVideoUrl}
            poster={posterUrl}
            muted
            loop
            playsInline
            autoPlay
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 block h-full w-full object-cover border-0 outline-none"
          />
        )}
      </div>
    );
  }
);

export default FrameSequence;
