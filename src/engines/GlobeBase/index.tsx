import {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import * as THREE from 'three';
import {
  NETWORK_DATA,
  getLocalTimeAtLongitude,
  type LocationNode,
} from '../../lib/locations';
import siteData from '../../content/site.json';

export interface GlobeRing {
  id: string;
  lat: number;
  lng: number;
  maxR: number;
  propagationSpeed: number;
  repeatPeriod: number;
  color: string;
}

export interface GlobeBaseProps {
  selectedCountryId: string | null;
  onSelectCountry: (id: string | null) => void;
  reduceMotion?: boolean;
  interactive?: boolean;
  className?: string;
}

interface GeoFeature {
  type: string;
  properties?: Record<string, unknown>;
  geometry: {
    type: string;
    coordinates: unknown[];
  };
}

interface MarkerRegistryEntry {
  id: string;
  node: LocationNode;
  wrapper: HTMLDivElement;
  pin: HTMLButtonElement;
  normal: THREE.Vector3;
  previewEl: HTMLDivElement | null;
  detailEl: HTMLDivElement | null;
}

// Software-WebGL probe (runs once, cleans up immediately) per Three.js renderer discipline
const IS_SOFTWARE_GL = (() => {
  if (typeof document === 'undefined') return false;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
})();

// Pre-allocated math helpers for zero-GC per-frame culling & camera-locked lighting
const _camDir = new THREE.Vector3();
const _camUp = new THREE.Vector3(0, 1, 0);
const _camRight = new THREE.Vector3();
const _camOrthoUp = new THREE.Vector3();
const _lightPos = new THREE.Vector3();

function latLngToUnitNormal(lat: number, lng: number): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((90 - lng) * Math.PI) / 180;
  const phiSin = Math.sin(phi);
  return new THREE.Vector3(
    phiSin * Math.cos(theta),
    Math.cos(phi),
    phiSin * Math.sin(theta)
  );
}

function pointInRing(lon: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function isRingValid(ring: unknown): boolean {
  if (!Array.isArray(ring) || ring.length < 4) return false;
  const first = ring[0] as number[];
  if (!Array.isArray(first) || first.length < 2) return false;
  let allSame = true;
  for (let i = 1; i < ring.length; i++) {
    const pt = ring[i] as number[];
    if (Math.abs(pt[0] - first[0]) > 1e-7 || Math.abs(pt[1] - first[1]) > 1e-7) {
      allSame = false;
      break;
    }
  }
  return !allSame;
}

function sanitizeGeoFeature(feature: GeoFeature): GeoFeature | null {
  const geom = feature?.geometry;
  if (!geom) return null;
  // Skip Antarctica because its ±180° polar cap fails H3 res-4 polyfilling and aborts subsequent Africa/Europe features
  const name = feature.properties?.name;
  const id = (feature as { id?: string }).id;
  if (name === 'Antarctica' || id === '010') return null;

  if (geom.type === 'Polygon') {
    const rings = (geom.coordinates as number[][][]).filter(isRingValid);
    if (rings.length === 0) return null;
    return { ...feature, geometry: { ...geom, coordinates: rings } };
  }
  if (geom.type === 'MultiPolygon') {
    const polys = (geom.coordinates as number[][][][])
      .map((poly) => poly.filter(isRingValid))
      .filter((poly) => poly.length > 0);
    if (polys.length === 0) return null;
    return { ...feature, geometry: { ...geom, coordinates: polys } };
  }
  return feature;
}

function isFeatureContainingCoord(
  feature: GeoFeature,
  lat: number,
  lon: number
): boolean {
  const geom = feature.geometry;
  if (!geom) return false;
  if (geom.type === 'Polygon') {
    const rings = geom.coordinates as number[][][];
    return rings[0] ? pointInRing(lon, lat, rings[0]) : false;
  }
  if (geom.type === 'MultiPolygon') {
    const polys = geom.coordinates as number[][][][];
    return polys.some((poly) => (poly[0] ? pointInRing(lon, lat, poly[0]) : false));
  }
  return false;
}

/**
 * GlobeBase Engine (`src/engines/GlobeBase/index.tsx`):
 * - Satin midnight ocean sphere (`MeshPhongMaterial`) illuminated by a camera-locked 3-point studio
 *   light rig with a cool cyan-blue rim light and tight pale-aqua atmospheric halo.
 * - High-resolution anti-aliased WebGL backing buffer (pixel ratio up to 2.75x) + fine resolution-4
 *   micro-dot land cartography (`/geo/world.geojson`).
 * - Continuous auto-rotation during scroll entry (`enableRotate = interactive`) so the sphere spins
 *   smoothly while rising, with manual orbit/hover/single-click selection unlocked cleanly once docked.
 * - 3D dot-product horizon culling smoothly fades out markers approaching or behind the silhouette limb,
 *   preventing edge clustering.
 */
export function GlobeBase({
  selectedCountryId,
  onSelectCountry,
  reduceMotion = false,
  interactive = true,
  className = '',
}: GlobeBaseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);

  const [dimensions, setDimensions] = useState({ width: 540, height: 540 });
  const [countriesGeo, setCountriesGeo] = useState<GeoFeature[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isInView, setIsInView] = useState(true);

  const netCopy = siteData?.network_section;

  const selectedIdRef = useRef<string | null>(selectedCountryId);
  const hoveredIdRef = useRef<string | null>(null);
  const interactiveRef = useRef<boolean>(interactive);
  const onSelectCountryRef = useRef(onSelectCountry);
  const netCopyRef = useRef(netCopy);
  const lastPinClickAtRef = useRef<number>(0);
  const markerRegistryRef = useRef<Map<string, MarkerRegistryEntry>>(new Map());
  const studioLightsRef = useRef<{
    key: THREE.DirectionalLight;
    rim: THREE.DirectionalLight;
    topRim: THREE.DirectionalLight;
    bottomLeftSpot: THREE.DirectionalLight;
    fill: THREE.DirectionalLight;
  } | null>(null);

  selectedIdRef.current = selectedCountryId;
  hoveredIdRef.current = hoveredId;
  interactiveRef.current = interactive;
  onSelectCountryRef.current = onSelectCountry;
  netCopyRef.current = netCopy;

  // Lighter satin maritime navy ocean material with balanced specular roll-off
  const globeMaterial = useMemo(() => {
    return new THREE.MeshPhongMaterial({
      color: new THREE.Color('#143554'),
      emissive: new THREE.Color('#0B2238'),
      emissiveIntensity: 0.34,
      specular: new THREE.Color('#3B789C'),
      shininess: 18,
      transparent: true,
      opacity: 0.99,
    });
  }, []);

  // Precomputed 3D unit normals for all location nodes (used for horizon culling & arc front-bias)
  const nodeNormals = useMemo(() => {
    const map = new Map<string, THREE.Vector3>();
    NETWORK_DATA.allNodes.forEach((n) => {
      map.set(n.id, latLngToUnitNormal(n.latitude, n.longitude));
    });
    return map;
  }, []);

  // Load `/geo/world.geojson` for the micro-dot land layer and selected country outline
  useEffect(() => {
    let active = true;
    fetch('/geo/world.geojson')
      .then((res) => res.json())
      .then((data) => {
        if (active && Array.isArray(data?.features)) {
          const sanitized = data.features
            .map((f: GeoFeature) => sanitizeGeoFeature(f))
            .filter((f: GeoFeature | null): f is GeoFeature => Boolean(f));
          setCountriesGeo(sanitized);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Measure responsive square container using layout width (unaffected by GSAP scale transforms)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const layoutWidth = el.clientWidth || el.getBoundingClientRect().width;
      const size = Math.max(260, Math.min(layoutWidth, 760));
      setDimensions({ width: size, height: size });
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Ensure CSS2DRenderer overlay never clips selected detail tooltips along canvas bounds
  const unclipCss2dOverlay = useCallback(() => {
    const renderer = globeRef.current?.renderer?.();
    const parent = renderer?.domElement?.parentElement;
    if (!parent) return;
    Array.from(parent.children).forEach((child) => {
      if (child instanceof HTMLElement && child.tagName === 'DIV') {
        child.style.overflow = 'visible';
      }
    });
  }, []);

  useEffect(() => {
    unclipCss2dOverlay();
  }, [dimensions, unclipCss2dOverlay]);

  // Configure high-res anti-aliased renderer, camera-locked studio lights, OrbitControls & initial camera
  const handleGlobeReady = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;
    unclipCss2dOverlay();

    try {
      const renderer = globe.renderer();
      if (renderer) {
        renderer.setPixelRatio(
          IS_SOFTWARE_GL ? 1 : Math.min((window.devicePixelRatio || 1) * 1.6, 2.75)
        );
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
      }

      // Lighter maritime navy + subtle bottom-left white spotlight, top-right edge highlight & cyan rim
      const hemi = new THREE.HemisphereLight('#EAF3F8', '#0D2942', 1.25);
      const key = new THREE.DirectionalLight('#CFE7F5', 0.78);
      key.position.set(145, -135, 170);
      const rim = new THREE.DirectionalLight('#03C5EC', 0.58);
      rim.position.set(175, -95, -130);
      const topRim = new THREE.DirectionalLight('#F5F9FB', 0.54);
      topRim.position.set(155, 165, -105);
      const bottomLeftSpot = new THREE.DirectionalLight('#F5F9FB', 0.44);
      bottomLeftSpot.position.set(-145, -130, 155);
      const fill = new THREE.DirectionalLight('#8FBDD6', 0.38);
      fill.position.set(-125, 95, 165);

      studioLightsRef.current = { key, rim, topRim, bottomLeftSpot, fill };
      globe.lights?.([hemi, key, rim, topRim, bottomLeftSpot, fill]);

      const controls = globe.controls();
      if (controls) {
        // Keep OrbitControls enabled and autoRotate active with zero drag-resume pause/delay;
        // OrbitControls natively yields during active pointer drag and resumes instantaneously on release.
        controls.enabled = true;
        controls.enableRotate = interactiveRef.current;
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.autoRotate =
          !reduceMotion &&
          (!interactiveRef.current || (!selectedIdRef.current && !hoveredIdRef.current));
        controls.autoRotateSpeed = interactiveRef.current ? 0.45 : 0.65;
        controls.dampingFactor = 0.08;
        controls.enableDamping = true;
      }

      // Start camera centered over Indian Ocean / Middle East / Mediterranean corridor
      globe.pointOfView({ lat: 22, lng: 45, altitude: 2.05 }, 0);
    } catch {
      // Safeguard if WebGL context is unavailable
    }
  }, [reduceMotion]);

  // Keep OrbitControls rotation lock & autoRotate synced without re-mounting the canvas
  useEffect(() => {
    if (!interactive) {
      setHoveredId(null);
    }
    const globe = globeRef.current;
    if (!globe) return;
    const controls = globe.controls?.();
    if (!controls) return;

    controls.enabled = true;
    controls.enableRotate = interactive;
    if (!interactive) {
      controls.autoRotate = !reduceMotion;
      controls.autoRotateSpeed = 0.65;
    } else {
      controls.autoRotateSpeed = 0.45;
      if (!selectedIdRef.current && !hoveredIdRef.current && !reduceMotion) {
        controls.autoRotate = true;
      }
    }
  }, [interactive, reduceMotion]);

  // Pause rendering when well off-screen (generous 350px margin so rising intro starts already rotating!)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const syncRenderCycle = (visible: boolean) => {
      const globe = globeRef.current;
      if (!globe) return;
      if (visible && !document.hidden) {
        globe.resumeAnimation?.();
      } else {
        globe.pauseAnimation?.();
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
        syncRenderCycle(entry.isIntersecting);
      },
      { rootMargin: '350px 0px', threshold: 0 }
    );

    observer.observe(container);
    const onVisibility = () => syncRenderCycle(isInView);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isInView]);

  // Per-frame 3D hemisphere horizon marker culling + camera-locked studio light orientation
  useEffect(() => {
    if (!isInView) return;

    let rafId = 0;

    const syncFrame = () => {
      const globe = globeRef.current;
      const camera = globe?.camera?.();

      if (camera && !document.hidden) {
        _camDir.copy(camera.position).normalize();

        // Keep studio key & cyan-blue rim light aligned cleanly to the viewer's perspective
        const lights = studioLightsRef.current;
        if (lights) {
          _camRight.crossVectors(_camUp, _camDir).normalize();
          _camOrthoUp.crossVectors(_camDir, _camRight).normalize();

          // Key: dimmed soft studio sheen tucked toward bottom-right
          _lightPos
            .copy(_camRight)
            .multiplyScalar(145)
            .addScaledVector(_camOrthoUp, -135)
            .addScaledVector(_camDir, 170);
          lights.key.position.copy(_lightPos);

          // Rim: understated cyan-blue bottom-right edge contour
          _lightPos
            .copy(_camRight)
            .multiplyScalar(175)
            .addScaledVector(_camOrthoUp, -95)
            .addScaledVector(_camDir, -130);
          lights.rim.position.copy(_lightPos);

          // Top-Right Edge: subtle white grazing spotlight on upper-right silhouette edge
          _lightPos
            .copy(_camRight)
            .multiplyScalar(155)
            .addScaledVector(_camOrthoUp, 165)
            .addScaledVector(_camDir, -105);
          lights.topRim.position.copy(_lightPos);

          // Bottom-Left Spotlight: slight soft white highlight along bottom-left hemisphere
          _lightPos
            .copy(_camRight)
            .multiplyScalar(-145)
            .addScaledVector(_camOrthoUp, -130)
            .addScaledVector(_camDir, 155);
          lights.bottomLeftSpot.position.copy(_lightPos);

          // Fill: gentle upper-left balance so dots stay crisp without a bright hotspot
          _lightPos
            .copy(_camRight)
            .multiplyScalar(-125)
            .addScaledVector(_camOrthoUp, 95)
            .addScaledVector(_camDir, 165);
          lights.fill.position.copy(_lightPos);
        }

        // Smooth 3D hemisphere horizon culling on active marker wrappers
        const isInter = interactiveRef.current;
        const activeSel = selectedIdRef.current;
        const activeHov = hoveredIdRef.current;

        markerRegistryRef.current.forEach((entry) => {
          const dot = entry.normal.dot(_camDir);
          const isFocused = isInter && (entry.id === activeSel || entry.id === activeHov);
          const cutoff = isFocused ? 0.14 : 0.25;

          if (dot <= cutoff) {
            entry.wrapper.style.opacity = '0';
            entry.wrapper.style.visibility = 'hidden';
            entry.wrapper.style.pointerEvents = 'none';
          } else {
            const fade = Math.min(1, (dot - cutoff) / 0.19);
            entry.wrapper.style.opacity = fade.toFixed(3);
            entry.wrapper.style.visibility = 'visible';
            entry.wrapper.style.pointerEvents =
              isInter && fade > 0.35 ? 'auto' : 'none';
            entry.wrapper.style.zIndex =
              isInter && entry.id === activeSel
                ? '40'
                : isInter && entry.id === activeHov
                  ? '30'
                  : dot > 0.65
                    ? '12'
                    : '2';
          }
        });
      }

      rafId = window.requestAnimationFrame(syncFrame);
    };

    rafId = window.requestAnimationFrame(syncFrame);
    return () => window.cancelAnimationFrame(rafId);
  }, [isInView]);

  // Fly camera to selected country (~1.2s, --ease-in-out) and pause autoRotate while inspecting
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;

    const controls = globe.controls?.();
    if (!selectedCountryId) {
      if (controls && !reduceMotion && !hoveredIdRef.current) {
        controls.autoRotate = true;
      }
      return;
    }

    const node = NETWORK_DATA.byId.get(selectedCountryId);
    if (!node) return;

    if (controls && interactive) {
      controls.autoRotate = false;
    }

    globe.pointOfView(
      {
        lat: node.latitude,
        lng: node.longitude,
        altitude: 1.78,
      },
      reduceMotion ? 0 : 1200
    );
  }, [selectedCountryId, reduceMotion, interactive]);

  // Subtle gold office pulse rings (active once globe is docked and interactive)
  const officeRings = useMemo<GlobeRing[]>(() => {
    if (reduceMotion || !interactive) return [];
    return NETWORK_DATA.officeNodes.map((office) => ({
      id: `office-ring-${office.id}`,
      lat: office.latitude,
      lng: office.longitude,
      maxR: 1.85,
      propagationSpeed: 0.85,
      repeatPeriod: 2100,
      color: '#E5B53B',
    }));
  }, [reduceMotion, interactive]);

  // Highlighted polygon outline for the currently selected country (with archipelagic name fallback)
  const selectedPolygons = useMemo(() => {
    if (!selectedCountryId || countriesGeo.length === 0) return [];
    const node = NETWORK_DATA.byId.get(selectedCountryId);
    if (!node) return [];
    const coordMatch = countriesGeo.find((f) =>
      isFeatureContainingCoord(f, node.latitude, node.longitude)
    );
    if (coordMatch) return [coordMatch];

    const normalizedCountry = node.country
      .toLowerCase()
      .replace(/^the\s+/, '')
      .trim();
    const nameMatch = countriesGeo.find((f) => {
      const featureName = String(f.properties?.name ?? '')
        .toLowerCase()
        .replace(/^the\s+/, '')
        .trim();
      return featureName === normalizedCountry;
    });
    return nameMatch ? [nameMatch] : [];
  }, [selectedCountryId, countriesGeo]);

  // Update a persistent marker DOM entry in-place without forcing three-globe to recreate DOM nodes
  const syncMarkerEntry = useCallback((entry: MarkerRegistryEntry) => {
    const { node, wrapper, pin } = entry;
    const isInter = interactiveRef.current;
    const isOffice = node.type === 'office';
    const isSelected = isInter && node.id === selectedIdRef.current;
    const isHovered = isInter && node.id === hoveredIdRef.current && !isSelected;
    const copy = netCopyRef.current;

    wrapper.style.cursor = isInter ? 'pointer' : 'default';
    if (isInter) {
      wrapper.setAttribute('data-cursor', 'view');
    } else {
      wrapper.removeAttribute('data-cursor');
    }

    pin.tabIndex = isInter ? 0 : -1;
    pin.style.transform = isSelected
      ? 'scale(1.3)'
      : isHovered
        ? 'scale(1.18)'
        : 'scale(1)';

    if (isSelected) {
      pin.style.boxShadow =
        '0 0 0 3.5px rgba(245, 196, 81, 0.52), 0 2px 8px rgba(8, 20, 32, 0.55)';
    } else {
      pin.style.boxShadow =
        '0 0 0 2px rgba(229, 181, 59, 0.34), 0 1.5px 4px rgba(8, 20, 32, 0.45)';
    }

    const canShowTooltips = typeof window !== 'undefined' && window.innerWidth >= 768;

    // Hover Preview Tooltip (desktop pinned beside pointer)
    const shouldShowPreview = isInter && isHovered && canShowTooltips;
    if (shouldShowPreview && !entry.previewEl) {
      const preview = document.createElement('div');
      preview.style.position = 'absolute';
      preview.style.left = '18px';
      preview.style.top = '50%';
      preview.style.transform = 'translateY(-50%)';
      preview.style.backgroundColor = 'rgba(245, 249, 251, 0.96)';
      preview.style.color = 'var(--deep-hull)';
      preview.style.border = '1px solid var(--harbour-mist)';
      preview.style.borderRadius = '12px';
      preview.style.padding = '6px 10px';
      preview.style.boxShadow = 'var(--shadow-tinted)';
      preview.style.whiteSpace = 'nowrap';
      preview.style.pointerEvents = 'none';
      preview.style.zIndex = '30';

      const titleLine = document.createElement('div');
      titleLine.style.fontFamily = 'var(--font-display)';
      titleLine.style.fontSize = '13px';
      titleLine.style.fontWeight = '600';
      titleLine.textContent = node.country;
      preview.appendChild(titleLine);

      wrapper.appendChild(preview);
      entry.previewEl = preview;
    } else if (!shouldShowPreview && entry.previewEl) {
      entry.previewEl.remove();
      entry.previewEl = null;
    }

    // Selected Detail Tooltip (desktop pinned beside pointer so it travels with the globe)
    const shouldShowDetail = isInter && isSelected && canShowTooltips;
    if (shouldShowDetail && !entry.detailEl) {
      const detail = document.createElement('div');
      detail.setAttribute('data-globe-marker', 'true');
      detail.style.position = 'absolute';
      detail.style.left = '20px';
      detail.style.top = '50%';
      detail.style.transform = 'translateY(-50%)';
      detail.style.width = '276px';
      detail.style.backgroundColor = 'var(--sea-salt)';
      detail.style.color = 'var(--deep-hull)';
      detail.style.border = '1px solid var(--deep-teal)';
      detail.style.borderRadius = '16px';
      detail.style.padding = '14px 16px';
      detail.style.boxShadow = 'var(--shadow-tinted-lg)';
      detail.style.zIndex = '40';
      detail.style.cursor = 'default';
      detail.addEventListener('pointerdown', (ev) => ev.stopPropagation());
      detail.addEventListener('click', (ev) => ev.stopPropagation());

      const localTime = getLocalTimeAtLongitude(node.longitude);
      const mapsQuery = encodeURIComponent(
        node.address ? `${node.address}, ${node.country}` : `${node.city}, ${node.country}`
      );

      const headerRow = document.createElement('div');
      headerRow.style.display = 'flex';
      headerRow.style.alignItems = 'center';
      headerRow.style.justifyContent = 'space-between';
      headerRow.style.gap = '8px';

      const nameEl = document.createElement('div');
      nameEl.style.fontFamily = 'var(--font-display)';
      nameEl.style.fontSize = '17px';
      nameEl.style.fontWeight = '600';
      nameEl.textContent = node.country;

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.textContent = '×';
      closeBtn.setAttribute('aria-label', copy?.clear_selection_label ?? 'Close');
      closeBtn.style.fontSize = '16px';
      closeBtn.style.lineHeight = '1';
      closeBtn.style.padding = '2px 6px';
      closeBtn.style.borderRadius = '6px';
      closeBtn.style.color = 'rgba(14, 34, 51, 0.65)';
      closeBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        lastPinClickAtRef.current = performance.now();
        onSelectCountryRef.current(null);
      });

      headerRow.appendChild(nameEl);
      headerRow.appendChild(closeBtn);
      detail.appendChild(headerRow);

      const timeRow = document.createElement('div');
      timeRow.style.marginTop = '4px';
      timeRow.style.fontSize = '11px';
      timeRow.style.color = 'var(--deep-teal)';
      timeRow.style.fontVariantNumeric = 'tabular-nums';
      timeRow.textContent = `${localTime} · ${copy?.open_24_7_badge ?? '24/7 Operations'}`;
      detail.appendChild(timeRow);

      if (isOffice) {
        if (node.address) {
          const addr = document.createElement('p');
          addr.style.marginTop = '8px';
          addr.style.fontSize = '12px';
          addr.style.lineHeight = '1.45';
          addr.style.color = 'rgba(14, 34, 51, 0.8)';
          addr.textContent = node.address;
          detail.appendChild(addr);
        }

        const linksWrap = document.createElement('div');
        linksWrap.style.marginTop = '10px';
        linksWrap.style.display = 'flex';
        linksWrap.style.flexDirection = 'column';
        linksWrap.style.gap = '4px';
        linksWrap.style.fontSize = '12px';
        linksWrap.style.fontVariantNumeric = 'tabular-nums';

        const phoneLink = document.createElement('a');
        phoneLink.href = `tel:${node.phone}`;
        phoneLink.style.color = 'var(--signal-blue)';
        phoneLink.style.fontWeight = '500';
        phoneLink.textContent = node.phone;
        linksWrap.appendChild(phoneLink);

        const emailLink = document.createElement('a');
        emailLink.href = `mailto:${node.email}`;
        emailLink.style.color = 'var(--signal-blue)';
        emailLink.textContent = node.email;
        linksWrap.appendChild(emailLink);

        const dirLink = document.createElement('a');
        dirLink.href = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
        dirLink.target = '_blank';
        dirLink.rel = 'noopener noreferrer';
        dirLink.style.marginTop = '4px';
        dirLink.style.color = 'var(--deep-teal)';
        dirLink.style.fontWeight = '500';
        dirLink.textContent = `${copy?.directions_label ?? 'Get directions'} →`;
        linksWrap.appendChild(dirLink);

        detail.appendChild(linksWrap);
      } else {
        const servingOffice = node.servingOfficeId
          ? NETWORK_DATA.byId.get(node.servingOfficeId)
          : null;

        if (servingOffice) {
          const contactDiv = document.createElement('div');
          contactDiv.style.marginTop = '8px';
          contactDiv.style.display = 'flex';
          contactDiv.style.flexDirection = 'column';
          contactDiv.style.gap = '4px';
          contactDiv.style.fontSize = '12px';
          contactDiv.style.fontVariantNumeric = 'tabular-nums';

          const phoneA = document.createElement('a');
          phoneA.href = `tel:${servingOffice.phone}`;
          phoneA.style.color = 'var(--signal-blue)';
          phoneA.style.fontWeight = '500';
          phoneA.textContent = servingOffice.phone;
          contactDiv.appendChild(phoneA);

          const emailA = document.createElement('a');
          emailA.href = `mailto:${servingOffice.email}`;
          emailA.style.color = 'var(--signal-blue)';
          emailA.textContent = servingOffice.email;
          contactDiv.appendChild(emailA);

          detail.appendChild(contactDiv);
        }
      }

      wrapper.appendChild(detail);
      entry.detailEl = detail;
    } else if (!shouldShowDetail && entry.detailEl) {
      entry.detailEl.remove();
      entry.detailEl = null;
    }

    if (isSelected) {
      wrapper.style.zIndex = '40';
    } else if (isHovered) {
      wrapper.style.zIndex = '30';
    }
  }, []);

  // Keep persistent marker elements visually synced whenever selection, hover, or docked interactivity changes
  useEffect(() => {
    markerRegistryRef.current.forEach((entry) => syncMarkerEntry(entry));
  }, [selectedCountryId, hoveredId, interactive, netCopy, syncMarkerEntry]);

  // Build stable HTML marker elements once per node so hover/selection never destroys DOM nodes mid-click
  const renderHtmlElement = useCallback(
    (datum: object) => {
      const node = datum as LocationNode;
      const isOffice = node.type === 'office';

      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-globe-marker', 'true');
      wrapper.style.position = 'relative';
      wrapper.style.pointerEvents = interactiveRef.current ? 'auto' : 'none';

      // Compute initial visibility immediately so newly created pins never flash on back hemisphere
      const unitNormal = nodeNormals.get(node.id) ?? latLngToUnitNormal(node.latitude, node.longitude);
      const camera = globeRef.current?.camera?.();
      if (camera) {
        _camDir.copy(camera.position).normalize();
        const dot = unitNormal.dot(_camDir);
        const isFocused =
          interactiveRef.current &&
          (node.id === selectedIdRef.current || node.id === hoveredIdRef.current);
        const cutoff = isFocused ? 0.14 : 0.25;
        if (dot <= cutoff) {
          wrapper.style.opacity = '0';
          wrapper.style.visibility = 'hidden';
          wrapper.style.pointerEvents = 'none';
        } else {
          const fade = Math.min(1, (dot - cutoff) / 0.19);
          wrapper.style.opacity = fade.toFixed(3);
          wrapper.style.visibility = 'visible';
          wrapper.style.pointerEvents = interactiveRef.current && fade > 0.35 ? 'auto' : 'none';
        }
      }

      // Scale-compensated inner holder keeps pins sleek & uniform during scroll entry scaling
      const pinHolder = document.createElement('div');
      pinHolder.style.display = 'flex';
      pinHolder.style.alignItems = 'center';
      pinHolder.style.justifyContent = 'center';
      pinHolder.style.transform = 'scale(var(--globe-pin-comp, 1))';
      pinHolder.style.transformOrigin = 'center center';

      // Sleek Pin Marker
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.setAttribute(
        'aria-label',
        `${node.country} (${isOffice ? netCopyRef.current?.office_badge : netCopyRef.current?.coverage_badge})`
      );
      pin.style.display = 'flex';
      pin.style.alignItems = 'center';
      pin.style.justifyContent = 'center';
      pin.style.borderRadius = '9999px';
      pin.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';

      // Polished gold pin with refined warm rim & subtle gold halo
      pin.style.width = '7.5px';
      pin.style.height = '7.5px';
      pin.style.background =
        'radial-gradient(circle at 35% 35%, #F6D57A 0%, #DFAA2B 70%, #B88318 100%)';
      pin.style.border = '1.25px solid rgba(255, 250, 235, 0.92)';

      pinHolder.appendChild(pin);
      wrapper.appendChild(pinHolder);

      const entry: MarkerRegistryEntry = {
        id: node.id,
        node,
        wrapper,
        pin,
        normal: unitNormal,
        previewEl: null,
        detailEl: null,
      };
      markerRegistryRef.current.set(node.id, entry);
      syncMarkerEntry(entry);

      wrapper.addEventListener('mouseenter', () => {
        if (!interactiveRef.current) return;
        setHoveredId(node.id);
        const controls = globeRef.current?.controls?.();
        if (controls) controls.autoRotate = false;
      });

      wrapper.addEventListener('mouseleave', () => {
        if (!interactiveRef.current) return;
        setHoveredId((prev) => (prev === node.id ? null : prev));
        const controls = globeRef.current?.controls?.();
        if (controls && !selectedIdRef.current && !reduceMotion) {
          controls.autoRotate = true;
        }
      });

      wrapper.addEventListener('pointerdown', () => {
        if (!interactiveRef.current) return;
        lastPinClickAtRef.current = performance.now();
      });

      wrapper.addEventListener('click', (ev) => {
        if (!interactiveRef.current) return;
        ev.stopPropagation();
        lastPinClickAtRef.current = performance.now();
        onSelectCountryRef.current(node.id);
      });

      return wrapper;
    },
    [nodeNormals, reduceMotion, syncMarkerEntry]
  );

  // Neutral visibility callback so our rAF hemisphere horizon fade controls opacity cleanly without snapping
  const handleHtmlVisibility = useCallback(() => {}, []);

  return (
    <div
      ref={containerRef}
      data-cursor={interactive ? 'drag' : undefined}
      onClick={(ev) => {
        if ((ev.target as HTMLElement | null)?.closest?.('[data-globe-marker]')) {
          return;
        }
        if (performance.now() - lastPinClickAtRef.current < 400) return;
        if (interactive && selectedCountryId) onSelectCountry(null);
      }}
      className={`relative flex flex-col items-center justify-center select-none ${
        interactive ? 'pointer-events-auto' : 'pointer-events-none'
      } ${className}`}
    >
      {/* Decorative 3D WebGL Globe Sphere */}
      <div
        aria-hidden="true"
        style={{ width: dimensions.width, height: dimensions.height }}
        className="relative z-10 flex items-center justify-center rounded-full"
      >
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          animateIn={false}
          backgroundColor="rgba(0,0,0,0)"
          rendererConfig={{
            antialias: !IS_SOFTWARE_GL,
            alpha: true,
            powerPreference: 'high-performance',
          }}
          globeMaterial={globeMaterial}
          showAtmosphere={true}
          atmosphereColor="#4DA8CF"
          atmosphereAltitude={0.11}
          onGlobeReady={handleGlobeReady}
          onGlobeClick={(_coords, ev) => {
            if ((ev?.target as HTMLElement | null)?.closest?.('[data-globe-marker]')) {
              return;
            }
            if (performance.now() - lastPinClickAtRef.current < 400) return;
            if (interactive && selectedCountryId) onSelectCountry(null);
          }}
          /* Layer 2: Crisp Bright White Micro-Dot Land Cartography */
          hexPolygonsData={countriesGeo}
          hexPolygonResolution={4}
          hexPolygonMargin={0.43}
          hexPolygonUseDots={true}
          hexPolygonColor={() => 'rgba(245, 249, 251, 0.86)'}
          hexPolygonAltitude={0.005}
          /* Selected Country Outline lifted slightly off the sphere */
          polygonsData={selectedPolygons}
          polygonCapColor={() => 'rgba(11, 94, 142, 0.35)'}
          polygonSideColor={() => 'rgba(3, 197, 236, 0.25)'}
          polygonStrokeColor={() => '#03C5EC'}
          polygonAltitude={0.014}
          polygonsTransitionDuration={300}
          /* Layer 3A: Arcs disabled */
          arcsData={[]}
          /* Layer 3B: Subtle Pulsing Office Rings */
          ringsData={officeRings}
          ringLat="lat"
          ringLng="lng"
          ringMaxRadius="maxR"
          ringPropagationSpeed="propagationSpeed"
          ringRepeatPeriod="repeatPeriod"
          ringColor={(d: object) => (t: number) => {
            const c = (d as GlobeRing).color;
            return c === '#E5B53B'
              ? `rgba(229, 181, 59, ${(1 - t) * 0.8})`
              : `rgba(3, 197, 236, ${1 - t})`;
          }}
          /* Layer 3C: Horizon-Culled HTML Pointers & Pinned Tooltips */
          htmlElementsData={NETWORK_DATA.allNodes}
          htmlLat="latitude"
          htmlLng="longitude"
          htmlAltitude={0.012}
          htmlElement={renderHtmlElement}
          htmlElementVisibilityModifier={handleHtmlVisibility}
          htmlTransitionDuration={0}
        />

        {/* Grounded Floating Cast Shadow beneath the sphere when docked in fixed split layout */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute left-1/2 -bottom-6 -translate-x-1/2 flex items-center justify-center w-3/4 transition-all duration-700 ease-out ${
            interactive ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          }`}
        >
          <div
            className="h-9 w-full max-w-[380px] rounded-full blur-xl"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(8, 20, 32, 0.52) 0%, rgba(14, 34, 51, 0.24) 52%, rgba(14, 34, 51, 0) 78%)',
            }}
          />
          <div
            className="absolute h-4 w-3/5 max-w-[220px] rounded-full blur-md"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(6, 15, 25, 0.62) 0%, rgba(8, 20, 32, 0.26) 55%, rgba(8, 20, 32, 0) 80%)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default GlobeBase;
