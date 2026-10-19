import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Mic,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  SkipForward,
  Sliders,
  Compass,
  Waves,
  ClipboardCheck,
  Glasses,
} from 'lucide-react';
import {
  RESEARCH_SCENES,
  NeuroAudioBands,
  CoupledVisualUniforms,
  AscScoreMap,
  evaluateAdaptiveSceneTransition,
} from './utils/psychedelicLogic';
import { PsychedelicAudioEngine, AudioSourceMode } from './audio/AudioEngine';
import { PsychedelicSceneCanvas } from './components/PsychedelicSceneCanvas';
import { AscAssessmentModal } from './components/AscAssessmentModal';

type DockTab = 'protocol' | 'audio' | 'optics';

const INITIAL_ASC_SCORES: AscScoreMap = {
  blissfulState: 64,
  changedMeanings: 58,
  spiritualExperience: 34,
  elementaryImagery: 46,
  synaesthesia: 49,
};

export default function App() {
  // Audio Engine singleton ref
  const audioEngineRef = useRef<PsychedelicAudioEngine | null>(null);
  if (!audioEngineRef.current) {
    audioEngineRef.current = new PsychedelicAudioEngine();
  }

  // Scene & Protocol State
  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(2); // Start on SCN-03 (Spatiotemporal Style Transfer Portal) for immediate visual impact
  const activeScene = RESEARCH_SCENES[activeSceneIndex];

  const [autoAdvanceDmn, setAutoAdvanceDmn] = useState<boolean>(true);
  const [baselineAlphaThreshold, setBaselineAlphaThreshold] = useState<number>(0.42);
  const [sceneElapsedSeconds, setSceneElapsedSeconds] = useState<number>(0);
  const [totalSessionSeconds, setTotalSessionSeconds] = useState<number>(0);

  // Audio State
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [audioMode, setAudioMode] = useState<AudioSourceMode>('binaural_drone');
  const [volume, setVolume] = useState<number>(0.65);
  const [audioSensitivity, setAudioSensitivity] = useState<number>(1.25);
  const [micError, setMicError] = useState<string | null>(null);

  // Optics & Shader Parameter Overrides
  const [stereoSbsMode, setStereoSbsMode] = useState<boolean>(false);
  const [webXrSupported, setWebXrSupported] = useState<boolean>(false);
  const [distortionIntensity, setDistortionIntensity] = useState<number>(1.15);
  const [fractalComplexityBias, setFractalComplexityBias] = useState<number>(1.05);
  const [kaleidoscopeOverride, setKaleidoscopeOverride] = useState<number | null>(null);
  const [csgSmoothOverride, setCsgSmoothOverride] = useState<number | null>(null);
  const [deepDreamLayerOverride, setDeepDreamLayerOverride] = useState<number | null>(null);
  const [cameraFov, setCameraFov] = useState<number>(75);

  // UI Dock & Modal State
  const [activeDockTab, setActiveDockTab] = useState<DockTab>('protocol');
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [isAscModalOpen, setIsAscModalOpen] = useState<boolean>(false);
  const [ascScores, setAscScores] = useState<AscScoreMap>(INITIAL_ASC_SCORES);

  // Real-time Telemetry State (updated at ~8Hz from WebGL loop)
  const [telemetryBands, setTelemetryBands] = useState<NeuroAudioBands>({
    theta: 0.28,
    alpha: 0.24,
    beta: 0.31,
    gamma: 0.26,
    rms: 0.27,
    spectralEntropy: 0.64,
    dmnSuppression: 68,
    entropicIndex: 72,
  });

  const [coupledUniforms, setCoupledUniforms] = useState<CoupledVisualUniforms>({
    fractalImmersion: activeScene.fractalImmersionBase,
    styleTransferMix: activeScene.styleTransferBase,
    deepDreamClamping: activeScene.deepDreamLayerBase,
    ifsFoldComplexity: 0.85,
    csgSmoothK: activeScene.csgSmoothK,
    temporalFlowSpeed: 1.1,
    kaleidoscopeSymmetry: activeScene.kaleidoscopeFolds,
  });

  const [spectrumBars, setSpectrumBars] = useState<number[]>(() =>
    Array.from({ length: 24 }, (_, i) => Math.round(35 + 25 * Math.sin(i * 0.4)))
  );

  const xrSessionTriggerRef = useRef<(() => Promise<void>) | null>(null);
  const resetCameraTriggerRef = useRef<(() => void) | null>(null);

  // Keyboard shortcut 'H' to collapse/expand bottom dock
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.code === 'KeyH') {
        setIsDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // 1-second protocol timer for adaptive DMN / Alpha threshold scene transitions (Section 3.3 of paper)
  useEffect(() => {
    const timer = window.setInterval(() => {
      setTotalSessionSeconds((t) => t + 1);
      setSceneElapsedSeconds((prevElapsed) => {
        const nextElapsed = prevElapsed + 1;
        const decision = evaluateAdaptiveSceneTransition({
          currentSceneId: activeScene.id,
          sceneElapsedSeconds: nextElapsed,
          currentAlphaHabituation: telemetryBands.alpha,
          baselineAlphaThreshold,
          autoAdvanceEnabled: autoAdvanceDmn,
          minSceneDuration: 30,
          maxSceneDuration: 60,
        });
        if (decision.shouldTransition) {
          setActiveSceneIndex(decision.nextSceneId - 1);
          return 0;
        }
        return nextElapsed;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeScene.id, autoAdvanceDmn, baselineAlphaThreshold, telemetryBands.alpha]);

  const handleSelectScene = (index: number) => {
    setActiveSceneIndex(index);
    setSceneElapsedSeconds(0);
  };

  const handleNextScene = () => {
    setActiveSceneIndex((prev) => (prev + 1) % RESEARCH_SCENES.length);
    setSceneElapsedSeconds(0);
  };

  const handleToggleAudio = async () => {
    const engine = audioEngineRef.current;
    if (!engine) return;
    if (isAudioPlaying) {
      engine.stop();
      setIsAudioPlaying(false);
    } else {
      await engine.start(audioMode);
      setIsAudioPlaying(true);
      setMicError(engine.getMicError());
    }
  };

  const handleSelectAudioMode = async (mode: AudioSourceMode) => {
    setAudioMode(mode);
    const engine = audioEngineRef.current;
    if (!engine) return;
    await engine.start(mode);
    setIsAudioPlaying(true);
    setMicError(engine.getMicError());
  };

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    audioEngineRef.current?.setVolume(val);
  };

  const handleSensitivityChange = (val: number) => {
    setAudioSensitivity(val);
    audioEngineRef.current?.setSensitivity(val);
  };

  const handleEnterVrAction = async () => {
    // Ensure audio entrainment is active when entering VR
    if (!isAudioPlaying && audioEngineRef.current) {
      await audioEngineRef.current.start(audioMode);
      setIsAudioPlaying(true);
    }
    if (webXrSupported && xrSessionTriggerRef.current) {
      await xrSessionTriggerRef.current();
    } else {
      setStereoSbsMode((prev) => !prev);
    }
  };

  const handleTelemetryUpdate = useCallback(
    (
      bands: NeuroAudioBands,
      uniforms: CoupledVisualUniforms,
      spectrum: number[]
    ) => {
      setTelemetryBands(bands);
      setCoupledUniforms(uniforms);
      setSpectrumBars(spectrum);
    },
    []
  );

  const handleUpdateAscScore = (id: keyof AscScoreMap, val: number) => {
    setAscScores((prev) => ({ ...prev, [id]: val }));
  };

  const handleResetAscScores = () => {
    setAscScores(INITIAL_ASC_SCORES);
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-[#07090E] text-slate-100 select-none"
      data-state={stereoSbsMode ? 'stereo-vr' : 'standard-3d'}
      data-scene={activeScene.code}
    >
      {/* 1. Full-Viewport 3D / WebXR Sphere-Traced Fractal & DeepDream Canvas */}
      <PsychedelicSceneCanvas
        activeScene={activeScene}
        audioEngine={audioEngineRef.current}
        stereoSbsMode={stereoSbsMode}
        distortionIntensity={distortionIntensity}
        fractalComplexityBias={fractalComplexityBias}
        kaleidoscopeOverride={kaleidoscopeOverride}
        csgSmoothOverride={csgSmoothOverride}
        deepDreamLayerOverride={deepDreamLayerOverride}
        cameraFov={cameraFov}
        onTelemetryUpdate={handleTelemetryUpdate}
        onWebXRSupportedChange={setWebXrSupported}
        xrSessionTriggerRef={xrSessionTriggerRef}
        resetCameraTriggerRef={resetCameraTriggerRef}
      />

      {/* Stereoscopic Side-by-Side (SBS) Center Optical Divider */}
      {stereoSbsMode && (
        <div
          aria-hidden="true"
          className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-cyan-500/40 z-10 pointer-events-none"
        />
      )}

      {/* 2. Top Navigation Bar (Strict 3-Zone Contract) */}
      <header className="relative z-20 flex items-center justify-between gap-8 px-6 py-3 bg-[#07090E]/92 border-b border-slate-800/90">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            resetCameraTriggerRef.current?.();
          }}
          className="text-lg font-display font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
        >
          NeuroDelic XR
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav
          aria-label="Primary Simulation Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300"
        >
          <button
            type="button"
            onClick={() => {
              setActiveDockTab('protocol');
              setIsDockCollapsed(false);
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activeDockTab === 'protocol' && !isDockCollapsed
                ? 'text-cyan-400 underline underline-offset-4'
                : ''
            }`}
          >
            Protocol Scenes
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveDockTab('audio');
              setIsDockCollapsed(false);
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activeDockTab === 'audio' && !isDockCollapsed
                ? 'text-cyan-400 underline underline-offset-4'
                : ''
            }`}
          >
            Audio Matrix
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveDockTab('optics');
              setIsDockCollapsed(false);
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              activeDockTab === 'optics' && !isDockCollapsed
                ? 'text-cyan-400 underline underline-offset-4'
                : ''
            }`}
          >
            WebXR &amp; Optics
          </button>
          <button
            type="button"
            onClick={() => setIsAscModalOpen(true)}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            5D-ASC Scale
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleEnterVrAction}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            {stereoSbsMode
              ? 'Exit Stereo VR'
              : webXrSupported
              ? 'Launch WebXR Headset'
              : 'Enter Stereo VR Mode'}
          </button>
        </div>
      </header>

      {/* 3. Unified Collapsible Bottom Control Dock (Zero Central Viewport Occlusion) */}
      <main
        aria-label="Simulation Controls and Neuro-Acoustic Telemetry"
        className="fixed bottom-3 left-1/2 -translate-x-1/2 z-20 w-[95vw] max-w-[980px] transition-transform duration-200 ease-out"
      >
        {/* Top Drawer Collapse / Expand Handle + Quick Audio & 5D-ASC Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5 px-1">
          <div className="flex items-center gap-2 bg-[#0B0E17]/95 border border-slate-800 px-3 py-1 rounded-md text-xs font-mono text-slate-300 whitespace-nowrap overflow-hidden">
            <span className="text-cyan-400 font-semibold shrink-0">{activeScene.code}</span>
            <span aria-hidden="true" className="shrink-0">·</span>
            <span className="font-sans font-medium text-slate-100 truncate">
              {activeScene.title}
            </span>
            <span aria-hidden="true" className="hidden sm:inline shrink-0">
              ·
            </span>
            <span className="hidden sm:inline text-slate-400 shrink-0">
              DMN Suppressed: {telemetryBands.dmnSuppression}%
            </span>
            <span aria-hidden="true" className="hidden md:inline shrink-0">
              ·
            </span>
            <span className="hidden md:inline text-amber-400 shrink-0">
              Entropy: {telemetryBands.entropicIndex}
            </span>
          </div>

          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={handleToggleAudio}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                isAudioPlaying
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30'
                  : 'bg-[#0B0E17]/95 border-slate-800 text-slate-200 hover:text-white hover:border-slate-700'
              }`}
            >
              {isAudioPlaying ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Audio Active</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Start Audio Entrainment</span>
                  <span className="sm:hidden">Start Audio</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsAscModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-xs font-medium bg-[#0B0E17]/95 border border-slate-800 text-slate-200 hover:text-white hover:border-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">5D-ASC Assessment</span>
              <span className="sm:hidden">5D-ASC</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDockCollapsed((prev) => !prev)}
              aria-expanded={!isDockCollapsed}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 text-xs font-medium bg-[#0B0E17]/95 border border-slate-800 text-slate-300 hover:text-white rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              {isDockCollapsed ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Show Controls</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Hide Controls</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Dock Panel */}
        {!isDockCollapsed && (
          <div className="bg-[#0B0E17]/96 border border-slate-800 rounded-lg shadow-2xl p-3.5 sm:p-4 space-y-3.5">
            {/* Top Row inside Dock: Segmented Mode Tabs + Live 4-Band Neuro-Acoustic Readout */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-800/90">
              {/* Functional Tab Switcher */}
              <div
                role="tablist"
                aria-label="Simulation Control Categories"
                className="grid grid-cols-3 sm:flex items-center gap-1 p-1 w-full sm:w-auto bg-[#07090E] border border-slate-800/80 rounded-md"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeDockTab === 'protocol'}
                  onClick={() => setActiveDockTab('protocol')}
                  className={`inline-flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    activeDockTab === 'protocol'
                      ? 'bg-cyan-500 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">01. Protocol Scenes (1–8)</span>
                  <span className="sm:hidden">01. Scenes</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeDockTab === 'audio'}
                  onClick={() => setActiveDockTab('audio')}
                  className={`inline-flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    activeDockTab === 'audio'
                      ? 'bg-cyan-500 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Waves className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">02. Audio &amp; Frequency Matrix</span>
                  <span className="sm:hidden">02. Audio</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeDockTab === 'optics'}
                  onClick={() => setActiveDockTab('optics')}
                  className={`inline-flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    activeDockTab === 'optics'
                      ? 'bg-cyan-500 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">03. SDF Fractals &amp; Optics</span>
                  <span className="sm:hidden">03. Optics</span>
                </button>
              </div>

              {/* Real-Time Frequency Band Telemetry Strip */}
              <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
                <div>
                  <span className="text-slate-400">THETA (Style): </span>
                  <span className="text-cyan-400 font-semibold">
                    {Math.round(telemetryBands.theta * 100)}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">ALPHA (Flow): </span>
                  <span className="text-emerald-400 font-semibold">
                    {Math.round(telemetryBands.alpha * 100)}%
                  </span>
                </div>
                <div className="hidden sm:block">
                  <span className="text-slate-400">BETA (IFS): </span>
                  <span className="text-amber-400 font-semibold">
                    {Math.round(telemetryBands.beta * 100)}%
                  </span>
                </div>
                <div className="hidden md:block">
                  <span className="text-slate-400">GAMMA (DeepDream): </span>
                  <span className="text-rose-400 font-semibold">
                    {Math.round(telemetryBands.gamma * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Tab 1: 8-Scene Research Protocol & Adaptive DMN Pacing */}
            {activeDockTab === 'protocol' && (
              <div className="space-y-3">
                {/* 8 Scene Selector Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
                  {RESEARCH_SCENES.map((scene, idx) => {
                    const isSelected = idx === activeSceneIndex;
                    return (
                      <button
                        key={scene.id}
                        type="button"
                        onClick={() => handleSelectScene(idx)}
                        className={`flex flex-col items-start p-2 rounded border text-left transition-colors ${
                          isSelected
                            ? 'bg-cyan-500/15 border-cyan-400 text-white'
                            : 'bg-[#111827] border-slate-800/90 text-slate-300 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full text-[11px] font-mono">
                          <span className={isSelected ? 'text-cyan-300 font-semibold' : 'text-slate-400'}>
                            {scene.code}
                          </span>
                          <span className="text-slate-400">
                            {Math.round(scene.fractalImmersionBase * 100)}%
                          </span>
                        </div>
                        <div className="text-xs font-medium leading-tight mt-1 line-clamp-1">
                          {scene.title}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Scene Context & Adaptive BCI/Alpha Transition Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1 text-xs">
                  <div className="space-y-0.5 max-w-xl">
                    <div className="flex items-center gap-2 font-mono text-slate-400">
                      <span className="text-slate-200 font-semibold">{activeScene.phase}</span>
                      <span aria-hidden="true">·</span>
                      <span>{activeScene.subtitle}</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed line-clamp-2">
                      {activeScene.description}
                    </p>
                  </div>

                  {/* Adaptive DMN Transition Controls (Section 3.3 of Study) */}
                  <div className="flex flex-wrap items-center gap-3 shrink-0 bg-[#111827] border border-slate-800 px-3 py-2 rounded-md">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoAdvanceDmn}
                        onChange={(e) => setAutoAdvanceDmn(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
                      />
                      <span className="text-slate-200 font-medium whitespace-nowrap">
                        Adaptive DMN Pacing (30–60s)
                      </span>
                    </label>

                    <span className="font-mono text-slate-400 tabular-nums">
                      T+{sceneElapsedSeconds}s / 60s
                    </span>

                    <button
                      type="button"
                      onClick={handleNextScene}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 rounded transition-colors whitespace-nowrap shrink-0"
                    >
                      <span>Next Scene</span>
                      <SkipForward className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Audio & Real-Time Frequency Coupling Matrix */}
            {activeDockTab === 'audio' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                {/* Audio Source Preset Selector */}
                <div className="lg:col-span-5 space-y-2">
                  <div className="text-xs font-mono text-slate-400">
                    Acoustic Entrainment Source (Web Audio FFT)
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectAudioMode('binaural_drone')}
                      className={`px-3 py-2 text-xs font-medium rounded border text-left transition-colors whitespace-nowrap truncate ${
                        audioMode === 'binaural_drone' && isAudioPlaying
                          ? 'bg-cyan-500/20 border-cyan-400 text-white'
                          : 'bg-[#111827] border-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      Entropic Binaural Drone
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectAudioMode('harmonic_bowls')}
                      className={`px-3 py-2 text-xs font-medium rounded border text-left transition-colors whitespace-nowrap truncate ${
                        audioMode === 'harmonic_bowls' && isAudioPlaying
                          ? 'bg-cyan-500/20 border-cyan-400 text-white'
                          : 'bg-[#111827] border-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      Harmonic Singing Bowls
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectAudioMode('cyberdelic_arp')}
                      className={`px-3 py-2 text-xs font-medium rounded border text-left transition-colors whitespace-nowrap truncate ${
                        audioMode === 'cyberdelic_arp' && isAudioPlaying
                          ? 'bg-cyan-500/20 border-cyan-400 text-white'
                          : 'bg-[#111827] border-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      Cyberdelic Neuro-Synth
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectAudioMode('microphone')}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded border text-left transition-colors whitespace-nowrap truncate ${
                        audioMode === 'microphone' && isAudioPlaying
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                          : 'bg-[#111827] border-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5 shrink-0" />
                      <span>Live Room Microphone</span>
                    </button>
                  </div>
                  {micError && (
                    <p className="text-[11px] text-amber-400">
                      Mic notice: {micError} (Using harmonic synthesizer fallback)
                    </p>
                  )}
                </div>

                {/* Live 24-Band FFT Spectrum Visualizer */}
                <div className="lg:col-span-4 bg-[#07090E] border border-slate-800 rounded-md p-3">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
                    <span>REAL-TIME FFT SPECTRUM</span>
                    <span className="tabular-nums">
                      RMS: {Math.round(telemetryBands.rms * 100)}% · H: {telemetryBands.spectralEntropy.toFixed(2)}
                    </span>
                  </div>
                  <div
                    className="flex items-end justify-between gap-1 h-12"
                    aria-label="Real-time audio frequency spectrum bars"
                  >
                    {spectrumBars.map((barVal, idx) => {
                      const barColor =
                        idx < 5
                          ? 'bg-cyan-400'
                          : idx < 11
                          ? 'bg-emerald-400'
                          : idx < 18
                          ? 'bg-amber-400'
                          : 'bg-rose-400';
                      return (
                        <div
                          key={idx}
                          className="flex-1 h-full bg-slate-900 rounded-xs flex items-end overflow-hidden"
                        >
                          <div
                            className={`w-full transition-all duration-100 ${barColor}`}
                            style={{ height: `${Math.max(8, barVal)}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Gain, FFT Sensitivity & Alpha Threshold Sliders */}
                <div className="lg:col-span-3 space-y-2.5 text-xs">
                  <div>
                    <div className="flex justify-between font-mono text-slate-300 mb-1">
                      <label htmlFor="audio-gain-slider">Master Gain</label>
                      <span>{Math.round(volume * 100)}%</span>
                    </div>
                    <input
                      id="audio-gain-slider"
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={volume}
                      onChange={(e) => handleVolumeChange(Number(e.target.value))}
                      className="w-full scrubber"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-mono text-slate-300 mb-1">
                      <label htmlFor="fft-sensitivity-slider">FFT Reactivity</label>
                      <span>{audioSensitivity.toFixed(2)}x</span>
                    </div>
                    <input
                      id="fft-sensitivity-slider"
                      type="range"
                      min={0.5}
                      max={2.5}
                      step={0.05}
                      value={audioSensitivity}
                      onChange={(e) => handleSensitivityChange(Number(e.target.value))}
                      className="w-full scrubber"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: SDF Fractals, DeepDream Clamping & WebXR Optics */}
            {activeDockTab === 'optics' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-center text-xs">
                <div>
                  <div className="flex justify-between font-mono text-slate-300 mb-1">
                    <label htmlFor="distortion-gain-slider">Distortion Gain</label>
                    <span>{Math.round(distortionIntensity * 100)}%</span>
                  </div>
                  <input
                    id="distortion-gain-slider"
                    type="range"
                    min={0.2}
                    max={2.0}
                    step={0.05}
                    value={distortionIntensity}
                    onChange={(e) => setDistortionIntensity(Number(e.target.value))}
                    className="w-full scrubber"
                  />
                  <div className="text-[11px] font-mono text-slate-400 mt-1">
                    Style Mix: {Math.round(coupledUniforms.styleTransferMix * 100)}%
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-mono text-slate-300 mb-1">
                    <label htmlFor="deepdream-layer-slider">DeepDream Layer</label>
                    <span>
                      {deepDreamLayerOverride !== null
                        ? `${Math.round(deepDreamLayerOverride * 100)}%`
                        : `Auto (${Math.round(coupledUniforms.deepDreamClamping * 100)}%)`}
                    </span>
                  </div>
                  <input
                    id="deepdream-layer-slider"
                    type="range"
                    min={0.05}
                    max={1.0}
                    step={0.05}
                    value={deepDreamLayerOverride ?? coupledUniforms.deepDreamClamping}
                    onChange={(e) => setDeepDreamLayerOverride(Number(e.target.value))}
                    className="w-full scrubber"
                  />
                  <div className="text-[11px] font-mono text-slate-400 mt-1">
                    Low=V1 Lattice · High=Pareidolia
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-mono text-slate-300 mb-1">
                    <label htmlFor="csg-smooth-slider">CSG Smooth (smin k)</label>
                    <span>
                      {(csgSmoothOverride ?? coupledUniforms.csgSmoothK).toFixed(2)}
                    </span>
                  </div>
                  <input
                    id="csg-smooth-slider"
                    type="range"
                    min={0.08}
                    max={0.9}
                    step={0.02}
                    value={csgSmoothOverride ?? coupledUniforms.csgSmoothK}
                    onChange={(e) => setCsgSmoothOverride(Number(e.target.value))}
                    className="w-full scrubber"
                  />
                  <div className="text-[11px] font-mono text-slate-400 mt-1">
                    IFS Complexity: {coupledUniforms.ifsFoldComplexity.toFixed(2)}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-mono text-slate-300 mb-1">
                    <label htmlFor="kaleidoscope-folds-slider">Kaleidoscope Folds</label>
                    <span>{coupledUniforms.kaleidoscopeSymmetry}-Fold</span>
                  </div>
                  <input
                    id="kaleidoscope-folds-slider"
                    type="range"
                    min={3}
                    max={16}
                    step={1}
                    value={kaleidoscopeOverride ?? coupledUniforms.kaleidoscopeSymmetry}
                    onChange={(e) => setKaleidoscopeOverride(Number(e.target.value))}
                    className="w-full scrubber"
                  />
                  <div className="text-[11px] font-mono text-slate-400 mt-1">
                    FOV: {cameraFov}°
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => setStereoSbsMode((prev) => !prev)}
                    className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap ${
                      stereoSbsMode
                        ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-semibold'
                        : 'bg-[#111827] border-slate-700 text-slate-200 hover:text-white'
                    }`}
                  >
                    <Glasses className="w-3.5 h-3.5" />
                    <span>{stereoSbsMode ? 'Stereo SBS Active' : 'Stereo HMD Split'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setKaleidoscopeOverride(null);
                      setCsgSmoothOverride(null);
                      setDeepDreamLayerOverride(null);
                      setDistortionIntensity(1.15);
                      setFractalComplexityBias(1.05);
                      setCameraFov(75);
                      resetCameraTriggerRef.current?.();
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors whitespace-nowrap"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Optics &amp; View</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 4. Post-Session 5D-ASC Questionnaire & Research Framework Modal */}
      <AscAssessmentModal
        isOpen={isAscModalOpen}
        onClose={() => setIsAscModalOpen(false)}
        sessionSeconds={totalSessionSeconds}
        meanDmnSuppression={telemetryBands.dmnSuppression}
        meanEntropicIndex={telemetryBands.entropicIndex}
        scores={ascScores}
        onChangeScore={handleUpdateAscScore}
        onResetScores={handleResetAscScores}
      />
    </div>
  );
}
