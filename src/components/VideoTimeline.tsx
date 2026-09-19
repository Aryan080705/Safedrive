import React from 'react';
import { Clock, Navigation } from 'lucide-react';
import type { VideoTimelineEvent } from '../types';

interface VideoTimelineProps {
  events: VideoTimelineEvent[];
  currentTimeSec: number;
  onSeek: (timestampSec: number) => void;
}

export const VideoTimeline: React.FC<VideoTimelineProps> = ({
  events,
  currentTimeSec,
  onSeek,
}) => {
  return (
    <div className="hud-card p-4 shadow-xl flex flex-col h-full overflow-hidden border-zinc-800">
      {/* Fixed Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center text-zinc-300">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200 m-0">
            RISK PROGRESSION TIMELINE
          </h3>
        </div>
        <span className="text-[11px] text-zinc-400 font-mono">
          {events.length} CHECKPOINTS &bull; JUMP
        </span>
      </div>

      {/* Internal Scrollable Events List */}
      <div className="flex-1 overflow-y-auto my-1 pr-1 min-h-0 space-y-2.5">
        {events.length === 0 ? (
          <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center py-6 text-xs text-zinc-500 font-mono">
            No events logged yet. Play dashcam video to trigger ADAS timeline.
          </div>
        ) : (
          events.map((evt) => {
            const isPastOrCurrent = currentTimeSec >= evt.timestampSec;
            const isNear = Math.abs(currentTimeSec - evt.timestampSec) < 1.5;

            const badgeStyles = {
              LOW: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
              CAUTION: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
              HIGH: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
              CRITICAL: 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_10px_rgba(239,68,68,0.3)]',
            }[evt.riskTier];

            const statusBadge = {
              DETECTED: 'bg-zinc-800 text-zinc-200 border-zinc-700',
              INFERRED: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
              UNCERTAIN: 'bg-zinc-800/80 text-zinc-400 border-zinc-700',
            }[evt.evidenceStatus];

            return (
              <button
                key={evt.id}
                onClick={() => onSeek(evt.timestampSec)}
                className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  isNear
                    ? 'ring-2 ring-zinc-400 bg-zinc-800 border-zinc-600'
                    : isPastOrCurrent
                    ? 'bg-[#12131a] border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850'
                    : 'opacity-55 bg-[#090a0f] border-zinc-850 hover:opacity-90'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Timestamp Pill */}
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-[#090a0f] text-zinc-200 border border-zinc-750 shrink-0">
                    {evt.timeFormatted}
                  </span>

                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-zinc-100">
                        {evt.eventTitle}
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded uppercase border ${badgeStyles}`}>
                        {evt.riskTier}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${statusBadge}`}>
                        [{evt.evidenceStatus}]
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {evt.confidencePercent}%
                      </span>
                      {evt.isObservedCollision && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-600 text-white animate-alert-pulse">
                          IMPACT
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1 m-0 leading-snug">
                      {evt.description}
                    </p>
                  </div>
                </div>

                <Navigation className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-1 hover:text-white transition-colors" />
              </button>
            );
          })
        )}
      </div>

      {/* Fixed Footer */}
      <div className="pt-2.5 border-t border-zinc-800 text-[10px] font-mono text-zinc-500 flex justify-between shrink-0 items-center">
        <span>MULTI-FRAME KINEMATICS</span>
        <span className="text-zinc-300 font-semibold">PRE-COLLISION ACTIVE</span>
      </div>
    </div>
  );
};
