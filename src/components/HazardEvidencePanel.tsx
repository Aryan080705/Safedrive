import React from 'react';
import { CheckCircle2, EyeOff, ShieldAlert } from 'lucide-react';
import type { RoadRiskAssessment } from '../types';

interface HazardEvidencePanelProps {
  assessment: RoadRiskAssessment;
}

export const HazardEvidencePanel: React.FC<HazardEvidencePanelProps> = ({ assessment }) => {
  return (
    <div className="hud-card p-4 border border-white/10 shadow-lg">
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#F07B3F]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5EFE3] m-0">
            Road Hazard Evidence &amp; Context Breakdown
          </h3>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono">
          <span className="text-[#777C6F]">Classification Principle:</span>
          <span className="text-[#B8892D] font-semibold px-2 py-0.5 rounded bg-[#4F5B2A]/40 border border-[#B8892D]/30">
            Object Detection &ne; Collision Risk
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Column 1: Contributing Factors (Hazard Evidence) */}
        <div className="bg-[#0C0F0A] rounded-xl p-3 border border-white/[0.08] flex flex-col h-36">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#B8892D] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#B8892D] shrink-0" />
              <span>
                Hazard Evidence ({assessment.relevantHazardCount} active hazard{assessment.relevantHazardCount === 1 ? '' : 's'})
              </span>
            </span>
            <span className="text-[10px] font-mono text-[#777C6F]">Contributes to Risk</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0">
            {assessment.activeFactors.length > 0 ? (
              assessment.activeFactors.map((factor, i) => (
                <div
                  key={i}
                  className="text-[#F5EFE3] text-xs flex items-center gap-2 bg-[#12160F] px-2.5 py-1.5 rounded-lg border border-white/[0.08]"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B8892D] shrink-0" />
                  <span className="line-clamp-2">{factor}</span>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-[#777C6F] text-xs italic">
                No active collision hazard detected in travel corridor.
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Non-Contributing Context Objects (Parked / Sidewalk) */}
        <div className="bg-[#0C0F0A] rounded-xl p-3 border border-white/[0.08] flex flex-col h-36">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#B9C0C8] flex items-center gap-1.5">
              <EyeOff className="w-3.5 h-3.5 text-[#7F8995] shrink-0" />
              <span>
                Non-Hazard Context Objects ({assessment.nonContributingObjects.length})
              </span>
            </span>
            <span className="text-[10px] font-mono text-[#7F8995]">Ignored / Suppressed</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0">
            {assessment.nonContributingObjects.length > 0 ? (
              assessment.nonContributingObjects.map((item, i) => (
                <div
                  key={i}
                  className="text-[#B9C0C8] text-xs flex items-center gap-2 bg-[#182536]/60 px-2.5 py-1.5 rounded-lg border border-white/5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7F8995] shrink-0" />
                  <span className="line-clamp-2">{item}</span>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-[#7F8995] text-xs italic">
                No non-hazard roadside objects currently observed.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
