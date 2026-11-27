import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  Anchor,
  Drop,
  Engine,
  GearSix,
  Handshake,
  Package,
  Trash,
  Wrench,
} from '@phosphor-icons/react';
import { gsap, SplitText, useGSAP, MOTION } from '../../lib/scroll';
import { useAppStore } from '../../lib/store';
import servicesData from '../../content/services.json';

interface ServiceItem {
  name: string;
  icon: string;
  zone: string;
  description: string;
  boxX: number;
  boxY: number;
  hullX: number;
  hullY: number;
}

interface ServiceIconProps {
  size?: number;
  weight?: 'regular' | 'duotone' | 'bold';
  className?: string;
}

/** Custom Phosphor-weight duotone Cash Bundle SVG for Cash to Master */
function CashBundleIcon({ size = 22, className = '' }: ServiceIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect x="16" y="48" width="184" height="112" rx="12" fill="currentColor" opacity="0.16" />
      <rect x="86" y="48" width="44" height="112" fill="currentColor" opacity="0.22" />
      <rect
        x="16"
        y="48"
        width="184"
        height="112"
        rx="12"
        stroke="currentColor"
        strokeWidth="16"
        strokeLinejoin="round"
      />
      <path
        d="M40 184H208A12 12 0 0 0 220 172V72"
        stroke="currentColor"
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M64 208H228A12 12 0 0 0 240 196V96"
        stroke="currentColor"
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="86"
        y="48"
        width="44"
        height="112"
        stroke="currentColor"
        strokeWidth="16"
        strokeLinejoin="round"
      />
      <path
        d="M86 160L134 208M130 160L178 208"
        stroke="currentColor"
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const SERVICE_ICON_MAP: Record<string, ComponentType<ServiceIconProps>> = {
  gear: GearSix,
  drop: Drop,
  package: Package,
  handshake: Handshake,
  cash: CashBundleIcon,
  trash: Trash,
  wrench: Wrench,
  engine: Engine,
  anchor: Anchor,
};

interface ServiceTiltCardProps {
  children: ReactNode;
  className?: string;
  isActive?: boolean;
  maxTilt?: number;
  dataCursor?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onClick?: () => void;
}

function ServiceTiltCard({
  children,
  className = '',
  isActive = false,
  maxTilt = 6.5,
  dataCursor,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  onClick,
}: ServiceTiltCardProps) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'touch') return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const el = cardRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const px = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    const py = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1);

    const relX = px * 2 - 1;
    const relY = py * 2 - 1;

    const rotateX = -relY * maxTilt;
    const rotateY = relX * maxTilt;
    const shadowX = -relX * 10;
    const shadowY = 18 - relY * 8;

    gsap.to(el, {
      rotateX,
      rotateY,
      scale: 1.035,
      y: -4,
      transformPerspective: 950,
      boxShadow: `${shadowX.toFixed(1)}px ${shadowY.toFixed(1)}px 36px -8px rgba(8, 20, 32, 0.22), 0 10px 20px -6px rgba(14, 34, 51, 0.12)`,
      duration: 0.35,
      ease: 'power2.out',
      overwrite: 'auto',
    });

    if (glareRef.current) {
      const pctX = (px * 100).toFixed(1);
      const pctY = (py * 100).toFixed(1);
      glareRef.current.style.background = `radial-gradient(240px circle at ${pctX}% ${pctY}%, rgba(255, 255, 255, 0.85), rgba(3, 197, 236, 0.18) 44%, transparent 72%)`;
      gsap.to(glareRef.current, {
        autoAlpha: 1,
        duration: 0.25,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }
  };

  const handlePointerLeave = () => {
    const el = cardRef.current;
    if (el) {
      gsap.to(el, {
        rotateX: 0,
        rotateY: 0,
        scale: 1,
        y: 0,
        transformPerspective: 950,
        boxShadow:
          '0 12px 28px -8px rgba(8, 20, 32, 0.12), 0 4px 12px -4px rgba(14, 34, 51, 0.06)',
        duration: 0.55,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    }
    if (glareRef.current) {
      gsap.to(glareRef.current, {
        autoAlpha: 0,
        duration: 0.4,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }
    onMouseLeave?.();
  };

  return (
    <button
      ref={cardRef}
      type="button"
      data-cursor={dataCursor}
      aria-pressed={isActive}
      onMouseEnter={onMouseEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      onClick={onClick}
      style={{
        transformStyle: 'preserve-3d',
        boxShadow:
          '0 12px 28px -8px rgba(8, 20, 32, 0.12), 0 4px 12px -4px rgba(14, 34, 51, 0.06)',
      }}
      className={`group relative overflow-hidden will-change-transform ${className}`}
    >
      {/* Subtle Light Specular Frosted Rim Sheen */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/55 via-white/15 to-transparent"
      />
      <div className="relative z-10 w-full">{children}</div>
      {/* Dynamic Pointer Radial Glare */}
      <div
        ref={glareRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 opacity-0 mix-blend-soft-light"
      />
    </button>
  );
}

/**
 * Pixel-aligned SVG Tanker Photograph vs Technical Blueprint Fallback
 * Used automatically when `/services/ship.png` or `/services/blueprint.png` is missing or 0 bytes,
 * guaranteeing pixel-for-pixel alignment across the clip-path boundary until final production PNGs arrive.
 */
function VesselArtworkLayer({
  variant,
  designation,
}: {
  variant: 'photo' | 'blueprint';
  designation: string;
}) {
  const isPhoto = variant === 'photo';

  return (
    <svg
      viewBox="0 0 1200 440"
      className="h-full w-full select-none"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="photo-hull-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#17344B" />
          <stop offset="65%" stopColor="#0E2233" />
          <stop offset="100%" stopColor="#081420" />
        </linearGradient>
        <linearGradient id="photo-boot-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7A3528" />
          <stop offset="50%" stopColor="#944232" />
          <stop offset="100%" stopColor="#6B2D21" />
        </linearGradient>
        <linearGradient id="photo-superstructure" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F5F9FB" />
          <stop offset="100%" stopColor="#DCE8EE" />
        </linearGradient>
      </defs>

      {/* Technical Dimension & Station Framing (Blueprint only) */}
      {!isPhoto && (
        <g stroke="#007786" strokeOpacity="0.42" strokeWidth="1" fill="none">
          {/* Top & Bottom LOA Dimension Lines */}
          <line x1="110" y1="54" x2="1095" y2="54" strokeDasharray="4 4" />
          <line x1="110" y1="46" x2="110" y2="66" />
          <line x1="1095" y1="46" x2="1095" y2="66" />
          <text
            x="600"
            y="46"
            textAnchor="middle"
            fill="#007786"
            fontSize="10"
            fontFamily="var(--font-sans)"
            letterSpacing="0.14em"
          >
            LOA 274.00 M · LBP 264.00 M · BEAM 48.00 M
          </text>

          {/* Vertical Frame Stations FR 10 through FR 90 */}
          {[180, 280, 380, 480, 580, 680, 780, 880, 980].map((xPos, i) => (
            <g key={xPos}>
              <line
                x1={xPos}
                y1="95"
                x2={xPos}
                y2="345"
                stroke="#007786"
                strokeOpacity="0.22"
                strokeDasharray="2 4"
              />
              <text
                x={xPos}
                y="362"
                textAnchor="middle"
                fill="#007786"
                fillOpacity="0.65"
                fontSize="9"
                fontFamily="var(--font-sans)"
              >
                FR {(i + 1) * 10}
              </text>
            </g>
          ))}
        </g>
      )}

      {/* Aft Superstructure / Bridge & Accommodation Block (x: 165..295, y: 102..220) */}
      <g>
        {/* Funnel / Stack */}
        <path
          d="M 172 128 L 204 128 L 212 215 L 168 215 Z"
          fill={isPhoto ? '#0B5E8E' : 'none'}
          stroke={isPhoto ? '#0E2233' : '#007786'}
          strokeWidth="1.5"
        />
        <rect
          x="174"
          y="142"
          width="32"
          height="10"
          fill={isPhoto ? '#C08A3E' : 'none'}
          stroke={isPhoto ? 'none' : '#03C5EC'}
          strokeWidth="1"
        />

        {/* Main 5-tier Accommodation & Bridge Tower */}
        <path
          d="M 218 112 L 288 112 L 296 220 L 212 220 Z"
          fill={isPhoto ? 'url(#photo-superstructure)' : 'rgba(245, 249, 251, 0.82)'}
          stroke={isPhoto ? '#0E2233' : '#007786'}
          strokeWidth="1.75"
        />
        {/* Bridge Wing Overhang */}
        <rect
          x="208"
          y="100"
          width="90"
          height="14"
          rx="2"
          fill={isPhoto ? '#F5F9FB' : 'none'}
          stroke={isPhoto ? '#0E2233' : '#007786'}
          strokeWidth="1.5"
        />
        {/* Radar Mast & Satcom Domes */}
        <line
          x1="252"
          y1="68"
          x2="252"
          y2="100"
          stroke={isPhoto ? '#0E2233' : '#007786'}
          strokeWidth="2"
        />
        <line
          x1="234"
          y1="80"
          x2="270"
          y2="80"
          stroke={isPhoto ? '#0E2233' : '#007786'}
          strokeWidth="1.5"
        />
        <circle
          cx="224"
          cy="94"
          r="5"
          fill={isPhoto ? '#F5F9FB' : 'none'}
          stroke={isPhoto ? '#0E2233' : '#007786'}
          strokeWidth="1.2"
        />
        {/* Accommodation Deck Levels */}
        {[128, 146, 164, 182, 200].map((deckY) => (
          <line
            key={deckY}
            x1="216"
            y1={deckY}
            x2="292"
            y2={deckY}
            stroke={isPhoto ? 'rgba(14,34,51,0.35)' : '#007786'}
            strokeWidth="1"
          />
        ))}
      </g>

      {/* Deck Cranes, Manifolds & Catwalk (x: 320..960, y: 175..220) */}
      <g>
        {/* Fore & Aft Deck Pipe Rack */}
        <line
          x1="296"
          y1="212"
          x2="995"
          y2="212"
          stroke={isPhoto ? '#365870' : '#007786'}
          strokeWidth="2.5"
        />
        {/* Cargo Tank Hatch Domes */}
        {[360, 470, 580, 690, 800, 910].map((domeX) => (
          <rect
            key={domeX}
            x={domeX - 18}
            y="209"
            width="36"
            height="11"
            rx="2"
            fill={isPhoto ? '#1B3F58' : 'none'}
            stroke={isPhoto ? '#0E2233' : '#007786'}
            strokeWidth="1.25"
          />
        ))}
        {/* Midship Hose Handling Crane1 & Crane2 */}
        {[635, 845].map((craneX) => (
          <g key={craneX}>
            <rect
              x={craneX - 6}
              y="182"
              width="12"
              height="38"
              fill={isPhoto ? '#C08A3E' : 'none'}
              stroke={isPhoto ? '#0E2233' : '#007786'}
              strokeWidth="1.4"
            />
            <line
              x1={craneX}
              y1="186"
              x2={craneX + 58}
              y2="162"
              stroke={isPhoto ? '#C08A3E' : '#007786'}
              strokeWidth="2.2"
            />
            <line
              x1={craneX + 56}
              y1="162"
              x2={craneX + 56}
              y2="205"
              stroke={isPhoto ? '#0E2233' : '#03C5EC'}
              strokeWidth="1"
              strokeDasharray={isPhoto ? undefined : '2 2'}
            />
          </g>
        ))}
        {/* Forward Mast */}
        <line
          x1="990"
          y1="148"
          x2="990"
          y2="215"
          stroke={isPhoto ? '#0E2233' : '#007786'}
          strokeWidth="2"
        />
      </g>

      {/* Main Vessel Hull Profile (x: 112..1092, y: 205..324) */}
      <g>
        {/* Upper Topsides Hull */}
        <path
          d="M 118 220 L 995 220 L 1030 206 L 1092 206 C 1076 238, 1062 258, 1068 278 L 132 278 C 120 262, 114 242, 118 220 Z"
          fill={isPhoto ? 'url(#photo-hull-grad)' : 'rgba(0, 119, 134, 0.06)'}
          stroke={isPhoto ? '#081420' : '#007786'}
          strokeWidth="2"
        />

        {/* Lower Antifouling / Boot-Top & Bulbous Bow */}
        <path
          d="M 132 278 L 1068 278 C 1084 282, 1098 292, 1095 306 C 1092 318, 1074 324, 1045 324 L 168 324 C 152 324, 144 312, 144 300 C 132 294, 128 286, 132 278 Z"
          fill={isPhoto ? 'url(#photo-boot-grad)' : 'rgba(3, 197, 236, 0.06)'}
          stroke={isPhoto ? '#522017' : '#007786'}
          strokeWidth="1.75"
        />

        {/* Plimsoll & Hull Name Marking (Photograph) */}
        {isPhoto && (
          <g fill="#F5F9FB" fillOpacity="0.82">
            <text
              x="955"
              y="246"
              fontSize="11"
              fontWeight="600"
              fontFamily="var(--font-sans)"
              letterSpacing="0.16em"
            >
              GMS HORIZON
            </text>
            {/* Bow Thruster Mark */}
            <circle
              cx="1032"
              cy="302"
              r="7"
              fill="none"
              stroke="#F5F9FB"
              strokeOpacity="0.55"
              strokeWidth="1.2"
            />
          </g>
        )}

        {/* Internal Blueprint Cutaway: Cargo Tanks, Cofferdams, Engine Room & Shaft */}
        {!isPhoto && (
          <g stroke="#007786" strokeWidth="1.1" fill="none">
            {/* Internal Cargo Tank Bulkheads */}
            {[310, 425, 540, 655, 770, 885, 985].map((bx, idx) => (
              <g key={bx}>
                <line x1={bx} y1="220" x2={bx} y2="324" strokeOpacity="0.75" />
                {idx < 6 && (
                  <>
                    {/* Diagonal Structural Tank Bracing */}
                    <line
                      x1={bx + 8}
                      y1="226"
                      x2={bx + 107}
                      y2="318"
                      strokeOpacity="0.22"
                    />
                    <line
                      x1={bx + 107}
                      y1="226"
                      x2={bx + 8}
                      y2="318"
                      strokeOpacity="0.22"
                    />
                    <text
                      x={bx + 57}
                      y="264"
                      textAnchor="middle"
                      fill="#007786"
                      fontSize="9"
                      fontFamily="var(--font-sans)"
                      letterSpacing="0.08em"
                    >
                      COT No.{idx + 1} C
                    </text>
                  </>
                )}
              </g>
            ))}

            {/* Double Bottom Baseline */}
            <line
              x1="168"
              y1="312"
              x2="1035"
              y2="312"
              stroke="#03C5EC"
              strokeOpacity="0.65"
              strokeDasharray="6 3"
            />

            {/* Aft Engine Room Prime Mover & Propeller Shaft */}
            <rect
              x="196"
              y="252"
              width="86"
              height="52"
              stroke="#03C5EC"
              strokeOpacity="0.85"
            />
            <text
              x="239"
              y="281"
              textAnchor="middle"
              fill="#007786"
              fontSize="8.5"
              fontFamily="var(--font-sans)"
            >
              MAIN ENGINE
            </text>
            <line
              x1="138"
              y1="304"
              x2="196"
              y2="304"
              stroke="#03C5EC"
              strokeWidth="2"
            />
            {/* Propeller & Rudder */}
            <ellipse
              cx="136"
              cy="304"
              rx="4"
              ry="14"
              stroke="#03C5EC"
              strokeWidth="1.5"
            />
            <rect
              x="118"
              y="286"
              width="12"
              height="32"
              stroke="#007786"
              strokeWidth="1.4"
            />
          </g>
        )}
      </g>

      {/* Design Waterline (DWL) */}
      <line
        x1="60"
        y1="280"
        x2="1140"
        y2="280"
        stroke={isPhoto ? '#0B5E8E' : '#03C5EC'}
        strokeOpacity={isPhoto ? '0.45' : '0.7'}
        strokeWidth="1.25"
        strokeDasharray={isPhoto ? undefined : '8 4'}
      />

      {/* Drawing Title Block Stamp (Blueprint only) */}
      {!isPhoto && (
        <g transform="translate(835, 376)">
          <rect
            x="0"
            y="0"
            width="260"
            height="36"
            fill="rgba(245, 249, 251, 0.92)"
            stroke="#007786"
            strokeWidth="1"
          />
          <text
            x="12"
            y="15"
            fill="#0E2233"
            fontSize="8.5"
            fontWeight="600"
            fontFamily="var(--font-sans)"
            letterSpacing="0.08em"
          >
            GMS TECHNICAL DRAWING OFFICE
          </text>
          <text
            x="12"
            y="28"
            fill="#007786"
            fontSize="8"
            fontFamily="var(--font-sans)"
          >
            {designation}
          </text>
        </g>
      )}
    </svg>
  );
}

/**
 * Section 6: Services
 * - Uniform minimalist Sea Salt canvas (`--sea-salt`, `data-nav-theme="light"`).
 * - Transition in from Stores: Dark recedes cleanly to Sea Salt, flipping the navbar
 *   and cursor to light theme as the background passes its midpoint.
 * - Pinned for 350% viewport height; every step is scrubbed to scroll and reverses on scroll up:
 *   - 0–15%: Big title rises in the centre of the screen line by line behind a mask.
 *   - 15–30%: Title moves up toward the top and scales down; description fades in below it.
 *   - 25–50%: Tanker photo slides in from the right edge and settles centred.
 *   - 50–80%: Left-to-right `clip-path: inset()` wipe from photo to blueprint with a 2px Sonar Cyan scan line
 *     riding on the exact boundary (top-to-bottom on mobile).
 *   - 80–100%: Frosted glass service cards appear in a short stagger in two aligned rows (5 top, 4 bottom)
 *     framing the blueprint with 3D pointer tilt and contrasting icon hover transitions.
 */
export function Services() {
  const sectionRef = useRef<HTMLElement>(null);
  const darkEntryVeilRef = useRef<HTMLDivElement>(null);

  const headerStageRef = useRef<HTMLDivElement>(null);
  const titleWrapRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);

  const shipStageRef = useRef<HTMLDivElement>(null);
  const photoClipRef = useRef<HTMLDivElement>(null);
  const blueprintClipRef = useRef<HTMLDivElement>(null);
  const scanLineRef = useRef<HTMLDivElement>(null);
  const boxesContainerRef = useRef<HTMLDivElement>(null);

  const [photoImgValid, setPhotoImgValid] = useState<boolean | null>(null);
  const [blueprintImgValid, setBlueprintImgValid] = useState<boolean | null>(null);
  const [activeServiceIdx, setActiveServiceIdx] = useState<number | null>(null);
  const [showAllMobileServices, setShowAllMobileServices] = useState(false);

  const servicesCopy = servicesData?.ship_services;
  const mediaCfg = servicesCopy?.media;
  const photoSrc = mediaCfg?.photo ?? '/services/ship.png';
  const blueprintSrc = mediaCfg?.blueprint ?? '/services/blueprint.png';
  const designation =
    mediaCfg?.vessel_designation ?? 'VLCC / Technical Service General Arrangement';

  const serviceItems: ServiceItem[] = useMemo(() => {
    const structured = servicesCopy?.items ?? [];
    if (structured.length > 0) return structured;
    const rawList = servicesCopy?.services_list ?? [];
    return rawList.map((name, i) => ({
      name,
      icon: 'wrench',
      zone: 'Shipboard Service',
      description: servicesCopy?.description ?? '',
      boxX: 15 + (i % 4) * 23,
      boxY: i < 4 ? 16 : 80,
      hullX: 25 + (i % 4) * 18,
      hullY: 48,
    }));
  }, [servicesCopy]);

  // Probe whether `/services/ship.png` and `/services/blueprint.png` are valid non-empty images
  useEffect(() => {
    const probeImage = (url: string, setter: (ok: boolean) => void) => {
      const img = new Image();
      img.onload = () => setter(img.naturalWidth > 0 && img.naturalHeight > 0);
      img.onerror = () => setter(false);
      img.src = url;
    };
    probeImage(photoSrc, setPhotoImgValid);
    probeImage(blueprintSrc, setBlueprintImgValid);
  }, [photoSrc, blueprintSrc]);

  // Main pinned 350% scroll sequence + Transition In from Stores
  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      const mm = gsap.matchMedia();

      mm.add(
        {
          isXlDesktop: '(min-width: 1280px)',
          isWideDesktop: '(min-width: 1024px)',
          isDesktop: '(min-width: 768px)',
          isMobile: '(max-width: 767px)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const { isXlDesktop, isWideDesktop, isMobile, reduceMotion } =
            context.conditions ?? {};

          // 1. Transition In from Stores: Dark veil recedes to reveal uniform Sea Salt canvas
          if (!reduceMotion && darkEntryVeilRef.current) {
            const entryTl = gsap.timeline({
              scrollTrigger: {
                trigger: section,
                start: 'top 95%',
                end: 'top 15%',
                scrub: MOTION.scrub,
                onUpdate: (self) => {
                  // Flip navbar and cursor to light theme as background passes midpoint
                  if (self.progress >= 0.5) {
                    useAppStore.getState().setNavTheme('light');
                  } else {
                    useAppStore.getState().setNavTheme('dark');
                  }
                  useAppStore.getState().setBottomTheme(self.progress >= 0.2 ? 'light' : 'dark');
                },
              },
            });

            entryTl.fromTo(
              darkEntryVeilRef.current,
              { opacity: 1 },
              { opacity: 0, ease: 'power1.inOut', duration: 1 },
              0
            );
          } else if (darkEntryVeilRef.current) {
            gsap.set(darkEntryVeilRef.current, { opacity: 0 });
          }

          // 2. Reduced Motion Static Layout
          if (reduceMotion) {
            if (titleWrapRef.current) {
              gsap.set(titleWrapRef.current, { y: 0, scale: 1 });
            }
            if (descRef.current) {
              gsap.set(descRef.current, { autoAlpha: 1, y: 0 });
            }
            if (shipStageRef.current) {
              gsap.set(shipStageRef.current, { xPercent: 0, autoAlpha: 1 });
            }
            if (photoClipRef.current) {
              gsap.set(photoClipRef.current, {
                clipPath: isMobile
                  ? 'inset(100% 0% 0% 0%)'
                  : 'inset(0% 0% 0% 100%)',
              });
            }
            if (blueprintClipRef.current) {
              gsap.set(blueprintClipRef.current, {
                clipPath: 'inset(0% 0% 0% 0%)',
              });
            }
            if (scanLineRef.current) {
              gsap.set(scanLineRef.current, { autoAlpha: 0 });
            }
            return;
          }

          // Split big title into masked lines for 0–15% arrival
          const titleSplit = titleRef.current
            ? SplitText.create(titleRef.current, {
                type: 'lines',
                mask: 'lines',
              })
            : null;

          // Initial states for the 0 -> 100 scrubbed sequence
          if (titleSplit?.lines) {
            // Add bottom breathing room to each line mask so descenders (e.g. 'g') never clip
            titleSplit.lines.forEach((lineEl) => {
              const maskEl = lineEl.parentElement;
              if (maskEl) {
                maskEl.style.paddingBottom = '0.16em';
                maskEl.style.marginBottom = '-0.16em';
              }
            });
            gsap.set(titleSplit.lines, { yPercent: 112, autoAlpha: 0 });
          }
          const initialScale = isMobile
            ? 1.14
            : isXlDesktop
              ? 1.62
              : isWideDesktop
                ? 1.42
                : 1.26;

          let centerOffsetY = 0;
          const computeCenterOffsetY = () => {
            if (!titleWrapRef.current) return 0;
            gsap.set(titleWrapRef.current, {
              y: 0,
              scale: 1,
              transformOrigin: 'center center',
            });
            const sRect = section.getBoundingClientRect();
            const tRect = titleWrapRef.current.getBoundingClientRect();
            const vh = sRect.height || window.innerHeight;
            const navH = window.innerWidth >= 768 ? 72 : 64;
            const localCenterY = tRect.top - sRect.top + tRect.height / 2;
            const visualCenterY = navH + (vh - navH) * 0.48;
            centerOffsetY = Math.max(0, visualCenterY - localCenterY);
            return centerOffsetY;
          };

          computeCenterOffsetY();

          if (titleWrapRef.current) {
            // Start large in the exact visual centre of the viewport
            gsap.set(titleWrapRef.current, {
              y: () => centerOffsetY,
              scale: initialScale,
              transformOrigin: 'center center',
            });
          }
          if (descRef.current) {
            gsap.set(descRef.current, { autoAlpha: 0, y: 16 });
          }
          if (shipStageRef.current) {
            // Slides in from the right edge (+105%) toward the centre
            gsap.set(shipStageRef.current, {
              xPercent: 105,
              autoAlpha: 0,
            });
          }

          // Wipe state driven by a single proxy value (0 -> 100)
          const wipeProxy = { pct: 0 };
          const applyWipe = (pct: number) => {
            const clamped = Math.max(0, Math.min(100, pct));
            if (isMobile) {
              // Top-to-bottom wipe on mobile
              if (photoClipRef.current) {
                photoClipRef.current.style.clipPath = `inset(${clamped}% 0% 0% 0%)`;
              }
              if (blueprintClipRef.current) {
                blueprintClipRef.current.style.clipPath = `inset(0% 0% ${100 - clamped}% 0%)`;
              }
              if (scanLineRef.current) {
                scanLineRef.current.style.top = `${clamped}%`;
                scanLineRef.current.style.left = '0%';
              }
            } else {
              // Left-to-right wipe on desktop
              if (photoClipRef.current) {
                photoClipRef.current.style.clipPath = `inset(0% 0% 0% ${clamped}%)`;
              }
              if (blueprintClipRef.current) {
                blueprintClipRef.current.style.clipPath = `inset(0% ${100 - clamped}% 0% 0%)`;
              }
              if (scanLineRef.current) {
                scanLineRef.current.style.left = `${clamped}%`;
                scanLineRef.current.style.top = '0%';
              }
            }
          };

          applyWipe(0);
          if (scanLineRef.current) {
            gsap.set(scanLineRef.current, { autoAlpha: 0 });
          }

          const boxElements =
            boxesContainerRef.current?.querySelectorAll<HTMLElement>('.service-node-box');
          if (boxElements && boxElements.length > 0) {
            gsap.set(boxElements, { autoAlpha: 0, y: 14, scale: 0.95 });
          }

          const tl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: section,
              start: 'top top',
              end: '+=350%',
              pin: true,
              scrub: MOTION.scrub,
              invalidateOnRefresh: true,
              onRefreshInit: () => {
                computeCenterOffsetY();
              },
            },
          });

          // 0–15%: The title arrives large in the centre of the screen, rising and fading in line by line
          if (titleSplit?.lines && titleSplit.lines.length > 0) {
            tl.to(
              titleSplit.lines,
              {
                yPercent: 0,
                autoAlpha: 1,
                stagger: 2.2,
                duration: 13,
                ease: 'power2.out',
              },
              0
            );
          }

          // 15–30%: It makes room — moves up from the centre toward the top and scales down; description fades in
          if (titleWrapRef.current) {
            tl.fromTo(
              titleWrapRef.current,
              { y: () => centerOffsetY, scale: initialScale },
              {
                y: 0,
                scale: 1,
                duration: 15,
                ease: 'power2.inOut',
                immediateRender: true,
              },
              15
            );
          }

          if (descRef.current) {
            tl.to(
              descRef.current,
              {
                autoAlpha: 1,
                y: 0,
                duration: 10,
                ease: 'power2.out',
              },
              22
            );
          }

          // 25–50%: The ship arrives from the right edge and settles centred
          if (shipStageRef.current) {
            tl.to(
              shipStageRef.current,
              {
                xPercent: 0,
                autoAlpha: 1,
                duration: 25,
                ease: 'power2.out',
              },
              25
            );
          }

          // 50–80%: The wipe — photo becomes blueprint with 2px Sonar Cyan scan line on the exact boundary
          if (scanLineRef.current) {
            tl.to(
              scanLineRef.current,
              { autoAlpha: 1, duration: 2 },
              49
            );
          }

          tl.to(
            wipeProxy,
            {
              pct: 100,
              duration: 30,
              ease: 'none',
              onUpdate: () => applyWipe(wipeProxy.pct),
            },
            50
          );

          if (scanLineRef.current) {
            tl.to(
              scanLineRef.current,
              { autoAlpha: 0, duration: 3 },
              79
            );
          }

          // 80–100%: With the blueprint complete and scan line faded, service boxes appear in a stagger
          if (boxElements && boxElements.length > 0) {
            tl.to(
              boxElements,
              {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                stagger: 1.6,
                duration: 12,
                ease: 'power2.out',
              },
              80
            );
          }
          return () => {
            titleSplit?.revert();
          };
        }
      );
    },
    { scope: sectionRef }
  );

  const topRowServices = serviceItems.slice(0, 5);
  const bottomRowServices = serviceItems.slice(5);
  const mobileVisibleServices = showAllMobileServices
    ? serviceItems
    : serviceItems.slice(0, 4);

  return (
    <section
      ref={sectionRef}
      id="services"
      data-section="services"
      data-nav-theme="light"
      aria-label={servicesCopy?.eyebrow ?? 'Marine Services'}
      className="relative min-h-[100dvh] w-full overflow-hidden bg-sea-salt text-deep-hull flex flex-col justify-between pt-20 pb-8 md:pt-24 md:pb-12"
    >

      {/* Receding Dark Veil for clean Transition In from Stores */}
      <div
        ref={darkEntryVeilRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 bg-deep-hull opacity-0"
      />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-7xl flex-1 flex-col justify-between px-6 sm:px-10 md:px-12 lg:px-16">
        {/* Top Stage: Big Title (0–15% centre -> 15–30% scaled top heading) + Description */}
        <div
          ref={headerStageRef}
          className="relative z-20 mx-auto max-w-3xl text-center pt-1 md:pt-2"
        >
          <div ref={titleWrapRef} className="mx-auto max-w-2xl will-change-transform">
            {servicesCopy?.eyebrow && (
              <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-[0.14em] text-signal-blue">
                {servicesCopy.eyebrow}
              </p>
            )}
            <h2
              ref={titleRef}
              className="font-display text-[length:clamp(1.65rem,2.75vw,2.45rem)] font-normal tracking-[-0.02em] text-deep-hull leading-[1.24] text-balance"
            >
              {servicesCopy?.title}
            </h2>
          </div>
          <p
            ref={descRef}
            className="mt-3 mx-auto max-w-2xl font-sans text-[15px] md:text-base text-deep-hull/75 leading-relaxed"
          >
            {servicesCopy?.description}
          </p>
        </div>

        {/* Middle Stage: Pixel-Aligned Tanker Photograph & Technical Blueprint + Scan Line + Service Boxes */}
        <div
          ref={shipStageRef}
          className="relative my-auto w-full py-2 md:py-4 will-change-transform"
        >
          {/* Fixed Aspect Ratio Vessel Container & Tightly Framed Service Cards */}
          <div
            ref={boxesContainerRef}
            className="relative mx-auto w-full max-w-[1140px] flex flex-col"
          >
            {/* Desktop Top Row: 5 aligned cards pulled close to upper hull */}
            <div className="relative z-30 hidden md:grid grid-cols-5 gap-2.5 lg:gap-4 items-stretch w-full pointer-events-none md:-mb-[7.5%]">
              {topRowServices.map((item, idx) => {
                const IconComp = SERVICE_ICON_MAP[item.icon] ?? Wrench;
                const isActive = activeServiceIdx === idx;

                return (
                  <div
                    key={item.name}
                    className={`service-node-box pointer-events-auto flex ${
                      isActive ? 'z-40' : 'z-30'
                    }`}
                  >
                    <ServiceTiltCard
                      dataCursor="view"
                      isActive={isActive}
                      maxTilt={6.5}
                      onMouseEnter={() => setActiveServiceIdx(idx)}
                      onMouseLeave={() =>
                        setActiveServiceIdx((curr) => (curr === idx ? null : curr))
                      }
                      onFocus={() => setActiveServiceIdx(idx)}
                      onBlur={() =>
                        setActiveServiceIdx((curr) => (curr === idx ? null : curr))
                      }
                      onClick={() =>
                        setActiveServiceIdx((curr) => (curr === idx ? null : idx))
                      }
                      className={`h-full w-full rounded-2xl border px-2.5 py-2 lg:px-3.5 lg:py-2.5 text-left backdrop-blur-xl backdrop-saturate-150 transition-colors duration-300 flex items-center ${
                        isActive
                          ? 'bg-sea-salt/60 border-sonar-cyan/80 ring-1 ring-sonar-cyan/35'
                          : 'bg-sea-salt/45 border-white/75 ring-1 ring-deep-hull/8 hover:bg-sea-salt/60 hover:border-sonar-cyan/70 hover:ring-sonar-cyan/25'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 lg:gap-3">
                        <span
                          className={`flex h-9 w-9 lg:h-10 lg:w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 ease-out ${
                            isActive
                              ? 'bg-deep-hull text-sonar-cyan border-deep-hull shadow-sm'
                              : 'bg-white/55 text-signal-blue border-deep-hull/12 group-hover:bg-deep-hull group-hover:text-sonar-cyan group-hover:border-deep-hull group-hover:shadow-sm'
                          }`}
                        >
                          <IconComp
                            size={22}
                            weight="duotone"
                            className="transition-colors duration-300"
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-sans text-[11px] lg:text-xs font-semibold text-deep-hull leading-snug">
                            {item.name}
                          </p>
                          <p className="font-sans text-[9px] lg:text-[10px] font-medium uppercase tracking-[0.06em] text-deep-teal/85 truncate">
                            {item.zone}
                          </p>
                        </div>
                      </div>
                    </ServiceTiltCard>
                  </div>
                );
              })}
            </div>

            {/* Vessel Artwork Stage (3:1 native panoramic ratio on md+) */}
            <div className="relative z-10 w-full aspect-[4/3] md:aspect-[3/1]">
              {/* Layer 1: Tanker Photograph Layer */}
              <div
                ref={photoClipRef}
                className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
              >
                <div className="h-full w-full md:rotate-0 -rotate-90 scale-[0.82] md:scale-100">
                  {photoImgValid ? (
                    <img
                      src={photoSrc}
                      alt={servicesCopy?.title ?? 'Tanker photograph'}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <VesselArtworkLayer variant="photo" designation={designation} />
                  )}
                </div>
              </div>

              {/* Layer 2: Technical Blueprint Layer (pixel-for-pixel aligned with Layer 1) */}
              <div
                ref={blueprintClipRef}
                className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
              >
                <div className="h-full w-full md:rotate-0 -rotate-90 scale-[0.82] md:scale-100">
                  {blueprintImgValid ? (
                    <img
                      src={blueprintSrc}
                      alt={designation}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <VesselArtworkLayer
                      variant="blueprint"
                      designation={designation}
                    />
                  )}
                </div>
              </div>

              {/* 2px Sonar Cyan Scan Line with soft glow riding on the exact clip boundary */}
              <div
                ref={scanLineRef}
                aria-hidden="true"
                className="pointer-events-none absolute z-20 md:top-0 md:bottom-0 md:w-[2px] md:h-full left-0 right-0 h-[2px] w-full bg-sonar-cyan"
                style={{
                  boxShadow:
                    '0 0 14px 2px rgba(3, 197, 236, 0.78), 0 0 28px 6px rgba(3, 197, 236, 0.38)',
                }}
              />
            </div>

            {/* Desktop Bottom Row: 4 aligned cards pulled close to lower hull */}
            <div className="relative z-30 hidden md:grid grid-cols-4 gap-3 lg:gap-5 items-stretch w-full max-w-[84%] mx-auto pointer-events-none md:-mt-[7.8%]">
              {bottomRowServices.map((item, offsetIdx) => {
                const idx = offsetIdx + 5;
                const IconComp = SERVICE_ICON_MAP[item.icon] ?? Wrench;
                const isActive = activeServiceIdx === idx;

                return (
                  <div
                    key={item.name}
                    className={`service-node-box pointer-events-auto flex ${
                      isActive ? 'z-40' : 'z-30'
                    }`}
                  >
                    <ServiceTiltCard
                      dataCursor="view"
                      isActive={isActive}
                      maxTilt={6.5}
                      onMouseEnter={() => setActiveServiceIdx(idx)}
                      onMouseLeave={() =>
                        setActiveServiceIdx((curr) => (curr === idx ? null : curr))
                      }
                      onFocus={() => setActiveServiceIdx(idx)}
                      onBlur={() =>
                        setActiveServiceIdx((curr) => (curr === idx ? null : curr))
                      }
                      onClick={() =>
                        setActiveServiceIdx((curr) => (curr === idx ? null : idx))
                      }
                      className={`h-full w-full rounded-2xl border px-2.5 py-2 lg:px-3.5 lg:py-2.5 text-left backdrop-blur-xl backdrop-saturate-150 transition-colors duration-300 flex items-center ${
                        isActive
                          ? 'bg-sea-salt/60 border-sonar-cyan/80 ring-1 ring-sonar-cyan/35'
                          : 'bg-sea-salt/45 border-white/75 ring-1 ring-deep-hull/8 hover:bg-sea-salt/60 hover:border-sonar-cyan/70 hover:ring-sonar-cyan/25'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 lg:gap-3">
                        <span
                          className={`flex h-9 w-9 lg:h-10 lg:w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 ease-out ${
                            isActive
                              ? 'bg-deep-hull text-sonar-cyan border-deep-hull shadow-sm'
                              : 'bg-white/55 text-signal-blue border-deep-hull/12 group-hover:bg-deep-hull group-hover:text-sonar-cyan group-hover:border-deep-hull group-hover:shadow-sm'
                          }`}
                        >
                          <IconComp
                            size={22}
                            weight="duotone"
                            className="transition-colors duration-300"
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-sans text-[11px] lg:text-xs font-semibold text-deep-hull leading-snug">
                            {item.name}
                          </p>
                          <p className="font-sans text-[9px] lg:text-[10px] font-medium uppercase tracking-[0.06em] text-deep-teal/85 truncate">
                            {item.zone}
                          </p>
                        </div>
                      </div>
                    </ServiceTiltCard>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile Service Cards Below Vertical Blueprint Drawing (< md) */}
          <div className="mt-4 flex flex-col gap-2.5 md:hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {mobileVisibleServices.map((item, idx) => {
                const IconComp = SERVICE_ICON_MAP[item.icon] ?? Wrench;
                const isActive = activeServiceIdx === idx;
                return (
                  <ServiceTiltCard
                    key={item.name}
                    isActive={isActive}
                    maxTilt={5}
                    onClick={() =>
                      setActiveServiceIdx((curr) => (curr === idx ? null : idx))
                    }
                    className={`rounded-2xl border p-3.5 text-left backdrop-blur-xl backdrop-saturate-150 transition-colors duration-300 ${
                      isActive
                        ? 'bg-sea-salt/60 border-sonar-cyan/80 ring-1 ring-sonar-cyan/35'
                        : 'bg-sea-salt/45 border-white/75 ring-1 ring-deep-hull/8 hover:bg-sea-salt/60 hover:border-sonar-cyan/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 ease-out ${
                          isActive
                            ? 'bg-deep-hull text-sonar-cyan border-deep-hull shadow-sm'
                            : 'bg-white/55 text-signal-blue border-deep-hull/12 group-hover:bg-deep-hull group-hover:text-sonar-cyan group-hover:border-deep-hull group-hover:shadow-sm'
                        }`}
                      >
                        <IconComp
                          size={22}
                          weight="duotone"
                          className="transition-colors duration-300"
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block font-sans text-xs font-semibold text-deep-hull leading-snug">
                          {item.name}
                        </span>
                        <span className="block font-sans text-[10px] font-medium uppercase tracking-[0.06em] text-deep-teal/85 truncate">
                          {item.zone}
                        </span>
                      </div>
                    </div>
                  </ServiceTiltCard>
                );
              })}
            </div>

            {serviceItems.length > 4 && (
              <button
                type="button"
                onClick={() => setShowAllMobileServices((prev) => !prev)}
                className="self-center mt-1.5 font-sans text-xs font-semibold uppercase tracking-[0.08em] text-signal-blue hover:text-deep-hull underline underline-offset-4 transition-colors"
              >
                {showAllMobileServices
                  ? 'Show fewer services'
                  : `View all ${serviceItems.length} services`}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Services;
