import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  SpeakerHigh,
  SpeakerSlash,
  List,
  X,
  PhoneCall,
  GlobeHemisphereWest,
  CaretDown,
} from '@phosphor-icons/react';
import { gsap, ScrollTrigger, useGSAP, MOTION } from '../../lib/scroll';
import { getLenis, scrollToTarget, stopLenis, startLenis } from '../../lib/lenis';
import { useAppStore } from '../../lib/store';
import siteData from '../../content/site.json';
import storesData from '../../content/stores.json';

// SVG paths for the mobile menu wave reveal (MorphSVG: flat at bottom -> rising wave -> full screen)
const WAVE_FLAT_BOTTOM = 'M 0 100 Q 50 100 100 100 L 100 100 L 0 100 Z';
const WAVE_CREST = 'M 0 55 Q 50 20 100 55 L 100 100 L 0 100 Z';
const WAVE_FULL = 'M 0 0 Q 50 0 100 0 L 100 100 L 0 100 Z';

/**
 * Global Navbar (DESIGN.md G1):
 * - Slim bar (72px desktop, 64px mobile): logo left, section links centre, audio toggle + "Request a quote" right.
 * - 2px full-width scroll progress line along bottom edge in Sonar Cyan, eased so it glides.
 * - Hidden while inside the Hero (`isHeroPinned`). When the Hero ends, the glass bar fades in around the docked logo;
 *   links, toggle, and button follow with a 0.05s stagger; progress line appears.
 * - Active state: hides on scroll down, returns on scroll up.
 * - 2px Sonar Cyan active indicator slides above the active link.
 * - Audio toggle: session-persisted on/off state, accessible label, default on.
 * - Mobile: full-screen Sea Salt overlay revealed by an SVG wave rising from the bottom (MorphSVG: flat -> wave -> full),
 *   links set large in Gambetta, focus trap, closes on Escape.
 */
export function Navbar() {
  const headerRef = useRef<HTMLElement>(null);
  const bgLayerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const navContainerRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const ctaRef = useRef<HTMLAnchorElement>(null);

  const mobileOverlayRef = useRef<HTMLDivElement>(null);
  const mobileWavePathRef = useRef<SVGPathElement>(null);
  const mobileContentRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const navTheme = useAppStore((s) => s.navTheme);
  const activeSection = useAppStore((s) => s.activeSection);
  const scrollProgress = useAppStore((s) => s.scrollProgress);
  const isAudioEnabled = useAppStore((s) => s.isAudioEnabled);
  const toggleAudio = useAppStore((s) => s.toggleAudio);
  const isHeroPinned = useAppStore((s) => s.isHeroPinned);
  const isMobileMenuOpen = useAppStore((s) => s.isMobileMenuOpen);
  const setMobileMenuOpen = useAppStore((s) => s.setMobileMenuOpen);
  const setSelectedStoreFilter = useAppStore((s) => s.setSelectedStoreFilter);

  const [isHiddenOnScroll, setIsHiddenOnScroll] = useState(false);
  const [isStoresDropdownOpen, setIsStoresDropdownOpen] = useState(false);
  const [isMobileStoresExpanded, setIsMobileStoresExpanded] = useState(false);
  const lastScrollYRef = useRef(0);
  const hasFormedOnceRef = useRef(false);
  const storesCloseTimerRef = useRef<number | null>(null);

  const isDark = navTheme === 'dark';
  const companyName = siteData?.website_info?.company_name ?? '';
  const navConfig = siteData?.navigation;
  const links = navConfig?.links ?? [];
  const storeItems = useMemo(
    () =>
      (storesData?.ship_supplies ?? []).map((item) => ({
        id:
          (item as { id?: string }).id ??
          item.store_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: item.store_name,
      })),
    []
  );

  // Smooth gliding progress bar via gsap.quickTo
  const progressQuickToRef = useRef<gsap.QuickToFunc | null>(null);

  useGSAP(
    () => {
      if (!progressBarRef.current) return;
      progressQuickToRef.current = gsap.quickTo(progressBarRef.current, 'scaleX', {
        duration: 0.35,
        ease: 'power2.out',
      });
    },
    { scope: headerRef }
  );

  useEffect(() => {
    progressQuickToRef.current?.(scrollProgress);
  }, [scrollProgress]);

  // Listen to Lenis scroll direction to hide on scroll down and return on scroll up (after Hero)
  useEffect(() => {
    const lenis = getLenis();
    if (!lenis) return;

    const handleScroll = (e: { scroll: number; direction: number }) => {
      const currentY = e.scroll;
      const delta = currentY - lastScrollYRef.current;
      lastScrollYRef.current = currentY;

      if (useAppStore.getState().isHeroPinned || useAppStore.getState().isMobileMenuOpen) {
        setIsHiddenOnScroll(false);
        return;
      }

      if (delta > 6 && currentY > 180) {
        setIsHiddenOnScroll(true);
      } else if (delta < -4) {
        setIsHiddenOnScroll(false);
      }
    };

    lenis.on('scroll', handleScroll);
    return () => {
      lenis.off('scroll', handleScroll);
    };
  }, []);

  // Bar formation animation when leaving Hero (and hide when re-entering Hero)
  useGSAP(
    () => {
      const header = headerRef.current;
      const bgLayer = bgLayerRef.current;
      if (!header || !bgLayer) return;

      const staggerItems = header.querySelectorAll('[data-nav-stagger]');
      const progressTrack = header.querySelector('[data-nav-progress]');
      const logoSlot = document.getElementById('navbar-logo-slot');

      const mm = gsap.matchMedia();

      mm.add(
        {
          canAnimate: '(prefers-reduced-motion: no-preference)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const { reduceMotion } = context.conditions ?? {};

          if (logoSlot) {
            gsap.set(logoSlot, { autoAlpha: 1 });
          }

          // Nav links and buttons are visible from the start
          gsap.set(staggerItems, { autoAlpha: 1, y: 0 });

          if (isHeroPinned) {
            if (progressTrack) {
              gsap.to(progressTrack, {
                autoAlpha: 0,
                duration: reduceMotion ? 0 : MOTION.durFast,
              });
            }
          } else {
            hasFormedOnceRef.current = true;
            gsap.to(bgLayer, {
              autoAlpha: 1,
              duration: reduceMotion ? 0 : MOTION.durBase,
              ease: MOTION.easeOut,
            });
            if (progressTrack) {
              gsap.to(progressTrack, {
                autoAlpha: 1,
                duration: reduceMotion ? 0 : MOTION.durFast,
              });
            }
          }
        }
      );

      return () => mm.revert();
    },
    { scope: headerRef, dependencies: [isHeroPinned] }
  );

  // Hide on scroll down / return on scroll up
  useGSAP(
    () => {
      if (!headerRef.current) return;
      const shouldHide =
        !isHeroPinned && isHiddenOnScroll && !isMobileMenuOpen && !isStoresDropdownOpen;
      if (shouldHide) {
        setIsStoresDropdownOpen(false);
      }
      gsap.to(headerRef.current, {
        yPercent: shouldHide ? -100 : 0,
        duration: 0.35,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    },
    {
      scope: headerRef,
      dependencies: [isHiddenOnScroll, isHeroPinned, isMobileMenuOpen, isStoresDropdownOpen],
    }
  );

  // Slide 2px active indicator between section links
  const updateIndicator = useCallback(() => {
    const navEl = navContainerRef.current;
    const indicatorEl = indicatorRef.current;
    if (!navEl || !indicatorEl) return;

    // Map "memberships" -> "about" and "sectors" -> "why-us" so the indicator stays aligned with primary nav links
    const normalizedId =
      activeSection === 'memberships'
        ? 'about'
        : activeSection === 'sectors'
          ? 'why-us'
          : activeSection;

    const targetLink = linkRefs.current[normalizedId];
    if (!targetLink || isHeroPinned) {
      gsap.to(indicatorEl, { autoAlpha: 0, duration: MOTION.durFast });
      return;
    }

    const navRect = navEl.getBoundingClientRect();
    const linkRect = targetLink.getBoundingClientRect();
    const left = linkRect.left - navRect.left;

    gsap.to(indicatorEl, {
      x: left,
      width: linkRect.width,
      autoAlpha: 1,
      duration: 0.35,
      ease: MOTION.easeOut,
    });
  }, [activeSection, isHeroPinned]);

  useEffect(() => {
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  // Primary CTA button magnetic lean (up to 6px toward the cursor per DESIGN.md G2)
  useGSAP(
    () => {
      const btn = ctaRef.current;
      if (!btn) return;

      const mm = gsap.matchMedia();
      mm.add('(pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
        const xTo = gsap.quickTo(btn, 'x', { duration: 0.25, ease: 'power3.out' });
        const yTo = gsap.quickTo(btn, 'y', { duration: 0.25, ease: 'power3.out' });

        const onMove = (e: MouseEvent) => {
          const rect = btn.getBoundingClientRect();
          const relX = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
          const relY = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
          xTo(gsap.utils.clamp(-6, 6, relX * 6));
          yTo(gsap.utils.clamp(-6, 6, relY * 6));
        };

        const onLeave = () => {
          xTo(0);
          yTo(0);
        };

        btn.addEventListener('mousemove', onMove);
        btn.addEventListener('mouseleave', onLeave);
        return () => {
          btn.removeEventListener('mousemove', onMove);
          btn.removeEventListener('mouseleave', onLeave);
        };
      });

      return () => mm.revert();
    },
    { scope: headerRef }
  );

  // Mobile Menu MorphSVG wave transition + focus trap + Escape key
  useGSAP(
    () => {
      const overlay = mobileOverlayRef.current;
      const wavePath = mobileWavePathRef.current;
      const content = mobileContentRef.current;
      if (!overlay || !wavePath || !content) return;

      const linksEls = content.querySelectorAll('[data-mobile-link]');

      if (isMobileMenuOpen) {
        stopLenis();
        gsap.set(overlay, { autoAlpha: 1, pointerEvents: 'auto' });
        gsap.set(wavePath, { attr: { d: WAVE_FLAT_BOTTOM } });

        const tl = gsap.timeline();
        tl.to(wavePath, {
          morphSVG: WAVE_CREST,
          duration: 0.32,
          ease: 'power2.in',
        })
          .to(wavePath, {
            morphSVG: WAVE_FULL,
            duration: 0.42,
            ease: MOTION.easeOut,
          })
          .fromTo(
            linksEls,
            { y: 28, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.45,
              stagger: 0.06,
              ease: MOTION.easeOut,
            },
            '-=0.25'
          );
      } else {
        startLenis();
        const tl = gsap.timeline({
          onComplete: () => {
            gsap.set(overlay, { autoAlpha: 0, pointerEvents: 'none' });
          },
        });
        tl.to(linksEls, {
          y: 16,
          autoAlpha: 0,
          duration: 0.2,
          ease: 'power2.in',
        })
          .to(wavePath, {
            morphSVG: WAVE_CREST,
            duration: 0.25,
            ease: 'power2.in',
          })
          .to(wavePath, {
            morphSVG: WAVE_FLAT_BOTTOM,
            duration: 0.3,
            ease: 'power3.out',
          });
      }
    },
    { dependencies: [isMobileMenuOpen] }
  );

  // Mobile menu focus trap & Escape listener
  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMobileMenuOpen(false);
        menuBtnRef.current?.focus();
        return;
      }

      if (e.key === 'Tab' && mobileOverlayRef.current) {
        const focusable = mobileOverlayRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled])'
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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen, setMobileMenuOpen]);

  // Collapse mobile stores drawer & clear hover close timer on cleanup
  useEffect(() => {
    if (!isMobileMenuOpen) {
      setIsMobileStoresExpanded(false);
    }
  }, [isMobileMenuOpen]);

  useEffect(() => {
    return () => {
      if (storesCloseTimerRef.current !== null) {
        window.clearTimeout(storesCloseTimerRef.current);
      }
    };
  }, []);

  const openStoresDropdown = () => {
    if (storesCloseTimerRef.current !== null) {
      window.clearTimeout(storesCloseTimerRef.current);
      storesCloseTimerRef.current = null;
    }
    setIsStoresDropdownOpen(true);
  };

  const scheduleCloseStoresDropdown = () => {
    if (storesCloseTimerRef.current !== null) {
      window.clearTimeout(storesCloseTimerRef.current);
    }
    storesCloseTimerRef.current = window.setTimeout(() => {
      setIsStoresDropdownOpen(false);
      storesCloseTimerRef.current = null;
    }, 120);
  };

  const handleNavClick = (sectionId: string) => {
    const offset = window.innerWidth >= 768 ? -72 : -64;

    const executeScroll = () => {
      if (sectionId === 'hero') {
        scrollToTarget(0, { offset: 0 });
        return;
      }

      if (sectionId === 'about') {
        const heroEl = document.getElementById('hero');
        const heroTrigger = heroEl
          ? ScrollTrigger.getAll().find((st) => st.trigger === heroEl && st.vars.pin)
          : null;

        if (heroTrigger) {
          const targetY = heroTrigger.start + (heroTrigger.end - heroTrigger.start) * 0.38;
          scrollToTarget(targetY, { offset: 0 });
          return;
        }
      }

      if (sectionId === 'services') {
        const servicesEl = document.getElementById('services');
        const servicesTrigger = servicesEl
          ? ScrollTrigger.getAll().find((st) => st.trigger === servicesEl && st.vars.pin)
          : null;

        if (servicesTrigger) {
          const targetY =
            servicesTrigger.start + (servicesTrigger.end - servicesTrigger.start) * 0.16;
          scrollToTarget(targetY, { offset: 0 });
          return;
        }
      }

      if (sectionId === 'network') {
        const networkEl = document.getElementById('network');
        const networkTrigger = networkEl
          ? ScrollTrigger.getAll().find((st) => st.trigger === networkEl && st.vars.pin)
          : null;

        if (networkTrigger) {
          const targetY =
            networkTrigger.start + (networkTrigger.end - networkTrigger.start) * 0.88;
          scrollToTarget(targetY, { offset: 0 });
          return;
        }
      }

      scrollToTarget(`#${sectionId}`, { offset });
    };

    setIsStoresDropdownOpen(false);

    if (isMobileMenuOpen) {
      setMobileMenuOpen(false);
      window.setTimeout(executeScroll, 320);
    } else {
      executeScroll();
    }
  };

  const handleStoreSelect = (storeId: string) => {
    setSelectedStoreFilter(storeId);
    handleNavClick('stores');
  };

  const handleRequestQuote = (e: React.MouseEvent) => {
    e.preventDefault();
    const offset = window.innerWidth >= 768 ? -72 : -64;
    const focusFirstField = () => {
      const firstField = document.querySelector<HTMLElement>(
        '#contact input, #contact textarea'
      );
      firstField?.focus();
    };

    if (isMobileMenuOpen) {
      setMobileMenuOpen(false);
      window.setTimeout(() => {
        scrollToTarget('#contact', { offset, onComplete: focusFirstField });
      }, 320);
    } else {
      scrollToTarget('#contact', { offset, onComplete: focusFirstField });
    }
  };

  return (
    <>
      <header
        ref={headerRef}
        className={`fixed top-0 inset-x-0 z-40 h-16 md:h-[72px] transition-colors duration-300 pointer-events-auto ${
          isDark ? 'text-sea-salt' : 'text-deep-hull'
        }`}
      >
        {/* Glass Bar Background Layer (hidden initially on Hero, appears gradually on scroll) */}
        <div
          id="navbar-bg-layer"
          ref={bgLayerRef}
          className={`pointer-events-none absolute inset-0 transition-colors duration-300 opacity-0 ${
            isDark ? 'glass-dark' : 'glass-light'
          }`}
        />

        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center justify-between gap-8 px-6 md:px-10">
          {/* Zone 1: Single Logo Element (returns cleanly to top Hero frame on click) */}
          <a
            id="navbar-logo-slot"
            href="#hero"
            onClick={(e) => {
              e.preventDefault();
              handleNavClick('hero');
            }}
            className="flex items-center gap-3 shrink-0 pointer-events-auto will-change-transform z-50"
          >
            <img
              src="/logos/logo-trans.png"
              alt={companyName}
              onLoad={() => ScrollTrigger.refresh()}
              className="h-14 md:h-15 w-auto object-contain filter drop-shadow-sm"
            />
          </a>

          {/* Zone 2: Section Links (Desktop) */}
          <nav
            ref={navContainerRef}
            aria-label="Primary"
            className="relative hidden md:flex items-center gap-7 lg:gap-9 text-sm font-medium"
          >
            {links.map((link) => {
              if (link.id === 'stores') {
                return (
                  <div
                    key={link.id}
                    className="relative"
                    onMouseEnter={openStoresDropdown}
                    onMouseLeave={scheduleCloseStoresDropdown}
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                        setIsStoresDropdownOpen(false);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsStoresDropdownOpen(false);
                      }
                    }}
                  >
                    <a
                      ref={(el) => {
                        linkRefs.current[link.id] = el;
                      }}
                      href={`#${link.id}`}
                      data-nav-stagger
                      aria-haspopup="true"
                      aria-expanded={isStoresDropdownOpen}
                      onFocus={openStoresDropdown}
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavClick(link.id);
                      }}
                      className={`inline-flex items-center py-1.5 transition-colors duration-300 whitespace-nowrap shrink-0 drop-shadow-sm font-semibold tracking-wide ${
                        isDark
                          ? 'text-sea-salt/90 hover:text-sonar-cyan'
                          : 'text-deep-hull/85 hover:text-[#00A8CC]'
                      }`}
                    >
                      {link.label}
                    </a>

                    {/* Minimal 2-Column Glass Hover Card (Store Names Only, No Icons) */}
                    <div
                      aria-hidden={!isStoresDropdownOpen}
                      className={`absolute left-1/2 top-full -translate-x-1/2 pt-3 z-50 transition-all duration-200 ease-out ${
                        isStoresDropdownOpen
                          ? 'opacity-100 translate-y-0 pointer-events-auto'
                          : 'opacity-0 translate-y-1.5 pointer-events-none'
                      }`}
                    >
                      <div
                        role="menu"
                        aria-label="Ship store categories"
                        className={`w-[364px] rounded-2xl border p-2.5 backdrop-blur-xl transition-colors duration-300 ${
                          isDark
                            ? 'bg-night-port/92 border-white/15 text-sea-salt shadow-[0_20px_44px_-12px_rgba(4,12,20,0.72)]'
                            : 'bg-sea-salt/95 border-deep-hull/12 text-deep-hull shadow-hull-lg'
                        }`}
                      >
                        <div className="grid grid-cols-2 gap-1">
                          {storeItems.map((store) => (
                            <button
                              key={store.id}
                              type="button"
                              role="menuitem"
                              tabIndex={isStoresDropdownOpen ? 0 : -1}
                              onClick={() => handleStoreSelect(store.id)}
                              className={`w-full rounded-lg px-3 py-2 text-left font-sans text-[13px] font-medium whitespace-nowrap truncate transition-colors duration-150 cursor-pointer ${
                                isDark
                                  ? 'text-sea-salt/85 hover:bg-white/10 hover:text-sonar-cyan'
                                  : 'text-deep-hull/85 hover:bg-harbour-mist/55 hover:text-[#008CAE]'
                              }`}
                            >
                              {store.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <a
                  key={link.id}
                  ref={(el) => {
                    linkRefs.current[link.id] = el;
                  }}
                  href={`#${link.id}`}
                  data-nav-stagger
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(link.id);
                  }}
                  className={`py-1.5 transition-colors duration-300 whitespace-nowrap shrink-0 drop-shadow-sm font-semibold tracking-wide ${
                    isDark
                      ? 'text-sea-salt/90 hover:text-sonar-cyan'
                      : 'text-deep-hull/85 hover:text-[#00A8CC]'
                  }`}
                >
                  {link.label}
                </a>
              );
            })}

            {/* 2px sliding active indicator above active navlink */}
            <span
              ref={indicatorRef}
              aria-hidden="true"
              className="pointer-events-none absolute -top-1 left-0 h-[2px] rounded-full opacity-0 transition-colors duration-300 bg-sonar-cyan"
            />
          </nav>

          {/* Zone 3: International Call + Globe Locations + Audio Toggle + Mobile Menu Button */}
          <div className="flex items-center gap-2.5 md:gap-3 shrink-0">
            {/* Quick Action: International Line */}
            <a
              href="tel:+19459972408"
              data-nav-stagger
              aria-label="Call International Line: +1 945 9972408"
              title="Call International Line: +1 945 9972408"
              className={`flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full border transition-all duration-300 shadow-sm backdrop-blur-md shrink-0 ${
                isDark
                  ? 'border-white/20 bg-white/10 text-white hover:border-sonar-cyan hover:bg-sonar-cyan/25 hover:text-sonar-cyan'
                  : 'border-deep-hull/20 bg-deep-hull/8 text-deep-hull hover:border-sonar-cyan hover:bg-sonar-cyan/15 hover:text-[#00A8CC]'
              }`}
            >
              <PhoneCall size={18} weight="bold" />
            </a>

            {/* Quick Action: Worldwide Locations */}
            <button
              type="button"
              data-nav-stagger
              onClick={() => handleNavClick('network')}
              aria-label="Explore Worldwide Locations"
              title="Explore Worldwide Locations"
              className={`flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full border transition-all duration-300 shadow-sm backdrop-blur-md shrink-0 cursor-pointer ${
                isDark
                  ? 'border-white/20 bg-white/10 text-white hover:border-sonar-cyan hover:bg-sonar-cyan/25 hover:text-sonar-cyan'
                  : 'border-deep-hull/20 bg-deep-hull/8 text-deep-hull hover:border-sonar-cyan hover:bg-sonar-cyan/15 hover:text-[#00A8CC]'
              }`}
            >
              <GlobeHemisphereWest size={18} weight="bold" />
            </button>

            {/* Audio Toggle */}
            <button
              type="button"
              data-nav-stagger
              onClick={toggleAudio}
              aria-label={
                isAudioEnabled
                  ? navConfig?.audio_label_on
                  : navConfig?.audio_label_off
              }
              aria-pressed={isAudioEnabled}
              className={`flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full border transition-all duration-300 shadow-sm backdrop-blur-md shrink-0 cursor-pointer ${
                isDark
                  ? 'border-white/20 bg-white/10 text-white hover:border-sonar-cyan hover:bg-sonar-cyan/25 hover:text-sonar-cyan'
                  : 'border-deep-hull/20 bg-deep-hull/8 text-deep-hull hover:border-sonar-cyan hover:bg-sonar-cyan/15 hover:text-[#00A8CC]'
              }`}
            >
              {isAudioEnabled ? (
                <SpeakerHigh size={18} weight="bold" />
              ) : (
                <SpeakerSlash size={18} weight="bold" />
              )}
            </button>

            {/* Mobile Menu Button */}
            <button
              ref={menuBtnRef}
              type="button"
              data-nav-stagger
              onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={
                isMobileMenuOpen
                  ? navConfig?.menu_close_label
                  : navConfig?.menu_open_label
              }
              aria-expanded={isMobileMenuOpen}
              className={`flex md:hidden h-9 w-9 items-center justify-center rounded-full border transition-all duration-300 shadow-sm backdrop-blur-md ${
                isDark
                  ? 'border-white/20 bg-white/10 text-white hover:border-sonar-cyan hover:bg-sonar-cyan/25 hover:text-sonar-cyan'
                  : 'border-deep-hull/20 bg-deep-hull/8 text-deep-hull hover:border-sonar-cyan hover:bg-sonar-cyan/15 hover:text-[#00A8CC]'
              }`}
            >
              {isMobileMenuOpen ? (
                <X size={20} weight="bold" />
              ) : (
                <List size={20} weight="bold" />
              )}
            </button>
          </div>
        </div>

        {/* 2px full-width crisp aqua scroll progress bar along bottom edge */}
        <div
          data-nav-progress
          className="pointer-events-none absolute bottom-0 inset-x-0 h-[2px] bg-transparent overflow-hidden opacity-0"
        >
          <div
            ref={progressBarRef}
            style={{
              transform: 'scaleX(0)',
              transformOrigin: 'left center',
            }}
            className="h-full w-full bg-sonar-cyan"
          />
        </div>
      </header>

      {/* Mobile Full-Screen Sea Salt Overlay with MorphSVG Rising Wave */}
      <div
        ref={mobileOverlayRef}
        role="dialog"
        aria-modal="true"
        aria-label={companyName}
        className="fixed inset-0 z-50 md:hidden opacity-0 pointer-events-none"
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full fill-sea-salt"
        >
          <path ref={mobileWavePathRef} d={WAVE_FLAT_BOTTOM} />
        </svg>

        <div
          ref={mobileContentRef}
          className="relative z-10 flex h-full flex-col justify-between px-6 pt-5 pb-10 text-deep-hull"
        >
          {/* Mobile Menu Top Bar */}
          <div className="flex items-center justify-between">
            <a
              href="#hero"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('hero');
              }}
              className="flex items-center gap-3"
            >
              <img
                src="/logos/logo-trans.png"
                alt={companyName}
                className="h-9 w-auto object-contain"
              />
            </a>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleAudio}
                aria-label={
                  isAudioEnabled
                    ? navConfig?.audio_label_on
                    : navConfig?.audio_label_off
                }
                aria-pressed={isAudioEnabled}
                className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] border border-deep-hull/15 text-deep-hull"
              >
                {isAudioEnabled ? (
                  <SpeakerHigh size={18} weight="regular" />
                ) : (
                  <SpeakerSlash size={18} weight="regular" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label={navConfig?.menu_close_label}
                className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] border border-deep-hull/15 text-deep-hull"
              >
                <X size={20} weight="regular" />
              </button>
            </div>
          </div>

          {/* Mobile Menu Links in Gambetta */}
          <nav aria-label="Mobile" className="flex flex-col gap-4 my-auto overflow-y-auto py-4">
            {links.map((link) => {
              if (link.id === 'stores') {
                return (
                  <div key={link.id} data-mobile-link className="flex flex-col">
                    <div className="flex items-center justify-between">
                      <a
                        href={`#${link.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          handleNavClick(link.id);
                        }}
                        className="font-display text-4xl leading-tight text-deep-hull hover:text-[#00A8CC] transition-colors duration-300"
                      >
                        {link.label}
                      </a>
                      <button
                        type="button"
                        onClick={() => setIsMobileStoresExpanded((prev) => !prev)}
                        aria-expanded={isMobileStoresExpanded}
                        aria-label="Toggle store types"
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-deep-hull/70 hover:text-deep-hull transition-colors"
                      >
                        <CaretDown
                          size={22}
                          weight="bold"
                          className={`transition-transform duration-200 ${
                            isMobileStoresExpanded ? 'rotate-180' : 'rotate-0'
                          }`}
                        />
                      </button>
                    </div>

                    {isMobileStoresExpanded && (
                      <div className="mt-2.5 mb-1 grid grid-cols-2 gap-x-4 gap-y-1.5 pl-1">
                        {storeItems.map((store) => (
                          <button
                            key={store.id}
                            type="button"
                            onClick={() => handleStoreSelect(store.id)}
                            className="py-1.5 text-left font-sans text-sm font-medium text-deep-hull/75 hover:text-[#008CAE] transition-colors truncate"
                          >
                            {store.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  data-mobile-link
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(link.id);
                  }}
                  className="font-display text-4xl leading-tight text-deep-hull hover:text-[#00A8CC] transition-colors duration-300"
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          {/* Mobile Menu Bottom CTA */}
          <div data-mobile-link className="pt-6 border-t border-deep-teal/20">
            <a
              href="#contact"
              onClick={handleRequestQuote}
              className="flex w-full items-center justify-center rounded-[var(--radius-sm)] bg-signal-blue py-4 text-base font-medium text-sea-salt shadow-hull"
            >
              {navConfig?.cta_label}
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

export default Navbar;
