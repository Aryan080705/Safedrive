import React, { useState } from 'react';
import { Sliders, CheckCircle2, Moon, EyeOff, AlertOctagon, Flame, ChevronDown, ChevronUp } from 'lucide-react';
import type { DriverTelemetry, SimulationPreset } from '../types';

interface SimulationBarProps {
  isSimulation: boolean;
  onApplyPreset: (preset: SimulationPreset) => void;
  telemetry: DriverTelemetry;
  onUpdateSimTelemetry: (partial: Partial<DriverTelemetry>) => void;
}

export const SimulationBar: React.FC<SimulationBarProps> = ({
  isSimulation,
  onApplyPreset,
  telemetry,
  onUpdateSimTelemetry,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activePreset, setActivePreset] = useState<SimulationPreset | null>('normal');

  const handlePresetClick = (preset: SimulationPreset) => {
    setActivePreset(preset);
    onApplyPreset(preset);
  };

  return (
    <div className={`hud-card transition-all ${
      isSimulation
        ? 'bg-amber-950/15 border-amber-500/35 shadow-md'
        : 'bg-[#12131a] border-zinc-800'
    } p-4 rounded-xl`}>
      {/* Top Title & Expand Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200 m-0 flex items-center gap-2">
            Demo Simulation Controls
            {isSimulation && (
              <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40 font-semibold">
                ACTIVE PRESENTATION FALLBACK
              </span>
            )}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">
            Fail-safe simulated telemetry
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs font-mono text-zinc-300 hover:text-white bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-700 cursor-pointer"
          >
            <span>{isExpanded ? 'Hide Sliders' : 'Fine-Tune Sliders'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3 font-mono">
        {/* Normal */}
        <button
          onClick={() => handlePresetClick('normal')}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            isSimulation && activePreset === 'normal'
              ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
              : 'bg-zinc-850 hover:bg-zinc-800 border-zinc-750 text-zinc-300'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>1. Normal Driving</span>
        </button>

        {/* Fatigue */}
        <button
          onClick={() => handlePresetClick('fatigue')}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            isSimulation && activePreset === 'fatigue'
              ? 'bg-yellow-600 border-yellow-500 text-white shadow-sm'
              : 'bg-zinc-850 hover:bg-zinc-800 border-zinc-750 text-zinc-300'
          }`}
        >
          <Moon className="w-3.5 h-3.5 text-yellow-400" />
          <span>2. Fatigue / Yawn</span>
        </button>

        {/* Distraction */}
        <button
          onClick={() => handlePresetClick('distraction')}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            isSimulation && activePreset === 'distraction'
              ? 'bg-amber-600 border-amber-500 text-white shadow-sm'
              : 'bg-zinc-850 hover:bg-zinc-800 border-zinc-750 text-zinc-300'
          }`}
        >
          <EyeOff className="w-3.5 h-3.5 text-amber-400" />
          <span>3. Phone / Glance</span>
        </button>

        {/* High Risk */}
        <button
          onClick={() => handlePresetClick('high_risk')}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            isSimulation && activePreset === 'high_risk'
              ? 'bg-orange-600 border-orange-500 text-white shadow-sm'
              : 'bg-zinc-850 hover:bg-zinc-800 border-zinc-750 text-zinc-300'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5 text-orange-400" />
          <span>4. High Drowsiness</span>
        </button>

        {/* Critical Event */}
        <button
          onClick={() => handlePresetClick('critical')}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            isSimulation && activePreset === 'critical'
              ? 'bg-rose-600 border-rose-500 text-white shadow-sm animate-pulse'
              : 'bg-zinc-850 hover:bg-zinc-800 border-zinc-750 text-zinc-300'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-rose-400" />
          <span>5. Critical Event</span>
        </button>
      </div>

      {/* Expandable Fine-Tuning Sliders */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          {/* EAR slider */}
          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>Eye Aspect Ratio (EAR):</span>
              <span className="font-mono text-zinc-100 font-bold">{telemetry.ear.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.40"
              step="0.01"
              value={telemetry.ear}
              onChange={(e) => {
                const ear = parseFloat(e.target.value);
                const isClosed = ear < 0.20;
                onUpdateSimTelemetry({
                  ear,
                  isEyeClosed: isClosed,
                  eyeClosureDurationMs: isClosed ? Math.max(1200, telemetry.eyeClosureDurationMs) : 0,
                });
                setActivePreset(null);
              }}
              className="w-full h-1 bg-zinc-800 rounded appearance-none accent-zinc-300 cursor-pointer"
            />
          </div>

          {/* MAR slider */}
          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>Mouth Aspect Ratio (MAR):</span>
              <span className="font-mono text-zinc-100 font-bold">{telemetry.mar.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.90"
              step="0.02"
              value={telemetry.mar}
              onChange={(e) => {
                const mar = parseFloat(e.target.value);
                const isYawning = mar > 0.52;
                onUpdateSimTelemetry({
                  mar,
                  isYawning,
                  yawnDurationMs: isYawning ? Math.max(1500, telemetry.yawnDurationMs) : 0,
                });
                setActivePreset(null);
              }}
              className="w-full h-1 bg-zinc-800 rounded appearance-none accent-zinc-300 cursor-pointer"
            />
          </div>

          {/* Yaw slider */}
          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>Head Yaw (Rotation):</span>
              <span className="font-mono text-zinc-100 font-bold">{telemetry.yaw}&deg;</span>
            </div>
            <input
              type="range"
              min="-45"
              max="45"
              step="1"
              value={telemetry.yaw}
              onChange={(e) => {
                const yaw = parseInt(e.target.value, 10);
                const isDistracted = Math.abs(yaw) > 18 || Math.abs(telemetry.pitch) > 16;
                onUpdateSimTelemetry({
                  yaw,
                  isDistracted,
                  distractionDurationMs: isDistracted ? Math.max(1800, telemetry.distractionDurationMs) : 0,
                });
                setActivePreset(null);
              }}
              className="w-full h-1 bg-zinc-800 rounded appearance-none accent-zinc-300 cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
