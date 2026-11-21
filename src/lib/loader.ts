import { useAppStore } from './store';

export interface FrameManifestConfig {
  framesDir: string;
  frameCount: number;
  framePad?: number;
  frameExt?: string;
  idleVideoUrl?: string;
}

export interface FrameSequenceBank {
  frameCount: number;
  frames: (HTMLImageElement | null)[];
  getNearestFrame: (index: number) => HTMLImageElement | null;
}

const sequenceCache = new Map<string, FrameSequenceBank>();

export function formatFrameUrl(
  dir: string,
  index1Based: number,
  pad = 4,
  ext = 'webp'
): string {
  const padded = String(index1Based).padStart(pad, '0');
  return `${dir}/${padded}.${ext}`;
}

function loadSingleImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;

    const finalize = () => {
      if (typeof img.decode === 'function') {
        img
          .decode()
          .then(() => resolve(img))
          .catch(() => resolve(img));
      } else {
        resolve(img);
      }
    };

    img.onload = finalize;
    img.onerror = () => resolve(null);
  });
}

function waitForVideoReady(url?: string): Promise<void> {
  if (!url || typeof document === 'undefined') return Promise.resolve();
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    const done = () => {
      cleanup();
      resolve();
    };

    const cleanup = () => {
      video.removeEventListener('canplaythrough', done);
      video.removeEventListener('loadeddata', done);
      video.removeEventListener('error', done);
    };

    video.addEventListener('canplaythrough', done, { once: true });
    video.addEventListener('loadeddata', done, { once: true });
    video.addEventListener('error', done, { once: true });
    // Safety timeout so video metadata never hangs preloading
    window.setTimeout(done, 2500);
  });
}

/**
 * Progressive frame sequence loader (DESIGN.md Section 1, 2 & 3.4):
 * Phase 1 (Critical for Preloader):
 *   - Web fonts ready
 *   - Hero idle video (`canplaythrough`)
 *   - Frame 1 (`0001.webp`)
 *   - Sparse set of frames (every 8th frame)
 * Phase 2 (Background fill):
 *   - Loads all remaining frames progressively off the critical path.
 *   - `getNearestFrame(idx)` always returns the closest decoded HTMLImageElement.
 */
export function loadHeroSequence(
  config: FrameManifestConfig,
  onCriticalProgress?: (progress0to100: number) => void,
  onFrameDecoded?: () => void
): FrameSequenceBank {
  const cacheKey = `${config.framesDir}:${config.frameCount}`;
  const existing = sequenceCache.get(cacheKey);
  if (existing) {
    onCriticalProgress?.(100);
    return existing;
  }

  const {
    framesDir,
    frameCount,
    framePad = 4,
    frameExt = 'webp',
    idleVideoUrl,
  } = config;

  const frames: (HTMLImageElement | null)[] = new Array(frameCount).fill(null);

  const getNearestFrame = (targetIdx: number): HTMLImageElement | null => {
    const clamped = Math.max(0, Math.min(frameCount - 1, Math.round(targetIdx)));
    if (frames[clamped]) return frames[clamped];

    for (let offset = 1; offset < frameCount; offset++) {
      const prev = clamped - offset;
      const next = clamped + offset;
      if (prev >= 0 && frames[prev]) return frames[prev];
      if (next < frameCount && frames[next]) return frames[next];
    }
    return null;
  };

  const bank: FrameSequenceBank = {
    frameCount,
    frames,
    getNearestFrame,
  };

  sequenceCache.set(cacheKey, bank);

  // Build sparse critical indices (Frame 0, last frame, and every 8th frame)
  const sparseSet = new Set<number>([0, frameCount - 1]);
  for (let i = 0; i < frameCount; i += 8) {
    sparseSet.add(i);
  }
  const sparseIndices = Array.from(sparseSet).sort((a, b) => a - b);
  const remainingIndices: number[] = [];
  for (let i = 0; i < frameCount; i++) {
    if (!sparseSet.has(i)) remainingIndices.push(i);
  }

  // Total critical tasks = sparseIndices.length + 1 (fonts) + 1 (idle video)
  const totalCritical = sparseIndices.length + 2;
  let completedCritical = 0;

  const bumpCritical = () => {
    completedCritical += 1;
    const pct = Math.min(100, Math.round((completedCritical / totalCritical) * 100));
    useAppStore.getState().setLoadProgress(pct);
    onCriticalProgress?.(pct);
  };

  // 1. Fonts check
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    document.fonts.ready.then(bumpCritical).catch(bumpCritical);
  } else {
    bumpCritical();
  }

  // 2. Idle loop video check
  waitForVideoReady(idleVideoUrl).then(bumpCritical);

  // 3. Load Frame 1 first, then sparse frames, then fill in remaining frames
  (async () => {
    // Load sparse frames with small concurrency batching
    const sparseBatchSize = 6;
    for (let i = 0; i < sparseIndices.length; i += sparseBatchSize) {
      const batch = sparseIndices.slice(i, i + sparseBatchSize);
      await Promise.all(
        batch.map(async (frameIdx) => {
          const url = formatFrameUrl(framesDir, frameIdx + 1, framePad, frameExt);
          const img = await loadSingleImage(url);
          if (img) {
            frames[frameIdx] = img;
            onFrameDecoded?.();
          }
          bumpCritical();
        })
      );
    }

    // Background fill for all remaining frames
    const fillBatchSize = 8;
    for (let i = 0; i < remainingIndices.length; i += fillBatchSize) {
      const batch = remainingIndices.slice(i, i + fillBatchSize);
      await Promise.all(
        batch.map(async (frameIdx) => {
          const url = formatFrameUrl(framesDir, frameIdx + 1, framePad, frameExt);
          const img = await loadSingleImage(url);
          if (img) {
            frames[frameIdx] = img;
            onFrameDecoded?.();
          }
        })
      );
    }
  })();

  return bank;
}
