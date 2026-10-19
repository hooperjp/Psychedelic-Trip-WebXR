import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  CoupledVisualUniforms,
  NeuroAudioBands,
  PsychedelicSceneSpec,
  RESEARCH_SCENES,
  computeShaderUniformTargets,
  dampValue,
  smoothAudioTelemetry,
} from '../utils/psychedelicLogic';
import { PsychedelicAudioEngine } from '../audio/AudioEngine';

export interface SceneCanvasProps {
  activeScene: PsychedelicSceneSpec;
  audioEngine: PsychedelicAudioEngine;
  stereoSbsMode: boolean;
  distortionIntensity: number;
  fractalComplexityBias: number;
  kaleidoscopeOverride: number | null;
  csgSmoothOverride: number | null;
  deepDreamLayerOverride: number | null;
  cameraFov: number;
  onTelemetryUpdate: (
    bands: NeuroAudioBands,
    uniforms: CoupledVisualUniforms,
    spectrum: number[]
  ) => void;
  onWebXRSupportedChange: (supported: boolean) => void;
  xrSessionTriggerRef: React.MutableRefObject<(() => Promise<void>) | null>;
  resetCameraTriggerRef: React.MutableRefObject<(() => void) | null>;
}

const VERTEX_SHADER = `
  varying vec3 vWorldDirection;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldDirection = worldPosition.xyz - cameraPosition;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;

  varying vec3 vWorldDirection;
  varying vec2 vUv;

  uniform float uTime;
  uniform float uFractalImmersion;
  uniform float uStyleTransferMix;
  uniform float uDeepDreamClamping;
  uniform float uIfsFoldComplexity;
  uniform float uCsgSmoothK;
  uniform float uKaleidoscopeFolds;
  uniform float uFractalMode;
  uniform vec3 uPalettePrimary;
  uniform vec3 uPaletteSecondary;
  uniform vec4 uAudioBands; // x: theta, y: alpha, z: beta, w: gamma
  uniform float uIsHeadless;

  #define PI 3.14159265359
  #define TAU 6.28318530718

  // 2D rotation matrix
  mat2 rot2D(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
  }

  // Inigo Quilez polynomial smooth minimum (CSG smooth boolean union)
  float smin(float a, float b, float k) {
    float h = max(k - abs(a - b), 0.0) / max(k, 0.001);
    return min(a, b) - h * h * k * 0.25;
  }

  // Signed Distance Primitives (Inigo Quilez)
  float sdSphere(vec3 p, float s) {
    return length(p) - s;
  }

  float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
  }

  float sdOctahedron(vec3 p, float s) {
    p = abs(p);
    return (p.x + p.y + p.z - s) * 0.57735027;
  }

  float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
  }

  // Kaleidoscopic angular space folding (IFS symmetry)
  vec2 foldPolar(vec2 p, float repetitions) {
    float angle = TAU / max(repetitions, 3.0);
    float a = atan(p.y, p.x) + angle * 0.5;
    float r = length(p);
    a = mod(a, angle) - angle * 0.5;
    return vec2(cos(a), sin(a)) * r;
  }

  // Cosine palette generator (Inigo Quilez)
  vec3 cosinePalette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(TAU * (c * t + d));
  }

  // Composite CSG + Iterated Function System (IFS) Signed Distance Field
  vec2 mapFractalScene(vec3 pos) {
    vec3 p = pos;

    // Subtle spatial breathing driven by Theta & Alpha bands
    float breath = 1.0 + uAudioBands.x * 0.18 * sin(uTime * 1.3);

    // Kaleidoscopic folding in XY and XZ planes
    p.xy = foldPolar(p.xy, uKaleidoscopeFolds);
    p.xz *= rot2D(uTime * 0.22 + uAudioBands.y * 0.4);

    // Space repetition for infinite cathedral depth
    vec3 q = mod(p + 3.2, 6.4) - 3.2;

    // Iterated Function System (IFS) folds (4 iterations for smooth real-time VR frame rate)
    float scale = 1.0;
    float orbTrap = 1e10;
    vec3 z = q;
    int maxIter = uIsHeadless > 0.5 ? 3 : 5;

    for (int i = 0; i < 5; i++) {
      if (i >= maxIter) break;
      // Box/Octahedral reflection fold
      z = abs(z) - vec3(0.62, 0.58, 0.65) * uIfsFoldComplexity;
      z.xy *= rot2D(0.45 + uTime * 0.12 + uAudioBands.z * 0.35);
      z.yz *= rot2D(0.32 - uTime * 0.09 + uAudioBands.w * 0.25);

      // Spherical inversion / Mandelbulb-inspired scaling
      float r2 = dot(z, z);
      float k = clamp(1.35 / max(r2, 0.18), 1.0, 2.6);
      z *= k;
      scale *= k;
      orbTrap = min(orbTrap, length(z.xz));
    }

    // Constructive Solid Geometry (CSG) primitives at folded coordinates
    float dOcta = sdOctahedron(z, 0.85 * breath) / scale;
    float dTorus = sdTorus(z, vec2(1.05, 0.22 * uIfsFoldComplexity)) / scale;
    float dSphere = sdSphere(z, 0.72 + 0.2 * sin(uTime * 2.0 + uAudioBands.x * 4.0)) / scale;
    float dBox = sdBox(z, vec3(0.55)) / scale;

    // Smooth boolean blending (smin) controlled by uCsgSmoothK and Beta band
    float dComposite = smin(dOcta, dTorus, uCsgSmoothK);
    if (uFractalMode > 1.5 && uFractalMode < 2.5) {
      dComposite = smin(dTorus, dBox, uCsgSmoothK * 1.2);
    } else if (uFractalMode >= 2.5) {
      dComposite = smin(dComposite, dSphere, uCsgSmoothK * 1.35);
    }

    return vec2(dComposite * 0.65, orbTrap);
  }

  // DeepDream DCNN Layer-Clamping & Spatiotemporal Style Transfer synthesis
  vec3 computeDeepDreamAndStyleTransfer(vec3 dir, float rayDepth, float trap) {
    // Spherical coordinates with kaleidoscopic symmetry
    vec2 p = dir.xy / (abs(dir.z) + 0.65);
    p = foldPolar(p, uKaleidoscopeFolds);

    // 1. Low-layer DCNN Gabor orientation gratings & Klüver form constants (V1/V2 visual cortex)
    float radius = length(p);
    float angle = atan(p.y, p.x);
    float logSpiral = sin(log(max(radius, 0.001)) * 8.0 - uTime * 2.2 + angle * 4.0);
    float gaborGrid = cos(p.x * 14.0 + sin(p.y * 12.0 + uTime * 1.5)) *
                      sin(p.y * 14.0 + cos(p.x * 12.0 - uTime * 1.3));
    float lowLayerPattern = mix(gaborGrid, logSpiral, 0.5 + 0.5 * sin(uTime * 0.5 + uAudioBands.y * 3.0));

    // 2. Spatiotemporal Style Transfer domain warping (Greco & Siegel, 2025)
    vec2 warp = p;
    for (int i = 0; i < 3; i++) {
      warp = vec2(
        sin(warp.y * 3.5 + uTime * 0.9 + uAudioBands.x * 3.2),
        cos(warp.x * 3.5 - uTime * 0.8 + uAudioBands.z * 2.8)
      ) + warp * 0.65;
    }
    float styleSwirl = sin(length(warp) * 4.0 - uTime * 1.6);

    // 3. High-layer DCNN DeepDream Pareidolia (organic ocular/mandala feature attractors driven by Gamma)
    vec2 cellUv = fract(warp * (1.8 + uDeepDreamClamping * 2.5)) - 0.5;
    float cellDist = length(cellUv);
    float irisRing = smoothstep(0.32, 0.18, abs(cellDist - 0.22)) *
                     (0.5 + 0.5 * cos(atan(cellUv.y, cellUv.x) * 12.0 + uTime * 3.0));
    float pupil = smoothstep(0.12, 0.03, cellDist);
    float pareidolia = irisRing * 0.85 + pupil * 1.1;

    // Combine layers according to uDeepDreamClamping & uStyleTransferMix
    float neuralSignal =
      lowLayerPattern * (1.0 - uDeepDreamClamping * 0.4) +
      styleSwirl * uStyleTransferMix * 1.15 +
      pareidolia * pow(uDeepDreamClamping, 1.2) * (0.8 + uAudioBands.w * 1.4);

    vec3 basePalette = cosinePalette(
      trap * 0.35 + neuralSignal * 0.28 + uTime * 0.08 + rayDepth * 0.04,
      vec3(0.5, 0.5, 0.52),
      vec3(0.48, 0.45, 0.48),
      vec3(1.0, 1.0, 1.0),
      vec3(0.0, 0.33, 0.67) + uPalettePrimary * 0.35
    );

    vec3 accentGlow = mix(uPalettePrimary, uPaletteSecondary, 0.5 + 0.5 * sin(neuralSignal * 2.5));
    return mix(basePalette, accentGlow, 0.38 + 0.25 * uStyleTransferMix);
  }

  void main() {
    vec3 rayDir = normalize(vWorldDirection);

    // Camera ray origin moves through the infinite fractal lattice modulated by Alpha speed
    vec3 rayOrigin = vec3(
      sin(uTime * 0.35) * 1.6,
      cos(uTime * 0.28) * 1.2,
      uTime * 1.45
    );

    // Sphere Tracing (Hart 1996)
    float t = 0.8;
    float trapMin = 1e10;
    float glowAccum = 0.0;
    int maxSteps = uIsHeadless > 0.5 ? 18 : 38;

    for (int i = 0; i < 38; i++) {
      if (i >= maxSteps) break;
      vec3 p = rayOrigin + rayDir * t;
      vec2 res = mapFractalScene(p);
      float d = res.x;
      trapMin = min(trapMin, res.y);

      // Volumetric photonic glow near implicit SDF surface
      glowAccum += 0.028 / (0.06 + abs(d) * 4.5);

      if (abs(d) < 0.008 || t > 24.0) break;
      t += max(abs(d) * 0.82, 0.02);
    }

    // Compute fractal surface & volumetric radiance with soft highlight roll-off
    vec3 psychedelicColor = computeDeepDreamAndStyleTransfer(rayDir, t, trapMin);
    psychedelicColor *= (0.42 + glowAccum * (0.65 + uAudioBands.w * 0.75));
    psychedelicColor = psychedelicColor / (1.0 + psychedelicColor * 0.52);

    // Subtle distance fog in fractal space
    float fogFactor = exp(-t * 0.075);
    psychedelicColor = mix(psychedelicColor * 0.35, psychedelicColor, fogFactor);

    // Grounded Clinical Research Chamber background (for Scene 1..4 portal transition)
    float horizon = smoothstep(-0.35, 0.45, rayDir.y);
    vec3 labSkyColor = mix(vec3(0.03, 0.045, 0.075), vec3(0.05, 0.08, 0.14), horizon);

    // Subtle architectural coordinate grid on lab dome
    vec2 gridUv = atan(rayDir.xz, vec2(rayDir.y)) * 6.0;
    float gridLine = smoothstep(0.94, 0.99, max(cos(gridUv.x), cos(gridUv.y))) * 0.12;
    labSkyColor += uPalettePrimary * gridLine * (1.0 + uAudioBands.y);

    // Dynamic Gaussian-Splat-inspired Psychedelic Cutout Portal (Section 2 of paper)
    // Starts in front of viewer and expands to engulf 360° space as uFractalImmersion -> 1.0
    float portalAngle = acos(clamp(dot(rayDir, normalize(vec3(0.0, 0.1, -1.0))), -1.0, 1.0));
    float rippleNoise = 0.18 * sin(atan(rayDir.y, rayDir.x) * uKaleidoscopeFolds + uTime * 2.4)
                      + 0.12 * cos(portalAngle * 8.0 - uTime * 1.8) * uAudioBands.x;
    float portalRadius = uFractalImmersion * PI * 1.18 + uAudioBands.x * 0.35;
    float portalMask = 1.0 - smoothstep(portalRadius - 0.35, portalRadius + 0.15, portalAngle + rippleNoise);

    // Edge boundary energy ring around the growing psychedelic cutout
    float portalRim = smoothstep(0.22, 0.0, abs((portalAngle + rippleNoise) - portalRadius))
                    * step(0.05, uFractalImmersion) * step(uFractalImmersion, 0.92);

    vec3 finalColor = mix(labSkyColor, psychedelicColor, clamp(portalMask, 0.0, 1.0));
    finalColor += uPaletteSecondary * portalRim * (1.4 + uAudioBands.w * 2.0);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

/**
 * Generates a procedural tileable bump/roughness micro-relief texture for grounded lab architecture.
 */
function createProceduralMicroReliefTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  // Brushed architectural panel lines and micro-grain
  ctx.strokeStyle = '#969696';
  ctx.lineWidth = 1;
  for (let y = 0; y < 256; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  for (let x = 0; x < 256; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Creates a soft radial contact shadow texture for grounded 3D structures.
 */
function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.32)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const PsychedelicSceneCanvas: React.FC<SceneCanvasProps> = ({
  activeScene,
  audioEngine,
  stereoSbsMode,
  distortionIntensity,
  fractalComplexityBias,
  kaleidoscopeOverride,
  csgSmoothOverride,
  deepDreamLayerOverride,
  cameraFov,
  onTelemetryUpdate,
  onWebXRSupportedChange,
  xrSessionTriggerRef,
  resetCameraTriggerRef,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  // Store mutable props in refs so React UI updates never tear down the WebGL context
  const propsRef = useRef({
    activeScene,
    audioEngine,
    stereoSbsMode,
    distortionIntensity,
    fractalComplexityBias,
    kaleidoscopeOverride,
    csgSmoothOverride,
    deepDreamLayerOverride,
    cameraFov,
    onTelemetryUpdate,
  });

  useEffect(() => {
    propsRef.current = {
      activeScene,
      audioEngine,
      stereoSbsMode,
      distortionIntensity,
      fractalComplexityBias,
      kaleidoscopeOverride,
      csgSmoothOverride,
      deepDreamLayerOverride,
      cameraFov,
      onTelemetryUpdate,
    };
  }, [
    activeScene,
    audioEngine,
    stereoSbsMode,
    distortionIntensity,
    fractalComplexityBias,
    kaleidoscopeOverride,
    csgSmoothOverride,
    deepDreamLayerOverride,
    cameraFov,
    onTelemetryUpdate,
  ]);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isHeadless =
      navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

    // Check WebXR support
    if ('xr' in navigator && navigator.xr) {
      navigator.xr
        .isSessionSupported('immersive-vr')
        .then((supported) => onWebXRSupportedChange(supported))
        .catch(() => onWebXRSupportedChange(false));
    } else {
      onWebXRSupportedChange(false);
    }

    // 1. Initialize Scene, Camera, and Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07090e);
    scene.fog = new THREE.FogExp2(0x07090e, 0.032);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(
      propsRef.current.cameraFov,
      width / height,
      0.1,
      200
    );
    camera.position.set(0, 2.1, 6.2);

    // Stereo cameras for Side-by-Side (SBS) VR Lens Mode
    const stereoCameraL = new THREE.PerspectiveCamera(propsRef.current.cameraFov, (width * 0.5) / height, 0.1, 200);
    const stereoCameraR = new THREE.PerspectiveCamera(propsRef.current.cameraFov, (width * 0.5) / height, 0.1, 200);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isHeadless,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.xr.enabled = true;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // WebGL context loss safety
    const handleContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    // 2. Mandatory Studio Environment Reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    // 3. OrbitControls & WASD/Arrow Keyboard Navigation
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.85, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxDistance = 16;
    controls.minDistance = 1.2;
    controls.maxPolarAngle = Math.PI * 0.88;
    controls.update();

    resetCameraTriggerRef.current = () => {
      camera.position.set(0, 2.1, 6.2);
      controls.target.set(0, 1.85, 0);
      controls.update();
    };

    // WebXR Session Toggle Handler
    let currentXrSession: XRSession | null = null;
    xrSessionTriggerRef.current = async () => {
      if (!('xr' in navigator) || !navigator.xr) return;
      if (currentXrSession) {
        await currentXrSession.end();
        currentXrSession = null;
        return;
      }
      try {
        const session = await navigator.xr.requestSession('immersive-vr', {
          optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
        });
        currentXrSession = session;
        session.addEventListener('end', () => {
          currentXrSession = null;
        });
        await renderer.xr.setSession(session);
      } catch {
        // Fallback handled by UI stereo SBS mode
      }
    };

    // 4. Three-Point Studio & Color-Temperature Contrast Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.85);
    scene.add(hemiLight);

    // Warm Key Light (Single shadow caster per performance rules)
    const keyLight = new THREE.DirectionalLight(0xfef08a, 1.65);
    keyLight.position.set(6, 11, 7);
    keyLight.castShadow = !isHeadless;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 30;
    const d = 10;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    // Cool Rim Light
    const rimLight = new THREE.SpotLight(0x06b6d4, 2.4, 25, Math.PI * 0.35, 0.5);
    rimLight.position.set(-6, 6, -6);
    scene.add(rimLight);

    // Dynamic Audio-Coupled Core PointLight
    const corePointLight = new THREE.PointLight(0xf59e0b, 2.2, 14);
    corePointLight.position.set(0, 1.9, 0);
    scene.add(corePointLight);

    // 5. 360° Sphere-Traced SDF Fractal & DeepDream Shader Dome
    const domeGeo = new THREE.SphereGeometry(65, 64, 48);
    const domeUniforms = {
      uTime: { value: 0 },
      uFractalImmersion: { value: RESEARCH_SCENES[0].fractalImmersionBase },
      uStyleTransferMix: { value: RESEARCH_SCENES[0].styleTransferBase },
      uDeepDreamClamping: { value: RESEARCH_SCENES[0].deepDreamLayerBase },
      uIfsFoldComplexity: { value: 0.65 },
      uCsgSmoothK: { value: RESEARCH_SCENES[0].csgSmoothK },
      uKaleidoscopeFolds: { value: RESEARCH_SCENES[0].kaleidoscopeFolds },
      uFractalMode: { value: RESEARCH_SCENES[0].fractalMode },
      uPalettePrimary: { value: new THREE.Color(...RESEARCH_SCENES[0].palettePrimary) },
      uPaletteSecondary: { value: new THREE.Color(...RESEARCH_SCENES[0].paletteSecondary) },
      uAudioBands: { value: new THREE.Vector4(0.1, 0.1, 0.1, 0.1) },
      uIsHeadless: { value: isHeadless ? 1.0 : 0.0 },
    };

    const domeMat = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: domeUniforms,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const skyDome = new THREE.Mesh(domeGeo, domeMat);
    scene.add(skyDome);

    // 6. Grounded Clinical Neuro-VR Chamber Architecture (Scenes 1-4 Grounding Context)
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const microReliefTex = createProceduralMicroReliefTexture(maxAnisotropy);
    const contactShadowTex = createContactShadowTexture();

    const labArchitectureGroup = new THREE.Group();
    scene.add(labArchitectureGroup);

    // Lab Floor Platform with subtle radial rings (offset on Y to prevent Z-fighting)
    const floorGeo = new THREE.CylinderGeometry(14, 14.5, 0.2, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.65,
      metalness: 0.25,
      bumpMap: microReliefTex,
      bumpScale: 0.015,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -0.1;
    floorMesh.receiveShadow = !isHeadless;
    labArchitectureGroup.add(floorMesh);

    // Calibration Concentric Floor Rings (polygonOffset + Y offset >= 0.02)
    const floorRingGeo = new THREE.RingGeometry(2.6, 2.68, 64);
    floorRingGeo.rotateX(-Math.PI / 2);
    const floorRingMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const floorRing1 = new THREE.Mesh(floorRingGeo, floorRingMat);
    floorRing1.position.y = 0.02;
    labArchitectureGroup.add(floorRing1);

    const floorRing2 = new THREE.Mesh(new THREE.RingGeometry(5.2, 5.26, 64).rotateX(-Math.PI / 2), floorRingMat);
    floorRing2.position.y = 0.022;
    labArchitectureGroup.add(floorRing2);

    // 8 Grounded Architectural Calibration Pillars around the perimeter (each a multi-part structure)
    const pillarGroup = new THREE.Group();
    labArchitectureGroup.add(pillarGroup);

    const pillarBodyGeo = new THREE.CylinderGeometry(0.24, 0.3, 4.6, 16);
    const pillarBaseGeo = new THREE.CylinderGeometry(0.45, 0.52, 0.35, 16);
    const pillarBandGeo = new THREE.TorusGeometry(0.28, 0.035, 12, 24);
    pillarBandGeo.rotateX(Math.PI / 2);

    const pillarMetalMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.42,
      metalness: 0.72,
      bumpMap: microReliefTex,
      bumpScale: 0.01,
    });
    const pillarBaseMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.75,
      metalness: 0.3,
    });
    const pillarGlowMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.5,
    });

    const shadowPlaneGeo = new THREE.CircleGeometry(0.85, 24);
    shadowPlaneGeo.rotateX(-Math.PI / 2);
    const shadowPlaneMat = new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const radius = 8.2;
      const pNode = new THREE.Group();
      pNode.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);

      const base = new THREE.Mesh(pillarBaseGeo, pillarBaseMat);
      base.position.y = 0.175;
      pNode.add(base);

      const shaft = new THREE.Mesh(pillarBodyGeo, pillarMetalMat);
      shaft.position.y = 2.3;
      shaft.castShadow = !isHeadless;
      pNode.add(shaft);

      const bandLow = new THREE.Mesh(pillarBandGeo, pillarGlowMat);
      bandLow.position.y = 1.2;
      pNode.add(bandLow);

      const bandHigh = new THREE.Mesh(pillarBandGeo, pillarGlowMat);
      bandHigh.position.y = 3.5;
      pNode.add(bandHigh);

      const contactShadow = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
      contactShadow.position.y = 0.015;
      pNode.add(contactShadow);

      pillarGroup.add(pNode);
    }

    // 7. Hero Composite 10-Part 3D Subject: "Entropic IFS Polyhedral Resonator"
    // Built as a hierarchical THREE.Group across Primary Silhouette, Secondary Read, and Accent Detail
    const heroResonatorGroup = new THREE.Group();
    scene.add(heroResonatorGroup);

    // Hero Contact Shadow Disc (grounded at y = 0.018)
    const heroShadow = new THREE.Mesh(
      new THREE.CircleGeometry(2.1, 32).rotateX(-Math.PI / 2),
      shadowPlaneMat
    );
    heroShadow.position.y = 0.018;
    heroResonatorGroup.add(heroShadow);

    // Part 1: Grounded Pedestal Plinth (Matte dark slate, roughness: 0.78)
    const plinthGeo = new THREE.CylinderGeometry(1.15, 1.45, 0.42, 8);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.78,
      metalness: 0.35,
    });
    const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
    plinthMesh.position.y = 0.21;
    plinthMesh.receiveShadow = !isHeadless;
    heroResonatorGroup.add(plinthMesh);

    // Part 2: Pedestal Step & Emitter Collar (Brushed steel, roughness: 0.32, metalness: 0.88)
    const collarGeo = new THREE.CylinderGeometry(0.82, 1.05, 0.24, 16);
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.32,
      metalness: 0.88,
    });
    const collarMesh = new THREE.Mesh(collarGeo, collarMat);
    collarMesh.position.y = 0.54;
    heroResonatorGroup.add(collarMesh);

    // Part 3: Emitter Lens Ring (Glowing cyan accent)
    const emitterRingGeo = new THREE.TorusGeometry(0.86, 0.04, 16, 48);
    emitterRingGeo.rotateX(Math.PI / 2);
    const emitterRingMesh = new THREE.Mesh(emitterRingGeo, pillarGlowMat);
    emitterRingMesh.position.y = 0.67;
    heroResonatorGroup.add(emitterRingMesh);

    // Floating Gyroscopic Attractor Assembly (centered at y = 2.05)
    const attractorAssembly = new THREE.Group();
    attractorAssembly.position.y = 2.05;
    heroResonatorGroup.add(attractorAssembly);

    // Part 4: Outer Anisotropic Titanium Gimbal Ring (roughness: 0.16, metalness: 0.95)
    const outerGimbalGeo = new THREE.TorusGeometry(1.42, 0.055, 24, 64);
    const outerGimbalMat = new THREE.MeshPhysicalMaterial({
      color: 0x94a3b8,
      metalness: 0.95,
      roughness: 0.16,
      clearcoat: 0.8,
    });
    const outerGimbal = new THREE.Mesh(outerGimbalGeo, outerGimbalMat);
    attractorAssembly.add(outerGimbal);

    // Part 5: Middle Brushed Gold Harmonic Ring (roughness: 0.22, metalness: 0.92)
    const midGimbalGeo = new THREE.TorusGeometry(1.14, 0.045, 24, 64);
    const midGimbalMat = new THREE.MeshPhysicalMaterial({
      color: 0xfbbf24,
      metalness: 0.92,
      roughness: 0.22,
      clearcoat: 0.6,
    });
    const midGimbal = new THREE.Mesh(midGimbalGeo, midGimbalMat);
    attractorAssembly.add(midGimbal);

    // Part 6: Inner Meridian Cage Ring (roughness: 0.48, metalness: 0.8)
    const innerGimbalGeo = new THREE.TorusGeometry(0.88, 0.035, 20, 48);
    const innerGimbalMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.8,
      roughness: 0.48,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
    });
    const innerGimbal = new THREE.Mesh(innerGimbalGeo, innerGimbalMat);
    attractorAssembly.add(innerGimbal);

    // Part 7 & 8: Dual Interlocking Sacred Geometry Octahedra (Merkaba Star)
    const octaGeo = new THREE.OctahedronGeometry(0.68, 0);
    const octaWireMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.6,
      roughness: 0.25,
      metalness: 0.85,
      wireframe: true,
    });
    const merkabaA = new THREE.Mesh(octaGeo, octaWireMat);
    const merkabaB = new THREE.Mesh(octaGeo, octaWireMat);
    merkabaB.rotation.y = Math.PI / 4;
    merkabaB.rotation.x = Math.PI / 4;
    attractorAssembly.add(merkabaA);
    attractorAssembly.add(merkabaB);

    // Part 9: Refractive Optical Crystal Core with custom vertex wave displacement (onBeforeCompile)
    const coreCrystalGeo = new THREE.IcosahedronGeometry(0.52, 4);
    const coreCrystalMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      transmission: isHeadless ? 0.0 : 0.92,
      opacity: 1.0,
      metalness: 0.1,
      roughness: 0.12,
      ior: 1.75,
      thickness: 1.6,
      attenuationColor: new THREE.Color(0x06b6d4),
      attenuationDistance: 1.2,
      clearcoat: 1.0,
      emissive: new THREE.Color(0x0891b2),
      emissiveIntensity: 0.35,
    });

    coreCrystalMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uAudioDisplacement = { value: 0.15 };
      coreCrystalMat.userData.shader = shader;

      shader.vertexShader =
        `
        uniform float uTime;
        uniform float uAudioDisplacement;
        ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        float wave = sin(position.x * 6.0 + uTime * 3.0) * cos(position.y * 6.0 - uTime * 2.4) * sin(position.z * 6.0 + uTime * 2.0);
        transformed += normal * wave * uAudioDisplacement;
        `
      );
    };

    const coreCrystalMesh = new THREE.Mesh(coreCrystalGeo, coreCrystalMat);
    attractorAssembly.add(coreCrystalMesh);

    // 8. InstancedMesh of 48 Orbiting Harmonic Fractal Nodes (>20 repeated items rule)
    const instanceCount = 48;
    const nodeGeo = new THREE.OctahedronGeometry(0.11, 1);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.22,
      metalness: 0.85,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.55,
    });
    const harmonicSwarm = new THREE.InstancedMesh(nodeGeo, nodeMat, instanceCount);
    harmonicSwarm.frustumCulled = false;

    const tempColor = new THREE.Color();
    for (let i = 0; i < instanceCount; i++) {
      tempColor.setHSL((i / instanceCount) * 0.55 + 0.48, 0.85, 0.6);
      harmonicSwarm.setColorAt(i, tempColor);
    }
    if (harmonicSwarm.instanceColor) {
      harmonicSwarm.instanceColor.needsUpdate = true;
    }
    scene.add(harmonicSwarm);

    // Pre-warm shaders
    renderer.compile(scene, camera);

    // 9. Keyboard Navigation Listeners (WASD / Arrow keys)
    const keysPressed = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      keysPressed.add(e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.code);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Resize Handler
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 10. Pre-allocated scratch math helpers (Zero GC in render loop)
    const _dummyMatrix = new THREE.Matrix4();
    const _dummyPos = new THREE.Vector3();
    const _dummyQuat = new THREE.Quaternion();
    const _dummyScale = new THREE.Vector3();
    const _dummyEuler = new THREE.Euler();
    const _forward = new THREE.Vector3();
    const _right = new THREE.Vector3();
    const _targetPrimary = new THREE.Color();
    const _targetSecondary = new THREE.Color();

    let smoothedBands: NeuroAudioBands = {
      theta: 0.15,
      alpha: 0.2,
      beta: 0.18,
      gamma: 0.15,
      rms: 0.18,
      spectralEntropy: 0.45,
      dmnSuppression: 62,
      entropicIndex: 58,
    };

    let smoothedUniforms: CoupledVisualUniforms = {
      fractalImmersion: RESEARCH_SCENES[0].fractalImmersionBase,
      styleTransferMix: RESEARCH_SCENES[0].styleTransferBase,
      deepDreamClamping: RESEARCH_SCENES[0].deepDreamLayerBase,
      ifsFoldComplexity: 0.65,
      csgSmoothK: RESEARCH_SCENES[0].csgSmoothK,
      temporalFlowSpeed: 1.0,
      kaleidoscopeSymmetry: RESEARCH_SCENES[0].kaleidoscopeFolds,
    };

    const clock = new THREE.Clock();
    let phaseTime = 0;
    let lastHudUpdate = 0;
    let lastHeadlessFrame = 0;

    // Render Loop (supports both standard requestAnimationFrame and WebXR setAnimationLoop)
    renderer.setAnimationLoop((timestamp) => {
      // Throttle headless software rendering to ~15fps so Playwright screenshots never stall
      if (isHeadless && timestamp - lastHeadlessFrame < 62) {
        return;
      }
      lastHeadlessFrame = timestamp;

      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const currentProps = propsRef.current;

      // Update camera FOV smoothly if changed
      if (Math.abs(camera.fov - currentProps.cameraFov) > 0.1) {
        camera.fov = dampValue(camera.fov, currentProps.cameraFov, 8, dt);
        camera.updateProjectionMatrix();
      }

      // WASD / Arrow keyboard movement
      if (keysPressed.size > 0) {
        const moveSpeed = 3.2 * dt;
        camera.getWorldDirection(_forward);
        _forward.y = 0;
        _forward.normalize();
        _right.crossVectors(_forward, camera.up).normalize();

        if (keysPressed.has('KeyW') || keysPressed.has('ArrowUp')) {
          camera.position.addScaledVector(_forward, moveSpeed);
          controls.target.addScaledVector(_forward, moveSpeed);
        }
        if (keysPressed.has('KeyS') || keysPressed.has('ArrowDown')) {
          camera.position.addScaledVector(_forward, -moveSpeed);
          controls.target.addScaledVector(_forward, -moveSpeed);
        }
        if (keysPressed.has('KeyA') || keysPressed.has('ArrowLeft')) {
          camera.position.addScaledVector(_right, -moveSpeed);
          controls.target.addScaledVector(_right, -moveSpeed);
        }
        if (keysPressed.has('KeyD') || keysPressed.has('ArrowRight')) {
          camera.position.addScaledVector(_right, moveSpeed);
          controls.target.addScaledVector(_right, moveSpeed);
        }
      }

      controls.update();

      // 1. Sample real-time FFT audio frequency bands
      const { bands: rawBands, spectrumPreview } =
        currentProps.audioEngine.sampleTelemetry(elapsed);
      smoothedBands = smoothAudioTelemetry(smoothedBands, rawBands, 6.5, dt);

      // 2. Compute coupled visual uniform targets from active scene + smoothed frequency bands
      const targetUniforms = computeShaderUniformTargets(
        currentProps.activeScene,
        smoothedBands,
        {
          distortionIntensity: currentProps.distortionIntensity,
          fractalComplexityBias: currentProps.fractalComplexityBias,
          kaleidoscopeOverride: currentProps.kaleidoscopeOverride,
          csgSmoothOverride: currentProps.csgSmoothOverride,
          deepDreamLayerOverride: currentProps.deepDreamLayerOverride,
        }
      );

      smoothedUniforms = {
        fractalImmersion: dampValue(
          smoothedUniforms.fractalImmersion,
          targetUniforms.fractalImmersion,
          3.2,
          dt
        ),
        styleTransferMix: dampValue(
          smoothedUniforms.styleTransferMix,
          targetUniforms.styleTransferMix,
          4.0,
          dt
        ),
        deepDreamClamping: dampValue(
          smoothedUniforms.deepDreamClamping,
          targetUniforms.deepDreamClamping,
          4.0,
          dt
        ),
        ifsFoldComplexity: dampValue(
          smoothedUniforms.ifsFoldComplexity,
          targetUniforms.ifsFoldComplexity,
          5.0,
          dt
        ),
        csgSmoothK: dampValue(smoothedUniforms.csgSmoothK, targetUniforms.csgSmoothK, 5.0, dt),
        temporalFlowSpeed: dampValue(
          smoothedUniforms.temporalFlowSpeed,
          targetUniforms.temporalFlowSpeed,
          4.5,
          dt
        ),
        kaleidoscopeSymmetry: targetUniforms.kaleidoscopeSymmetry,
      };

      phaseTime += dt * smoothedUniforms.temporalFlowSpeed;

      // 3. Update 360° Raymarched Fractal & DeepDream Dome Uniforms
      domeUniforms.uTime.value = phaseTime;
      domeUniforms.uFractalImmersion.value = smoothedUniforms.fractalImmersion;
      domeUniforms.uStyleTransferMix.value = smoothedUniforms.styleTransferMix;
      domeUniforms.uDeepDreamClamping.value = smoothedUniforms.deepDreamClamping;
      domeUniforms.uIfsFoldComplexity.value = smoothedUniforms.ifsFoldComplexity;
      domeUniforms.uCsgSmoothK.value = smoothedUniforms.csgSmoothK;
      domeUniforms.uKaleidoscopeFolds.value = smoothedUniforms.kaleidoscopeSymmetry;
      domeUniforms.uFractalMode.value = currentProps.activeScene.fractalMode;
      domeUniforms.uAudioBands.value.set(
        smoothedBands.theta,
        smoothedBands.alpha,
        smoothedBands.beta,
        smoothedBands.gamma
      );

      _targetPrimary.setRGB(...currentProps.activeScene.palettePrimary);
      _targetSecondary.setRGB(...currentProps.activeScene.paletteSecondary);
      domeUniforms.uPalettePrimary.value.lerp(_targetPrimary, Math.min(1, dt * 3.0));
      domeUniforms.uPaletteSecondary.value.lerp(_targetSecondary, Math.min(1, dt * 3.0));

      // Keep skyDome centered on viewer
      skyDome.position.copy(camera.position);

      // 4. Animate Foreground Composite Polyhedral Resonator & Lab Geometry
      outerGimbal.rotation.y = phaseTime * 0.45;
      outerGimbal.rotation.x = Math.sin(phaseTime * 0.3) * 0.4;

      midGimbal.rotation.x = -phaseTime * 0.62;
      midGimbal.rotation.z = Math.cos(phaseTime * 0.35) * 0.5;

      innerGimbal.rotation.y = -phaseTime * 0.85;
      innerGimbal.rotation.z = phaseTime * 0.55;

      const merkabaScale = 1.0 + smoothedBands.beta * 0.32;
      merkabaA.scale.setScalar(merkabaScale);
      merkabaB.scale.setScalar(merkabaScale);
      merkabaA.rotation.y = phaseTime * 0.5;
      merkabaB.rotation.y = -phaseTime * 0.5;

      if (coreCrystalMat.userData.shader) {
        coreCrystalMat.userData.shader.uniforms.uTime.value = phaseTime;
        coreCrystalMat.userData.shader.uniforms.uAudioDisplacement.value =
          0.08 + smoothedBands.theta * 0.25 + smoothedBands.gamma * 0.2;
      }

      corePointLight.color.copy(domeUniforms.uPalettePrimary.value);
      corePointLight.intensity = 1.8 + smoothedBands.rms * 3.2;

      // Progressive lab dissolution as Fractal Immersion approaches 1.0 (Scenes 5-8)
      const labScale = Math.max(0.001, 1.0 - Math.max(0, smoothedUniforms.fractalImmersion - 0.65) * 2.2);
      pillarGroup.scale.set(1, labScale, 1);
      floorMesh.position.y = -0.1 - Math.max(0, smoothedUniforms.fractalImmersion - 0.7) * 4.5;

      // Update 48 Instanced Harmonic Swarm Nodes in 3D Fibonacci / Toroidal orbits
      for (let i = 0; i < instanceCount; i++) {
        const ratio = i / instanceCount;
        const orbitAngle = ratio * Math.PI * 2 * smoothedUniforms.kaleidoscopeSymmetry + phaseTime * 0.4;
        const ringRadius =
          2.2 +
          Math.sin(ratio * Math.PI * 6 + phaseTime * 0.7) * (0.9 + smoothedBands.beta * 1.4);
        const yHeight =
          1.95 +
          Math.cos(ratio * Math.PI * 8 - phaseTime * 0.9) * (1.1 + smoothedBands.theta * 1.2);

        _dummyPos.set(
          Math.cos(orbitAngle) * ringRadius,
          yHeight,
          Math.sin(orbitAngle) * ringRadius
        );
        _dummyEuler.set(phaseTime + i, phaseTime * 0.7 - i, 0);
        _dummyQuat.setFromEuler(_dummyEuler);

        const s = (0.75 + (i % 5) * 0.12) * (1.0 + smoothedBands.gamma * 0.85);
        _dummyScale.set(s, s, s);

        _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
        harmonicSwarm.setMatrixAt(i, _dummyMatrix);
      }
      harmonicSwarm.instanceMatrix.needsUpdate = true;

      // 5. Render Scene (Standard Single Viewport, Native WebXR, or Stereo Side-by-Side HMD Mode)
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;

      if (currentProps.stereoSbsMode && !renderer.xr.isPresenting) {
        // Stereoscopic Side-by-Side (SBS) dual-eye rendering for VR Headsets / Cardboard
        const halfW = Math.floor(w * 0.5);
        const ipdOffset = 0.032; // 64mm interpupillary distance

        camera.updateMatrixWorld();
        stereoCameraL.fov = camera.fov;
        stereoCameraL.aspect = halfW / h;
        stereoCameraL.updateProjectionMatrix();
        stereoCameraL.matrixWorld.copy(camera.matrixWorld);
        stereoCameraL.translateX(-ipdOffset);

        stereoCameraR.fov = camera.fov;
        stereoCameraR.aspect = halfW / h;
        stereoCameraR.updateProjectionMatrix();
        stereoCameraR.matrixWorld.copy(camera.matrixWorld);
        stereoCameraR.translateX(ipdOffset);

        renderer.setScissorTest(true);

        // Left Eye
        renderer.setViewport(0, 0, halfW, h);
        renderer.setScissor(0, 0, halfW, h);
        renderer.render(scene, stereoCameraL);

        // Right Eye
        renderer.setViewport(halfW, 0, w - halfW, h);
        renderer.setScissor(halfW, 0, w - halfW, h);
        renderer.render(scene, stereoCameraR);

        renderer.setScissorTest(false);
        renderer.setViewport(0, 0, w, h);
      } else {
        renderer.setScissorTest(false);
        renderer.setViewport(0, 0, w, h);
        renderer.render(scene, camera);
      }

      // 6. Throttle React HUD telemetry state updates to ~8Hz
      if (timestamp - lastHudUpdate > 125) {
        lastHudUpdate = timestamp;
        currentProps.onTelemetryUpdate(smoothedBands, smoothedUniforms, spectrumPreview);
      }
    });

    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      controls.dispose();
      domeGeo.dispose();
      domeMat.dispose();
      microReliefTex.dispose();
      contactShadowTex.dispose();
      envTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={canvasMountRef}
      data-testid="psychedelic-webgl-canvas"
      className="fixed inset-0 w-full h-full cursor-crosshair z-0"
      aria-label="Interactive 3D WebXR Psychedelic Phenomenology Viewport"
    />
  );
};
