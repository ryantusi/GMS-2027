import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type TouchEvent as ReactTouchEvent,
} from 'react';
import { CheckCircle } from '@phosphor-icons/react';
import { gsap, useGSAP, MOTION } from '../../lib/scroll';
import { useAppStore } from '../../lib/store';
import {
  MediaPlaceholder,
  type PlaceholderIconType,
} from '../../components/MediaPlaceholder';
import storesData from '../../content/stores.json';

interface StoreEntry {
  id: string;
  store_name: string;
  image: string;
  icon: PlaceholderIconType;
  description: string;
  items: string[];
}

function resolveStoreImage(storeName: string, explicitPath?: string): string {
  if (explicitPath) return explicitPath;
  const lower = storeName.toLowerCase();
  if (lower.includes('provision')) return '/stores/01-provision.jpeg';
  if (lower.includes('cabin')) return '/stores/02-cabin.jpeg';
  if (lower.includes('bonded')) return '/stores/03-bonded.png';
  if (lower.includes('stationery')) return '/stores/04-stationery.jpg';
  if (lower.includes('safety')) return '/stores/05-safety.jpg';
  if (lower.includes('deck')) return '/stores/06-deck.png';
  if (lower.includes('chemical')) return '/stores/07-chemical.jpg';
  if (lower.includes('engine')) return '/stores/08-engine.png';
  if (lower.includes('electrical')) return '/stores/09-electrical.png';
  return '';
}

/**
 * Section 5: Stores (DESIGN.md Section 5)
 * - Dark theme (`--deep-hull` with `--night-port` depth, `data-nav-theme="dark"`).
 * - Desktop: Left 58% rounded (32px) media panel; Right 42% heading, accessible `role="tablist"`
 *   fitting within a 760px laptop height, active store details, and "Request [store]" CTA.
 * - Mobile: 4:5 media panel on top (swipeable left/right), horizontal scrollable tab chips in middle,
 *   details below.
 * - Autoplay: Holds each store for 5s while in view, filling a thin Sonar Cyan progress bar,
 *   cross-dissolving (`--dur-base`) between images with a slow push-in drift (1.0 -> 1.03),
 *   and preloading the next store's image during the current hold.
 * - Pauses when off-screen, when tab is hidden, or for 12s after manual tab interaction.
 */
export function Stores() {
  const sectionRef = useRef<HTMLElement>(null);
  const progressLineRef = useRef<HTMLSpanElement>(null);
  const mobileProgressLineRef = useRef<HTMLSpanElement>(null);
  const detailLinesRef = useRef<HTMLDivElement>(null);
  const mobileDetailLinesRef = useRef<HTMLDivElement>(null);
  const tabButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const mobileChipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const swipeStartXRef = useRef<number | null>(null);

  const isInViewRef = useRef(false);
  const isPageVisibleRef = useRef(true);
  const isPausedByUserRef = useRef(false);
  const resumeTimerRef = useRef<number | null>(null);
  const holdTweenRef = useRef<gsap.core.Tween | null>(null);

  const selectedStoreFilter = useAppStore((s) => s.selectedStoreFilter);
  const setSelectedStoreFilter = useAppStore((s) => s.setSelectedStoreFilter);

  const sectionCopy = storesData?.section;
  const autoplaySeconds = sectionCopy?.autoplay_seconds ?? 6;

  const stores: StoreEntry[] = useMemo(() => {
    const raw = storesData?.ship_supplies ?? [];
    return raw.map((item, idx) => ({
      id:
        (item as { id?: string }).id ??
        item.store_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      store_name: item.store_name,
      image: resolveStoreImage(
        item.store_name,
        (item as { image?: string }).image
      ),
      icon: ((item as { icon?: PlaceholderIconType }).icon ??
        (idx === 0 ? 'package' : 'cube')) as PlaceholderIconType,
      description: item.description,
      items: item.items ?? [],
    }));
  }, []);

  const storeCount = stores.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const mediaLayerRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Preload and decode the next store's image during the current hold so transitions never hitch
  useEffect(() => {
    if (storeCount === 0) return;
    const nextIdx = (activeIndex + 1) % storeCount;
    const nextUrl = stores[nextIdx]?.image;
    if (nextUrl && !failedImages[nextUrl]) {
      const preloadImg = new Image();
      preloadImg.decoding = 'async';
      preloadImg.src = nextUrl;
      preloadImg.decode?.().catch(() => {});
    }
  }, [activeIndex, storeCount, stores, failedImages]);

  // Listen to Footer store link selection (`selectedStoreFilter` in Zustand store)
  useEffect(() => {
    if (!selectedStoreFilter || storeCount === 0) return;
    const matchIdx = stores.findIndex(
      (s) =>
        s.store_name.toLowerCase() === selectedStoreFilter.toLowerCase() ||
        s.id.toLowerCase() === selectedStoreFilter.toLowerCase()
    );
    if (matchIdx !== -1 && matchIdx !== activeIndex) {
      setPreviousIndex(activeIndex);
      setActiveIndex(matchIdx);
    }
    setSelectedStoreFilter(null);
  }, [selectedStoreFilter, stores, storeCount, activeIndex, setSelectedStoreFilter]);

  // Scroll active mobile chip into view horizontally without scrolling the page
  useEffect(() => {
    const chip = mobileChipRefs.current[activeIndex];
    const container = chip?.parentElement;
    if (!chip || !container) return;
    const targetLeft =
      chip.offsetLeft - container.clientWidth / 2 + chip.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
  }, [activeIndex]);

  // Smooth cross-dissolve + GPU-composited slow push-in drift (1.0 -> 1.06) + masked line reveal
  useGSAP(
    () => {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // 1. Cross-dissolve persistent store image layers without resetting outgoing scale or remounting <img>
      mediaLayerRefs.current.forEach((layerEl, idx) => {
        if (!layerEl) return;

        if (idx === activeIndex) {
          gsap.killTweensOf(layerEl);
          gsap.set(layerEl, { zIndex: 10 });

          if (prefersReducedMotion) {
            gsap.set(layerEl, { opacity: 1, scale: 1 });
          } else {
            const isInitialMount = previousIndex === null;
            gsap.fromTo(
              layerEl,
              { opacity: isInitialMount ? 1 : 0 },
              {
                opacity: 1,
                duration: isInitialMount ? 0 : 0.65,
                ease: 'power2.out',
                overwrite: 'auto',
              }
            );
            gsap.fromTo(
              layerEl,
              { scale: 1, z: 0.01 },
              {
                scale: 1.06,
                z: 0.01,
                duration: autoplaySeconds + 1.2,
                ease: 'none',
                force3D: true,
                transformOrigin: '50% 50%',
              }
            );
          }
        } else if (idx === previousIndex) {
          // Only fade opacity out cleanly while letting outgoing zoom rest/continue seamlessly
          gsap.killTweensOf(layerEl, 'opacity');
          gsap.set(layerEl, { zIndex: 5 });
          gsap.to(layerEl, {
            opacity: 0,
            duration: 0.65,
            ease: 'power2.out',
          });
        } else {
          gsap.killTweensOf(layerEl);
          gsap.set(layerEl, { opacity: 0, zIndex: 0, scale: 1 });
        }
      });

      // 2. Masked line reveal for the active store's details
      if (!prefersReducedMotion) {
        const desktopMaskItems =
          detailLinesRef.current?.querySelectorAll<HTMLElement>('.store-detail-line');
        if (desktopMaskItems && desktopMaskItems.length > 0) {
          gsap.fromTo(
            desktopMaskItems,
            { yPercent: 100, opacity: 0 },
            {
              yPercent: 0,
              opacity: 1,
              duration: 0.38,
              ease: MOTION.easeOut,
              stagger: 0.04,
            }
          );
        }

        const mobileMaskItems =
          mobileDetailLinesRef.current?.querySelectorAll<HTMLElement>('.store-detail-line');
        if (mobileMaskItems && mobileMaskItems.length > 0) {
          gsap.fromTo(
            mobileMaskItems,
            { yPercent: 100, opacity: 0 },
            {
              yPercent: 0,
              opacity: 1,
              duration: 0.38,
              ease: MOTION.easeOut,
              stagger: 0.04,
            }
          );
        }
      }
    },
    { scope: sectionRef, dependencies: [activeIndex] }
  );

  // Manage the 5-second Sonar Cyan progress bar & automatic store advance
  const startHoldCycle = useCallback(() => {
    holdTweenRef.current?.kill();

    const bars = [progressLineRef.current, mobileProgressLineRef.current].filter(
      Boolean
    ) as HTMLElement[];

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (
      prefersReducedMotion ||
      storeCount === 0 ||
      !isInViewRef.current ||
      !isPageVisibleRef.current ||
      isPausedByUserRef.current
    ) {
      if (bars.length > 0) {
        gsap.set(bars, { scaleX: 0 });
      }
      return;
    }

    if (bars.length > 0) {
      gsap.set(bars, { scaleX: 0, transformOrigin: 'left center' });
    }

    const proxy = { p: 0 };
    holdTweenRef.current = gsap.to(proxy, {
      p: 1,
      duration: autoplaySeconds,
      ease: 'none',
      onUpdate: () => {
        if (bars.length > 0) {
          gsap.set(bars, { scaleX: proxy.p });
        }
      },
      onComplete: () => {
        setActiveIndex((prev) => {
          setPreviousIndex(prev);
          return (prev + 1) % storeCount;
        });
      },
    });
  }, [autoplaySeconds, storeCount]);

  useEffect(() => {
    startHoldCycle();
    return () => {
      holdTweenRef.current?.kill();
    };
  }, [activeIndex, startHoldCycle]);

  // Pause when section leaves viewport or browser tab is hidden; resume when back in view
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        isInViewRef.current = entry.isIntersecting;
        if (entry.isIntersecting) {
          if (holdTweenRef.current && holdTweenRef.current.paused()) {
            holdTweenRef.current.play();
          } else {
            startHoldCycle();
          }
        } else {
          holdTweenRef.current?.pause();
        }
      },
      { threshold: 0.18 }
    );
    io.observe(section);

    const onVisChange = () => {
      isPageVisibleRef.current = document.visibilityState === 'visible';
      if (isPageVisibleRef.current && isInViewRef.current && !isPausedByUserRef.current) {
        if (holdTweenRef.current && holdTweenRef.current.paused()) {
          holdTweenRef.current.play();
        } else {
          startHoldCycle();
        }
      } else {
        holdTweenRef.current?.pause();
      }
    };
    document.addEventListener('visibilitychange', onVisChange);

    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisChange);
      holdTweenRef.current?.kill();
      if (resumeTimerRef.current !== null) {
        window.clearTimeout(resumeTimerRef.current);
      }
    };
  }, [startHoldCycle]);

  // Select a store manually: switch immediately and restart autoplay with 0s delay
  const selectStoreManually = (idx: number) => {
    if (resumeTimerRef.current !== null) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }

    isPausedByUserRef.current = false;

    if (idx !== activeIndex) {
      setPreviousIndex(activeIndex);
      setActiveIndex(idx);
    } else {
      startHoldCycle();
    }
  };

  // Keyboard navigation for ARIA tablist
  const handleTabKeyDown = (
    e: ReactKeyboardEvent<HTMLButtonElement>,
    idx: number,
    isHorizontalMobile = false
  ) => {
    const nextKey = isHorizontalMobile ? 'ArrowRight' : 'ArrowDown';
    const prevKey = isHorizontalMobile ? 'ArrowLeft' : 'ArrowUp';

    if (e.key === nextKey || e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIdx = (idx + 1) % storeCount;
      selectStoreManually(nextIdx);
      const refArray = isHorizontalMobile ? mobileChipRefs.current : tabButtonRefs.current;
      refArray[nextIdx]?.focus();
    } else if (e.key === prevKey || e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIdx = (idx - 1 + storeCount) % storeCount;
      selectStoreManually(prevIdx);
      const refArray = isHorizontalMobile ? mobileChipRefs.current : tabButtonRefs.current;
      refArray[prevIdx]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      selectStoreManually(0);
      const refArray = isHorizontalMobile ? mobileChipRefs.current : tabButtonRefs.current;
      refArray[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      const lastIdx = storeCount - 1;
      selectStoreManually(lastIdx);
      const refArray = isHorizontalMobile ? mobileChipRefs.current : tabButtonRefs.current;
      refArray[lastIdx]?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectStoreManually(idx);
    }
  };

  const activeStore = stores[activeIndex];

  const renderStoreMedia = (store: StoreEntry | null | undefined) => {
    if (!store) return null;
    const hasImage = Boolean(store.image) && !failedImages[store.image];
    if (hasImage) {
      return (
        <img
          src={store.image}
          alt={store.store_name}
          onError={() =>
            setFailedImages((prev) => ({ ...prev, [store.image]: true }))
          }
          className="h-full w-full object-cover"
        />
      );
    }
    return (
      <MediaPlaceholder
        label={store.store_name}
        sublabel={store.description}
        icon={store.icon}
        aspectRatio="auto"
        theme="dark"
        className="h-full w-full rounded-none border-0"
      />
    );
  };

  return (
    <section
      ref={sectionRef}
      id="stores"
      data-section="stores"
      data-nav-theme="dark"
      aria-label={sectionCopy?.heading ?? 'What we supply'}
      className="relative min-h-[112dvh] w-full flex items-center bg-deep-hull text-sea-salt pt-28 pb-20 lg:pt-28 lg:pb-20 overflow-hidden"
      style={{
        background:
          'radial-gradient(120% 90% at 22% 50%, var(--deep-hull) 0%, var(--night-port) 100%)',
      }}
    >
      {/* Screen-reader live region for active store panel changes */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {activeStore ? `${activeStore.store_name}: ${activeStore.description}` : ''}
      </div>

      <div className="mx-auto w-full max-w-7xl px-6 sm:px-10 md:px-12 lg:px-16">
        {/* Mobile Header (shown above media panel on < lg) */}
        <div className="mb-6 lg:hidden">
          <h2 className="font-display text-3xl sm:text-4xl font-normal tracking-[-0.02em] text-sea-salt leading-[1.08]">
            {sectionCopy?.heading}
          </h2>
          {sectionCopy?.eyebrow && (
            <p className="mt-2 font-sans text-xs sm:text-[13px] font-medium leading-snug text-sonar-cyan">
              {sectionCopy.eyebrow}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-14 items-center">
          {/* Left Column (50% -> 6 cols on 12-col grid): Balanced Rounded Media Panel fitting viewport */}
          <div className="lg:col-span-6">
            <div
              onTouchStart={(e: ReactTouchEvent<HTMLDivElement>) => {
                swipeStartXRef.current = e.touches[0]?.clientX ?? null;
              }}
              onTouchEnd={(e: ReactTouchEvent<HTMLDivElement>) => {
                if (swipeStartXRef.current === null) return;
                const endX = e.changedTouches[0]?.clientX ?? swipeStartXRef.current;
                const dx = endX - swipeStartXRef.current;
                swipeStartXRef.current = null;
                if (Math.abs(dx) > 44 && storeCount > 0) {
                  if (dx < 0) {
                    selectStoreManually((activeIndex + 1) % storeCount);
                  } else {
                    selectStoreManually((activeIndex - 1 + storeCount) % storeCount);
                  }
                }
              }}
              className="relative w-full aspect-[4/5] sm:aspect-[16/11] lg:aspect-auto lg:h-[min(68vh,560px)] xl:h-[min(70vh,600px)] overflow-hidden rounded-[var(--radius-panel)] border border-sea-salt/12 bg-night-port shadow-xl"
            >
              {/* Persistent GPU-composited image layers for silky cross-dissolve and zoom */}
              {stores.map((store, idx) => (
                <div
                  key={store.id}
                  ref={(el) => {
                    mediaLayerRefs.current[idx] = el;
                  }}
                  aria-hidden={idx !== activeIndex}
                  style={{
                    backfaceVisibility: 'hidden',
                  }}
                  className="pointer-events-none absolute inset-0 h-full w-full will-change-transform"
                >
                  {renderStoreMedia(store)}
                </div>
              ))}

              {/* Subtle bottom vignette & store label */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-night-port/80 via-transparent to-night-port/20"
              />

              {activeStore && (
                <div className="pointer-events-none absolute bottom-5 left-6 right-6 z-30 flex items-end justify-between gap-4">
                  <div>
                    <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-sonar-cyan">
                      Ship Store
                    </span>
                    <p className="mt-0.5 font-display text-lg sm:text-xl md:text-[22px] font-normal text-sea-salt">
                      {activeStore.store_name.replace(/\s*stores?$/i, '').trim()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Horizontal Scrollable Tab Chips + Details (< lg) */}
          <div className="flex flex-col gap-5 lg:hidden">
            <div
              role="tablist"
              aria-label={sectionCopy?.heading ?? 'Ship stores'}
              data-lenis-prevent
              className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar"
            >
              {stores.map((store, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={store.id}
                    ref={(el) => {
                      mobileChipRefs.current[idx] = el;
                    }}
                    id={`store-mobile-tab-${store.id}`}
                    role="tab"
                    type="button"
                    aria-selected={isActive}
                    aria-controls={`store-mobile-panel-${store.id}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => selectStoreManually(idx)}
                    onKeyDown={(e) => handleTabKeyDown(e, idx, true)}
                    className={`relative shrink-0 overflow-hidden rounded-full px-4 py-2 font-sans text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-sea-salt/14 text-sea-salt border border-sonar-cyan/60'
                        : 'bg-sea-salt/5 text-sea-salt/65 border border-sea-salt/10 hover:text-sea-salt'
                    }`}
                  >
                    <span>{store.store_name}</span>
                    {isActive && (
                      <span
                        ref={mobileProgressLineRef}
                        aria-hidden="true"
                        className="absolute inset-x-0 bottom-0 h-[2px] bg-sonar-cyan origin-left"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {activeStore && (
              <div
                ref={mobileDetailLinesRef}
                id={`store-mobile-panel-${activeStore.id}`}
                role="tabpanel"
                aria-labelledby={`store-mobile-tab-${activeStore.id}`}
                className="rounded-2xl border border-sea-salt/12 bg-sea-salt/[0.04] p-5"
              >
                <div className="overflow-hidden">
                  <p className="store-detail-line font-sans text-sm text-sea-salt/85 leading-relaxed">
                    {activeStore.description}
                  </p>
                </div>

                <ul className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeStore.items.map((item) => (
                    <li
                      key={item}
                      className="overflow-hidden flex items-center gap-2 font-sans text-xs text-sea-salt/75"
                    >
                      <CheckCircle
                        size={14}
                        weight="fill"
                        className="shrink-0 text-sonar-cyan"
                      />
                      <span className="store-detail-line">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Desktop Right Column (50% -> 6 cols on 12-col grid): Heading, Compact Accordion Tabs & Details */}
          <div className="hidden lg:flex lg:col-span-6 flex-col justify-center">
            <div className="mb-3.5">
              <h2 className="font-display text-[length:clamp(1.65rem,2.4vw,2.25rem)] font-normal tracking-[-0.02em] text-sea-salt leading-[1.08]">
                {sectionCopy?.heading}
              </h2>
              {sectionCopy?.eyebrow && (
                <p className="mt-1.5 font-sans text-xs xl:text-[13px] font-medium leading-snug text-sonar-cyan">
                  {sectionCopy.eyebrow}
                </p>
              )}
            </div>

            <div
              role="tablist"
              aria-orientation="vertical"
              aria-label={sectionCopy?.heading ?? 'Ship stores'}
              className="flex flex-col divide-y divide-sea-salt/10 border-y border-sea-salt/10"
            >
              {stores.map((store, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <div key={store.id} className="flex flex-col">
                    <button
                      ref={(el) => {
                        tabButtonRefs.current[idx] = el;
                      }}
                      id={`store-tab-${store.id}`}
                      role="tab"
                      type="button"
                      aria-selected={isActive}
                      aria-controls={`store-panel-${store.id}`}
                      tabIndex={isActive ? 0 : -1}
                      data-cursor="view"
                      onClick={() => selectStoreManually(idx)}
                      onKeyDown={(e) => handleTabKeyDown(e, idx, false)}
                      className={`group flex w-full items-center justify-between gap-4 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-sonar-cyan ${
                        isActive
                          ? 'text-sea-salt'
                          : 'text-sea-salt/60 hover:text-sea-salt/90'
                      }`}
                    >
                      <span
                        className={`font-display transition-all ${
                          isActive
                            ? 'text-lg font-normal text-sea-salt'
                            : 'text-[15px] font-normal'
                        }`}
                      >
                        {store.store_name}
                      </span>

                      {/* 5-second Sonar Cyan Progress Line alongside the active tab */}
                      {isActive ? (
                        <span className="relative h-[2px] w-24 overflow-hidden rounded-full bg-sea-salt/15">
                          <span
                            ref={progressLineRef}
                            className="block h-full w-full bg-sonar-cyan origin-left"
                          />
                        </span>
                      ) : (
                        <span className="font-sans text-[11px] tabular-nums text-sea-salt/35 group-hover:text-sea-salt/65">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                      )}
                    </button>

                    {/* Active Store Inline Details Panel */}
                    {isActive && (
                      <div
                        ref={detailLinesRef}
                        id={`store-panel-${store.id}`}
                        role="tabpanel"
                        aria-labelledby={`store-tab-${store.id}`}
                        className="pb-2.5 pt-0.5 flex flex-col gap-2"
                      >
                        <div className="overflow-hidden">
                          <p className="store-detail-line font-sans text-xs text-sea-salt/80 leading-relaxed line-clamp-2">
                            {store.description}
                          </p>
                        </div>

                        <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                          {store.items.map((item) => (
                            <li
                              key={item}
                              className="overflow-hidden flex items-center gap-1.5 font-sans text-xs text-sea-salt/75 truncate"
                            >
                              <span
                                aria-hidden="true"
                                className="h-1 w-1 shrink-0 rounded-full bg-sonar-cyan"
                              />
                              <span className="store-detail-line truncate">
                                {item}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Stores;
