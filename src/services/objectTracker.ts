import type {
  BoundingBox,
  DetectedRoadObject,
  EgoCorridorStatus,
  PedestrianSafetyState,
  RelativeMotionState,
  StationaryStatus,
  TrackingStatus,
} from '../types';
import { EgoLaneEstimator } from './egoLaneEstimator';

interface TrackSnapshot {
  box: BoundingBox;
  timestamp: number;
  distance: number;
  area: number;
  centerX: number;
  bottomY: number;
}

export interface Track {
  id: string;
  trackNumber: number;
  label: DetectedRoadObject['label'];
  box: BoundingBox;
  confidence: number;
  status: TrackingStatus;
  relativeMotion: RelativeMotionState;
  stationaryStatus: StationaryStatus;
  egoCorridorStatus: EgoCorridorStatus;
  pedestrianSafetyState: PedestrianSafetyState;
  isHazard: boolean;
  relevanceDescription: string;
  motionConfidence: number;
  closingSpeedKmh: number;
  estimatedDistanceMeters: number;
  trajectoryConflict: boolean;
  ttcSeconds: number | null;
  hitStreak: number;
  missingFrames: number;
  history: TrackSnapshot[];
}

export interface RawDetection {
  box: BoundingBox;
  label: DetectedRoadObject['label'];
  confidence: number;
}

export class ObjectTracker {
  private nextTrackNumber: number = 1;
  private tracks: Track[] = [];
  private maxCoastFrames: number = 6;
  private laneEstimator: EgoLaneEstimator = new EgoLaneEstimator();

  public setHorizonY(horizonY: number) {
    this.laneEstimator.setHorizonY(horizonY);
  }

  public getLaneEstimator(): EgoLaneEstimator {
    return this.laneEstimator;
  }

  public reset() {
    this.nextTrackNumber = 1;
    this.tracks = [];
    this.laneEstimator.reset();
  }

  public update(rawDetections: RawDetection[], currentTimeSec: number): DetectedRoadObject[] {
    // 1. Filter out extremely noisy detections (threshold tuned for dashcam footage)
    const validDetections = rawDetections.filter((d) => d.confidence >= 0.20);

    // Update lane corridor from bounding boxes
    this.laneEstimator.updateFromTracks(validDetections.map((d) => d.box));

    // 2. Compute Cost Matrix (IoU + Centroid distance)
    const matchedTrackIndices = new Set<number>();
    const matchedDetectionIndices = new Set<number>();

    for (let i = 0; i < validDetections.length; i++) {
      const det = validDetections[i];
      let bestMatchIdx = -1;
      let bestScore = 0;

      for (let j = 0; j < this.tracks.length; j++) {
        if (matchedTrackIndices.has(j)) continue;
        const track = this.tracks[j];

        const iou = this.calculateIoU(det.box, track.box);
        const centroidDist = this.calculateCentroidDistance(det.box, track.box);

        let matchScore = iou;
        if (centroidDist < 0.15) {
          matchScore += (1 - centroidDist) * 0.5;
        }

        if (det.label === track.label) {
          matchScore += 0.25;
        }

        if (matchScore > bestScore && (iou >= 0.15 || centroidDist < 0.12)) {
          bestScore = matchScore;
          bestMatchIdx = j;
        }
      }

      if (bestMatchIdx !== -1) {
        matchedTrackIndices.add(bestMatchIdx);
        matchedDetectionIndices.add(i);
        this.updateTrackWithDetection(this.tracks[bestMatchIdx], det, currentTimeSec);
      }
    }

    // 3. Handle unmatched existing tracks (Occlusion / Coasting)
    for (let j = 0; j < this.tracks.length; j++) {
      if (!matchedTrackIndices.has(j)) {
        const track = this.tracks[j];
        track.missingFrames++;
        track.hitStreak = Math.max(0, track.hitStreak - 1);

        if (track.missingFrames <= this.maxCoastFrames) {
          track.status = 'INFERRED';
          track.confidence = Math.max(0.20, track.confidence * 0.85);
        } else {
          track.status = 'UNCERTAIN';
        }
      }
    }

    // 4. Handle unmatched new detections (Spawn new tracks)
    for (let i = 0; i < validDetections.length; i++) {
      if (!matchedDetectionIndices.has(i)) {
        const det = validDetections[i];
        if (det.confidence >= 0.22) {
          const newTrack = this.createNewTrack(det, currentTimeSec);
          this.tracks.push(newTrack);
        }
      }
    }

    // 5. Prune dead tracks
    this.tracks = this.tracks.filter((t) => t.missingFrames <= this.maxCoastFrames + 2);

    // 6. Convert to DetectedRoadObject
    return this.tracks.map((track) => ({
      id: track.id,
      trackNumber: track.trackNumber,
      label: track.label,
      confidence: Number(track.confidence.toFixed(2)),
      status: track.status,
      relativeMotion: track.relativeMotion,
      stationaryStatus: track.stationaryStatus,
      egoCorridorStatus: track.egoCorridorStatus,
      pedestrianSafetyState: track.pedestrianSafetyState,
      isHazard: track.isHazard,
      relevanceDescription: track.relevanceDescription,
      motionConfidence: Number(track.motionConfidence.toFixed(2)),
      observationCount: track.history.length,
      box: track.box,
      estimatedDistanceMeters: Number(track.estimatedDistanceMeters.toFixed(1)),
      closingSpeedKmh: Math.round(track.closingSpeedKmh),
      trajectoryConflict: track.trajectoryConflict,
      ttcSeconds: track.ttcSeconds,
      isPrimaryThreat: false,
    }));
  }

  private createNewTrack(det: RawDetection, timestamp: number): Track {
    const trackNumber = this.nextTrackNumber++;
    const area = det.box.width * det.box.height;
    const distance = this.estimateDistance(det.box);
    const centerX = det.box.x + det.box.width / 2;
    const bottomY = det.box.y + det.box.height;
    const corridorStatus = this.laneEstimator.evaluateObjectCorridorStatus(det.box);

    const isPed = det.label === 'pedestrian' || det.label === 'bicycle';

    return {
      id: `track-${trackNumber}`,
      trackNumber,
      label: det.label,
      box: det.box,
      confidence: det.confidence,
      status: 'UNCERTAIN',
      relativeMotion: 'UNCERTAIN',
      stationaryStatus: 'SLOW_MOVING',
      egoCorridorStatus: corridorStatus,
      pedestrianSafetyState: isPed ? 'PEDESTRIAN_DETECTED' : 'N/A',
      isHazard: false,
      relevanceDescription: 'Initial detection candidate',
      motionConfidence: 0.35,
      closingSpeedKmh: 0,
      estimatedDistanceMeters: distance,
      trajectoryConflict: false,
      ttcSeconds: null,
      hitStreak: 1,
      missingFrames: 0,
      history: [{ box: det.box, timestamp, distance, area, centerX, bottomY }],
    };
  }

  private updateTrackWithDetection(track: Track, det: RawDetection, timestamp: number) {
    track.box = det.box;
    track.confidence = track.confidence * 0.4 + det.confidence * 0.6;
    track.label = det.label;
    track.missingFrames = 0;
    track.hitStreak++;

    if (track.hitStreak >= 2 && track.confidence >= 0.40) {
      track.status = 'DETECTED';
    } else if (track.hitStreak >= 1) {
      track.status = 'INFERRED';
    } else {
      track.status = 'UNCERTAIN';
    }

    const area = det.box.width * det.box.height;
    const distance = this.estimateDistance(det.box);
    track.estimatedDistanceMeters = distance;

    const centerX = det.box.x + det.box.width / 2;
    const bottomY = det.box.y + det.box.height;

    track.history.push({ box: det.box, timestamp, distance, area, centerX, bottomY });
    if (track.history.length > 10) {
      track.history.shift();
    }

    // Evaluate ego corridor containment
    track.egoCorridorStatus = this.laneEstimator.evaluateObjectCorridorStatus(det.box);

    // Multi-frame Motion & Stationary Classification
    this.evaluateMotionAndRelevance(track);
  }

  private evaluateMotionAndRelevance(track: Track) {
    const isPedestrian = track.label === 'pedestrian' || track.label === 'bicycle';

    if (track.history.length < 3) {
      track.relativeMotion = 'UNCERTAIN';
      track.stationaryStatus = 'SLOW_MOVING';
      track.isHazard = false;
      track.ttcSeconds = null;
      track.relevanceDescription = 'Awaiting multi-frame trajectory confirmation';
      return;
    }

    const first = track.history[0];
    const last = track.history[track.history.length - 1];
    const dt = Math.max(0.1, last.timestamp - first.timestamp);

    // Lateral displacement (dx/dt) and Longitudinal distance rate (distRateMps)
    const dX = last.centerX - first.centerX;
    const dDist = last.distance - first.distance;
    const distRateMps = dDist / dt; // negative = approaching
    const lateralSpeed = Math.abs(dX) / dt;

    // Bounding Box Area Growth Rate
    const dAreaRatio = (last.area - first.area) / Math.max(0.001, first.area);
    const areaGrowthPerSec = dAreaRatio / dt;

    // -------------------------------------------------------------
    // 1. STATIONARY ROADSIDE CLASSIFICATION (Parked cars fix)
    // -------------------------------------------------------------
    // Parked cars sit on the road shoulder/sidewalk (OUTSIDE or ADJACENT corridor).
    // As the ego car drives forward, parked cars drift laterally OUTWARD (away from center)
    // and stay at the road margin. They do NOT intersect the ego travel corridor.
    const isOutsideCorridor = track.egoCorridorStatus === 'OUTSIDE_CORRIDOR';
    const isRoadsideMargin = track.egoCorridorStatus === 'ADJACENT_LANE';
    const isDriftingOutward = (last.centerX < 0.40 && dX <= 0) || (last.centerX > 0.60 && dX >= 0);

    let isStationary = false;

    if (!isPedestrian) {
      // Parked car indicators: outside lane + moving outward/roadside
      if (isOutsideCorridor && (isDriftingOutward || lateralSpeed < 0.05)) {
        isStationary = true;
      } else if (isRoadsideMargin && Math.abs(distRateMps) < 1.8 && isDriftingOutward) {
        isStationary = true;
      }
    }

    // -------------------------------------------------------------
    // 2. RELATIVE MOTION & SPEED ESTIMATION
    // -------------------------------------------------------------
    let closingSpeed = Math.round(-distRateMps * 3.6);

    if (isStationary) {
      track.stationaryStatus = 'STATIONARY';
      track.relativeMotion = 'MAINTAINING_DISTANCE';
      track.closingSpeedKmh = 0;
      track.trajectoryConflict = false;
      track.isHazard = false;
      track.ttcSeconds = null;
      track.relevanceDescription = 'Roadside parked vehicle (outside ego corridor)';
      return;
    }

    // Object is moving in or near corridor
    track.closingSpeedKmh = Math.max(0, closingSpeed);

    if (closingSpeed > 25 || areaGrowthPerSec > 0.45) {
      track.stationaryStatus = 'RAPIDLY_APPROACHING';
      track.relativeMotion = 'RAPIDLY_APPROACHING';
    } else if (closingSpeed > 8 || areaGrowthPerSec > 0.15) {
      track.stationaryStatus = 'MOVING';
      track.relativeMotion = 'APPROACHING';
    } else if (closingSpeed < -8) {
      track.stationaryStatus = 'MOVING';
      track.relativeMotion = 'MOVING_AWAY';
    } else {
      track.stationaryStatus = 'SLOW_MOVING';
      track.relativeMotion = 'MAINTAINING_DISTANCE';
    }

    // -------------------------------------------------------------
    // 3. TRAJECTORY CONFLICT & RELEVANCE
    // -------------------------------------------------------------
    const isInEgoLane = track.egoCorridorStatus === 'INSIDE_CORRIDOR';
    const isEnteringLane = track.egoCorridorStatus === 'ENTERING_CORRIDOR';

    // Conflict only exists if object is inside or heading into ego corridor
    track.trajectoryConflict = (isInEgoLane || isEnteringLane) && track.relativeMotion !== 'MOVING_AWAY';

    // -------------------------------------------------------------
    // 4. PEDESTRIAN ROAD SAFETY STATES
    // -------------------------------------------------------------
    if (isPedestrian) {
      if (isInEgoLane) {
        track.pedestrianSafetyState = 'PEDESTRIAN_COLLISION_RISK';
        track.isHazard = true;
        track.relevanceDescription = 'Pedestrian directly in ego corridor';
      } else if (isEnteringLane || (isRoadsideMargin && dX < 0 && last.centerX > 0.5) || (isRoadsideMargin && dX > 0 && last.centerX < 0.5)) {
        track.pedestrianSafetyState = 'PEDESTRIAN_ENTERING_EGO_PATH';
        track.isHazard = true;
        track.relevanceDescription = 'Pedestrian crossing into travel corridor';
      } else if (isRoadsideMargin) {
        track.pedestrianSafetyState = 'PEDESTRIAN_NEAR_ROAD';
        track.isHazard = false;
        track.relevanceDescription = 'Pedestrian on sidewalk/shoulder (safe margin)';
      } else {
        track.pedestrianSafetyState = 'PEDESTRIAN_DETECTED';
        track.isHazard = false;
        track.relevanceDescription = 'Pedestrian outside roadway margin';
      }
    } else {
      // Vehicles
      track.pedestrianSafetyState = 'N/A';
      if (track.trajectoryConflict && (track.relativeMotion === 'RAPIDLY_APPROACHING' || track.relativeMotion === 'APPROACHING')) {
        track.isHazard = true;
        track.relevanceDescription = isEnteringLane
          ? 'Vehicle encroaching into ego lane'
          : 'Lead vehicle closing rapidly in ego corridor';
      } else if (isInEgoLane && track.estimatedDistanceMeters < 8.0) {
        track.isHazard = true;
        track.relevanceDescription = 'Critical proximity obstacle ahead';
      } else {
        track.isHazard = false;
        track.relevanceDescription = isInEgoLane
          ? 'Lead vehicle maintaining safe headway'
          : 'Traffic in adjacent lane';
      }
    }

    // -------------------------------------------------------------
    // 5. TIME-TO-COLLISION (TTC) STRICT GUARD
    // -------------------------------------------------------------
    // ONLY show TTC when object is a confirmed hazard, in/entering corridor, with positive closing velocity!
    if (track.isHazard && track.closingSpeedKmh > 8 && track.estimatedDistanceMeters > 0) {
      const closingMps = track.closingSpeedKmh / 3.6;
      track.ttcSeconds = Number((track.estimatedDistanceMeters / closingMps).toFixed(1));
    } else {
      track.ttcSeconds = null; // Displayed as N/A
    }
  }

  private estimateDistance(box: BoundingBox): number {
    const bottomY = Math.min(1.0, Math.max(0.1, box.y + box.height));
    const horizonY = 0.45;
    const groundDepth = Math.max(0.035, bottomY - horizonY);
    // Real dashcam perspective distance (inverse ground plane projection)
    const dist = 1.9 / groundDepth;
    return Number(Math.min(65, Math.max(2.5, dist)).toFixed(1));
  }

  private calculateIoU(a: BoundingBox, b: BoundingBox): number {
    const xA = Math.max(a.x, b.x);
    const yA = Math.max(a.y, b.y);
    const xB = Math.min(a.x + a.width, b.x + b.width);
    const yB = Math.min(a.y + a.height, b.y + b.height);

    const interW = Math.max(0, xB - xA);
    const interH = Math.max(0, yB - yA);
    const interArea = interW * interH;

    const areaA = a.width * a.height;
    const areaB = b.width * b.height;
    const unionArea = areaA + areaB - interArea;

    return unionArea > 0 ? interArea / unionArea : 0;
  }

  private calculateCentroidDistance(a: BoundingBox, b: BoundingBox): number {
    const cAx = a.x + a.width / 2;
    const cAy = a.y + a.height / 2;
    const cBx = b.x + b.width / 2;
    const cBy = b.y + b.height / 2;
    const dx = cAx - cBx;
    const dy = cAy - cBy;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
