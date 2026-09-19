import type {
  SafetyEventRecord,
  SafetyEventType,
  RiskPattern,
  PatternMatchResult,
  RiskMemorySummary,
} from '../types';

const STORAGE_KEY_REAL = 'safedrive_risk_memory_real_v1';
const STORAGE_KEY_DEMO = 'safedrive_risk_memory_demo_v1';
const MAX_STORED_EVENTS = 100;
const PROXIMITY_THRESHOLD_METERS = 250; // 250m radius for location pattern clustering
const MIN_RECURRENCE_FOR_PATTERN = 3;  // Deterministic rule: minimum 3 events required to form a pattern

/**
 * Calculates Great-Circle distance between two coordinates in meters (Haversine formula).
 */
export function calculateDistanceMeters(
  lat1: number | null,
  lon1: number | null,
  lat2: number | null,
  lon2: number | null
): number {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) {
    return Infinity;
  }
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export class RiskMemoryEngine {
  private static instance: RiskMemoryEngine;
  private memoryReal: SafetyEventRecord[] = [];
  private memoryDemo: SafetyEventRecord[] = [];
  private activeMode: 'REAL' | 'DEMO' = 'REAL';
  private subscribers: Set<() => void> = new Set();
  private lastMatchResult: PatternMatchResult | null = null;

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): RiskMemoryEngine {
    if (!RiskMemoryEngine.instance) {
      RiskMemoryEngine.instance = new RiskMemoryEngine();
    }
    return RiskMemoryEngine.instance;
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notify() {
    this.subscribers.forEach((cb) => cb());
  }

  public getActiveMode(): 'REAL' | 'DEMO' {
    return this.activeMode;
  }

  public setActiveMode(mode: 'REAL' | 'DEMO') {
    this.activeMode = mode;
    this.lastMatchResult = null;
    this.notify();
  }

  public getLastMatchResult(): PatternMatchResult | null {
    return this.lastMatchResult;
  }

  private loadFromStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const rawReal = localStorage.getItem(STORAGE_KEY_REAL);
        if (rawReal) {
          this.memoryReal = JSON.parse(rawReal);
        }
        const rawDemo = localStorage.getItem(STORAGE_KEY_DEMO);
        if (rawDemo) {
          this.memoryDemo = JSON.parse(rawDemo);
        }
      }
    } catch (e) {
      console.warn('RiskMemoryEngine localStorage read error, using in-memory fallback:', e);
    }
  }

  private saveToStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY_REAL, JSON.stringify(this.memoryReal));
        localStorage.setItem(STORAGE_KEY_DEMO, JSON.stringify(this.memoryDemo));
      }
    } catch (e) {
      console.warn('RiskMemoryEngine localStorage write error:', e);
    }
  }

  /**
   * Retrieves all events in the active namespace.
   */
  public getEvents(): SafetyEventRecord[] {
    const list = this.activeMode === 'DEMO' ? this.memoryDemo : this.memoryReal;
    return [...list].sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clears ONLY the isolated demo event records. Real events remain 100% untouched.
   */
  public clearDemoData() {
    this.memoryDemo = [];
    this.lastMatchResult = null;
    this.saveToStorage();
    this.notify();
  }

  /**
   * Clears the genuine rider history records.
   */
  public clearRealData() {
    this.memoryReal = [];
    this.lastMatchResult = null;
    this.saveToStorage();
    this.notify();
  }

  /**
   * Adds a new safety event record, evaluates historical pattern matching, and discovers new patterns.
   */
  public addEvent(
    eventData: Omit<SafetyEventRecord, 'eventId'>,
    forceDemo = false
  ): { event: SafetyEventRecord; matchResult: PatternMatchResult } {
    const isDemo = forceDemo || this.activeMode === 'DEMO';
    const eventId = `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const newEvent: SafetyEventRecord = {
      ...eventData,
      eventId,
      isDemo,
    };

    // 1. Evaluate pattern match against PREVIOUS events BEFORE appending the new event
    const matchResult = this.matchEventAgainstHistory(newEvent);
    this.lastMatchResult = matchResult;

    // 2. Append to appropriate partitioned memory
    if (isDemo) {
      this.memoryDemo.unshift(newEvent);
      if (this.memoryDemo.length > MAX_STORED_EVENTS) {
        this.memoryDemo = this.memoryDemo.slice(0, MAX_STORED_EVENTS);
      }
    } else {
      this.memoryReal.unshift(newEvent);
      if (this.memoryReal.length > MAX_STORED_EVENTS) {
        this.memoryReal = this.memoryReal.slice(0, MAX_STORED_EVENTS);
      }
    }

    this.saveToStorage();
    this.notify();

    return { event: newEvent, matchResult };
  }

  /**
   * Discovers deterministic patterns from the stored event history.
   * Requires a minimum of 3 sufficiently similar events to declare a pattern.
   */
  public discoverPatterns(): RiskPattern[] {
    const events = this.activeMode === 'DEMO' ? this.memoryDemo : this.memoryReal;
    const patterns: RiskPattern[] = [];

    if (events.length < MIN_RECURRENCE_FOR_PATTERN) {
      return patterns;
    }

    // 1. Discover PERSONAL BEHAVIOR Patterns (Grouped strictly by eventType)
    const typeGroups = new Map<SafetyEventType, SafetyEventRecord[]>();
    for (const evt of events) {
      const list = typeGroups.get(evt.eventType) || [];
      list.push(evt);
      typeGroups.set(evt.eventType, list);
    }

    typeGroups.forEach((typeEvents, type) => {
      if (typeEvents.length >= MIN_RECURRENCE_FOR_PATTERN) {
        const sorted = [...typeEvents].sort((a, b) => a.timestamp - b.timestamp);
        const firstTime = sorted[0].timestamp;
        const lastTime = sorted[sorted.length - 1].timestamp;

        let title = '';
        let desc = '';
        switch (type) {
          case 'VEHICLE_CUT_IN':
            title = 'Repeated Vehicle Cut-In Conflicts';
            desc = `Rider has encountered ${typeEvents.length} vehicle cut-in near-misses. Heightened vigilance required at intersections.`;
            break;
          case 'CLOSE_PASS':
            title = 'Frequent Close-Pass Encounters';
            desc = `Observed ${typeEvents.length} close-pass vehicle interactions with narrow lateral clearance.`;
            break;
          case 'HARD_BRAKE':
            title = 'Recurrent Emergency Hard Braking';
            desc = `Rider performed sudden deceleration in ${typeEvents.length} instances due to unexpected forward obstacles.`;
            break;
          case 'DISTRACTION':
            title = 'Recurring Inattention / Off-Road Focus';
            desc = `Recorded ${typeEvents.length} instances of prolonged distraction or smartphone proximity while riding.`;
            break;
          case 'PEDESTRIAN_CONFLICT':
            title = 'Repeated Pedestrian Pathway Conflicts';
            desc = `Pedestrians detected entering ego vehicle trajectory in ${typeEvents.length} separate encounters.`;
            break;
          case 'ROAD_HAZARD':
            title = 'Recurrent Road Surface Hazards';
            desc = `Encountered ${typeEvents.length} road hazards (potholes, debris, roadworks) along regular routes.`;
            break;
          default:
            title = `Recurring ${type.replace(/_/g, ' ')} Events`;
            desc = `${typeEvents.length} matching safety incidents recorded in historical memory.`;
        }

        patterns.push({
          patternId: `PAT-PERS-${type}-${this.activeMode}`,
          patternType: 'PERSONAL_BEHAVIOR',
          eventType: type,
          title,
          description: desc,
          recurrenceCount: typeEvents.length,
          firstObservedTimestamp: firstTime,
          lastObservedTimestamp: lastTime,
          involvedEventIds: typeEvents.map((e) => e.eventId),
          confidenceLevel: typeEvents.length >= 5 ? 'HIGH' : 'MEDIUM',
          isDemo: this.activeMode === 'DEMO',
        });
      }
    });

    // 2. Discover LOCATION HOTSPOT Patterns (Clustered by GPS coordinates <= 250m)
    const geocodedEvents = events.filter(
      (e) => e.location.latitude !== null && e.location.longitude !== null
    );

    const locationClusters: {
      centerLat: number;
      centerLng: number;
      name: string;
      events: SafetyEventRecord[];
    }[] = [];

    for (const evt of geocodedEvents) {
      let addedToCluster = false;
      for (const cluster of locationClusters) {
        const dist = calculateDistanceMeters(
          evt.location.latitude,
          evt.location.longitude,
          cluster.centerLat,
          cluster.centerLng
        );
        if (dist <= PROXIMITY_THRESHOLD_METERS) {
          cluster.events.push(evt);
          addedToCluster = true;
          break;
        }
      }

      if (!addedToCluster && evt.location.latitude && evt.location.longitude) {
        locationClusters.push({
          centerLat: evt.location.latitude,
          centerLng: evt.location.longitude,
          name: evt.location.locationName || 'Conflict Corridor',
          events: [evt],
        });
      }
    }

    for (const cluster of locationClusters) {
      if (cluster.events.length >= MIN_RECURRENCE_FOR_PATTERN) {
        const sorted = [...cluster.events].sort((a, b) => a.timestamp - b.timestamp);
        // Find dominant event type in this cluster
        const typeCount = new Map<SafetyEventType, number>();
        cluster.events.forEach((e) => {
          typeCount.set(e.eventType, (typeCount.get(e.eventType) || 0) + 1);
        });
        let dominantType: SafetyEventType = cluster.events[0].eventType;
        let maxCount = 0;
        typeCount.forEach((cnt, t) => {
          if (cnt > maxCount) {
            maxCount = cnt;
            dominantType = t;
          }
        });

        patterns.push({
          patternId: `PAT-LOC-${cluster.centerLat.toFixed(3)}-${cluster.centerLng.toFixed(3)}-${this.activeMode}`,
          patternType: 'LOCATION_HOTSPOT',
          eventType: dominantType,
          title: `Location Risk Hotspot: ${cluster.name}`,
          description: `${cluster.events.length} safety incidents recorded within ${PROXIMITY_THRESHOLD_METERS}m radius. Primary hazard: ${dominantType.replace(/_/g, ' ')}.`,
          recurrenceCount: cluster.events.length,
          firstObservedTimestamp: sorted[0].timestamp,
          lastObservedTimestamp: sorted[sorted.length - 1].timestamp,
          approximateLocation: {
            latitude: cluster.centerLat,
            longitude: cluster.centerLng,
            name: cluster.name,
          },
          involvedEventIds: cluster.events.map((e) => e.eventId),
          confidenceLevel: cluster.events.length >= 4 ? 'HIGH' : 'MEDIUM',
          isDemo: this.activeMode === 'DEMO',
        });
      }
    }

    return patterns;
  }

  /**
   * Deterministic pattern matching formula comparing a live event against prior history.
   * Matches on: eventType, geographic proximity, traffic context, and prior recurrence count.
   */
  public matchEventAgainstHistory(event: SafetyEventRecord): PatternMatchResult {
    const historicalEvents = this.activeMode === 'DEMO' ? this.memoryDemo : this.memoryReal;

    // Cold start gate: if fewer than 3 events exist, recurrence pattern CANNOT be triggered
    if (historicalEvents.length < MIN_RECURRENCE_FOR_PATTERN) {
      return {
        isMatch: false,
        matchedPattern: null,
        matchScore: 0,
        matchLevel: 'NONE',
        reasons: [],
        previousSimilarCount: historicalEvents.filter((e) => e.eventType === event.eventType).length,
        locationRecurrenceCount: 0,
        explanation: 'Cold Start: Insufficient historical evidence (minimum 3 similar events required).',
      };
    }

    const patterns = this.discoverPatterns();
    let bestMatch: {
      pattern: RiskPattern;
      score: number;
      reasons: string[];
      locationCount: number;
    } | null = null;

    for (const pat of patterns) {
      let score = 0;
      const reasons: string[] = [];

      // 1. Same Event Type: +40 points
      if (pat.eventType === event.eventType) {
        score += 40;
        reasons.push(`Identical event category: ${event.eventType.replace(/_/g, ' ')}`);
      }

      // 2. Location Proximity: +30 points if within 250m of hotspot
      let locationCount = 0;
      if (
        pat.approximateLocation &&
        event.location.latitude !== null &&
        event.location.longitude !== null
      ) {
        const dist = calculateDistanceMeters(
          event.location.latitude,
          event.location.longitude,
          pat.approximateLocation.latitude,
          pat.approximateLocation.longitude
        );
        if (dist <= PROXIMITY_THRESHOLD_METERS) {
          score += 30;
          locationCount = pat.recurrenceCount;
          reasons.push(
            `Occurred in known hotspot: ${pat.approximateLocation.name || 'Conflict Zone'} (~${Math.round(dist)}m away)`
          );
        }
      }

      // 3. Traffic / Context Similarity: +20 points
      if (
        event.roadContext.conflictZone &&
        (event.roadContext.conflictZone === 'INTERSECTION' ||
          event.roadContext.conflictZone === 'EGO_CORRIDOR' ||
          event.trafficContext.involvedObjects.length > 0)
      ) {
        score += 20;
        reasons.push('Traffic interaction matches previously recorded conflict conditions');
      }

      // 4. Strong Recurrence Evidence (>= 3 prior events): +10 points
      if (pat.recurrenceCount >= MIN_RECURRENCE_FOR_PATTERN) {
        score += 10;
        reasons.push(`${pat.recurrenceCount} prior documented events validate recurrence`);
      }

      if (score > (bestMatch?.score || 0)) {
        bestMatch = {
          pattern: pat,
          score: Math.min(100, score),
          reasons,
          locationCount,
        };
      }
    }

    const previousSimilarCount = historicalEvents.filter(
      (e) => e.eventType === event.eventType
    ).length;

    // Strict threshold: score >= 60 to declare a confirmed pattern match
    if (bestMatch && bestMatch.score >= 60 && previousSimilarCount >= MIN_RECURRENCE_FOR_PATTERN) {
      const matchLevel = bestMatch.score >= 80 ? 'HIGH' : 'MEDIUM';
      const explanation = `WHY AM I SEEING THIS?\n• Current event: ${event.eventType.replace(/_/g, ' ')}\n• ${previousSimilarCount} similar events recorded previously in memory\n${bestMatch.locationCount > 0 ? `• ${bestMatch.locationCount} occurred in this approximate location (< ${PROXIMITY_THRESHOLD_METERS}m)\n` : ''}• Current telemetry matches stored historical hazard pattern`;

      return {
        isMatch: true,
        matchedPattern: bestMatch.pattern,
        matchScore: bestMatch.score,
        matchLevel,
        reasons: bestMatch.reasons,
        previousSimilarCount,
        locationRecurrenceCount: bestMatch.locationCount,
        explanation,
      };
    }

    return {
      isMatch: false,
      matchedPattern: null,
      matchScore: bestMatch?.score || 0,
      matchLevel: 'NONE',
      reasons: bestMatch?.reasons || [],
      previousSimilarCount,
      locationRecurrenceCount: 0,
      explanation: 'No recurring risk pattern confirmed for this event.',
    };
  }

  /**
   * Generates summary statistics across stored events and patterns.
   */
  public getSummary(): RiskMemorySummary {
    const events = this.getEvents();
    const patterns = this.discoverPatterns();

    return {
      totalEvents: events.length,
      nearMissCount: events.filter((e) => e.eventType === 'NEAR_MISS').length,
      vehicleCutInCount: events.filter((e) => e.eventType === 'VEHICLE_CUT_IN').length,
      closePassCount: events.filter((e) => e.eventType === 'CLOSE_PASS').length,
      hazardCount: events.filter((e) => e.eventType === 'ROAD_HAZARD').length,
      pedestrianConflictCount: events.filter((e) => e.eventType === 'PEDESTRIAN_CONFLICT').length,
      distractionCount: events.filter((e) => e.eventType === 'DISTRACTION').length,
      activePatternsCount: patterns.length,
      personalPatternsCount: patterns.filter((p) => p.patternType === 'PERSONAL_BEHAVIOR').length,
      locationPatternsCount: patterns.filter((p) => p.patternType === 'LOCATION_HOTSPOT').length,
    };
  }

  // -------------------------------------------------------------
  // DETERMINISTIC 60-SECOND JUDGE DEMO INJECTORS
  // -------------------------------------------------------------

  /**
   * Step 1 for Demo: Injects exactly 3 historical vehicle cut-in incidents at Ring Road Junction.
   * This immediately creates the baseline pattern.
   */
  public injectDemoBaselineCutIns(): RiskPattern[] {
    this.setActiveMode('DEMO');
    this.clearDemoData();

    const baseLat = 28.5672;
    const baseLng = 77.21;
    const locName = 'Ring Road Junction (Simulated)';
    const now = Date.now();

    // Event 1: 30 minutes ago
    this.addEvent(
      {
        timestamp: now - 30 * 60 * 1000,
        location: { latitude: baseLat + 0.0001, longitude: baseLng - 0.0001, locationName: locName },
        eventType: 'VEHICLE_CUT_IN',
        severity: 'HIGH',
        confidence: 88,
        riderState: { isAttentive: true, headOrientation: 'FORWARD', helmetCompliant: true },
        roadContext: { conflictZone: 'INTERSECTION', trafficDensity: 'HEAVY' },
        trafficContext: { involvedObjects: ['Sedan'], timeToCollisionSec: 1.4, relativeDistanceMeters: 6.2 },
        sourceModule: 'CrashCam',
        speedKmH: 42,
        isDemo: true,
      },
      true
    );

    // Event 2: 18 minutes ago
    this.addEvent(
      {
        timestamp: now - 18 * 60 * 1000,
        location: { latitude: baseLat + 0.0002, longitude: baseLng + 0.0001, locationName: locName },
        eventType: 'VEHICLE_CUT_IN',
        severity: 'HIGH',
        confidence: 91,
        riderState: { isAttentive: true, headOrientation: 'FORWARD', helmetCompliant: true },
        roadContext: { conflictZone: 'INTERSECTION', trafficDensity: 'HEAVY' },
        trafficContext: { involvedObjects: ['SUV'], timeToCollisionSec: 1.2, relativeDistanceMeters: 5.4 },
        sourceModule: 'CrashCam',
        speedKmH: 38,
        isDemo: true,
      },
      true
    );

    // Event 3: 6 minutes ago
    this.addEvent(
      {
        timestamp: now - 6 * 60 * 1000,
        location: { latitude: baseLat - 0.0001, longitude: baseLng + 0.0001, locationName: locName },
        eventType: 'VEHICLE_CUT_IN',
        severity: 'CRITICAL',
        confidence: 94,
        riderState: { isAttentive: true, headOrientation: 'FORWARD', helmetCompliant: true },
        roadContext: { conflictZone: 'INTERSECTION', trafficDensity: 'HEAVY' },
        trafficContext: { involvedObjects: ['Truck'], timeToCollisionSec: 0.9, relativeDistanceMeters: 4.1 },
        sourceModule: 'CrashCam',
        speedKmH: 35,
        isDemo: true,
      },
      true
    );

    return this.discoverPatterns();
  }

  /**
   * Step 2 for Demo: Triggers a 4th matching vehicle cut-in event at Ring Road Junction.
   * This immediately triggers the full "🔴 RECURRING RISK PATTERN" alert.
   */
  public triggerDemoMatchingCutIn(): PatternMatchResult {
    this.setActiveMode('DEMO');
    const baseLat = 28.5672;
    const baseLng = 77.21;
    const locName = 'Ring Road Junction (Simulated)';

    const result = this.addEvent(
      {
        timestamp: Date.now(),
        location: { latitude: baseLat, longitude: baseLng, locationName: locName },
        eventType: 'VEHICLE_CUT_IN',
        severity: 'CRITICAL',
        confidence: 95,
        riderState: { isAttentive: true, headOrientation: 'FORWARD', helmetCompliant: true },
        roadContext: { conflictZone: 'INTERSECTION', trafficDensity: 'HEAVY' },
        trafficContext: { involvedObjects: ['Sedan'], timeToCollisionSec: 1.1, relativeDistanceMeters: 4.8 },
        sourceModule: 'CrashCam',
        speedKmH: 39,
        isDemo: true,
      },
      true
    );

    return result.matchResult;
  }
}

export const riskMemoryEngine = RiskMemoryEngine.getInstance();
