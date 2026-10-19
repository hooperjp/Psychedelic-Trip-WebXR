import React, { useState } from 'react';
import { X, CheckCircle2, RotateCcw, Download } from 'lucide-react';
import {
  ASC_5D_SUBSCALES,
  AscScoreMap,
  evaluate5DASC,
} from '../utils/psychedelicLogic';

export interface AscAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionSeconds: number;
  meanDmnSuppression: number;
  meanEntropicIndex: number;
  scores: AscScoreMap;
  onChangeScore: (id: keyof AscScoreMap, value: number) => void;
  onResetScores: () => void;
}

export const AscAssessmentModal: React.FC<AscAssessmentModalProps> = ({
  isOpen,
  onClose,
  sessionSeconds,
  meanDmnSuppression,
  meanEntropicIndex,
  scores,
  onChangeScore,
  onResetScores,
}) => {
  const [activeView, setActiveView] = useState<'scale' | 'research'>('scale');
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const summary = evaluate5DASC(scores);

  const handleExportReport = () => {
    const payload = {
      timestamp: new Date().toISOString(),
      protocol: 'NeuroDelic XR — 8-Scene Adaptive VRP Protocol',
      sessionDurationSeconds: Math.round(sessionSeconds),
      neuroTelemetry: {
        dmnSuppressionIndex: meanDmnSuppression,
        entropicBrainIndex: meanEntropicIndex,
      },
      asc5dScores: scores,
      evaluation: summary,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vrp-5d-asc-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-labelledby="asc-modal-title"
    >
      <div className="w-full max-w-4xl max-h-[88vh] flex flex-col bg-[#0B0E17] border border-slate-800 rounded-lg shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#07090E]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span>Psychometric Telemetry</span>
              <span aria-hidden="true">·</span>
              <span>Matthews, Greco, Rastelli &amp; Bassir Nia (2025)</span>
            </div>
            <h2
              id="asc-modal-title"
              className="text-xl font-display font-semibold tracking-tight text-slate-100 mt-0.5"
            >
              5-Dimensional Altered States of Consciousness (5D-ASC) &amp; Clinical VRP Brief
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center p-1 bg-[#111827] border border-slate-800 rounded-md">
              <button
                type="button"
                onClick={() => setActiveView('scale')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  activeView === 'scale'
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                5D-ASC Assessment
              </button>
              <button
                type="button"
                onClick={() => setActiveView('research')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  activeView === 'research'
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                PAT &amp; AUD Clinical Framework
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close 5D-ASC Assessment Modal"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeView === 'scale' ? (
            <>
              {/* Top Summary Metrics Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-[#111827] border border-slate-800 rounded-md">
                  <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Composite 5D-ASC Score
                  </div>
                  <div className="mt-1 flex items-baseline">
                    <span className="text-3xl font-mono font-bold text-cyan-400 tabular-nums">
                      {summary.compositeScore}
                    </span>
                    <span className="text-xs font-mono text-slate-400 ml-1.5">
                      / 100 (Study M = {summary.studyCompositeMean})
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {summary.therapeuticReadinessLabel}
                  </div>
                </div>

                <div className="p-4 bg-[#111827] border border-slate-800 rounded-md">
                  <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Cognitive Flexibility Gain
                  </div>
                  <div className="mt-1 flex items-baseline">
                    <span className="text-3xl font-mono font-bold text-amber-400 tabular-nums">
                      +{summary.cognitiveFlexibilityEstimate}
                    </span>
                    <span className="text-xs font-mono text-slate-400 ml-1.5">% est.</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Rastelli et al. (2022) VRP index
                  </div>
                </div>

                <div className="p-4 bg-[#111827] border border-slate-800 rounded-md">
                  <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    DMN Attenuation Index
                  </div>
                  <div className="mt-1 flex items-baseline">
                    <span className="text-3xl font-mono font-bold text-slate-100 tabular-nums">
                      {meanDmnSuppression}
                    </span>
                    <span className="text-xs font-mono text-slate-400 ml-1.5">% suppressed</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Posterior alpha desynchronization
                  </div>
                </div>

                <div className="p-4 bg-[#111827] border border-slate-800 rounded-md">
                  <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Dominant Dimension
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-100 leading-snug">
                    {summary.dominantDimension}
                  </div>
                  <div className="mt-1 text-xs font-mono text-slate-400 tabular-nums">
                    Exposure: {Math.round(sessionSeconds)} s
                  </div>
                </div>
              </div>

              {/* Interactive Subscale Scrubbers & Benchmark Comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-sm font-semibold text-slate-200">
                      01. Rate Subjective Phenomenology (0 = Normal, 100 = Profound)
                    </h3>
                    <button
                      type="button"
                      onClick={onResetScores}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded transition-colors whitespace-nowrap shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset to Study Mean</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {ASC_5D_SUBSCALES.map((item) => {
                      const val = scores[item.id];
                      return (
                        <div
                          key={item.id}
                          className="p-3.5 bg-[#111827] border border-slate-800 rounded-md space-y-2"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <label
                                htmlFor={`asc-slider-${item.id}`}
                                className="text-sm font-medium text-slate-100 block"
                              >
                                {item.label}
                              </label>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {item.description}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-lg font-mono font-bold text-cyan-400 tabular-nums">
                                {val}
                              </span>
                              <span className="text-xs font-mono text-slate-500 ml-1">
                                / 100
                              </span>
                            </div>
                          </div>

                          <input
                            id={`asc-slider-${item.id}`}
                            type="range"
                            min={0}
                            max={100}
                            value={val}
                            onChange={(e) =>
                              onChangeScore(item.id, Number(e.target.value))
                            }
                            className="w-full scrubber"
                          />

                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                            <span>
                              VR-BCI Study Mean: {item.studyMean} (±{item.studySd} SD)
                            </span>
                            <span>
                              Psilocybin Reference: {item.psilocybinBenchmark}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Column: Empirical Comparison Chart (Figure 6 reproduction) */}
                <div className="lg:col-span-5 p-5 bg-[#111827] border border-slate-800 rounded-md space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">
                      02. Empirical Benchmark Comparison (Figure 6)
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Compares your current session ratings against the VR-BCI Digital Psychedelics cohort (N=6) and 20mg Psilocybin trials.
                    </p>
                  </div>

                  <div className="space-y-4 pt-2">
                    {ASC_5D_SUBSCALES.map((item) => {
                      const userVal = scores[item.id];
                      return (
                        <div key={item.id} className="space-y-1.5">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-slate-200 font-medium">
                              {item.label}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                              You: {userVal} · VR Study: {item.studyMean} · Psilocybin: {item.psilocybinBenchmark}
                            </span>
                          </div>

                          {/* 3-Bar Precision Comparison Track */}
                          <div className="space-y-1">
                            {/* User bar */}
                            <div className="w-full h-2 bg-slate-900 rounded-sm overflow-hidden">
                              <div
                                className="h-full bg-cyan-400 transition-all duration-150"
                                style={{ width: `${userVal}%` }}
                              />
                            </div>
                            {/* Study Mean bar */}
                            <div className="w-full h-1.5 bg-slate-900 rounded-sm overflow-hidden">
                              <div
                                className="h-full bg-amber-500/85"
                                style={{ width: `${item.studyMean}%` }}
                              />
                            </div>
                            {/* Psilocybin Benchmark bar */}
                            <div className="w-full h-1.5 bg-slate-900 rounded-sm overflow-hidden">
                              <div
                                className="h-full bg-slate-500"
                                style={{ width: `${item.psilocybinBenchmark}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-cyan-400 inline-block" />
                      Current Session
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-amber-500 inline-block" />
                      VR-BCI Study Mean
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-slate-500 inline-block" />
                      Psilocybin (20mg)
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Research & Clinical Translation View */
            <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#111827] border border-slate-800 rounded-md space-y-2">
                  <div className="text-xs font-mono text-cyan-400">
                    01. Biologically Plausible Visual Cortex Simulation
                  </div>
                  <h3 className="text-base font-semibold text-slate-100">
                    DeepDream DCNN Inversion &amp; Spatiotemporal Style Transfer
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Deep convolutional neural networks (DCNNs) parallel the hierarchical feature detection of the mammalian visual cortex (Mordvintsev et al., 2015; Suzuki et al., 2017). Clamping gradient ascent at lower layers produces geometric Klüver form constants and diffraction gratings, while clamping at deeper layers projects complex object/pareidolia hallucinations. Exposure increases gamma-band functional connectivity and global cortical entropy comparable to psilocybin (Greco et al., 2021).
                  </p>
                </div>

                <div className="p-4 bg-[#111827] border border-slate-800 rounded-md space-y-2">
                  <div className="text-xs font-mono text-amber-400">
                    02. Implicit Surface Raymarching &amp; Audio-BCI Coupling
                  </div>
                  <h3 className="text-base font-semibold text-slate-100">
                    Sphere-Traced CSG/IFS Fractals &amp; DMN Suppression
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Constructive Solid Geometry (CSG) primitives blended with Inigo Quilez smooth minimum operators (smin) and Iterated Function System (IFS) folds generate infinite 3D kaleidoscopic geometries. Real-time frequency analysis maps Theta (4–7 Hz) to style-transfer interpolation, Alpha (8–12 Hz) to temporal pacing and Default Mode Network (DMN) habituation tracking, Beta (20–30 Hz) to fractal fold complexity, and Gamma (&gt;30 Hz) to entropic layer clamping.
                  </p>
                </div>
              </div>

              <div className="p-5 bg-[#111827] border border-slate-800 rounded-md space-y-4">
                <h3 className="text-base font-semibold text-slate-100">
                  Four Clinical Applications of VRP in Psychedelic-Assisted Therapy (PAT) for Alcohol Use Disorder
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 bg-[#0B0E17] border border-slate-800/80 rounded space-y-1">
                    <div className="font-semibold text-slate-200">
                      1. Pre-Dosing Preparation &amp; Anxiety Attenuation
                    </div>
                    <p className="text-slate-400">
                      Allows psychedelic-naïve patients with AUD to preview altered perceptual phenomenology safely before pharmacotherapy. Unlike 5-HT2A agonists, VR simulation can be paused or modulated immediately at will.
                    </p>
                  </div>
                  <div className="p-3.5 bg-[#0B0E17] border border-slate-800/80 rounded space-y-1">
                    <div className="font-semibold text-slate-200">
                      2. Extending &amp; Enhancing Therapeutic Efficacy
                    </div>
                    <p className="text-slate-400">
                      Because PAT efficacy can attenuate between 6 weeks and 9 months, brief clinic or home WebXR sessions may re-evoke cognitive flexibility (Rastelli et al., 2022) and forestall relapse during high-risk windows.
                    </p>
                  </div>
                  <div className="p-3.5 bg-[#0B0E17] border border-slate-800/80 rounded space-y-1">
                    <div className="font-semibold text-slate-200">
                      3. Post-Dosing Psychotherapeutic Integration
                    </div>
                    <p className="text-slate-400">
                      Stimulates recall of ineffable mystical or emotionally salient episodes from dosing sessions, helping patients articulate and integrate insights during follow-up psychotherapy.
                    </p>
                  </div>
                  <div className="p-3.5 bg-[#0B0E17] border border-slate-800/80 rounded space-y-1">
                    <div className="font-semibold text-slate-200">
                      4. Standardizing Set, Setting &amp; Clinical Blinding
                    </div>
                    <p className="text-slate-400">
                      Provides standardized sensory environments across clinical trial sites and offers a credible perceptual active placebo to address the 94% unblinding rate in randomized PAT trials (Bogenschutz et al., 2022).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-[#07090E]">
          <div className="text-xs text-slate-400">
            {savedNotice ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Session telemetry and 5D-ASC JSON exported.
              </span>
            ) : (
              <span>
                Note: Virtual reality simulations may induce transient motion sensitivity; exit VR mode at any time if needed.
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportReport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Export Session JSON
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              Return to Simulation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
