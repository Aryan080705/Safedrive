import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Header } from './components/Header';
import { CameraMonitor } from './components/CameraMonitor';
import { RiskGauge } from './components/RiskGauge';
import { FactorBreakdown } from './components/FactorBreakdown';
import { TelemetryGrid } from './components/TelemetryGrid';
import { RiskTrendChart } from './components/RiskTrendChart';
import { ActionPanel } from './components/ActionPanel';
import { SimulationBar } from './components/SimulationBar';
import { EmergencyModal } from './components/EmergencyModal';
import { VideoUploader } from './components/VideoUploader';
import { RoadVideoPlayer } from './components/RoadVideoPlayer';
import { VideoTimeline } from './components/VideoTimeline';
import { IncidentAnalysisPanel } from './components/IncidentAnalysisPanel';
import { SafetyFusionPanel } from './components/SafetyFusionPanel';
import { HazardEvidencePanel } from './components/HazardEvidencePanel';
import { BlackspotMap } from './components/BlackspotMap';
import { SafeRiderPanel } from './components/SafeRiderPanel';
import { SOSDispatchPanel } from './components/SOSDispatchPanel';
import { PlatformOverview } from './components/PlatformOverview';
import { RiskMemoryPanel } from './components/RiskMemoryPanel';
import { VoiceAssistantHUD } from './components/VoiceAssistantHUD';

import { useFaceLandmarker } from './hooks/useFaceLandmarker';
import { useAudioAlerts } from './hooks/useAudioAlerts';
import { useRoadDetector } from './hooks/useRoadDetector';
import { useSafeRider } from './hooks/useSafeRider';
import { useSOSDetector } from './hooks/useSOSDetector';
import { useVoiceAssistant } from './hooks/useVoiceAssistant';
import { RiskEngine } from './services/riskEngine';
import { riskMemoryEngine } from './services/riskMemoryEngine';
import { SAMPLE_BLACKSPOT_POINTS, computeBlackspotClusters, getBlackspotSummary } from './services/blackspotData';
import type {
  AppMode,
  CameraOwner,
  DriverTelemetry,
  RiskAssessment,
  RiskTier,
  SafetyFusionAssessment,
  SimulationPreset,
  TrendDataPoint
} from './types';

export const App: React.FC = () => {
  // Navigation & Mode - Default to SAFERIDER for instant two-wheeler testing
  const [mode, setMode] = useState<AppMode>('SAFERIDER');
  const [speedKmH, setSpeedKmH] = useState<number>(65);

  // Interaction tracking for proactive assistant trigger
  const onInteractionRef = useRef<() => void>(() => {});

  // Camera Ownership Mutex (DRIVER | RIDER | OFF)
  const [cameraOwner, setCameraOwner] = useState<CameraOwner>('RIDER');

  // Mode change handler with clean camera hardware mutex
  const handleModeChange = useCallback((newMode: AppMode) => {
    setMode(newMode);
    if (newMode === 'DRIVER_MONITOR' || newMode === 'SAFETY_FUSION') {
      setCameraOwner('DRIVER');
    } else if (newMode === 'SAFERIDER') {
      setCameraOwner('RIDER');
    }
    onInteractionRef.current();
  }, []);

  // Driver Cam DOM Refs
  const driverVideoRef = useRef<HTMLVideoElement | null>(null);
  const driverCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Road Video DOM Refs
  const roadVideoRef = useRef<HTMLVideoElement | null>(null);
  const roadCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // SafeRider DOM Refs
  const riderVideoRef = useRef<HTMLVideoElement | null>(null);
  const riderCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Audio Alerts Hook
  const {
    isMuted,
    toggleMute,
    isAudioUnlocked,
    audioStatus,
    enableSafetyAudio,
    triggerDrowsinessAlert,
    stopDrowsinessAlert,
    handleTierAlert,
    playHighAlertBeep,
    playCriticalAlarm,
    speakWarning,
    isAssistantSpeaking,
    speakAssistant,
    cancelAssistantSpeech,
  } = useAudioAlerts();

  // Face Landmarker Hook (Active only when DRIVER owns the camera)
  const isDriverCamNeeded =
    (mode === 'DRIVER_MONITOR' || mode === 'SAFETY_FUSION' || mode === 'OVERVIEW') &&
    cameraOwner === 'DRIVER';

  const {
    isLoading: isCvLoading,
    cameraError,
    isCameraActive,
    showMeshOverlay,
    setShowMeshOverlay,
    telemetry: liveTelemetry,
    restartCamera,
  } = useFaceLandmarker(driverVideoRef, driverCanvasRef, isDriverCamNeeded, speedKmH);

  // SafeRider Hook (Active only when RIDER owns the camera)
  const isRiderCamNeeded = mode === 'SAFERIDER' && cameraOwner === 'RIDER';

  const {
    isLoading: isRiderLoading,
    cameraError: riderCameraError,
    isCameraActive: isRiderCameraActive,
    selectedPreset: riderPreset,
    setSelectedPreset: setRiderPreset,
    isHelmetBypassed: isRiderHelmetBypassed,
    setIsHelmetBypassed: setIsRiderHelmetBypassed,
    telemetry: riderTelemetry,
    assessment: riderAssessment,
    restartCamera: restartRiderCamera,
  } = useSafeRider(riderVideoRef, riderCanvasRef, isRiderCamNeeded);

  // SOS Smartphone Crash Detector Hook
  const {
    motionData,
    location,
    emergencyState,
    triggerSimulatedImpact,
    cancelEmergency: handleCancelSOS,
    sendAlertNow: handleSendSOSNow,
    resetSOS: handleResetSOS,
    requestLocation: handleRequestLocation,
  } = useSOSDetector(speakWarning);

  // Blackspot Spatial Clusters
  const blackspotClusters = useMemo(() => computeBlackspotClusters(SAMPLE_BLACKSPOT_POINTS), []);
  const blackspotSummary = useMemo(
    () => getBlackspotSummary(blackspotClusters, SAMPLE_BLACKSPOT_POINTS),
    [blackspotClusters]
  );

  // Road Video Detector Hook (Active in ROAD_VIDEO, SAFETY_FUSION, or OVERVIEW)
  const {
    selectedScenario,
    selectScenario,
    uploadedVideoUrl,
    isUsingUploadedVideo,
    handleVideoUpload,
    isPlaying: isRoadPlaying,
    setIsPlaying: setIsRoadPlaying,
    currentTimeSec: roadCurrentTimeSec,
    durationSec: roadDurationSec,
    seekTo: roadSeekTo,
    roadAssessment,
    timelineEvents: roadTimelineEvents,
    incidentAnalysis,
    sceneCalibration,
    egoCorridorGeometry,
    resetAnalysis: resetRoadAnalysis,
  } = useRoadDetector(roadVideoRef, roadCanvasRef);

  // Simulated Driver Telemetry State (for DEMO_SIMULATION)
  const [simTelemetry, setSimTelemetry] = useState<DriverTelemetry>({
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
    blinkCount: 14,
    blinksPerMinute: 16,
    speedKmH: 65,
    faceDetected: true,
    fps: 30,
    timestamp: Date.now(),
  });

  // Risk Engine Instance
  const riskEngineRef = useRef<RiskEngine>(new RiskEngine());

  // Active Telemetry to compute driver score from
  const currentDriverTelemetry = mode === 'DEMO_SIMULATION' ? simTelemetry : liveTelemetry;

  // Real-time Driver Risk Assessment
  const [driverAssessment, setDriverAssessment] = useState<RiskAssessment>(() =>
    riskEngineRef.current.evaluate(currentDriverTelemetry)
  );

  // 45s Driver Trend history
  const [driverTrendHistory, setDriverTrendHistory] = useState<TrendDataPoint[]>([]);

  // Emergency Modal
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState<boolean>(false);
  const criticalTimerRef = useRef<number | null>(null);

  // Safety Alert Active State (Pauses conversational speech immediately)
  const isSafetyAlertActive =
    emergencyState.status === 'IMPACT_DETECTED' ||
    emergencyState.status === 'COUNTDOWN_ACTIVE' ||
    driverAssessment.tier === 'CRITICAL' ||
    roadAssessment.tier === 'CRITICAL' ||
    riderTelemetry.isAlertActive ||
    riderTelemetry.drowsinessAlertActive;

  // Road context data for voice assistant queries
  const voiceRoadContext = useMemo(() => ({
    speedKmH,
    roadScore: roadAssessment.score,
    roadTier: roadAssessment.tier,
    driverScore: driverAssessment.score,
    nearestBlackspotName: blackspotSummary.nearestCluster?.name || 'Noida Expressway Flyover',
    nearestBlackspotDistanceKm: 1.2,
  }), [speedKmH, roadAssessment.score, roadAssessment.tier, driverAssessment.score, blackspotSummary.nearestCluster]);

  // Voice Assistant Hook (100% Hands-Free Voice Conversation)
  const {
    telemetry: voiceTelemetry,
    dismissVoiceChat,
    triggerVoiceChat,
    triggerDemoVoiceChat,
    handleManualInput,
    toggleMic,
    registerInteraction,
    greetRiderOnStart,
    isSpeechSupported,
  } = useVoiceAssistant({
    speakAssistant,
    cancelAssistantSpeech,
    isAssistantSpeaking,
    isSafetyAlertActive,
    isMuted,
    roadContext: voiceRoadContext,
  });

  useEffect(() => {
    onInteractionRef.current = registerInteraction;
  }, [registerInteraction]);

  // Greet rider once when audio/session starts
  const hasGreetedRef = useRef<boolean>(false);
  useEffect(() => {
    if (isAudioUnlocked && !hasGreetedRef.current) {
      hasGreetedRef.current = true;
      setTimeout(() => {
        greetRiderOnStart();
      }, 1000);
    }
  }, [isAudioUnlocked, greetRiderOnStart]);

  // Track safety alerts and trigger voice conversation ONLY after 2 safety alerts occur & clear
  const prevAlertStateRef = useRef<boolean>(false);
  const lastAlertRegisterTimeRef = useRef<number>(0);

  const isAnyHazardAlertActive =
    riderTelemetry.isAlertActive ||
    riderTelemetry.drowsinessAlertActive ||
    roadAssessment.tier === 'CRITICAL' ||
    roadAssessment.tier === 'HIGH' ||
    driverAssessment.tier === 'CRITICAL' ||
    driverAssessment.tier === 'HIGH';

  useEffect(() => {
    const wasAlert = prevAlertStateRef.current;
    prevAlertStateRef.current = isAnyHazardAlertActive;

    // ONLY when a real hazard alert was active and has now cleared, increment alert count
    if (wasAlert && !isAnyHazardAlertActive) {
      const now = Date.now();
      if (now - lastAlertRegisterTimeRef.current > 3000) {
        lastAlertRegisterTimeRef.current = now;
        registerInteraction(1);
      }
    }
  }, [isAnyHazardAlertActive, registerInteraction]);

  // Evaluate Driver Risk on Telemetry Update & Drowsiness Audio Trigger
  useEffect(() => {
    const res = riskEngineRef.current.evaluate(currentDriverTelemetry);
    setDriverAssessment(res);

    if (mode === 'DRIVER_MONITOR' || mode === 'DEMO_SIMULATION' || mode === 'SAFETY_FUSION') {
      // Immediate Central Drowsiness Audio Alert when prolonged eye closure occurs (>= 1.0s)
      const isDrowsy =
        (currentDriverTelemetry.isEyeClosed && currentDriverTelemetry.eyeClosureDurationMs >= 1000) ||
        currentDriverTelemetry.drowsinessState === 'DROWSINESS_CONFIRMED' ||
        res.factors.some((f) => f.id === 'prolonged-eye-closure' || f.id === 'crit-eye-closure' || f.id === 'confirmed-drowsiness' || f.id === 'prolonged_eye_closure') ||
        (res.tier === 'HIGH' && currentDriverTelemetry.ear <= 0.18);

      if (isDrowsy) {
        const durationSec = Math.max(
          1.0,
          currentDriverTelemetry.eyeClosureDurationMs > 0
            ? currentDriverTelemetry.eyeClosureDurationMs / 1000
            : 1.2
        );
        triggerDrowsinessAlert(durationSec);
      } else {
        stopDrowsinessAlert();
      }

      handleTierAlert(res.tier);
    } else {
      stopDrowsinessAlert();
    }

    if (res.tier === 'CRITICAL') {
      if (criticalTimerRef.current === null) {
        criticalTimerRef.current = window.setTimeout(() => {
          setIsEmergencyModalOpen(true);
        }, 2500);
      }
    } else {
      if (criticalTimerRef.current !== null) {
        clearTimeout(criticalTimerRef.current);
        criticalTimerRef.current = null;
      }
    }
  }, [currentDriverTelemetry, handleTierAlert, triggerDrowsinessAlert, stopDrowsinessAlert, mode]);

  // Audio alerts for Road Collision Pre-Collision Warnings
  useEffect(() => {
    if (mode === 'ROAD_VIDEO' || mode === 'SAFETY_FUSION') {
      if (roadAssessment.tier === 'CRITICAL') {
        playCriticalAlarm();
        speakWarning('Critical collision risk detected. Immediate attention required.', 5000);
      } else if (roadAssessment.tier === 'HIGH') {
        playHighAlertBeep();
        speakWarning('High collision risk. Vehicle closing rapidly.', 6000);
      }
    }
  }, [roadAssessment.tier, mode, playCriticalAlarm, playHighAlertBeep, speakWarning]);

  // Proactive Blackspot GIS Audio Advisory (Multimodal Spatial Fusion)
  const lastBlackspotWarningRef = useRef<number>(0);
  useEffect(() => {
    if (blackspotSummary.nearestCluster && blackspotSummary.nearestCluster.riskIntensity === 'CRITICAL') {
      const now = Date.now();
      if (now - lastBlackspotWarningRef.current > 35000) {
        lastBlackspotWarningRef.current = now;
        speakWarning(
          `Attention rider: Approaching high-frequency blackspot near ${blackspotSummary.nearestCluster.name}. Please moderate speed.`,
          8000
        );
      }
    }
  }, [blackspotSummary.nearestCluster, speakWarning]);

  // Real-world Event Bridge to Risk Memory Engine (Throttled per event type)
  const lastMemoryEventTimesRef = useRef<Record<string, number>>({});
  useEffect(() => {
    const now = Date.now();
    const canEmit = (type: string, cooldownMs = 8000) => {
      const last = lastMemoryEventTimesRef.current[type] || 0;
      if (now - last > cooldownMs) {
        lastMemoryEventTimesRef.current[type] = now;
        return true;
      }
      return false;
    };

    // 1. Road Near-Miss / Pre-collision
    if ((roadAssessment.collisionObserved || roadAssessment.tier === 'CRITICAL') && canEmit('ROAD_NEAR_MISS')) {
      riskMemoryEngine.addEvent({
        timestamp: Date.now(),
        location: location.latitude ? {
          latitude: location.latitude,
          longitude: location.longitude,
          locationName: 'Real-time GPS Corridor'
        } : {
          latitude: 28.5355,
          longitude: 77.3910,
          locationName: 'Noida Expressway Flyover'
        },
        eventType: 'NEAR_MISS',
        severity: roadAssessment.tier === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        confidence: 90,
        riderState: {
          isAttentive: !riderTelemetry.phoneDetected && !riderTelemetry.isHeadSlumped,
          phoneDistraction: riderTelemetry.phoneDetected,
          drowsinessDetected: riderTelemetry.isHeadSlumped,
        },
        roadContext: {
          conflictZone: 'Active Ego Corridor',
          egoCorridorStatus: 'CRITICAL_HAZARD',
          trafficDensity: 'MODERATE',
        },
        trafficContext: {
          involvedObjects: ['VEHICLE_CONFLICT'],
          timeToCollisionSec: roadAssessment.timeToCollision ?? null,
          relativeDistanceMeters: roadAssessment.relevantHazardCount > 0 ? 15 : null,
        },
        sourceModule: 'CrashCam',
        speedKmH: speedKmH,
        isDemo: false,
      });
    }

    // 2. SafeRider Phone Distraction
    if (riderTelemetry.phoneDetected && canEmit('PHONE_DISTRACTION')) {
      riskMemoryEngine.addEvent({
        timestamp: Date.now(),
        location: location.latitude ? {
          latitude: location.latitude,
          longitude: location.longitude,
          locationName: 'Real-time GPS Corridor'
        } : {
          latitude: 28.5355,
          longitude: 77.3910,
          locationName: 'Noida Expressway Flyover'
        },
        eventType: 'PHONE_DISTRACTION',
        severity: 'HIGH',
        confidence: 88,
        riderState: {
          isAttentive: false,
          phoneDistraction: true,
          drowsinessDetected: riderTelemetry.isHeadSlumped,
          helmetCompliant: riderTelemetry.helmetStatus === 'HELMET_DETECTED',
        },
        roadContext: {
          conflictZone: 'Secondary',
          trafficDensity: 'LIGHT',
        },
        trafficContext: {
          involvedObjects: ['SMARTPHONE'],
          timeToCollisionSec: null,
          relativeDistanceMeters: null,
        },
        sourceModule: 'SafeRider',
        speedKmH: speedKmH,
        isDemo: false,
      });
    }

    // 3. SafeRider Head Slump / Fatigue
    if (riderTelemetry.isHeadSlumped && canEmit('DROWSINESS')) {
      riskMemoryEngine.addEvent({
        timestamp: Date.now(),
        location: location.latitude ? {
          latitude: location.latitude,
          longitude: location.longitude,
          locationName: 'Real-time GPS Corridor'
        } : {
          latitude: 28.5355,
          longitude: 77.3910,
          locationName: 'Noida Expressway Flyover'
        },
        eventType: 'DROWSINESS',
        severity: 'CRITICAL',
        confidence: 94,
        riderState: {
          isAttentive: false,
          phoneDistraction: riderTelemetry.phoneDetected,
          drowsinessDetected: true,
          headOrientation: 'SLUMPED_FORWARD_DOWN',
          helmetCompliant: riderTelemetry.helmetStatus === 'HELMET_DETECTED',
        },
        roadContext: {
          conflictZone: 'Ego Corridor',
          trafficDensity: 'LIGHT',
        },
        trafficContext: {
          involvedObjects: ['DRIVER_EYES_CLOSED'],
          timeToCollisionSec: null,
          relativeDistanceMeters: null,
        },
        sourceModule: 'SafeRider',
        speedKmH: speedKmH,
        isDemo: false,
      });
    }
  }, [roadAssessment.collisionObserved, roadAssessment.tier, roadAssessment.timeToCollision, riderTelemetry.phoneDetected, riderTelemetry.isHeadSlumped, speedKmH, location]);

  // Maintain Rolling Trend History
  useEffect(() => {
    const interval = setInterval(() => {
      setDriverTrendHistory((prev) => {
        const newPoint: TrendDataPoint = {
          timestamp: Date.now(),
          score: driverAssessment.score,
          tier: driverAssessment.tier,
        };
        const updated = [...prev, newPoint];
        if (updated.length > 45) {
          return updated.slice(updated.length - 45);
        }
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [driverAssessment.score, driverAssessment.tier]);

  // Single Source of Truth: Unified Multi-Modal Safety Fusion Assessment
  const fusedAssessment: SafetyFusionAssessment = useMemo(() => {
    const driverScore = driverAssessment.score;
    const roadScore = roadAssessment.score;
    const riderScore = riderAssessment.score;
    const blackspotScore = blackspotSummary.regionalRiskIndex;

    // Compound multiplier when multiple systems detect elevated risk simultaneously
    const compoundMultiplier =
      driverScore >= 40 && roadScore >= 40
        ? 1.45
        : driverScore >= 30 || roadScore >= 30
        ? 1.2
        : 1.0;

    const baseMax = Math.max(driverScore, roadScore);
    const secondary = Math.min(driverScore, roadScore);
    const fusedRaw = Math.min(
      100,
      Math.round((baseMax * 0.7 + secondary * 0.3) * compoundMultiplier)
    );

    const overallTier: RiskTier =
      fusedRaw >= 70 ? 'CRITICAL' : fusedRaw >= 45 ? 'HIGH' : fusedRaw >= 25 ? 'MODERATE' : 'LOW';

    const contributors: string[] = [];
    if (driverAssessment.factors.length > 0) {
      contributors.push(
        `[Driver] ${driverAssessment.factors[0].label} (+${driverAssessment.factors[0].points} pts)`
      );
    } else {
      contributors.push(`[Driver] Attentive — eyes forward, normal blink frequency`);
    }

    if (roadAssessment.activeFactors.length > 0) {
      contributors.push(`[Road] ${roadAssessment.activeFactors[0]}`);
    } else {
      contributors.push(`[Road] Ego corridor clear — nominal road flow`);
    }

    if (riderAssessment.factors.length > 0) {
      contributors.push(
        `[SafeRider] ${riderAssessment.factors[0].label} (+${riderAssessment.factors[0].points} pts)`
      );
    } else {
      contributors.push(`[SafeRider] Protective headgear verified compliant`);
    }

    contributors.push(
      `[GIS Blackspots] ${blackspotSummary.totalClusters} High-Frequency Conflict Clusters Monitored`
    );

    if (emergencyState.status !== 'IDLE') {
      contributors.push(`[SOS-Dispatch] Kinetic Crash Sensor: ${emergencyState.status}`);
    }

    return {
      overallScore: fusedRaw,
      overallTier,
      driverScore,
      roadScore,
      riderScore,
      blackspotScore,
      compoundMultiplier,
      statusHeadline:
        overallTier === 'CRITICAL'
          ? 'CRITICAL ROAD-DRIVER HAZARD SYNTHESIS'
          : overallTier === 'HIGH'
          ? 'ELEVATED MULTI-MODAL CONFLICT DETECTED'
          : overallTier === 'MODERATE'
          ? 'CAUTIONARY RISK SURVEILLANCE'
          : 'NOMINAL CROSS-MODAL SAFETY ENVELOPE',
      contributors,
    };
  }, [driverAssessment, roadAssessment, riderAssessment, blackspotSummary, emergencyState.status]);

  // Handle Preset Selection in Demo Simulation
  const handleApplyPreset = useCallback((preset: SimulationPreset) => {
    setMode('DEMO_SIMULATION');

    if (preset === 'normal') {
      setSimTelemetry({
        ear: 0.33,
        leftEar: 0.33,
        rightEar: 0.33,
        isEyeClosed: false,
        eyeClosureDurationMs: 0,
        mar: 0.16,
        isYawning: false,
        yawnDurationMs: 0,
        yaw: 0,
        pitch: 2,
        roll: 0,
        isDistracted: false,
        distractionDurationMs: 0,
        blinkCount: 18,
        blinksPerMinute: 17,
        speedKmH: 60,
        faceDetected: true,
        fps: 30,
        timestamp: Date.now(),
      });
      setSpeedKmH(60);
      riskEngineRef.current.reset(8);
    } else if (preset === 'fatigue') {
      setSimTelemetry({
        ear: 0.22,
        leftEar: 0.22,
        rightEar: 0.22,
        isEyeClosed: false,
        eyeClosureDurationMs: 0,
        mar: 0.65,
        isYawning: true,
        yawnDurationMs: 1800,
        yaw: 2,
        pitch: -6,
        roll: 0,
        isDistracted: false,
        distractionDurationMs: 0,
        blinkCount: 22,
        blinksPerMinute: 24,
        speedKmH: 70,
        faceDetected: true,
        fps: 30,
        timestamp: Date.now(),
      });
      setSpeedKmH(70);
    } else if (preset === 'distraction') {
      setSimTelemetry({
        ear: 0.31,
        leftEar: 0.31,
        rightEar: 0.31,
        isEyeClosed: false,
        eyeClosureDurationMs: 0,
        mar: 0.18,
        isYawning: false,
        yawnDurationMs: 0,
        yaw: 34,
        pitch: -24,
        roll: 0,
        isDistracted: true,
        distractionDurationMs: 2400,
        blinkCount: 16,
        blinksPerMinute: 15,
        speedKmH: 80,
        faceDetected: true,
        fps: 30,
        timestamp: Date.now(),
      });
      setSpeedKmH(80);
    } else if (preset === 'high_risk') {
      setSimTelemetry({
        ear: 0.14,
        leftEar: 0.14,
        rightEar: 0.14,
        isEyeClosed: true,
        eyeClosureDurationMs: 1600,
        mar: 0.22,
        isYawning: false,
        yawnDurationMs: 0,
        yaw: 14,
        pitch: -12,
        roll: 0,
        isDistracted: false,
        distractionDurationMs: 0,
        blinkCount: 8,
        blinksPerMinute: 8,
        speedKmH: 95,
        faceDetected: true,
        fps: 30,
        timestamp: Date.now(),
      });
      setSpeedKmH(95);
    } else if (preset === 'critical') {
      setSimTelemetry({
        ear: 0.08,
        leftEar: 0.08,
        rightEar: 0.08,
        isEyeClosed: true,
        eyeClosureDurationMs: 3200,
        mar: 0.25,
        isYawning: false,
        yawnDurationMs: 0,
        yaw: 28,
        pitch: -26,
        roll: 0,
        isDistracted: true,
        distractionDurationMs: 3100,
        blinkCount: 5,
        blinksPerMinute: 5,
        speedKmH: 110,
        faceDetected: true,
        fps: 30,
        timestamp: Date.now(),
      });
      setSpeedKmH(110);
      setIsEmergencyModalOpen(true);
    }
  }, []);

  // Update Fine-Tune Telemetry
  const handleUpdateSimTelemetry = useCallback((partial: Partial<DriverTelemetry>) => {
    setSimTelemetry((prev) => ({
      ...prev,
      ...partial,
      timestamp: Date.now(),
    }));
  }, []);

  // Cancel / Dismiss Emergency Modal
  const handleCancelEmergency = useCallback(() => {
    setIsEmergencyModalOpen(false);
    if (criticalTimerRef.current !== null) {
      clearTimeout(criticalTimerRef.current);
      criticalTimerRef.current = null;
    }
    riskEngineRef.current.reset(28);
    setSimTelemetry((prev) => ({
      ...prev,
      isEyeClosed: false,
      eyeClosureDurationMs: 0,
      isDistracted: false,
      distractionDurationMs: 0,
      ear: 0.30,
      yaw: 0,
      pitch: 0,
    }));
  }, []);

  return (
    <div className="min-h-screen bg-[#0C0F0A] text-[#F5EFE3] flex flex-col font-sans selection:bg-[#B8892D]/30 relative overflow-hidden cyber-grid-bg">
      {/* Dynamic Ambient Aura */}
      <div
        className={`fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[450px] rounded-full blur-[140px] pointer-events-none -z-0 transition-colors duration-700 ${
          driverAssessment.tier === 'CRITICAL'
            ? 'bg-[#D94B45]/15'
            : driverAssessment.tier === 'HIGH'
            ? 'bg-[#B8892D]/20'
            : driverAssessment.tier === 'MODERATE'
            ? 'bg-[#4F5B2A]/25'
            : 'bg-[#5D9B64]/10'
        }`}
      />

      {/* Top Header */}
      <Header
        mode={mode}
        setMode={handleModeChange}
        isCameraActive={isCameraActive}
        isMuted={isMuted}
        toggleMute={toggleMute}
        tier={driverAssessment.tier}
        isAudioUnlocked={isAudioUnlocked}
        audioStatus={audioStatus}
        enableSafetyAudio={enableSafetyAudio}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 space-y-5 relative z-10">
        {/* ========================================================================= */}
        {/* MODE 0: UNIFIED PLATFORM OVERVIEW (Single Source of Truth) */}
        {/* ========================================================================= */}
        {mode === 'OVERVIEW' && (
          <PlatformOverview
            driverAssessment={driverAssessment}
            roadAssessment={roadAssessment}
            riderAssessment={riderAssessment}
            blackspotSummary={blackspotSummary}
            emergencyState={emergencyState}
            fusedAssessment={fusedAssessment}
            onNavigate={handleModeChange}
          />
        )}

        {/* ========================================================================= */}
        {/* MODE 1: ROAD VIDEO ANALYSIS (CrashCam AI) */}
        {/* ========================================================================= */}
        {mode === 'ROAD_VIDEO' && (
          <div className="space-y-4">
            {/* 1. Dashcam Source / Upload (Fixed-height container) */}
            <VideoUploader
              selectedScenario={selectedScenario}
              isUsingUploadedVideo={isUsingUploadedVideo}
              onSelectScenario={selectScenario}
              onUploadFile={handleVideoUpload}
            />

            {/* 2. Main Analysis Grid: 16:9 Video Player + Aligned Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              {/* Road Video Player with Stable 16:9 Container & Absolute Overlays (7 cols) */}
              <div className="lg:col-span-7 flex flex-col">
                <RoadVideoPlayer
                  videoRef={roadVideoRef}
                  canvasRef={roadCanvasRef}
                  isPlaying={isRoadPlaying}
                  setIsPlaying={setIsRoadPlaying}
                  currentTimeSec={roadCurrentTimeSec}
                  durationSec={roadDurationSec}
                  onSeek={roadSeekTo}
                  onRestart={resetRoadAnalysis}
                  assessment={roadAssessment}
                  sceneCalibration={sceneCalibration}
                  egoCorridorGeometry={egoCorridorGeometry}
                  uploadedVideoUrl={uploadedVideoUrl}
                  isUsingUploadedVideo={isUsingUploadedVideo}
                />
              </div>

              {/* Dynamic Video Timeline - Stable Height Aligned with Video (5 cols) */}
              <div className="lg:col-span-5 flex flex-col">
                <VideoTimeline
                  events={roadTimelineEvents}
                  currentTimeSec={roadCurrentTimeSec}
                  onSeek={roadSeekTo}
                />
              </div>
            </div>

            {/* 3. Evidence Panels Section: Controlled Height Evidence + Incident Analysis */}
            <div className="space-y-4">
              {/* Road Hazard Evidence & Context Breakdown (Controlled Height, Internal Scroll) */}
              <HazardEvidencePanel assessment={roadAssessment} />

              {/* Post-Event Incident Analysis Panel */}
              <IncidentAnalysisPanel
                analysis={incidentAnalysis}
                onJumpToTimestamp={roadSeekTo}
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 2: LIVE DRIVER MONITORING */}
        {/* ========================================================================= */}
        {mode === 'DRIVER_MONITOR' && (
          <div className="space-y-4">
            <ActionPanel
              assessment={driverAssessment}
              telemetry={currentDriverTelemetry}
              onTriggerEmergency={() => setIsEmergencyModalOpen(true)}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7">
                <CameraMonitor
                  videoRef={driverVideoRef}
                  canvasRef={driverCanvasRef}
                  isLoading={isCvLoading}
                  cameraError={cameraError}
                  isCameraActive={isCameraActive}
                  showMeshOverlay={showMeshOverlay}
                  setShowMeshOverlay={setShowMeshOverlay}
                  telemetry={currentDriverTelemetry}
                  isSimulation={false}
                  onSwitchToSimulation={() => setMode('DEMO_SIMULATION')}
                  onRestartCamera={restartCamera}
                  isAudioUnlocked={isAudioUnlocked}
                  audioStatus={audioStatus}
                  onEnableAudio={enableSafetyAudio}
                />
              </div>

              <div className="lg:col-span-5 flex flex-col gap-4">
                <RiskGauge assessment={driverAssessment} />
                <FactorBreakdown factors={driverAssessment.factors} />
              </div>
            </div>

            <TelemetryGrid
              telemetry={currentDriverTelemetry}
              onSpeedChange={setSpeedKmH}
            />

            <RiskTrendChart
              history={driverTrendHistory}
              currentScore={driverAssessment.score}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 3: SAFETY FUSION (Driver State + Road Collision Hazard) */}
        {/* ========================================================================= */}
        {mode === 'SAFETY_FUSION' && (
          <div className="space-y-4">
            <SafetyFusionPanel
              driverAssessment={driverAssessment}
              roadAssessment={roadAssessment}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              {/* Left Column: Road Video Preview */}
              <div className="flex flex-col h-full space-y-2">
                <div className="flex items-center justify-between h-6 shrink-0">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Road Collision Subsystem
                  </span>
                  <span className="text-[11px] text-cyan-400 font-mono">
                    Score: {roadAssessment.score}/100 ({roadAssessment.tier})
                  </span>
                </div>
                <div className="flex-1 min-h-0">
                  <RoadVideoPlayer
                    videoRef={roadVideoRef}
                    canvasRef={roadCanvasRef}
                    isPlaying={isRoadPlaying}
                    setIsPlaying={setIsRoadPlaying}
                    currentTimeSec={roadCurrentTimeSec}
                    durationSec={roadDurationSec}
                    onSeek={roadSeekTo}
                    onRestart={resetRoadAnalysis}
                    assessment={roadAssessment}
                    sceneCalibration={sceneCalibration}
                    egoCorridorGeometry={egoCorridorGeometry}
                    uploadedVideoUrl={uploadedVideoUrl}
                    isUsingUploadedVideo={isUsingUploadedVideo}
                  />
                </div>
              </div>

              {/* Right Column: Driver Monitoring Preview */}
              <div className="flex flex-col h-full space-y-2">
                <div className="flex items-center justify-between h-6 shrink-0">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Driver Attentiveness Subsystem
                  </span>
                  <span className="text-[11px] text-cyan-400 font-mono">
                    Score: {driverAssessment.score}/100 ({driverAssessment.tier})
                  </span>
                </div>
                <div className="flex-1 min-h-0">
                  <CameraMonitor
                    videoRef={driverVideoRef}
                    canvasRef={driverCanvasRef}
                    isLoading={isCvLoading}
                    cameraError={cameraError}
                    isCameraActive={isCameraActive}
                    showMeshOverlay={showMeshOverlay}
                    setShowMeshOverlay={setShowMeshOverlay}
                    telemetry={currentDriverTelemetry}
                    isSimulation={false}
                    onSwitchToSimulation={() => setMode('DEMO_SIMULATION')}
                    onRestartCamera={restartCamera}
                    isAudioUnlocked={isAudioUnlocked}
                    audioStatus={audioStatus}
                    onEnableAudio={enableSafetyAudio}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 4: BLACKSPOT PREDICTOR (GIS Accident Hotspot Dashboard) */}
        {/* ========================================================================= */}
        {mode === 'BLACKSPOT_MAP' && <BlackspotMap />}

        {/* ========================================================================= */}
        {/* MODE 5: SAFERIDER (Two-Wheeler Helmet & Distraction Detection) */}
        {/* ========================================================================= */}
        {mode === 'SAFERIDER' && (
          <SafeRiderPanel
            videoRef={riderVideoRef}
            canvasRef={riderCanvasRef}
            isLoading={isRiderLoading}
            cameraError={riderCameraError}
            isCameraActive={isRiderCameraActive}
            telemetry={riderTelemetry}
            assessment={riderAssessment}
            selectedPreset={riderPreset}
            setSelectedPreset={setRiderPreset}
            isHelmetBypassed={isRiderHelmetBypassed}
            setIsHelmetBypassed={setIsRiderHelmetBypassed}
            onRestartCamera={restartRiderCamera}
            speakWarning={speakWarning}
            onSafetyAlertResolved={() => registerInteraction(1)}
          />
        )}

        {/* ========================================================================= */}
        {/* MODE 6: SOS-DISPATCH (Smartphone Crash Detection) */}
        {/* ========================================================================= */}
        {mode === 'SOS_DISPATCH' && (
          <SOSDispatchPanel
            emergencyState={emergencyState}
            motionData={motionData}
            location={location}
            onTriggerImpact={triggerSimulatedImpact}
            onCancelEmergency={handleCancelSOS}
            onSendAlertNow={handleSendSOSNow}
            onResetSOS={handleResetSOS}
            onRequestLocation={handleRequestLocation}
          />
        )}

        {/* ========================================================================= */}
        {/* MODE 7: DEMO SIMULATION (Fallback / Testing) */}
        {/* ========================================================================= */}
        {mode === 'DEMO_SIMULATION' && (
          <div className="space-y-4">
            <ActionPanel
              assessment={driverAssessment}
              telemetry={simTelemetry}
              onTriggerEmergency={() => setIsEmergencyModalOpen(true)}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7">
                <CameraMonitor
                  videoRef={driverVideoRef}
                  canvasRef={driverCanvasRef}
                  isLoading={false}
                  cameraError={null}
                  isCameraActive={false}
                  showMeshOverlay={showMeshOverlay}
                  setShowMeshOverlay={setShowMeshOverlay}
                  telemetry={simTelemetry}
                  isSimulation={true}
                  onSwitchToSimulation={() => {}}
                  onRestartCamera={() => setMode('DRIVER_MONITOR')}
                  isAudioUnlocked={isAudioUnlocked}
                  audioStatus={audioStatus}
                  onEnableAudio={enableSafetyAudio}
                />
              </div>

              <div className="lg:col-span-5 flex flex-col gap-4">
                <RiskGauge assessment={driverAssessment} />
                <FactorBreakdown factors={driverAssessment.factors} />
              </div>
            </div>

            <TelemetryGrid
              telemetry={simTelemetry}
              onSpeedChange={(spd) => {
                setSpeedKmH(spd);
                setSimTelemetry((prev) => ({ ...prev, speedKmH: spd }));
              }}
            />

            <SimulationBar
              isSimulation={true}
              onApplyPreset={handleApplyPreset}
              telemetry={simTelemetry}
              onUpdateSimTelemetry={handleUpdateSimTelemetry}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 8: RISK MEMORY ENGINE (Rider & Location Pattern Intelligence) */}
        {/* ========================================================================= */}
        {mode === 'RISK_MEMORY' && (
          <RiskMemoryPanel />
        )}
      </main>

      {/* 100% Hands-Free Voice Assistant HUD */}
      <VoiceAssistantHUD
        telemetry={voiceTelemetry}
        onDismiss={dismissVoiceChat}
        isSpeechSupported={isSpeechSupported}
        onTriggerChat={triggerVoiceChat}
        onTriggerDemoChat={triggerDemoVoiceChat}
        onSubmitText={handleManualInput}
        onToggleMic={toggleMic}
      />

      {/* Simulated Emergency Modal */}
      <EmergencyModal
        isOpen={isEmergencyModalOpen}
        onCancel={handleCancelEmergency}
      />

      {/* System Footer */}
      <footer className="relative z-10 bg-[#12160F]/95 backdrop-blur-md border-t border-white/[0.08] px-4 py-3 text-center text-xs text-[#777C6F]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#5D9B64] animate-pulse" />
            <span className="font-semibold text-[#F5EFE3]">RoadGuard AI v2.0 &middot; TECHNEXA 2026</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#4F5B2A]/40 text-[#B8892D] border border-[#B8892D]/30 font-medium">EXECUTIVE ADAS</span>
          </div>
          <span className="text-[#A8AA9B] font-mono text-[11px]">
            Multi-Modal Vision &middot; Zero-Cloud WebAssembly &middot; Proactive Safety Heuristics
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
