import { useCallback, useEffect, useRef, useState } from 'react';
import type { SOSEmergencyState, MotionData, GPSLocation } from '../types';

export function useSOSDetector(
  speakWarning?: (msg: string, intervalMs?: number) => void
) {
  const [motionData, setMotionData] = useState<MotionData>({
    accelX: 0,
    accelY: 0,
    accelZ: 9.8,
    totalG: 1.0,
    rotationAlpha: 0,
    rotationBeta: 0,
    rotationGamma: 0,
    isImpactSpike: false,
  });

  const [location, setLocation] = useState<GPSLocation>({
    latitude: null,
    longitude: null,
    accuracyMeters: null,
    status: 'REQUESTING',
    locationName: undefined,
  });

  const [emergencyState, setEmergencyState] = useState<SOSEmergencyState>({
    status: 'IDLE',
    countdownSeconds: 10,
    impactTimestamp: null,
    peakGForce: 1.0,
    motionData: {
      accelX: 0,
      accelY: 0,
      accelZ: 9.8,
      totalG: 1.0,
      rotationAlpha: 0,
      rotationBeta: 0,
      rotationGamma: 0,
      isImpactSpike: false,
    },
    location: {
      latitude: null,
      longitude: null,
      accuracyMeters: null,
      status: 'REQUESTING',
    },
    dispatchRecord: null,
  });

  const countdownTimerRef = useRef<number | null>(null);
  const lastSpikeTimeRef = useRef<number>(0);
  const prevAccelNormRef = useRef<number>(9.8);

  // Request real GPS via browser Geolocation API
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation({
        latitude: null,
        longitude: null,
        accuracyMeters: null,
        status: 'UNAVAILABLE',
        locationName: 'Geolocation API not supported on this device',
      });
      return;
    }

    setLocation((prev) => ({ ...prev, status: 'REQUESTING' }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: Number(pos.coords.latitude.toFixed(5)),
          longitude: Number(pos.coords.longitude.toFixed(5)),
          accuracyMeters: Math.round(pos.coords.accuracy),
          status: 'OBTAINED',
          locationName: `GPS Fix (±${Math.round(pos.coords.accuracy)}m)`,
        });
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setLocation({
          latitude: null,
          longitude: null,
          accuracyMeters: null,
          status: err.code === 1 ? 'DENIED' : 'UNAVAILABLE',
          locationName: err.code === 1 ? 'Location permission denied by user' : 'Location unavailable',
        });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Handle hardware DeviceMotionEvent where supported (e.g. mobile phones)
  useEffect(() => {
    const handleDeviceMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity || event.acceleration;
      if (!acc) return;

      const ax = acc.x || 0;
      const ay = acc.y || 0;
      const az = acc.z || 9.8;
      const norm = Math.sqrt(ax * ax + ay * ay + az * az);
      const totalG = norm / 9.81;

      // Delta acceleration from previous tick
      const deltaAccel = Math.abs(norm - prevAccelNormRef.current);
      prevAccelNormRef.current = norm;

      const isSpike = deltaAccel > 22 || totalG > 3.2; // ~2.5G - 3.2G sudden shock

      setMotionData((prev) => ({
        ...prev,
        accelX: Math.round(ax * 10) / 10,
        accelY: Math.round(ay * 10) / 10,
        accelZ: Math.round(az * 10) / 10,
        totalG: Math.round(totalG * 100) / 100,
        isImpactSpike: isSpike,
      }));

      // Trigger crash countdown if sudden spike occurs and we are idle
      if (isSpike && emergencyState.status === 'IDLE') {
        const now = Date.now();
        if (now - lastSpikeTimeRef.current > 15000) {
          lastSpikeTimeRef.current = now;
          triggerImpact(totalG);
        }
      }
    };

    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', handleDeviceMotion);
    }

    return () => {
      if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
        window.removeEventListener('devicemotion', handleDeviceMotion);
      }
    };
  }, [emergencyState.status]);

  // Initiate Crash Countdown
  const triggerImpact = useCallback((gForce: number = 3.8) => {
    const now = Date.now();
    setEmergencyState({
      status: 'COUNTDOWN_ACTIVE',
      countdownSeconds: 10,
      impactTimestamp: now,
      peakGForce: Math.max(gForce, 3.4),
      motionData: {
        accelX: 18.4,
        accelY: -14.2,
        accelZ: 28.6,
        totalG: Math.round(gForce * 100) / 100,
        rotationAlpha: 45,
        rotationBeta: -32,
        rotationGamma: 12,
        isImpactSpike: true,
      },
      location,
      dispatchRecord: null,
    });

    if (speakWarning) {
      speakWarning('Warning. Possible crash detected. Emergency dispatch countdown initiated.', 4000);
    }
  }, [location, speakWarning]);

  // Countdown timer interval
  useEffect(() => {
    if (emergencyState.status !== 'COUNTDOWN_ACTIVE') {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      return;
    }

    countdownTimerRef.current = window.setInterval(() => {
      setEmergencyState((prev) => {
        if (prev.status !== 'COUNTDOWN_ACTIVE') return prev;

        if (prev.countdownSeconds <= 1) {
          // Auto-dispatch emergency alert
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

          const locText =
            prev.location.status === 'OBTAINED' && prev.location.latitude && prev.location.longitude
              ? `Lat: ${prev.location.latitude}, Lng: ${prev.location.longitude} (https://maps.google.com/?q=${prev.location.latitude},${prev.location.longitude})`
              : 'GPS Coordinates Unavailable';

          const msg = `[EMERGENCY SOS] SafeDrive Crash Detection: Severe deceleration (${prev.peakGForce.toFixed(1)}G) detected. Location: ${locText}. Immediate response requested.`;

          if (speakWarning) {
            speakWarning('Emergency alert dispatched to emergency response contact.', 4000);
          }

          return {
            ...prev,
            status: 'DISPATCHED',
            countdownSeconds: 0,
            dispatchRecord: {
              dispatchedAt: Date.now(),
              recipientName: 'National Emergency Response (112) / Family Contact',
              recipientPhone: '+91-98765-43210 & 112',
              messageText: msg,
              isSimulated: true,
            },
          };
        }

        return {
          ...prev,
          countdownSeconds: prev.countdownSeconds - 1,
        };
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [emergencyState.status, speakWarning]);

  // Cancel Emergency
  const cancelEmergency = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setEmergencyState((prev) => ({
      ...prev,
      status: 'CANCELLED',
      countdownSeconds: 10,
    }));
  }, []);

  // Manual Instant Dispatch
  const sendAlertNow = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    const locText =
      location.status === 'OBTAINED' && location.latitude && location.longitude
        ? `Lat: ${location.latitude}, Lng: ${location.longitude}`
        : 'Location unavailable';

    const msg = `[EMERGENCY SOS] SafeDrive Crash Detection: Impact confirmed. Location: ${locText}. Dispatch dispatched immediately.`;

    if (speakWarning) {
      speakWarning('Emergency alert dispatched immediately.', 4000);
    }

    setEmergencyState((prev) => ({
      ...prev,
      status: 'DISPATCHED',
      countdownSeconds: 0,
      dispatchRecord: {
        dispatchedAt: Date.now(),
        recipientName: 'Emergency Services (112) & Emergency Contact',
        recipientPhone: '+91-98765-43210 & 112',
        messageText: msg,
        isSimulated: true,
      },
    }));
  }, [location, speakWarning]);

  // Reset to Idle
  const resetSOS = useCallback(() => {
    setEmergencyState({
      status: 'IDLE',
      countdownSeconds: 10,
      impactTimestamp: null,
      peakGForce: 1.0,
      motionData,
      location,
      dispatchRecord: null,
    });
  }, [motionData, location]);

  return {
    motionData,
    location,
    emergencyState,
    triggerSimulatedImpact: () => triggerImpact(3.9),
    cancelEmergency,
    sendAlertNow,
    resetSOS,
    requestLocation,
  };
}
