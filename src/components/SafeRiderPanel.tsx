import React, { useEffect, useRef, useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Camera,
  Bike,
  Smartphone,
  Eye,
  Glasses,
  Code,
  ChevronDown,
  ChevronUp,
  Compass,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import type { RiderTelemetry, RiderAssessment, RiderPreset } from '../types';

interface SafeRiderPanelProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isLoading: boolean;
  cameraError: string | null;
  isCameraActive: boolean;
  telemetry: RiderTelemetry;
  assessment: RiderAssessment;
  selectedPreset: RiderPreset;
  setSelectedPreset: (preset: RiderPreset) => void;
  isHelmetBypassed: boolean;
  setIsHelmetBypassed: (bypassed: boolean) => void;
  onRestartCamera: () => void;
  speakWarning?: (msg: string, intervalMs?: number) => void;
  onSafetyAlertResolved?: () => void;
}

export const SafeRiderPanel: React.FC<SafeRiderPanelProps> = ({
  videoRef,
  canvasRef,
  isLoading,
  cameraError,
  isCameraActive,
  telemetry,
  assessment,
  selectedPreset,
  setSelectedPreset,
  isHelmetBypassed,
  setIsHelmetBypassed,
  onRestartCamera,
  speakWarning,
  onSafetyAlertResolved,
}) => {
  type SafeRiderAlertState = 'IDLE' | 'HELMET_ONLY' | 'PHONE_ONLY' | 'BOTH' | 'DROWSINESS' | 'HEAD_SLUMP' | 'HEAD_TILT';
  const currentAlertStateRef = useRef<SafeRiderAlertState>('IDLE');
  const lastSpokenTimeRef = useRef<number>(0);
  const [showDebugDiagnostics, setShowDebugDiagnostics] = useState(false);

  // Discrete audio alert manager for SafeRider violations with fast responsiveness
  useEffect(() => {
    if (!speakWarning) return;
    const now = Date.now();

    const isHelmetViolation =
      !isHelmetBypassed &&
      telemetry.helmetStatus === 'HELMET_NOT_DETECTED' &&
      (selectedPreset !== 'WEBCAM' || telemetry.sustainedViolationSec >= 1.2);

    const isHeadSlumpViolation = Boolean(
      telemetry.isHeadSlumped && telemetry.headSlumpDurationMs >= 350
    );

    const isHeadTiltViolation = Boolean(
      telemetry.isHeadTilted && (telemetry.headTiltDurationMs ?? 0) >= 350
    );

    const isPhoneViolation =
      (telemetry.phoneStatus === 'POSSIBLE_PHONE_DISTRACTION' ||
        telemetry.phoneStatus === 'PHONE_DISTRACTION_WARNING' ||
        telemetry.phoneDistractionRisk === 'HIGH') &&
      (selectedPreset !== 'WEBCAM' || telemetry.phoneDurationSec >= 0.8);

    const isDrowsinessViolation = Boolean(
      telemetry.drowsinessAlertActive && telemetry.eyeMonitoring === 'ACTIVE'
    );

    let nextState: SafeRiderAlertState = 'IDLE';
    if (isDrowsinessViolation) {
      nextState = 'DROWSINESS';
    } else if (isHeadSlumpViolation) {
      nextState = 'HEAD_SLUMP';
    } else if (isHeadTiltViolation) {
      nextState = 'HEAD_TILT';
    } else if (isHelmetViolation && isPhoneViolation) {
      nextState = 'BOTH';
    } else if (isHelmetViolation) {
      nextState = 'HELMET_ONLY';
    } else if (isPhoneViolation) {
      nextState = 'PHONE_ONLY';
    }

    const stateChanged = currentAlertStateRef.current !== nextState;
    // Responsive cooldown (2.5s) for instant alert feel
    const cooldownExpired = now - lastSpokenTimeRef.current > 2500;

    // High Priority Safety Violation Announcements
    if (nextState === 'DROWSINESS') {
      if (stateChanged || cooldownExpired) {
        currentAlertStateRef.current = 'DROWSINESS';
        lastSpokenTimeRef.current = now;
        speakWarning('Warning! Eyes closed detected. Stay alert!', 3000);
      }
      return;
    } else if (nextState === 'HEAD_SLUMP') {
      if (stateChanged || cooldownExpired) {
        currentAlertStateRef.current = 'HEAD_SLUMP';
        lastSpokenTimeRef.current = now;
        speakWarning('Warning! Head down detected. Please sit upright and keep eyes on road.', 3000);
      }
      return;
    } else if (nextState === 'HEAD_TILT') {
      if (stateChanged || cooldownExpired) {
        currentAlertStateRef.current = 'HEAD_TILT';
        lastSpokenTimeRef.current = now;
        speakWarning('Warning! Lateral tilt detected. Keep your posture upright.', 3000);
      }
      return;
    } else if (nextState === 'BOTH') {
      if (stateChanged || cooldownExpired) {
        currentAlertStateRef.current = 'BOTH';
        lastSpokenTimeRef.current = now;
        speakWarning(
          'Warning. Helmet not detected and phone distraction detected. Please stop safely.',
          3500
        );
      }
      return;
    } else if (nextState === 'HELMET_ONLY') {
      if (stateChanged || cooldownExpired) {
        currentAlertStateRef.current = 'HELMET_ONLY';
        lastSpokenTimeRef.current = now;
        speakWarning('Helmet not detected. Please wear a helmet.', 3500);
      }
      return;
    } else if (nextState === 'PHONE_ONLY') {
      if (stateChanged || cooldownExpired) {
        currentAlertStateRef.current = 'PHONE_ONLY';
        lastSpokenTimeRef.current = now;
        speakWarning('Please keep your phone away while riding.', 3500);
      }
      return;
    } else {
      if (currentAlertStateRef.current !== 'IDLE') {
        currentAlertStateRef.current = 'IDLE';
        onSafetyAlertResolved?.();
      }
    }
  }, [
    telemetry.sustainedViolationSec,
    telemetry.helmetStatus,
    telemetry.phoneStatus,
    telemetry.phoneDistractionRisk,
    telemetry.phoneDurationSec,
    telemetry.drowsinessAlertActive,
    telemetry.eyeMonitoring,
    telemetry.isHeadSlumped,
    telemetry.headSlumpDurationMs,
    telemetry.isHeadTilted,
    telemetry.headTiltDurationMs,
    isHelmetBypassed,
    selectedPreset,
    speakWarning,
    onSafetyAlertResolved,
  ]);

  return (
    <div className="space-y-4">
      {/* 1. Executive Top Header */}
      <div className="hud-card p-4 sm:p-5 relative overflow-hidden">
        {/* Subtle Ambient Radial Glow */}
        <div className="pointer-events-none absolute -top-12 -left-12 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -z-0" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-zinc-900/90 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)] shrink-0">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white m-0">
                  SafeRider Vision System
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 tracking-wider uppercase">
                  Two-Wheeler AI
                </span>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800">
                  Multi-Modal Helmet &amp; Visor Pipeline
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 m-0 max-w-3xl leading-relaxed">
                Evidence-based cranial headgear verification + optical visor transmittance &amp; eye-visibility safety gating. Missing eye landmarks are strictly isolated from drowsiness scoring.
              </p>
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
            {/* Helmet Bypass Mode Toggle */}
            <button
              onClick={() => setIsHelmetBypassed(!isHelmetBypassed)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer border shadow-sm ${
                isHelmetBypassed
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/40'
                  : 'bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
              }`}
              title="Toggle Helmet Verification Bypass (Enables testing eye tracking, drowsiness, and head motion without wearing a helmet)"
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${isHelmetBypassed ? 'text-emerald-400' : 'text-zinc-500'}`} />
              <span>{isHelmetBypassed ? 'Helmet Bypass: ON' : 'Helmet Bypass: OFF'}</span>
            </button>

            {selectedPreset === 'WEBCAM' && (
              <button
                onClick={onRestartCamera}
                className="px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-700/80 text-zinc-300 hover:text-white hover:border-zinc-500 hover:bg-zinc-800 transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer shadow-sm"
                title="Restart optical webcam stream"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Reset Camera</span>
              </button>
            )}

            <button
              onClick={() => setShowDebugDiagnostics((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer border shadow-sm ${
                showDebugDiagnostics
                  ? 'bg-zinc-800 text-white border-zinc-600'
                  : 'bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
              }`}
              title="Toggle forensic developer diagnostics"
            >
              <Code className="w-3.5 h-3.5 text-zinc-400" />
              <span>Diagnostics</span>
              {showDebugDiagnostics ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Dedicated Scenario & Simulation Control Shelf (Full Width, Never Cramped) */}
      <div className="hud-card p-3 sm:p-4 space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-300">
              Evaluation Vectors &amp; Live Feeds
            </span>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">
            Deterministic state simulation or real-time webcam optical processing
          </span>
        </div>

        {/* 9 Responsive High-Contrast Scenario Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
          {/* Preset 1: Live Webcam */}
          <button
            onClick={() => setSelectedPreset('WEBCAM')}
            className={`p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between gap-1.5 ${
              selectedPreset === 'WEBCAM'
                ? 'bg-zinc-800/95 border-emerald-500 text-white shadow-[0_0_16px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500/50'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-850/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <Camera className={`w-4 h-4 ${selectedPreset === 'WEBCAM' ? 'text-emerald-400' : 'text-zinc-500'}`} />
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                selectedPreset === 'WEBCAM' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-500'
              }`}>
                Live Feed
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-100">Live Camera</div>
              <div className="text-[10px] text-zinc-400 truncate">Webcam CV Stream</div>
            </div>
          </button>

          {/* Preset 2: Helmet + Clear Eyes */}
          <button
            onClick={() => setSelectedPreset('COMPLIANT_HELMET')}
            className={`p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between gap-1.5 ${
              selectedPreset === 'COMPLIANT_HELMET'
                ? 'bg-zinc-800/95 border-emerald-500 text-white shadow-[0_0_16px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500/50'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-850/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <CheckCircle2 className={`w-4 h-4 ${selectedPreset === 'COMPLIANT_HELMET' ? 'text-emerald-400' : 'text-zinc-500'}`} />
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                selectedPreset === 'COMPLIANT_HELMET' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-500'
              }`}>
                Nominal
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-100">Helmet + Eyes</div>
              <div className="text-[10px] text-zinc-400 truncate">Fully Compliant</div>
            </div>
          </button>

          {/* Preset 3: No Helmet */}
          <button
            onClick={() => setSelectedPreset('NO_HELMET')}
            className={`p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between gap-1.5 ${
              selectedPreset === 'NO_HELMET'
                ? 'bg-zinc-800/95 border-rose-500 text-white shadow-[0_0_16px_rgba(239,68,68,0.3)] ring-1 ring-rose-500/50'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-850/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <AlertTriangle className={`w-4 h-4 ${selectedPreset === 'NO_HELMET' ? 'text-rose-400' : 'text-zinc-500'}`} />
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                selectedPreset === 'NO_HELMET' ? 'bg-rose-500/20 text-rose-300' : 'bg-zinc-800 text-zinc-500'
              }`}>
                Violation
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-100">No Helmet</div>
              <div className="text-[10px] text-zinc-400 truncate">Bare Cranial Head</div>
            </div>
          </button>

          {/* Preset 4: Tinted Visor */}
          <button
            onClick={() => setSelectedPreset('TINTED_VISOR_LIMITED')}
            className={`p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between gap-1.5 ${
              selectedPreset === 'TINTED_VISOR_LIMITED'
                ? 'bg-zinc-800/95 border-amber-500 text-white shadow-[0_0_16px_rgba(245,158,11,0.3)] ring-1 ring-amber-500/50'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-850/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <Glasses className={`w-4 h-4 ${selectedPreset === 'TINTED_VISOR_LIMITED' ? 'text-amber-400' : 'text-zinc-500'}`} />
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                selectedPreset === 'TINTED_VISOR_LIMITED' ? 'bg-amber-500/20 text-amber-300' : 'bg-zinc-800 text-zinc-500'
              }`}>
                Safety Gate
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-100">Tinted Visor</div>
              <div className="text-[10px] text-zinc-400 truncate">Eyes Paused Safely</div>
            </div>
          </button>

          {/* Preset 5: Phone Only */}
          <button
            onClick={() => setSelectedPreset('PHONE_ONLY')}
            className={`p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between gap-1.5 ${
              selectedPreset === 'PHONE_ONLY'
                ? 'bg-zinc-800/95 border-amber-500 text-white shadow-[0_0_16px_rgba(245,158,11,0.3)] ring-1 ring-amber-500/50'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-850/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <Smartphone className={`w-4 h-4 ${selectedPreset === 'PHONE_ONLY' ? 'text-amber-400' : 'text-zinc-500'}`} />
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                selectedPreset === 'PHONE_ONLY' ? 'bg-amber-500/20 text-amber-300' : 'bg-zinc-800 text-zinc-500'
              }`}>
                Distraction
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-100">Phone in Zone</div>
              <div className="text-[10px] text-zinc-400 truncate">Handheld Warning</div>
            </div>
          </button>

          {/* Preset 6: Helmet + Phone */}
          <button
            onClick={() => setSelectedPreset('DISTRACTED_RIDER')}
            className={`p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between gap-1.5 ${
              selectedPreset === 'DISTRACTED_RIDER'
                ? 'bg-zinc-800/95 border-amber-500 text-white shadow-[0_0_16px_rgba(245,158,11,0.3)] ring-1 ring-amber-500/50'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-850/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <AlertTriangle className={`w-4 h-4 ${selectedPreset === 'DISTRACTED_RIDER' ? 'text-amber-400' : 'text-zinc-500'}`} />
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                selectedPreset === 'DISTRACTED_RIDER' ? 'bg-amber-500/20 text-amber-300' : 'bg-zinc-800 text-zinc-500'
              }`}>
                Advisory
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-100">Helmet + Phone</div>
              <div className="text-[10px] text-zinc-400 truncate">Distracted Rider</div>
            </div>
          </button>

          {/* Preset 7: Dual Violation */}
          <button
            onClick={() => setSelectedPreset('BOTH_VIOLATIONS')}
            className={`p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between gap-1.5 ${
              selectedPreset === 'BOTH_VIOLATIONS'
                ? 'bg-zinc-800/95 border-rose-500 text-white shadow-[0_0_16px_rgba(239,68,68,0.3)] ring-1 ring-rose-500/50'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-850/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <ShieldAlert className={`w-4 h-4 ${selectedPreset === 'BOTH_VIOLATIONS' ? 'text-rose-400' : 'text-zinc-500'}`} />
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                selectedPreset === 'BOTH_VIOLATIONS' ? 'bg-rose-500/20 text-rose-300' : 'bg-zinc-800 text-zinc-500'
              }`}>
                Critical
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-100">Dual Violation</div>
              <div className="text-[10px] text-zinc-400 truncate">No Helmet + Phone</div>
            </div>
          </button>

          {/* Preset 8: Lifesaver Look (Shoulder Check) */}
          <button
            onClick={() => setSelectedPreset('SHOULDER_CHECK')}
            className={`p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between gap-1.5 ${
              selectedPreset === 'SHOULDER_CHECK'
                ? 'bg-zinc-800/95 border-emerald-500 text-white shadow-[0_0_16px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500/50'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-850/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <Compass className={`w-4 h-4 ${selectedPreset === 'SHOULDER_CHECK' ? 'text-emerald-400' : 'text-zinc-500'}`} />
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                selectedPreset === 'SHOULDER_CHECK' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-500'
              }`}>
                Lifesaver
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-100">Shoulder Check</div>
              <div className="text-[10px] text-zinc-400 truncate">Yaw -36° Blindspot</div>
            </div>
          </button>

          {/* Preset 9: Head Slump Nod */}
          <button
            onClick={() => setSelectedPreset('HEAD_SLUMP')}
            className={`p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between gap-1.5 ${
              selectedPreset === 'HEAD_SLUMP'
                ? 'bg-zinc-800/95 border-rose-500 text-white shadow-[0_0_16px_rgba(239,68,68,0.3)] ring-1 ring-rose-500/50'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-850/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <AlertTriangle className={`w-4 h-4 ${selectedPreset === 'HEAD_SLUMP' ? 'text-rose-400' : 'text-zinc-500'}`} />
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                selectedPreset === 'HEAD_SLUMP' ? 'bg-rose-500/20 text-rose-300' : 'bg-zinc-800 text-zinc-500'
              }`}>
                Slump Nod
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-100">Head Slump</div>
              <div className="text-[10px] text-zinc-400 truncate">Pitch -24° Nodding</div>
            </div>
          </button>
        </div>
      </div>

      {/* 3. Main Operational Viewport & Telemetry Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Camera Viewport & Stream (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Card Header Label */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Rider Optical Telemetry Feed
            </span>
            <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400">
              <span>{selectedPreset === 'WEBCAM' ? 'Webcam Pipeline · 22 FPS' : 'Deterministic Vector'}</span>
              <span className="text-zinc-600">&bull;</span>
              <span className="text-zinc-500">In-Browser WASM</span>
            </div>
          </div>

          {/* Viewport Frame */}
          <div className="hud-card overflow-hidden shadow-2xl relative hud-brackets border border-zinc-800">
            {/* Top Bar inside Viewport */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#090a0e]/85 border-b border-zinc-800/90">
              <div className="flex items-center gap-2.5">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                  Two-Wheeler Safety Camera
                </span>
                {telemetry.riderDetected ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Rider Locked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Awaiting Target
                  </span>
                )}
              </div>

              <span className="text-[11px] font-mono text-zinc-400">
                {selectedPreset === 'WEBCAM' ? 'MediaPipe FaceMesh + EfficientDet' : 'Synthesized Scenario'}
              </span>
            </div>

            {/* Stable 16:9 Aspect Ratio Viewport */}
            <div className="relative w-full aspect-video bg-black overflow-hidden flex items-center justify-center">
              {/* HTML5 Video for Live Webcam (Mirrored for Natural Selfie UX) */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 ${
                  selectedPreset !== 'WEBCAM' || !isCameraActive || cameraError ? 'hidden' : 'block'
                }`}
              />

              {/* Dynamic Synthetic Backdrop for Demo Presets */}
              {selectedPreset !== 'WEBCAM' && (
                <div className="absolute inset-0 bg-gradient-to-b from-[#090a0e] via-[#12131a] to-[#090a0e] flex flex-col items-center justify-center p-6 text-center select-none">
                  <div
                    className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center mb-3 shadow-2xl transition-all ${
                      telemetry.helmetStatus === 'HELMET_DETECTED'
                        ? 'border-emerald-500/60 bg-emerald-950/40 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
                        : 'border-rose-500/60 bg-rose-950/40 text-rose-400 shadow-[0_0_30px_rgba(239,68,68,0.3)] animate-pulse'
                    }`}
                  >
                    <Bike className="w-10 h-10" />
                  </div>
                  <div className="space-y-1.5 max-w-md">
                    <div
                      className={`text-sm font-black uppercase tracking-wider ${
                        selectedPreset === 'BOTH_VIOLATIONS'
                          ? 'text-rose-400'
                          : selectedPreset === 'TINTED_VISOR_LIMITED'
                          ? 'text-amber-400'
                          : telemetry.helmetStatus === 'HELMET_DETECTED'
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {selectedPreset === 'BOTH_VIOLATIONS'
                        ? 'Critical: Dual Safety Violations'
                        : selectedPreset === 'TINTED_VISOR_LIMITED'
                        ? 'Advisory: Tinted Visor / Limited Eye Visibility'
                        : telemetry.helmetStatus === 'HELMET_DETECTED'
                        ? 'Helmet Verified Compliant'
                        : 'Safety Violation: No Helmet Detected'}
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed m-0">
                      {selectedPreset === 'COMPLIANT_HELMET'
                        ? 'Rider wearing certified helmet with clear visor. Optical eye monitoring active & fully verified.'
                        : selectedPreset === 'NO_HELMET'
                        ? 'Bare cranial surface detected. Protective headgear violation. Eye monitoring unavailable.'
                        : selectedPreset === 'TINTED_VISOR_LIMITED'
                        ? 'Dark/tinted visor restricts eye observation. Eye monitoring safely paused to eliminate false drowsiness alarms.'
                        : selectedPreset === 'PHONE_ONLY'
                        ? 'Helmet compliant; sustained handheld smartphone distraction detected in rider zone.'
                        : selectedPreset === 'DISTRACTED_RIDER'
                        ? 'Helmet verified compliant; rider holding smartphone near ear/head.'
                        : 'Dual safety violation: Bare cranial surface observed and active phone distraction near head.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Canvas Overlay (UNMIRRORED in CSS so all text and badges are razor-sharp and forward-facing!) */}
              <canvas
                ref={canvasRef}
                className={`absolute inset-0 w-full h-full object-cover pointer-events-none z-10 ${
                  selectedPreset !== 'WEBCAM' || !isCameraActive || cameraError ? 'hidden' : 'block'
                }`}
              />

              {/* Floating Camera HUD Pill (Top Right, Clean Glassmorphic, Zero Overlap) */}
              <div className="absolute top-3 right-3 z-20 bg-[#090a0e]/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-zinc-700/80 text-[11px] font-mono shadow-2xl flex items-center gap-3 pointer-events-none flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-bold ${
                      isHelmetBypassed
                        ? 'text-emerald-400'
                        : telemetry.helmetStatus === 'HELMET_DETECTED'
                        ? 'text-emerald-400'
                        : telemetry.helmetStatus === 'HELMET_NOT_DETECTED'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    🪖 HELMET:{' '}
                    {isHelmetBypassed
                      ? 'BYPASS (DEMO)'
                      : telemetry.helmetStatus === 'HELMET_DETECTED'
                      ? 'YES'
                      : telemetry.helmetStatus === 'HELMET_NOT_DETECTED'
                      ? 'NO'
                      : 'UNCERTAIN'}
                  </span>
                </div>

                <span className="text-zinc-600">&bull;</span>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-bold ${
                      telemetry.headMotionState === 'HEAD_SLUMP_NOD' ||
                      telemetry.headMotionState === 'LATERAL_TILT_LEFT' ||
                      telemetry.headMotionState === 'LATERAL_TILT_RIGHT'
                        ? 'text-rose-400 animate-pulse'
                        : telemetry.headMotionState === 'LEFT_SHOULDER_CHECK' ||
                          telemetry.headMotionState === 'RIGHT_SHOULDER_CHECK'
                        ? 'text-emerald-400'
                        : telemetry.headMotionState === 'LATERAL_GLANCE'
                        ? 'text-amber-400'
                        : 'text-zinc-300'
                    }`}
                  >
                    🧭 {telemetry.headMotionState.replace(/_/g, ' ')}
                  </span>
                </div>

                <span className="text-zinc-600">&bull;</span>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-bold ${
                      telemetry.eyeVisibility === 'VISIBLE'
                        ? 'text-emerald-400'
                        : telemetry.eyeVisibility === 'LIMITED'
                        ? 'text-amber-400'
                        : 'text-zinc-400'
                    }`}
                  >
                    👁 EYES: {telemetry.eyeVisibility}
                  </span>
                </div>

                <span className="text-zinc-600">&bull;</span>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-bold ${
                      telemetry.eyeMonitoring === 'ACTIVE'
                        ? 'text-emerald-300'
                        : telemetry.eyeMonitoring === 'LIMITED'
                        ? 'text-amber-300'
                        : 'text-zinc-500'
                    }`}
                  >
                    🔍 GATE:{' '}
                    {telemetry.eyeMonitoring === 'ACTIVE'
                      ? 'ACTIVE'
                      : telemetry.eyeMonitoring === 'LIMITED'
                      ? 'PAUSED'
                      : 'OFF'}
                  </span>
                </div>
              </div>

              {/* Loading State */}
              {isLoading && !isCameraActive && !telemetry.riderDetected && selectedPreset === 'WEBCAM' && !cameraError && (
                <div className="absolute inset-0 bg-[#090a0e]/90 flex flex-col items-center justify-center gap-3 p-6 text-center z-20">
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                  <p className="text-sm font-semibold text-white m-0">Loading SafeRider Vision Pipeline...</p>
                </div>
              )}

              {/* Camera Error Fallback */}
              {cameraError && selectedPreset === 'WEBCAM' && (
                <div className="absolute inset-0 bg-[#090a0e]/95 flex flex-col items-center justify-center gap-3 p-6 text-center z-30">
                  <AlertTriangle className="w-8 h-8 text-rose-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white m-0">Camera Unavailable</h3>
                    <p className="text-xs text-zinc-300 mt-1 mb-3">{cameraError}</p>
                    <button
                      onClick={onRestartCamera}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors cursor-pointer"
                    >
                      Retry Camera
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Collapsible Forensic Developer Diagnostics Drawer */}
          {showDebugDiagnostics && (
            <div className="hud-card p-4 space-y-2.5 font-mono text-xs border border-zinc-700/80 bg-[#090a0e]/95">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5" />
                  Forensic Developer Diagnostics
                </span>
                <span className="text-[10px] text-zinc-500">Live Frame Telemetry</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 rounded bg-zinc-900/90 border border-zinc-800">
                  <span className="text-zinc-500 text-[10px] block">Helmet Conf.</span>
                  <strong className="text-zinc-200">
                    {telemetry.debugDiagnostics ? `${telemetry.debugDiagnostics.helmetConfidence}%` : `${telemetry.helmetConfidence}%`}
                  </strong>
                </div>
                <div className="p-2 rounded bg-zinc-900/90 border border-zinc-800">
                  <span className="text-zinc-500 text-[10px] block">Face / Eye Conf.</span>
                  <strong className="text-zinc-200">
                    {telemetry.debugDiagnostics
                      ? `${telemetry.debugDiagnostics.faceConfidence}% / ${telemetry.debugDiagnostics.eyeVisibilityConfidence}%`
                      : `${telemetry.faceConfidence}% / ${telemetry.eyeConfidence}%`}
                  </strong>
                </div>
                <div className="p-2 rounded bg-zinc-900/90 border border-zinc-800">
                  <span className="text-zinc-500 text-[10px] block">Avg EAR / L-R</span>
                  <strong className="text-zinc-200">
                    {telemetry.debugDiagnostics
                      ? `${telemetry.debugDiagnostics.ear.toFixed(2)} (${telemetry.debugDiagnostics.leftEar.toFixed(2)} / ${telemetry.debugDiagnostics.rightEar.toFixed(2)})`
                      : `${telemetry.ear.toFixed(2)}`}
                  </strong>
                </div>
                <div className="p-2 rounded bg-zinc-900/90 border border-zinc-800">
                  <span className="text-zinc-500 text-[10px] block">Debounce Frames</span>
                  <strong className="text-zinc-200">
                    {telemetry.debugDiagnostics
                      ? `V:${telemetry.debugDiagnostics.consecutiveVisibleFrames} / L:${telemetry.debugDiagnostics.consecutiveLimitedFrames}`
                      : 'Active'}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Executive ADAS Telemetry Deck (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="hud-card p-5 space-y-4 shadow-2xl border border-zinc-800">
            {/* Card Header & Risk Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <Bike className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200 m-0">
                  SafeRider Risk Assessment
                </h2>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  assessment.tier === 'CRITICAL'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                    : assessment.tier === 'HIGH'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                }`}
              >
                {assessment.tier === 'CRITICAL' ? 'CRITICAL RISK' : assessment.tier === 'HIGH' ? 'ELEVATED RISK' : 'LOW RISK'}
              </span>
            </div>

            {/* Score & Confidence Metric Strip */}
            <div className="p-4 rounded-xl bg-[#090a0e]/80 border border-zinc-800/90 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Two-Wheeler Safety Score
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span
                    className={`text-3xl font-black font-mono tracking-tight ${
                      assessment.tier === 'CRITICAL'
                        ? 'text-rose-400'
                        : assessment.tier === 'HIGH'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {assessment.score}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">/ 100 Risk Heuristic</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Model Confidence</div>
                <div className="text-xl font-bold font-mono text-white mt-0.5">
                  {assessment.confidence}%
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">Decoupled Telemetry</div>
              </div>
            </div>

            {/* State Classification Strip (Sleek Glass Strip, Zero Mustard) */}
            <div className="p-3 rounded-xl bg-[#090a0e]/90 border border-zinc-800 flex items-center justify-between gap-2 text-xs">
              <span className="text-zinc-400 font-semibold text-[11px] uppercase tracking-wider shrink-0">
                State:
              </span>
              <span
                className={`font-bold px-2.5 py-1 rounded-lg text-xs font-mono truncate ${
                  isHelmetBypassed
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/35'
                    : telemetry.smartHelmetState === 'HELMET_EYES_VISIBLE' &&
                    (telemetry.phoneStatus === 'PHONE_NOT_DETECTED' ||
                      telemetry.phoneStatus === 'PHONE_DETECTED_INACTIVE')
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/35'
                    : telemetry.smartHelmetState === 'HELMET_EYES_LIMITED' &&
                      (telemetry.phoneStatus === 'PHONE_NOT_DETECTED' ||
                        telemetry.phoneStatus === 'PHONE_DETECTED_INACTIVE')
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/35'
                    : telemetry.helmetStatus === 'HELMET_NOT_DETECTED' &&
                      (telemetry.phoneStatus === 'POSSIBLE_PHONE_DISTRACTION' ||
                        telemetry.phoneStatus === 'PHONE_DISTRACTION_WARNING')
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                    : telemetry.helmetStatus === 'HELMET_NOT_DETECTED'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/35'
                }`}
              >
                {isHelmetBypassed
                  ? '✓ HELMET BYPASS ACTIVE (DEMO) · EYES & MOTION MONITORED'
                  : telemetry.smartHelmetState === 'HELMET_EYES_VISIBLE' &&
                  (telemetry.phoneStatus === 'PHONE_NOT_DETECTED' ||
                    telemetry.phoneStatus === 'PHONE_DETECTED_INACTIVE')
                  ? 'State 2: ✓ HELMET & ✓ EYES VISIBLE'
                  : telemetry.smartHelmetState === 'HELMET_EYES_LIMITED' &&
                    (telemetry.phoneStatus === 'PHONE_NOT_DETECTED' ||
                      telemetry.phoneStatus === 'PHONE_DETECTED_INACTIVE')
                  ? 'State 3: ✓ HELMET & ⚠ TINTED VISOR (PAUSED)'
                  : telemetry.helmetStatus === 'HELMET_NOT_DETECTED' &&
                    (telemetry.phoneStatus === 'POSSIBLE_PHONE_DISTRACTION' ||
                      telemetry.phoneStatus === 'PHONE_DISTRACTION_WARNING')
                  ? 'State 4: ⚠ NO HELMET & ⚠ PHONE (DUAL)'
                  : telemetry.helmetStatus === 'HELMET_NOT_DETECTED'
                  ? 'State 1: ⚠ NO HELMET DETECTED'
                  : 'State: ✓ HELMET & ⚠ PHONE WARNING'}
              </span>
            </div>

            {/* Active Violations Callout if any */}
            {((!isHelmetBypassed && telemetry.helmetStatus === 'HELMET_NOT_DETECTED') ||
              telemetry.phoneStatus === 'POSSIBLE_PHONE_DISTRACTION' ||
              telemetry.phoneStatus === 'PHONE_DISTRACTION_WARNING' ||
              telemetry.phoneDistractionRisk === 'HIGH' ||
              telemetry.drowsinessAlertActive ||
              telemetry.isHeadSlumped ||
              telemetry.isHeadTilted) && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs space-y-2 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-rose-300 tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    Safety Infractions Detected:
                  </span>
                  <span className="text-[9px] font-mono text-rose-300 font-extrabold uppercase bg-rose-900/60 px-2 py-0.5 rounded border border-rose-700/60">
                    Active Advisory
                  </span>
                </div>
                <div className="space-y-1 font-mono text-xs pt-0.5">
                  {!isHelmetBypassed && telemetry.helmetStatus === 'HELMET_NOT_DETECTED' && (
                    <div className="text-rose-200 font-bold flex items-center gap-1.5">
                      <span className="text-rose-400">⚠</span>
                      <span>NO PROTECTIVE HELMET DETECTED</span>
                    </div>
                  )}
                  {telemetry.isHeadSlumped && (
                    <div className="text-rose-200 font-bold flex items-center gap-1.5 animate-pulse">
                      <span className="text-rose-400">⚠</span>
                      <span>RIDER HEAD DOWN DETECTED (SLUMP / NOD)</span>
                    </div>
                  )}
                  {telemetry.isHeadTilted && (
                    <div className="text-rose-200 font-bold flex items-center gap-1.5 animate-pulse">
                      <span className="text-rose-400">⚠</span>
                      <span>
                        HEAD / SHOULDER TILT DETECTED ({telemetry.headRoll > 0 ? 'RIGHT' : 'LEFT'} {Math.abs(telemetry.headRoll)}°)
                      </span>
                    </div>
                  )}
                  {(telemetry.phoneStatus === 'POSSIBLE_PHONE_DISTRACTION' ||
                    telemetry.phoneStatus === 'PHONE_DISTRACTION_WARNING' ||
                    telemetry.phoneDistractionRisk === 'HIGH') && (
                    <div className="text-amber-200 font-bold flex items-center gap-1.5">
                      <span className="text-amber-400">⚠</span>
                      <span>SMARTPHONE DISTRACTION IN RIDER ZONE</span>
                    </div>
                  )}
                  {telemetry.drowsinessAlertActive && (
                    <div className="text-rose-200 font-bold flex items-center gap-1.5 animate-pulse">
                      <span className="text-rose-400">⚠</span>
                      <span>SUSTAINED EYE CLOSURE (DROWSINESS DETECTED)</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DEDICATED SECTION 1: SMART HELMET & VISIBILITY (CORE SAFETY LAYER) */}
            <div className="p-4 rounded-xl bg-[#090a0e]/90 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Glasses className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-200">
                    Smart Helmet &amp; Visor Layer
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                    telemetry.smartHelmetState === 'HELMET_EYES_VISIBLE'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : telemetry.smartHelmetState === 'HELMET_EYES_LIMITED'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                  }`}
                >
                  {telemetry.smartHelmetState}
                </span>
              </div>

              {/* 3 Core Safety Indicators */}
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
                {/* 1. Helmet Indicator */}
                <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans block">Headgear</span>
                  <strong
                    className={`block mt-1 truncate ${
                      telemetry.helmetStatus === 'HELMET_DETECTED'
                        ? 'text-emerald-400'
                        : telemetry.helmetStatus === 'HELMET_NOT_DETECTED'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {telemetry.helmetStatus === 'HELMET_DETECTED'
                      ? 'DETECTED'
                      : telemetry.helmetStatus === 'HELMET_NOT_DETECTED'
                      ? 'NO HELMET'
                      : 'UNCERTAIN'}
                  </strong>
                </div>

                {/* 2. Eye Visibility Indicator */}
                <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans block">Eye Optics</span>
                  <strong
                    className={`block mt-1 truncate ${
                      telemetry.eyeVisibility === 'VISIBLE'
                        ? 'text-emerald-400'
                        : telemetry.eyeVisibility === 'LIMITED'
                        ? 'text-amber-400'
                        : 'text-zinc-400'
                    }`}
                  >
                    {telemetry.eyeVisibility}
                  </strong>
                </div>

                {/* 3. Eye Monitoring State */}
                <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans block">Safety Gate</span>
                  <strong
                    className={`block mt-1 truncate ${
                      telemetry.eyeMonitoring === 'ACTIVE'
                        ? 'text-emerald-300'
                        : telemetry.eyeMonitoring === 'LIMITED'
                        ? 'text-amber-300'
                        : 'text-zinc-500'
                    }`}
                  >
                    {telemetry.eyeMonitoring === 'ACTIVE'
                      ? 'ACTIVE'
                      : telemetry.eyeMonitoring === 'LIMITED'
                      ? 'PAUSED'
                      : 'UNAVAIL'}
                  </strong>
                </div>
              </div>

              {/* Evidence-Based Visor Transmittance & Reason */}
              <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-zinc-400">Visor Evidence:</span>
                  <span
                    className={`font-bold ${
                      telemetry.visorStatus === 'CLEAR'
                        ? 'text-emerald-400'
                        : telemetry.visorStatus === 'TINTED_VISOR_DETECTED'
                        ? 'text-amber-400'
                        : telemetry.visorStatus === 'LIMITED_TINT_OR_GLARE'
                        ? 'text-amber-300'
                        : 'text-zinc-400'
                    }`}
                  >
                    {telemetry.visorStatus === 'CLEAR'
                      ? 'CLEAR / EYES VISIBLE'
                      : telemetry.visorStatus === 'TINTED_VISOR_DETECTED'
                      ? 'TINTED VISOR'
                      : telemetry.visorStatus === 'LIMITED_TINT_OR_GLARE'
                      ? 'LIMITED / GLARE'
                      : 'UNAVAILABLE'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 m-0 font-sans leading-relaxed">
                  {telemetry.visorDescription}
                </p>
              </div>

              {/* Drowsiness Safety Gate Status Pill */}
              <div
                className={`p-2.5 rounded-lg text-[11px] font-mono flex items-center justify-between border ${
                  telemetry.eyeMonitoring === 'ACTIVE'
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Drowsiness Safety Gate:</span>
                </span>
                <span className="font-bold">
                  {telemetry.eyeMonitoring === 'ACTIVE'
                    ? `EAR = ${telemetry.ear > 0 ? telemetry.ear.toFixed(2) : '0.31'} (ENGAGED)`
                    : 'PAUSED / DROWSINESS SUPPRESSED'}
                </span>
              </div>
            </div>

            {/* DEDICATED SECTION 2: TWO-WHEELER RIDER HEAD MOTION & LIFESAVER LOOK ENGINE */}
            <div className="p-4 rounded-xl bg-[#090a0e]/90 border border-zinc-800 space-y-3 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-200">
                    Two-Wheeler Head Motion &amp; Lifesaver Engine
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                    telemetry.headMotionState === 'HEAD_SLUMP_NOD' ||
                    telemetry.headMotionState === 'LATERAL_TILT_LEFT' ||
                    telemetry.headMotionState === 'LATERAL_TILT_RIGHT'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                      : telemetry.headMotionState === 'LEFT_SHOULDER_CHECK' ||
                        telemetry.headMotionState === 'RIGHT_SHOULDER_CHECK'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : telemetry.headMotionState === 'LATERAL_GLANCE'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                  }`}
                >
                  {telemetry.headMotionState.replace(/_/g, ' ')}
                </span>
              </div>

              {/* 3-Axis Pose Telemetry & Head Status Grid */}
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
                {/* 1. Yaw Heading (Horizontal Turn) */}
                <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans block">Yaw (Turn)</span>
                  <strong
                    className={`block mt-1 text-sm ${
                      Math.abs(telemetry.headYaw) >= 22 ? 'text-emerald-400' : 'text-zinc-200'
                    }`}
                  >
                    {telemetry.headYaw > 0 ? `+${telemetry.headYaw}°` : `${telemetry.headYaw}°`}
                  </strong>
                  <span className="text-[9px] text-zinc-500 block truncate">
                    {telemetry.headYaw <= -22
                      ? 'Turn Left'
                      : telemetry.headYaw >= 22
                      ? 'Turn Right'
                      : 'Forward Focus'}
                  </span>
                </div>

                {/* 2. Pitch Angle (Nod / Slump) */}
                <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans block">Pitch (Tilt)</span>
                  <strong
                    className={`block mt-1 text-sm ${
                      telemetry.isHeadSlumped
                        ? 'text-rose-400'
                        : telemetry.headPitch <= -6
                        ? 'text-amber-400'
                        : 'text-zinc-200'
                    }`}
                  >
                    {telemetry.headPitch > 0 ? `+${telemetry.headPitch}°` : `${telemetry.headPitch}°`}
                  </strong>
                  <span className="text-[9px] text-zinc-500 block truncate">
                    {telemetry.isHeadSlumped ? 'Head Down ⚠' : telemetry.headPitch <= -6 ? 'Drooping' : 'Upright'}
                  </span>
                </div>

                {/* 3. Roll Angle (Tilt / Shoulder Lean) */}
                <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans block">Roll (Tilt)</span>
                  <strong
                    className={`block mt-1 text-sm ${
                      telemetry.isHeadTilted
                        ? 'text-rose-400'
                        : Math.abs(telemetry.headRoll) >= 10
                        ? 'text-amber-400'
                        : 'text-zinc-200'
                    }`}
                  >
                    {telemetry.headRoll > 0 ? `+${telemetry.headRoll}°` : `${telemetry.headRoll}°`}
                  </strong>
                  <span className="text-[9px] text-zinc-500 block truncate">
                    {telemetry.isHeadTilted
                      ? `Tilt ${telemetry.headRoll > 0 ? 'Right' : 'Left'} ⚠`
                      : Math.abs(telemetry.headRoll) >= 10
                      ? 'Leaning'
                      : 'Upright'}
                  </span>
                </div>
              </div>

              {/* Dynamic Lifesaver Look Audit & Head Slump Callouts */}
              {telemetry.isHeadSlumped ? (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 flex items-center justify-between animate-pulse">
                  <span className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Head Down Slump Detected:</span>
                  </span>
                  <span className="font-mono font-bold text-rose-300">
                    {(telemetry.headSlumpDurationMs / 1000).toFixed(1)}s
                  </span>
                </div>
              ) : telemetry.isHeadTilted ? (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 flex items-center justify-between animate-pulse">
                  <span className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Shoulder / Head Tilt ({telemetry.headRoll > 0 ? 'Right' : 'Left'} {Math.abs(telemetry.headRoll)}°):</span>
                  </span>
                  <span className="font-mono font-bold text-rose-300">
                    {((telemetry.headTiltDurationMs ?? 0) / 1000).toFixed(1)}s
                  </span>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-zinc-400 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Pre-Maneuver Lifesaver Checks:</span>
                    </span>
                    <span className="font-bold text-emerald-400">
                      {telemetry.lifesaverAudit?.totalChecksThisRide ?? 0} Completed
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 font-sans">
                    <span>
                      {telemetry.lifesaverAudit?.isPerformingCheck
                        ? `Actively checking ${telemetry.lifesaverAudit.lastCheckDirection ?? ''} blindspot...`
                        : telemetry.lifesaverAudit?.lastCheckDirection
                        ? `Last checked ${telemetry.lifesaverAudit.lastCheckDirection} shoulder`
                        : 'Turn head ≥ 35° left/right to audit shoulder checks'}
                    </span>
                    {telemetry.lifesaverAudit?.isPerformingCheck && (
                      <span className="text-emerald-300 font-mono font-bold bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                        AUDIT ENGAGED
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* DEDICATED SECTION 3: REAL PHONE OBJECT DETECTION */}
            <div className="p-3.5 rounded-xl bg-[#090a0e]/70 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-zinc-300" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                    Smartphone Object Detection
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                    telemetry.phoneStatus === 'PHONE_DISTRACTION_WARNING'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : telemetry.phoneStatus === 'POSSIBLE_PHONE_DISTRACTION'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : telemetry.phoneStatus === 'PHONE_DETECTED_INACTIVE'
                      ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {telemetry.phoneStatus === 'PHONE_DISTRACTION_WARNING'
                    ? '⚠ DISTRACTION WARNING'
                    : telemetry.phoneStatus === 'POSSIBLE_PHONE_DISTRACTION'
                    ? '⚠ POSSIBLE PHONE USE'
                    : telemetry.phoneStatus === 'PHONE_DETECTED_INACTIVE'
                    ? 'DETECTED (INACTIVE)'
                    : '✓ NOT DETECTED'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="bg-zinc-900/80 p-2 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 font-sans block">Model Confidence</span>
                  <span className="text-zinc-100 font-bold">
                    {telemetry.phoneConfidence > 0 ? `${telemetry.phoneConfidence}%` : '—'}
                  </span>
                </div>
                <div className="bg-zinc-900/80 p-2 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 font-sans block">Spatial Zone</span>
                  <span
                    className={
                      telemetry.phoneAssociatedWithRider
                        ? 'text-rose-400 font-bold'
                        : telemetry.phoneDetected
                        ? 'text-zinc-200'
                        : 'text-zinc-400'
                    }
                  >
                    {telemetry.phoneAssociatedWithRider
                      ? 'In Rider Zone'
                      : telemetry.phoneDetected
                      ? 'Outside Zone'
                      : 'Clear'}
                  </span>
                </div>
              </div>

              {telemetry.phoneDurationSec > 0 && (
                <div className="text-[10px] text-amber-400 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Handheld near ear/head for {telemetry.phoneDurationSec}s
                </div>
              )}
            </div>

            {/* Contributing Violation Factors */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                Observed Safety Factors
              </span>

              {assessment.factors.length === 0 ? (
                <div className="p-3 rounded-xl bg-[#090a0e]/60 border border-zinc-800 text-xs text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>No active safety violations observed. Protective headgear compliant.</span>
                </div>
              ) : (
                assessment.factors.map((f) => (
                  <div
                    key={f.id}
                    className={`p-2.5 rounded-xl border space-y-1 ${
                      f.severity === 'high'
                        ? 'bg-rose-950/40 border-rose-900/50'
                        : f.severity === 'moderate'
                        ? 'bg-amber-950/40 border-amber-900/50'
                        : 'bg-zinc-900/80 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={`font-bold ${
                          f.severity === 'high'
                            ? 'text-rose-300'
                            : f.severity === 'moderate'
                            ? 'text-amber-300'
                            : 'text-zinc-300'
                        }`}
                      >
                        {f.label}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold ${
                          f.points > 0 ? 'text-rose-400' : 'text-zinc-400'
                        }`}
                      >
                        {f.points > 0 ? `+${f.points} pts` : 'INFO'}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 m-0">{f.description}</p>
                  </div>
                ))
              )}
            </div>

            {/* Recommended Action */}
            <div className="p-3.5 rounded-xl bg-[#090a0e]/80 border border-zinc-800 space-y-1">
              <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                Recommended System Action
              </span>
              <p className="text-xs text-zinc-200 m-0 leading-relaxed font-medium">
                {assessment.recommendedAction}
              </p>
            </div>
          </div>

          {/* Transparency Note */}
          <div className="pt-2 border-t border-zinc-800/80 text-[10px] text-zinc-500 leading-normal">
            <strong>Pretrained Vision Architecture:</strong> MediaPipe FaceLandmarker verifies cranial headgear and eye region transmittance. Pretrained EfficientDet-Lite0 runs in-browser to identify real <code className="text-zinc-400">cell phone</code> objects in the rider zone.
          </div>
        </div>
      </div>
    </div>
  );
};
