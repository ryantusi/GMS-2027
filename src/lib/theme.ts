import { ScrollTrigger } from './scroll';
import { useAppStore, type NavTheme } from './store';

/**
 * Sets up ScrollTriggers for every section carrying `[data-nav-theme]`
 * so the Navbar and Custom Cursor adapt smoothly as sections pass.
 * Also tracks Hero active state (`isHeroPinned`), Contact visibility (`isContactVisible`),
 * overall page scroll progress, and active section id.
 */
export function initThemeObserver(root: HTMLElement | Document = document): () => void {
  const sections = Array.from(
    root.querySelectorAll<HTMLElement>('main [data-nav-theme], footer[data-nav-theme]')
  );

  const triggers: ScrollTrigger[] = [];

  sections.forEach((section) => {
    const sectionId = section.getAttribute('id') || '';

    const themeTrigger = ScrollTrigger.create({
      trigger: section,
      start: 'top 72px',
      end: 'bottom 72px',
      onEnter: () => {
        const currentTheme = (section.getAttribute('data-nav-theme') as NavTheme) || 'light';
        useAppStore.getState().setNavTheme(currentTheme);
      },
      onEnterBack: () => {
        const currentTheme = (section.getAttribute('data-nav-theme') as NavTheme) || 'light';
        useAppStore.getState().setNavTheme(currentTheme);
      },
    });

    triggers.push(themeTrigger);

    // Track polarity at the bottom-right corner (`bottom-6`) for the floating Contact Us pill
    const bottomTrigger = ScrollTrigger.create({
      trigger: section,
      start: 'top bottom-=44px',
      end: 'bottom bottom-=44px',
      onToggle: (self) => {
        if (self.isActive) {
          const currentTheme = (section.getAttribute('data-nav-theme') as NavTheme) || 'light';
          useAppStore.getState().setBottomTheme(currentTheme);
        }
      },
      onEnter: () => {
        const currentTheme = (section.getAttribute('data-nav-theme') as NavTheme) || 'light';
        useAppStore.getState().setBottomTheme(currentTheme);
      },
      onEnterBack: () => {
        const currentTheme = (section.getAttribute('data-nav-theme') as NavTheme) || 'light';
        useAppStore.getState().setBottomTheme(currentTheme);
      },
      onLeaveBack: () => {
        if (sectionId === 'footer') {
          useAppStore.getState().setBottomTheme('light');
        }
      },
    });

    triggers.push(bottomTrigger);

    // Hero manages hero/about transition during its pinned scrub; footer never overrides Contact
    if (sectionId && sectionId !== 'hero' && sectionId !== 'footer') {
      const activeTrigger = ScrollTrigger.create({
        trigger: section,
        start: 'top 35%',
        end: 'bottom 35%',
        onToggle: (self) => {
          if (self.isActive) {
            useAppStore.getState().setActiveSection(sectionId);
          }
        },
        onEnter: () => useAppStore.getState().setActiveSection(sectionId),
        onEnterBack: () => useAppStore.getState().setActiveSection(sectionId),
      });

      triggers.push(activeTrigger);
    }
  });

  // Note: Hero active pinned state is managed directly with exact scrub precision in Hero/index.tsx

  // Track Contact section visibility (hides floating Contact pill when Contact is on screen)
  const contactEl = root.querySelector<HTMLElement>('#contact');
  if (contactEl) {
    const contactTrigger = ScrollTrigger.create({
      trigger: contactEl,
      start: 'top 85%',
      end: 'bottom 15%',
      onToggle: (self) => useAppStore.getState().setContactVisible(self.isActive),
    });
    triggers.push(contactTrigger);
  }

  const pageProgressTrigger = ScrollTrigger.create({
    trigger: document.documentElement,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      useAppStore.getState().setScrollProgress(self.progress);
    },
  });

  triggers.push(pageProgressTrigger);

  return () => {
    triggers.forEach((t) => t.kill());
  };
}
