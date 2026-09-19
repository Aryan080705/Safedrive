import { useCallback, useEffect, useRef, useState } from 'react';
import type { RiskTier } from '../types';

export type AudioStatus = 'ACTIVE' | 'PERMISSION_REQUIRED' | 'MUTED';

export function useAudioAlerts() {
  const [isMuted, setIsMuted] = useState(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>('PERMISSION_REQUIRED');
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastSpeechTimeRef = useRef<number>(0);
  const lastBeepTimeRef = useRef<number>(0);
  const lastDrowsinessToneTimeRef = useRef<number>(0);
  const lastDrowsinessSpeechTimeRef = useRef<number>(0);
  const isDrowsinessActiveRef = useRef<boolean>(false);
  const isAssistantSpeakingRef = useRef<boolean>(false);
  const isMutedRef = useRef<boolean>(false);
  isMutedRef.current = isMuted;
  const speechSafetyTimeoutRef = useRef<number | null>(null);

  // Initialize or retrieve AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtxRef.current = new AudioCtxClass();
      }
    }
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === 'running') {
        setIsAudioUnlocked(true);
        if (!isMuted) setAudioStatus('ACTIVE');
      }
    }
    return audioCtxRef.current;
  }, [isMuted]);

  // Explicit User-Initiated Audio Unlock ("ENABLE SAFETY AUDIO")
  const enableSafetyAudio = useCallback(async () => {
    try {
      let ctx = audioCtxRef.current;
      if (!ctx) {
        const AudioCtxClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtxClass) {
          ctx = new AudioCtxClass();
          audioCtxRef.current = ctx;
        }
      }
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume();
      }

      if (ctx && ctx.state === 'running') {
        setIsAudioUnlocked(true);
        setIsMuted(false);
        setAudioStatus('ACTIVE');

        // Play a crisp confirmation chime (880Hz A5) to verify hardware speaker output
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);

        // Prime speech synthesis
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          const testU = new SpeechSynthesisUtterance('');
          testU.volume = 0;
          window.speechSynthesis.speak(testU);
        }
      }
    } catch (err) {
      console.warn('Audio unlock warning:', err);
      setAudioStatus('PERMISSION_REQUIRED');
    }
  }, []);

  // Passive unlock on any user gesture across the document
  useEffect(() => {
    const handleGesture = () => {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current
          .resume()
          .then(() => {
            if (audioCtxRef.current?.state === 'running') {
              setIsAudioUnlocked(true);
              setAudioStatus((prev) => (prev === 'MUTED' ? 'MUTED' : 'ACTIVE'));
            }
          })
          .catch(() => {});
      }
    };
    window.addEventListener('pointerdown', handleGesture, { passive: true });
    window.addEventListener('keydown', handleGesture, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', handleGesture);
      window.removeEventListener('keydown', handleGesture);
    };
  }, []);

  // Update audioStatus when mute is toggled
  useEffect(() => {
    if (isMuted) {
      setAudioStatus('MUTED');
    } else if (isAudioUnlocked) {
      setAudioStatus('ACTIVE');
    } else {
      setAudioStatus('PERMISSION_REQUIRED');
    }
  }, [isMuted, isAudioUnlocked]);

  // Gentle tone for MODERATE alerts
  const playModerateChime = useCallback(() => {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }, [isMuted, getAudioContext]);

  // Urgent dual-tone for HIGH alerts / Drowsiness
  const playHighAlertBeep = useCallback(() => {
    if (isMuted) return;
    if (isAssistantSpeakingRef.current) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      isAssistantSpeakingRef.current = false;
      setIsAssistantSpeaking(false);
    }
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(780, now);
    osc.frequency.setValueAtTime(1040, now + 0.1);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.setValueAtTime(0.24, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }, [isMuted, getAudioContext]);

  // Critical alarm pulse (sawtooth high alert)
  const playCriticalAlarm = useCallback(() => {
    if (isMuted) return;
    if (isAssistantSpeakingRef.current) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      isAssistantSpeakingRef.current = false;
      setIsAssistantSpeaking(false);
    }
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.linearRampToValueAtTime(1150, now + 0.15);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.28);
  }, [isMuted, getAudioContext]);

  // Cancel conversational assistant speech when pre-empted by safety alarms
  const cancelAssistantSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    isAssistantSpeakingRef.current = false;
    setIsAssistantSpeaking(false);
  }, []);

  // Voice selection helper with dynamic voice caching
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const updateVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        voicesRef.current = v;
      }
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }, []);

  // Periodic resume ticker to prevent Chrome's 15-second speech synthesis freeze bug
  const resumeTickerRef = useRef<number | null>(null);
  const startResumeTicker = useCallback(() => {
    if (resumeTickerRef.current) clearInterval(resumeTickerRef.current);
    resumeTickerRef.current = window.setInterval(() => {
      if (typeof window !== 'undefined' && window.speechSynthesis && isAssistantSpeakingRef.current) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 7000);
  }, []);

  const stopResumeTicker = useCallback(() => {
    if (resumeTickerRef.current) {
      clearInterval(resumeTickerRef.current);
      resumeTickerRef.current = null;
    }
  }, []);

  // Conversational Assistant Speech with feedback-loop callbacks & English voice selection
  const speakAssistant = useCallback(
    (message: string, onEnd?: () => void, onStart?: () => void, _lang: 'HINGLISH' | 'ENGLISH' = 'ENGLISH') => {
      if (isMutedRef.current || typeof window === 'undefined' || !window.speechSynthesis) {
        onEnd?.();
        return;
      }

      // Safety priority: never speak assistant voice if drowsiness alert active
      if (isDrowsinessActiveRef.current) {
        onEnd?.();
        return;
      }

      // Clear any previous safety timeout
      if (speechSafetyTimeoutRef.current) {
        clearTimeout(speechSafetyTimeoutRef.current);
        speechSafetyTimeoutRef.current = null;
      }

      try {
        window.speechSynthesis.cancel();
        stopResumeTicker();

        // Small 40ms micro-pause ensures cancel() completes cleanly before speak()
        setTimeout(() => {
          if (isDrowsinessActiveRef.current || isMutedRef.current) {
            onEnd?.();
            return;
          }

          const utterance = new SpeechSynthesisUtterance(message);
          const allVoices = voicesRef.current.length > 0 ? voicesRef.current : window.speechSynthesis.getVoices();

          const selectedVoice =
            allVoices.find((v) => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Jenny') || v.name.includes('Guy')) && v.lang.startsWith('en')) ||
            allVoices.find((v) => v.lang.startsWith('en')) ||
            null;

          utterance.lang = selectedVoice?.lang || 'en-US';

          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }

          utterance.rate = 1.02; // Confident, natural English cadence
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          let hasEnded = false;
          const finish = () => {
            if (!hasEnded) {
              hasEnded = true;
              stopResumeTicker();
              // Clear safety timeout on normal finish
              if (speechSafetyTimeoutRef.current) {
                clearTimeout(speechSafetyTimeoutRef.current);
                speechSafetyTimeoutRef.current = null;
              }
              isAssistantSpeakingRef.current = false;
              setIsAssistantSpeaking(false);
              // 150ms buffer flush prevents mic from picking up residual speaker echo
              setTimeout(() => {
                onEnd?.();
              }, 150);
            }
          };

          utterance.onstart = () => {
            isAssistantSpeakingRef.current = true;
            setIsAssistantSpeaking(true);
            startResumeTicker();
            onStart?.();

            // Bug 6 Fix: Safety timeout — if onend never fires (Chrome bug),
            // force-finish after 15s so conversation doesn't permanently stall
            speechSafetyTimeoutRef.current = window.setTimeout(() => {
              if (isAssistantSpeakingRef.current && !hasEnded) {
                console.warn('[SafeDrive] Speech safety timeout: forcing finish after 15s');
                try { window.speechSynthesis.cancel(); } catch { /* noop */ }
                finish();
              }
            }, 15000);
          };

          utterance.onend = finish;
          utterance.onerror = finish;

          window.speechSynthesis.resume();
          window.speechSynthesis.speak(utterance);
        }, 40);
      } catch {
        stopResumeTicker();
        isAssistantSpeakingRef.current = false;
        setIsAssistantSpeaking(false);
        onEnd?.();
      }
    },
    [startResumeTicker, stopResumeTicker]
  );

  // Voice alert using SpeechSynthesis (Pre-empts assistant speech)
  const speakWarning = useCallback((message: string, minIntervalMs: number = 6000) => {
    if (isMuted) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const now = Date.now();
    if (now - lastSpeechTimeRef.current < minIntervalMs) return;
    lastSpeechTimeRef.current = now;

    // Cut off assistant speech immediately
    if (isAssistantSpeakingRef.current) {
      isAssistantSpeakingRef.current = false;
      setIsAssistantSpeaking(false);
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Audio speech fallback
    }
  }, [isMuted]);

  // Dedicated Drowsiness Alert Trigger with Debounce & Escalation
  const triggerDrowsinessAlert = useCallback((durationSec: number) => {
    if (isMuted) return;
    const now = Date.now();
    isDrowsinessActiveRef.current = true;

    if (durationSec >= 2.5) {
      // Escalated Critical Microsleep Hazard
      if (now - lastDrowsinessToneTimeRef.current > 600) {
        lastDrowsinessToneTimeRef.current = now;
        playCriticalAlarm();
      }
      if (now - lastDrowsinessSpeechTimeRef.current > 5000) {
        lastDrowsinessSpeechTimeRef.current = now;
        speakWarning('Warning. Severe driver drowsiness detected. Please stop safely.', 4500);
      }
    } else if (durationSec >= 1.0) {
      // Sustained Eye Closure (1.0s - 2.5s)
      if (now - lastDrowsinessToneTimeRef.current > 1200) {
        lastDrowsinessToneTimeRef.current = now;
        playHighAlertBeep();
      }
      if (now - lastDrowsinessSpeechTimeRef.current > 6500) {
        lastDrowsinessSpeechTimeRef.current = now;
        speakWarning('Please stay alert and focus on the road.', 6000);
      }
    }
  }, [isMuted, playHighAlertBeep, playCriticalAlarm, speakWarning]);

  // Drowsiness Recovery: Stops audio alarms when eyes reopen
  const stopDrowsinessAlert = useCallback(() => {
    if (isDrowsinessActiveRef.current) {
      isDrowsinessActiveRef.current = false;
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
  }, []);

  // React to general risk tier updates
  const handleTierAlert = useCallback((tier: RiskTier) => {
    if (isMuted) return;
    const now = Date.now();

    if (tier === 'MODERATE') {
      if (now - lastBeepTimeRef.current > 4000) {
        lastBeepTimeRef.current = now;
        playModerateChime();
      }
    } else if (tier === 'HIGH') {
      if (now - lastBeepTimeRef.current > 1600) {
        lastBeepTimeRef.current = now;
        playHighAlertBeep();
      }
      speakWarning('Please stay alert and focus on the road.', 6500);
    } else if (tier === 'CRITICAL') {
      if (now - lastBeepTimeRef.current > 750) {
        lastBeepTimeRef.current = now;
        playCriticalAlarm();
      }
      speakWarning('Critical risk detected. Prepare to safely pull over.', 5500);
    }
  }, [isMuted, playModerateChime, playHighAlertBeep, playCriticalAlarm, speakWarning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (speechSafetyTimeoutRef.current) {
        clearTimeout(speechSafetyTimeoutRef.current);
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    isMuted,
    setIsMuted,
    toggleMute: () => setIsMuted((prev) => !prev),
    isAudioUnlocked,
    audioStatus,
    enableSafetyAudio,
    triggerDrowsinessAlert,
    stopDrowsinessAlert,
    handleTierAlert,
    playModerateChime,
    playHighAlertBeep,
    playCriticalAlarm,
    speakWarning,
    isAssistantSpeaking,
    speakAssistant,
    cancelAssistantSpeech,
  };
}
