import Lenis from 'lenis';
import { gsap, ScrollTrigger } from './scroll';

let lenisInstance: Lenis | null = null;
let tickerCallback: ((time: number) => void) | null = null;

/**
 * Creates or returns the single Lenis instance wired to GSAP ScrollTrigger
 * exactly as specified in docs/lenis.md.
 */
export function initLenis(): Lenis {
  if (lenisInstance) {
    return lenisInstance;
  }

  const lenis = new Lenis();
  lenis.on('scroll', ScrollTrigger.update);

  tickerCallback = (time: number) => {
    lenis.raf(time * 1000);
  };

  gsap.ticker.add(tickerCallback);
  gsap.ticker.lagSmoothing(0);

  lenisInstance = lenis;
  return lenis;
}

export function getLenis(): Lenis | null {
  return lenisInstance;
}

export function stopLenis(): void {
  lenisInstance?.stop();
}

export function startLenis(): void {
  lenisInstance?.start();
}

export function scrollToTarget(
  target: string | number | HTMLElement,
  options: { offset?: number; duration?: number; onComplete?: () => void } = {}
): void {
  if (!lenisInstance) return;
  lenisInstance.scrollTo(target, {
    offset: options.offset ?? -72,
    duration: options.duration ?? 1.4,
    onComplete: options.onComplete,
  });
}

export const scrollToSection = scrollToTarget;

export function destroyLenis(): void {
  if (tickerCallback) {
    gsap.ticker.remove(tickerCallback);
    tickerCallback = null;
  }
  if (lenisInstance) {
    lenisInstance.destroy();
    lenisInstance = null;
  }
}
