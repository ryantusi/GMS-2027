import {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react';
import { gsap } from '../../lib/scroll';

export interface VideoStatesHandle {
  triggerDeparture: () => void;
  resetToDocked: () => void;
}

export interface VideoStatesProps {
  dockedVideoUrl: string;
  departingVideoUrl: string;
  departedVideoUrl: string;
  dockedPosterUrl?: string;
  departedPosterUrl?: string;
  reduceMotion?: boolean;
  className?: string;
}

type ShipState = 'docked' | 'waiting-cycle-end' | 'departing' | 'departed';

/**
 * VideoStates Engine (`src/engines/VideoStates/index.tsx`):
 * Implements the three-state night harbour ship sequence (DESIGN.md Section 10):
 * - State 1 (`Docked` — `contact1.mp4`): Loops manually without the native `loop` attribute so we can
 *   intercept the end of the current cycle.
 * - State 2 (`Departing` — `contact2.mp4`): Triggered after a successful form submission.
 *   - If `contact1` has <= 3s remaining in its current cycle, waits for `contact1` to reach the end
 *     of its cycle and starts `contact2` seamlessly from the matching frame.
 *   - Safety valve: if the end of the loop is > 3s away (or duration is unknown), crossfades to `contact2`
 *     over 0.4s immediately so the visitor never waits.
 * - State 3 (`Departed` — `contact3.mp4`): When `contact2` finishes, crossfades over 0.3s into `contact3`
 *   (empty berth, water and lights moving on loop).
 * - Reset (`resetToDocked`): Crossfades from `contact3` back to `contact1` over 0.8s ("Send another enquiry").
 * - Reduced motion: Uses `dockedPosterUrl` and crossfades to `departedPosterUrl` on submit.
 * - Pauses playback off-screen (`IntersectionObserver`) and when tab is hidden (`visibilitychange`).
 */
export const VideoStates = forwardRef<VideoStatesHandle, VideoStatesProps>(
  function VideoStates(
    {
      dockedVideoUrl,
      departingVideoUrl,
      departedVideoUrl,
      dockedPosterUrl,
      departedPosterUrl,
      reduceMotion = false,
      className = '',
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const dockedVideoRef = useRef<HTMLVideoElement>(null);
    const secondaryVideoRef = useRef<HTMLVideoElement>(null);
    const departedPosterRef = useRef<HTMLImageElement>(null);

    const stateRef = useRef<ShipState>('docked');
    const isInViewRef = useRef<boolean>(true);
    const [shouldMountVideos, setShouldMountVideos] = useState(false);

    // Lazy-mount video elements when the Contact section approaches within 500px of viewport
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const lazyObserver = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setShouldMountVideos(true);
            lazyObserver.disconnect();
          }
        },
        { rootMargin: '500px 0px' }
      );

      lazyObserver.observe(container);
      return () => lazyObserver.disconnect();
    }, []);

    // Start playing `contact2.mp4` (Departing), optionally with a 0.4s crossfade
    const startDepartingVideo = useCallback((crossfadeDuration: number) => {
      stateRef.current = 'departing';
      const v1 = dockedVideoRef.current;
      const v2 = secondaryVideoRef.current;
      if (!v1 || !v2) return;

      // Ensure v2 is loaded with departingVideoUrl
      if (!v2.src.endsWith(departingVideoUrl)) {
        v2.src = departingVideoUrl;
        v2.loop = false;
        v2.load();
      }

      v2.currentTime = 0;
      v2.play().catch(() => {});

      gsap.to(v2, {
        autoAlpha: 1,
        duration: crossfadeDuration,
        ease: 'power2.inOut',
      });
      gsap.to(v1, {
        autoAlpha: 0,
        duration: crossfadeDuration,
        ease: 'power2.inOut',
        onComplete: () => {
          v1.pause();
        },
      });
    }, [departingVideoUrl]);

    // Transition from `contact2.mp4` (Departing) into `contact3.mp4` (Departed loop) over 0.3s
    const transitionToDeparted = useCallback(() => {
      stateRef.current = 'departed';
      const v1 = dockedVideoRef.current;
      const v2 = secondaryVideoRef.current;
      if (!v1 || !v2) return;

      // Load contact3 into v1 beneath v2, then crossfade over 0.3s
      v1.src = departedVideoUrl;
      v1.loop = true;
      v1.load();
      v1.play().catch(() => {});

      gsap.to(v1, {
        autoAlpha: 1,
        duration: 0.3,
        ease: 'power2.inOut',
      });
      gsap.to(v2, {
        autoAlpha: 0,
        duration: 0.3,
        ease: 'power2.inOut',
        onComplete: () => {
          v2.pause();
        },
      });
    }, [departedVideoUrl]);

    // Expose imperative methods `triggerDeparture()` and `resetToDocked()`
    useImperativeHandle(
      ref,
      () => ({
        triggerDeparture() {
          if (reduceMotion) {
            stateRef.current = 'departed';
            if (departedPosterRef.current) {
              gsap.to(departedPosterRef.current, {
                autoAlpha: 1,
                duration: 0.6,
                ease: 'power2.inOut',
              });
            }
            return;
          }

          if (stateRef.current !== 'docked') return;

          const v1 = dockedVideoRef.current;
          if (!v1 || !v1.duration || Number.isNaN(v1.duration)) {
            startDepartingVideo(0.4);
            return;
          }

          const remainingSeconds = v1.duration - v1.currentTime;
          // Safety valve: if the end of the loop is > 3s away, crossfade over 0.4s immediately
          if (remainingSeconds > 3.0) {
            startDepartingVideo(0.4);
          } else {
            // Wait for current cycle of contact1 to finish, then start contact2 seamlessly
            stateRef.current = 'waiting-cycle-end';
          }
        },

        resetToDocked() {
          stateRef.current = 'docked';

          if (reduceMotion) {
            if (departedPosterRef.current) {
              gsap.to(departedPosterRef.current, {
                autoAlpha: 0,
                duration: 0.8,
                ease: 'power2.inOut',
              });
            }
            return;
          }

          const v1 = dockedVideoRef.current;
          const v2 = secondaryVideoRef.current;
          if (!v1 || !v2) return;

          // Load contact1 back and crossfade over 0.8s
          v2.src = dockedVideoUrl;
          v2.loop = false;
          v2.load();
          v2.play().catch(() => {});

          gsap.to(v2, {
            autoAlpha: 1,
            duration: 0.8,
            ease: 'power2.inOut',
            onComplete: () => {
              // Swap back so v1 is the primary docked loop and v2 preloads contact2
              v1.src = dockedVideoUrl;
              v1.loop = false;
              v1.currentTime = v2.currentTime;
              v1.play().catch(() => {});
              gsap.set(v1, { autoAlpha: 1 });
              gsap.set(v2, { autoAlpha: 0 });
              v2.pause();
              v2.src = departingVideoUrl;
              v2.load();
            },
          });
        },
      }),
      [reduceMotion, dockedVideoUrl, departingVideoUrl, startDepartingVideo]
    );

    // Handle manual loop end on `dockedVideoRef` (v1)
    const handleDockedVideoEnded = useCallback(() => {
      const v1 = dockedVideoRef.current;
      if (!v1) return;

      if (stateRef.current === 'waiting-cycle-end') {
        // Seamless frame-accurate hand-off at end of loop cycle
        startDepartingVideo(0.08);
      } else if (stateRef.current === 'docked') {
        // Restart docked loop manually
        v1.currentTime = 0;
        if (isInViewRef.current && !document.hidden) {
          v1.play().catch(() => {});
        }
      }
    }, [startDepartingVideo]);

    // Pause/resume active video when off-screen (IntersectionObserver) or tab hidden (visibilitychange)
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const syncPlayback = () => {
        if (reduceMotion) return;
        const shouldPlay = isInViewRef.current && !document.hidden;
        const v1 = dockedVideoRef.current;
        const v2 = secondaryVideoRef.current;

        if (!shouldPlay) {
          v1?.pause();
          v2?.pause();
          return;
        }

        if (stateRef.current === 'departing') {
          v2?.play().catch(() => {});
        } else {
          v1?.play().catch(() => {});
        }
      };

      const observer = new IntersectionObserver(
        ([entry]) => {
          isInViewRef.current = entry.isIntersecting;
          syncPlayback();
        },
        { threshold: 0.05 }
      );

      observer.observe(container);
      document.addEventListener('visibilitychange', syncPlayback);

      return () => {
        observer.disconnect();
        document.removeEventListener('visibilitychange', syncPlayback);
      };
    }, [reduceMotion, shouldMountVideos]);

    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden bg-night-port select-none ${className}`}
      >
        {/* Base Poster Fallback (and Reduced-Motion Docked State) */}
        {dockedPosterUrl && (
          <img
            src={dockedPosterUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
          />
        )}

        {/* Reduced-Motion Departed Poster Crossfade Layer */}
        {reduceMotion && departedPosterUrl && (
          <img
            ref={departedPosterRef}
            src={departedPosterUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-0"
          />
        )}

        {/* Stacked Video Elements for Docked -> Departing -> Departed */}
        {!reduceMotion && shouldMountVideos && (
          <>
            {/* Video 1: Primary Docked Loop (manual loop without `loop` attribute) & Departed Loop */}
            <video
              ref={dockedVideoRef}
              src={dockedVideoUrl}
              poster={dockedPosterUrl}
              muted
              playsInline
              autoPlay
              preload="auto"
              onEnded={handleDockedVideoEnded}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
            />

            {/* Video 2: Preloaded Departing Ship (`contact2.mp4`) */}
            <video
              ref={secondaryVideoRef}
              src={departingVideoUrl}
              muted
              playsInline
              preload="auto"
              onEnded={transitionToDeparted}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-0"
            />
          </>
        )}
      </div>
    );
  }
);

export default VideoStates;
