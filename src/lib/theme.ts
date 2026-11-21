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

    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top 72px',
      end: 'bottom 72px',
      onEnter: () => {
        const currentTheme = (section.getAttribute('data-nav-theme') as NavTheme) || 'light';
        useAppStore.getState().setNavTheme(currentTheme);
        if (sectionId) useAppStore.getState().setActiveSection(sectionId);
      },
      onEnterBack: () => {
        const currentTheme = (section.getAttribute('data-nav-theme') as NavTheme) || 'light';
        useAppStore.getState().setNavTheme(currentTheme);
        if (sectionId) useAppStore.getState().setActiveSection(sectionId);
      },
    });

    triggers.push(st);
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
