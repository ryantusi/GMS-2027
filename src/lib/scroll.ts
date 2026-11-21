import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { useGSAP } from '@gsap/react';

// Register all GSAP plugins once at module initialization (docs/gsap/plugins.md)
gsap.registerPlugin(
  ScrollTrigger,
  Flip,
  SplitText,
  DrawSVGPlugin,
  MorphSVGPlugin,
  MotionPathPlugin,
  useGSAP
);

export const MOTION = {
  easeOut: 'expo.out',
  easeInOut: 'power3.inOut',
  easeScrub: 'none',
  durFast: 0.25,
  durBase: 0.6,
  durSlow: 1.2,
  scrub: 0.6,
  staggerFast: 0.04,
  staggerBase: 0.08,
  staggerSlow: 0.12,
} as const;

export function isDebugMode(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('debug');
}

export function isSkipPreloader(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('skipPreloader');
}

if (typeof window !== 'undefined' && isDebugMode()) {
  ScrollTrigger.defaults({ markers: true });
}

export {
  gsap,
  ScrollTrigger,
  Flip,
  SplitText,
  DrawSVGPlugin,
  MorphSVGPlugin,
  MotionPathPlugin,
  useGSAP,
};
