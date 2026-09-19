import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Flame, Gauge } from 'lucide-react';
import type { RiskAssessment } from '../types';

interface RiskGaugeProps {
  assessment: RiskAssessment;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ assessment }) => {
  const { score, tier } = assessment;

  // Visual styling map (RoadGuard AI Palette)
  const tierConfig = {
    LOW: {
      label: 'LOW RISK',
      sublabel: 'Nominal Driver State',
      icon: CheckCircle2,
      badgeBg: 'bg-[#5D9B64]/15',
      badgeBorder: 'border-[#5D9B64]/40',
      badgeText: 'text-[#5D9B64]',
      glow: 'glow-emerald',
      barGradientStart: '#5D9B64',
      barGradientEnd: '#4B8552',
    },
    MODERATE: {
      label: 'MODERATE RISK',
      sublabel: 'Minor Fatigue / Inattention',
      icon: AlertCircle,
      badgeBg: 'bg-[#D8C9A8]/20',
      badgeBorder: 'border-[#D8C9A8]/40',
      badgeText: 'text-[#D8C9A8]',
      glow: 'glow-yellow',
      barGradientStart: '#D8C9A8',
      barGradientEnd: '#B8892D',
    },
    HIGH: {
      label: 'HIGH RISK',
      sublabel: 'Drowsiness / Disorientation',
      icon: AlertTriangle,
      badgeBg: 'bg-[#B8892D]/20',
      badgeBorder: 'border-[#B8892D]/40',
      badgeText: 'text-[#B8892D]',
      glow: 'glow-amber',
      barGradientStart: '#B8892D',
      barGradientEnd: '#D94B45',
    },
    CRITICAL: {
      label: 'CRITICAL RISK',
      sublabel: 'Micro-sleep / Severe Hazard',
      icon: Flame,
      badgeBg: 'bg-[#D94B45]/20',
      badgeBorder: 'border-[#D94B45]/50',
      badgeText: 'text-[#D94B45]',
      glow: 'glow-rose animate-alert-pulse',
      barGradientStart: '#D94B45',
      barGradientEnd: '#A52924',
    },
  }[tier];

  const Icon = tierConfig.icon;

  // Circumference calculation for SVG radial circle
  const radius = 68;
  const stroke = 10;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={`hud-card hud-brackets p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-200 border ${
      tier === 'CRITICAL'
        ? 'border-[#D94B45]/50'
        : tier === 'HIGH'
        ? 'border-[#B8892D]/40'
        : tier === 'MODERATE'
        ? 'border-[#D8C9A8]/30'
        : 'border-white/[0.08]'
    }`}>
      {/* Dynamic radial glow for high / critical tiers */}
      {tier === 'CRITICAL' && (
        <div className="absolute -right-8 -top-8 w-48 h-48 bg-[#D94B45]/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      )}
      {tier === 'HIGH' && (
        <div className="absolute -right-8 -top-8 w-48 h-48 bg-[#B8892D]/15 rounded-full blur-3xl pointer-events-none" />
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-[#777C6F]" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#A8AA9B]">
            DRIVER RISK METER
          </span>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${tierConfig.badgeBg} ${tierConfig.badgeBorder} ${tierConfig.badgeText}`}>
          <Icon className="w-3.5 h-3.5" />
          <span>{tierConfig.label}</span>
        </div>
      </div>

      {/* Radial Meter + Numerical Score */}
      <div className="flex items-center justify-center gap-6 my-2">
        <div className="relative w-36 h-36 flex items-center justify-center">
          <svg height="144" width="144" className="transform -rotate-90">
            <defs>
              <linearGradient id="cleanGaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={tierConfig.barGradientStart} />
                <stop offset="100%" stopColor={tierConfig.barGradientEnd} />
              </linearGradient>
            </defs>

            {/* Background track circle */}
            <circle
              stroke="rgba(245, 239, 227, 0.07)"
              fill="transparent"
              strokeWidth={stroke}
              r={normalizedRadius}
              cx="72"
              cy="72"
            />

            {/* Outer Tick Grid Circle */}
            <circle
              stroke="rgba(245, 239, 227, 0.12)"
              fill="transparent"
              strokeWidth="1.5"
              strokeDasharray="2 6"
              r={normalizedRadius + 8}
              cx="72"
              cy="72"
            />

            {/* Active score circle */}
            <circle
              stroke="url(#cleanGaugeGradient)"
              fill="transparent"
              strokeWidth={stroke}
              strokeDasharray={`${circumference} ${circumference}`}
              style={{
                strokeDashoffset,
                transition: 'stroke-dashoffset 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              strokeLinecap="round"
              r={normalizedRadius}
              cx="72"
              cy="72"
            />
          </svg>

          {/* Centered Numerical Value */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className={`text-4xl font-black font-mono tracking-tight ${tierConfig.badgeText}`}>
              {score}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#777C6F] -mt-0.5">
              SCORE / 100
            </span>
          </div>
        </div>

        {/* Breakdown of current level thresholds */}
        <div className="flex flex-col gap-2 text-xs font-mono text-[#777C6F]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#5D9B64]" />
            <span className={score < 40 ? 'text-[#5D9B64] font-bold' : 'text-[#777C6F]'}>00–39 Low</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D8C9A8]" />
            <span className={score >= 40 && score < 65 ? 'text-[#D8C9A8] font-bold' : 'text-[#777C6F]'}>40–64 Moderate</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#B8892D]" />
            <span className={score >= 65 && score < 85 ? 'text-[#B8892D] font-bold' : 'text-[#777C6F]'}>65–84 High</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D94B45]" />
            <span className={score >= 85 ? 'text-[#D94B45] font-bold' : 'text-[#777C6F]'}>85–100 Critical</span>
          </div>
        </div>
      </div>

      {/* Footer honesty disclaimer */}
      <div className="mt-2 pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-[#777C6F]">
        <span>Kinematic Telemetry</span>
        <span>Real-Time ADAS Index</span>
      </div>
    </div>
  );
};
