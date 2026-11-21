import { useRef } from 'react';
import { gsap, useGSAP, MOTION } from '../../lib/scroll';
import { Counter } from '../../components/Counter';
import aboutData from '../../content/about.json';

/**
 * Section 3: About
 * - Sea Salt editorial band continuing seamlessly from the Hero's rising Sea Salt veil.
 * - Architectural 3-column metrics bar with vertical hairline dividers and live count-up counters.
 */
export function About() {
  const sectionRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const about = aboutData?.about_us;
  const counters = aboutData?.counter ?? [];

  useGSAP(
    () => {
      const section = sectionRef.current;
      const bar = barRef.current;
      if (!section || !bar) return;

      const mm = gsap.matchMedia();

      mm.add(
        {
          canAnimate: '(prefers-reduced-motion: no-preference)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const { reduceMotion } = context.conditions ?? {};
          const rules = bar.querySelectorAll<HTMLElement>('.arch-rule-x');
          const dividers = bar.querySelectorAll<HTMLElement>('.arch-divider-y');
          const ticks = bar.querySelectorAll<HTMLElement>('.arch-accent-tick');
          const cols = bar.querySelectorAll<HTMLElement>('.arch-stat-col');

          if (reduceMotion) {
            gsap.set([rules, dividers, ticks, cols], {
              clearProps: 'all',
              autoAlpha: 1,
            });
            return;
          }

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: bar,
              start: 'top 86%',
              once: true,
            },
          });

          if (rules.length > 0) {
            tl.fromTo(
              rules,
              { scaleX: 0, transformOrigin: 'center center' },
              { scaleX: 1, duration: 0.9, ease: MOTION.easeOut, stagger: 0.08 },
              0
            );
          }

          if (dividers.length > 0) {
            tl.fromTo(
              dividers,
              { scaleY: 0, transformOrigin: 'center center' },
              { scaleY: 1, duration: 0.85, ease: MOTION.easeOut, stagger: 0.1 },
              0.12
            );
          }

          if (cols.length > 0) {
            tl.fromTo(
              cols,
              { y: 26, autoAlpha: 0 },
              {
                y: 0,
                autoAlpha: 1,
                duration: 0.85,
                ease: MOTION.easeOut,
                stagger: 0.12,
              },
              0.1
            );
          }

          if (ticks.length > 0) {
            tl.fromTo(
              ticks,
              { scaleX: 0, transformOrigin: 'left center' },
              {
                scaleX: 1,
                duration: 0.6,
                ease: MOTION.easeOut,
                stagger: 0.12,
              },
              0.38
            );
          }
        }
      );

      return () => mm.revert();
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      id="about"
      data-section="about"
      data-nav-theme="light"
      aria-label={about?.eyebrow ?? 'About Global Marine Supplies'}
      className="relative z-20 motion-safe:-mt-[22vh] motion-safe:sm:-mt-[26vh] motion-safe:md:-mt-[30vh] w-full bg-sea-salt text-deep-hull pt-2 pb-12 md:pt-4 md:pb-16"
    >
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-10 md:px-12 lg:px-16">
        {/* Minimalist Architectural Counter Bar with Vertical Dividers */}
        <div ref={barRef} className="relative">
          {/* Top Hairline Rule */}
          <div
            aria-hidden="true"
            className="arch-rule-x h-px w-full bg-gradient-to-r from-deep-hull/10 via-deep-hull/20 to-deep-hull/10"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3">
            {counters.map((item, idx) => (
              <div
                key={item.text}
                className="arch-stat-col group relative flex flex-col items-start sm:items-center sm:text-center px-4 py-9 sm:px-6 md:px-10 md:py-14 transition-colors duration-300 hover:bg-harbour-mist/25"
              >
                {/* Vertical Architectural Divider (desktop/tablet columns 2 & 3) */}
                {idx > 0 && (
                  <span
                    aria-hidden="true"
                    className="arch-divider-y hidden sm:block absolute left-0 top-7 bottom-7 w-px bg-gradient-to-b from-transparent via-deep-hull/18 to-transparent"
                  />
                )}

                {/* Horizontal Divider for stacked mobile view */}
                {idx > 0 && (
                  <span
                    aria-hidden="true"
                    className="arch-rule-x sm:hidden absolute top-0 inset-x-2 h-px bg-deep-hull/12"
                  />
                )}

                {/* Subtle top aqua tick hover highlight */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-0 bg-gradient-to-r from-deep-teal to-sonar-cyan transition-all duration-500 ease-out group-hover:w-20"
                />

                <div className="font-display text-[length:clamp(2.85rem,4.5vw,4.5rem)] font-normal tracking-[-0.03em] text-deep-hull leading-none transition-colors duration-300 group-hover:text-signal-blue">
                  <Counter
                    value={item.count}
                    suffix={item.suffix ?? '+'}
                    duration={3}
                    ease="power2.out"
                  />
                </div>

                {/* Precision architectural aqua accent rule */}
                <span
                  aria-hidden="true"
                  className="arch-accent-tick mt-5 h-[1.5px] w-9 bg-gradient-to-r from-deep-teal to-sonar-cyan transition-all duration-300 group-hover:w-14"
                />

                <p className="mt-3.5 font-sans text-xs md:text-[13px] font-semibold uppercase tracking-[0.16em] text-deep-hull/70">
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          {/* Bottom Hairline Rule */}
          <div
            aria-hidden="true"
            className="arch-rule-x h-px w-full bg-gradient-to-r from-deep-hull/10 via-deep-hull/20 to-deep-hull/10"
          />
        </div>
      </div>
    </section>
  );
}

export default About;
