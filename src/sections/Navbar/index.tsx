import { useEffect, useRef, useState, useCallback } from 'react';
import {
  SpeakerHigh,
  SpeakerSlash,
  List,
  X,
  PhoneCall,
  GlobeHemisphereWest,
} from '@phosphor-icons/react';
import { gsap, ScrollTrigger, useGSAP, MOTION } from '../../lib/scroll';
import { getLenis, scrollToTarget, stopLenis, startLenis } from '../../lib/lenis';
import { useAppStore } from '../../lib/store';
import siteData from '../../content/site.json';

// SVG paths for the mobile menu wave reveal (MorphSVG: flat at bottom -> rising wave -> full screen)
const WAVE_FLAT_BOTTOM = 'M 0 100 Q 50 100 100 100 L 100 100 L 0 100 Z';
const WAVE_CREST = 'M 0 55 Q 50 20 100 55 L 100 100 L 0 100 Z';
const WAVE_FULL = 'M 0 0 Q 50 0 100 0 L 100 100 L 0 100 Z';

/**
 * Global Navbar (DESIGN.md G1):
 * - Slim bar (72px desktop, 64px mobile): logo left, section links centre, audio toggle + "Request a quote" right.
 * - 1px full-width scroll progress line along bottom edge in Deep Teal (Sonar Cyan over dark sections), eased so it glides.
 * - Hidden while inside the Hero (`isHeroPinned`). When the Hero ends, the glass bar fades in around the docked logo;
 *   links, toggle, and button follow with a 0.05s stagger; progress line appears.
 * - Active state: hides on scroll down, returns on scroll up.
 * - 2px Deep Teal (Sonar Cyan on dark) active indicator slides between links.
 * - Audio toggle: session-persisted on/off state, accessible label, default off.
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

  const [isHiddenOnScroll, setIsHiddenOnScroll] = useState(false);
  const lastScrollYRef = useRef(0);
  const hasFormedOnceRef = useRef(false);

  const isDark = navTheme === 'dark';
  const companyName = siteData?.website_info?.company_name ?? '';
  const navConfig = siteData?.navigation;
  const links = navConfig?.links ?? [];

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
      const shouldHide = !isHeroPinned && isHiddenOnScroll && !isMobileMenuOpen;
      gsap.to(headerRef.current, {
        yPercent: shouldHide ? -100 : 0,
        duration: 0.35,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    },
    { scope: headerRef, dependencies: [isHiddenOnScroll, isHeroPinned, isMobileMenuOpen] }
  );

  // Slide 2px active indicator between section links
  const updateIndicator = useCallback(() => {
    const navEl = navContainerRef.current;
    const indicatorEl = indicatorRef.current;
    if (!navEl || !indicatorEl) return;

    // Map "memberships" -> "about" and "why-us" -> "services" so the indicator always reflects the active area
    const normalizedId =
      activeSection === 'memberships'
        ? 'about'
        : activeSection === 'why-us'
          ? 'services'
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

  const handleNavClick = (sectionId: string) => {
    const offset = window.innerWidth >= 768 ? -72 : -64;

    const executeScroll = () => {
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
      scrollToTarget(`#${sectionId}`, { offset });
    };

    if (isMobileMenuOpen) {
      setMobileMenuOpen(false);
      window.setTimeout(executeScroll, 320);
    } else {
      executeScroll();
    }
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
          {/* Zone 1: Single Logo Element (starts at #hero-logo-anchor, moves & scales to dock here on scroll) */}
          <a
            id="navbar-logo-slot"
            href="#hero"
            onClick={(e) => {
              e.preventDefault();
              scrollToTarget('#hero', { offset: 0 });
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
            {links.map((link) => (
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
            ))}

            {/* 2px sliding active indicator */}
            <span
              ref={indicatorRef}
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-1 left-0 h-[2px] rounded-full opacity-0 transition-colors duration-300 bg-sonar-cyan"
            />
          </nav>

          {/* Zone 3: Call Dummy Number + Globe Network + Audio Toggle + Mobile Menu Button */}
          <div className="flex items-center gap-2.5 md:gap-3 shrink-0">
            {/* Quick Action: Call 24/7 Operations (Dummy Number) */}
            <a
              href="tel:+97148800000"
              data-nav-stagger
              aria-label="Call 24/7 Operations: +971 4 880 0000"
              title="Call 24/7 Operations: +971 4 880 0000"
              className={`flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full border transition-all duration-300 shadow-sm backdrop-blur-md shrink-0 ${
                isDark
                  ? 'border-white/20 bg-white/10 text-white hover:border-sonar-cyan hover:bg-sonar-cyan/25 hover:text-sonar-cyan'
                  : 'border-deep-hull/20 bg-deep-hull/8 text-deep-hull hover:border-sonar-cyan hover:bg-sonar-cyan/15 hover:text-[#00A8CC]'
              }`}
            >
              <PhoneCall size={18} weight="bold" />
            </a>

            {/* Quick Action: Global Locations / Network */}
            <button
              type="button"
              data-nav-stagger
              onClick={() => scrollToTarget('#network')}
              aria-label="Explore Global Network"
              title="Explore Global Network"
              className={`flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full border transition-all duration-300 shadow-sm backdrop-blur-md shrink-0 ${
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
              className={`flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full border transition-all duration-300 shadow-sm backdrop-blur-md shrink-0 ${
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

        {/* 1px full-width scroll progress line along bottom edge */}
        <div
          data-nav-progress
          className="pointer-events-none absolute bottom-0 inset-x-0 h-[1px] bg-transparent overflow-hidden opacity-0"
        >
          <div
            ref={progressBarRef}
            style={{
              transform: 'scaleX(0)',
              transformOrigin: 'left center',
            }}
            className={`h-full w-full transition-colors duration-300 ${
              isDark ? 'bg-sonar-cyan' : 'bg-deep-teal'
            }`}
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
                setMobileMenuOpen(false);
                scrollToTarget('#hero', { offset: 0 });
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
          <nav aria-label="Mobile" className="flex flex-col gap-5 my-auto">
            {links.map((link) => (
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
            ))}
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
