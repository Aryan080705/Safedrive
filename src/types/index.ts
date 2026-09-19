export type RiskTier = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type CollisionRiskTier = 'LOW' | 'CAUTION' | 'HIGH' | 'CRITICAL';
export type AppMode =
  | 'OVERVIEW'
  | 'ROAD_VIDEO'
  | 'DRIVER_MONITOR'
  | 'BLACKSPOT_MAP'
  | 'SAFERIDER'
  | 'SOS_DISPATCH'
  | 'SAFETY_FUSION'
  | 'DEMO_SIMULATION'
  | 'RISK_MEMORY';

export type CameraOwner = 'DRIVER' | 'RIDER' | 'OFF';

export type TrackingStatus = 'DETECTED' | 'INFERRED' | 'UNCERTAIN';
export type RelativeMotionState = 'MOVING_AWAY' | 'MAINTAINING_DISTANCE' | 'APPROACHING' | 'RAPIDLY_APPROACHING' | 'UNCERTAIN';
export type StationaryStatus = 'STATIONARY' | 'SLOW_MOVING' | 'MOVING' | 'RAPIDLY_APPROACHING';
export type EgoCorridorStatus = 'INSIDE_CORRIDOR' | 'ENTERING_CORRIDOR' | 'OUTSIDE_CORRIDOR' | 'ADJACENT_LANE';
export type PedestrianSafetyState = 'PEDESTRIAN_DETECTED' | 'PEDESTRIAN_NEAR_ROAD' | 'PEDESTRIAN_ENTERING_EGO_PATH' | 'PEDESTRIAN_COLLISION_RISK' | 'N/A';
export type EgoCorridorConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type EvidenceQuality = 'ROBUST' | 'MODERATE' | 'INSUFFICIENT';

// Driver Monitoring Telemetry (Mode 2)
export interface DriverTelemetry {
  ear: number;                     // Eye Aspect Ratio (0.0 - 0.5)
  leftEar: number;
  rightEar: number;
  isEyeClosed: boolean;
  eyeClosureDurationMs: number;    // Sustained closure duration
  mar: number;                     // Mouth Aspect Ratio (0.0 - 1.0)
  isYawning: boolean;
  yawnDurationMs: number;
  yaw: number;                     // Head rotation (-45° to +45°)
  pitch: number;                   // Head pitch (-45° down to +45° up)
  roll: number;
  isDistracted: boolean;           // Head turned away from road
  distractionDurationMs: number;
  blinkCount: number;
  blinksPerMinute: number;
  speedKmH: number;                // Simulated driving speed
  faceDetected: boolean;
  // Temporal State Diagnostcs
  mouthState?: 'OPEN' | 'CLOSED';
  yawnState?: 'NORMAL' | 'MOUTH_OPENING' | 'POSSIBLE_YAWN' | 'YAWN_CONFIRMED' | 'COOLDOWN';
  headState?: 'FORWARD' | 'LOOKING_LEFT' | 'LOOKING_RIGHT' | 'LOOKING_DOWN' | 'UNKNOWN';
  drowsinessState?: 'NORMAL' | 'HEAD_DOWN' | 'SUSTAINED_HEAD_DOWN' | 'POSSIBLE_DROWSINESS' | 'DROWSINESS_CONFIRMED';
  eyeState?: 'OPEN' | 'CLOSED' | 'UNAVAILABLE';
  lastTrigger?: string;
  fps: number;
  timestamp: number;
}

export interface RiskFactor {
  id: string;
  label: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  points: number;                  // Positive risk addition
  description: string;
}

export interface RiskAssessment {
  score: number;                   // 0 - 100
  tier: RiskTier;
  factors: RiskFactor[];
  recommendedAction: string;
  actionSubtitle: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

export type SimulationPreset = 'normal' | 'fatigue' | 'distraction' | 'high_risk' | 'critical';

export interface TrendDataPoint {
  timestamp: number;
  score: number;
  tier: RiskTier;
}

// ----------------------------------------------------
// Road Video Analysis Data Models (Mode 1)
// ----------------------------------------------------

export interface BoundingBox {
  x: number;      // Normalized 0 - 1
  y: number;      // Normalized 0 - 1
  width: number;  // Normalized 0 - 1
  height: number; // Normalized 0 - 1
}

export interface DetectedRoadObject {
  id: string;                      // Persistent Track ID (e.g. "track-1")
  trackNumber: number;
  label: 'car' | 'truck' | 'bus' | 'motorcycle' | 'pedestrian' | 'bicycle' | 'hazard';
  confidence: number;              // Raw detector confidence (0.0 - 1.0)
  status: TrackingStatus;          // DETECTED, INFERRED, UNCERTAIN
  relativeMotion: RelativeMotionState;
  stationaryStatus: StationaryStatus;
  egoCorridorStatus: EgoCorridorStatus;
  pedestrianSafetyState: PedestrianSafetyState;
  isHazard: boolean;               // True ONLY if relevant to collision risk
  relevanceDescription: string;
  motionConfidence: number;        // Multi-frame trend confidence (0.0 - 1.0)
  observationCount: number;        // Consecutive frames tracked
  box: BoundingBox;
  estimatedDistanceMeters: number;
  closingSpeedKmh: number;         // Approximated relative approach (+ = closing)
  trajectoryConflict: boolean;     // Predicted to intersect ego path
  ttcSeconds: number | null;        // Time-To-Collision in seconds (null if irrelevant/stationary)
  isPrimaryThreat: boolean;
}

export interface SceneCalibration {
  estimatedHorizonY: number;       // Normalized Y (0.35 - 0.60)
  lightingCondition: 'DAYLIGHT' | 'OVERCAST' | 'LOW_LIGHT';
  laneCorridorWidth: number;       // Normalized corridor width
  isCalibrated: boolean;
}

export interface EgoCorridorGeometry {
  horizonY: number;
  topLeftX: number;
  topRightX: number;
  bottomLeftX: number;
  bottomRightX: number;
  confidence: EgoCorridorConfidence;
}

export interface RoadRiskAssessment {
  score: number;                   // 0 - 100 Risk Heuristic
  tier: CollisionRiskTier;
  riskConfidence: number;          // 0 - 100% Decoupled Confidence
  evidenceQuality: EvidenceQuality;
  temporalState: 'NORMAL' | 'RISK_INCREASING' | 'HIGH_COLLISION_RISK' | 'CRITICAL';
  timeToCollision: number | null;  // Seconds (null if N/A)
  primaryThreat: DetectedRoadObject | null;
  detectedObjects: DetectedRoadObject[];
  relevantHazardCount: number;     // Number of objects directly relevant to ego path
  nonContributingObjects: string[];// List of detected objects that do NOT pose a hazard
  activeFactors: string[];
  warningBanner: string | null;    // e.g. "⚠️ Increasing collision risk", "🚨 HIGH COLLISION RISK"
  subWarning: string | null;
  preCollisionDetected: boolean;
  collisionObserved: boolean;
  egoCorridorConfidence: EgoCorridorConfidence;
  insufficientEvidenceWarning?: string | null;
}

export interface VideoTimelineEvent {
  id: string;
  timestampSec: number;
  timeFormatted: string;          // e.g. "00:08"
  riskTier: CollisionRiskTier;
  confidencePercent: number;      // Event-level confidence
  evidenceStatus: TrackingStatus;
  eventTitle: string;
  description: string;
  warningText?: string;
  isObservedCollision?: boolean;
}

export interface ContributingFactorWithConfidence {
  factor: string;
  confidencePercent: number;
  status: TrackingStatus;
}

export interface VehicleContribution {
  vehicleLabel: string;
  contributionIndicator: 'higher contribution indicator' | 'lower contribution indicator' | 'uncertain';
  observedFactors: ContributingFactorWithConfidence[];
}

export interface IncidentAnalysis {
  collisionDetected: boolean;
  timestampSec: number | null;
  timeFormatted: string | null;
  confidenceScore: number;
  likelyContributingFactors: ContributingFactorWithConfidence[];
  nonContributingContext: string[];
  vehicleA: VehicleContribution;
  vehicleB: VehicleContribution;
  sequentialEvidence: {
    step: number;
    title: string;
    description: string;
    timestampSec: number;
    evidenceStatus: TrackingStatus;
    confidence: number;
  }[];
}

export interface SafetyFusionAssessment {
  overallScore: number;            // 0 - 100
  overallTier: RiskTier;
  driverScore: number;
  roadScore: number;
  riderScore?: number;
  blackspotScore?: number;
  compoundMultiplier: number;
  statusHeadline: string;
  contributors: string[];
}

// ----------------------------------------------------
// SafeRider Two-Wheeler Safety Data Models (Mode 4)
// ----------------------------------------------------

export type HelmetStatus = 'HELMET_DETECTED' | 'HELMET_NOT_DETECTED' | 'UNCERTAIN';

export type SmartHelmetState =
  | 'NO_HELMET'
  | 'HELMET_EYES_VISIBLE'
  | 'HELMET_EYES_LIMITED'
  | 'HELMET_EYES_UNAVAILABLE';

export type EyeVisibilityStatus = 'VISIBLE' | 'LIMITED' | 'UNAVAILABLE';

export type EyeMonitoringState = 'ACTIVE' | 'LIMITED' | 'UNAVAILABLE';

export type VisorEvidenceStatus =
  | 'CLEAR'
  | 'LIMITED_TINT_OR_GLARE'
  | 'UNAVAILABLE_BLOCKED'
  | 'TINTED_VISOR_DETECTED';

export type RiderPreset =
  | 'WEBCAM'
  | 'COMPLIANT_HELMET'
  | 'NO_HELMET'
  | 'TINTED_VISOR_LIMITED'
  | 'PHONE_ONLY'
  | 'DISTRACTED_RIDER'
  | 'BOTH_VIOLATIONS'
  | 'SHOULDER_CHECK'
  | 'HEAD_SLUMP';

export type PhoneDistractionStatus =
  | 'PHONE_NOT_DETECTED'
  | 'PHONE_DETECTED'
  | 'PHONE_DETECTED_INACTIVE'
  | 'POSSIBLE_PHONE_DISTRACTION'
  | 'PHONE_DISTRACTION_WARNING';

export interface BoundingBox2D {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RiderDebugDiagnostics {
  helmetConfidence: number;
  faceConfidence: number;
  eyeVisibilityConfidence: number;
  smartHelmetState: SmartHelmetState;
  eyeMonitoringState: EyeMonitoringState;
  ear: number;
  leftEar: number;
  rightEar: number;
  consecutiveVisibleFrames: number;
  consecutiveLimitedFrames: number;
  consecutiveUnavailableFrames: number;
}

export interface RiderTelemetry {
  helmetStatus: HelmetStatus;
  helmetConfidence: number;        // 0 - 100%
  riderDetected: boolean;
  twoWheelerDetected: boolean;
  phoneDistractionRisk: 'NONE' | 'POSSIBLE' | 'HIGH';
  phoneDistractionConfidence: number;
  sustainedViolationSec: number;
  isAlertActive: boolean;
  timestamp: number;

  // Real object detector phone telemetry
  phoneDetected: boolean;
  phoneAssociatedWithRider: boolean;
  phoneStatus: PhoneDistractionStatus;
  phoneConfidence: number;
  phoneDurationSec: number;
  phoneBox?: BoundingBox2D | null;
  phoneModelReady: boolean;

  // Smart Helmet + Visor / Eye Visibility Safety Layer
  smartHelmetState: SmartHelmetState;
  eyeVisibility: EyeVisibilityStatus;
  eyeMonitoring: EyeMonitoringState;
  visorStatus: VisorEvidenceStatus;
  visorDescription: string;
  eyeConfidence: number;           // 0 - 100%
  faceConfidence: number;          // 0 - 100%
  ear: number;                     // 0.0 - 0.5
  leftEar: number;
  rightEar: number;
  isEyeClosed: boolean;
  eyeClosureDurationMs: number;
  drowsinessAlertActive: boolean;
  debugDiagnostics?: RiderDebugDiagnostics;

  // Two-Wheeler Rider Head Motion & Orientation Pipeline
  headYaw: number;                 // -65° (left) to +65° (right)
  headPitch: number;               // -45° (nod down) to +45° (up)
  headRoll: number;                // -35° to +35° head tilt
  headMotionState: RiderHeadMotionState;
  headSlumpDurationMs: number;
  isHeadSlumped: boolean;
  isHeadTilted: boolean;
  headTiltDurationMs: number;
  lifesaverAudit: RiderLifesaverAudit;

  // Helmet Verification Bypass (Demo / Presentation Override)
  isHelmetBypassed: boolean;
}

export type RiderHeadMotionState =
  | 'CENTER_FORWARD'
  | 'LEFT_SHOULDER_CHECK'
  | 'RIGHT_SHOULDER_CHECK'
  | 'HEAD_SLUMP_NOD'
  | 'LATERAL_GLANCE'
  | 'LATERAL_TILT_LEFT'
  | 'LATERAL_TILT_RIGHT';

export interface RiderLifesaverAudit {
  lastCheckDirection: 'LEFT' | 'RIGHT' | null;
  lastCheckTimestamp: number;
  totalChecksThisRide: number;
  isPerformingCheck: boolean;
}

export interface RiderAssessment {
  score: number;                   // 0 - 100
  tier: RiskTier;
  helmetStatus: HelmetStatus;
  confidence: number;
  factors: RiskFactor[];
  recommendedAction: string;
}

// ----------------------------------------------------
// Blackspot GIS Accident Hotspot Data Models (Mode 3)
// ----------------------------------------------------

export type AccidentSeverity = 'FATAL' | 'SEVERE' | 'MINOR';

export interface BlackspotPoint {
  id: string;
  lat: number;
  lng: number;
  locationName: string;
  date: string;
  severity: AccidentSeverity;
  accidentType: string;
  casualties: number;
  speedLimitKmh: number;
  roadType: 'INTERSECTION' | 'HIGHWAY' | 'CURVE' | 'URBAN_CORRIDOR';
  weatherCondition: 'CLEAR' | 'RAIN' | 'FOG' | 'NIGHT';
  source?: 'HISTORICAL_DATASET' | 'DEMO_SIMULATED';
}

export interface BlackspotCluster {
  id: string;
  clusterNumber: number;
  name: string;
  centerLat: number;
  centerLng: number;
  totalIncidents: number;
  fatalCount: number;
  severeCount: number;
  minorCount: number;
  riskIntensity: 'HIGH' | 'CRITICAL' | 'MODERATE';
  primaryCause: string;
  recommendedIntervention: string;
  radiusMeters: number;
  points: BlackspotPoint[];
  source?: 'HISTORICAL_DATASET' | 'DEMO_SIMULATED';
}

export interface BlackspotSummary {
  totalClusters: number;
  totalIncidents: number;
  highRiskHotspots: number;
  nearestCluster: BlackspotCluster | null;
  regionalRiskIndex: number;       // 0 - 100
}

// ----------------------------------------------------
// SOS Smartphone Crash Detection Data Models (Mode 5)
// ----------------------------------------------------

export type SOSEventStatus = 'IDLE' | 'IMPACT_DETECTED' | 'COUNTDOWN_ACTIVE' | 'DISPATCHED' | 'CANCELLED';

export interface MotionData {
  accelX: number;
  accelY: number;
  accelZ: number;
  totalG: number;
  rotationAlpha: number;
  rotationBeta: number;
  rotationGamma: number;
  isImpactSpike: boolean;
}

export interface GPSLocation {
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  status: 'OBTAINED' | 'UNAVAILABLE' | 'DENIED' | 'REQUESTING';
  locationName?: string;
}

export interface SOSEmergencyState {
  status: SOSEventStatus;
  countdownSeconds: number;
  impactTimestamp: number | null;
  peakGForce: number;
  motionData: MotionData;
  location: GPSLocation;
  dispatchRecord: {
    dispatchedAt: number | null;
    recipientName: string;
    recipientPhone: string;
    messageText: string;
    isSimulated: boolean;
  } | null;
}

export * from './riskMemory';
export * from './voiceAssistant';
