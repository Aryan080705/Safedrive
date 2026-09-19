import React from 'react';
import { Activity, AlertCircle, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import type { RiskFactor } from '../types';

interface FactorBreakdownProps {
  factors: RiskFactor[];
}

export const FactorBreakdown: React.FC<FactorBreakdownProps> = ({ factors }) => {
  return (
    <div className="hud-card p-4 flex flex-col justify-between border-zinc-800">
      <div>
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200 m-0">
              CONTRIBUTING RISK FACTORS
            </h3>
          </div>
          <span className="text-[11px] font-mono text-zinc-300 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">
            {factors.length} ACTIVE
          </span>
        </div>

        {/* List of factors */}
        <div className="space-y-2">
          {factors.map((factor) => {
            const isNominal = factor.points === 0;

            const severityStyles = {
              low: 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300',
              moderate: 'bg-amber-950/20 border-amber-500/30 text-amber-300',
              high: 'bg-amber-950/30 border-amber-500/40 text-amber-300',
              critical: 'bg-rose-950/35 border-rose-500/45 text-rose-300 shadow-[0_0_15px_rgba(239,68,68,0.15)]',
            }[factor.severity];

            return (
              <div
                key={factor.id}
                className={`p-2.5 rounded-xl border flex items-start justify-between gap-3 ${severityStyles} transition-all`}
              >
                <div className="flex items-start gap-2.5">
                  {isNominal ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-100">
                        {factor.label}
                      </span>
                      {!isNominal && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 font-bold text-rose-400 border border-rose-500/40">
                          +{factor.points} PTS
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1 m-0 leading-snug">
                      {factor.description}
                    </p>
                  </div>
                </div>

                {!isNominal && (
                  <ArrowUpRight className="w-4 h-4 text-zinc-500 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-zinc-800 text-[10px] font-mono text-zinc-500 flex items-center justify-between">
        <span>DYNAMIC HEURISTIC ENGINE</span>
        <span>Fatigue + Gaze + Speed Factor</span>
      </div>
    </div>
  );
};
