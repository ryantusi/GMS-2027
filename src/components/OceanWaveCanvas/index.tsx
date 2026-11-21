import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface OceanWaveCanvasProps {
  /** Outer footer element used to observe visibility and capture pointer movement across the whole footer. */
  interactionRootRef: React.RefObject<HTMLElement | null>;
  className?: string;
}

const SIM_COLS = 192;
const SIM_ROWS = 36;
const SIM_COUNT = SIM_COLS * SIM_ROWS;

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform sampler2D uRippleMap;

  varying vec2 vUv;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbmWater(vec2 p, float t) {
    float v = 0.0;
    float amp = 0.5;
    mat2 rot = mat2(0.82, -0.57, 0.57, 0.82);

    v += amp * valueNoise(p + vec2(t * 0.16, -t * 0.07));
    p = rot * p * 1.92 + vec2(3.1, 1.7);
    amp *= 0.5;

    v += amp * valueNoise(p + vec2(-t * 0.12, t * 0.09));
    p = rot * p * 2.04 + vec2(1.9, 4.3);
    amp *= 0.5;

    v += amp * valueNoise(p + vec2(t * 0.09, t * 0.05));
    return v;
  }

  // Calm multi-harmonic ambient ocean height
  float ambientOceanHeight(vec2 p, float t) {
    float swell1 = sin(p.x * 1.35 + p.y * 0.45 + t * 0.48) * 0.42;
    float swell2 = sin(p.x * 2.45 - p.y * 0.85 - t * 0.36 + 1.4) * 0.24;
    float swell3 = cos(p.x * 0.72 + p.y * 1.20 + t * 0.25) * 0.22;
    float silk = (fbmWater(p * 1.35, t) - 0.5) * 0.48;
    return (swell1 + swell2 + swell3 + silk) * 0.55;
  }

  void main() {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 p = vec2(vUv.x * aspect * 0.75, vUv.y * 1.45);

    // Sample interactive shallow-water ripple heightfield (R = height, G = dH/dx, B = dH/dy)
    vec4 rippleSample = texture2D(uRippleMap, vUv);
    float rippleH = (rippleSample.r - 0.5) * 2.0;
    vec2 rippleGrad = (rippleSample.gb - 0.5) * 2.0;

    // Subtle undulating top wave crest seamlessly separating Sea Salt (#F5F9FB) from ocean
    float waveEdge =
      0.885
      + sin(vUv.x * 6.2831853 * 1.45 + uTime * 0.52) * 0.028
      + sin(vUv.x * 6.2831853 * 2.90 - uTime * 0.38 + 1.15) * 0.014
      + cos(vUv.x * 6.2831853 * 0.75 + uTime * 0.24) * 0.011
      + rippleH * 0.022;

    float aa = 1.6 / max(uResolution.y, 1.0);
    float waterMask = 1.0 - smoothstep(waveEdge - aa, waveEdge + aa, vUv.y);

    // Exact Sea Salt (#F5F9FB) above crest for a zero-seam blend with Contact section
    vec3 seaSalt = vec3(0.9608, 0.9765, 0.9843);
    if (waterMask <= 0.001) {
      gl_FragColor = vec4(seaSalt, 1.0);
      return;
    }

    // Compute calm ambient ocean surface gradients via finite differences
    float eps = 0.025;
    float hC = ambientOceanHeight(p, uTime);
    float hX = ambientOceanHeight(p + vec2(eps, 0.0), uTime);
    float hY = ambientOceanHeight(p + vec2(0.0, eps), uTime);
    vec2 ambientGrad = vec2(hX - hC, hY - hC) / eps;

    // Combine calm ambient swell normals with silky interactive mouse ripple normals
    vec2 totalGrad = ambientGrad * 0.22 + rippleGrad * 1.65;
    vec3 normal = normalize(vec3(-totalGrad.x, -totalGrad.y, 1.0));

    // Lighting: calm overhead moonlight/skylight + soft oblique ocean sheen
    vec3 viewDir = normalize(vec3(0.0, -0.18, 1.0));
    vec3 keyLight = normalize(vec3(-0.32, 0.62, 0.72));
    vec3 rimLight = normalize(vec3(0.45, 0.42, 0.78));

    float diffKey = max(dot(normal, keyLight), 0.0);
    float diffRim = max(dot(normal, rimLight), 0.0);

    vec3 halfKey = normalize(keyLight + viewDir);
    vec3 halfRim = normalize(rimLight + viewDir);
    float specSilky = pow(max(dot(normal, halfKey), 0.0), 34.0);
    float specGlint = pow(max(dot(normal, halfRim), 0.0), 68.0);
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);

    // Reference deep ocean-teal palette anchored on #005268
    vec3 deepTrough = vec3(0.000, 0.243, 0.314);   // #003E50
    vec3 oceanBase  = vec3(0.000, 0.322, 0.408);   // #005268 (reference ocean blue)
    vec3 oceanLift  = vec3(0.024, 0.412, 0.506);   // #066981
    vec3 silkHighlight = vec3(0.545, 0.878, 0.945); // soft aqua-white light sheen

    // Gentle vertical oceanic depth & ambient wave shading
    float depthFactor = smoothstep(0.0, 0.92, vUv.y);
    float swellBlend = clamp(hC * 0.52 + 0.5, 0.0, 1.0);

    vec3 waterColor = mix(deepTrough, oceanBase, 0.42 + depthFactor * 0.48);
    waterColor = mix(waterColor, oceanLift, swellBlend * 0.42 + diffKey * 0.14);

    // Interactive ripple caustic & silky specular light reaction
    float rippleEnergy = clamp(length(rippleGrad) * 1.45 + abs(rippleH) * 0.55, 0.0, 1.0);
    waterColor += oceanLift * (diffRim * 0.12 + rippleH * 0.14);
    waterColor += silkHighlight * (
      specSilky * (0.09 + rippleEnergy * 0.34)
      + specGlint * (0.04 + rippleEnergy * 0.28)
      + fresnel * 0.07
    );

    // Subtle sunlit shimmer along the undulating top shoreline crest
    float crestBand = smoothstep(waveEdge - 0.055, waveEdge, vUv.y);
    waterColor = mix(waterColor, vec3(0.11, 0.56, 0.67), crestBand * 0.28);

    // Soft hairline highlight right at the wave lip
    float lipShimmer = smoothstep(waveEdge - 0.014, waveEdge - 0.002, vUv.y) * waterMask;
    waterColor += silkHighlight * lipShimmer * 0.14;

    vec3 finalColor = mix(seaSalt, waterColor, waterMask);
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

function detectSoftwareWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

/**
 * Interactive silky ocean-blue wave surface built with Three.js + 2D damped shallow-water
 * heightfield simulation. Pauses when off-screen, supports prefers-reduced-motion, and paces
 * frames safely on software WebGL renderers.
 */
export function OceanWaveCanvas({
  interactionRootRef,
  className = '',
}: OceanWaveCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    const rootEl = interactionRootRef.current ?? container;
    if (!container || !rootEl) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduceMotion = reduceMotionQuery.matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: false,
        depth: false,
        stencil: false,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );

    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // 2D Shallow-Water Wave Simulation Buffers
    let prevGrid = new Float32Array(SIM_COUNT);
    let currGrid = new Float32Array(SIM_COUNT);
    let nextGrid = new Float32Array(SIM_COUNT);
    const texData = new Uint8Array(SIM_COUNT * 4);

    // Neutral initialization (0.5 height, 0.5 zero-slope gradients)
    for (let i = 0; i < SIM_COUNT; i++) {
      const o = i * 4;
      texData[o] = 128;
      texData[o + 1] = 128;
      texData[o + 2] = 128;
      texData[o + 3] = 255;
    }

    const rippleTexture = new THREE.DataTexture(
      texData,
      SIM_COLS,
      SIM_ROWS,
      THREE.RGBAFormat,
      THREE.UnsignedByteType
    );
    rippleTexture.minFilter = THREE.LinearFilter;
    rippleTexture.magFilter = THREE.LinearFilter;
    rippleTexture.wrapS = THREE.ClampToEdgeWrapping;
    rippleTexture.wrapT = THREE.ClampToEdgeWrapping;
    rippleTexture.needsUpdate = true;

    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uRippleMap: { value: rippleTexture },
    };

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      depthWrite: false,
      depthTest: false,
    });

    const quad = new THREE.Mesh(geometry, material);
    scene.add(quad);

    let width = Math.max(container.clientWidth, 1);
    let height = Math.max(container.clientHeight, 1);

    const updateSize = () => {
      width = Math.max(container.clientWidth, 1);
      height = Math.max(container.clientHeight, 1);
      renderer.setSize(width, height, false);
      uniforms.uResolution.value.set(width, height);
    };
    updateSize();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Inject a soft Gaussian ripple depression at normalized footer coordinates (u, v)
    const addDisturbance = (u: number, v: number, strength: number, radiusPx: number) => {
      if (reduceMotion) return;
      const clampedU = Math.max(0.01, Math.min(0.99, u));
      const clampedV = Math.max(0.02, Math.min(0.96, v));

      const cellW = Math.max(width / SIM_COLS, 1);
      const cellH = Math.max(height / SIM_ROWS, 1);
      const rx = Math.max(2, Math.ceil(radiusPx / cellW));
      const ry = Math.max(2, Math.ceil(radiusPx / cellH));

      const cx = clampedU * (SIM_COLS - 1);
      const cy = clampedV * (SIM_ROWS - 1);

      const xMin = Math.max(1, Math.floor(cx - rx));
      const xMax = Math.min(SIM_COLS - 2, Math.ceil(cx + rx));
      const yMin = Math.max(1, Math.floor(cy - ry));
      const yMax = Math.min(SIM_ROWS - 2, Math.ceil(cy + ry));

      const invR2 = 1 / (radiusPx * radiusPx);

      for (let y = yMin; y <= yMax; y++) {
        const dyPx = (y - cy) * cellH;
        const dy2 = dyPx * dyPx;
        const rowOffset = y * SIM_COLS;
        for (let x = xMin; x <= xMax; x++) {
          const dxPx = (x - cx) * cellW;
          const dist2 = dxPx * dxPx + dy2;
          const falloff = Math.exp(-dist2 * invR2 * 2.4);
          if (falloff > 0.01) {
            const idx = rowOffset + x;
            currGrid[idx] = Math.max(
              -1.15,
              Math.min(1.15, currGrid[idx] - strength * falloff)
            );
          }
        }
      }
    };

    // Track pointer smoothly across the entire footer with segment interpolation for unbroken trails
    let lastPointerU = -1;
    let lastPointerV = -1;

    const getNormalizedCoords = (e: PointerEvent) => {
      const rect = rootEl.getBoundingClientRect();
      const u = (e.clientX - rect.left) / Math.max(rect.width, 1);
      const v = 1 - (e.clientY - rect.top) / Math.max(rect.height, 1);
      return { u, v };
    };

    const handlePointerEnter = (e: PointerEvent) => {
      const { u, v } = getNormalizedCoords(e);
      lastPointerU = u;
      lastPointerV = v;
      addDisturbance(u, v, 0.34, 24);
    };

    const handlePointerMove = (e: PointerEvent) => {
      const { u, v } = getNormalizedCoords(e);
      if (lastPointerU < 0) {
        lastPointerU = u;
        lastPointerV = v;
        addDisturbance(u, v, 0.24, 22);
        return;
      }

      const dxPx = (u - lastPointerU) * width;
      const dyPx = (v - lastPointerV) * height;
      const distPx = Math.hypot(dxPx, dyPx);

      if (distPx < 1.5) return;

      const steps = Math.min(8, Math.max(1, Math.ceil(distPx / 12)));
      const speedBoost = Math.min(1.35, 0.65 + distPx / 32);
      const perStepStrength = (0.22 * speedBoost) / Math.sqrt(steps);

      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        addDisturbance(
          lastPointerU + (u - lastPointerU) * t,
          lastPointerV + (v - lastPointerV) * t,
          perStepStrength,
          20
        );
      }

      lastPointerU = u;
      lastPointerV = v;
    };

    const handlePointerLeave = () => {
      lastPointerU = -1;
      lastPointerV = -1;
    };

    rootEl.addEventListener('pointerenter', handlePointerEnter);
    rootEl.addEventListener('pointermove', handlePointerMove, { passive: true });
    rootEl.addEventListener('pointerleave', handlePointerLeave);

    // Step the 2D shallow-water heightfield with true physical circular propagation
    const stepSimulation = () => {
      const cellW = Math.max(width / SIM_COLS, 1);
      const cellH = Math.max(height / SIM_ROWS, 1);
      const minCell = Math.min(cellW, cellH);
      const kx = (minCell / cellW) * (minCell / cellW);
      const ky = (minCell / cellH) * (minCell / cellH);
      const alpha = 0.21;
      const damping = 0.972;

      for (let y = 1; y < SIM_ROWS - 1; y++) {
        const row = y * SIM_COLS;
        const rowUp = row - SIM_COLS;
        const rowDown = row + SIM_COLS;

        for (let x = 1; x < SIM_COLS - 1; x++) {
          const i = row + x;
          const c = currGrid[i];
          const laplacian =
            kx * (currGrid[i - 1] + currGrid[i + 1] - 2 * c) +
            ky * (currGrid[rowUp + x] + currGrid[rowDown + x] - 2 * c);

          let val = (2 * c - prevGrid[i] + alpha * laplacian) * damping;
          if (Math.abs(val) < 0.00015) val = 0;
          nextGrid[i] = Math.max(-1.2, Math.min(1.2, val));
        }
      }

      // Soft absorbing boundary edges so waves dissipate peacefully
      for (let x = 0; x < SIM_COLS; x++) {
        nextGrid[x] = nextGrid[SIM_COLS + x] * 0.55;
        nextGrid[(SIM_ROWS - 1) * SIM_COLS + x] =
          nextGrid[(SIM_ROWS - 2) * SIM_COLS + x] * 0.55;
      }
      for (let y = 0; y < SIM_ROWS; y++) {
        const row = y * SIM_COLS;
        nextGrid[row] = nextGrid[row + 1] * 0.55;
        nextGrid[row + SIM_COLS - 1] = nextGrid[row + SIM_COLS - 2] * 0.55;
      }

      const temp = prevGrid;
      prevGrid = currGrid;
      currGrid = nextGrid;
      nextGrid = temp;

      // Pack height (R) and smooth central-difference surface gradients (G, B) into DataTexture
      const gradScaleX = 2.6 * (minCell / cellW);
      const gradScaleY = 2.6 * (minCell / cellH);

      for (let y = 0; y < SIM_ROWS; y++) {
        const row = y * SIM_COLS;
        const yUp = Math.max(0, y - 1) * SIM_COLS;
        const yDown = Math.min(SIM_ROWS - 1, y + 1) * SIM_COLS;

        for (let x = 0; x < SIM_COLS; x++) {
          const i = row + x;
          const xL = Math.max(0, x - 1);
          const xR = Math.min(SIM_COLS - 1, x + 1);

          const h = currGrid[i];
          const gx = (currGrid[row + xR] - currGrid[row + xL]) * gradScaleX;
          const gy = (currGrid[yDown + x] - currGrid[yUp + x]) * gradScaleY;

          const o = i * 4;
          texData[o] = Math.max(0, Math.min(255, Math.round((h * 0.5 + 0.5) * 255)));
          texData[o + 1] = Math.max(0, Math.min(255, Math.round((gx * 0.5 + 0.5) * 255)));
          texData[o + 2] = Math.max(0, Math.min(255, Math.round((gy * 0.5 + 0.5) * 255)));
          texData[o + 3] = 255;
        }
      }

      rippleTexture.needsUpdate = true;
    };

    // Lifecycle & Visibility Pacing
    let isVisible = true;
    let isDisposed = false;
    let frameId = 0;
    let lastTimestamp = performance.now();
    let simAccumulator = 0;
    const FIXED_STEP = 1 / 60;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (isDisposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    };

    const renderStaticFrame = () => {
      if (isDisposed) return;
      renderer.render(scene, camera);
    };

    const tick = (now = performance.now()) => {
      if (isDisposed || !isVisible || reduceMotion) return;

      const dt = Math.min(0.05, Math.max(0.001, (now - lastTimestamp) / 1000));
      lastTimestamp = now;

      uniforms.uTime.value += dt;
      simAccumulator += dt;

      let steps = 0;
      while (simAccumulator >= FIXED_STEP && steps < 2) {
        stepSimulation();
        simAccumulator -= FIXED_STEP;
        steps++;
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(() => tick(performance.now()));
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    const stopLoop = () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
    };

    const startLoop = () => {
      stopLoop();
      if (isDisposed || !isVisible) return;
      if (reduceMotion) {
        renderStaticFrame();
        return;
      }
      lastTimestamp = performance.now();
      frameId = window.requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) {
          startLoop();
        } else {
          stopLoop();
        }
      },
      { rootMargin: '120px 0px' }
    );
    observer.observe(rootEl);

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
      if (reduceMotion) renderStaticFrame();
    });
    resizeObserver.observe(container);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      reduceMotion = e.matches;
      if (reduceMotion) {
        stopLoop();
        renderStaticFrame();
      } else {
        startLoop();
      }
    };
    reduceMotionQuery.addEventListener('change', handleMotionChange);

    startLoop();

    return () => {
      isDisposed = true;
      stopLoop();
      observer.disconnect();
      resizeObserver.disconnect();
      reduceMotionQuery.removeEventListener('change', handleMotionChange);
      rootEl.removeEventListener('pointerenter', handlePointerEnter);
      rootEl.removeEventListener('pointermove', handlePointerMove);
      rootEl.removeEventListener('pointerleave', handlePointerLeave);
      geometry.dispose();
      material.dispose();
      rippleTexture.dispose();
      renderer.dispose();
      if (canvas.parentNode === container) {
        container.removeChild(canvas);
      }
    };
  }, [interactionRootRef]);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden bg-[#005268] ${className}`}
    />
  );
}

export default OceanWaveCanvas;
