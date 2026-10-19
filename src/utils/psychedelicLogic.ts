/**
 * Pure mathematical, signal-processing, and research-protocol logic for
 * NeuroDelic XR (WebXR Psychedelic Phenomenology & Audio-Reactive Fractal Lab).
 *
 * Grounded in:
 * - Matthews et al. (2025), "Virtual reality and psychedelics: new perspectives and new possibilities in the treatment of alcohol use disorder"
 * - Greco et al. (2021, 2025), Rastelli et al. (2022), Suzuki et al. (2017)
 * - Adaptive VR-BCI & Sphere-Traced CSG/IFS Fractal Phenomenology (Sections 2–5)
 */

export interface NeuroAudioBands {
  /** Theta-band analogue (4-7 Hz envelope / 40-160 Hz sub-bass): regulates style-transfer linear interpolation */
  theta: number;
  /** Alpha-band analogue (8-12 Hz / 160-500 Hz low-mid warmth): tracks DMN suppression & temporal flow speed */
  alpha: number;
  /** Beta-band analogue (20-30 Hz / 500-2500 Hz mid-high harmonics): controls fractal IFS fold complexity & CSG blend */
  beta: number;
  /** Gamma-band analogue (>30 Hz / 2500-10000 Hz brilliance): drives cortical entropy, DeepDream layer clamping & spectral shift */
  gamma: number;
  /** Normalized RMS amplitude [0, 1] */
  rms: number;
  /** Normalized Shannon spectral entropy [0, 1] (Greco et al., 2021 Entropic Brain metric) */
  spectralEntropy: number;
  /** Default Mode Network (DMN) Suppression Index [0, 100] — inversely proportional to posterior alpha synchronization */
  dmnSuppression: number;
  /** Cognitive Flexibility & Entropic Brain Index [0, 100] (Rastelli et al., 2022; Carhart-Harris et al., 2014) */
  entropicIndex: number;
}

export interface PsychedelicSceneSpec {
  id: number; // 1 to 8
  code: string;
  title: string;
  phase: 'Grounding Lab' | 'DeepDream & Style Transfer' | 'Sphere-Traced 3D Fractals';
  subtitle: string;
  description: string;
  /** 0 = pure lab, 0.5 = hybrid portal cutout, 1.0 = full sphere-traced 3D fractal immersion */
  fractalImmersionBase: number;
  /** Base DeepDream DCNN clamped layer depth (0 = unaltered, 0.35 = low-layer Gabor geometry, 0.85 = high-layer complex pareidolia) */
  deepDreamLayerBase: number;
  /** Base Spatiotemporal Style Transfer blend [0, 1] */
  styleTransferBase: number;
  /** Primary SDF / CSG fractal mode in shader (0: Lab/Portal, 1: Mandelbulb Power-Fold, 2: Menger-Torus CSG, 3: Apollonian Octa-Lattice, 4: Hyperbolic Kaleidoscope Tunnel) */
  fractalMode: number;
  /** Base kaleidoscopic symmetry folds (e.g., 4, 6, 8, 12) */
  kaleidoscopeFolds: number;
  /** Base CSG smooth-minimum blending constant k (Inigo Quilez smin) */
  csgSmoothK: number;
  /** Primary accent palette in RGB [0..1] */
  palettePrimary: [number, number, number];
  paletteSecondary: [number, number, number];
}

export const RESEARCH_SCENES: PsychedelicSceneSpec[] = [
  {
    id: 1,
    code: 'SCN-01',
    title: 'Baseline Clinical Lab Space',
    phase: 'Grounding Lab',
    subtitle: 'Eyes-Open Resting Baseline & Spatial Grounding',
    description:
      'Unaltered 3D volumetric rendering of the neuro-VR research chamber. Establishes perceptual grounding and calibrates individualized posterior alpha baseline before introducing visual perturbations.',
    fractalImmersionBase: 0.08,
    deepDreamLayerBase: 0.05,
    styleTransferBase: 0.04,
    fractalMode: 0,
    kaleidoscopeFolds: 4,
    csgSmoothK: 0.25,
    palettePrimary: [0.02, 0.71, 0.83],
    paletteSecondary: [0.15, 0.39, 0.92],
  },
  {
    id: 2,
    code: 'SCN-02',
    title: 'Low-Layer DCNN Geometric Drift',
    phase: 'DeepDream & Style Transfer',
    subtitle: 'Early Visual Cortex (V1/V2) Gabor Lattice Clamping',
    description:
      'Clamps gradient ascent at shallow convolutional layers (Suzuki et al., 2017), perturbing architectural edges with breathing geometric diffraction patterns and subtle audio-coupled surface ripples.',
    fractalImmersionBase: 0.26,
    deepDreamLayerBase: 0.38,
    styleTransferBase: 0.28,
    fractalMode: 0,
    kaleidoscopeFolds: 6,
    csgSmoothK: 0.32,
    palettePrimary: [0.06, 0.78, 0.68],
    paletteSecondary: [0.38, 0.28, 0.92],
  },
  {
    id: 3,
    code: 'SCN-03',
    title: 'Spatiotemporal Style Transfer Cutout',
    phase: 'DeepDream & Style Transfer',
    subtitle: 'Theta-Modulated Neural Style Interpolation (Greco & Siegel, 2025)',
    description:
      'Overlays a dynamically expanding psychedelic Gaussian-splat cutout portal over the laboratory. Low-frequency theta energy governs real-time interpolation between physical walls and fluid chromatic vortices.',
    fractalImmersionBase: 0.52,
    deepDreamLayerBase: 0.64,
    styleTransferBase: 0.68,
    fractalMode: 1,
    kaleidoscopeFolds: 6,
    csgSmoothK: 0.42,
    palettePrimary: [0.96, 0.62, 0.04],
    paletteSecondary: [0.06, 0.71, 0.83],
  },
  {
    id: 4,
    code: 'SCN-04',
    title: 'High-Layer Pareidolia & Boundary Dissolution',
    phase: 'DeepDream & Style Transfer',
    subtitle: 'Deep Layer Inversion & Ego-Boundary Attenuation',
    description:
      'Inverts deeper DCNN feature detectors to project organic cellular motifs and iridescent pareidolia across dissolving room geometry as the chamber opens into infinite 3D signed-distance space.',
    fractalImmersionBase: 0.76,
    deepDreamLayerBase: 0.88,
    styleTransferBase: 0.85,
    fractalMode: 1,
    kaleidoscopeFolds: 8,
    csgSmoothK: 0.48,
    palettePrimary: [0.93, 0.28, 0.6],
    paletteSecondary: [0.06, 0.78, 0.88],
  },
  {
    id: 5,
    code: 'SCN-05',
    title: 'CSG Smooth-Blended Torus & Octa-IFS',
    phase: 'Sphere-Traced 3D Fractals',
    subtitle: 'Inigo Quilez Smooth Boolean SDF Primitives',
    description:
      'Full 360° sphere-traced implicit surface environment. Combines spheres, tori, and octahedra via smooth boolean operators (smin) with iterative space folding driven by real-time beta band harmonics.',
    fractalImmersionBase: 0.94,
    deepDreamLayerBase: 0.55,
    styleTransferBase: 0.6,
    fractalMode: 2,
    kaleidoscopeFolds: 8,
    csgSmoothK: 0.55,
    palettePrimary: [0.02, 0.78, 0.88],
    paletteSecondary: [0.96, 0.58, 0.08],
  },
  {
    id: 6,
    code: 'SCN-06',
    title: 'Mandelbulb Spherical Power Attractor',
    phase: 'Sphere-Traced 3D Fractals',
    subtitle: 'Non-Linear Triplex Polynomial Raymarching',
    description:
      'Immerses the viewer inside a breathing 3D Mandelbulb polynomial manifold. Audio spectral centroid modulates the spherical power exponent (n = 6..11) and soft-shadow ambient occlusion.',
    fractalImmersionBase: 1.0,
    deepDreamLayerBase: 0.72,
    styleTransferBase: 0.75,
    fractalMode: 1,
    kaleidoscopeFolds: 8,
    csgSmoothK: 0.45,
    palettePrimary: [0.58, 0.32, 0.95],
    paletteSecondary: [0.05, 0.85, 0.72],
  },
  {
    id: 7,
    code: 'SCN-07',
    title: 'Apollonian Sacred Cathedral Lattice',
    phase: 'Sphere-Traced 3D Fractals',
    subtitle: 'Recursive Sphere Inversion & Self-Transcendent Space',
    description:
      'Constructs an infinite architectural temple of recursive Apollonian sphere inversions and Menger cross-folds, engineered to elicit awe, oceanic boundlessness, and suppressed DMN rumination.',
    fractalImmersionBase: 1.0,
    deepDreamLayerBase: 0.82,
    styleTransferBase: 0.82,
    fractalMode: 3,
    kaleidoscopeFolds: 10,
    csgSmoothK: 0.38,
    palettePrimary: [0.98, 0.72, 0.15],
    paletteSecondary: [0.12, 0.65, 0.95],
  },
  {
    id: 8,
    code: 'SCN-08',
    title: 'Entropic Hyperbolic Kaleidoscope',
    phase: 'Sphere-Traced 3D Fractals',
    subtitle: 'Broadband Cortical Desynchronization & Peak Synaesthesia',
    description:
      'Peak cyberdelic synthesis combining 12-fold non-Euclidean space folding, DeepDream gamma pareidolia, and full-spectrum audio-visual coupling to maximize perceptual entropy and cognitive flexibility.',
    fractalImmersionBase: 1.0,
    deepDreamLayerBase: 0.95,
    styleTransferBase: 0.94,
    fractalMode: 4,
    kaleidoscopeFolds: 12,
    csgSmoothK: 0.62,
    palettePrimary: [0.1, 0.92, 0.78],
    paletteSecondary: [0.95, 0.25, 0.55],
  },
];

/**
 * Frame-rate independent exponential damping (smoothing).
 */
export function dampValue(current: number, target: number, lambda: number, dt: number): number {
  if (dt <= 0) return current;
  const factor = 1 - Math.exp(-lambda * dt);
  return current + (target - current) * factor;
}

/**
 * Clamp helper in [min, max].
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Computes neuro-acoustic frequency bands (Theta, Alpha, Beta, Gamma), RMS energy,
 * Shannon spectral entropy, DMN Suppression Index, and Entropic Index from raw FFT byte data.
 *
 * @param frequencyData Uint8Array of FFT magnitudes (0..255), typically 512 bins for fftSize=1024
 * @param sampleRate AudioContext sample rate (default 44100 or 48000 Hz)
 * @param sensitivity User sensitivity multiplier (0.5 to 2.5)
 */
export function computeAudioBandsFromFFT(
  frequencyData: Uint8Array | number[],
  sampleRate = 48000,
  sensitivity = 1.0
): NeuroAudioBands {
  const binCount = frequencyData.length;
  if (binCount === 0) {
    return {
      theta: 0,
      alpha: 0,
      beta: 0,
      gamma: 0,
      rms: 0,
      spectralEntropy: 0,
      dmnSuppression: 50,
      entropicIndex: 50,
    };
  }

  const nyquist = sampleRate / 2;
  const hzPerBin = nyquist / binCount;

  const avgRange = (minHz: number, maxHz: number): number => {
    const startBin = clamp(Math.floor(minHz / hzPerBin), 0, binCount - 1);
    const endBin = clamp(Math.ceil(maxHz / hzPerBin), startBin + 1, binCount);
    let sum = 0;
    let count = 0;
    for (let i = startBin; i < endBin; i++) {
      sum += frequencyData[i] / 255;
      count++;
    }
    return count > 0 ? clamp((sum / count) * sensitivity, 0, 1) : 0;
  };

  // Map acoustic spectrum into the 4 functional neuro-dynamic channels:
  // Sub-bass & fundamental pulse (40 - 160 Hz) -> Theta style-transfer modulation
  const theta = avgRange(40, 160);
  // Warm low-mid harmonics (160 - 500 Hz) -> Alpha temporal pacing & DMN indicator
  const alpha = avgRange(160, 500);
  // Upper-mid polyrhythmic/formant structure (500 - 2500 Hz) -> Beta IFS fractal complexity
  const beta = avgRange(500, 2500);
  // High-frequency brilliance & air (2500 - 9000 Hz) -> Gamma cortical entropy & DeepDream layer clamp
  const gamma = avgRange(2500, 9000);

  // Compute total RMS and normalized Shannon Spectral Entropy: H = -sum(p_i * log2(p_i)) / log2(N)
  let sumSq = 0;
  let totalEnergy = 0;
  const activeBins = Math.min(binCount, 256);
  for (let i = 0; i < activeBins; i++) {
    const norm = frequencyData[i] / 255;
    sumSq += norm * norm;
    totalEnergy += norm;
  }

  const rms = clamp(Math.sqrt(sumSq / activeBins) * sensitivity, 0, 1);

  let spectralEntropy = 0;
  if (totalEnergy > 1e-5) {
    let entropySum = 0;
    for (let i = 0; i < activeBins; i++) {
      const p = frequencyData[i] / 255 / totalEnergy;
      if (p > 1e-7) {
        entropySum -= p * Math.log2(p);
      }
    }
    spectralEntropy = clamp(entropySum / Math.log2(activeBins), 0, 1);
  }

  // Per Greco et al. (2021) & Carhart-Harris et al. (2014):
  // Engaging exogenous audio-visual stimuli attenuate posterior alpha (suppressing DMN mind-wandering)
  // while elevating gamma connectivity and global signal entropy.
  const dmnSuppression = Math.round(
    clamp((0.45 * theta + 0.45 * beta + 0.35 * gamma + 0.25 * spectralEntropy - 0.15 * alpha) * 100 + 28, 5, 99)
  );

  const entropicIndex = Math.round(
    clamp((0.4 * spectralEntropy + 0.35 * gamma + 0.25 * beta + 0.15 * theta) * 100 + 18, 10, 99)
  );

  return {
    theta,
    alpha,
    beta,
    gamma,
    rms,
    spectralEntropy,
    dmnSuppression,
    entropicIndex,
  };
}

/**
 * Smoothly interpolates all fields of NeuroAudioBands using frame-rate-independent exponential damping.
 */
export function smoothAudioTelemetry(
  current: NeuroAudioBands,
  target: NeuroAudioBands,
  lambda: number,
  dt: number
): NeuroAudioBands {
  return {
    theta: dampValue(current.theta, target.theta, lambda, dt),
    alpha: dampValue(current.alpha, target.alpha, lambda, dt),
    beta: dampValue(current.beta, target.beta, lambda, dt),
    gamma: dampValue(current.gamma, target.gamma, lambda, dt),
    rms: dampValue(current.rms, target.rms, lambda, dt),
    spectralEntropy: dampValue(current.spectralEntropy, target.spectralEntropy, lambda, dt),
    dmnSuppression: Math.round(dampValue(current.dmnSuppression, target.dmnSuppression, lambda * 0.5, dt)),
    entropicIndex: Math.round(dampValue(current.entropicIndex, target.entropicIndex, lambda * 0.5, dt)),
  };
}

export interface AdaptiveTransitionInput {
  currentSceneId: number;
  sceneElapsedSeconds: number;
  currentAlphaHabituation: number;
  baselineAlphaThreshold: number;
  autoAdvanceEnabled: boolean;
  minSceneDuration?: number;
  maxSceneDuration?: number;
}

export interface AdaptiveTransitionResult {
  shouldTransition: boolean;
  nextSceneId: number;
  reason: 'none' | 'alpha_threshold_exceeded' | 'max_duration_reached';
}

/**
 * Implements Section 3.3 of the research paper ("BCI and interaction with the VR environment"):
 * - Minimum scene time: 30 seconds
 * - Maximum scene time: 60 seconds
 * - Whenever current alpha habituation exceeds the individualized baseline threshold after minSceneDuration,
 *   it triggers a smooth transition to the next scene to re-engage externally directed attention and suppress DMN.
 */
export function evaluateAdaptiveSceneTransition(input: AdaptiveTransitionInput): AdaptiveTransitionResult {
  const minDur = input.minSceneDuration ?? 30;
  const maxDur = input.maxSceneDuration ?? 60;

  if (!input.autoAdvanceEnabled) {
    return {
      shouldTransition: false,
      nextSceneId: input.currentSceneId,
      reason: 'none',
    };
  }

  if (input.sceneElapsedSeconds < minDur) {
    return {
      shouldTransition: false,
      nextSceneId: input.currentSceneId,
      reason: 'none',
    };
  }

  const nextId = (input.currentSceneId % RESEARCH_SCENES.length) + 1;

  if (input.sceneElapsedSeconds >= maxDur) {
    return {
      shouldTransition: true,
      nextSceneId: nextId,
      reason: 'max_duration_reached',
    };
  }

  if (input.currentAlphaHabituation >= input.baselineAlphaThreshold) {
    return {
      shouldTransition: true,
      nextSceneId: nextId,
      reason: 'alpha_threshold_exceeded',
    };
  }

  return {
    shouldTransition: false,
    nextSceneId: input.currentSceneId,
    reason: 'none',
  };
}

export interface CoupledVisualUniforms {
  fractalImmersion: number;
  styleTransferMix: number;
  deepDreamClamping: number;
  ifsFoldComplexity: number;
  csgSmoothK: number;
  temporalFlowSpeed: number;
  kaleidoscopeSymmetry: number;
}

/**
 * Implements Section 5 coupling rules from the research paper:
 * - Frontal midline theta regulates linear interpolation between stylized texture and original scene
 * - Alpha power modulates rate of camera movement, fractal animation speeds, and temporal aspects
 * - Beta power controls complexity of the fractals & CSG smooth blending
 * - Gamma power regulates DeepDream layer clamping and high-frequency spectral distortion
 */
export function computeShaderUniformTargets(
  scene: PsychedelicSceneSpec,
  bands: NeuroAudioBands,
  userOverrides: {
    distortionIntensity: number; // 0..2 multiplier
    fractalComplexityBias: number; // 0.5..1.5 multiplier
    kaleidoscopeOverride: number | null; // null = use scene + audio
    csgSmoothOverride: number | null;
    deepDreamLayerOverride: number | null;
  }
): CoupledVisualUniforms {
  const intensity = clamp(userOverrides.distortionIntensity, 0, 2);

  // Theta modulates linear interpolation between original environment and style-transferred cutout
  const styleTransferMix = clamp(
    (scene.styleTransferBase + bands.theta * 0.42) * intensity,
    0,
    1
  );

  // Gamma modulates DeepDream DCNN layer clamping
  const baseDD = userOverrides.deepDreamLayerOverride ?? scene.deepDreamLayerBase;
  const deepDreamClamping = clamp(
    (baseDD + bands.gamma * 0.35 + bands.spectralEntropy * 0.15) * intensity,
    0,
    1
  );

  // Beta controls fractal complexity (IFS folding depth & iteration displacement)
  const ifsFoldComplexity = clamp(
    (0.45 + scene.fractalImmersionBase * 0.35 + bands.beta * 0.55) * userOverrides.fractalComplexityBias,
    0.1,
    1.8
  );

  // CSG smooth-minimum blending parameter k
  const baseK = userOverrides.csgSmoothOverride ?? scene.csgSmoothK;
  const csgSmoothK = clamp(baseK + bands.beta * 0.25 - bands.gamma * 0.1, 0.08, 0.95);

  // Alpha modulates temporal flow speed & camera drift
  const temporalFlowSpeed = clamp(0.4 + bands.alpha * 1.35 + bands.rms * 0.5, 0.2, 3.0);

  // Kaleidoscope fold count
  const kaleidoscopeSymmetry =
    userOverrides.kaleidoscopeOverride ??
    Math.round(clamp(scene.kaleidoscopeFolds + bands.beta * 4, 3, 16));

  const fractalImmersion = clamp(
    scene.fractalImmersionBase + (bands.theta * 0.12 + bands.gamma * 0.15) * (intensity * 0.7),
    0,
    1
  );

  return {
    fractalImmersion,
    styleTransferMix,
    deepDreamClamping,
    ifsFoldComplexity,
    csgSmoothK,
    temporalFlowSpeed,
    kaleidoscopeSymmetry,
  };
}

export interface AscSubscaleItem {
  id: 'blissfulState' | 'changedMeanings' | 'spiritualExperience' | 'elementaryImagery' | 'synaesthesia';
  label: string;
  description: string;
  /** Empirical mean from Figure 6 of the VR-BCI Digital Psychedelics study (0..100 scale) */
  studyMean: number;
  /** Standard deviation reported in Figure 6 */
  studySd: number;
  /** Reference Psilocybin (20mg) benchmark score (Suzuki et al., 2017 / Muthukumaraswamy et al., 2013) */
  psilocybinBenchmark: number;
}

export const ASC_5D_SUBSCALES: AscSubscaleItem[] = [
  {
    id: 'blissfulState',
    label: 'Blissful State',
    description: 'Profound peace, boundless joy, and positive emotional upliftment.',
    studyMean: 64,
    studySd: 18,
    psilocybinBenchmark: 68,
  },
  {
    id: 'changedMeanings',
    label: 'Changed Meanings of Percepts',
    description: 'Heightened significance of surroundings, objects, and emotional insights.',
    studyMean: 58,
    studySd: 16,
    psilocybinBenchmark: 62,
  },
  {
    id: 'spiritualExperience',
    label: 'Spiritual & Self-Transcendent Experience',
    description: 'Sense of awe, interconnectedness, and attenuation of ego boundaries.',
    studyMean: 34,
    studySd: 14,
    psilocybinBenchmark: 56,
  },
  {
    id: 'elementaryImagery',
    label: 'Elementary Imagery & Geometric Fractals',
    description: 'Vividness of kaleidoscopic lattices, form constants, and DeepDream pareidolia.',
    studyMean: 46,
    studySd: 19,
    psilocybinBenchmark: 71,
  },
  {
    id: 'synaesthesia',
    label: 'Audio-Visual Synaesthesia',
    description: 'Coupling of acoustic frequencies into shifting structural forms and chromatic waves.',
    studyMean: 49,
    studySd: 17,
    psilocybinBenchmark: 65,
  },
];

export type AscScoreMap = Record<AscSubscaleItem['id'], number>;

export interface AscEvaluationSummary {
  compositeScore: number;
  studyCompositeMean: number;
  cognitiveFlexibilityEstimate: number;
  therapeuticReadinessLabel: 'Baseline Waking State' | 'Mild Perceptual Shift' | 'Moderate VRP Phenomenology' | 'Profound Mystical-Analogue State';
  dominantDimension: string;
}

/**
 * Evaluates user responses on the 5D-ASC (5-Dimensional Altered States of Consciousness) scale
 * (0 = no deviation from waking consciousness, 100 = profound alteration).
 */
export function evaluate5DASC(scores: AscScoreMap): AscEvaluationSummary {
  const keys = ASC_5D_SUBSCALES.map((s) => s.id);
  let sum = 0;
  let studySum = 0;
  let maxVal = -1;
  let dominantDimension = ASC_5D_SUBSCALES[0].label;

  for (const item of ASC_5D_SUBSCALES) {
    const val = clamp(scores[item.id] ?? 0, 0, 100);
    sum += val;
    studySum += item.studyMean;
    if (val > maxVal) {
      maxVal = val;
      dominantDimension = item.label;
    }
  }

  const compositeScore = Math.round(sum / keys.length);
  const studyCompositeMean = Math.round(studySum / keys.length);

  // Per Bogenschutz et al. (2022) & Rastelli et al. (2022):
  // Mystical / Blissful & Changed Meaning scores predict cognitive flexibility gains.
  const weightedCF =
    scores.blissfulState * 0.3 +
    scores.changedMeanings * 0.3 +
    scores.elementaryImagery * 0.2 +
    scores.synaesthesia * 0.2;
  const cognitiveFlexibilityEstimate = Math.round(clamp(weightedCF, 0, 100));

  let therapeuticReadinessLabel: AscEvaluationSummary['therapeuticReadinessLabel'] = 'Baseline Waking State';
  if (compositeScore >= 70) {
    therapeuticReadinessLabel = 'Profound Mystical-Analogue State';
  } else if (compositeScore >= 45) {
    therapeuticReadinessLabel = 'Moderate VRP Phenomenology';
  } else if (compositeScore >= 20) {
    therapeuticReadinessLabel = 'Mild Perceptual Shift';
  }

  return {
    compositeScore,
    studyCompositeMean,
    cognitiveFlexibilityEstimate,
    therapeuticReadinessLabel,
    dominantDimension,
  };
}
