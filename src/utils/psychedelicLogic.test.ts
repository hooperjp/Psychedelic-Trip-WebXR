import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RESEARCH_SCENES,
  computeAudioBandsFromFFT,
  dampValue,
  evaluateAdaptiveSceneTransition,
  computeShaderUniformTargets,
  evaluate5DASC,
} from './psychedelicLogic.ts';

test('RESEARCH_SCENES defines the complete 8-scene VR protocol from the study', () => {
  assert.equal(RESEARCH_SCENES.length, 8);
  assert.equal(RESEARCH_SCENES[0].phase, 'Grounding Lab');
  assert.equal(RESEARCH_SCENES[1].phase, 'DeepDream & Style Transfer');
  assert.equal(RESEARCH_SCENES[4].phase, 'Sphere-Traced 3D Fractals');
  assert.equal(RESEARCH_SCENES[7].id, 8);
});

test('computeAudioBandsFromFFT extracts normalized Theta, Alpha, Beta, Gamma bands and entropy', () => {
  const bins = new Uint8Array(512);
  // Populate low frequencies (bins 1..15) and high frequencies (bins 60..150)
  for (let i = 1; i < 15; i++) bins[i] = 220;
  for (let i = 60; i < 150; i++) bins[i] = 180;

  const bands = computeAudioBandsFromFFT(bins, 48000, 1.0);
  assert.ok(bands.theta > 0.5, `Expected high theta, got ${bands.theta}`);
  assert.ok(bands.gamma > 0.3, `Expected active gamma, got ${bands.gamma}`);
  assert.ok(bands.spectralEntropy > 0.4, `Expected positive spectral entropy, got ${bands.spectralEntropy}`);
  assert.ok(bands.dmnSuppression >= 5 && bands.dmnSuppression <= 99);
  assert.ok(bands.entropicIndex >= 10 && bands.entropicIndex <= 99);
});

test('dampValue smoothly interpolates toward target value', () => {
  const start = 0;
  const target = 10;
  const step1 = dampValue(start, target, 5, 0.1);
  assert.ok(step1 > 0 && step1 < 10);
  const step2 = dampValue(step1, target, 5, 0.1);
  assert.ok(step2 > step1 && step2 < 10);
});

test('evaluateAdaptiveSceneTransition enforces 30s min and 60s max scene windows per Section 3.3', () => {
  // Under 30s: should not transition even if alpha exceeds threshold
  const early = evaluateAdaptiveSceneTransition({
    currentSceneId: 1,
    sceneElapsedSeconds: 18,
    currentAlphaHabituation: 0.9,
    baselineAlphaThreshold: 0.5,
    autoAdvanceEnabled: true,
  });
  assert.equal(early.shouldTransition, false);

  // Between 30s and 60s with alpha >= threshold: transitions to next scene
  const triggered = evaluateAdaptiveSceneTransition({
    currentSceneId: 3,
    sceneElapsedSeconds: 36,
    currentAlphaHabituation: 0.62,
    baselineAlphaThreshold: 0.55,
    autoAdvanceEnabled: true,
  });
  assert.equal(triggered.shouldTransition, true);
  assert.equal(triggered.nextSceneId, 4);
  assert.equal(triggered.reason, 'alpha_threshold_exceeded');

  // At 60s max duration: wraps from scene 8 to scene 1
  const maxReached = evaluateAdaptiveSceneTransition({
    currentSceneId: 8,
    sceneElapsedSeconds: 60.5,
    currentAlphaHabituation: 0.2,
    baselineAlphaThreshold: 0.8,
    autoAdvanceEnabled: true,
  });
  assert.equal(maxReached.shouldTransition, true);
  assert.equal(maxReached.nextSceneId, 1);
  assert.equal(maxReached.reason, 'max_duration_reached');
});

test('computeShaderUniformTargets couples Theta, Alpha, Beta, Gamma to visual parameters', () => {
  const scene = RESEARCH_SCENES[5]; // Scene 6 Mandelbulb
  const quietBands = computeAudioBandsFromFFT(new Uint8Array(512), 48000, 1.0);
  const activeBins = new Uint8Array(512).fill(210);
  const loudBands = computeAudioBandsFromFFT(activeBins, 48000, 1.0);

  const uQuiet = computeShaderUniformTargets(scene, quietBands, {
    distortionIntensity: 1.0,
    fractalComplexityBias: 1.0,
    kaleidoscopeOverride: null,
    csgSmoothOverride: null,
    deepDreamLayerOverride: null,
  });
  const uLoud = computeShaderUniformTargets(scene, loudBands, {
    distortionIntensity: 1.0,
    fractalComplexityBias: 1.0,
    kaleidoscopeOverride: null,
    csgSmoothOverride: null,
    deepDreamLayerOverride: null,
  });

  assert.ok(uLoud.ifsFoldComplexity > uQuiet.ifsFoldComplexity);
  assert.ok(uLoud.temporalFlowSpeed > uQuiet.temporalFlowSpeed);
  assert.ok(uLoud.styleTransferMix >= uQuiet.styleTransferMix);
});

test('evaluate5DASC computes composite score and clinical classification', () => {
  const summary = evaluate5DASC({
    blissfulState: 78,
    changedMeanings: 72,
    spiritualExperience: 64,
    elementaryImagery: 85,
    synaesthesia: 81,
  });

  assert.equal(summary.compositeScore, 76);
  assert.equal(summary.therapeuticReadinessLabel, 'Profound Mystical-Analogue State');
  assert.equal(summary.dominantDimension, 'Elementary Imagery & Geometric Fractals');
});
