/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { initLenis, destroyLenis } from './lib/lenis';
import { ScrollTrigger, useGSAP } from './lib/scroll';
import { initThemeObserver } from './lib/theme';

import { Preloader } from './sections/Preloader';
import { Navbar } from './sections/Navbar';
import { Cursor } from './sections/Cursor';
import { Hero } from './sections/Hero';
import { About } from './sections/About';
import { Memberships } from './sections/Memberships';
import { Stores } from './sections/Stores';
import { Services } from './sections/Services';
import { WhyUs } from './sections/WhyUs';
import { Sectors } from './sections/Sectors';
import { Network } from './sections/Network';
import { Contact } from './sections/Contact';
import { ContactDirectory } from './sections/ContactDirectory';

export default function App() {
  const mainRef = useRef<HTMLElement>(null);

  // Initialize the single Lenis instance and refresh ScrollTrigger after fonts/layout settle
  useEffect(() => {
    initLenis();

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        ScrollTrigger.refresh();
      });
    }

    const handleLoad = () => ScrollTrigger.refresh();
    const handleOrientationChange = () => ScrollTrigger.refresh();

    window.addEventListener('load', handleLoad);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('load', handleLoad);
      window.removeEventListener('orientationchange', handleOrientationChange);
      destroyLenis();
    };
  }, []);

  // Wire data-nav-theme ScrollTriggers for all sections
  useGSAP(
    () => {
      const cleanup = initThemeObserver(document);
      return cleanup;
    },
    { scope: mainRef }
  );

  return (
    <div className="relative min-h-[100dvh] bg-sea-salt text-deep-hull selection:bg-signal-blue selection:text-sea-salt">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-deep-hull focus:px-5 focus:py-2.5 focus:font-sans focus:text-xs focus:font-semibold focus:text-sea-salt focus:shadow-lg"
      >
        Skip to main content
      </a>

      <Preloader />
      <Cursor />
      <Navbar />

      <main id="main-content" ref={mainRef}>
        <Hero />
        <About />
        <Memberships />
        <Stores />
        <Services />
        <WhyUs />
        <Sectors />
        <Network />
        <Contact />
      </main>

      <ContactDirectory />
    </div>
  );
}
