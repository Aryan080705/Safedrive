import React from 'react';
import { Play, Pause, RotateCcw, AlertTriangle, ShieldAlert, Car, HelpCircle, Compass, CheckCircle2, EyeOff } from 'lucide-react';
import type { EgoCorridorGeometry, RoadRiskAssessment, SceneCalibration } from '../types';

interface RoadVideoPlayerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isPlaying: boolean;
  setIsPlaying: (val: boolean) => void;
  currentTimeSec: number;
  durationSec: number;
  onSeek: (sec: number) => void;
  onRestart: () => void;
  assessment: RoadRiskAssessment;
  sceneCalibration?: SceneCalibration;
  egoCorridorGeometry?: EgoCorridorGeometry;
  uploadedVideoUrl: string | null;
  isUsingUploadedVideo: boolean;
  showExplanationPanel?: boolean;
}

export const RoadVideoPlayer: React.FC<RoadVideoPlayerProps> = ({
  videoRef,
  canvasRef,
  isPlaying,
  setIsPlaying,
  currentTimeSec,
  durationSec,
  onSeek,
  onRestart,
  assessment,
  sceneCalibration,
  egoCorridorGeometry,
  uploadedVideoUrl,
  isUsingUploadedVideo,
  showExplanationPanel = false,
}) => {
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="hud-card hud-brackets relative flex flex-col overflow-hidden border-zinc-800 shadow-xl h-full">
      {/* Top Card Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0e1017] border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center text-zinc-300">
            <Car className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
            ROAD DASHCAM FEED
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-zinc-850 text-zinc-300 border border-zinc-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {isUsingUploadedVideo ? 'ACTIVE DASHCAM' : 'SIMULATED CORRIDOR'}
          </span>
        </div>
        <div className="text-xs text-zinc-400 font-mono">
          {assessment.detectedObjects?.length ?? 0} Object{assessment.detectedObjects?.length === 1 ? '' : 's'} Tracked
        </div>
      </div>

      {/* Main Viewport & Video / Canvas Area */}
      <div className="relative w-full aspect-video aspect-[16/9] bg-black overflow-hidden flex items-center justify-center shrink-0 hud-scanlines">
        {/* Real uploaded video element */}
        {isUsingUploadedVideo && uploadedVideoUrl ? (
          <video
            ref={videoRef}
            src={uploadedVideoUrl}
            playsInline
            muted
            onEnded={() => setIsPlaying(false)}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />
        ) : (
          /* Simulated Road Environment Canvas / Backdrop */
          <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-[#090a0f] via-[#12131a] to-[#090a0f] flex items-center justify-center pointer-events-none">
            <svg className="absolute inset-0 w-full h-full opacity-35" preserveAspectRatio="none" viewBox="0 0 100 100">
              <line x1="0" y1="45" x2="100" y2="45" stroke="#27272a" strokeWidth="0.8" />
              <line x1="20" y1="100" x2="44" y2="45" stroke="#3f3f46" strokeWidth="1" />
              <line x1="80" y1="100" x2="56" y2="45" stroke="#3f3f46" strokeWidth="1" />
              <line x1="50" y1="100" x2="50" y2="45" stroke="#eab308" strokeWidth="0.8" strokeDasharray="3 3" />
            </svg>
          </div>
        )}

        {/* MediaPipe & Analysis Canvas Layer */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
        />

        {/* Top In-Video Warning Overlays */}
        {(assessment.warningBanner || assessment.insufficientEvidenceWarning) && (
          <div className="absolute top-2.5 left-2.5 right-2.5 z-30 pointer-events-none flex flex-col gap-1.5 items-center">
            {assessment.warningBanner && (
              <div
                className={`w-full px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between shadow-2xl backdrop-blur-md transition-all border ${
                  assessment.tier === 'CRITICAL'
                    ? 'bg-rose-600/95 text-white animate-pulse border-rose-400'
                    : assessment.tier === 'HIGH'
                    ? 'bg-amber-600/95 text-white border-amber-400'
                    : 'bg-yellow-500/95 text-zinc-950 font-extrabold border-yellow-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {assessment.tier === 'CRITICAL' ? (
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span className="truncate">{assessment.warningBanner}</span>
                </div>
                {assessment.subWarning && (
                  <span className="text-[11px] font-normal hidden sm:inline opacity-90 truncate ml-2">
                    {assessment.subWarning}
                  </span>
                )}
              </div>
            )}

            {assessment.insufficientEvidenceWarning && (
              <div className="w-full bg-[#181D14]/95 border border-white/[0.08] px-3 py-1 rounded-lg text-[11px] text-[#B8892D] flex items-center gap-2 backdrop-blur-md shadow-lg">
                <HelpCircle className="w-3.5 h-3.5 text-[#B8892D] shrink-0" />
                <span className="truncate">{assessment.insufficientEvidenceWarning}</span>
              </div>
            )}
          </div>
        )}

        {/* Top-Left Telemetry Badge */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2 py-1 rounded bg-[#0C0F0A]/85 border border-white/[0.08] text-[11px] font-mono text-[#A8AA9B] pointer-events-none">
          <Car className="w-3.5 h-3.5 text-[#D8C9A8]" />
          <span>DASHCAM TELEMETRY &middot; ROAD CAM</span>
        </div>

        {/* Top-Right Visual Legend */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 text-[10px] font-mono pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-[#D94B45]" />
          <span className="text-[#A8AA9B] mr-2">Critical</span>
          <span className="w-2 h-2 rounded-full bg-[#B8892D]" />
          <span className="text-[#A8AA9B]">Warning</span>
        </div>

        {/* Bottom HUD In-Video Overlay */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between text-[11px] font-mono pointer-events-none">
          <div className="bg-[#090a0f]/90 backdrop-blur-sm px-2.5 py-1 rounded-md border border-zinc-800 text-zinc-300 flex items-center gap-3">
            <span>
              Tracked: <strong className="text-zinc-200">{assessment.detectedObjects.length}</strong>
            </span>
            <span>|</span>
            <span>
              Hazards:{' '}
              <strong className={assessment.relevantHazardCount > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                {assessment.relevantHazardCount}
              </strong>
            </span>
            {assessment.primaryThreat && (
              <>
                <span>|</span>
                <span>
                  Gap: <strong className="text-white">{assessment.primaryThreat.estimatedDistanceMeters}m</strong>
                </span>
                <span>|</span>
                <span>
                  Closing: <strong className="text-amber-400">+{assessment.primaryThreat.closingSpeedKmh} km/h</strong>
                </span>
              </>
            )}
            <span>|</span>
            <span>
              TTC:{' '}
              <strong className={assessment.timeToCollision !== null ? 'text-rose-400 font-bold' : 'text-zinc-500'}>
                {assessment.timeToCollision !== null ? `${assessment.timeToCollision}s` : 'N/A'}
              </strong>
            </span>
          </div>

          <div className="bg-[#090a0f]/90 backdrop-blur-sm px-2.5 py-1 rounded-md border border-zinc-800 text-zinc-400 hidden sm:flex items-center gap-2">
            <Compass className="w-3 h-3 text-zinc-300" />
            <span>
              Ego-Path:{' '}
              <strong className={egoCorridorGeometry?.confidence === 'LOW' ? 'text-amber-400' : 'text-zinc-200'}>
                {egoCorridorGeometry?.confidence || 'MEDIUM'}
              </strong>
            </span>
            {sceneCalibration && (
              <>
                <span>|</span>
                <span>
                  Light: <strong className="text-zinc-200 capitalize">{sceneCalibration.lightingCondition}</strong>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Playback Controls & Scrubber */}
      <div className="p-3 bg-[#0e1017] border-t border-zinc-800 space-y-2 shrink-0">
        {/* Scrubber Bar */}
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max={durationSec || 20}
            step="0.1"
            value={currentTimeSec}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-200 border border-zinc-700"
          />
          <div className="text-xs font-mono text-zinc-200 shrink-0 w-24 text-right font-bold">
            {formatTime(currentTimeSec)} / {formatTime(durationSec)}
          </div>
        </div>

        {/* Buttons and Decoupled Metrics */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (isUsingUploadedVideo && videoRef.current) {
                  if (isPlaying) {
                    videoRef.current.pause();
                    setIsPlaying(false);
                  } else {
                    if (videoRef.current.ended || (durationSec > 0 && currentTimeSec >= durationSec - 0.15)) {
                      videoRef.current.currentTime = 0;
                      onSeek(0);
                    }
                    videoRef.current.play().catch((err) => console.warn('Video play error:', err));
                    setIsPlaying(true);
                  }
                } else {
                  setIsPlaying(!isPlaying);
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#B8892D] hover:bg-[#D4A84D] text-[#0C0F0A] font-mono font-bold text-xs transition-all cursor-pointer shadow-sm"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'PAUSE' : 'ANALYZE / PLAY'}</span>
            </button>

            <button
              onClick={onRestart}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs font-mono transition-colors cursor-pointer border border-zinc-700 shrink-0"
              title="Restart video"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>REPLAY</span>
            </button>
          </div>

          {/* Decoupled Risk Score & Confidence Display */}
          <div className="flex items-center gap-3 text-xs shrink-0">
            {/* Risk Score */}
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400">Collision Risk:</span>
              <span className={`font-mono font-bold text-sm ${
                assessment.tier === 'CRITICAL'
                  ? 'text-rose-400'
                  : assessment.tier === 'HIGH'
                  ? 'text-amber-400'
                  : assessment.tier === 'CAUTION'
                  ? 'text-yellow-400'
                  : 'text-emerald-400'
              }`}>
                {assessment.score}/100
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                assessment.tier === 'CRITICAL'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : assessment.tier === 'HIGH'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : assessment.tier === 'CAUTION'
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}>
                {assessment.tier}
              </span>
            </div>

            {/* Decoupled Risk Confidence */}
            <div className="flex items-center gap-1.5 pl-2.5 border-l border-zinc-800">
              <span className="text-zinc-400">Confidence:</span>
              <span className={`font-mono font-bold text-sm ${
                assessment.riskConfidence >= 75
                  ? 'text-emerald-400'
                  : assessment.riskConfidence >= 50
                  ? 'text-amber-400'
                  : 'text-[#B9C0C8]'
              }`}>
                {assessment.riskConfidence}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Optional In-Card Explanation Panel */}
      {showExplanationPanel && (
        <div className="p-3 bg-[#090a0f] border-t border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs shrink-0">
          {/* Contributing Factors */}
          <div className="bg-zinc-900/60 p-2 rounded border border-zinc-800 flex flex-col h-28">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 shrink-0 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Hazard Evidence ({assessment.relevantHazardCount})</span>
            </span>
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0">
              {assessment.activeFactors.map((factor, i) => (
                <div key={i} className="text-zinc-300 text-[11px] flex items-center gap-1.5 bg-zinc-850 px-2 py-1 rounded border border-zinc-750">
                  <span className="text-amber-400 font-bold">&bull;</span>
                  <span>{factor}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Non-Contributing Objects */}
          <div className="bg-zinc-900/60 p-2 rounded border border-zinc-800 flex flex-col h-28">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 shrink-0 mb-1">
              <EyeOff className="w-3.5 h-3.5 text-zinc-500" />
              <span>Non-Hazard Context ({assessment.nonContributingObjects.length})</span>
            </span>
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0">
              {assessment.nonContributingObjects.length > 0 ? (
                assessment.nonContributingObjects.map((item, i) => (
                  <div key={i} className="text-zinc-400 text-[11px] flex items-center gap-1.5 bg-zinc-850/60 px-2 py-1 rounded border border-zinc-800">
                    <span className="text-zinc-500">&bull;</span>
                    <span>{item}</span>
                  </div>
                ))
              ) : (
                <div className="text-zinc-500 text-[11px] italic px-1 py-1">
                  No roadside objects observed.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
