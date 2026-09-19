import React from 'react';
import {
  CheckCircle2,
  Film,
  Video,
  MapPin,
  Bike,
  PhoneCall,
  Activity,
  Layers,
  ArrowRight,
  Eye,
  HelpCircle,
  Zap,
  Radio,
  Brain
} from 'lucide-react';
import type {
  RiskAssessment,
  RoadRiskAssessment,
  RiderAssessment,
  BlackspotSummary,
  SOSEmergencyState,
  AppMode,
  SafetyFusionAssessment
} from '../types';

interface PlatformOverviewProps {
  driverAssessment: RiskAssessment;
  roadAssessment: RoadRiskAssessment;
  riderAssessment: RiderAssessment;
  blackspotSummary: BlackspotSummary;
  emergencyState: SOSEmergencyState;
  fusedAssessment: SafetyFusionAssessment;
  onNavigate: (mode: AppMode) => void;
}

export const PlatformOverview: React.FC<PlatformOverviewProps> = ({
  driverAssessment,
  roadAssessment,
  riderAssessment,
  blackspotSummary,
  emergencyState,
  fusedAssessment,
  onNavigate,
}) => {
  const getTierColors = (tier: string) => {
    switch (tier) {
      case 'CRITICAL':
        return {
          text: 'text-rose-400',
          bg: 'bg-rose-500/15',
          border: 'border-rose-500/40',
          glow: 'glow-rose',
        };
      case 'HIGH':
        return {
          text: 'text-amber-400',
          bg: 'bg-amber-500/15',
          border: 'border-amber-500/40',
          glow: 'glow-amber',
        };
      case 'MODERATE':
        return {
          text: 'text-amber-300',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          glow: '',
        };
      default:
        return {
          text: 'text-emerald-400',
          bg: 'bg-emerald-500/15',
          border: 'border-emerald-500/40',
          glow: 'glow-emerald',
        };
    }
  };

  const fusedTierStyle = getTierColors(fusedAssessment.overallTier);

  return (
    <div className="space-y-5">
      {/* Brand Hero / Cockpit Mission Command Deck */}
      <div className="hud-card hud-brackets p-6 relative overflow-hidden bg-gradient-to-r from-[#182536] via-[#152131] to-[#182536] border-white/10 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-mono font-semibold tracking-wide">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>UNIFIED SAFETY INTELLIGENCE</span>
              </div>
              <span className="text-[11px] font-mono text-zinc-400 px-2.5 py-0.5 rounded-md bg-zinc-850 border border-zinc-750">
                5-in-1 Architecture
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white m-0">
              Proactive Multi-Modal Driver &amp; Road Risk Cockpit
            </h1>

            <p className="text-sm text-zinc-300 m-0 leading-relaxed font-normal">
              &ldquo;From eye-blink fatigue to collision kinematics &mdash; all processed locally in real time.&rdquo;
            </p>

            <p className="text-xs text-zinc-400 m-0 leading-relaxed">
              Fusing computer vision, multi-frame kinematics, two-wheeler protection, geospatial clustering, and autonomous emergency dispatch.
            </p>
          </div>

          {/* Global Fused Safety KPI Box */}
          <div className={`hud-card p-4 sm:p-5 rounded-2xl border ${fusedTierStyle.border} ${fusedTierStyle.glow} bg-[#090a0f] flex items-center gap-5 shrink-0`}>
            <div>
              <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>FUSED RISK INDEX</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className={`text-4xl sm:text-5xl font-extrabold font-mono ${fusedTierStyle.text}`}>
                  {fusedAssessment.overallScore}
                </span>
                <span className="text-xs font-mono text-zinc-500">/100</span>
              </div>
            </div>

            <div className="border-l border-zinc-800 pl-4 space-y-1.5">
              <div className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase tracking-wider ${fusedTierStyle.bg} ${fusedTierStyle.text} border ${fusedTierStyle.border}`}>
                {fusedAssessment.overallTier}
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">
                Compound &times;{fusedAssessment.compoundMultiplier.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Core Subsystem Cockpit Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Subsystem 1: GuardianDrive */}
        <div
          onClick={() => onNavigate('DRIVER_MONITOR')}
          className="hud-card hud-card-interactive group p-4 rounded-xl flex flex-col justify-between space-y-3 relative overflow-hidden border-zinc-800 hover:border-zinc-600"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />
          <div>
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-emerald-400">
                <Video className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-200 border border-zinc-750">
                {driverAssessment.score}/100
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mt-3 m-0 group-hover:text-emerald-400 transition-colors">
              GuardianDrive
            </h3>
            <p className="text-xs text-zinc-400 mt-1.5 m-0 leading-snug">
              Driver fatigue, EAR eye closure, yawning &amp; head pose distraction.
            </p>
          </div>
          <div className="pt-2.5 border-t border-zinc-800 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400 font-mono">Tier: <strong className="text-zinc-200">{driverAssessment.tier}</strong></span>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </div>
        </div>

        {/* Subsystem 2: CrashCam AI */}
        <div
          onClick={() => onNavigate('ROAD_VIDEO')}
          className="hud-card hud-card-interactive group p-4 rounded-xl flex flex-col justify-between space-y-3 relative overflow-hidden border-zinc-800 hover:border-zinc-600"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />
          <div>
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200">
                <Film className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-zinc-900 text-amber-300 border border-zinc-750">
                {roadAssessment.score}/100
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mt-3 m-0 group-hover:text-amber-300 transition-colors">
              CrashCam AI
            </h3>
            <p className="text-xs text-zinc-400 mt-1.5 m-0 leading-snug">
              Dashcam tracking, ego corridor conflict &amp; pedestrian FSM.
            </p>
          </div>
          <div className="pt-2.5 border-t border-zinc-800 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400 font-mono">Hazards: <strong className="text-amber-300">{roadAssessment.relevantHazardCount}</strong></span>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </div>
        </div>

        {/* Subsystem 3: Blackspot Predictor */}
        <div
          onClick={() => onNavigate('BLACKSPOT_MAP')}
          className="hud-card hud-card-interactive group p-4 rounded-xl flex flex-col justify-between space-y-3 relative overflow-hidden border-zinc-800 hover:border-zinc-600"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose-500 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />
          <div>
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-rose-400">
                <MapPin className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-zinc-900 text-rose-300 border border-zinc-750">
                {blackspotSummary.totalClusters} Hotspots
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mt-3 m-0 group-hover:text-rose-300 transition-colors">
              Blackspot GIS
            </h3>
            <p className="text-xs text-zinc-400 mt-1.5 m-0 leading-snug">
              Accident hotspot GIS dashboard with spatial DBSCAN clustering.
            </p>
          </div>
          <div className="pt-2.5 border-t border-zinc-800 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400 font-mono">Index: <strong className="text-rose-400">{blackspotSummary.regionalRiskIndex}/100</strong></span>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </div>
        </div>

        {/* Subsystem 4: SafeRider */}
        <div
          onClick={() => onNavigate('SAFERIDER')}
          className="hud-card hud-card-interactive group p-4 rounded-xl flex flex-col justify-between space-y-3 relative overflow-hidden border-zinc-800 hover:border-zinc-600"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />
          <div>
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-emerald-400">
                <Bike className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-zinc-900 text-emerald-300 border border-zinc-750">
                {riderAssessment.score}/100
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mt-3 m-0 group-hover:text-emerald-300 transition-colors">
              SafeRider
            </h3>
            <p className="text-xs text-zinc-400 mt-1.5 m-0 leading-snug">
              Two-wheeler helmet compliance &amp; rider distraction guard.
            </p>
          </div>
          <div className="pt-2.5 border-t border-zinc-800 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400 font-mono">Helmet: <strong className="text-emerald-400">{riderAssessment.helmetStatus === 'HELMET_DETECTED' ? 'Yes' : 'No'}</strong></span>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </div>
        </div>

        {/* Subsystem 5: SOS-Dispatch */}
        <div
          onClick={() => onNavigate('SOS_DISPATCH')}
          className="hud-card hud-card-interactive group p-4 rounded-xl flex flex-col justify-between space-y-3 relative overflow-hidden border-white/[0.08] hover:border-[#B8892D]/40"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#B8892D] to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />
          <div>
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#181D14] border border-white/[0.08] flex items-center justify-center text-[#B8892D]">
                <PhoneCall className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-[#0C0F0A] text-[#B8892D] border border-white/[0.08]">
                {emergencyState.status}
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#F5EFE3] mt-3 m-0 group-hover:text-[#B8892D] transition-colors">
              SOS-Dispatch
            </h3>
            <p className="text-xs text-[#A8AA9B] mt-1.5 m-0 leading-snug">
              Smartphone kinetic crash sensing &amp; automated 10s dispatch.
            </p>
          </div>
          <div className="pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-[11px]">
            <span className="text-[#777C6F] font-mono">Sensors: <strong className="text-[#B8892D]">Kinetic</strong></span>
            <ArrowRight className="w-3.5 h-3.5 text-[#777C6F] group-hover:text-[#F5EFE3] group-hover:translate-x-1 transition-all" />
          </div>
        </div>

        {/* Subsystem 6: Risk Memory Engine */}
        <div
          onClick={() => onNavigate('RISK_MEMORY')}
          className="hud-card hud-card-interactive group p-4 rounded-xl flex flex-col justify-between space-y-3 relative overflow-hidden border-white/[0.08] hover:border-[#B8892D]/40"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-400 to-emerald-400 opacity-70 group-hover:opacity-100 transition-opacity" />
          <div>
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400">
                <Brain className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-zinc-900 text-emerald-400 border border-zinc-750">
                Active
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mt-3 m-0 group-hover:text-amber-300 transition-colors">
              Risk Memory
            </h3>
            <p className="text-xs text-zinc-400 mt-1.5 m-0 leading-snug">
              Rider habit ledger, near-miss recurrence &amp; location hotspot memory.
            </p>
          </div>
          <div className="pt-2.5 border-t border-zinc-800 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400 font-mono">Engine: <strong className="text-amber-300">Memory Graph</strong></span>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </div>

      {/* Middle Section: Contributing Factors + Transparency Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left Column: Real-Time Multi-Modal Risk Factors (6 cols) */}
        <div className="lg:col-span-6 hud-card p-5 rounded-2xl flex flex-col justify-between space-y-4 border-zinc-800">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center text-zinc-300">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200 m-0">
                  CROSS-MODAL SAFETY SYNTHESIS
                </h3>
              </div>
              <span className="text-[11px] font-mono text-zinc-300 px-2 py-0.5 rounded bg-zinc-850 border border-zinc-750">
                LIVE FUSION ENGINE
              </span>
            </div>

            <div className="mt-3.5 space-y-2">
              {fusedAssessment.contributors.map((c, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#090a0f] border border-zinc-800 flex items-start gap-3 text-xs transition-colors hover:border-zinc-700"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400 mt-1 shrink-0" />
                  <span className="text-zinc-200 leading-relaxed font-medium">{c}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-4 text-zinc-400">
              <span>Hazards: <strong className="text-amber-300">{roadAssessment.relevantHazardCount}</strong></span>
              <span>Tracked: <strong className="text-zinc-200">{roadAssessment.detectedObjects.length}</strong></span>
            </div>
            <button
              onClick={() => onNavigate('SAFETY_FUSION')}
              className="text-zinc-300 hover:text-white font-semibold flex items-center gap-1.5 cursor-pointer text-xs"
            >
              <span>Full Fusion Matrix</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column: Transparency Matrix (6 cols) */}
        <div className="lg:col-span-6 hud-card p-5 rounded-2xl space-y-4 border-zinc-800">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center text-emerald-400">
                <Eye className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200 m-0">
                EPISTEMIC TRANSPARENCY MATRIX
              </h3>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">
              Decoupled Vision Reasoning
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* 1. CONFIRMED */}
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-mono font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>CONFIRMED</span>
              </div>
              <ul className="text-[11px] text-zinc-300 space-y-1.5 pl-3.5 list-disc marker:text-emerald-400">
                <li>Vehicle / Pedestrian</li>
                <li>Face EAR landmarks</li>
                <li>Inertial G-force magnitude</li>
                <li>Accident GIS coordinates</li>
                <li>Rider helmet boundary</li>
              </ul>
            </div>

            {/* 2. INFERRED */}
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-mono font-bold">
                <Activity className="w-3.5 h-3.5" />
                <span>INFERRED</span>
              </div>
              <ul className="text-[11px] text-zinc-300 space-y-1.5 pl-3.5 list-disc marker:text-amber-400">
                <li>Ego travel corridor overlap</li>
                <li>Approach velocity</li>
                <li>Gaze distraction intent</li>
                <li>Pre-collision trajectory</li>
                <li>Spatial clustering</li>
              </ul>
            </div>

            {/* 3. UNCERTAIN */}
            <div className="p-3.5 rounded-xl bg-zinc-850/60 border border-zinc-700/60 space-y-2">
              <div className="flex items-center gap-1.5 text-zinc-300 text-xs font-mono font-bold">
                <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                <span>UNCERTAIN</span>
              </div>
              <ul className="text-[11px] text-zinc-300 space-y-1.5 pl-3.5 list-disc marker:text-zinc-400">
                <li>Metric depth without LiDAR</li>
                <li>TTC during stop-and-go</li>
                <li>Occluded object bounds</li>
                <li>Faded lane boundaries</li>
                <li>Driver phone intent from pose</li>
              </ul>
            </div>
          </div>

          <p className="text-[11px] text-zinc-400 m-0 leading-relaxed pt-1 font-medium">
            RoadGuard AI rigorously distinguishes optical detections from mathematical inferences, guaranteeing zero hallucinated safety interventions.
          </p>
        </div>
      </div>
    </div>
  );
};
