import React from 'react';
import { Layers, Zap } from 'lucide-react';
import type { RiskAssessment, RoadRiskAssessment } from '../types';

interface SafetyFusionPanelProps {
  driverAssessment: RiskAssessment;
  roadAssessment: RoadRiskAssessment;
}

export const SafetyFusionPanel: React.FC<SafetyFusionPanelProps> = ({
  driverAssessment,
  roadAssessment,
}) => {
  // Transparent Composite Formula:
  // Overall Risk = (Driver Risk * 0.45) + (Road Collision Risk * 0.55) + Compound Impairment Multiplier
  const driverScore = driverAssessment.score;
  const roadScore = roadAssessment.score;

  let compoundMultiplier = 1.0;
  let compoundTag: string | null = null;

  // Compound danger: If driver is inattentive/fatigued (driverScore >= 45) AND vehicle ahead is closing rapidly (roadScore >= 45)
  if (driverScore >= 45 && roadScore >= 45) {
    compoundMultiplier = 1.35;
    compoundTag = 'Compound Inattention × Road Hazard Multiplier (1.35x)';
  } else if (driverScore >= 30 && roadScore >= 35) {
    compoundMultiplier = 1.15;
  }

  const rawFusionScore = Math.round((driverScore * 0.42 + roadScore * 0.58) * compoundMultiplier);
  const overallScore = Math.min(100, Math.max(5, rawFusionScore));

  let tierLabel = 'LOW RISK';
  let tierColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  let badgeColor = 'bg-emerald-600 text-white';

  if (overallScore >= 85) {
    tierLabel = 'CRITICAL OVERALL RISK';
    tierColor = 'text-rose-400 bg-rose-500/15 border-rose-500/50';
    badgeColor = 'bg-rose-600 text-white animate-pulse';
  } else if (overallScore >= 65) {
    tierLabel = 'HIGH OVERALL RISK';
    tierColor = 'text-amber-400 bg-amber-500/15 border-amber-500/40';
    badgeColor = 'bg-amber-600 text-white';
  } else if (overallScore >= 40) {
    tierLabel = 'MODERATE OVERALL RISK';
    tierColor = 'text-yellow-300 bg-yellow-500/10 border-yellow-500/30';
    badgeColor = 'bg-yellow-600 text-slate-950 font-bold';
  }

  // Active contributors from both subsystems
  const contributors: { tag: string; label: string; isHazard: boolean }[] = [];

  const activeDriverFactors = driverAssessment.factors.filter((f) => f.points > 0);
  if (activeDriverFactors.length > 0) {
    activeDriverFactors.forEach((f) =>
      contributors.push({ tag: '[Driver]', label: `${f.label} (+${f.points} pts)`, isHazard: true })
    );
  } else {
    contributors.push({
      tag: '[Driver]',
      label: 'Attentive — eyes forward, normal blink frequency',
      isHazard: false,
    });
  }

  if (roadAssessment.activeFactors.length > 0) {
    roadAssessment.activeFactors.forEach((f) =>
      contributors.push({ tag: '[Road]', label: f, isHazard: true })
    );
  } else {
    contributors.push({
      tag: '[Road]',
      label: 'Ego corridor clear — nominal road flow',
      isHazard: false,
    });
  }

  if (compoundTag) {
    contributors.push({ tag: '[Fusion]', label: compoundTag, isHazard: true });
  }

  return (
    <div className={`hud-card p-4 sm:p-5 shadow-xl space-y-3.5 border transition-all ${tierColor}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-200">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white m-0">
              Safety Fusion Engine &middot; Driver State + Road Hazard Telemetry
            </h2>
            <p className="text-xs text-zinc-400 m-0">
              Unified analytical cross-correlation between internal driver attentiveness and external road trajectory.
            </p>
          </div>
        </div>

        <div className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${badgeColor}`}>
          {tierLabel}
        </div>
      </div>

      {/* Live Driver Drowsiness Alert Banner in Fusion */}
      {(driverScore >= 45 || activeDriverFactors.some((f) => f.id === 'prolonged_eye_closure')) && (
        <div className="bg-rose-950/90 border border-rose-500 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xl animate-alert-pulse">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-rose-600/40 border border-rose-400 flex items-center justify-center text-rose-300 font-bold text-sm shrink-0">
              ⚠
            </div>
            <div>
              <div className="text-xs font-black text-rose-100 uppercase tracking-wide font-mono">
                {driverScore >= 75 ? '⚠ SEVERE DRIVER DROWSINESS DETECTED' : '⚠ DRIVER DROWSINESS DETECTED'}
              </div>
              <div className="text-[11px] text-rose-300 font-mono">
                Driver Attention: <span className="font-bold text-white uppercase">{driverAssessment.tier} ({driverScore}/100)</span> &bull; {activeDriverFactors[0]?.label || 'Prolonged Eye Closure Active'}
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-900 border border-rose-600 text-rose-200 text-[11px] font-bold uppercase font-mono shrink-0">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
            AUDIO ADVISORY ACTIVE
          </span>
        </div>
      )}

      {/* Tri-Gauge Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
        {/* Driver Risk Subscore */}
        <div className="bg-[#090a0f] p-3.5 rounded-xl border border-zinc-800 flex flex-col justify-center">
          <span className="text-xs text-zinc-400 uppercase font-mono font-semibold block mb-1">
            Driver Attentiveness Risk
          </span>
          <span className="text-3xl font-extrabold font-mono text-white">
            {driverScore}
          </span>
          <span className="text-xs text-zinc-500 font-mono"> / 100</span>
          <p className="text-[11px] text-zinc-500 mt-1 m-0 font-mono">
            Eyelids &middot; Yawning &middot; Head Pose
          </p>
        </div>

        {/* Road Collision Subscore */}
        <div className="bg-[#090a0f] p-3.5 rounded-xl border border-zinc-800 flex flex-col justify-center">
          <span className="text-xs text-zinc-400 uppercase font-mono font-semibold block mb-1">
            Road Collision Risk
          </span>
          <span className="text-3xl font-extrabold font-mono text-amber-400">
            {roadScore}
          </span>
          <span className="text-xs text-zinc-500 font-mono"> / 100</span>
          <p className="text-[11px] text-zinc-500 mt-1 m-0 font-mono">
            Closing Gap &middot; TTC &middot; Trajectory
          </p>
        </div>

        {/* Overall Fused Risk */}
        <div className="bg-[#090a0f] p-3.5 rounded-xl border border-zinc-700 relative overflow-hidden flex flex-col justify-center">
          <span className="text-xs text-zinc-300 uppercase font-mono font-bold block mb-1">
            Overall Fused Safety Risk
          </span>
          <span className="text-4xl font-extrabold font-mono text-white">
            {overallScore}
          </span>
          <span className="text-xs text-zinc-500 font-mono"> / 100</span>
          <p className="text-[11px] text-zinc-400 mt-1 m-0 font-mono">
            Compound Heuristic Model
          </p>
        </div>
      </div>

      {/* Transparent Formula Attribution Breakdown */}
      <div className="bg-[#090a0f] p-3.5 rounded-xl border border-zinc-800 flex flex-col h-28 shrink-0">
        <div className="flex items-center justify-between mb-1.5 shrink-0">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">
            Combined Contributing Factors (Live Observations)
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            {contributors.length} active factor{contributors.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto pr-1 min-h-0 space-y-1.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {contributors.map((c, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border truncate ${
                  c.isHazard
                    ? 'text-amber-300 bg-amber-950/20 border-amber-800/40 font-medium'
                    : 'text-zinc-300 bg-zinc-900 border-zinc-800'
                }`}
              >
                <Zap className={`w-3.5 h-3.5 shrink-0 ${c.isHazard ? 'text-amber-400' : 'text-zinc-400'}`} />
                <span className="truncate font-mono">
                  <strong className="text-[11px] text-white mr-1">{c.tag}</strong>
                  {c.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-1 text-[11px] font-mono text-zinc-500 flex justify-between shrink-0">
        <span>Formula: (Driver Risk &times; 0.42) + (Road Risk &times; 0.58) &times; Compound Multiplier</span>
        <span>Prototype Heuristic Risk Engine</span>
      </div>
    </div>
  );
};
