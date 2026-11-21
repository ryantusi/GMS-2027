# Lenis (smooth scroll), used with GSAP ScrollTrigger

Install: `npm install lenis` and `import Lenis from 'lenis'`.
Create ONE instance in src/lib/lenis.ts. Never create another.

## GSAP integration (use exactly this)

const lenis = new Lenis()
lenis.on('scroll', ScrollTrigger.update)
gsap.ticker.add((time) => { lenis.raf(time * 1000) })
gsap.ticker.lagSmoothing(0)

Do not also use Lenis's own autoRaf or a second requestAnimationFrame loop.
## Methods we use

- lenis.stop() / lenis.start(): pause scrolling while the preloader or a modal is open
- lenis.scrollTo(target, { offset: -72, duration: 1.4 }): nav links, back to top
- lenis.velocity: scroll speed, used by the logo band's speed boost
- lenis.on('scroll', callback)

## Scrollable areas inside the page

Modals, drawers and the contact directory that scroll internally need the attribute
data-lenis-prevent on their scrolling element, or Lenis will scroll the page instead.

## Cleanup

Call lenis.destroy() on unmount and remove the ticker callback.
