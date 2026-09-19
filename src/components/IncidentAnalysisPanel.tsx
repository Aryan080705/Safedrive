import React from 'react';
import { FileText, ShieldAlert, AlertTriangle, Scale, Info, CheckCircle2 } from 'lucide-react';
import type { IncidentAnalysis } from '../types';

interface IncidentAnalysisPanelProps {
  analysis: IncidentAnalysis | null;
  onJumpToTimestamp: (sec: number) => void;
}

export const IncidentAnalysisPanel: React.FC<IncidentAnalysisPanelProps> = ({
  analysis,
  onJumpToTimestamp,
}) => {
  if (!analysis) {
    return (
      <div className="hud-card p-5 border border-white/[0.08] shadow-lg text-center text-[#777C6F]">
        <FileText className="w-8 h-8 mx-auto mb-2 text-[#777C6F]" />
        <p className="text-xs m-0">
          Post-incident analysis activates automatically when an observed collision or critical conflict sequence occurs in the video.
        </p>
      </div>
    );
  }

  return (
    <div className="hud-card p-5 border border-[#D94B45]/40 shadow-xl space-y-4">
      {/* Title Bar with Honesty Disclaimer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-[#D94B45]" />
          <div>
            <h2 className="text-sm font-bold text-[#F5EFE3] m-0 flex items-center gap-2">
              Post-Event Incident Analysis &amp; Contributing Factors
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#4F5B2A]/40 text-[#B8892D] border border-[#B8892D]/30">
                Confidence: {analysis.confidenceScore}%
              </span>
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#181D14] text-[11px] text-[#A8AA9B] border border-white/[0.08]">
          <Scale className="w-3.5 h-3.5 text-[#B8892D]" />
          <span>Non-Legal Prototype Assessment &middot; Observable Evidence Only</span>
        </div>
      </div>

      {/* 1. Sequential Timeline: Why Did the Incident Happen? */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#A8AA9B] mb-2">
          Sequential Evidence: Why Did The Incident Happen?
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {analysis.sequentialEvidence.map((step) => (
            <div
              key={step.step}
              onClick={() => onJumpToTimestamp(step.timestampSec)}
              className="bg-[#0C0F0A] p-2.5 rounded-xl border border-white/[0.08] hover:border-[#B8892D]/40 transition-colors cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] text-[#B8892D] font-mono mb-1">
                  <span>Step {step.step}</span>
                  <span className="text-[#7F8995]">
                    {Math.floor(step.timestampSec / 60).toString().padStart(2, '0')}:
                    {Math.floor(step.timestampSec % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`text-[9px] font-mono px-1 py-0.2 rounded border ${
                    step.evidenceStatus === 'DETECTED'
                      ? 'bg-[#FFD460]/15 text-[#FFD460] border-[#FFD460]/30'
                      : 'bg-[#F07B3F]/15 text-[#F07B3F] border-[#F07B3F]/30'
                  }`}>
                    [{step.evidenceStatus}]
                  </span>
                  <span className="text-[10px] text-[#7F8995] font-mono">
                    {step.confidence}% conf
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-[#F7F4EC] m-0">
                  {step.title}
                </h4>
                <p className="text-[11px] text-[#B9C0C8] mt-1 m-0 leading-tight">
                  {step.description}
                </p>
              </div>
              <span className="text-[10px] text-[#FFD460] mt-2 block font-medium">
                Jump to frame &rarr;
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Likely Contributing Factors (Based only on visible video) */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#B9C0C8] mb-2">
          Likely Contributing Factors (Visible Telemetry)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {analysis.likelyContributingFactors.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between gap-2 p-2 rounded-xl bg-[#101820] border border-white/10 text-xs text-[#B9C0C8]"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-[#F07B3F] shrink-0 mt-0.5" />
                <span>{item.factor}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0 font-mono text-[10px]">
                <span className={`px-1 py-0.2 rounded border ${
                  item.status === 'DETECTED'
                    ? 'bg-[#FFD460]/15 text-[#FFD460] border-[#FFD460]/30'
                    : 'bg-[#F07B3F]/15 text-[#F07B3F] border-[#F07B3F]/30'
                }`}>
                  [{item.status}]
                </span>
                <span className="text-[#7F8995]">{item.confidencePercent}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Vehicle A vs Vehicle B Contribution Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        {/* Vehicle A */}
        <div className="p-3 rounded-xl bg-[#101820] border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#F7F4EC]">
              {analysis.vehicleA.vehicleLabel}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
              analysis.vehicleA.contributionIndicator === 'higher contribution indicator'
                ? 'bg-[#EA5455]/20 text-[#EA5455] border-[#EA5455]/40'
                : 'bg-[#2D4059] text-[#B9C0C8] border-white/10'
            }`}>
              {analysis.vehicleA.contributionIndicator}
            </span>
          </div>
          <ul className="text-xs text-[#B9C0C8] space-y-1.5 pl-0 list-none m-0">
            {analysis.vehicleA.observedFactors.map((f, i) => (
              <li key={i} className="flex items-start justify-between gap-2">
                <span>&bull; {f.factor}</span>
                <span className="text-[10px] font-mono text-[#7F8995] shrink-0">
                  [{f.status}] {f.confidencePercent}%
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Vehicle B */}
        <div className="p-3 rounded-xl bg-[#101820] border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#F7F4EC]">
              {analysis.vehicleB.vehicleLabel}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
              analysis.vehicleB.contributionIndicator === 'lower contribution indicator'
                ? 'bg-[#4DBB82]/20 text-[#4DBB82] border-[#4DBB82]/40'
                : 'bg-[#2D4059] text-[#B9C0C8] border-white/10'
            }`}>
              {analysis.vehicleB.contributionIndicator}
            </span>
          </div>
          <ul className="text-xs text-[#B9C0C8] space-y-1.5 pl-0 list-none m-0">
            {analysis.vehicleB.observedFactors.map((f, i) => (
              <li key={i} className="flex items-start justify-between gap-2">
                <span>&bull; {f.factor}</span>
                <span className="text-[10px] font-mono text-[#7F8995] shrink-0">
                  [{f.status}] {f.confidencePercent}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 4. Non-Contributing Context (Detected but NOT hazards) */}
      {analysis.nonContributingContext && analysis.nonContributingContext.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#B9C0C8] mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#4DBB82]" />
            Non-Contributing Objects (Detected, Not Flagged as Hazards)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {analysis.nonContributingContext.map((ctx, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#101820] border border-white/5 text-[11px] text-[#7F8995]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#7F8995] shrink-0" />
                {ctx}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[#7F8995] mt-1.5">
            These objects were detected but had no valid closing vector, ego-corridor overlap, or motion profile indicating collision risk.
          </p>
        </div>
      )}

      {/* Strict Non-Legal Disclaimer Footer */}
      <div className="p-2.5 rounded-xl bg-[#101820] border border-white/10 flex items-start gap-2 text-[11px] text-[#7F8995]">
        <Info className="w-4 h-4 text-[#7F8995] shrink-0 mt-0.5" />
        <p className="m-0 leading-tight">
          <strong>Non-Legal Analytical Disclaimer:</strong> RoadGuard AI is a safety-assistance prototype providing heuristic assessments based solely on observable computer-vision measurements. This analysis does not establish legal liability, insurance fault, or statutory responsibility.
        </p>
      </div>
    </div>
  );
};
