import { useCallback, useEffect, useRef, useState } from 'react';
import { FilesetResolver, ObjectDetector } from '@mediapipe/tasks-vision';
import { RoadRiskEngine } from '../services/roadRiskEngine';
import { ObjectTracker, type RawDetection } from '../services/objectTracker';
import { SceneCalibrator } from '../services/sceneCalibrator';
import { SAMPLE_SCENARIOS, type SampleScenario } from '../services/sampleClips';
import type {
  DetectedRoadObject,
  EgoCorridorGeometry,
  IncidentAnalysis,
  RoadRiskAssessment,
  SceneCalibration,
  VideoTimelineEvent,                 
} from '../types';
          
export function useRoadDetector(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>
) {
  const [selectedScenario, setSelectedScenario] = useState<SampleScenario | null>(SAMPLE_SCENARIOS[0]);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [isUsingUploadedVideo, setIsUsingUploadedVideo] = useState<boolean>(false);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [durationSec, setDurationSec] = useState<number>(SAMPLE_SCENARIOS[0].durationSec);

  const [isModelLoading, setIsModelLoading] = useState<boolean>(false);
  const [modelAvailable, setModelAvailable] = useState<boolean>(false);

  const roadRiskEngineRef = useRef<RoadRiskEngine>(new RoadRiskEngine());
  const objectTrackerRef = useRef<ObjectTracker>(new ObjectTracker());
  const sceneCalibratorRef = useRef<SceneCalibrator>(new SceneCalibrator());
  const objectDetectorRef = useRef<ObjectDetector | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastInferenceTimeRef = useRef<number>(0);
  const lastDetectedObjectsRef = useRef<DetectedRoadObject[]>([]);

  const [roadAssessment, setRoadAssessment] = useState<RoadRiskAssessment>(() =>
    roadRiskEngineRef.current.evaluate([], 0)
  );
  const [timelineEvents, setTimelineEvents] = useState<VideoTimelineEvent[]>(
    SAMPLE_SCENARIOS[0].timelineEvents
  );
  const [incidentAnalysis, setIncidentAnalysis] = useState<IncidentAnalysis | null>(null);
  const [sceneCalibration, setSceneCalibration] = useState<SceneCalibration>(() =>
    sceneCalibratorRef.current.getCalibration()
  );
  const [egoCorridorGeometry, setEgoCorridorGeometry] = useState<EgoCorridorGeometry>(() =>
    objectTrackerRef.current.getLaneEstimator().getGeometry()
  );

  // 1. Initialize MediaPipe Object Detector with resilient GPU/CPU fallback
  useEffect(() => {
    let isCancelled = false;

    async function initDetector() {
      try {
        setIsModelLoading(true);
        console.log('[SafeDrive Road Detector] Loading MediaPipe FilesetResolver...');
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        if (isCancelled) return;

        let detector: ObjectDetector | null = null;
        try {
          console.log('[SafeDrive Road Detector] Attempting GPU ObjectDetector...');
          detector = await ObjectDetector.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            scoreThreshold: 0.20,
          });
          console.log('[SafeDrive Road Detector] GPU ObjectDetector initialized successfully.');
        } catch (gpuErr) {
          console.warn('[SafeDrive Road Detector] GPU failed, attempting CPU fallback:', gpuErr);
          detector = await ObjectDetector.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            scoreThreshold: 0.20,
          });
          console.log('[SafeDrive Road Detector] CPU ObjectDetector initialized successfully.');
        }

        if (isCancelled) {
          detector?.close();
          return;
        }

        objectDetectorRef.current = detector;
        setModelAvailable(true);
        setIsModelLoading(false);
      } catch (err) {
        console.error('[SafeDrive Road Detector] ObjectDetector initialization failed:', err);
        if (!isCancelled) {
          setIsModelLoading(false);
          setModelAvailable(false);
        }
      }
    }

    initDetector();

    return () => {
      isCancelled = true;
      if (objectDetectorRef.current) {
        objectDetectorRef.current.close();
        objectDetectorRef.current = null;
      }
    };
  }, []);

  // Handle Scenario Change
  const selectScenario = useCallback((scenario: SampleScenario) => {
    setSelectedScenario(scenario);
    setIsUsingUploadedVideo(false);
    setCurrentTimeSec(0);
    setDurationSec(scenario.durationSec);
    setIsPlaying(false);
    roadRiskEngineRef.current.reset();
    objectTrackerRef.current.reset();
    sceneCalibratorRef.current.reset();
    roadRiskEngineRef.current.setPreloadedTimeline(scenario.timelineEvents);
    setTimelineEvents(scenario.timelineEvents);
    setIncidentAnalysis(null);

    const initial = scenario.getFrameTelemetry(0);
    const assessment = roadRiskEngineRef.current.evaluate(initial.objects, 0, initial.collisionObserved);
    setRoadAssessment(assessment);
    setEgoCorridorGeometry(objectTrackerRef.current.getLaneEstimator().getGeometry());
  }, []);

  // Handle Custom Dashcam Video Upload
  const handleVideoUpload = useCallback((file: File) => {
    if (uploadedVideoUrl) {
      URL.revokeObjectURL(uploadedVideoUrl);
    }
    const url = URL.createObjectURL(file);
    setUploadedVideoUrl(url);
    setIsUsingUploadedVideo(true);
    setSelectedScenario(null);
    setCurrentTimeSec(0);
    setIsPlaying(false);
    lastDetectedObjectsRef.current = [];
    lastInferenceTimeRef.current = 0;
    roadRiskEngineRef.current.reset();
    objectTrackerRef.current.reset();
    sceneCalibratorRef.current.reset();
    setTimelineEvents([]);
    setIncidentAnalysis(null);
  }, [uploadedVideoUrl]);

  // Seek video
  const seekTo = useCallback((sec: number) => {
    setCurrentTimeSec(sec);
    if (videoRef.current) {
      videoRef.current.currentTime = sec;
    }
  }, [videoRef]);

  // Main processing & rendering frame loop
  useEffect(() => {
    const loop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas ? canvas.getContext('2d') : null;

      let currentTime = currentTimeSec;

      if (video && isUsingUploadedVideo) {
        currentTime = video.currentTime;
        setCurrentTimeSec(currentTime);
        if (video.duration && !isNaN(video.duration)) {
          setDurationSec(video.duration);
        }
      }

      // Draw canvas overlay
      if (canvas && video && video.videoWidth && video.videoHeight) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
      }

      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      // Keep tracked objects across frames to prevent flicker/empty frame resets
      let detectedObjects: DetectedRoadObject[] = lastDetectedObjectsRef.current;
      let collisionObserved = false;

      if (!isUsingUploadedVideo && selectedScenario) {
        // Built-in scenario telemetry
        const frameData = selectedScenario.getFrameTelemetry(currentTime);
        detectedObjects = frameData.objects;
        collisionObserved = frameData.collisionObserved;
        lastDetectedObjectsRef.current = detectedObjects;
      } else if (isUsingUploadedVideo && video && video.readyState >= 2) {
        const now = performance.now();

        // Sample at ~15 FPS or when actively running inference
        if (now - lastInferenceTimeRef.current >= 66) {
          lastInferenceTimeRef.current = now;

          const rawDetections: RawDetection[] = [];

          if (objectDetectorRef.current) {
            try {
              const results = objectDetectorRef.current.detectForVideo(video, now);
              if (results.detections && results.detections.length > 0) {
                const vw = video.videoWidth || 640;
                const vh = video.videoHeight || 480;

                results.detections.forEach((det) => {
                  const box = det.boundingBox!;
                  const normX = Math.max(0, box.originX / vw);
                  const normY = Math.max(0, box.originY / vh);
                  const normW = Math.min(1 - normX, box.width / vw);
                  const normH = Math.min(1 - normY, box.height / vh);
                  const rawCat = (det.categories[0]?.categoryName || '').toLowerCase();
                  
                  // Strict category matching for road entities
                  let label: DetectedRoadObject['label'] | null = null;
                  if (rawCat === 'person') {
                    label = 'pedestrian';
                  } else if (rawCat.includes('motorcycle') || rawCat.includes('motorbike')) {
                    label = 'motorcycle';
                  } else if (rawCat.includes('bike') || rawCat === 'bicycle') {
                    label = 'bicycle';
                  } else if (rawCat === 'truck') {
                    label = 'truck';
                  } else if (rawCat === 'bus') {
                    label = 'bus';
                  } else if (rawCat === 'car' || rawCat === 'van') {
                    label = 'car';
                  }

                  if (!label) return; // Discard non-road entities (trees, billboards, poles, sky artifacts)

                  // Reject objects high in the sky (must contact ground near or below horizon)
                  const bottomY = normY + normH;
                  if (bottomY < 0.40) return;

                  // Minimum dimensions to reject noise
                  if (normW < 0.03 || normH < 0.035 || normW > 0.95 || normH > 0.95) return;

                  const conf = det.categories[0]?.score || 0.5;
                  // Sensitive threshold for vulnerable road users (rider, bike, pedestrian)
                  const minConf = (label === 'pedestrian' || label === 'motorcycle' || label === 'bicycle') ? 0.28 : 0.38;
                  if (conf < minConf) return;

                  rawDetections.push({
                    box: { x: normX, y: normY, width: normW, height: normH },
                    label,
                    confidence: conf,
                  });
                });
              }
            } catch (err) {
              console.warn('Object detection inference error:', err);
            }
          }

          // Scene Calibration & Lane Corridor
          sceneCalibratorRef.current.updateFromDetections(rawDetections.map((d) => ({ x: d.box.x, y: d.box.y, height: d.box.height })));
          sceneCalibratorRef.current.estimateLighting(canvas);
          const calibration = sceneCalibratorRef.current.getCalibration();
          setSceneCalibration(calibration);

          objectTrackerRef.current.setHorizonY(calibration.estimatedHorizonY);
          detectedObjects = objectTrackerRef.current.update(rawDetections, currentTime);
          lastDetectedObjectsRef.current = detectedObjects;
        }
      }

      // Update ego corridor geometry
      const corridorGeo = objectTrackerRef.current.getLaneEstimator().getGeometry();
      setEgoCorridorGeometry(corridorGeo);

      // Evaluate Risk Assessment with Corridor Confidence & Hazard Relevance
      const assessment = roadRiskEngineRef.current.evaluate(
        detectedObjects,
        currentTime,
        collisionObserved,
        corridorGeo.confidence
      );
      setRoadAssessment(assessment);
      setTimelineEvents([...roadRiskEngineRef.current.getTimelineEvents()]);

      if (assessment.collisionObserved && !incidentAnalysis) {
        setIncidentAnalysis(roadRiskEngineRef.current.generateIncidentAnalysis(selectedScenario?.incidentAnalysis));
      }

      // =========================================================================
      // RENDER CANVAS OVERLAY
      // =========================================================================
      if (ctx && canvas) {
        const cw = canvas.width;
        const ch = canvas.height;

        // 1. Render Perspective Ego-Lane Driving Corridor
        const hY = corridorGeo.horizonY * ch;
        const tLX = corridorGeo.topLeftX * cw;
        const tRX = corridorGeo.topRightX * cw;
        const bLX = corridorGeo.bottomLeftX * cw;
        const bRX = corridorGeo.bottomRightX * cw;

        const isHazardInCorridor = assessment.relevantHazardCount > 0;
        ctx.fillStyle = isHazardInCorridor ? 'rgba(245, 158, 11, 0.08)' : 'rgba(6, 182, 212, 0.05)';
        ctx.strokeStyle = isHazardInCorridor ? 'rgba(245, 158, 11, 0.35)' : 'rgba(6, 182, 212, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);

        ctx.beginPath();
        ctx.moveTo(tLX, hY);
        ctx.lineTo(bLX, ch);
        ctx.lineTo(bRX, ch);
        ctx.lineTo(tRX, hY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);

        // Corridor Label
        ctx.fillStyle = isHazardInCorridor ? '#f59e0b' : '#38bdf8';
        ctx.font = '10px monospace';
        ctx.fillText(`EGO DRIVING CORRIDOR [${corridorGeo.confidence} CONF]`, bLX + 10, ch - 12);

        // 2. Render Object Bounding Boxes & Sleek ADAS Labels
        if (detectedObjects.length > 0) {
          detectedObjects.forEach((obj) => {
            const isThreat = obj.id === assessment.primaryThreat?.id;
            const isHazard = obj.isHazard;
            const isPedestrian = obj.label === 'pedestrian' || obj.label === 'bicycle';
            const isStationaryParked = obj.stationaryStatus === 'STATIONARY' && !isHazard;

            let strokeColor = '#38bdf8'; // Sky blue / cyan for tracking
            if (isStationaryParked) {
              strokeColor = '#64748b'; // Subtle slate
            } else if (isThreat && assessment.tier === 'CRITICAL') {
              strokeColor = '#f43f5e'; // Rose
            } else if (isThreat || (isPedestrian && isHazard)) {
              strokeColor = '#f97316'; // Orange / Red
            } else if (isHazard) {
              strokeColor = '#f59e0b'; // Amber
            } else if (isPedestrian) {
              strokeColor = '#eab308'; // Yellow
            } else {
              strokeColor = '#10b981'; // Emerald
            }

            const bx = obj.box.x * cw;
            const by = obj.box.y * ch;
            const bw = obj.box.width * cw;
            const bh = obj.box.height * ch;

            // Sleek ADAS Bounding Box
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = isThreat ? 2.5 : isHazard ? 2 : 1.2;
            if (isStationaryParked) {
              ctx.setLineDash([3, 3]);
            } else if (obj.status === 'INFERRED') {
              ctx.setLineDash([4, 2]);
            } else {
              ctx.setLineDash([]);
            }

            // Draw sleek rounded rectangle for the bounding box
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
              ctx.roundRect(bx, by, bw, bh, 4);
            } else {
              ctx.rect(bx, by, bw, bh);
            }
            ctx.stroke();
            ctx.setLineDash([]);

            // Compact, Elegant Badge (Clean ADAS Style - NO huge blocking rectangles!)
            let labelText = `${obj.label.toUpperCase()} · ${obj.estimatedDistanceMeters}m`;
            if (isHazard && isThreat) {
              labelText = `⚠ ${obj.label.toUpperCase()} · ${obj.estimatedDistanceMeters}m · IN PATH`;
            } else if (isHazard) {
              labelText = `⚠ ${obj.label.toUpperCase()} · ${obj.estimatedDistanceMeters}m`;
            }

            ctx.font = 'bold 9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            const textWidth = ctx.measureText(labelText).width;
            const badgeW = textWidth + 12;
            const badgeH = 16;
            const badgeY = Math.max(2, by - badgeH - 2);

            // Translucent glassmorphic pill
            ctx.fillStyle = isThreat
              ? 'rgba(225, 29, 72, 0.90)'
              : isHazard
              ? 'rgba(217, 119, 6, 0.88)'
              : 'rgba(15, 23, 42, 0.75)';

            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
              ctx.roundRect(bx, badgeY, badgeW, badgeH, 3);
            } else {
              ctx.rect(bx, badgeY, badgeW, badgeH);
            }
            ctx.fill();

            // Badge text
            ctx.fillStyle = '#ffffff';
            ctx.fillText(labelText, bx + 6, badgeY + 11.5);

            // Trajectory Vector only for confirmed primary threats
            if (isThreat && isHazard && obj.trajectoryConflict) {
              ctx.strokeStyle = strokeColor;
              ctx.lineWidth = 1.5;
              ctx.setLineDash([3, 3]);
              ctx.beginPath();
              ctx.moveTo(bx + bw / 2, by + bh);
              ctx.lineTo(cw / 2, ch * 0.92);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          });
        }
      }

      // Advance simulated timer if playing sample clip
      if (!isUsingUploadedVideo && isPlaying) {
        setCurrentTimeSec((prev) => {
          const next = prev + 0.05;
          if (selectedScenario && next >= selectedScenario.durationSec) {
            setIsPlaying(false);
            return selectedScenario.durationSec;
          }
          return next;
        });
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [
    currentTimeSec,
    isPlaying,
    isUsingUploadedVideo,
    selectedScenario,
    videoRef,
    canvasRef,
    incidentAnalysis,
  ]);

  return {
    selectedScenario,
    selectScenario,
    uploadedVideoUrl,
    isUsingUploadedVideo,
    handleVideoUpload,
    isPlaying,
    setIsPlaying,
    currentTimeSec,
    durationSec,
    seekTo,
    isModelLoading,
    modelAvailable,
    roadAssessment,
    timelineEvents,
    incidentAnalysis,
    sceneCalibration,
    egoCorridorGeometry,
    resetAnalysis: () => {
      roadRiskEngineRef.current.reset();
      objectTrackerRef.current.reset();
      sceneCalibratorRef.current.reset();
      lastDetectedObjectsRef.current = [];
      lastInferenceTimeRef.current = 0;
      setIncidentAnalysis(null);
      setCurrentTimeSec(0);
      setIsPlaying(false);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
      }
    },
  };
}
