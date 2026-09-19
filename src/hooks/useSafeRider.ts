import { useCallback, useEffect, useRef, useState } from 'react';
import { FilesetResolver, FaceLandmarker, ObjectDetector } from '@mediapipe/tasks-vision';
import type {
  RiderTelemetry,
  RiderAssessment,
  HelmetStatus,
  RiderPreset,
  PhoneDistractionStatus,
  BoundingBox2D,
  SmartHelmetState,
  EyeVisibilityStatus,
  EyeMonitoringState,
  VisorEvidenceStatus,
  RiderHeadMotionState,
} from '../types';

interface Point2D {
  x: number;
  y: number;
}

function dist(p1: Point2D, p2: Point2D): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// MediaPipe Landmark Indices for Eye and Cranial Tracking
const LEFT_EYE = {
  outer: 33,
  inner: 133,
  top1: 160,
  bottom1: 144,
  top2: 158,
  bottom2: 153,
};

const RIGHT_EYE = {
  inner: 362,
  outer: 263,
  top1: 385,
  bottom1: 380,
  top2: 387,
  bottom2: 373,
};

export function useSafeRider(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  enabled: boolean
) {
  const [isLoading, setIsLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [phoneModelReady, setPhoneModelReady] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<RiderPreset>('WEBCAM');
  const [isHelmetBypassed, setIsHelmetBypassed] = useState(true);
  const isHelmetBypassedRef = useRef<boolean>(true);

  useEffect(() => {
    isHelmetBypassedRef.current = isHelmetBypassed;
  }, [isHelmetBypassed]);

  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const detectorRef = useRef<ObjectDetector | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const lastInferenceRef = useRef<number>(0);

  // Temporal smoothing refs for Helmet
  const helmetAbsentSinceRef = useRef<number | null>(null);
  const consecutiveHelmetFramesRef = useRef<number>(0);
  const consecutiveNoHelmetFramesRef = useRef<number>(0);
  const confirmedHelmetStatusRef = useRef<HelmetStatus>('UNCERTAIN');

  // Temporal smoothing refs for Real Phone Detection
  const phoneFirstSeenTimeRef = useRef<number | null>(null);
  const phoneLastSeenTimeRef = useRef<number | null>(null);
  const phoneAssociatedSinceRef = useRef<number | null>(null);

  // Temporal smoothing refs for Smart Helmet & Eye Visibility Layer
  const consecutiveVisibleFramesRef = useRef<number>(0);
  const consecutiveLimitedFramesRef = useRef<number>(0);
  const consecutiveUnavailableFramesRef = useRef<number>(0);

  const confirmedSmartHelmetStateRef = useRef<SmartHelmetState>('NO_HELMET');
  const confirmedEyeVisibilityRef = useRef<EyeVisibilityStatus>('UNAVAILABLE');
  const confirmedEyeMonitoringRef = useRef<EyeMonitoringState>('UNAVAILABLE');
  const confirmedVisorStatusRef = useRef<VisorEvidenceStatus>('CLEAR');
  const confirmedVisorDescRef = useRef<string>('System initializing');

  // Drowsiness Safety Gate Tracking
  const eyeClosureStartRef = useRef<number | null>(null);

  // Two-Wheeler Head Motion & Lifesaver Look Audit Refs
  const headSlumpStartRef = useRef<number | null>(null);
  const headTiltStartRef = useRef<number | null>(null);
  const lifesaverCheckStartRef = useRef<{ dir: 'LEFT' | 'RIGHT'; time: number } | null>(null);
  const totalLifesaverChecksRef = useRef<number>(0);
  const lastLifesaverDirectionRef = useRef<'LEFT' | 'RIGHT' | null>(null);
  const lastLifesaverTimestampRef = useRef<number>(0);

  const [telemetry, setTelemetry] = useState<RiderTelemetry>({
    helmetStatus: 'UNCERTAIN',
    helmetConfidence: 0,
    riderDetected: false,
    twoWheelerDetected: true,
    phoneDistractionRisk: 'NONE',
    phoneDistractionConfidence: 0,
    sustainedViolationSec: 0,
    isAlertActive: false,
    timestamp: Date.now(),
    phoneDetected: false,
    phoneAssociatedWithRider: false,
    phoneStatus: 'PHONE_NOT_DETECTED',
    phoneConfidence: 0,
    phoneDurationSec: 0,
    phoneBox: null,
    phoneModelReady: false,

    // Smart Helmet + Visor / Eye Visibility Safety Layer
    smartHelmetState: 'NO_HELMET',
    eyeVisibility: 'UNAVAILABLE',
    eyeMonitoring: 'UNAVAILABLE',
    visorStatus: 'CLEAR',
    visorDescription: 'System initializing',
    eyeConfidence: 0,
    faceConfidence: 0,
    ear: 0.31,
    leftEar: 0.31,
    rightEar: 0.31,
    isEyeClosed: false,
    eyeClosureDurationMs: 0,
    drowsinessAlertActive: false,

    // Two-Wheeler Rider Head Motion & Orientation Pipeline
    headYaw: 0,
    headPitch: 0,
    headRoll: 0,
    headMotionState: 'CENTER_FORWARD',
    headSlumpDurationMs: 0,
    isHeadSlumped: false,
    isHeadTilted: false,
    headTiltDurationMs: 0,
    lifesaverAudit: {
      lastCheckDirection: null,
      lastCheckTimestamp: 0,
      totalChecksThisRide: 0,
      isPerformingCheck: false,
    },
    isHelmetBypassed: true,
  });

  const [assessment, setAssessment] = useState<RiderAssessment>({
    score: 10,
    tier: 'LOW',
    helmetStatus: 'UNCERTAIN',
    confidence: 0,
    factors: [],
    recommendedAction: 'Observing rider headgear and posture',
  });

  // Initialize MediaPipe Vision Tasks: FaceLandmarker (Helmet) + ObjectDetector (Phone)
  useEffect(() => {
    let isMounted = true;

    async function initModels() {
      try {
        setIsLoading(true);
        const fileset = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        if (!isMounted) return;

        // 1. FaceLandmarker for cranial/helmet detection
        try {
          const landmarker = await FaceLandmarker.createFromOptions(fileset, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numFaces: 1,
          });

          if (isMounted) {
            landmarkerRef.current = landmarker;
          }
        } catch (lmErr) {
          console.warn('FaceLandmarker GPU init failed, trying CPU fallback:', lmErr);
          const landmarker = await FaceLandmarker.createFromOptions(fileset, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numFaces: 1,
          });
          if (isMounted) {
            landmarkerRef.current = landmarker;
          }
        }

        // 2. Pretrained ObjectDetector for real cell phone detection
        try {
          const detector = await ObjectDetector.createFromOptions(fileset, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            scoreThreshold: 0.35,
          });

          if (isMounted) {
            detectorRef.current = detector;
            setPhoneModelReady(true);
          }
        } catch (gpuErr) {
          console.warn('GPU ObjectDetector failed, trying CPU fallback:', gpuErr);
          try {
            const detector = await ObjectDetector.createFromOptions(fileset, {
              baseOptions: {
                modelAssetPath:
                  'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite',
                delegate: 'CPU',
              },
              runningMode: 'VIDEO',
              scoreThreshold: 0.35,
            });

            if (isMounted) {
              detectorRef.current = detector;
              setPhoneModelReady(true);
            }
          } catch (cpuErr) {
            console.warn('ObjectDetector unavailable (Helmet detection will continue):', cpuErr);
            if (isMounted) {
              setPhoneModelReady(false);
            }
          }
        }

        if (isMounted) {
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('SafeRider MediaPipe init error:', err);
          setIsLoading(false);
          setCameraError('Failed to load computer vision model.');
        }
      }
    }

    initModels();

    return () => {
      isMounted = false;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
      if (detectorRef.current) {
        detectorRef.current.close();
      }
    };
  }, []);

  // Manage Camera
  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access not supported on this browser.');
      return;
    }

    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 360, frameRate: { ideal: 30 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
          setIsCameraActive(true);
          setIsLoading(false);
        };
      }
    } catch (err) {
      console.warn('SafeRider camera access error:', err);
      setCameraError('Webcam unavailable. Switch to a test preset.');
      setIsCameraActive(false);
    }
  }, [videoRef]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, [videoRef]);

  // Toggle Camera based on enabled state and preset
  useEffect(() => {
    if (enabled && selectedPreset === 'WEBCAM') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [enabled, selectedPreset, startCamera, stopCamera]);

  // Real-time analysis frame loop
  useEffect(() => {
    if (!enabled) {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      return;
    }

    const processFrame = () => {
      const now = performance.now();

      // Handle Preset Test Modes (Synthetic Deterministic Telemetry)
      if (selectedPreset !== 'WEBCAM') {
        let presetRawTelemetry: any;

        if (selectedPreset === 'COMPLIANT_HELMET') {
          // DEMO 1: Helmet + Clear Eyes (Active Eye Monitoring)
          presetRawTelemetry = {
            helmetStatus: 'HELMET_DETECTED',
            helmetConfidence: 95,
            riderDetected: true,
            twoWheelerDetected: true,
            phoneDistractionRisk: 'NONE',
            phoneDistractionConfidence: 0,
            sustainedViolationSec: 0,
            isAlertActive: false,
            timestamp: Date.now(),
            phoneDetected: false,
            phoneAssociatedWithRider: false,
            phoneStatus: 'PHONE_NOT_DETECTED',
            phoneConfidence: 0,
            phoneDurationSec: 0,
            phoneBox: null,
            phoneModelReady: true,

            smartHelmetState: 'HELMET_EYES_VISIBLE',
            eyeVisibility: 'VISIBLE',
            eyeMonitoring: 'ACTIVE',
            visorStatus: 'CLEAR',
            visorDescription: 'Clear optical visor. Both eyes reliably observed & monitored.',
            eyeConfidence: 94,
            faceConfidence: 95,
            ear: 0.31,
            leftEar: 0.31,
            rightEar: 0.31,
            isEyeClosed: false,
            eyeClosureDurationMs: 0,
            drowsinessAlertActive: false,
            debugDiagnostics: {
              helmetConfidence: 95,
              faceConfidence: 95,
              eyeVisibilityConfidence: 94,
              smartHelmetState: 'HELMET_EYES_VISIBLE',
              eyeMonitoringState: 'ACTIVE',
              ear: 0.31,
              leftEar: 0.31,
              rightEar: 0.31,
              consecutiveVisibleFrames: 24,
              consecutiveLimitedFrames: 0,
              consecutiveUnavailableFrames: 0,
            },
          };
        } else if (selectedPreset === 'NO_HELMET') {
          // DEMO 2: No Helmet (Eye Monitoring UNAVAILABLE)
          presetRawTelemetry = {
            helmetStatus: 'HELMET_NOT_DETECTED',
            helmetConfidence: 92,
            riderDetected: true,
            twoWheelerDetected: true,
            phoneDistractionRisk: 'NONE',
            phoneDistractionConfidence: 0,
            sustainedViolationSec: 5.4,
            isAlertActive: true,
            timestamp: Date.now(),
            phoneDetected: false,
            phoneAssociatedWithRider: false,
            phoneStatus: 'PHONE_NOT_DETECTED',
            phoneConfidence: 0,
            phoneDurationSec: 0,
            phoneBox: null,
            phoneModelReady: true,

            smartHelmetState: 'NO_HELMET',
            eyeVisibility: 'UNAVAILABLE',
            eyeMonitoring: 'UNAVAILABLE',
            visorStatus: 'UNAVAILABLE_BLOCKED',
            visorDescription: 'Protective headgear absent. Eye monitoring unavailable.',
            eyeConfidence: 0,
            faceConfidence: 90,
            ear: 0,
            leftEar: 0,
            rightEar: 0,
            isEyeClosed: false,
            eyeClosureDurationMs: 0,
            drowsinessAlertActive: false,
            debugDiagnostics: {
              helmetConfidence: 92,
              faceConfidence: 90,
              eyeVisibilityConfidence: 0,
              smartHelmetState: 'NO_HELMET',
              eyeMonitoringState: 'UNAVAILABLE',
              ear: 0,
              leftEar: 0,
              rightEar: 0,
              consecutiveVisibleFrames: 0,
              consecutiveLimitedFrames: 0,
              consecutiveUnavailableFrames: 30,
            },
          };
        } else if (selectedPreset === 'TINTED_VISOR_LIMITED') {
          // DEMO 3: Tinted / Limited Eyes (Monitoring PAUSED - Drowsiness Suppressed)
          presetRawTelemetry = {
            helmetStatus: 'HELMET_DETECTED',
            helmetConfidence: 94,
            riderDetected: true,
            twoWheelerDetected: true,
            phoneDistractionRisk: 'NONE',
            phoneDistractionConfidence: 0,
            sustainedViolationSec: 0,
            isAlertActive: false,
            timestamp: Date.now(),
            phoneDetected: false,
            phoneAssociatedWithRider: false,
            phoneStatus: 'PHONE_NOT_DETECTED',
            phoneConfidence: 0,
            phoneDurationSec: 0,
            phoneBox: null,
            phoneModelReady: true,

            smartHelmetState: 'HELMET_EYES_LIMITED',
            eyeVisibility: 'LIMITED',
            eyeMonitoring: 'LIMITED',
            visorStatus: 'TINTED_VISOR_DETECTED',
            visorDescription: 'TINTED VISOR DETECTED: Reduced optical transmittance in eye region.',
            eyeConfidence: 32,
            faceConfidence: 92,
            ear: 0.29,
            leftEar: 0.29,
            rightEar: 0.29,
            isEyeClosed: false,
            eyeClosureDurationMs: 0,
            drowsinessAlertActive: false,
            debugDiagnostics: {
              helmetConfidence: 94,
              faceConfidence: 92,
              eyeVisibilityConfidence: 32,
              smartHelmetState: 'HELMET_EYES_LIMITED',
              eyeMonitoringState: 'LIMITED',
              ear: 0.29,
              leftEar: 0.29,
              rightEar: 0.29,
              consecutiveVisibleFrames: 0,
              consecutiveLimitedFrames: 18,
              consecutiveUnavailableFrames: 0,
            },
          };
        } else if (selectedPreset === 'PHONE_ONLY') {
          // DEMO 4: Phone Only (Helmet Compliant, Eyes Monitored, Phone Violation)
          presetRawTelemetry = {
            helmetStatus: 'HELMET_DETECTED',
            helmetConfidence: 93,
            riderDetected: true,
            twoWheelerDetected: true,
            phoneDistractionRisk: 'HIGH',
            phoneDistractionConfidence: 88,
            sustainedViolationSec: 0,
            isAlertActive: true,
            timestamp: Date.now(),
            phoneDetected: true,
            phoneAssociatedWithRider: true,
            phoneStatus: 'PHONE_DISTRACTION_WARNING',
            phoneConfidence: 88,
            phoneDurationSec: 3.5,
            phoneBox: { x: 0.62, y: 0.28, width: 0.14, height: 0.22 },
            phoneModelReady: true,

            smartHelmetState: 'HELMET_EYES_VISIBLE',
            eyeVisibility: 'VISIBLE',
            eyeMonitoring: 'ACTIVE',
            visorStatus: 'CLEAR',
            visorDescription: 'Clear visor. Eyes monitored.',
            eyeConfidence: 91,
            faceConfidence: 93,
            ear: 0.31,
            leftEar: 0.31,
            rightEar: 0.31,
            isEyeClosed: false,
            eyeClosureDurationMs: 0,
            drowsinessAlertActive: false,
            debugDiagnostics: {
              helmetConfidence: 93,
              faceConfidence: 93,
              eyeVisibilityConfidence: 91,
              smartHelmetState: 'HELMET_EYES_VISIBLE',
              eyeMonitoringState: 'ACTIVE',
              ear: 0.31,
              leftEar: 0.31,
              rightEar: 0.31,
              consecutiveVisibleFrames: 22,
              consecutiveLimitedFrames: 0,
              consecutiveUnavailableFrames: 0,
            },
          };
        } else if (selectedPreset === 'DISTRACTED_RIDER') {
          // DEMO 5: Helmet + Phone (Helmet compliant, but holding smartphone near ear)
          presetRawTelemetry = {
            helmetStatus: 'HELMET_DETECTED',
            helmetConfidence: 90,
            riderDetected: true,
            twoWheelerDetected: true,
            phoneDistractionRisk: 'HIGH',
            phoneDistractionConfidence: 86,
            sustainedViolationSec: 0,
            isAlertActive: true,
            timestamp: Date.now(),
            phoneDetected: true,
            phoneAssociatedWithRider: true,
            phoneStatus: 'PHONE_DISTRACTION_WARNING',
            phoneConfidence: 86,
            phoneDurationSec: 3.8,
            phoneBox: { x: 0.62, y: 0.28, width: 0.14, height: 0.22 },
            phoneModelReady: true,

            smartHelmetState: 'HELMET_EYES_VISIBLE',
            eyeVisibility: 'VISIBLE',
            eyeMonitoring: 'ACTIVE',
            visorStatus: 'CLEAR',
            visorDescription: 'Clear visor. Eyes monitored.',
            eyeConfidence: 90,
            faceConfidence: 91,
            ear: 0.31,
            leftEar: 0.31,
            rightEar: 0.31,
            isEyeClosed: false,
            eyeClosureDurationMs: 0,
            drowsinessAlertActive: false,
            debugDiagnostics: {
              helmetConfidence: 90,
              faceConfidence: 91,
              eyeVisibilityConfidence: 90,
              smartHelmetState: 'HELMET_EYES_VISIBLE',
              eyeMonitoringState: 'ACTIVE',
              ear: 0.31,
              leftEar: 0.31,
              rightEar: 0.31,
              consecutiveVisibleFrames: 20,
              consecutiveLimitedFrames: 0,
              consecutiveUnavailableFrames: 0,
            },
          };
        } else if (selectedPreset === 'SHOULDER_CHECK') {
          // DEMO 7: Pre-Maneuver Lifesaver Look (Shoulder Check)
          presetRawTelemetry = {
            helmetStatus: 'HELMET_DETECTED',
            helmetConfidence: 96,
            riderDetected: true,
            twoWheelerDetected: true,
            phoneDistractionRisk: 'NONE',
            phoneDistractionConfidence: 0,
            sustainedViolationSec: 0,
            isAlertActive: false,
            timestamp: Date.now(),
            phoneDetected: false,
            phoneAssociatedWithRider: false,
            phoneStatus: 'PHONE_NOT_DETECTED',
            phoneConfidence: 0,
            phoneDurationSec: 0,
            phoneBox: null,
            phoneModelReady: true,

            smartHelmetState: 'HELMET_EYES_VISIBLE',
            eyeVisibility: 'VISIBLE',
            eyeMonitoring: 'ACTIVE',
            visorStatus: 'CLEAR',
            visorDescription: 'Pre-maneuver blindspot check engaged. Head turned 36° left.',
            eyeConfidence: 92,
            faceConfidence: 94,
            ear: 0.31,
            leftEar: 0.31,
            rightEar: 0.31,
            isEyeClosed: false,
            eyeClosureDurationMs: 0,
            drowsinessAlertActive: false,
            headYaw: -36,
            headPitch: 4,
            headRoll: -8,
            headMotionState: 'LEFT_SHOULDER_CHECK' as const,
            headSlumpDurationMs: 0,
            isHeadSlumped: false,
            lifesaverAudit: {
              lastCheckDirection: 'LEFT' as const,
              lastCheckTimestamp: Date.now() - 500,
              totalChecksThisRide: 4,
              isPerformingCheck: true,
            },
          };
        } else if (selectedPreset === 'HEAD_SLUMP') {
          // DEMO 8: Head Slump / Micro-sleep Nod
          presetRawTelemetry = {
            helmetStatus: 'HELMET_DETECTED',
            helmetConfidence: 93,
            riderDetected: true,
            twoWheelerDetected: true,
            phoneDistractionRisk: 'NONE',
            phoneDistractionConfidence: 0,
            sustainedViolationSec: 0,
            isAlertActive: true,
            timestamp: Date.now(),
            phoneDetected: false,
            phoneAssociatedWithRider: false,
            phoneStatus: 'PHONE_NOT_DETECTED',
            phoneConfidence: 0,
            phoneDurationSec: 0,
            phoneBox: null,
            phoneModelReady: true,

            smartHelmetState: 'HELMET_EYES_VISIBLE',
            eyeVisibility: 'VISIBLE',
            eyeMonitoring: 'ACTIVE',
            visorStatus: 'CLEAR',
            visorDescription: 'Downward head slump observed. Micro-sleep nod alert active.',
            eyeConfidence: 85,
            faceConfidence: 91,
            ear: 0.18,
            leftEar: 0.18,
            rightEar: 0.18,
            isEyeClosed: true,
            eyeClosureDurationMs: 1400,
            drowsinessAlertActive: true,
            headYaw: 3,
            headPitch: -24,
            headRoll: 2,
            headMotionState: 'HEAD_SLUMP_NOD' as const,
            headSlumpDurationMs: 1400,
            isHeadSlumped: true,
            lifesaverAudit: {
              lastCheckDirection: 'RIGHT' as const,
              lastCheckTimestamp: Date.now() - 12000,
              totalChecksThisRide: 2,
              isPerformingCheck: false,
            },
          };
        } else {
          // DEMO 6: BOTH_VIOLATIONS (No helmet + holding smartphone near ear - Dual Warning)
          presetRawTelemetry = {
            helmetStatus: 'HELMET_NOT_DETECTED',
            helmetConfidence: 91,
            riderDetected: true,
            twoWheelerDetected: true,
            phoneDistractionRisk: 'HIGH',
            phoneDistractionConfidence: 89,
            sustainedViolationSec: 6.8,
            isAlertActive: true,
            timestamp: Date.now(),
            phoneDetected: true,
            phoneAssociatedWithRider: true,
            phoneStatus: 'PHONE_DISTRACTION_WARNING',
            phoneConfidence: 89,
            phoneDurationSec: 4.2,
            phoneBox: { x: 0.62, y: 0.28, width: 0.14, height: 0.22 },
            phoneModelReady: true,

            smartHelmetState: 'NO_HELMET',
            eyeVisibility: 'UNAVAILABLE',
            eyeMonitoring: 'UNAVAILABLE',
            visorStatus: 'UNAVAILABLE_BLOCKED',
            visorDescription: 'Helmet absent; eye monitoring unavailable.',
            eyeConfidence: 0,
            faceConfidence: 90,
            ear: 0,
            leftEar: 0,
            rightEar: 0,
            isEyeClosed: false,
            eyeClosureDurationMs: 0,
            drowsinessAlertActive: false,
            debugDiagnostics: {
              helmetConfidence: 91,
              faceConfidence: 90,
              eyeVisibilityConfidence: 0,
              smartHelmetState: 'NO_HELMET',
              eyeMonitoringState: 'UNAVAILABLE',
              ear: 0,
              leftEar: 0,
              rightEar: 0,
              consecutiveVisibleFrames: 0,
              consecutiveLimitedFrames: 0,
              consecutiveUnavailableFrames: 25,
            },
          };
        }

        const presetTelemetry: RiderTelemetry = {
          headYaw: 0,
          headPitch: 0,
          headRoll: 0,
          headMotionState: 'CENTER_FORWARD' as const,
          headSlumpDurationMs: 0,
          isHeadSlumped: false,
          isHeadTilted: false,
          headTiltDurationMs: 0,
          lifesaverAudit: {
            lastCheckDirection: null,
            lastCheckTimestamp: 0,
            totalChecksThisRide: 0,
            isPerformingCheck: false,
          },
          isHelmetBypassed: isHelmetBypassedRef.current,
          ...presetRawTelemetry,
        };

        setTelemetry(presetTelemetry);

        // Independent risk score calculation
        let score = 10;
        const factors = [];
        if (presetTelemetry.helmetStatus === 'HELMET_NOT_DETECTED') {
          score += 55;
          factors.push({
            id: 'no_helmet',
            label: 'No Helmet Detected',
            severity: 'high' as const,
            points: 55,
            description: `Rider observed without protective headgear for ${presetTelemetry.sustainedViolationSec}s`,
          });
        }
        if (presetTelemetry.phoneStatus === 'PHONE_DISTRACTION_WARNING') {
          score += 40;
          factors.push({
            id: 'phone_distraction',
            label: 'Sustained Phone Distraction',
            severity: 'high' as const,
            points: 40,
            description: `Smartphone held near ear/head for ${presetTelemetry.phoneDurationSec}s`,
          });
        } else if (presetTelemetry.phoneStatus === 'POSSIBLE_PHONE_DISTRACTION') {
          score += 25;
          factors.push({
            id: 'phone_possible',
            label: 'Possible Phone Distraction',
            severity: 'moderate' as const,
            points: 25,
            description: 'Smartphone detected in rider zone; awaiting confirmation',
          });
        }

        if (presetTelemetry.smartHelmetState === 'HELMET_EYES_LIMITED') {
          factors.push({
            id: 'visor_limited_advisory',
            label: 'Eye Visibility Limited (Monitoring Paused)',
            severity: 'low' as const,
            points: 0,
            description: presetTelemetry.visorDescription,
          });
        }

        const tier =
          score >= 70 ? 'CRITICAL' : score >= 45 ? 'HIGH' : score >= 25 ? 'MODERATE' : 'LOW';

        let actionText = 'Nominal rider compliance';
        if (
          presetTelemetry.helmetStatus === 'HELMET_NOT_DETECTED' &&
          presetTelemetry.phoneStatus === 'PHONE_DISTRACTION_WARNING'
        ) {
          actionText = 'CRITICAL: Helmet not detected and phone distraction detected. Please stop safely.';
        } else if (presetTelemetry.helmetStatus === 'HELMET_NOT_DETECTED') {
          actionText = 'Safety alert: Helmet not detected. Please wear a helmet.';
        } else if (presetTelemetry.phoneStatus === 'PHONE_DISTRACTION_WARNING') {
          actionText = 'Audio advisory: Please keep your phone away while riding.';
        } else if (presetTelemetry.smartHelmetState === 'HELMET_EYES_LIMITED') {
          actionText = 'Advisory: Eye visibility is limited. Eye monitoring is paused.';
        }

        setAssessment({
          score: Math.min(100, score),
          tier,
          helmetStatus: presetTelemetry.helmetStatus,
          confidence: presetTelemetry.helmetConfidence,
          factors,
          recommendedAction: actionText,
        });

        animFrameIdRef.current = requestAnimationFrame(processFrame);
        return;
      }

      // Live Webcam Vision Pipeline
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;
      const detector = detectorRef.current;

      if (
        video &&
        canvas &&
        landmarker &&
        video.readyState >= 2 &&
        now - lastInferenceRef.current >= 45 // ~22 FPS throttling for simultaneous face & phone inference
      ) {
        lastInferenceRef.current = now;

        // Auto re-attach if unmounted
        if (streamRef.current && (!video.srcObject || video.srcObject !== streamRef.current)) {
          video.srcObject = streamRef.current;
          video.play().catch(() => {});
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;
          const cw = canvas.width;
          const ch = canvas.height;
          ctx.clearRect(0, 0, cw, ch);

          try {
            // 1. Run MediaPipe FaceLandmarker for Helmet & Cranial Analysis
            const faceResult = landmarker.detectForVideo(video, now);

            let riderFound = false;
            let helmetStatus: HelmetStatus = 'UNCERTAIN';
            let helmetConf = 0;
            let sustainedHelmetSec = 0;
            let headNormBox: BoundingBox2D | null = null;
            let avgEar = 0;
            let leftEAR = 0;
            let rightEAR = 0;
            let rawEyeConfidence = 0;
            let isEyeClosed = false;
            let eyeClosureDurationMs = 0;
            let drowsinessAlertActive = false;

            // 3D Head Motion & Orientation Metrics
            let headYaw = 0;
            let headPitch = 0;
            let headRoll = 0;
            let headMotionState: RiderHeadMotionState = 'CENTER_FORWARD';
            let isHeadSlumped = false;
            let headSlumpDurationMs = 0;
            let isHeadTilted = false;
            let headTiltDurationMs = 0;
            let isPerformingCheck = false;

            if (faceResult && faceResult.faceLandmarks && faceResult.faceLandmarks.length > 0) {
              riderFound = true;
              const landmarks = faceResult.faceLandmarks[0];

              // Key cranial landmarks
              const topHeadY = landmarks[10].y;
              const chinY = landmarks[152].y;
              const leftX = landmarks[234].x;
              const rightX = landmarks[454].x;
              const faceHeight = Math.abs(chinY - topHeadY);
              const faceWidth = Math.abs(rightX - leftX);

              // Inspect cranial dome region above forehead
              const domeYNorm = Math.max(0, topHeadY - faceHeight * 0.35);

              // Head bounding box in normalized [0, 1] coordinates
              const hNormX = Math.max(0, leftX - 0.05);
              const hNormY = Math.max(0, domeYNorm - 0.08);
              const hNormW = Math.min(1 - hNormX, faceWidth + 0.1);
              const hNormH = Math.min(1 - hNormY, faceHeight + 0.45);
              headNormBox = { x: hNormX, y: hNormY, width: hNormW, height: hNormH };

              // Forensic Cranial Headgear Assessment:
              const eyebrowY = landmarks[9]?.y ?? (topHeadY + faceHeight * 0.28);
              const foreheadSpan = Math.abs(eyebrowY - topHeadY);
              const foreheadRatio = foreheadSpan / (faceHeight + 0.001);

              let rawStatus: HelmetStatus = 'HELMET_NOT_DETECTED';
              let rawConf = 88;

              if (topHeadY <= 0.04 || domeYNorm <= 0.01) {
                // Head is cropped off top edge of camera viewport
                rawStatus = 'UNCERTAIN';
                rawConf = 52;
              } else if (foreheadRatio < 0.06) {
                // Forehead is occluded down to brow level (potential helmet shell/visor rim)
                rawStatus = 'UNCERTAIN';
                rawConf = 65;
              } else {
                // Forehead skin and hairline are clearly visible: bare head / hair / headphones
                rawStatus = 'HELMET_NOT_DETECTED';
                rawConf = 88;
              }

              // Temporal Confirmation: require multiple consistent frames
              if (rawStatus === 'HELMET_NOT_DETECTED') {
                consecutiveNoHelmetFramesRef.current++;
                consecutiveHelmetFramesRef.current = 0;
                if (consecutiveNoHelmetFramesRef.current >= 4) {
                  confirmedHelmetStatusRef.current = 'HELMET_NOT_DETECTED';
                }
              } else if (rawStatus === 'UNCERTAIN') {
                consecutiveNoHelmetFramesRef.current = 0;
                consecutiveHelmetFramesRef.current = 0;
                confirmedHelmetStatusRef.current = 'UNCERTAIN';
              } else {
                consecutiveHelmetFramesRef.current++;
                consecutiveNoHelmetFramesRef.current = 0;
                if (consecutiveHelmetFramesRef.current >= 15) {
                  confirmedHelmetStatusRef.current = 'HELMET_DETECTED';
                }
              }

              // Apply Helmet Verification Bypass if enabled (Demo / Presentation Mode)
              if (isHelmetBypassedRef.current) {
                rawStatus = 'HELMET_DETECTED';
                rawConf = 98;
                consecutiveHelmetFramesRef.current = 10;
                consecutiveNoHelmetFramesRef.current = 0;
                confirmedHelmetStatusRef.current = 'HELMET_DETECTED';
                helmetStatus = 'HELMET_DETECTED';
                helmetConf = 98;
                sustainedHelmetSec = 0;
                helmetAbsentSinceRef.current = null;
              } else {
                helmetStatus = confirmedHelmetStatusRef.current;
                helmetConf = rawConf;

                // Update temporal counters for helmet absence
                if (helmetStatus === 'HELMET_NOT_DETECTED') {
                  if (helmetAbsentSinceRef.current === null) {
                    helmetAbsentSinceRef.current = now;
                  }
                  sustainedHelmetSec = (now - helmetAbsentSinceRef.current) / 1000;
                } else {
                  helmetAbsentSinceRef.current = null;
                  sustainedHelmetSec = 0;
                }
              }

              // 3D Head Pose & Motion Analysis (Yaw, Pitch, Roll)
              const pNose = landmarks[1];
              const pLeftCheek = landmarks[234];
              const pRightCheek = landmarks[454];

              // Yaw: Horizontal turn (-65° left to +65° right)
              // With mirrored webcam view, looking to rider's right moves nose to the right on screen.
              const faceCenterX = (pLeftCheek.x + pRightCheek.x) / 2;
              const faceSpanW = Math.max(0.001, Math.abs(pRightCheek.x - pLeftCheek.x));
              const rawYaw = ((pNose.x - faceCenterX) / faceSpanW) * 120;
              headYaw = Math.round(Math.max(-65, Math.min(65, rawYaw)));

              // Pitch: Vertical nod (-45° down to +45° up)
              const faceSpanH = Math.max(0.001, Math.abs(chinY - topHeadY));
              const noseRelativeY = (pNose.y - topHeadY) / faceSpanH;
              const rawPitch = (0.52 - noseRelativeY) * 130;
              headPitch = Math.round(Math.max(-45, Math.min(45, rawPitch)));

              // Roll: Head tilt (-35° to +35°)
              const dEyeX = landmarks[263].x - landmarks[33].x;
              const dEyeY = landmarks[263].y - landmarks[33].y;
              headRoll = Math.round(Math.max(-35, Math.min(35, (Math.atan2(dEyeY, dEyeX) * 180) / Math.PI)));

              // 1. Pre-Maneuver Lifesaver Look (Blind-spot Shoulder Check):
              // Natural responsive threshold: ±22°
              if (headYaw <= -22) {
                isPerformingCheck = true;
                if (lifesaverCheckStartRef.current === null || lifesaverCheckStartRef.current.dir !== 'LEFT') {
                  lifesaverCheckStartRef.current = { dir: 'LEFT', time: now };
                } else if (now - lifesaverCheckStartRef.current.time >= 150) {
                  if (lastLifesaverTimestampRef.current === 0 || now - lastLifesaverTimestampRef.current > 1200) {
                    totalLifesaverChecksRef.current += 1;
                    lastLifesaverDirectionRef.current = 'LEFT';
                    lastLifesaverTimestampRef.current = now;
                  }
                }
              } else if (headYaw >= 22) {
                isPerformingCheck = true;
                if (lifesaverCheckStartRef.current === null || lifesaverCheckStartRef.current.dir !== 'RIGHT') {
                  lifesaverCheckStartRef.current = { dir: 'RIGHT', time: now };
                } else if (now - lifesaverCheckStartRef.current.time >= 150) {
                  if (lastLifesaverTimestampRef.current === 0 || now - lastLifesaverTimestampRef.current > 1200) {
                    totalLifesaverChecksRef.current += 1;
                    lastLifesaverDirectionRef.current = 'RIGHT';
                    lastLifesaverTimestampRef.current = now;
                  }
                }
              } else {
                lifesaverCheckStartRef.current = null;
              }

              // 2. Head Down / Forward Slump Nod (High Sensitivity: <= -6°, 350ms):
              if (headPitch <= -6) {
                if (headSlumpStartRef.current === null) {
                  headSlumpStartRef.current = now;
                }
                headSlumpDurationMs = Math.round(now - headSlumpStartRef.current);
                if (headSlumpDurationMs >= 350) {
                  isHeadSlumped = true;
                  headMotionState = 'HEAD_SLUMP_NOD';
                }
              } else {
                headSlumpStartRef.current = null;
                headSlumpDurationMs = 0;
                isHeadSlumped = false;
              }

              // 3. Head / Shoulder Lateral Tilt (Roll Left or Right: >= 10°, 350ms):
              if (Math.abs(headRoll) >= 10) {
                if (headTiltStartRef.current === null) {
                  headTiltStartRef.current = now;
                }
                headTiltDurationMs = Math.round(now - headTiltStartRef.current);
                if (headTiltDurationMs >= 350) {
                  isHeadTilted = true;
                  if (!isHeadSlumped) {
                    headMotionState = headRoll > 0 ? 'LATERAL_TILT_RIGHT' : 'LATERAL_TILT_LEFT';
                  }
                }
              } else {
                headTiltStartRef.current = null;
                headTiltDurationMs = 0;
                isHeadTilted = false;
              }

              // 4. Center Forward vs Shoulder Check vs Lateral Glance:
              if (!isHeadSlumped && !isHeadTilted) {
                if (isPerformingCheck) {
                  headMotionState = headYaw <= -22 ? 'LEFT_SHOULDER_CHECK' : 'RIGHT_SHOULDER_CHECK';
                } else if (Math.abs(headYaw) > 10) {
                  headMotionState = 'LATERAL_GLANCE';
                } else {
                  headMotionState = 'CENTER_FORWARD';
                }
              }

              // --- Smart Helmet & Eye Visibility / Visor Safety Layer ---
              const pL1 = landmarks[LEFT_EYE.outer];
              const pL2 = landmarks[LEFT_EYE.inner];
              const pLTop1 = landmarks[LEFT_EYE.top1];
              const pLBot1 = landmarks[LEFT_EYE.bottom1];
              const pLTop2 = landmarks[LEFT_EYE.top2];
              const pLBot2 = landmarks[LEFT_EYE.bottom2];

              const pR1 = landmarks[RIGHT_EYE.inner];
              const pR2 = landmarks[RIGHT_EYE.outer];
              const pRTop1 = landmarks[RIGHT_EYE.top1];
              const pRBot1 = landmarks[RIGHT_EYE.bottom1];
              const pRTop2 = landmarks[RIGHT_EYE.top2];
              const pRBot2 = landmarks[RIGHT_EYE.bottom2];

              const leftEyeWidth = dist(pL1, pL2);
              const rightEyeWidth = dist(pR1, pR2);
              const leftEyeHeight = (dist(pLTop1, pLBot1) + dist(pLTop2, pLBot2)) / 2;
              const rightEyeHeight = (dist(pRTop1, pRBot1) + dist(pRTop2, pRBot2)) / 2;

              leftEAR = leftEyeHeight / Math.max(0.001, leftEyeWidth);
              rightEAR = rightEyeHeight / Math.max(0.001, rightEyeWidth);
              avgEar = Number(((leftEAR + rightEAR) / 2).toFixed(3));

              const areEyePointsInBounds =
                pL1.x > 0 && pL1.x < 1 && pL1.y > 0 && pL1.y < 1 &&
                pR2.x > 0 && pR2.x < 1 && pR2.y > 0 && pR2.y < 1;

              const normEyeWidthRatio = (leftEyeWidth + rightEyeWidth) / (2 * Math.max(0.001, faceWidth));
              const hasPlausibleEyeGeometry =
                areEyePointsInBounds &&
                normEyeWidthRatio > 0.08 &&
                normEyeWidthRatio < 0.45 &&
                leftEyeWidth > 0.015 &&
                rightEyeWidth > 0.015;

              // Optical transmittance sampling in eye region
              let eyeLuminance = 120;
              let eyeContrast = 50;
              let isDarkVisor = false;
              let isGlareDetected = false;

              if (hasPlausibleEyeGeometry && ctx) {
                try {
                  const eyeMinX = Math.max(0, Math.floor(Math.min(pL1.x, pR2.x) * cw));
                  const eyeMaxX = Math.min(cw, Math.ceil(Math.max(pL2.x, pR1.x) * cw));
                  const eyeMinY = Math.max(0, Math.floor((Math.min(pLTop1.y, pRTop1.y) - 0.02) * ch));
                  const eyeMaxY = Math.min(ch, Math.ceil((Math.max(pLBot1.y, pRBot1.y) + 0.02) * ch));
                  const eyeW = eyeMaxX - eyeMinX;
                  const eyeH = eyeMaxY - eyeMinY;

                  if (eyeW > 8 && eyeH > 6) {
                    const imgData = ctx.getImageData(eyeMinX, eyeMinY, eyeW, eyeH);
                    const d = imgData.data;
                    let totalLum = 0;
                    let minLum = 255;
                    let maxLum = 0;
                    const sampleStep = 16;
                    let count = 0;
                    for (let i = 0; i < d.length; i += sampleStep) {
                      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
                      totalLum += lum;
                      if (lum < minLum) minLum = lum;
                      if (lum > maxLum) maxLum = lum;
                      count++;
                    }
                    if (count > 0) {
                      eyeLuminance = totalLum / count;
                      eyeContrast = maxLum - minLum;
                      if (eyeLuminance < 45 && eyeContrast < 35) {
                        isDarkVisor = true;
                      }
                      if (maxLum > 248 && eyeLuminance > 195) {
                        isGlareDetected = true;
                      }
                    }
                  }
                } catch {
                  // Fallback if canvas security policy restricts pixel reading
                }
              }

              // Derived Eye Visibility Confidence (0 - 100%)
              rawEyeConfidence = 0;
              let rawEyeStatus: EyeVisibilityStatus = 'UNAVAILABLE';
              let rawVisorEvidence: VisorEvidenceStatus = 'CLEAR';
              let rawVisorDesc = 'Clear optical visor. Both eyes tracked.';

              if (!hasPlausibleEyeGeometry) {
                rawEyeConfidence = 10;
                rawEyeStatus = 'UNAVAILABLE';
                rawVisorEvidence = 'UNAVAILABLE_BLOCKED';
                rawVisorDesc = 'Eye region cannot be reliably observed.';
              } else if (isDarkVisor) {
                rawEyeConfidence = 35;
                rawEyeStatus = 'LIMITED';
                rawVisorEvidence = 'TINTED_VISOR_DETECTED';
                rawVisorDesc = 'TINTED VISOR DETECTED: Reduced optical transmittance in eye region.';
              } else if (isGlareDetected) {
                rawEyeConfidence = 45;
                rawEyeStatus = 'LIMITED';
                rawVisorEvidence = 'LIMITED_TINT_OR_GLARE';
                rawVisorDesc = 'Eye visibility limited: surface glare detected.';
              } else {
                rawEyeConfidence = Math.min(98, Math.round(75 + normEyeWidthRatio * 65));
                rawEyeStatus = 'VISIBLE';
                rawVisorEvidence = 'CLEAR';
                rawVisorDesc = 'Visor clear; both eyes reliably visible.';
              }

              // State Machine with Temporal Debouncing & Hysteresis
              if (isHelmetBypassedRef.current && hasPlausibleEyeGeometry) {
                // When Helmet Bypass is active, immediately engage ACTIVE eye monitoring
                confirmedSmartHelmetStateRef.current = 'HELMET_EYES_VISIBLE';
                confirmedEyeMonitoringRef.current = 'ACTIVE';
                confirmedEyeVisibilityRef.current = 'VISIBLE';
                confirmedVisorStatusRef.current = 'CLEAR';
                confirmedVisorDescRef.current = 'Visor clear; eye monitoring active.';
                consecutiveVisibleFramesRef.current = 10;
                consecutiveLimitedFramesRef.current = 0;
                consecutiveUnavailableFramesRef.current = 0;
              } else if (helmetStatus === 'HELMET_NOT_DETECTED') {
                confirmedSmartHelmetStateRef.current = 'NO_HELMET';
                confirmedEyeMonitoringRef.current = 'UNAVAILABLE';
                confirmedEyeVisibilityRef.current = 'UNAVAILABLE';
                confirmedVisorStatusRef.current = 'UNAVAILABLE_BLOCKED';
                confirmedVisorDescRef.current = 'Protective headgear absent. Eye monitoring unavailable.';
                consecutiveVisibleFramesRef.current = 0;
                consecutiveLimitedFramesRef.current = 0;
                consecutiveUnavailableFramesRef.current = 0;
              } else if (helmetStatus === 'HELMET_DETECTED') {
                if (rawEyeStatus === 'VISIBLE') {
                  consecutiveVisibleFramesRef.current++;
                  consecutiveLimitedFramesRef.current = 0;
                  consecutiveUnavailableFramesRef.current = 0;
                  if (consecutiveVisibleFramesRef.current >= 4) {
                    confirmedSmartHelmetStateRef.current = 'HELMET_EYES_VISIBLE';
                    confirmedEyeMonitoringRef.current = 'ACTIVE';
                    confirmedEyeVisibilityRef.current = 'VISIBLE';
                    confirmedVisorStatusRef.current = 'CLEAR';
                    confirmedVisorDescRef.current = 'Visor clear; eye monitoring active.';
                  }
                } else if (rawEyeStatus === 'LIMITED') {
                  consecutiveLimitedFramesRef.current++;
                  consecutiveVisibleFramesRef.current = 0;
                  consecutiveUnavailableFramesRef.current = 0;
                  if (consecutiveLimitedFramesRef.current >= 6) {
                    confirmedSmartHelmetStateRef.current = 'HELMET_EYES_LIMITED';
                    confirmedEyeMonitoringRef.current = 'LIMITED';
                    confirmedEyeVisibilityRef.current = 'LIMITED';
                    confirmedVisorStatusRef.current = rawVisorEvidence;
                    confirmedVisorDescRef.current = rawVisorDesc;
                  }
                } else {
                  consecutiveUnavailableFramesRef.current++;
                  consecutiveVisibleFramesRef.current = 0;
                  consecutiveLimitedFramesRef.current = 0;
                  if (consecutiveUnavailableFramesRef.current >= 10) {
                    confirmedSmartHelmetStateRef.current = 'HELMET_EYES_UNAVAILABLE';
                    confirmedEyeMonitoringRef.current = 'UNAVAILABLE';
                    confirmedEyeVisibilityRef.current = 'UNAVAILABLE';
                    confirmedVisorStatusRef.current = 'UNAVAILABLE_BLOCKED';
                    confirmedVisorDescRef.current = 'Eye region cannot be reliably observed.';
                  }
                }
              }

              // --- DROWSINESS SAFETY GATE ---
              // MISSING EYE LANDMARKS MUST NEVER BE INTERPRETED AS CLOSED EYES!
              isEyeClosed = false;
              eyeClosureDurationMs = 0;
              drowsinessAlertActive = false;

              if (confirmedEyeMonitoringRef.current === 'ACTIVE') {
                // Eye monitoring is ACTIVE: evaluate genuine EAR closure (< 0.17, sustained >= 1.0s)
                if (avgEar < 0.17 && avgEar >= 0) {
                  isEyeClosed = true;
                  if (eyeClosureStartRef.current === null) {
                    eyeClosureStartRef.current = now;
                  }
                  eyeClosureDurationMs = Math.round(now - eyeClosureStartRef.current);
                  if (eyeClosureDurationMs >= 1000) {
                    drowsinessAlertActive = true;
                  }
                } else {
                  eyeClosureStartRef.current = null;
                  isEyeClosed = false;
                  eyeClosureDurationMs = 0;
                  drowsinessAlertActive = false;
                }
              } else {
                eyeClosureStartRef.current = null;
                isEyeClosed = false;
                eyeClosureDurationMs = 0;
                drowsinessAlertActive = false;
              }

              // Draw Helmet Bounding Box on Canvas (Unmirrored on canvas to keep text readable)
              const mirroredHeadX = (1 - (headNormBox.x + headNormBox.width)) * cw;
              const headPxY = headNormBox.y * ch;
              const headPxW = headNormBox.width * cw;
              const headPxH = headNormBox.height * ch;

              const helmetBorderColor =
                helmetStatus === 'HELMET_DETECTED'
                  ? '#10b981'
                  : helmetStatus === 'HELMET_NOT_DETECTED'
                  ? '#ef4444'
                  : '#f59e0b';
              const helmetBorderGlow =
                helmetStatus === 'HELMET_DETECTED'
                  ? 'rgba(16, 185, 129, 0.18)'
                  : helmetStatus === 'HELMET_NOT_DETECTED'
                  ? 'rgba(239, 68, 68, 0.22)'
                  : 'rgba(245, 158, 11, 0.18)';

              // 1. Subtle Bounding Enclosure
              ctx.lineWidth = 1;
              ctx.strokeStyle = helmetBorderGlow;
              ctx.strokeRect(mirroredHeadX, headPxY, headPxW, headPxH);

              // 2. High-Tech ADAS Corner Brackets
              const cornerLen = Math.max(12, Math.min(26, headPxW * 0.22));
              ctx.lineWidth = 2.5;
              ctx.strokeStyle = helmetBorderColor;
              ctx.lineCap = 'round';

              // Top-Left Corner
              ctx.beginPath();
              ctx.moveTo(mirroredHeadX, headPxY + cornerLen);
              ctx.lineTo(mirroredHeadX, headPxY);
              ctx.lineTo(mirroredHeadX + cornerLen, headPxY);
              ctx.stroke();

              // Top-Right Corner
              ctx.beginPath();
              ctx.moveTo(mirroredHeadX + headPxW - cornerLen, headPxY);
              ctx.lineTo(mirroredHeadX + headPxW, headPxY);
              ctx.lineTo(mirroredHeadX + headPxW, headPxY + cornerLen);
              ctx.stroke();

              // Bottom-Left Corner
              ctx.beginPath();
              ctx.moveTo(mirroredHeadX, headPxY + headPxH - cornerLen);
              ctx.lineTo(mirroredHeadX, headPxY + headPxH);
              ctx.lineTo(mirroredHeadX + cornerLen, headPxY + headPxH);
              ctx.stroke();

              // Bottom-Right Corner
              ctx.beginPath();
              ctx.moveTo(mirroredHeadX + headPxW - cornerLen, headPxY + headPxH);
              ctx.lineTo(mirroredHeadX + headPxW, headPxY + headPxH);
              ctx.lineTo(mirroredHeadX + headPxW, headPxY + headPxH - cornerLen);
              ctx.stroke();

              // 3. Floating ADAS Pill (UNMIRRORED, Sharp & Modern)
              const hLabel = isHelmetBypassedRef.current
                ? 'HELMET BYPASSED (DEMO MODE)'
                : helmetStatus === 'HELMET_DETECTED'
                ? `HELMET DETECTED (${helmetConf}%)`
                : helmetStatus === 'HELMET_NOT_DETECTED'
                ? `NO HELMET (${helmetConf}%)`
                : `HEAD DETECTED · UNCERTAIN (${helmetConf}%)`;

              const effectiveBorderColor = isHelmetBypassedRef.current ? '#34d399' : helmetBorderColor;

              ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
              const textWidth = ctx.measureText(hLabel).width;
              const badgeW = textWidth + 24;
              const badgeH = 22;
              const badgeX = Math.max(8, Math.min(cw - badgeW - 8, mirroredHeadX));
              const badgeY = Math.max(8, headPxY - badgeH - 6);

              // Pill background with glass border
              ctx.fillStyle = 'rgba(9, 10, 14, 0.88)';
              ctx.strokeStyle = effectiveBorderColor;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 5);
              ctx.fill();
              ctx.stroke();

              // Indicator status dot
              ctx.fillStyle = effectiveBorderColor;
              ctx.beginPath();
              ctx.arc(badgeX + 10, badgeY + badgeH / 2, 3, 0, Math.PI * 2);
              ctx.fill();

              // Crisp unmirrored white label
              ctx.fillStyle = '#ffffff';
              ctx.fillText(hLabel, badgeX + 18, badgeY + 15);

              // 4. Two-Wheeler Head Motion & Lifesaver HUD Strip (Underneath Head Box)
              let motionLabel = `YAW: ${headYaw > 0 ? '+' : ''}${headYaw}° · PITCH: ${headPitch > 0 ? '+' : ''}${headPitch}° · ROLL: ${headRoll > 0 ? '+' : ''}${headRoll}°`;
              let motionBgColor = 'rgba(9, 10, 14, 0.9)';
              let motionTextColor = '#a1a1aa';
              let motionBorderColor = 'rgba(161, 161, 170, 0.3)';

              if (isEyeClosed && eyeClosureDurationMs >= 350) {
                motionLabel = `⚠ EYES CLOSED [DROWSINESS] (${(eyeClosureDurationMs / 1000).toFixed(1)}s)`;
                motionBgColor = 'rgba(239, 68, 68, 0.95)';
                motionTextColor = '#ffffff';
                motionBorderColor = '#ef4444';
              } else if (isHeadSlumped) {
                motionLabel = `⚠ HEAD DOWN / SLUMP (${(headSlumpDurationMs / 1000).toFixed(1)}s)`;
                motionBgColor = 'rgba(239, 68, 68, 0.95)';
                motionTextColor = '#ffffff';
                motionBorderColor = '#ef4444';
              } else if (isHeadTilted) {
                motionLabel = `⚠ TILT ${headRoll > 0 ? 'RIGHT' : 'LEFT'} (${Math.abs(headRoll)}°) · ${(headTiltDurationMs / 1000).toFixed(1)}s`;
                motionBgColor = 'rgba(239, 68, 68, 0.95)';
                motionTextColor = '#ffffff';
                motionBorderColor = '#ef4444';
              } else if (isPerformingCheck) {
                motionLabel = `👁 LIFESAVER CHECK [${headMotionState === 'LEFT_SHOULDER_CHECK' ? 'LEFT' : 'RIGHT'}] #${totalLifesaverChecksRef.current}`;
                motionBgColor = 'rgba(16, 185, 129, 0.95)';
                motionTextColor = '#ffffff';
                motionBorderColor = '#10b981';
              } else if (headMotionState === 'LATERAL_GLANCE') {
                motionLabel = `LATERAL GLANCE (${headYaw > 0 ? '+' : ''}${headYaw}°)`;
                motionBorderColor = 'rgba(245, 158, 11, 0.5)';
                motionTextColor = '#fcd34d';
              }

              ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
              const mTextW = ctx.measureText(motionLabel).width;
              const mBadgeW = mTextW + 18;
              const mBadgeH = 19;
              const mBadgeX = Math.max(8, Math.min(cw - mBadgeW - 8, mirroredHeadX));
              const mBadgeY = Math.min(ch - mBadgeH - 6, headPxY + headPxH + 6);

              ctx.fillStyle = motionBgColor;
              ctx.strokeStyle = motionBorderColor;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.roundRect(mBadgeX, mBadgeY, mBadgeW, mBadgeH, 4);
              ctx.fill();
              ctx.stroke();

              ctx.fillStyle = motionTextColor;
              ctx.fillText(motionLabel, mBadgeX + 9, mBadgeY + 13);

              // 4. Draw Eye Tracking Reticles / Visor HUD on Canvas
              if (confirmedEyeMonitoringRef.current === 'ACTIVE') {
                const lx = (1 - (pL1.x + pL2.x) / 2) * cw;
                const ly = ((pLTop1.y + pLBot1.y) / 2) * ch;
                const rx = (1 - (pR1.x + pR2.x) / 2) * cw;
                const ry = ((pRTop1.y + pRBot1.y) / 2) * ch;

                ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(lx, ly, Math.max(6, leftEyeWidth * cw * 0.6), 0, Math.PI * 2);
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(rx, ry, Math.max(6, rightEyeWidth * cw * 0.6), 0, Math.PI * 2);
                ctx.stroke();
              } else if (confirmedSmartHelmetStateRef.current === 'HELMET_EYES_LIMITED') {
                const eyeBandY = Math.max(0, (topHeadY + faceHeight * 0.42) * ch);
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(mirroredHeadX + 8, eyeBandY);
                ctx.lineTo(mirroredHeadX + headPxW - 8, eyeBandY);
                ctx.stroke();
                ctx.setLineDash([]);
              }
            } else {
              helmetAbsentSinceRef.current = null;
              consecutiveHelmetFramesRef.current = 0;
              consecutiveNoHelmetFramesRef.current = 0;
              consecutiveVisibleFramesRef.current = 0;
              consecutiveLimitedFramesRef.current = 0;
              consecutiveUnavailableFramesRef.current = 0;
              confirmedSmartHelmetStateRef.current = 'NO_HELMET';
              confirmedEyeMonitoringRef.current = 'UNAVAILABLE';
              confirmedEyeVisibilityRef.current = 'UNAVAILABLE';
            }

            // 2. Run Pretrained ObjectDetector for Real Cell Phone Detection
            let detectedPhoneBox: BoundingBox2D | null = null;
            let phoneConf = 0;

            if (detector) {
              try {
                const detResult = detector.detectForVideo(video, now);
                if (detResult && detResult.detections && detResult.detections.length > 0) {
                  for (const det of detResult.detections) {
                    const cat = det.categories[0];
                    if (!cat) continue;
                    const catName = cat.categoryName.toLowerCase();
                    if ((catName.includes('phone') || catName === 'cell phone') && cat.score >= 0.35) {
                      const b = det.boundingBox;
                      if (b) {
                        const normX = Math.max(0, b.originX / cw);
                        const normY = Math.max(0, b.originY / ch);
                        const normW = Math.min(1 - normX, b.width / cw);
                        const normH = Math.min(1 - normY, b.height / ch);
                        const scorePct = Math.round(cat.score * 100);
                        if (scorePct > phoneConf) {
                          phoneConf = scorePct;
                          detectedPhoneBox = { x: normX, y: normY, width: normW, height: normH };
                        }
                      }
                    }
                  }
                }
              } catch (detErr) {
                console.warn('SafeRider phone detector frame error:', detErr);
              }
            }

            // 3. Spatial Association: Check if Phone is in Rider Interaction Zone
            let isPhoneAssociatedWithRider = false;
            if (detectedPhoneBox && headNormBox) {
              const zoneMinX = Math.max(0, headNormBox.x - headNormBox.width * 0.55);
              const zoneMaxX = Math.min(1, headNormBox.x + headNormBox.width * 1.55);
              const zoneMinY = Math.max(0, headNormBox.y - headNormBox.height * 0.2);
              const zoneMaxY = Math.min(1, headNormBox.y + headNormBox.height * 2.2);

              const pCenterX = detectedPhoneBox.x + detectedPhoneBox.width / 2;
              const pCenterY = detectedPhoneBox.y + detectedPhoneBox.height / 2;

              const centerInZone =
                pCenterX >= zoneMinX &&
                pCenterX <= zoneMaxX &&
                pCenterY >= zoneMinY &&
                pCenterY <= zoneMaxY;

              const boxOverlapsZone = !(
                detectedPhoneBox.x > zoneMaxX ||
                detectedPhoneBox.x + detectedPhoneBox.width < zoneMinX ||
                detectedPhoneBox.y > zoneMaxY ||
                detectedPhoneBox.y + detectedPhoneBox.height < zoneMinY
              );

              if (centerInZone || boxOverlapsZone) {
                isPhoneAssociatedWithRider = true;
              }
            }

            // 4. Temporal Smoothing for Phone Distraction
            let phoneStatus: PhoneDistractionStatus = 'PHONE_NOT_DETECTED';
            let phoneRisk: 'NONE' | 'POSSIBLE' | 'HIGH' = 'NONE';
            let phoneDurationSec = 0;

            if (detectedPhoneBox) {
              phoneLastSeenTimeRef.current = now;
              if (phoneFirstSeenTimeRef.current === null) {
                phoneFirstSeenTimeRef.current = now;
              }

              if (isPhoneAssociatedWithRider) {
                if (phoneAssociatedSinceRef.current === null) {
                  phoneAssociatedSinceRef.current = now;
                }
                phoneDurationSec =
                  Math.round(((now - phoneAssociatedSinceRef.current) / 1000) * 10) / 10;

                if (phoneDurationSec < 1.0) {
                  phoneStatus = 'PHONE_DETECTED';
                  phoneRisk = 'NONE';
                } else if (phoneDurationSec < 2.5) {
                  phoneStatus = 'POSSIBLE_PHONE_DISTRACTION';
                  phoneRisk = 'POSSIBLE';
                } else {
                  phoneStatus = 'PHONE_DISTRACTION_WARNING';
                  phoneRisk = 'HIGH';
                }
              } else {
                phoneAssociatedSinceRef.current = null;
                phoneStatus = 'PHONE_DETECTED_INACTIVE';
                phoneRisk = 'NONE';
                phoneDurationSec = 0;
              }
            } else {
              if (phoneLastSeenTimeRef.current !== null && now - phoneLastSeenTimeRef.current > 450) {
                phoneFirstSeenTimeRef.current = null;
                phoneAssociatedSinceRef.current = null;
                phoneLastSeenTimeRef.current = null;
                phoneStatus = 'PHONE_NOT_DETECTED';
                phoneRisk = 'NONE';
                phoneDurationSec = 0;
              } else if (phoneAssociatedSinceRef.current !== null) {
                phoneDurationSec =
                  Math.round(((now - phoneAssociatedSinceRef.current) / 1000) * 10) / 10;
                if (phoneDurationSec >= 2.5) {
                  phoneStatus = 'PHONE_DISTRACTION_WARNING';
                  phoneRisk = 'HIGH';
                } else if (phoneDurationSec >= 1.0) {
                  phoneStatus = 'POSSIBLE_PHONE_DISTRACTION';
                  phoneRisk = 'POSSIBLE';
                }
              }
            }

            // 5. Draw Phone Bounding Box & Status Badge on Canvas (Unmirrored on canvas)
            if (detectedPhoneBox) {
              const mirroredPhoneX = (1 - (detectedPhoneBox.x + detectedPhoneBox.width)) * cw;
              const pPxY = detectedPhoneBox.y * ch;
              const pPxW = detectedPhoneBox.width * cw;
              const pPxH = detectedPhoneBox.height * ch;

              let strokeColor = '#71717a';
              let badgeLabel = `CELL PHONE ${phoneConf}% (INACTIVE)`;

              if (isPhoneAssociatedWithRider) {
                if (phoneStatus === 'PHONE_DISTRACTION_WARNING') {
                  strokeColor = '#ef4444';
                  badgeLabel = `PHONE DISTRACTION (${phoneConf}%)`;
                } else if (phoneStatus === 'POSSIBLE_PHONE_DISTRACTION') {
                  strokeColor = '#f59e0b';
                  badgeLabel = `POSSIBLE PHONE USE (${phoneConf}%)`;
                } else {
                  strokeColor = '#eab308';
                  badgeLabel = `PHONE IN ZONE (${phoneConf}%)`;
                }
              }

              // Subtle enclosure
              ctx.lineWidth = 1;
              ctx.strokeStyle = strokeColor === '#ef4444' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.15)';
              ctx.strokeRect(mirroredPhoneX, pPxY, pPxW, pPxH);

              // ADAS Corner Brackets
              const pCorner = Math.max(8, Math.min(18, pPxW * 0.25));
              ctx.lineWidth = 2;
              ctx.strokeStyle = strokeColor;
              ctx.lineCap = 'round';

              // Top-Left
              ctx.beginPath();
              ctx.moveTo(mirroredPhoneX, pPxY + pCorner);
              ctx.lineTo(mirroredPhoneX, pPxY);
              ctx.lineTo(mirroredPhoneX + pCorner, pPxY);
              ctx.stroke();

              // Top-Right
              ctx.beginPath();
              ctx.moveTo(mirroredPhoneX + pPxW - pCorner, pPxY);
              ctx.lineTo(mirroredPhoneX + pPxW, pPxY);
              ctx.lineTo(mirroredPhoneX + pPxW, pPxY + pCorner);
              ctx.stroke();

              // Bottom-Left
              ctx.beginPath();
              ctx.moveTo(mirroredPhoneX, pPxY + pPxH - pCorner);
              ctx.lineTo(mirroredPhoneX, pPxY + pPxH);
              ctx.lineTo(mirroredPhoneX + pCorner, pPxY + pPxH);
              ctx.stroke();

              // Bottom-Right
              ctx.beginPath();
              ctx.moveTo(mirroredPhoneX + pPxW - pCorner, pPxY + pPxH);
              ctx.lineTo(mirroredPhoneX + pPxW, pPxY + pPxH);
              ctx.lineTo(mirroredPhoneX + pPxW, pPxY + pPxH - pCorner);
              ctx.stroke();

              // Unmirrored Badge Pill
              ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
              const pTextW = ctx.measureText(badgeLabel).width;
              const pBadgeW = pTextW + 22;
              const pBadgeH = 20;
              const pBadgeX = Math.max(8, Math.min(cw - pBadgeW - 8, mirroredPhoneX));
              const pBadgeY = Math.max(6, pPxY - pBadgeH - 4);

              ctx.fillStyle = 'rgba(9, 10, 14, 0.9)';
              ctx.strokeStyle = strokeColor;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.roundRect(pBadgeX, pBadgeY, pBadgeW, pBadgeH, 4);
              ctx.fill();
              ctx.stroke();

              ctx.fillStyle = strokeColor;
              ctx.beginPath();
              ctx.arc(pBadgeX + 8, pBadgeY + pBadgeH / 2, 2.5, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = '#ffffff';
              ctx.fillText(badgeLabel, pBadgeX + 16, pBadgeY + 14);
            }

            // 6. Independent Risk Score & Violation Factors
            let riskScore = 10;
            const factors = [];

            // Helmet Absence Factor (Suppressed if Helmet Verification is Bypassed)
            if (!isHelmetBypassedRef.current && helmetStatus === 'HELMET_NOT_DETECTED' && sustainedHelmetSec >= 1.0) {
              riskScore += 50;
              factors.push({
                id: 'unhelmeted',
                label: 'Sustained Helmet Absence',
                severity: 'high' as const,
                points: 50,
                description: `Head observed without helmet for ${sustainedHelmetSec.toFixed(1)}s`,
              });
            }

            // Head Slump / Nod Factor (Pitch Down)
            if (isHeadSlumped) {
              riskScore += 45;
              factors.push({
                id: 'head_slump',
                label: 'Rider Head Down (Slump / Nod)',
                severity: 'high' as const,
                points: 45,
                description: `Downward head tilt detected (${headPitch}°, ${(headSlumpDurationMs / 1000).toFixed(1)}s). High fatigue danger.`,
              });
            }

            // Head / Shoulder Tilt Factor (Roll Left or Right)
            if (isHeadTilted) {
              riskScore += 40;
              factors.push({
                id: 'head_tilt',
                label: `Rider Head / Shoulder Tilt (${headRoll > 0 ? 'Right' : 'Left'})`,
                severity: 'high' as const,
                points: 40,
                description: `Excessive lateral tilt detected (${headRoll > 0 ? '+' : ''}${headRoll}°). Maintain balanced posture.`,
              });
            }

            // Phone Distraction Factors
            if (phoneStatus === 'POSSIBLE_PHONE_DISTRACTION') {
              riskScore += 25;
              factors.push({
                id: 'phone_possible',
                label: 'Possible Phone Distraction',
                severity: 'moderate' as const,
                points: 25,
                description: `Smartphone detected near rider interaction zone (${phoneDurationSec.toFixed(1)}s)`,
              });
            } else if (phoneStatus === 'PHONE_DISTRACTION_WARNING') {
              riskScore += 40;
              factors.push({
                id: 'phone_warning',
                label: 'Active Phone Distraction Warning',
                severity: 'high' as const,
                points: 40,
                description: `Sustained handheld phone usage near ear/head (${phoneDurationSec.toFixed(1)}s)`,
              });
            }

            // Drowsiness Alert Factor (ONLY added if drowsinessAlertActive and monitoring is ACTIVE)
            if (drowsinessAlertActive && confirmedEyeMonitoringRef.current === 'ACTIVE') {
              riskScore += 45;
              factors.push({
                id: 'rider_drowsiness',
                label: 'Sustained Rider Eye Closure (Drowsiness)',
                severity: 'high' as const,
                points: 45,
                description: `Eyes observed closed for ${(eyeClosureDurationMs / 1000).toFixed(1)}s while eye monitoring active`,
              });
            }

            // Visor Limited Advisory (Informational, 0 points)
            if (confirmedSmartHelmetStateRef.current === 'HELMET_EYES_LIMITED') {
              factors.push({
                id: 'visor_limited_advisory',
                label: 'Eye Visibility Limited (Monitoring Paused)',
                severity: 'low' as const,
                points: 0,
                description: confirmedVisorDescRef.current,
              });
            }

            const tier =
              riskScore >= 70 ? 'CRITICAL' : riskScore >= 45 ? 'HIGH' : riskScore >= 25 ? 'MODERATE' : 'LOW';

            let actionText = 'Nominal two-wheeler compliance';
            if (drowsinessAlertActive) {
              actionText = 'WARNING: Sustained eye closure detected! Please stay alert and pull over safely.';
            } else if (isHeadSlumped) {
              actionText = 'CRITICAL ALERT: Rider head down detected! Please sit upright and keep eyes forward.';
            } else if (isHeadTilted) {
              actionText = `ALERT: Lateral ${headRoll > 0 ? 'right' : 'left'} tilt detected! Keep your posture upright.`;
            } else if (
              !isHelmetBypassedRef.current &&
              helmetStatus === 'HELMET_NOT_DETECTED' &&
              phoneStatus === 'PHONE_DISTRACTION_WARNING'
            ) {
              actionText = 'CRITICAL: Dual violation — Helmet not detected and phone distraction active';
            } else if (!isHelmetBypassedRef.current && helmetStatus === 'HELMET_NOT_DETECTED') {
              actionText = 'Safety alert: Helmet not detected. Please wear protective headgear.';
            } else if (phoneStatus === 'PHONE_DISTRACTION_WARNING') {
              actionText = 'Audio advisory: Please keep your phone away while riding';
            } else if (isPerformingCheck) {
              actionText = `Defensive check: Pre-maneuver ${headMotionState === 'LEFT_SHOULDER_CHECK' ? 'left' : 'right'} blindspot audit active`;
            } else if (confirmedSmartHelmetStateRef.current === 'HELMET_EYES_LIMITED') {
              actionText = 'Advisory: Eye visibility limited. Eye monitoring is paused.';
            } else if (phoneStatus === 'POSSIBLE_PHONE_DISTRACTION') {
              actionText = 'Monitoring smartphone proximity to rider headgear';
            }

            const alertActive =
              (!isHelmetBypassedRef.current && sustainedHelmetSec >= 1.5) ||
              phoneStatus === 'PHONE_DISTRACTION_WARNING' ||
              drowsinessAlertActive ||
              isHeadSlumped ||
              isHeadTilted;

            setTelemetry({
              helmetStatus,
              helmetConfidence: helmetConf,
              riderDetected: riderFound,
              twoWheelerDetected: true,
              phoneDistractionRisk: phoneRisk,
              phoneDistractionConfidence: phoneConf,
              sustainedViolationSec: Math.round(sustainedHelmetSec * 10) / 10,
              isAlertActive: alertActive,
              timestamp: Date.now(),
              phoneDetected: Boolean(detectedPhoneBox),
              phoneAssociatedWithRider: isPhoneAssociatedWithRider,
              phoneStatus,
              phoneConfidence: phoneConf,
              phoneDurationSec,
              phoneBox: detectedPhoneBox,
              phoneModelReady,

              // Smart Helmet + Visor / Eye Visibility Safety Layer
              smartHelmetState: confirmedSmartHelmetStateRef.current,
              eyeVisibility: confirmedEyeVisibilityRef.current,
              eyeMonitoring: confirmedEyeMonitoringRef.current,
              visorStatus: confirmedVisorStatusRef.current,
              visorDescription: confirmedVisorDescRef.current,
              eyeConfidence:
                confirmedEyeMonitoringRef.current === 'ACTIVE'
                  ? rawEyeConfidence
                  : confirmedEyeMonitoringRef.current === 'LIMITED'
                  ? Math.min(45, rawEyeConfidence)
                  : 0,
              faceConfidence: helmetConf,
              ear: confirmedEyeMonitoringRef.current === 'ACTIVE' ? avgEar : 0.30,
              leftEar: confirmedEyeMonitoringRef.current === 'ACTIVE' ? Number(leftEAR.toFixed(3)) : 0,
              rightEar: confirmedEyeMonitoringRef.current === 'ACTIVE' ? Number(rightEAR.toFixed(3)) : 0,
              isEyeClosed,
              eyeClosureDurationMs,
              drowsinessAlertActive,
              debugDiagnostics: {
                helmetConfidence: helmetConf,
                faceConfidence: helmetConf,
                eyeVisibilityConfidence: rawEyeConfidence,
                smartHelmetState: confirmedSmartHelmetStateRef.current,
                eyeMonitoringState: confirmedEyeMonitoringRef.current,
                ear: avgEar,
                leftEar: Number(leftEAR.toFixed(3)),
                rightEar: Number(rightEAR.toFixed(3)),
                consecutiveVisibleFrames: consecutiveVisibleFramesRef.current,
                consecutiveLimitedFrames: consecutiveLimitedFramesRef.current,
                consecutiveUnavailableFrames: consecutiveUnavailableFramesRef.current,
              },

              // Two-Wheeler Rider Head Motion & Orientation Pipeline
              headYaw,
              headPitch,
              headRoll,
              headMotionState,
              headSlumpDurationMs,
              isHeadSlumped,
              isHeadTilted,
              headTiltDurationMs,
              lifesaverAudit: {
                lastCheckDirection: lastLifesaverDirectionRef.current,
                lastCheckTimestamp: lastLifesaverTimestampRef.current,
                totalChecksThisRide: totalLifesaverChecksRef.current,
                isPerformingCheck,
              },

              // Helmet Verification Bypass
              isHelmetBypassed: isHelmetBypassedRef.current,
            });

            setAssessment({
              score: Math.min(100, riskScore),
              tier,
              helmetStatus,
              confidence: Math.max(helmetConf, phoneConf),
              factors,
              recommendedAction: actionText,
            });
          } catch (frameErr) {
            console.warn('SafeRider frame pipeline error:', frameErr);
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(processFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [enabled, selectedPreset, videoRef, canvasRef, phoneModelReady]);

  return {
    isLoading,
    cameraError,
    isCameraActive,
    phoneModelReady,
    selectedPreset,
    setSelectedPreset,
    isHelmetBypassed,
    setIsHelmetBypassed,
    telemetry,
    assessment,
    restartCamera: startCamera,
  };
}
