// ----------------------------------------------------
// SafeDrive Risk Memory Engine & Pattern Data Models
// ----------------------------------------------------

export type SafetyEventType =
  | 'NEAR_MISS'
  | 'VEHICLE_CUT_IN'
  | 'CLOSE_PASS'
  | 'HARD_BRAKE'
  | 'ROAD_HAZARD'
  | 'PEDESTRIAN_CONFLICT'
  | 'DISTRACTION'
  | 'PHONE_DISTRACTION'
  | 'DROWSINESS'
  | 'OTHER_TRAFFIC_CONFLICT';

export type PatternType = 'PERSONAL_BEHAVIOR' | 'LOCATION_HOTSPOT';

export type PatternConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface EventLocation {
  latitude: number | null;
  longitude: number | null;
  locationName?: string;
  name?: string;
}

export interface SafetyEventRecord {
  eventId: string;
  timestamp: number;
  location: EventLocation;
  eventType: SafetyEventType;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  confidence: number; // 0 - 100%
  riderState: {
    isAttentive: boolean;
    headOrientation?: string;
    helmetCompliant?: boolean;
    drowsinessDetected?: boolean;
    phoneDistraction?: boolean;
  };
  roadContext: {
    conflictZone?: string;
    egoCorridorStatus?: string;
    trafficDensity?: 'LIGHT' | 'MODERATE' | 'HEAVY';
  };
  trafficContext: {
    involvedObjects: string[];
    timeToCollisionSec: number | null;
    relativeDistanceMeters: number | null;
  };
  sourceModule: 'CrashCam' | 'GuardianDrive' | 'SafeRider' | 'BlackspotGIS' | 'DEMO_INJECTOR';
  speedKmH: number | null;
  isDemo: boolean;
}

export interface RiskPattern {
  patternId: string;
  patternType: PatternType;
  eventType: SafetyEventType;
  title: string;
  description: string;
  recurrenceCount: number;
  firstObservedTimestamp: number;
  lastObservedTimestamp: number;
  approximateLocation?: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  involvedEventIds: string[];
  confidenceLevel: PatternConfidence;
  isDemo: boolean;
}

export interface PatternMatchResult {
  isMatch: boolean;
  matchedPattern: RiskPattern | null;
  matchScore: number; // 0 - 100
  matchLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  reasons: string[];
  previousSimilarCount: number;
  locationRecurrenceCount: number;
  explanation: string;
}

export interface RiskMemorySummary {
  totalEvents: number;
  nearMissCount: number;
  vehicleCutInCount: number;
  closePassCount: number;
  hazardCount: number;
  pedestrianConflictCount: number;
  distractionCount: number;
  activePatternsCount: number;
  personalPatternsCount: number;
  locationPatternsCount: number;
}
