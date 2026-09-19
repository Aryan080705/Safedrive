import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, ShieldAlert, Zap } from 'lucide-react';
import type { DriverTelemetry, RiskAssessment } from '../types';

interface ActionPanelProps {
  assessment: RiskAssessment;
  telemetry: DriverTelemetry;
  onTriggerEmergency: () => void;
}

export const ActionPanel: React.FC<ActionPanelProps> = ({
  assessment,
  telemetry,
  onTriggerEmergency,
}) => {
  const { tier, recommendedAction, actionSubtitle } = assessment;

  // Derive fatigue, distraction, and attention state indicators
  const fatigueLevel = telemetry.isEyeClosed || telemetry.isYawning
    ? 'CRITICAL FATIGUE'
    : telemetry.ear < 0.23
    ? 'ELEVATED DROWSY'
    : 'NOMINAL ALERT';

  const distractionLevel = telemetry.isDistracted
    ? telemetry.distractionDurationMs > 1500
    ? 'OFF-ROAD GAZE'
    : 'HEAD DEVIATION'
    : 'FORWARD ALIGNED';

  const overallAttention = tier === 'LOW'
    ? 'FOCUSED 98%'
    : tier === 'MODERATE'
    ? 'DEGRADED 72%'
    : tier === 'HIGH'
    ? 'COMPROMISED 44%'
    : 'IMPAIRED <15%';

  const tierStyles = tier === 'CRITICAL'
    ? 'border-[#D94B45]/50 bg-[#D94B45]/10 glow-rose'
    : tier === 'HIGH'
    ? 'border-[#B8892D]/40 bg-[#B8892D]/10 glow-amber'
    : tier === 'MODERATE'
    ? 'border-[#D8C9A8]/30 bg-[#D8C9A8]/5'
    : 'border-white/[0.08] bg-[#12160F]';

  return (
    <div className={`hud-card p-4 sm:p-5 rounded-2xl border transition-all duration-200 relative overflow-hidden ${tierStyles}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Recommended Driver Action */}
        <div className="flex items-start gap-3.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
            tier === 'CRITICAL'
              ? 'bg-[#D94B45]/20 border border-[#D94B45]/50 text-[#D94B45] animate-alert-pulse'
              : tier === 'HIGH'
              ? 'bg-[#B8892D]/20 border border-[#B8892D]/50 text-[#B8892D]'
              : tier === 'MODERATE'
              ? 'bg-[#D8C9A8]/15 border border-[#D8C9A8]/30 text-[#D8C9A8]'
              : 'bg-[#5D9B64]/15 border border-[#5D9B64]/30 text-[#5D9B64]'
          }`}>
            {tier === 'CRITICAL' ? (
              <ShieldAlert className="w-5 h-5" />
            ) : tier === 'HIGH' ? (
              <AlertTriangle className="w-5 h-5" />
            ) : tier === 'MODERATE' ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#777C6F]">
                RECOMMENDED SAFETY PROTOCOL
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                tier === 'CRITICAL'
                  ? 'bg-[#D94B45] text-white'
                  : tier === 'HIGH'
                  ? 'bg-[#B8892D] text-[#0C0F0A]'
                  : tier === 'MODERATE'
                  ? 'bg-[#D8C9A8]/20 text-[#D8C9A8] border border-[#D8C9A8]/40'
                  : 'bg-[#5D9B64]/20 text-[#5D9B64] border border-[#5D9B64]/40'
              }`}>
                {tier} TIER
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-[#F5EFE3] mt-1 m-0 tracking-tight">
              {recommendedAction}
            </h2>
            <p className="text-xs text-[#A8AA9B] mt-1 m-0 leading-relaxed font-normal">
              {actionSubtitle}
            </p>
          </div>
        </div>

        {/* Real-time Driver State Indicators */}
        <div className="flex items-center flex-wrap gap-2 text-xs border-t lg:border-t-0 lg:border-l border-white/[0.08] pt-3 lg:pt-0 lg:pl-4 font-mono">
          <div className="bg-[#0C0F0A] px-3 py-1.5 rounded-xl border border-white/[0.08]">
            <span className="text-[#777C6F] block text-[9px] uppercase tracking-wider">Fatigue State</span>
            <span className={`font-bold text-xs ${
              telemetry.isEyeClosed || telemetry.isYawning
                ? 'text-[#D94B45]'
                : telemetry.ear < 0.23
                ? 'text-[#B8892D]'
                : 'text-[#5D9B64]'
            }`}>
              {fatigueLevel}
            </span>
          </div>

          <div className="bg-[#0C0F0A] px-3 py-1.5 rounded-xl border border-white/[0.08]">
            <span className="text-[#777C6F] block text-[9px] uppercase tracking-wider">Cabin Gaze</span>
            <span className={`font-bold text-xs ${
              telemetry.isDistracted ? 'text-[#B8892D]' : 'text-[#5D9B64]'
            }`}>
              {distractionLevel}
            </span>
          </div>

          <div className="bg-[#0C0F0A] px-3 py-1.5 rounded-xl border border-white/[0.08]">
            <span className="text-[#777C6F] block text-[9px] uppercase tracking-wider">Attention Index</span>
            <span className="font-bold text-xs text-[#F5EFE3]">
              {overallAttention}
            </span>
          </div>

          {/* Test Emergency Button */}
          <button
            onClick={onTriggerEmergency}
            className="px-3 py-2 rounded-xl bg-[#D94B45]/15 hover:bg-[#D94B45]/25 text-[#D94B45] border border-[#D94B45]/40 text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5"
            title="Trigger Simulated SOS Escalation"
          >
            <Zap className="w-3.5 h-3.5 text-[#D94B45]" />
            <span>TRIGGER SOS</span>
          </button>
        </div>
      </div>
    </div>
  );
};
