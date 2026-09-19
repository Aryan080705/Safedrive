import { useCallback, useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { DriverTelemetry } from '../types';

interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
}

function dist(p1: LandmarkPoint, p2: LandmarkPoint): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// MediaPipe Landmark Indices
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

const MOUTH = {
  top: 13,
  bottom: 14,
  left: 78,
  right: 308,
};

const POSE = {
  noseTip: 1,
  chin: 152,
  leftCheek: 234,
  rightCheek: 454,
  forehead: 10,
};

export function useFaceLandmarker(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  enabled: boolean,
  speedKmH: number
) {
  const [isLoading, setIsLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showMeshOverlay, setShowMeshOverlay] = useState(true);

  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Tracking states
  const closureStartRef = useRef<number | null>(null);
  const yawnStartRef = useRef<number | null>(null);
  const distractionStartRef = useRef<number | null>(null);

  // Directional & posture refs
  const headDownStartRef = useRef<number | null>(null);
  const yawnCooldownUntilRef = useRef<number>(0);
  const yawnOpeningStartRef = useRef<number | null>(null);
  const lastTriggerRef = useRef<string>('NONE');

  // Temporal smoothing debounce refs
  const eyeOpenSinceRef = useRef<number | null>(null);
  const gazeNormalSinceRef = useRef<number | null>(null);
  const lastInferenceTimestampRef = useRef<number>(0);

  // Blink rate tracker (rolling 60s window)
  const blinkTimestampsRef = useRef<number[]>([]);
  const wasEyeClosedRef = useRef<boolean>(false);
  const blinkCountRef = useRef<number>(0);

  // FPS calculation
  const lastFpsTimestampRef = useRef<number>(performance.now());
  const frameCounterRef = useRef<number>(0);
  const currentFpsRef = useRef<number>(0);

  // Live telemetry state
  const [telemetry, setTelemetry] = useState<DriverTelemetry>({
    ear: 0.32,
    leftEar: 0.32,
    rightEar: 0.32,
    isEyeClosed: false,
    eyeClosureDurationMs: 0,
    mar: 0.15,
    isYawning: false,
    yawnDurationMs: 0,
    yaw: 0,
    pitch: 0,
    roll: 0,
    isDistracted: false,
    distractionDurationMs: 0,
    blinkCount: 0,
    blinksPerMinute: 16,
    speedKmH: speedKmH,
    faceDetected: false,
    mouthState: 'CLOSED',
    yawnState: 'NORMAL',
    headState: 'FORWARD',
    drowsinessState: 'NORMAL',
    eyeState: 'OPEN',
    lastTrigger: 'SYSTEM_INIT',
    fps: 0,
    timestamp: Date.now(),
  });

  // Keep speed updated
  useEffect(() => {
    setTelemetry((prev) => ({ ...prev, speedKmH }));
  }, [speedKmH]);

  // 1. Initialize MediaPipe FaceLandmarker
  useEffect(() => {
    let isCancelled = false;

    async function initModel() {
      try {
        setIsLoading(true);
        setCameraError(null);

        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
        );

        if (isCancelled) return;

        let landmarker: FaceLandmarker;
        try {
          landmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numFaces: 1,
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: true,
          });
        } catch (gpuErr) {
          console.warn('MediaPipe GPU delegate unavailable, attempting CPU fallback:', gpuErr);
          landmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numFaces: 1,
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: true,
          });
        }

        if (isCancelled) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize Face Landmarker:', err);
        if (!isCancelled) {
          setCameraError(
            'MediaPipe model could not be loaded. You can continue using Demo Simulation mode.'
          );
          setIsLoading(false);
        }
      }
    }

    initModel();

    return () => {
      isCancelled = true;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, []);

  // 2. Start webcam stream
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: unknown) {
      console.error('Camera access error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Permission denied') || msg.includes('NotAllowedError')) {
        setCameraError('Webcam permission denied. Please grant permission or switch to Demo Simulation.');
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFoundError')) {
        setCameraError('No camera found on this device. Please use Demo Simulation mode.');
      } else {
        setCameraError('Unable to start webcam. Switch to Demo Simulation for guaranteed presentation.');
      }
      setIsCameraActive(false);
    }
  }, [videoRef]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, [videoRef]);

  // Manage camera on enabled toggle
  useEffect(() => {
    if (enabled) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [enabled, startCamera, stopCamera]);

  // Re-attach stream to video element whenever video element remounts (e.g. mode switch)
  useEffect(() => {
    if (enabled && isCameraActive && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
    }
  });

  // 3. Frame processing loop
  useEffect(() => {
    if (!enabled || !isCameraActive) {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      return;
    }

    let isRunning = true;

    const processFrame = () => {
      if (!isRunning) return;

      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      const canvas = canvasRef.current;

      // Auto-recover stream if DOM ref remounted
      if (video && streamRef.current && video.srcObject !== streamRef.current) {
        video.srcObject = streamRef.current;
        video.play().catch(() => {});
      }

      if (video && landmarker && video.readyState >= 2 && !video.paused) {
        const now = performance.now();

        // Calculate real FPS
        frameCounterRef.current++;
        if (now - lastFpsTimestampRef.current >= 1000) {
          currentFpsRef.current = frameCounterRef.current;
          frameCounterRef.current = 0;
          lastFpsTimestampRef.current = now;
        }

        // Throttle inference to ~30 FPS with strictly increasing performance timestamps
        if (now - lastInferenceTimestampRef.current >= 33) {
          lastInferenceTimestampRef.current = now;

          try {
            const results = landmarker.detectForVideo(video, now);
            const ctx = canvas ? canvas.getContext('2d') : null;

            if (canvas && video.videoWidth && video.videoHeight) {
              if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
              }
            }

            if (ctx && canvas) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }

            if (results.faceLandmarks && results.faceLandmarks.length > 0) {
              const landmarks = results.faceLandmarks[0];

              // --- A. Compute Eye Aspect Ratio (EAR) ---
              const pL1 = landmarks[LEFT_EYE.outer];
              const pL2 = landmarks[LEFT_EYE.inner];
              const pLTop1 = landmarks[LEFT_EYE.top1];
              const pLBot1 = landmarks[LEFT_EYE.bottom1];
              const pLTop2 = landmarks[LEFT_EYE.top2];
              const pLBot2 = landmarks[LEFT_EYE.bottom2];
              const leftEAR = (dist(pLTop1, pLBot1) + dist(pLTop2, pLBot2)) / (2.0 * Math.max(0.001, dist(pL1, pL2)));

              const pR1 = landmarks[RIGHT_EYE.inner];
              const pR2 = landmarks[RIGHT_EYE.outer];
              const pRTop1 = landmarks[RIGHT_EYE.top1];
              const pRBot1 = landmarks[RIGHT_EYE.bottom1];
              const pRTop2 = landmarks[RIGHT_EYE.top2];
              const pRBot2 = landmarks[RIGHT_EYE.bottom2];
              const rightEAR = (dist(pRTop1, pRBot1) + dist(pRTop2, pRBot2)) / (2.0 * Math.max(0.001, dist(pR1, pR2)));

              const avgEar = Number(((leftEAR + rightEAR) / 2).toFixed(3));

              // --- B. Compute Head Pose (Yaw / Pitch / Roll Estimation) ---
              const pNose = landmarks[POSE.noseTip];
              const pChin = landmarks[POSE.chin];
              const pLeftCheek = landmarks[POSE.leftCheek];
              const pRightCheek = landmarks[POSE.rightCheek];
              const pForehead = landmarks[POSE.forehead];

              // Yaw: Nose relative to horizontal face boundary (-50 to +50)
              const faceCenterX = (pLeftCheek.x + pRightCheek.x) / 2;
              const faceWidth = Math.max(0.001, Math.abs(pRightCheek.x - pLeftCheek.x));
              const rawYaw = ((pNose.x - faceCenterX) / faceWidth) * -110;
              const yaw = Math.round(Math.max(-50, Math.min(50, rawYaw)));

              // Pitch: Nose relative to forehead and chin vertical span (-45 to +45)
              const faceHeight = Math.max(0.001, Math.abs(pChin.y - pForehead.y));
              const noseRelativeY = (pNose.y - pForehead.y) / faceHeight;
              const rawPitch = (0.55 - noseRelativeY) * 120;
              const pitch = Math.round(Math.max(-45, Math.min(45, rawPitch)));

              // Roll: Eye line inclination
              const dxEye = landmarks[RIGHT_EYE.outer].x - landmarks[LEFT_EYE.outer].x;
              const dyEye = landmarks[RIGHT_EYE.outer].y - landmarks[LEFT_EYE.outer].y;
              const roll = Math.round(Math.atan2(dyEye, dxEye) * (180 / Math.PI));

              // Directional Head State
              let headState: 'FORWARD' | 'LOOKING_LEFT' | 'LOOKING_RIGHT' | 'LOOKING_DOWN' | 'UNKNOWN' = 'FORWARD';
              if (pitch < -20) {
                headState = 'LOOKING_DOWN';
                if (headDownStartRef.current === null) {
                  headDownStartRef.current = now;
                }
              } else {
                headDownStartRef.current = null;
                if (yaw < -22) {
                  headState = 'LOOKING_LEFT';
                } else if (yaw > 22) {
                  headState = 'LOOKING_RIGHT';
                } else {
                  headState = 'FORWARD';
                }
              }
              const headDownDuration = headDownStartRef.current !== null ? Math.round(now - headDownStartRef.current) : 0;

              // Eye State with occlusion protection for downward pitch
              let eyeState: 'OPEN' | 'CLOSED' | 'UNAVAILABLE' = 'OPEN';
              if (pitch < -24) {
                eyeState = 'UNAVAILABLE';
              } else {
                eyeState = avgEar < 0.17 ? 'CLOSED' : 'OPEN';
              }
              const isEyeClosed = eyeState === 'CLOSED';

              // Eye closure duration tracking with 400ms temporal debounce to ignore natural eye blinks
              let eyeDuration = 0;
              if (isEyeClosed) {
                eyeOpenSinceRef.current = null;
                if (closureStartRef.current === null) {
                  closureStartRef.current = now;
                }
                eyeDuration = Math.round(now - closureStartRef.current);
              } else {
                if (eyeOpenSinceRef.current === null) {
                  eyeOpenSinceRef.current = now;
                }
                if (now - eyeOpenSinceRef.current > 400) {
                  if (wasEyeClosedRef.current && closureStartRef.current !== null) {
                    const closureTime = now - closureStartRef.current;
                    if (closureTime >= 80 && closureTime <= 500) {
                      blinkCountRef.current++;
                      blinkTimestampsRef.current.push(now);
                    }
                  }
                  closureStartRef.current = null;
                  eyeDuration = 0;
                } else if (closureStartRef.current !== null) {
                  eyeDuration = Math.round(now - closureStartRef.current);
                }
              }
              wasEyeClosedRef.current = isEyeClosed;

              // Prune old blinks outside 60s window
              blinkTimestampsRef.current = blinkTimestampsRef.current.filter((t) => now - t <= 60000);
              const blinksPerMin = blinkTimestampsRef.current.length;

              // Distraction condition (realistic automotive thresholds)
              const isDistracted = headState === 'LOOKING_LEFT' || headState === 'LOOKING_RIGHT' || headState === 'LOOKING_DOWN' || pitch > 28;

              let distractionDuration = 0;
              if (isDistracted) {
                gazeNormalSinceRef.current = null;
                if (distractionStartRef.current === null) {
                  distractionStartRef.current = now;
                }
                distractionDuration = Math.round(now - distractionStartRef.current);
              } else {
                if (gazeNormalSinceRef.current === null) {
                  gazeNormalSinceRef.current = now;
                }
                if (now - gazeNormalSinceRef.current > 400) {
                  distractionStartRef.current = null;
                  distractionDuration = 0;
                } else if (distractionStartRef.current !== null) {
                  distractionDuration = Math.round(now - distractionStartRef.current);
                }
              }

              // --- C. Compute Mouth Aspect Ratio (MAR) & Yawn Temporal State Machine ---
              const pMTop = landmarks[MOUTH.top];
              const pMBot = landmarks[MOUTH.bottom];
              const pMLeft = landmarks[MOUTH.left];
              const pMRight = landmarks[MOUTH.right];
              const mar = Number((dist(pMTop, pMBot) / Math.max(0.001, dist(pMLeft, pMRight))).toFixed(3));

              const mouthState: 'OPEN' | 'CLOSED' = mar >= 0.44 ? 'OPEN' : 'CLOSED';

              let yawnState: 'NORMAL' | 'MOUTH_OPENING' | 'POSSIBLE_YAWN' | 'YAWN_CONFIRMED' | 'COOLDOWN' = 'NORMAL';
              let isYawning = false;
              let yawnDuration = 0;

              if (now < yawnCooldownUntilRef.current) {
                yawnState = 'COOLDOWN';
                yawnOpeningStartRef.current = null;
                yawnStartRef.current = null;
                isYawning = false;
              } else if (mar >= 0.48) {
                if (yawnOpeningStartRef.current === null) {
                  yawnOpeningStartRef.current = now;
                }
                const openElapsed = now - yawnOpeningStartRef.current;
                if (openElapsed < 400) {
                  yawnState = 'MOUTH_OPENING';
                } else if (openElapsed < 1300) {
                  yawnState = 'POSSIBLE_YAWN';
                } else {
                  yawnState = 'YAWN_CONFIRMED';
                  isYawning = true;
                  if (yawnStartRef.current === null) {
                    yawnStartRef.current = now;
                  }
                  yawnDuration = Math.round(now - yawnStartRef.current);
                  lastTriggerRef.current = 'CONFIRMED_YAWN';
                }
              } else {
                if (yawnOpeningStartRef.current !== null) {
                  const openElapsed = now - yawnOpeningStartRef.current;
                  if (openElapsed >= 1300) {
                    yawnCooldownUntilRef.current = now + 3500;
                    yawnState = 'COOLDOWN';
                  } else {
                    yawnState = 'NORMAL';
                  }
                  yawnOpeningStartRef.current = null;
                  yawnStartRef.current = null;
                } else {
                  yawnState = 'NORMAL';
                }
              }

              // --- D. Drowsiness & Sleep Posture State Machine ---
              let drowsinessState: 'NORMAL' | 'HEAD_DOWN' | 'SUSTAINED_HEAD_DOWN' | 'POSSIBLE_DROWSINESS' | 'DROWSINESS_CONFIRMED' = 'NORMAL';

              if (headDownDuration >= 1800 && (isEyeClosed || eyeState === 'UNAVAILABLE')) {
                drowsinessState = 'DROWSINESS_CONFIRMED';
                lastTriggerRef.current = 'CONFIRMED_SLEEP_POSTURE';
              } else if (isEyeClosed && eyeDuration >= 1400) {
                drowsinessState = 'DROWSINESS_CONFIRMED';
                lastTriggerRef.current = 'SUSTAINED_EYE_CLOSURE';
              } else if (headDownDuration >= 1600) {
                drowsinessState = 'SUSTAINED_HEAD_DOWN';
                lastTriggerRef.current = 'SUSTAINED_HEAD_DOWN';
              } else if (isEyeClosed && eyeDuration >= 700) {
                drowsinessState = 'POSSIBLE_DROWSINESS';
                lastTriggerRef.current = 'PROLONGED_BLINK';
              } else if (headDownDuration >= 600) {
                drowsinessState = 'HEAD_DOWN';
                lastTriggerRef.current = 'HEAD_PITCH_DOWN';
              } else if (isYawning) {
                drowsinessState = 'POSSIBLE_DROWSINESS';
              } else if (distractionDuration >= 1200) {
                lastTriggerRef.current = `DISTRACTION_${headState}`;
              }

              // --- E. Draw Canvas Overlay ---
              if (ctx && canvas && showMeshOverlay) {
                const w = canvas.width;
                const h = canvas.height;

                // Color based on sustained risk state (ignores instant harmless twitches)
                const isFatiguedOrDistracted =
                  drowsinessState === 'DROWSINESS_CONFIRMED' ||
                  (isEyeClosed && eyeDuration >= 800) ||
                  (isDistracted && distractionDuration >= 1400);

                const overlayColor = isFatiguedOrDistracted
                  ? 'rgba(239, 68, 68, 0.85)' // Red alert
                  : drowsinessState === 'POSSIBLE_DROWSINESS' || drowsinessState === 'HEAD_DOWN' || isYawning
                  ? 'rgba(245, 158, 11, 0.85)' // Amber warning
                  : 'rgba(16, 185, 129, 0.75)'; // Emerald nominal

                // Draw bounding landmark indicators
                const keyPoints = [
                  landmarks[LEFT_EYE.outer],
                  landmarks[LEFT_EYE.inner],
                  landmarks[LEFT_EYE.top1],
                  landmarks[LEFT_EYE.bottom1],
                  landmarks[RIGHT_EYE.outer],
                  landmarks[RIGHT_EYE.inner],
                  landmarks[RIGHT_EYE.top1],
                  landmarks[RIGHT_EYE.bottom1],
                  landmarks[MOUTH.top],
                  landmarks[MOUTH.bottom],
                  landmarks[MOUTH.left],
                  landmarks[MOUTH.right],
                  landmarks[POSE.noseTip],
                  landmarks[POSE.chin],
                ];

                ctx.fillStyle = overlayColor;
                keyPoints.forEach((pt) => {
                  ctx.beginPath();
                  ctx.arc(pt.x * w, pt.y * h, 3, 0, 2 * Math.PI);
                  ctx.fill();
                });

                // Connect eye lines
                ctx.strokeStyle = overlayColor;
                ctx.lineWidth = 1.5;

                // Left eye
                ctx.beginPath();
                ctx.moveTo(pL1.x * w, pL1.y * h);
                ctx.lineTo(pLTop1.x * w, pLTop1.y * h);
                ctx.lineTo(pL2.x * w, pL2.y * h);
                ctx.lineTo(pLBot1.x * w, pLBot1.y * h);
                ctx.closePath();
                ctx.stroke();

                // Right eye
                ctx.beginPath();
                ctx.moveTo(pR1.x * w, pR1.y * h);
                ctx.lineTo(pRTop1.x * w, pRTop1.y * h);
                ctx.lineTo(pR2.x * w, pR2.y * h);
                ctx.lineTo(pRBot1.x * w, pRBot1.y * h);
                ctx.closePath();
                ctx.stroke();

                // Mouth
                ctx.beginPath();
                ctx.moveTo(pMLeft.x * w, pMLeft.y * h);
                ctx.lineTo(pMTop.x * w, pMTop.y * h);
                ctx.lineTo(pMRight.x * w, pMRight.y * h);
                ctx.lineTo(pMBot.x * w, pMBot.y * h);
                ctx.closePath();
                ctx.stroke();

                // Head Pose Vector from nose
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(pNose.x * w, pNose.y * h);
                ctx.lineTo(
                  (pNose.x + (yaw / 90) * 0.25) * w,
                  (pNose.y - (pitch / 90) * 0.25) * h
                );
                ctx.stroke();
              }

              // Update state
              setTelemetry({
                ear: avgEar,
                leftEar: Number(leftEAR.toFixed(3)),
                rightEar: Number(rightEAR.toFixed(3)),
                isEyeClosed,
                eyeClosureDurationMs: eyeDuration,
                mar,
                isYawning,
                yawnDurationMs: yawnDuration,
                yaw,
                pitch,
                roll,
                isDistracted,
                distractionDurationMs: distractionDuration,
                blinkCount: blinkCountRef.current,
                blinksPerMinute: blinksPerMin,
                speedKmH,
                faceDetected: true,
                mouthState,
                yawnState,
                headState,
                drowsinessState,
                eyeState,
                lastTrigger: lastTriggerRef.current,
                fps: currentFpsRef.current,
                timestamp: Date.now(),
              });
            } else {
              // No face detected in frame
              closureStartRef.current = null;
              yawnStartRef.current = null;
              yawnOpeningStartRef.current = null;
              headDownStartRef.current = null;
              distractionStartRef.current = null;
              eyeOpenSinceRef.current = null;
              gazeNormalSinceRef.current = null;
              setTelemetry((prev) => ({
                ...prev,
                faceDetected: false,
                mouthState: 'CLOSED',
                yawnState: 'NORMAL',
                headState: 'UNKNOWN',
                drowsinessState: 'NORMAL',
                eyeState: 'UNAVAILABLE',
                lastTrigger: 'FACE_LOST',
                isEyeClosed: false,
                eyeClosureDurationMs: 0,
                isYawning: false,
                yawnDurationMs: 0,
                isDistracted: false,
                distractionDurationMs: 0,
                fps: currentFpsRef.current,
                timestamp: Date.now(),
              }));
            }
          } catch (err) {
            console.error('Frame landmarker detection error:', err);
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(processFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(processFrame);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [enabled, isCameraActive, videoRef, canvasRef, showMeshOverlay, speedKmH]);

  return {
    isLoading,
    cameraError,
    isCameraActive,
    showMeshOverlay,
    setShowMeshOverlay,
    telemetry,
    restartCamera: startCamera,
  };
}
