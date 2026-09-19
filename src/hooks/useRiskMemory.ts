import { useState, useEffect, useCallback } from 'react';
import { riskMemoryEngine } from '../services/riskMemoryEngine';
import type {
  SafetyEventRecord,
  RiskPattern,
  PatternMatchResult,
  RiskMemorySummary,
} from '../types';

export function useRiskMemory() {
  const [events, setEvents] = useState<SafetyEventRecord[]>(() => riskMemoryEngine.getEvents());
  const [patterns, setPatterns] = useState<RiskPattern[]>(() => riskMemoryEngine.discoverPatterns());
  const [summary, setSummary] = useState<RiskMemorySummary>(() => riskMemoryEngine.getSummary());
  const [currentMatch, setCurrentMatch] = useState<PatternMatchResult | null>(() =>
    riskMemoryEngine.getLastMatchResult()
  );
  const [activeMode, setActiveModeState] = useState<'REAL' | 'DEMO'>(() =>
    riskMemoryEngine.getActiveMode()
  );

  const syncState = useCallback(() => {
    setEvents(riskMemoryEngine.getEvents());
    setPatterns(riskMemoryEngine.discoverPatterns());
    setSummary(riskMemoryEngine.getSummary());
    setCurrentMatch(riskMemoryEngine.getLastMatchResult());
    setActiveModeState(riskMemoryEngine.getActiveMode());
  }, []);

  useEffect(() => {
    const unsubscribe = riskMemoryEngine.subscribe(syncState);
    return () => unsubscribe();
  }, [syncState]);

  const setActiveMode = useCallback((mode: 'REAL' | 'DEMO') => {
    riskMemoryEngine.setActiveMode(mode);
  }, []);

  const addEvent = useCallback(
    (eventData: Omit<SafetyEventRecord, 'eventId'>, forceDemo = false) => {
      return riskMemoryEngine.addEvent(eventData, forceDemo);
    },
    []
  );

  const injectDemoBaselineCutIns = useCallback(() => {
    return riskMemoryEngine.injectDemoBaselineCutIns();
  }, []);

  const triggerDemoMatchingCutIn = useCallback(() => {
    return riskMemoryEngine.triggerDemoMatchingCutIn();
  }, []);

  const clearDemoData = useCallback(() => {
    riskMemoryEngine.clearDemoData();
  }, []);

  const clearRealData = useCallback(() => {
    riskMemoryEngine.clearRealData();
  }, []);

  const dismissMatchAlert = useCallback(() => {
    setCurrentMatch(null);
  }, []);

  return {
    events,
    patterns,
    summary,
    currentMatch,
    activeMode,
    setActiveMode,
    addEvent,
    injectDemoBaselineCutIns,
    triggerDemoMatchingCutIn,
    clearDemoData,
    clearRealData,
    dismissMatchAlert,
  };
}
