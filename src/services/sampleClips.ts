import type { DetectedRoadObject, VideoTimelineEvent, IncidentAnalysis } from '../types';

export interface SampleScenario {
  id: string;
  title: string;
  subtitle: string;
  durationSec: number;
  hasIncident: boolean;
  incidentTimeSec: number;
  description: string;
  getFrameTelemetry: (currentTime: number) => {
    objects: DetectedRoadObject[];
    collisionObserved: boolean;
  };
  timelineEvents: VideoTimelineEvent[];
  incidentAnalysis: IncidentAnalysis;
}

export const SAMPLE_SCENARIOS: SampleScenario[] = [
  {
    id: 'highway_cutin_braking',
    title: 'Highway Rapid Cut-in & Severe Deceleration',
    subtitle: 'Sudden lane change without gap followed by heavy braking',
    durationSec: 22,
    hasIncident: true,
    incidentTimeSec: 16.5,
    description: 'Vehicle in adjacent lane aggressively veers into ego-lane at close proximity. Followed by emergency braking, escalating risk to critical pre-collision state.',
    timelineEvents: [
      {
        id: 't-1',
        timestampSec: 2.0,
        timeFormatted: '00:02',
        riskTier: 'LOW',
        confidencePercent: 92,
        evidenceStatus: 'DETECTED',
        eventTitle: 'Corridor Clear / Stable Headway',
        description: 'Ego driving corridor clear. Roadside objects maintaining safe margin.',
      },
      {
        id: 't-2',
        timestampSec: 6.5,
        timeFormatted: '00:06',
        riskTier: 'CAUTION',
        confidencePercent: 86,
        evidenceStatus: 'DETECTED',
        eventTitle: 'Vehicle Approaching Corridor Edge',
        description: 'Target SUV closes gap from 32m to 21m. Closing rate: +18 km/h.',
        warningText: '⚠️ Increasing collision risk',
      },
      {
        id: 't-3',
        timestampSec: 10.0,
        timeFormatted: '00:10',
        riskTier: 'HIGH',
        confidencePercent: 84,
        evidenceStatus: 'INFERRED',
        eventTitle: 'Ego Corridor Encroachment',
        description: 'Lateral drift across ego corridor boundary without signal. Spacing 12m.',
        warningText: '🚨 HIGH COLLISION RISK — Path conflict detected',
      },
      {
        id: 't-4',
        timestampSec: 13.5,
        timeFormatted: '00:13',
        riskTier: 'CRITICAL',
        confidencePercent: 88,
        evidenceStatus: 'INFERRED',
        eventTitle: 'Critical Pre-Collision Warning',
        description: 'Time-to-collision < 1.1s. Severe deceleration signature in travel lane.',
        warningText: 'CRITICAL RISK — Pre-collision threshold crossed',
      },
      {
        id: 't-5',
        timestampSec: 16.5,
        timeFormatted: '00:16',
        riskTier: 'CRITICAL',
        confidencePercent: 95,
        evidenceStatus: 'DETECTED',
        eventTitle: 'Collision / Near-Collision Observed',
        description: 'Contact or evasive guardrail departure observed following sustained pre-collision escalation.',
        isObservedCollision: true,
      },
    ],
    incidentAnalysis: {
      collisionDetected: true,
      timestampSec: 16.5,
      timeFormatted: '00:16',
      confidenceScore: 89,
      likelyContributingFactors: [
        { factor: 'Abrupt lane incursion directly into ego travel corridor', confidencePercent: 92, status: 'DETECTED' },
        { factor: 'Rapid closing velocity without visible braking buffer', confidencePercent: 91, status: 'INFERRED' },
        { factor: 'Unsafe following distance (sub-1.0s gap at highway speed)', confidencePercent: 94, status: 'DETECTED' },
        { factor: 'Delayed deceleration response under critical headway', confidencePercent: 84, status: 'INFERRED' },
      ],
      nonContributingContext: [
        'Right-lane sedan #2 maintained safe parallel distance (> 40m)',
        'Left-lane truck #3 stayed within outer lane corridor',
        'Roadside infrastructure did not obstruct forward path',
      ],
      vehicleA: {
        vehicleLabel: 'Vehicle A (Lead SUV - Cutting In)',
        contributionIndicator: 'higher contribution indicator',
        observedFactors: [
          { factor: 'Unsafe lane merge directly across ego-vehicle trajectory', confidencePercent: 92, status: 'INFERRED' },
          { factor: 'Immediate severe deceleration following merge', confidencePercent: 89, status: 'INFERRED' },
          { factor: 'Insufficient clearance margin (< 8 meters)', confidencePercent: 95, status: 'DETECTED' },
        ],
      },
      vehicleB: {
        vehicleLabel: 'Vehicle B (Ego Camera Vehicle)',
        contributionIndicator: 'lower contribution indicator',
        observedFactors: [
          { factor: 'Maintained stable travel corridor prior to cut-in', confidencePercent: 96, status: 'DETECTED' },
          { factor: 'Delayed braking onset (reaction gap ~0.8s following intrusion)', confidencePercent: 81, status: 'INFERRED' },
        ],
      },
      sequentialEvidence: [
        {
          step: 1,
          title: 'Nominal Lane Following',
          description: 'Stable 32m headway observed between 00:00 and 00:05.',
          timestampSec: 3.0,
          evidenceStatus: 'DETECTED',
          confidence: 94,
        },
        {
          step: 2,
          title: 'Lateral Encroachment',
          description: 'Vehicle A shifted centroid 1.8m leftward into ego corridor at 00:08.',
          timestampSec: 8.0,
          evidenceStatus: 'INFERRED',
          confidence: 88,
        },
        {
          step: 3,
          title: 'Closing Rate Acceleration',
          description: 'Bounding box area expanded by 240% in 1.4s, confirming high relative closing velocity.',
          timestampSec: 11.5,
          evidenceStatus: 'DETECTED',
          confidence: 90,
        },
        {
          step: 4,
          title: 'Pre-Collision Alert Triggered',
          description: 'Collision risk reached 88/100 (CRITICAL) at 00:13, 3.2s before impact.',
          timestampSec: 13.5,
          evidenceStatus: 'INFERRED',
          confidence: 89,
        },
        {
          step: 5,
          title: 'Impact Point Observed',
          description: 'Bumper contact and vehicle yaw deflection recorded at 00:16.5.',
          timestampSec: 16.5,
          evidenceStatus: 'DETECTED',
          confidence: 96,
        },
      ],
    },
    getFrameTelemetry: (currentTime: number) => {
      const isCollision = currentTime >= 16.5;

      let dist = 35;
      let closing = 4;
      let ttc: number | null = null;
      let threatBox = { x: 0.38, y: 0.45, width: 0.22, height: 0.28 };
      let trajectoryConflict = false;
      let motion: DetectedRoadObject['relativeMotion'] = 'MAINTAINING_DISTANCE';
      let corridorStatus: DetectedRoadObject['egoCorridorStatus'] = 'ADJACENT_LANE';
      let isHazard = false;

      if (currentTime < 5) {
        dist = 35 - currentTime * 0.6;
        closing = 6;
        threatBox = { x: 0.42, y: 0.48, width: 0.16, height: 0.20 };
        motion = 'MAINTAINING_DISTANCE';
        corridorStatus = 'ADJACENT_LANE';
        isHazard = false;
      } else if (currentTime < 10) {
        const progress = (currentTime - 5) / 5;
        dist = 32 - progress * 14;
        closing = 16;
        trajectoryConflict = true;
        motion = 'APPROACHING';
        corridorStatus = 'ENTERING_CORRIDOR';
        isHazard = true;
        threatBox = {
          x: 0.42 - progress * 0.08,
          y: 0.48 - progress * 0.04,
          width: 0.16 + progress * 0.10,
          height: 0.20 + progress * 0.12,
        };
      } else if (currentTime < 16.5) {
        const progress = (currentTime - 10) / 6.5;
        dist = 18 - progress * 14.5;
        closing = 34 + progress * 18;
        trajectoryConflict = true;
        motion = 'RAPIDLY_APPROACHING';
        corridorStatus = 'INSIDE_CORRIDOR';
        isHazard = true;
        ttc = Math.max(0.6, Number((1.8 - progress * 1.2).toFixed(1)));
        threatBox = {
          x: 0.34 - progress * 0.05,
          y: 0.44 - progress * 0.06,
          width: 0.26 + progress * 0.22,
          height: 0.32 + progress * 0.24,
        };
      } else {
        dist = 3.5;
        closing = 0;
        trajectoryConflict = true;
        motion = 'MAINTAINING_DISTANCE';
        corridorStatus = 'INSIDE_CORRIDOR';
        isHazard = true;
        ttc = 0;
        threatBox = { x: 0.26, y: 0.36, width: 0.50, height: 0.55 };
      }

      const objects: DetectedRoadObject[] = [
        {
          id: 'track-1',
          trackNumber: 1,
          label: 'car',
          confidence: 0.94,
          status: 'DETECTED',
          relativeMotion: motion,
          stationaryStatus: isHazard ? (motion === 'RAPIDLY_APPROACHING' ? 'RAPIDLY_APPROACHING' : 'MOVING') : 'SLOW_MOVING',
          egoCorridorStatus: corridorStatus,
          pedestrianSafetyState: 'N/A',
          isHazard,
          relevanceDescription: isHazard ? 'Vehicle encroaching into travel corridor' : 'Vehicle in adjacent lane (safe)',
          motionConfidence: 0.88,
          observationCount: Math.min(10, Math.floor(currentTime * 3)),
          box: threatBox,
          estimatedDistanceMeters: Number(dist.toFixed(1)),
          closingSpeedKmh: Number(closing.toFixed(0)),
          trajectoryConflict,
          ttcSeconds: ttc,
          isPrimaryThreat: isHazard,
        },
        // Parked Car on Roadside (Stationary - Zero Hazard!)
        {
          id: 'track-2',
          trackNumber: 2,
          label: 'car',
          confidence: 0.91,
          status: 'DETECTED',
          relativeMotion: 'MAINTAINING_DISTANCE',
          stationaryStatus: 'STATIONARY',
          egoCorridorStatus: 'OUTSIDE_CORRIDOR',
          pedestrianSafetyState: 'N/A',
          isHazard: false,
          relevanceDescription: 'Roadside parked vehicle (outside ego corridor)',
          motionConfidence: 0.85,
          observationCount: 10,
          box: { x: 0.82, y: 0.54, width: 0.16, height: 0.22 },
          estimatedDistanceMeters: 38,
          closingSpeedKmh: 0,
          trajectoryConflict: false,
          ttcSeconds: null,
          isPrimaryThreat: false,
        },
        // Parallel truck in outer lane
        {
          id: 'track-3',
          trackNumber: 3,
          label: 'truck',
          confidence: 0.89,
          status: 'DETECTED',
          relativeMotion: 'MAINTAINING_DISTANCE',
          stationaryStatus: 'MOVING',
          egoCorridorStatus: 'OUTSIDE_CORRIDOR',
          pedestrianSafetyState: 'N/A',
          isHazard: false,
          relevanceDescription: 'Traffic in adjacent outer lane (parallel flow)',
          motionConfidence: 0.85,
          observationCount: 8,
          box: { x: 0.04, y: 0.44, width: 0.18, height: 0.32 },
          estimatedDistanceMeters: 42,
          closingSpeedKmh: 1,
          trajectoryConflict: false,
          ttcSeconds: null,
          isPrimaryThreat: false,
        },
      ];

      return {
        objects,
        collisionObserved: isCollision,
      };
    },
  },
  {
    id: 'intersection_cross_conflict',
    title: 'Intersection Cross-Traffic Incursion',
    subtitle: 'Crossing vehicle breaches intersection without right-of-way',
    durationSec: 18,
    hasIncident: true,
    incidentTimeSec: 13.0,
    description: 'Vehicle entering from blind cross-street traverses right across ego-vehicle trajectory during green signal.',
    timelineEvents: [
      {
        id: 'ic-1',
        timestampSec: 2.0,
        timeFormatted: '00:02',
        riskTier: 'LOW',
        confidencePercent: 91,
        evidenceStatus: 'DETECTED',
        eventTitle: 'Clear Intersection Approach',
        description: 'Green signal active. Ego speed 48 km/h.',
      },
      {
        id: 'ic-2',
        timestampSec: 6.0,
        timeFormatted: '00:06',
        riskTier: 'CAUTION',
        confidencePercent: 83,
        evidenceStatus: 'DETECTED',
        eventTitle: 'Cross-Traffic Approaching Corridor',
        description: 'Object moving perpendicular from lateral junction. Distance 28m.',
        warningText: '⚠️ Increasing collision risk',
      },
      {
        id: 'ic-3',
        timestampSec: 9.5,
        timeFormatted: '00:09',
        riskTier: 'HIGH',
        confidencePercent: 85,
        evidenceStatus: 'INFERRED',
        eventTitle: 'Path Infiltration / Incursion',
        description: 'Cross vehicle enters intersection travel corridor without visible deceleration.',
        warningText: '🚨 HIGH COLLISION RISK — Cross-traffic trajectory conflict',
      },
      {
        id: 'ic-4',
        timestampSec: 11.5,
        timeFormatted: '00:11',
        riskTier: 'CRITICAL',
        confidencePercent: 87,
        evidenceStatus: 'INFERRED',
        eventTitle: 'Imminent Lateral Impact Window',
        description: 'TTC < 1.0s. Trajectories intersect directly in travel corridor.',
        warningText: 'CRITICAL COLLISION RISK — Immediate braking required',
      },
      {
        id: 'ic-5',
        timestampSec: 13.0,
        timeFormatted: '00:13',
        riskTier: 'CRITICAL',
        confidencePercent: 94,
        evidenceStatus: 'DETECTED',
        eventTitle: 'Collision / Near-Collision Observed',
        description: 'T-bone impact or emergency anti-lock stop observed.',
        isObservedCollision: true,
      },
    ],
    incidentAnalysis: {
      collisionDetected: true,
      timestampSec: 13.0,
      timeFormatted: '00:13',
      confidenceScore: 87,
      likelyContributingFactors: [
        { factor: 'Failure to yield right of way at controlled intersection', confidencePercent: 90, status: 'INFERRED' },
        { factor: 'Cross-traffic trajectory angle directly intersecting path', confidencePercent: 86, status: 'INFERRED' },
        { factor: 'Obstructed sightline from lateral infrastructure', confidencePercent: 78, status: 'INFERRED' },
        { factor: 'Short available reaction horizon (< 2.2s)', confidencePercent: 85, status: 'DETECTED' },
      ],
      nonContributingContext: [
        'Pedestrians on crosswalk corner remained stationary on curb',
        'Stationary parked vehicles along lateral curb posed zero obstruction',
      ],
      vehicleA: {
        vehicleLabel: 'Vehicle A (Cross-Traffic Sedan)',
        contributionIndicator: 'higher contribution indicator',
        observedFactors: [
          { factor: 'Incursion into through-corridor against right-of-way', confidencePercent: 88, status: 'INFERRED' },
          { factor: 'Absence of pre-entry deceleration at intersection threshold', confidencePercent: 84, status: 'INFERRED' },
        ],
      },
      vehicleB: {
        vehicleLabel: 'Vehicle B (Ego Camera Vehicle)',
        contributionIndicator: 'lower contribution indicator',
        observedFactors: [
          { factor: 'Proceeding on green signal within posted speed limit (48 km/h)', confidencePercent: 94, status: 'DETECTED' },
          { factor: 'Late evasion window due to sudden lateral appearance', confidencePercent: 80, status: 'INFERRED' },
        ],
      },
      sequentialEvidence: [
        {
          step: 1,
          title: 'Intersection Approach',
          description: 'Ego vehicle approaching intersection under green signal at 00:02.',
          timestampSec: 2.0,
          evidenceStatus: 'DETECTED',
          confidence: 92,
        },
        {
          step: 2,
          title: 'Lateral Object Detection',
          description: 'Object tracker identified sedan at right margin with persistent ID #1 (00:06).',
          timestampSec: 6.0,
          evidenceStatus: 'DETECTED',
          confidence: 86,
        },
        {
          step: 3,
          title: 'Trajectory Vector Intersection',
          description: 'Cross-velocity calculated at 32 km/h vector directly crossing ego lane at 00:09.',
          timestampSec: 9.0,
          evidenceStatus: 'INFERRED',
          confidence: 83,
        },
        {
          step: 4,
          title: 'Critical Risk Threshold Crossed',
          description: 'Risk score elevated to 92/100 at 00:11.5.',
          timestampSec: 11.5,
          evidenceStatus: 'INFERRED',
          confidence: 86,
        },
        {
          step: 5,
          title: 'Observed Impact Event',
          description: 'Collision recorded at 00:13.0.',
          timestampSec: 13.0,
          evidenceStatus: 'DETECTED',
          confidence: 95,
        },
      ],
    },
    getFrameTelemetry: (currentTime: number) => {
      const isCollision = currentTime >= 13.0;

      let threatBox = { x: 0.85, y: 0.48, width: 0.12, height: 0.18 };
      let dist = 32;
      let closing = 12;
      let trajectoryConflict = false;
      let ttc: number | null = null;
      let motion: DetectedRoadObject['relativeMotion'] = 'MAINTAINING_DISTANCE';
      let corridorStatus: DetectedRoadObject['egoCorridorStatus'] = 'OUTSIDE_CORRIDOR';
      let isHazard = false;

      if (currentTime < 5) {
        dist = 35;
        threatBox = { x: 0.88, y: 0.50, width: 0.10, height: 0.14 };
        motion = 'MAINTAINING_DISTANCE';
        corridorStatus = 'OUTSIDE_CORRIDOR';
        isHazard = false;
      } else if (currentTime < 9) {
        const p = (currentTime - 5) / 4;
        dist = 30 - p * 12;
        closing = 22;
        trajectoryConflict = true;
        motion = 'APPROACHING';
        corridorStatus = 'ENTERING_CORRIDOR';
        isHazard = true;
        threatBox = {
          x: 0.88 - p * 0.35,
          y: 0.50 - p * 0.05,
          width: 0.10 + p * 0.12,
          height: 0.14 + p * 0.14,
        };
      } else if (currentTime < 13) {
        const p = (currentTime - 9) / 4;
        dist = 18 - p * 15;
        closing = 38;
        trajectoryConflict = true;
        motion = 'RAPIDLY_APPROACHING';
        corridorStatus = 'INSIDE_CORRIDOR';
        isHazard = true;
        ttc = Math.max(0.4, Number((1.5 - p * 1.1).toFixed(1)));
        threatBox = {
          x: 0.53 - p * 0.15,
          y: 0.45 - p * 0.08,
          width: 0.22 + p * 0.24,
          height: 0.28 + p * 0.25,
        };
      } else {
        dist = 2.0;
        closing = 0;
        threatBox = { x: 0.35, y: 0.35, width: 0.48, height: 0.52 };
        trajectoryConflict = true;
        corridorStatus = 'INSIDE_CORRIDOR';
        isHazard = true;
      }

      return {
        objects: [
          {
            id: 'track-1',
            trackNumber: 1,
            label: 'car',
            confidence: 0.92,
            status: 'DETECTED',
            relativeMotion: motion,
            stationaryStatus: isHazard ? 'MOVING' : 'SLOW_MOVING',
            egoCorridorStatus: corridorStatus,
            pedestrianSafetyState: 'N/A',
            isHazard,
            relevanceDescription: isHazard ? 'Cross vehicle traversing ego path' : 'Vehicle at side intersection',
            motionConfidence: 0.86,
            observationCount: Math.min(10, Math.floor(currentTime * 3)),
            box: threatBox,
            estimatedDistanceMeters: Number(dist.toFixed(1)),
            closingSpeedKmh: Number(closing.toFixed(0)),
            trajectoryConflict,
            ttcSeconds: ttc,
            isPrimaryThreat: isHazard,
          },
          // Sidewalk pedestrian (Safe - Non-Hazard!)
          {
            id: 'track-2',
            trackNumber: 2,
            label: 'pedestrian',
            confidence: 0.88,
            status: 'DETECTED',
            relativeMotion: 'MAINTAINING_DISTANCE',
            stationaryStatus: 'STATIONARY',
            egoCorridorStatus: 'OUTSIDE_CORRIDOR',
            pedestrianSafetyState: 'PEDESTRIAN_NEAR_ROAD',
            isHazard: false,
            relevanceDescription: 'Pedestrian waiting on sidewalk curb (safe margin > 3m)',
            motionConfidence: 0.84,
            observationCount: 8,
            box: { x: 0.10, y: 0.48, width: 0.06, height: 0.18 },
            estimatedDistanceMeters: 30,
            closingSpeedKmh: 0,
            trajectoryConflict: false,
            ttcSeconds: null,
            isPrimaryThreat: false,
          },
        ],
        collisionObserved: isCollision,
      };
    },
  },
  {
    id: 'nominal_highway_flow',
    title: 'Controlled Highway Following (Nominal Flow)',
    subtitle: 'Smooth following distance with normal traffic dynamics',
    durationSec: 20,
    hasIncident: false,
    incidentTimeSec: 0,
    description: 'Lead vehicles maintain safe 2-second following headway at 90 km/h. Demonstrates clean baseline calibration without false alarms.',
    timelineEvents: [
      {
        id: 'nom-1',
        timestampSec: 2.0,
        timeFormatted: '00:02',
        riskTier: 'LOW',
        confidencePercent: 95,
        evidenceStatus: 'DETECTED',
        eventTitle: 'Safe Headway Established',
        description: 'Vehicles spaced at 42m (2.1s following window) at 90 km/h.',
      },
      {
        id: 'nom-2',
        timestampSec: 10.0,
        timeFormatted: '00:10',
        riskTier: 'LOW',
        confidencePercent: 92,
        evidenceStatus: 'DETECTED',
        eventTitle: 'Gradual Highway Deceleration',
        description: 'Lead vehicle adjusts speed by -8 km/h. Headway remains above 34m.',
      },
      {
        id: 'nom-3',
        timestampSec: 18.0,
        timeFormatted: '00:18',
        riskTier: 'LOW',
        confidencePercent: 94,
        evidenceStatus: 'DETECTED',
        eventTitle: 'Nominal Traffic Continuity',
        description: 'All vehicles aligned within respective travel lanes.',
      },
    ],
    incidentAnalysis: {
      collisionDetected: false,
      timestampSec: null,
      timeFormatted: null,
      confidenceScore: 92,
      likelyContributingFactors: [],
      nonContributingContext: [
        'Lead vehicle maintained safe 40m gap within travel lane',
        'Adjacent lane truck maintained parallel highway velocity',
      ],
      vehicleA: {
        vehicleLabel: 'Lead Vehicle',
        contributionIndicator: 'uncertain',
        observedFactors: [{ factor: 'Nominal driving behavior', confidencePercent: 95, status: 'DETECTED' }],
      },
      vehicleB: {
        vehicleLabel: 'Ego Vehicle',
        contributionIndicator: 'uncertain',
        observedFactors: [{ factor: 'Adequate following distance', confidencePercent: 95, status: 'DETECTED' }],
      },
      sequentialEvidence: [],
    },
    getFrameTelemetry: (currentTime: number) => {
      return {
        objects: [
          {
            id: 'track-1',
            trackNumber: 1,
            label: 'car',
            confidence: 0.96,
            status: 'DETECTED',
            relativeMotion: 'MAINTAINING_DISTANCE',
            stationaryStatus: 'MOVING',
            egoCorridorStatus: 'INSIDE_CORRIDOR',
            pedestrianSafetyState: 'N/A',
            isHazard: false,
            relevanceDescription: 'Lead vehicle maintaining safe headway',
            motionConfidence: 0.90,
            observationCount: 10,
            box: { x: 0.44, y: 0.50, width: 0.14, height: 0.18 },
            estimatedDistanceMeters: 40 + Math.sin(currentTime) * 3,
            closingSpeedKmh: Math.round(Math.sin(currentTime) * 4),
            trajectoryConflict: false,
            ttcSeconds: null,
            isPrimaryThreat: false,
          },
          {
            id: 'track-2',
            trackNumber: 2,
            label: 'truck',
            confidence: 0.93,
            status: 'DETECTED',
            relativeMotion: 'MAINTAINING_DISTANCE',
            stationaryStatus: 'MOVING',
            egoCorridorStatus: 'OUTSIDE_CORRIDOR',
            pedestrianSafetyState: 'N/A',
            isHazard: false,
            relevanceDescription: 'Parallel traffic in outer lane',
            motionConfidence: 0.88,
            observationCount: 10,
            box: { x: 0.15, y: 0.46, width: 0.16, height: 0.28 },
            estimatedDistanceMeters: 48,
            closingSpeedKmh: -1,
            trajectoryConflict: false,
            ttcSeconds: null,
            isPrimaryThreat: false,
          },
        ],
        collisionObserved: false,
      };
    },
  },
];
