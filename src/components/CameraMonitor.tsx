import React from 'react';
import { Camera, Eye, EyeOff, AlertTriangle, RefreshCw, Sliders, Crosshair } from 'lucide-react';
import type { DriverTelemetry } from '../types';

interface CameraMonitorProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isLoading: boolean;
  cameraError: string | null;
  isCameraActive: boolean;
  showMeshOverlay: boolean;
  setShowMeshOverlay: (val: boolean) => void;
  telemetry: DriverTelemetry;
  isSimulation?: boolean;
  onSwitchToSimulation: () => void;
  onRestartCamera: () => void;
  isAudioUnlocked?: boolean;
  audioStatus?: 'ACTIVE' | 'PERMISSION_REQUIRED' | 'MUTED';
  onEnableAudio?: () => void;
}

export const CameraMonitor: React.FC<CameraMonitorProps> = ({
  videoRef,
  canvasRef,
  isLoading,
  cameraError,
  isCameraActive,
  showMeshOverlay,
  setShowMeshOverlay,
  telemetry,
  isSimulation,
  onSwitchToSimulation,
  onRestartCamera,
  audioStatus,
  onEnableAudio,
}) => {
  const [showDiagnostics, setShowDiagnostics] = React.useState(false);

  return (
    <div className="hud-card hud-brackets relative flex flex-col overflow-hidden border-zinc-800 shadow-xl h-full">
      {/* Top Card Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0e1017] border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center text-zinc-300">
            <Camera className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
            DRIVER TELEMETRY FEED
          </span>
          {isSimulation ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/35">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              SYNTHETIC TESTING
            </span>
          ) : telemetry.faceDetected ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/35">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              FACE LOCK ACQUIRED
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/35">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              SCANNING CABIN
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          {audioStatus === 'PERMISSION_REQUIRED' && onEnableAudio && (
            <button
              onClick={onEnableAudio}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400 text-amber-300 hover:bg-amber-500/30 text-xs font-bold transition-all animate-alert-pulse cursor-pointer"
              title="Click to enable safety audio alarms"
            >
              <span>🔊 UNMUTE ALERTS</span>
            </button>
          )}
          {telemetry.fps > 0 && (
            <span className="text-[10px] font-mono text-zinc-300 bg-zinc-850 px-2 py-0.5 rounded border border-zinc-700">
              {telemetry.fps} FPS
            </span>
          )}
          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
              showDiagnostics
                ? 'bg-[#2D4059] text-[#FFD460] border-[#FFD460]/40 shadow-sm font-bold'
                : 'bg-[#182536] border-white/10 text-[#B9C0C8] hover:text-[#F7F4EC]'
            }`}
            title="Toggle Developer Telemetry Diagnostics Overlay"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Diagnostics</span>
          </button>
          <button
            onClick={() => setShowMeshOverlay(!showMeshOverlay)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
              showMeshOverlay
                ? 'bg-[#2D4059] text-[#FFD460] border-[#FFD460]/40 font-bold'
                : 'bg-[#182536] border-white/10 text-[#B9C0C8] hover:text-[#F7F4EC]'
            }`}
            title="Toggle landmark wireframe overlay"
          >
            {showMeshOverlay ? <Eye className="w-3.5 h-3.5 text-[#FFD460]" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Mesh Wireframe</span>
          </button>
        </div>
      </div>

      {/* Main Video Viewport */}
      <div className="relative w-full aspect-video aspect-[16/9] bg-black overflow-hidden flex items-center justify-center shrink-0 hud-scanlines">
        {/* HTML5 Video */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 ${
            !isCameraActive || cameraError ? 'hidden' : 'block'
          }`}
        />

        {/* Real-time Landmark Canvas Overlay */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 pointer-events-none z-10 ${
            !isCameraActive || cameraError ? 'hidden' : 'block'
          }`}
        />

        {/* Target Reticle in Center (Neutral Platinum) */}
        {isCameraActive && !cameraError && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 opacity-30">
            <div className="w-32 h-32 border border-white/30 rounded-lg relative">
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white/70" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white/70" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white/70" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white/70" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Crosshair className="w-6 h-6 text-white/50" />
              </div>
            </div>
          </div>
        )}

        {/* Loading State Overlay */}
        {isLoading && !cameraError && (
          <div className="absolute inset-0 bg-[#090a0e]/95 flex flex-col items-center justify-center gap-3 p-6 text-center z-20">
            <RefreshCw className="w-9 h-9 text-zinc-300 animate-spin" />
            <div>
              <p className="text-sm font-bold text-white font-mono m-0">INITIALIZING VISION PIPELINE</p>
              <p className="text-xs text-zinc-400 mt-1.5 m-0 font-mono">
                Loading MediaPipe Face Landmarker GPU WebAssembly...
              </p>
            </div>
          </div>
        )}

        {/* Camera Error / Fallback State */}
        {cameraError && (
          <div className="absolute inset-0 bg-[#090a0e]/95 flex flex-col items-center justify-center gap-3 p-6 text-center z-30">
            <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="max-w-md">
              <h3 className="text-sm font-bold text-white font-mono m-0">CAMERA FEED UNAVAILABLE</h3>
              <p className="text-xs text-zinc-300 mt-1.5 mb-3 leading-relaxed">{cameraError}</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={onRestartCamera}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-medium border border-zinc-700 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  RETRY CAMERA
                </button>
                <button
                  onClick={onSwitchToSimulation}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-mono font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  USE SIMULATION
                </button>
              </div>
            </div>
          </div>
        )}

        {/* High-Visibility In-Video Drowsiness Alert Banner */}
        {telemetry.isEyeClosed && telemetry.eyeClosureDurationMs >= 1000 && (
          <div className="absolute top-3 left-3 right-3 z-30 p-3 rounded-xl bg-rose-950/95 border border-rose-500 shadow-[0_0_25px_rgba(239,68,68,0.5)] backdrop-blur-md animate-alert-pulse flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-600/40 border border-rose-400 flex items-center justify-center text-rose-200 font-bold text-base shadow-inner">
                ⚠
              </div>
              <div>
                <div className="text-xs font-black text-white tracking-wider font-mono">
                  DROWSINESS DETECTED &mdash; TAKE BREAK
                </div>
                <div className="text-[11px] text-rose-200 font-mono">
                  Eyes closed: <span className="font-bold text-white">{(telemetry.eyeClosureDurationMs / 1000).toFixed(1)}s</span> &bull; Risk Tier: <span className="font-bold text-white uppercase">{telemetry.eyeClosureDurationMs >= 2500 ? 'CRITICAL' : 'HIGH'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {audioStatus === 'PERMISSION_REQUIRED' && onEnableAudio ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEnableAudio();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-mono font-bold transition-all shadow cursor-pointer"
                >
                  🔊 SOUND ON
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-900/90 border border-rose-500 text-rose-200 text-[10px] font-mono font-bold uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                  AUDIO ACTIVE
                </span>
              )}
            </div>
          </div>
        )}

        {/* Developer Diagnostics HUD Panel */}
        {showDiagnostics && (
          <div className="absolute top-3 left-3 z-30 w-72 bg-[#182536]/95 border border-[#FFD460]/40 rounded-xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.85)] backdrop-blur-md font-mono text-[10px] space-y-1 text-[#F7F4EC] pointer-events-auto">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/10 text-[#FFD460] font-bold">
              <span>DEVELOPER DIAGNOSTICS</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#2D4059] border border-white/10 text-[#FFD460]">LIVE</span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1">
              <div>FPS: <span className="text-[#F7F4EC] font-bold">{telemetry.fps}</span></div>
              <div>Face Lock: <span className={telemetry.faceDetected ? 'text-[#4DBB82] font-bold' : 'text-[#EA5455] font-bold'}>{telemetry.faceDetected ? 'LOCKED' : 'SEARCHING'}</span></div>

              <div>EAR: <span className="text-[#F7F4EC] font-bold">{telemetry.ear.toFixed(2)}</span> ({telemetry.leftEar.toFixed(2)}/{telemetry.rightEar.toFixed(2)})</div>
              <div>Eye State: <span className={telemetry.eyeState === 'CLOSED' ? 'text-[#EA5455] font-bold' : telemetry.eyeState === 'UNAVAILABLE' ? 'text-[#F07B3F] font-bold' : 'text-[#4DBB82] font-bold'}>{telemetry.eyeState || (telemetry.isEyeClosed ? 'CLOSED' : 'OPEN')}</span></div>

              <div>MAR: <span className="text-[#F7F4EC] font-bold">{telemetry.mar.toFixed(2)}</span></div>
              <div>Mouth: <span className={telemetry.mouthState === 'OPEN' ? 'text-[#F07B3F] font-bold' : 'text-[#B9C0C8] font-bold'}>{telemetry.mouthState || 'CLOSED'}</span></div>

              <div className="col-span-2 flex items-center justify-between">
                <span>Yawn Sequence:</span>
                <span className={`font-bold px-1.5 py-0.5 rounded text-[9px] ${telemetry.yawnState === 'YAWN_CONFIRMED' ? 'bg-[#F07B3F]/20 text-[#FFD460] border border-[#F07B3F]/50' : telemetry.yawnState === 'COOLDOWN' ? 'bg-[#2D4059] text-[#B9C0C8]' : 'text-[#7F8995]'}`}>
                  {telemetry.yawnState || 'NORMAL'} ({telemetry.yawnDurationMs}ms)
                </span>
              </div>

              <div>Head Pose:</div>
              <div className="text-right text-[#B9C0C8]">{telemetry.yaw}&deg; / {telemetry.pitch}&deg; / {telemetry.roll}&deg;</div>

              <div className="col-span-2 flex items-center justify-between">
                <span>Head State:</span>
                <span className={`font-bold ${telemetry.headState === 'FORWARD' ? 'text-[#4DBB82]' : 'text-[#F07B3F]'}`}>
                  {telemetry.headState || 'FORWARD'}
                </span>
              </div>

              <div className="col-span-2 flex items-center justify-between">
                <span>Drowsiness State:</span>
                <span className={`font-bold ${telemetry.drowsinessState === 'DROWSINESS_CONFIRMED' ? 'text-[#EA5455] animate-pulse' : telemetry.drowsinessState === 'NORMAL' ? 'text-[#4DBB82]' : 'text-[#F07B3F]'}`}>
                  {telemetry.drowsinessState || 'NORMAL'}
                </span>
              </div>

              <div className="col-span-2 pt-1 border-t border-white/10 text-[9px] text-[#7F8995] flex items-center justify-between">
                <span>Last Trigger:</span>
                <span className="font-bold text-[#FFD460]">{telemetry.lastTrigger || 'NONE'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Neutral Telemetry In-Video Overlay */}
        {isCameraActive && !cameraError && (
          <div className="absolute bottom-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none text-[11px] font-mono">
            <div className="bg-[#090a0f]/85 backdrop-blur-md border border-zinc-700/80 px-2.5 py-1 rounded-lg text-zinc-200 shadow-md">
              EAR: <span className="font-bold text-white">{telemetry.ear.toFixed(2)}</span> &bull; MAR:{' '}
              <span className="font-bold text-white">{telemetry.mar.toFixed(2)}</span>
            </div>
            <div className="bg-[#090a0f]/85 backdrop-blur-md border border-zinc-700/80 px-2.5 py-1 rounded-lg text-zinc-200 shadow-md">
              Head: <span className="font-bold text-white">{telemetry.headState || 'FORWARD'}</span> ({telemetry.yaw}&deg;/{telemetry.pitch}&deg;)
            </div>
          </div>
        )}
      </div>

      {/* Bottom Telemetry Bar */}
      <div className="p-3 bg-[#0e1017] border-t border-zinc-800 space-y-1.5 shrink-0 min-h-[74px] flex flex-col justify-center">
        <div className="flex items-center justify-between text-xs">
          <div className="flex flex-wrap items-center gap-2.5 text-zinc-300 font-mono text-[11px]">
            <span>
              Blinks/min: <strong className="text-zinc-100">{telemetry.blinksPerMinute}</strong>
            </span>
            <span className="text-zinc-600">|</span>
            <span>
              Head:{' '}
              <strong className={telemetry.headState !== 'FORWARD' && telemetry.headState !== undefined ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                {telemetry.headState || 'FORWARD'}
              </strong>
            </span>
            <span className="text-zinc-600">|</span>
            <span>
              Yawn:{' '}
              <strong className={telemetry.yawnState === 'YAWN_CONFIRMED' ? 'text-amber-400 font-bold' : telemetry.yawnState === 'COOLDOWN' ? 'text-cyan-400 font-bold' : 'text-emerald-400'}>
                {telemetry.yawnState || 'NORMAL'}
              </strong>
            </span>
            <span className="text-zinc-600">|</span>
            <span>
              Posture:{' '}
              <strong className={telemetry.drowsinessState === 'DROWSINESS_CONFIRMED' ? 'text-rose-400 font-bold animate-pulse' : telemetry.drowsinessState === 'HEAD_DOWN' || telemetry.drowsinessState === 'SUSTAINED_HEAD_DOWN' ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                {telemetry.drowsinessState || 'NORMAL'}
              </strong>
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1 border-t border-zinc-800/60">
          <span>In-Browser MediaPipe Tasks Vision (GPU/Wasm)</span>
          <span className="text-emerald-400 font-medium hidden sm:inline">&bull; 100% On-Device</span>
        </div>
      </div>
    </div>
  );
};
