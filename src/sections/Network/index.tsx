import {
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import {
  MagnifyingGlass,
  CaretDown,
  ArrowUpRight,
  X,
} from '@phosphor-icons/react';
import ReactCountryFlag from 'react-country-flag';
import { gsap, ScrollTrigger, useGSAP, MOTION } from '../../lib/scroll';
import { useAppStore } from '../../lib/store';
import {
  NETWORK_DATA,
  getLocalTimeAtLongitude,
  type LocationNode,
} from '../../lib/locations';
import { MediaPlaceholder } from '../../components/MediaPlaceholder';
import { GlobeBase } from '../../engines/GlobeBase';
import siteData from '../../content/site.json';

interface NetworkPoseMetrics {
  gHeroX: number;
  gShowcaseY: number;
  gEntryOffsetY: number;
  gShowcaseScale: number;
  tHeroX: number;
  tHeroY: number;
  tHeroScale: number;
}

/**
 * Section 9: Network (DESIGN.md Section 9)
 * - Theme: Clear global daylight (`--sea-salt`), text Deep Hull, `data-nav-theme="light"`.
 * - Scroll Choreography:
 *   1. Pre-pin entry (as Network scrolls into view behind Sectors): large "Where we operate" title
 *      fades/rises in while the huge 3D globe rises smoothly into showcase position via inner wrappers.
 *   2. Pinned docking: both elements hold briefly then shrink & dock smoothly into the asymmetric
 *      split layout (globe left, title + eyebrow + subtitle + search + accordions right).
 *   3. Once docked, the globe unlocks full interactivity (orbit drag, pointer tooltips, fly-to, live arcs).
 */
export function Network() {
  const sectionRef = useRef<HTMLElement>(null);
  const globeStageRef = useRef<HTMLDivElement>(null);
  const globeEntryRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleEntryRef = useRef<HTMLSpanElement>(null);
  const rightEyebrowRef = useRef<HTMLSpanElement>(null);
  const rightBodyRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const interactiveStateRef = useRef<boolean>(false);

  const selectedCountryId = useAppStore((s) => s.selectedCountryId);
  const setSelectedCountryId = useAppStore((s) => s.setSelectedCountryId);

  const [shouldMountGlobe, setShouldMountGlobe] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isGlobeInteractive, setIsGlobeInteractive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openContinent, setOpenContinent] = useState<string | null>(null);

  const netCopy = siteData?.network_section;

  // Lazy-mount the heavy WebGL globe when `#network` approaches within 600px of viewport
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldMountGlobe(true);
          observer.disconnect();
        }
      },
      { rootMargin: '600px 0px' }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // Scroll Choreography:
  // Pre-pin entry on inner wrappers (no blank gap) -> Pinned shrink & dock on outer stage wrappers
  useGSAP(
    () => {
      const section = sectionRef.current;
      const globeEl = globeStageRef.current;
      const globeEntryEl = globeEntryRef.current;
      const titleEl = titleRef.current;
      const titleEntryEl = titleEntryRef.current;
      const eyebrowEl = rightEyebrowRef.current;
      const rightBodyEl = rightBodyRef.current;
      if (!section || !globeEl || !globeEntryEl || !titleEl || !titleEntryEl) return;

      const mm = gsap.matchMedia();

      mm.add(
        {
          canAnimate: '(prefers-reduced-motion: no-preference)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const { reduceMotion: rm } = context.conditions ?? {};
          setReduceMotion(Boolean(rm));

          if (rm) {
            interactiveStateRef.current = true;
            setIsGlobeInteractive(true);
            gsap.set(
              [globeEl, globeEntryEl, titleEl, titleEntryEl, eyebrowEl, rightBodyEl].filter(
                Boolean
              ),
              {
                clearProps: 'all',
                autoAlpha: 1,
              }
            );
            return;
          }

          const computePose = (): NetworkPoseMetrics => {
            gsap.set([globeEl, titleEl], { x: 0, y: 0, scale: 1 });
            const sRect = section.getBoundingClientRect();
            const gRect = globeEl.getBoundingClientRect();
            const tRect = titleEl.getBoundingClientRect();

            const vw = sRect.width || window.innerWidth;
            const vh = sRect.height || window.innerHeight;
            const isDesktop = vw >= 1024;

            // Local coordinates strictly inside section box (immune to vertical scroll offset)
            const gCenterX = gRect.left - sRect.left + gRect.width / 2;
            const gCenterY = gRect.top - sRect.top + gRect.height / 2;
            const tCenterX = tRect.left - sRect.left + tRect.width / 2;
            const tCenterY = tRect.top - sRect.top + tRect.height / 2;

            // Showcase Globe: large centered globe ready as Network enters view
            const showcaseDiameter = isDesktop
              ? Math.min(vw * 0.9, vh * 1.04)
              : Math.min(vw * 0.96, vh * 0.72);
            const gShowcaseScale = Math.max(
              1.12,
              showcaseDiameter / Math.max(gRect.width, 1)
            );
            const gHeroX = vw / 2 - gCenterX;
            const gRadius = (gRect.height * gShowcaseScale) / 2;

            const gBottomY = vh + gRadius + 4 - gCenterY;
            const gTopTarget = isDesktop
              ? Math.max(195, vh * 0.23)
              : Math.max(165, vh * 0.21);
            const gShowcaseY = gTopTarget + gRadius - gCenterY;
            const gEntryOffsetY =
              Math.min(Math.max(0, gBottomY - gShowcaseY), vh * 0.38) /
              Math.max(gShowcaseScale, 0.5);

            // Showcase Title: large centered headline over top, shrinking cleanly into docked right slot
            const tHeroScale = isDesktop
              ? Math.min(1.68, Math.max(1.26, (vw * 0.62) / Math.max(tRect.width, 1)))
              : Math.min(1.36, Math.max(1.12, (vw * 0.84) / Math.max(tRect.width, 1)));
            const tHeroX = vw / 2 - tCenterX;
            const tTargetTop = isDesktop ? Math.max(92, vh * 0.115) : Math.max(82, vh * 0.1);
            const tHeroY = tTargetTop + (tRect.height * tHeroScale) / 2 - tCenterY;

            return {
              gHeroX,
              gShowcaseY,
              gEntryOffsetY,
              gShowcaseScale,
              tHeroX,
              tHeroY,
              tHeroScale,
            };
          };

          let pose = computePose();

          // Recompute clean geometric targets on resize before ScrollTrigger refreshes progress
          const handleRefreshInit = () => {
            pose = computePose();
          };
          ScrollTrigger.addEventListener('refreshInit', handleRefreshInit);

          // Establish entry start frame: outer containers positioned in showcase frame,
          // inner wrappers animate in as Network enters view (zero blank gap, zero tween overwrite)
          interactiveStateRef.current = false;
          setIsGlobeInteractive(false);

          gsap.set(globeEl, {
            x: pose.gHeroX,
            y: pose.gShowcaseY,
            scale: pose.gShowcaseScale,
            transformOrigin: 'center center',
            autoAlpha: 1,
          });
          gsap.set(globeEntryEl, {
            y: pose.gEntryOffsetY,
          });
          globeEl.style.setProperty(
            '--globe-pin-comp',
            (1 / Math.max(pose.gShowcaseScale, 0.5)).toFixed(3)
          );
          gsap.set(titleEl, {
            x: pose.tHeroX,
            y: pose.tHeroY,
            scale: pose.tHeroScale,
            transformOrigin: 'center center',
            autoAlpha: 1,
          });
          gsap.set(titleEntryEl, {
            y: 18,
            autoAlpha: 0,
          });
          gsap.set([eyebrowEl, rightBodyEl].filter(Boolean), {
            y: 26,
            autoAlpha: 0,
          });

          // Pre-pin entry timeline: Network title and globe rise visibly as soon as Network enters view
          const entryTl = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              start: 'top 92%',
              end: 'top top',
              scrub: MOTION.scrub,
              invalidateOnRefresh: true,
              onEnter: () => {
                setShouldMountGlobe(true);
              },
            },
          });

          entryTl.fromTo(
            titleEntryEl,
            { y: 18, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, ease: 'power2.out', duration: 0.55 },
            0
          );

          entryTl.fromTo(
            globeEntryEl,
            { y: () => pose.gEntryOffsetY },
            { y: 0, ease: 'power2.out', duration: 1 },
            0
          );

          // Pinned split-docking timeline
          const tl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: section,
              start: 'top top',
              end: '+=115%',
              pin: true,
              scrub: MOTION.scrub,
              invalidateOnRefresh: true,
              onEnter: () => {
                setShouldMountGlobe(true);
                section.setAttribute('data-nav-theme', 'light');
                useAppStore.getState().setNavTheme('light');
              },
              onEnterBack: () => {
                section.setAttribute('data-nav-theme', 'light');
                useAppStore.getState().setNavTheme('light');
              },
              onUpdate: (self) => {
                const currentScale = Number(gsap.getProperty(globeEl, 'scale')) || 1;
                globeEl.style.setProperty(
                  '--globe-pin-comp',
                  (1 / Math.max(currentScale, 0.5)).toFixed(3)
                );

                const docked = self.progress >= 0.72;
                if (docked !== interactiveStateRef.current) {
                  interactiveStateRef.current = docked;
                  setIsGlobeInteractive(docked);
                }
              },
            },
          });

          // 0–15%: Brief showcase hold, then 15–68%: Globe shrinks & fits left; title shrinks & fits right
          tl.fromTo(
            globeEl,
            {
              x: () => pose.gHeroX,
              y: () => pose.gShowcaseY,
              scale: () => pose.gShowcaseScale,
            },
            {
              x: 0,
              y: 0,
              scale: 1,
              duration: 53,
              ease: 'power2.inOut',
            },
            15
          );

          tl.fromTo(
            titleEl,
            {
              x: () => pose.tHeroX,
              y: () => pose.tHeroY,
              scale: () => pose.tHeroScale,
            },
            {
              x: 0,
              y: 0,
              scale: 1,
              duration: 53,
              ease: 'power2.inOut',
            },
            15
          );

          // 50–86%: Eyebrow, subtitle, search input, legend, and continent accordions reveal alongside docked title
          const secondaryTargets = [eyebrowEl, rightBodyEl].filter(
            (el): el is HTMLSpanElement | HTMLDivElement => Boolean(el)
          );
          if (secondaryTargets.length > 0) {
            tl.to(
              secondaryTargets,
              {
                autoAlpha: 1,
                y: 0,
                duration: 36,
                stagger: 5,
                ease: 'power2.out',
              },
              50
            );
          }

          return () => {
            ScrollTrigger.removeEventListener('refreshInit', handleRefreshInit);
          };
        }
      );

      return () => mm.revert();
    },
    { scope: sectionRef }
  );

  // When selectedCountryId changes (e.g. from clicking a globe pointer or "Show on globe" in ContactDirectory),
  // automatically open its continent accordion and scroll the list row into view.
  useEffect(() => {
    if (!selectedCountryId) return;
    const node = NETWORK_DATA.byId.get(selectedCountryId);
    if (!node) return;

    setOpenContinent(node.continent);

    const timer = window.setTimeout(() => {
      const rowEl = rowRefs.current[selectedCountryId];
      const listEl = listContainerRef.current;
      if (rowEl && listEl) {
        const listRect = listEl.getBoundingClientRect();
        const rowRect = rowEl.getBoundingClientRect();
        const offsetTop =
          rowRect.top - listRect.top + listEl.scrollTop - listRect.height / 2 + rowRect.height / 2;
        listEl.scrollTo({
          top: Math.max(0, offsetTop),
          behavior: reduceMotion ? 'auto' : 'smooth',
        });
      }
    }, 80);

    return () => window.clearTimeout(timer);
  }, [selectedCountryId, reduceMotion]);

  // Escape key clears selection
  useEffect(() => {
    if (!selectedCountryId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCountryId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedCountryId, setSelectedCountryId]);

  // Filter continent groups by search query
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return NETWORK_DATA.groups;

    return NETWORK_DATA.groups
      .map((group) => {
        const matches = group.locations.filter(
          (loc) =>
            loc.country.toLowerCase().includes(q) ||
            loc.city.toLowerCase().includes(q) ||
            (loc.address && loc.address.toLowerCase().includes(q))
        );
        return {
          ...group,
          locations: matches,
        };
      })
      .filter((group) => group.locations.length > 0);
  }, [searchQuery]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredGroups.length > 0) {
      const firstMatch = filteredGroups[0].locations[0];
      if (firstMatch) {
        setSelectedCountryId(firstMatch.id);
      }
    }
  };

  const selectedNode: LocationNode | null = selectedCountryId
    ? NETWORK_DATA.byId.get(selectedCountryId) ?? null
    : null;

  const toggleContinent = (continent: string) => {
    const isCurrentlyOpen = openContinent === continent;

    if (isCurrentlyOpen) {
      setOpenContinent(null);
      if (selectedNode && selectedNode.continent === continent) {
        setSelectedCountryId(null);
      }
      return;
    }

    setOpenContinent(continent);
    if (selectedNode && selectedNode.continent !== continent) {
      setSelectedCountryId(null);
    }
  };

  const selectedServingOffice: LocationNode | null =
    selectedNode?.servingOfficeId
      ? NETWORK_DATA.byId.get(selectedNode.servingOfficeId) ?? null
      : null;

  return (
    <section
      id="network"
      ref={sectionRef}
      data-nav-theme="light"
      className="relative min-h-[100dvh] lg:h-[100dvh] w-full bg-sea-salt text-deep-hull pt-24 pb-10 lg:pt-28 lg:pb-12 px-6 md:px-12 flex items-center overflow-hidden"
    >
      <div className="relative z-10 mx-auto w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left 50%: Enlarged Dark 3D Globe aligned cleanly with Contact left column */}
        <div className="lg:col-span-6 relative flex flex-col items-center justify-center w-full">
          <div
            ref={globeStageRef}
            className="relative z-20 w-[78vw] max-w-[340px] sm:max-w-[440px] lg:w-full lg:max-w-[min(552px,68dvh)] xl:max-w-[min(560px,70dvh)] aspect-square flex items-center justify-center will-change-transform"
          >
            <div ref={globeEntryRef} className="w-full h-full will-change-transform">
              {shouldMountGlobe ? (
                <GlobeBase
                  selectedCountryId={selectedCountryId}
                  onSelectCountry={setSelectedCountryId}
                  reduceMotion={reduceMotion}
                  interactive={isGlobeInteractive}
                  className="w-full h-full"
                />
              ) : (
                <MediaPlaceholder
                  label={netCopy?.title ?? ''}
                  icon="globe"
                  aspectRatio="1 / 1"
                  theme="dark"
                  className="rounded-full h-full w-full"
                />
              )}
            </div>
          </div>

          {/* Mobile Slide-Up Detail Card (shown once globe is docked and interactive) */}
          {selectedNode && isGlobeInteractive && (
            <div className="md:hidden mt-4 w-full rounded-[var(--radius-md)] border border-deep-teal bg-sea-salt p-5 shadow-hull-lg">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-display text-xl font-medium text-deep-hull">
                    {selectedNode.country}
                  </h4>
                  <p className="mt-0.5 text-xs text-deep-teal tabular-nums">
                    {getLocalTimeAtLongitude(selectedNode.longitude)} ·{' '}
                    {netCopy?.open_24_7_badge}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCountryId(null)}
                  aria-label={netCopy?.clear_selection_label}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-deep-hull/15 text-deep-hull/70"
                >
                  <X size={15} />
                </button>
              </div>

              {selectedNode.type === 'office' ? (
                <div className="mt-3 space-y-2 text-xs text-deep-hull/80">
                  {selectedNode.address && <p>{selectedNode.address}</p>}
                  <div className="flex flex-wrap items-center gap-4 pt-1 tabular-nums font-medium text-signal-blue">
                    <a href={`tel:${selectedNode.phone}`}>{selectedNode.phone}</a>
                    <a href={`mailto:${selectedNode.email}`}>{selectedNode.email}</a>
                  </div>
                </div>
              ) : (
                selectedServingOffice && (
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs tabular-nums font-medium text-signal-blue">
                    <a href={`tel:${selectedServingOffice.phone}`}>
                      {selectedServingOffice.phone}
                    </a>
                    <a href={`mailto:${selectedServingOffice.email}`}>
                      {selectedServingOffice.email}
                    </a>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Right 50%: Heading, Instant Search & Continent Accordions aligned with Contact card */}
        <div className="lg:col-span-6 relative flex flex-col items-start text-left">
          {netCopy?.eyebrow && (
            <span
              ref={rightEyebrowRef}
              className="mb-2 font-sans text-sm font-medium text-deep-teal"
            >
              {netCopy.eyebrow}
            </span>
          )}

          <h2
            ref={titleRef}
            className="relative z-30 inline-block w-fit font-display text-[length:var(--text-xl)] md:text-[clamp(2rem,2.9vw,2.9rem)] font-normal leading-[1.08] tracking-tight text-deep-hull whitespace-nowrap will-change-transform"
          >
            <span ref={titleEntryRef} className="inline-block will-change-transform">
              {netCopy?.title ?? 'Worldwide Locations'}
            </span>
          </h2>

          <div
            ref={rightBodyRef}
            className={`w-full flex flex-col ${
              isGlobeInteractive ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
          >
            {netCopy?.subtitle && (
              <p className="mt-3 max-w-[46ch] font-sans text-sm md:text-[15px] leading-relaxed text-deep-hull/75">
                {netCopy.subtitle}
              </p>
            )}

            {/* Search Input */}
            <div className="relative mt-4">
              <MagnifyingGlass
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-deep-hull/50"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={netCopy?.search_placeholder}
                aria-label={netCopy?.search_placeholder}
                className="w-full rounded-[var(--radius-sm)] border border-deep-teal/30 bg-white/85 pl-11 pr-9 py-2.5 text-sm text-deep-hull placeholder:text-deep-hull/45 shadow-hull focus:border-signal-blue"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-deep-hull/50 hover:text-deep-hull"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Internally scrollable Continent Accordion List (`data-lenis-prevent`) */}
            <div
              ref={listContainerRef}
              data-lenis-prevent
              className="mt-3.5 max-h-[260px] lg:max-h-[340px] xl:max-h-[370px] overflow-y-auto overscroll-contain rounded-[var(--radius-md)] border border-deep-teal/20 bg-white/75 divide-y divide-harbour-mist shadow-hull"
            >
              {filteredGroups.length === 0 ? (
                <div className="p-6 text-center text-sm text-deep-hull/65">
                  {netCopy?.no_results_label}
                </div>
              ) : (
                filteredGroups.map((group) => {
                  const isExpanded =
                    Boolean(searchQuery.trim()) ||
                    openContinent === group.continent;

                  return (
                    <div key={group.continent}>
                      <button
                        type="button"
                        onClick={() => toggleContinent(group.continent)}
                        aria-expanded={isExpanded}
                        className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-harbour-mist/35 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <CaretDown
                            size={16}
                            className={`text-deep-teal transition-transform duration-200 ${
                              isExpanded ? 'rotate-0' : '-rotate-90'
                            }`}
                          />
                          <span className="font-display text-lg font-medium text-deep-hull">
                            {group.continent}
                          </span>
                        </div>
                        <span className="tabular-nums text-xs font-medium text-deep-hull/60">
                          {group.locations.length}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="divide-y divide-harbour-mist/60 bg-sea-salt/60 px-3 pb-3">
                          {group.locations.map((loc) => {
                            const isSelected = loc.id === selectedCountryId;
                            const isOffice = loc.type === 'office';
                            const servingOffice = loc.servingOfficeId
                              ? NETWORK_DATA.byId.get(loc.servingOfficeId)
                              : null;

                            return (
                              <div
                                key={loc.id}
                                ref={(el) => {
                                  rowRefs.current[loc.id] = el;
                                }}
                                className={`rounded-[var(--radius-sm)] transition-colors ${
                                  isSelected
                                    ? 'bg-harbour-mist/75 ring-1 ring-signal-blue/40'
                                    : 'hover:bg-harbour-mist/30'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedCountryId(
                                      isSelected ? null : loc.id
                                    )
                                  }
                                  aria-expanded={isSelected}
                                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <ReactCountryFlag
                                      countryCode={loc.countryCode}
                                      svg
                                      aria-hidden="true"
                                      className="shrink-0 rounded-[2px] shadow-[0_0_0_1px_rgba(14,34,51,0.1)]"
                                      style={{
                                        width: '18px',
                                        height: '13.5px',
                                        objectFit: 'cover',
                                      }}
                                    />
                                    <span className="truncate font-sans text-sm font-medium text-deep-hull">
                                      {loc.country}
                                    </span>
                                  </div>

                                  <span className="shrink-0 text-xs text-deep-hull/55 tabular-nums">
                                    {getLocalTimeAtLongitude(loc.longitude)}
                                  </span>
                                </button>

                                {/* Accessible Inline Detail Expansion (so keyboard & screen-reader users get 100% of information) */}
                                {isSelected && (
                                  <div className="px-8 pb-3.5 pt-1 text-xs text-deep-hull/80 space-y-2">
                                    {isOffice ? (
                                      <>
                                        {loc.address && (
                                          <p className="leading-relaxed">
                                            {loc.address}
                                          </p>
                                        )}
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 tabular-nums font-medium text-signal-blue">
                                          <a
                                            href={`tel:${loc.phone}`}
                                            className="hover:underline"
                                          >
                                            {loc.phone}
                                          </a>
                                          <a
                                            href={`mailto:${loc.email}`}
                                            className="hover:underline"
                                          >
                                            {loc.email}
                                          </a>
                                        </div>
                                        <div>
                                          <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                              loc.address ?? `${loc.city}, ${loc.country}`
                                            )}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 font-medium text-deep-teal hover:underline"
                                          >
                                            <span>{netCopy?.directions_label}</span>
                                            <ArrowUpRight size={13} />
                                          </a>
                                        </div>
                                      </>
                                    ) : (
                                      servingOffice && (
                                        <div className="flex flex-wrap gap-x-3 gap-y-1 tabular-nums font-medium text-signal-blue">
                                          <a
                                            href={`tel:${servingOffice.phone}`}
                                            className="hover:underline"
                                          >
                                            {servingOffice.phone}
                                          </a>
                                          <a
                                            href={`mailto:${servingOffice.email}`}
                                            className="hover:underline"
                                          >
                                            {servingOffice.email}
                                          </a>
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Network;
