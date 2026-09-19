import React, { useState } from 'react';
import {
  BrainCircuit,
  AlertTriangle,
  History,
  MapPin,
  Activity,
  Trash2,
  Play,
  CheckCircle2,
  Sparkles,
  Info,
  Layers,
  Flame,
} from 'lucide-react';
import { useRiskMemory } from '../hooks/useRiskMemory';
import type { SafetyEventType } from '../types';

export const RiskMemoryPanel: React.FC = () => {
  const {
    events,
    patterns,
    summary,
    currentMatch,
    activeMode,
    setActiveMode,
    injectDemoBaselineCutIns,
    triggerDemoMatchingCutIn,
    clearDemoData,
    clearRealData,
    dismissMatchAlert,
  } = useRiskMemory();

  const [activeTab, setActiveTab] = useState<'PATTERNS' | 'LEDGER' | 'LOCATION_HOTSPOTS'>('PATTERNS');
  const [selectedEventType, setSelectedEventType] = useState<SafetyEventType | 'ALL'>('ALL');

  const filteredEvents = events.filter(
    (e) => selectedEventType === 'ALL' || e.eventType === selectedEventType
  );

  const personalPatterns = patterns.filter((p) => p.patternType === 'PERSONAL_BEHAVIOR');
  const locationPatterns = patterns.filter((p) => p.patternType === 'LOCATION_HOTSPOT');

  return (
    <div className="space-y-4">
      {/* 1. Header Banner & Mode Selector */}
      <div className="hud-card p-5 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-16 -right-16 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -z-0" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight m-0">
                  Risk Memory &amp; Near-Miss Pattern Engine
                </h2>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider ${
                    activeMode === 'DEMO'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {activeMode === 'DEMO' ? 'DEMO MODE (SYNTHETIC)' : 'LIVE RIDER MEMORY'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 m-0">
                Persistent safety event extraction, cross-trip pattern discovery, and recurrence prediction.
              </p>
            </div>
          </div>

          {/* Mode Switcher & Clear Actions */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              onClick={() => setActiveMode(activeMode === 'REAL' ? 'DEMO' : 'REAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border flex items-center gap-1.5 ${
                activeMode === 'DEMO'
                  ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-zinc-700'
                  : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border-amber-500/40'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{activeMode === 'DEMO' ? 'Switch to Live Real Mode' : 'Open Demo Test Mode'}</span>
            </button>

            {activeMode === 'DEMO' ? (
              <button
                onClick={clearDemoData}
                className="px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-rose-900/40 text-zinc-400 hover:text-rose-300 text-xs font-semibold transition-colors cursor-pointer border border-zinc-700 hover:border-rose-700/50 flex items-center gap-1.5"
                title="Clear demo events only. Real history remains intact."
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Demo Data</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  if (confirm('Clear real rider risk memory? This action cannot be undone.')) {
                    clearRealData();
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-rose-900/40 text-zinc-400 hover:text-rose-300 text-xs font-semibold transition-colors cursor-pointer border border-zinc-700 hover:border-rose-700/50 flex items-center gap-1.5"
                title="Reset real rider history"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Memory</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. DEMO CONTROLS (Displayed when Demo Mode is Active) */}
      {activeMode === 'DEMO' && (
        <div className="p-4 rounded-xl bg-[#12131a] border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-amber-400">⚡</span>
              <span className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                60-Second Judge Demo Controller (Deterministic Synthetic Scenarios)
              </span>
            </div>
            <span className="text-[10px] font-mono text-amber-300/80 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
              DEMO DATA — NOT REAL INCIDENTS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => {
                injectDemoBaselineCutIns();
                setActiveTab('PATTERNS');
              }}
              className="p-3 rounded-lg bg-zinc-900/90 hover:bg-amber-950/40 border border-zinc-800 hover:border-amber-500/40 text-left transition-all cursor-pointer group"
            >
              <div className="font-bold text-zinc-200 group-hover:text-amber-300 flex items-center justify-between">
                <span>1. Inject 3 Baseline Vehicle Cut-Ins</span>
                <Play className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 m-0">
                Populates 3 near-miss events at Ring Road Junction. Immediately forms the baseline pattern.
              </p>
            </button>

            <button
              onClick={() => {
                triggerDemoMatchingCutIn();
                setActiveTab('PATTERNS');
              }}
              className="p-3 rounded-lg bg-zinc-900/90 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-500/40 text-left transition-all cursor-pointer group"
            >
              <div className="font-bold text-zinc-200 group-hover:text-rose-300 flex items-center justify-between">
                <span>2. Trigger 4th Matching Incident</span>
                <Flame className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 m-0">
                Fires incoming live event at Ring Road. Triggers recurrence alert: &quot;RECURRING RISK PATTERN&quot;.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* 3. RECURRING RISK PATTERN WARNING (Active when Current Event matches History) */}
      {currentMatch && currentMatch.isMatch && currentMatch.matchedPattern && (
        <div className="p-5 rounded-xl bg-rose-950/40 border-2 border-rose-500/60 shadow-2xl relative overflow-hidden space-y-4 animate-in fade-in duration-300">
          <div className="pointer-events-none absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-2xl" />

          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black font-mono uppercase bg-rose-600 text-white tracking-widest">
                    RECURRING RISK PATTERN
                  </span>
                  <span className="text-xs font-mono text-rose-300 font-bold">
                    Match Confidence: {currentMatch.matchScore}% ({currentMatch.matchLevel})
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1 m-0">
                  {currentMatch.matchedPattern.title}
                </h3>
                <p className="text-xs text-rose-200/90 mt-0.5 m-0">
                  {currentMatch.matchedPattern.description}
                </p>
              </div>
            </div>

            <button
              onClick={dismissMatchAlert}
              className="text-zinc-400 hover:text-white text-xs px-2 py-1 rounded bg-zinc-900/60 border border-zinc-800 cursor-pointer"
            >
              Dismiss
            </button>
          </div>

          {/* EXPLANATION SECTION: "WHY AM I SEEING THIS?" */}
          <div className="p-3.5 rounded-lg bg-[#090a0e]/80 border border-rose-500/30 text-xs space-y-2 relative z-10">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-300">
              <Info className="w-3.5 h-3.5 text-rose-400" />
              <span>Why am I seeing this pattern alert?</span>
            </div>
            <ul className="space-y-1 text-zinc-300 pl-4 list-disc font-sans text-xs m-0">
              {currentMatch.reasons.map((reason, idx) => (
                <li key={idx} className="leading-relaxed">
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 4. COLD START STATE (When < 3 events exist and no patterns) */}
      {events.length < 3 && patterns.length === 0 && (
        <div className="p-4 rounded-xl bg-[#090a0e]/90 border border-emerald-500/30 flex items-start gap-3.5 text-xs text-zinc-300">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-400 uppercase tracking-wider font-mono text-[11px]">
                Risk Memory Initializing (Cold Start)
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {events.length} / 3 events logged
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 m-0">
              No previous near-miss patterns available yet. SafeDrive strictly adheres to a minimum 3-event
              deterministic threshold before declaring a habit or location risk pattern.
            </p>
          </div>
        </div>
      )}

      {/* 5. Executive Summary Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3 rounded-xl bg-[#090a0e]/90 border border-zinc-800">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-sans">
            Total Near-Misses
          </span>
          <strong className="text-2xl font-bold text-white block mt-1">
            {summary.totalEvents}
          </strong>
          <span className="text-[10px] text-zinc-500 block truncate">Stored across trips</span>
        </div>

        <div className="p-3 rounded-xl bg-[#090a0e]/90 border border-zinc-800">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-sans">
            Recurring Patterns
          </span>
          <strong
            className={`text-2xl font-bold block mt-1 ${
              summary.activePatternsCount > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {summary.activePatternsCount}
          </strong>
          <span className="text-[10px] text-zinc-500 block truncate">
            {summary.activePatternsCount > 0 ? 'Active recurrence' : 'No pattern formed'}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[#090a0e]/90 border border-zinc-800">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-sans">
            Personal Habits
          </span>
          <strong className="text-2xl font-bold text-zinc-200 block mt-1">
            {summary.personalPatternsCount}
          </strong>
          <span className="text-[10px] text-zinc-500 block truncate">Rider-specific habits</span>
        </div>

        <div className="p-3 rounded-xl bg-[#090a0e]/90 border border-zinc-800">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-sans">
            Location Hotspots
          </span>
          <strong className="text-2xl font-bold text-zinc-200 block mt-1">
            {summary.locationPatternsCount}
          </strong>
          <span className="text-[10px] text-zinc-500 block truncate">Clustered &lt; 250m</span>
        </div>
      </div>

      {/* 6. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('PATTERNS')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'PATTERNS'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Discovered Patterns ({patterns.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('LEDGER')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'LEDGER'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Incident Memory Ledger ({events.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('LOCATION_HOTSPOTS')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'LOCATION_HOTSPOTS'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Location Hotspots ({locationPatterns.length})</span>
        </button>
      </div>

      {/* 7. TAB CONTENT: DISCOVERED PATTERNS */}
      {activeTab === 'PATTERNS' && (
        <div className="space-y-4">
          {patterns.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-[#090a0e]/60 border border-zinc-800 text-zinc-500 text-xs">
              <BrainCircuit className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="font-semibold text-zinc-400">No Recurring Patterns Formed Yet</p>
              <p className="text-[11px] mt-1 max-w-md mx-auto">
                Patterns are deterministically discovered when at least 3 sufficiently similar near-misses
                or conflicts occur over time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Personal Patterns Column */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Personal Rider Behavior Patterns ({personalPatterns.length})</span>
                </div>

                {personalPatterns.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic p-3 rounded-lg bg-[#090a0e]/40 border border-zinc-800/80">
                    No repeated rider habits discovered.
                  </p>
                ) : (
                  personalPatterns.map((pat) => (
                    <div
                      key={pat.patternId}
                      className="p-3.5 rounded-xl bg-[#090a0e]/90 border border-zinc-800 space-y-2 hover:border-emerald-500/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs text-white">{pat.title}</span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          {pat.recurrenceCount}x Recurrence
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 m-0">{pat.description}</p>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-1 border-t border-zinc-800/80">
                        <span>Confidence: {pat.confidenceLevel}</span>
                        <span>
                          Observed: {new Date(pat.firstObservedTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &rarr; {new Date(pat.lastObservedTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Location Hotspots Column */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <span>Location Conflict Hotspots ({locationPatterns.length})</span>
                </div>

                {locationPatterns.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic p-3 rounded-lg bg-[#090a0e]/40 border border-zinc-800/80">
                    No recurring location hotspots discovered.
                  </p>
                ) : (
                  locationPatterns.map((pat) => (
                    <div
                      key={pat.patternId}
                      className="p-3.5 rounded-xl bg-[#090a0e]/90 border border-zinc-800 space-y-2 hover:border-amber-500/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs text-white">{pat.title}</span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          {pat.recurrenceCount}x Conflict Zone
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 m-0">{pat.description}</p>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-1 border-t border-zinc-800/80">
                        <span>Radius: &lt; 250m</span>
                        <span>
                          Last: {new Date(pat.lastObservedTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 8. TAB CONTENT: INCIDENT MEMORY LEDGER */}
      {activeTab === 'LEDGER' && (
        <div className="space-y-3">
          {/* Event Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            {(
              [
                'ALL',
                'VEHICLE_CUT_IN',
                'NEAR_MISS',
                'CLOSE_PASS',
                'HARD_BRAKE',
                'DISTRACTION',
                'PEDESTRIAN_CONFLICT',
              ] as const
            ).map((t) => (
              <button
                key={t}
                onClick={() => setSelectedEventType(t)}
                className={`px-2.5 py-1 rounded-lg font-mono transition-colors cursor-pointer shrink-0 ${
                  selectedEventType === t
                    ? 'bg-zinc-700 text-white font-bold'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-[#090a0e]/60 border border-zinc-800 text-zinc-500 text-xs">
              No incident records match the filter.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEvents.map((evt) => (
                <div
                  key={evt.eventId}
                  className="p-3 rounded-xl bg-[#090a0e]/90 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-2.5">
                    <span
                      className={`w-2 h-2 rounded-full mt-1 sm:mt-0 shrink-0 ${
                        evt.severity === 'CRITICAL'
                          ? 'bg-rose-500 animate-pulse'
                          : evt.severity === 'HIGH'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white font-mono">
                          {evt.eventType.replace(/_/g, ' ')}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                            evt.severity === 'CRITICAL'
                              ? 'bg-rose-500/20 text-rose-300'
                              : evt.severity === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {evt.severity}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          Source: {evt.sourceModule}
                        </span>
                        {evt.isDemo && (
                          <span className="text-[9px] font-mono font-bold bg-amber-900/40 text-amber-300 px-1.5 rounded border border-amber-700/50">
                            DEMO
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-1">
                        {evt.location.locationName && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-zinc-500" />
                            {evt.location.locationName}
                          </span>
                        )}
                        {evt.trafficContext.timeToCollisionSec !== null && (
                          <span>&bull; TTC: {evt.trafficContext.timeToCollisionSec}s</span>
                        )}
                        {evt.speedKmH !== null && <span>&bull; Speed: {evt.speedKmH} km/h</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono text-[11px] text-zinc-400 block">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-[10px] text-zinc-600 font-mono block">
                      {new Date(evt.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 9. TAB CONTENT: LOCATION HOTSPOTS */}
      {activeTab === 'LOCATION_HOTSPOTS' && (
        <div className="space-y-3">
          {locationPatterns.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-[#090a0e]/60 border border-zinc-800 text-zinc-500 text-xs">
              <MapPin className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="font-semibold text-zinc-400">No Location Clusters Identified Yet</p>
              <p className="text-[11px] mt-1 max-w-md mx-auto">
                Geographic hotspot patterns are synthesized when 3+ near-misses occur within 250 meters
                of each other along regular transit corridors.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {locationPatterns.map((hotspot) => (
                <div
                  key={hotspot.patternId}
                  className="p-4 rounded-xl bg-[#090a0e]/90 border border-amber-500/30 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-white text-xs">{hotspot.title}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {hotspot.recurrenceCount} Incidents Logged
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 m-0">{hotspot.description}</p>
                  {hotspot.approximateLocation && (
                    <div className="text-[10px] font-mono text-zinc-500 pt-1 border-t border-zinc-800 flex items-center justify-between">
                      <span>
                        Coordinates: {hotspot.approximateLocation.latitude.toFixed(4)}°N,{' '}
                        {hotspot.approximateLocation.longitude.toFixed(4)}°E
                      </span>
                      <span>Cluster Radius: &le; 250m</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
