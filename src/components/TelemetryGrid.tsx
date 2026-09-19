import React from 'react';
import { Eye, Smile, Compass, Gauge } from 'lucide-react';
import type { DriverTelemetry } from '../types';

interface TelemetryGridProps {
  telemetry: DriverTelemetry;
  onSpeedChange: (speed: number) => void;
}

export const TelemetryGrid: React.FC<TelemetryGridProps> = ({
  telemetry,
  onSpeedChange,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Eye State / EAR */}
      <div className="hud-card p-4 flex flex-col justify-between border-zinc-800 relative overflow-hidden group">
        <div className="flex items-center justify-between text-zinc-400">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">EYELID RATIO (EAR)</span>
          <Eye className={`w-4 h-4 transition-colors ${telemetry.isEyeClosed ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`} />
        </div>

        <div className="my-2.5">
          <div className="flex items-baseline justify-between">
            <span className={`text-3xl font-black font-mono tracking-tight ${telemetry.isEyeClosed ? 'text-rose-400' : 'text-zinc-100'}`}>
              {telemetry.ear.toFixed(2)}
            </span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
              telemetry.isEyeClosed
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
            }`}>
              {telemetry.isEyeClosed ? 'EYES CLOSED' : 'ALERT OPEN'}
            </span>
          </div>

          {/* EAR Progress bar */}
          <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden mt-2.5 border border-zinc-800 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-200 ${
                telemetry.isEyeClosed
                  ? 'bg-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                  : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
              }`}
              style={{ width: `${Math.min(100, (telemetry.ear / 0.4) * 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1 border-t border-zinc-800">
          <span>Threshold: &lt;0.20</span>
          {telemetry.eyeClosureDurationMs > 0 ? (
            <span className="text-rose-400 font-bold">
              {(telemetry.eyeClosureDurationMs / 1000).toFixed(1)}s
            </span>
          ) : (
            <span className="text-zinc-400">Nominal</span>
          )}
        </div>
      </div>

      {/* 2. Yawning / MAR */}
      <div className="hud-card p-4 flex flex-col justify-between border-zinc-800 relative overflow-hidden group">
        <div className="flex items-center justify-between text-zinc-400">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">MOUTH RATIO (MAR)</span>
          <Smile className={`w-4 h-4 transition-colors ${telemetry.isYawning ? 'text-amber-400 animate-pulse' : 'text-zinc-400'}`} />
        </div>

        <div className="my-2.5">
          <div className="flex items-baseline justify-between">
            <span className={`text-3xl font-black font-mono tracking-tight ${telemetry.isYawning ? 'text-amber-400' : 'text-zinc-100'}`}>
              {telemetry.mar.toFixed(2)}
            </span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
              telemetry.isYawning
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
            }`}>
              {telemetry.isYawning ? 'YAWNING' : 'CLOSED'}
            </span>
          </div>

          {/* MAR Progress bar */}
          <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden mt-2.5 border border-zinc-800 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-200 ${
                telemetry.isYawning
                  ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                  : 'bg-zinc-700'
              }`}
              style={{ width: `${Math.min(100, (telemetry.mar / 0.8) * 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1 border-t border-zinc-800">
          <span>Threshold: &gt;0.52</span>
          {telemetry.yawnDurationMs > 0 ? (
            <span className="text-amber-400 font-bold">
              {(telemetry.yawnDurationMs / 1000).toFixed(1)}s
            </span>
          ) : (
            <span className="text-zinc-400">Normal</span>
          )}
        </div>
      </div>

      {/* 3. Head Pose / Orientation */}
      <div className="hud-card p-4 flex flex-col justify-between border-zinc-800 relative overflow-hidden group">
        <div className="flex items-center justify-between text-zinc-400">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">HEAD POSE &amp; GAZE</span>
          <Compass className={`w-4 h-4 transition-colors ${telemetry.isDistracted ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`} />
        </div>

        <div className="my-2.5">
          <div className="flex items-baseline justify-between">
            <div className="font-mono text-xs text-zinc-300">
              Y: <span className="font-bold text-lg text-white">{telemetry.yaw}&deg;</span>
              <span className="mx-1.5 text-zinc-600">|</span>
              P: <span className="font-bold text-lg text-white">{telemetry.pitch}&deg;</span>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
              telemetry.isDistracted
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
            }`}>
              {telemetry.isDistracted ? 'DISTRACTED' : 'FORWARD'}
            </span>
          </div>

          <div className="text-[11px] text-zinc-300 mt-2 flex items-center justify-between font-mono">
            <span className="truncate">
              {telemetry.pitch < -16
                ? 'Downward (Phone Intent)'
                : Math.abs(telemetry.yaw) > 18
                ? `Turned ${telemetry.yaw < 0 ? 'Left' : 'Right'}`
                : 'Center Road Line of Sight'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1 border-t border-zinc-800">
          <span>Limit: &plusmn;18&deg;</span>
          {telemetry.distractionDurationMs > 0 ? (
            <span className="text-amber-400 font-bold">
              {(telemetry.distractionDurationMs / 1000).toFixed(1)}s
            </span>
          ) : (
            <span className="text-zinc-400">Attentive</span>
          )}
        </div>
      </div>

      {/* 4. Speed Multiplier Context */}
      <div className="hud-card p-4 flex flex-col justify-between border-zinc-800 relative overflow-hidden group">
        <div className="flex items-center justify-between text-zinc-400">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">SPEEDOMETER</span>
          <Gauge className="w-4 h-4 text-zinc-400" />
        </div>

        <div className="my-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black font-mono tracking-tight text-white">
              {telemetry.speedKmH}
              <span className="text-xs text-zinc-400 font-normal ml-1">km/h</span>
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-300 border border-zinc-700">
              {telemetry.speedKmH > 80 ? 'HIGHWAY (1.2x)' : telemetry.speedKmH > 40 ? 'URBAN (1.0x)' : 'SLOW (0.8x)'}
            </span>
          </div>

          {/* Speed slider */}
          <input
            type="range"
            min="0"
            max="140"
            step="5"
            value={telemetry.speedKmH}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-200 mt-2.5 border border-zinc-700"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1 border-t border-zinc-800">
          <div className="flex gap-1">
            {[0, 50, 90, 120].map((spd) => (
              <button
                key={spd}
                onClick={() => onSpeedChange(spd)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                  telemetry.speedKmH === spd
                    ? 'bg-zinc-100 text-zinc-950 font-black'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                }`}
              >
                {spd}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-zinc-500">Km/h</span>
        </div>
      </div>
    </div>
  );
};
