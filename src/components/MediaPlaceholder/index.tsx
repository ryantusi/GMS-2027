import type { ComponentType } from 'react';
import {
  Anchor,
  Compass,
  Boat,
  Package,
  ShieldCheck,
  Wrench,
  Certificate,
  GlobeHemisphereWest,
  Buildings,
  Lifebuoy,
  Drop,
  Lightning,
  FileText,
  Cube,
} from '@phosphor-icons/react';

export type PlaceholderIconType =
  | 'anchor'
  | 'compass'
  | 'ship'
  | 'package'
  | 'shield'
  | 'wrench'
  | 'certificate'
  | 'globe'
  | 'buildings'
  | 'lifebuoy'
  | 'drop'
  | 'lightning'
  | 'file'
  | 'cube';

const ICON_MAP: Record<PlaceholderIconType, ComponentType<{ size?: number; weight?: 'thin' | 'light' | 'regular' | 'bold' | 'duotone'; className?: string }>> = {
  anchor: Anchor,
  compass: Compass,
  ship: Boat,
  package: Package,
  shield: ShieldCheck,
  wrench: Wrench,
  certificate: Certificate,
  globe: GlobeHemisphereWest,
  buildings: Buildings,
  lifebuoy: Lifebuoy,
  drop: Drop,
  lightning: Lightning,
  file: FileText,
  cube: Cube,
};

export interface MediaPlaceholderProps {
  label: string;
  sublabel?: string;
  icon?: PlaceholderIconType;
  aspectRatio?: string;
  theme?: 'light' | 'dark' | 'warm';
  className?: string;
}

/**
 * On-brand fallback component (DESIGN.md 1.5 & 1.6).
 * Uses the token palette, a subtle Deep Teal / Sonar Cyan maritime coordinate pattern
 * at low opacity, a Phosphor icon, and the item's real name from the content JSON.
 */
export function MediaPlaceholder({
  label,
  sublabel,
  icon = 'anchor',
  aspectRatio = '16 / 10',
  theme = 'light',
  className = '',
}: MediaPlaceholderProps) {
  const IconComponent = ICON_MAP[icon] ?? Anchor;

  const isDark = theme === 'dark';
  const isWarm = theme === 'warm';

  const bgClass = isDark
    ? 'bg-deep-hull text-sea-salt border-sonar-cyan/20'
    : isWarm
      ? 'bg-warm-paper text-deep-hull border-deep-teal/20'
      : 'bg-harbour-mist/55 text-deep-hull border-deep-teal/15';

  const lineStroke = isDark ? 'rgba(3, 197, 236, 0.12)' : 'rgba(0, 119, 134, 0.1)';
  const accentColor = isDark ? 'text-sonar-cyan' : 'text-deep-teal';

  return (
    <div
      style={{ aspectRatio }}
      className={`relative overflow-hidden rounded-[var(--radius-md)] border ${bgClass} flex flex-col items-center justify-center p-6 select-none shadow-hull ${className}`}
      role="img"
      aria-label={label}
    >
      {/* Subtle nautical chart grid & compass ring in Deep Teal / Sonar Cyan */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, ${lineStroke} 0%, transparent 70%),
            linear-gradient(to right, ${lineStroke} 1px, transparent 1px),
            linear-gradient(to bottom, ${lineStroke} 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 32px 32px, 32px 32px',
        }}
      />

      {/* Corner technical hairlines */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-3 left-3 w-3 h-3 border-t border-l ${
          isDark ? 'border-sonar-cyan/40' : 'border-deep-teal/35'
        }`}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-3 right-3 w-3 h-3 border-t border-r ${
          isDark ? 'border-sonar-cyan/40' : 'border-deep-teal/35'
        }`}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-3 left-3 w-3 h-3 border-b border-l ${
          isDark ? 'border-sonar-cyan/40' : 'border-deep-teal/35'
        }`}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-3 right-3 w-3 h-3 border-b border-r ${
          isDark ? 'border-sonar-cyan/40' : 'border-deep-teal/35'
        }`}
      />

      {/* Central Icon & Label */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-[26ch]">
        <div
          className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full border ${
            isDark
              ? 'border-sonar-cyan/30 bg-night-port/60'
              : 'border-deep-teal/25 bg-sea-salt/80'
          } ${accentColor}`}
        >
          <IconComponent size={24} weight="light" />
        </div>
        <span className="font-display text-base md:text-lg font-medium leading-tight tracking-tight">
          {label}
        </span>
        {sublabel && (
          <span
            className={`mt-1 text-xs ${
              isDark ? 'text-sea-salt/65' : 'text-deep-hull/65'
            }`}
          >
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

export default MediaPlaceholder;
