import { useRef } from 'react';
import { ArrowUp } from '@phosphor-icons/react';
import { scrollToTarget } from '../../lib/lenis';
import { OceanWaveCanvas } from '../../components/OceanWaveCanvas';
import siteData from '../../content/site.json';

/**
 * Section 11: Footer (Minimalist Interactive Ocean Band)
 * - Short, calm deep ocean-teal surface (`#005268` reference palette) crowned with a subtle
 *   undulating top wave crest transitioning seamlessly from the Sea Salt Contact section.
 * - Interactive silky water surface reacts smoothly to mouse touch and trails ripples behind
 *   pointer movement before settling calmly back to ambient swells.
 * - Left: Minimalist upward arrow button returning smoothly to the top of the page.
 * - Center: ISO certification & copyright line with muted creator watermark directly beneath.
 */
export function Footer() {
  const footerRef = useRef<HTMLElement>(null);
  const footerCopy = siteData?.footer;

  const backToTopLabel =
    footerCopy?.back_to_top_label ??
    siteData?.navigation?.back_to_top_label ??
    'Back to top';

  const creatorCredit =
    footerCopy?.creator_credit ??
    'Site Designed & Developed with Precision by The Presence';

  return (
    <footer
      ref={footerRef}
      id="footer"
      data-section="footer"
      data-nav-theme="dark"
      className="relative w-full min-h-[128px] md:min-h-[140px] overflow-hidden bg-[#005268] text-sea-salt select-none"
    >
      {/* Interactive Silky Ocean Wave Canvas + Undulating Top Crest */}
      <OceanWaveCanvas interactionRootRef={footerRef} />

      {/* Minimalist Foreground Content (pointer-events-none so hover ripples water everywhere) */}
      <div className="pointer-events-none relative z-10 mx-auto w-full max-w-6xl px-6 md:px-12 pt-9 pb-5 md:pt-10 md:pb-6">
        <div className="flex flex-col sm:grid sm:grid-cols-[44px_1fr_44px] items-center gap-4 sm:gap-6">
          {/* Left: Minimalist Upward Arrow Back-to-Top Button */}
          <div className="flex items-center justify-center sm:justify-start">
            <button
              type="button"
              onClick={() => scrollToTarget(0)}
              aria-label={backToTopLabel}
              title={backToTopLabel}
              className="pointer-events-auto group flex h-10 w-10 items-center justify-center rounded-full border border-sea-salt/25 bg-sea-salt/[0.08] text-sea-salt/90 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-sonar-cyan/75 hover:bg-sea-salt/[0.15] hover:text-white cursor-pointer"
            >
              <ArrowUp
                size={16}
                weight="regular"
                className="transition-transform duration-300 ease-out group-hover:-translate-y-0.5"
              />
            </button>
          </div>

          {/* Center: Main Legal / ISO Line + Muted Creator Watermark Below */}
          <div className="flex flex-col items-center text-center">
            <p className="font-sans text-[13px] md:text-[14px] leading-relaxed tracking-[0.01em] text-sea-salt/90">
              An ISO Certified &amp; Verified Company.{' '}
              <span className="font-semibold text-white">
                GMS Shipchandlers LLC
              </span>{' '}
              © All Rights Reserved.
            </p>

            <p className="mt-2 font-sans text-[11px] font-normal tracking-[0.035em] text-sea-salt/45">
              {creatorCredit}
            </p>
          </div>

          {/* Right Optical Balance Spacer so Center Copy Remains Truly Centered */}
          <div aria-hidden="true" className="hidden sm:block" />
        </div>
      </div>
    </footer>
  );
}

export default Footer;
