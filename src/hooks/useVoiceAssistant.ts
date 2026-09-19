import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  MicStatus,
  RiderSessionContext,
  VoiceAssistantState,
  VoiceAssistantTelemetry,
  AssistantLanguage,
} from '../types';
import { VoiceResponseEngine, type RoadContextData } from '../services/voiceResponseEngine';

// Global declarations for Web Speech API
interface IWindowWithSpeech extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

interface UseVoiceAssistantParams {
  speakAssistant: (message: string, onEnd?: () => void, onStart?: () => void, lang?: AssistantLanguage) => void;
  cancelAssistantSpeech: () => void;
  isAssistantSpeaking: boolean;
  isSafetyAlertActive: boolean; // True when drowsiness, critical collision, or SOS is active
  isMuted: boolean;
  roadContext?: RoadContextData;
}

export function useVoiceAssistant({
  speakAssistant,
  cancelAssistantSpeech,
  isAssistantSpeaking,
  isSafetyAlertActive,
  isMuted,
  roadContext,
}: UseVoiceAssistantParams) {
  // State Machine State
  const [state, setState] = useState<VoiceAssistantState>('IDLE');
  const [micStatus, setMicStatus] = useState<MicStatus>('READY');
  const [language, setLanguage] = useState<AssistantLanguage>('ENGLISH');
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [lastAiSpeech, setLastAiSpeech] = useState<string>('');
  const [sessionContext, setSessionContext] = useState<RiderSessionContext>({});
  const [interactionCount, setInteractionCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  // Refs for state machine management without stale closures
  const stateRef = useRef<VoiceAssistantState>('IDLE');
  stateRef.current = state;
  const languageRef = useRef<AssistantLanguage>('ENGLISH');
  languageRef.current = language;
  const roadContextRef = useRef<RoadContextData | undefined>(roadContext);
  roadContextRef.current = roadContext;

  // Bug 2 Fix: Use refs for prop values that change between renders
  // to prevent stale closures in callbacks
  const isAssistantSpeakingRef = useRef<boolean>(isAssistantSpeaking);
  isAssistantSpeakingRef.current = isAssistantSpeaking;
  const isSafetyAlertActiveRef = useRef<boolean>(isSafetyAlertActive);
  isSafetyAlertActiveRef.current = isSafetyAlertActive;
  const isMutedRef = useRef<boolean>(isMuted);
  isMutedRef.current = isMuted;

  const recognitionRef = useRef<any>(null);
  const isRecognitionActiveRef = useRef<boolean>(false);
  const silenceTimeoutRef = useRef<number | null>(null);
  const pausedFromStateRef = useRef<VoiceAssistantState | null>(null);
  const consecutiveSilenceCountRef = useRef<number>(0);
  // Bug 5 Fix: Track manual aborts to prevent ghost onend processing
  const wasManuallyAbortedRef = useRef<boolean>(false);

  // ------------------------------------------------------------------
  // Initialize Web Speech Recognition Engine
  // ------------------------------------------------------------------
  const isSpeechSupported = typeof window !== 'undefined' &&
    !!((window as IWindowWithSpeech).SpeechRecognition || (window as IWindowWithSpeech).webkitSpeechRecognition);

  const stopListening = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    if (recognitionRef.current && isRecognitionActiveRef.current) {
      // Bug 5 Fix: Flag manual abort so onend handler skips processing
      wasManuallyAbortedRef.current = true;
      try {
        recognitionRef.current.abort();
      } catch {
        // Recognition already inactive
      }
      isRecognitionActiveRef.current = false;
    }
    setMicStatus((prev) => (prev === 'LISTENING' || prev === 'PROCESSING' ? 'READY' : prev));
  }, []);

  const dismissVoiceChat = useCallback(() => {
    cancelAssistantSpeech();
    stopListening();
    setState('IDLE');
    setMicStatus('READY');
    setTranscript('');
    setInterimTranscript('');
    consecutiveSilenceCountRef.current = 0;
  }, [cancelAssistantSpeech, stopListening]);

  const processSpokenAnswer = useCallback(
    (spokenText: string) => {
      stopListening();
      const current = stateRef.current;
      const lang = languageRef.current;
      const cleanText = spokenText.trim();
      setTranscript(cleanText);
      setInterimTranscript('');

      // -------------------------------------------------------------
      // 1. Check for Real Road Intents (Status, Speed, Danger, Mute)
      // -------------------------------------------------------------
      if (cleanText) {
        const roadIntent = VoiceResponseEngine.checkRoadIntent(cleanText, roadContextRef.current, lang);
        if (roadIntent.isHandled) {
          setLastAiSpeech(roadIntent.reply);
          if (roadIntent.action === 'MUTE') {
            speakAssistant(
              roadIntent.reply,
              () => {
                dismissVoiceChat();
              },
              undefined,
              lang
            );
            return;
          } else {
            speakAssistant(
              roadIntent.reply,
              () => {
                // If we were waiting for an answer, resume listening after replying
                if (stateRef.current !== 'IDLE' && stateRef.current !== 'COMPLETE') {
                  startListeningForCurrentState(stateRef.current);
                }
              },
              undefined,
              lang
            );
            return;
          }
        }
      }

      // -------------------------------------------------------------
      // 2. Handle Silence / No Speech Gracefully (Retry instead of crash)
      // -------------------------------------------------------------
      if (!cleanText) {
        if (consecutiveSilenceCountRef.current < 1 && current !== 'IDLE' && current !== 'COMPLETE') {
          consecutiveSilenceCountRef.current += 1;
          const retryPrompt =
            lang === 'HINGLISH'
              ? 'Awaaz thodi kat gayi dost, ek baar firse bolo?'
              : "Sorry, I didn't catch that. Could you say that again?";
          setLastAiSpeech(retryPrompt);
          speakAssistant(
            retryPrompt,
            () => {
              startListeningForCurrentState(current);
            },
            undefined,
            lang
          );
          return;
        }

        // Multiple silences: exit to IDLE cleanly
        dismissVoiceChat();
        return;
      }

      consecutiveSilenceCountRef.current = 0;

      // -------------------------------------------------------------
      // 3. Conversational State Machine Transitions
      // -------------------------------------------------------------
      if (current === 'WAITING_FOR_ACCEPTANCE' || current === 'IDLE') {
        const evalRes = VoiceResponseEngine.evaluateAcceptance(cleanText, lang);
        if (evalRes.action === 'DECLINE') {
          setLastAiSpeech(evalRes.spokenReply);
          speakAssistant(
            evalRes.spokenReply,
            () => {
              setState('IDLE');
            },
            undefined,
            lang
          );
        } else if (evalRes.action === 'CONTINUE') {
          // Accepted! Move to Question 1: School
          const q1 = VoiceResponseEngine.getPrompt('SCHOOL', lang);
          const fullText = `${evalRes.spokenReply} ${q1}`;
          setLastAiSpeech(fullText);
          setState('INVITATION_SPEAKING');
          speakAssistant(
            fullText,
            () => {
              setState('LISTENING_SCHOOL');
              startListeningForCurrentState('LISTENING_SCHOOL');
            },
            undefined,
            lang
          );
        } else {
          speakAssistant(
            evalRes.spokenReply,
            () => {
              startListeningForCurrentState('WAITING_FOR_ACCEPTANCE');
            },
            undefined,
            lang
          );
        }
      } else if (current === 'LISTENING_SCHOOL') {
        setState('PROCESSING_SCHOOL');
        const evalRes = VoiceResponseEngine.evaluateSchool(cleanText, lang);
        setSessionContext((prev) => ({ ...prev, school: evalRes.extractedValue }));
        setState('RESPONDING_SCHOOL');
        const q2 = VoiceResponseEngine.getPrompt('CRUSH', lang);
        const fullReply = `${evalRes.spokenReply} ${q2}`;
        setLastAiSpeech(fullReply);
        speakAssistant(
          fullReply,
          () => {
            setState('LISTENING_CRUSH');
            startListeningForCurrentState('LISTENING_CRUSH');
          },
          undefined,
          lang
        );
      } else if (current === 'LISTENING_CRUSH') {
        setState('PROCESSING_CRUSH');
        const evalRes = VoiceResponseEngine.evaluateCrush(cleanText, lang);
        setSessionContext((prev) => ({ ...prev, crush: evalRes.extractedValue }));
        setState('RESPONDING_CRUSH');
        const q3 = VoiceResponseEngine.getPrompt('HELMET_SING', lang);
        const fullReply = `${evalRes.spokenReply} ${q3}`;
        setLastAiSpeech(fullReply);
        speakAssistant(
          fullReply,
          () => {
            setState('LISTENING_HELMET_SING');
            startListeningForCurrentState('LISTENING_HELMET_SING');
          },
          undefined,
          lang
        );
      } else if (current === 'LISTENING_HELMET_SING') {
        setState('PROCESSING_HELMET_SING');
        const evalRes = VoiceResponseEngine.evaluateHelmetSinging(cleanText, lang);
        setSessionContext((prev) => ({ ...prev, helmetSinging: evalRes.extractedValue }));
        setState('RESPONDING_HELMET_SING');
        const q4 = VoiceResponseEngine.getPrompt('CHAI_CRAVING', lang);
        const fullReply = `${evalRes.spokenReply} ${q4}`;
        setLastAiSpeech(fullReply);
        speakAssistant(
          fullReply,
          () => {
            setState('LISTENING_CHAI_CRAVING');
            startListeningForCurrentState('LISTENING_CHAI_CRAVING');
          },
          undefined,
          lang
        );
      } else if (current === 'LISTENING_CHAI_CRAVING') {
        setState('PROCESSING_CHAI_CRAVING');
        const evalRes = VoiceResponseEngine.evaluateChaiCraving(cleanText, lang);
        setSessionContext((prev) => ({ ...prev, midnightCraving: evalRes.extractedValue }));
        setState('RESPONDING_CHAI_CRAVING');
        const q5 = VoiceResponseEngine.getPrompt('PET_PEEVE', lang);
        const fullReply = `${evalRes.spokenReply} ${q5}`;
        setLastAiSpeech(fullReply);
        speakAssistant(
          fullReply,
          () => {
            setState('LISTENING_PET_PEEVE');
            startListeningForCurrentState('LISTENING_PET_PEEVE');
          },
          undefined,
          lang
        );
      } else if (current === 'LISTENING_PET_PEEVE') {
        setState('PROCESSING_PET_PEEVE');
        const evalRes = VoiceResponseEngine.evaluatePetPeeve(cleanText, lang);
        setSessionContext((prev) => ({ ...prev, roadPetPeeve: evalRes.extractedValue }));
        setState('RESPONDING_PET_PEEVE');
        const q6 = VoiceResponseEngine.getPrompt('PASSION', lang);
        const fullReply = `${evalRes.spokenReply} ${q6}`;
        setLastAiSpeech(fullReply);
        speakAssistant(
          fullReply,
          () => {
            setState('LISTENING_PASSION');
            startListeningForCurrentState('LISTENING_PASSION');
          },
          undefined,
          lang
        );
      } else if (current === 'LISTENING_PASSION') {
        setState('PROCESSING_PASSION');
        const evalRes = VoiceResponseEngine.evaluatePassion(cleanText, lang);
        setSessionContext((prev) => ({ ...prev, passion: evalRes.extractedValue }));
        setState('RESPONDING_PASSION');
        const closingText = VoiceResponseEngine.getPrompt('CLOSING', lang);
        const finalClosing = `${evalRes.spokenReply} ${closingText}`;
        setLastAiSpeech(finalClosing);
        speakAssistant(
          finalClosing,
          () => {
            setState('COMPLETE');
            setTimeout(() => {
              if (stateRef.current === 'COMPLETE') {
                setState('IDLE');
              }
            }, 5000);
          },
          undefined,
          lang
        );
      }
    },
    [dismissVoiceChat, speakAssistant, stopListening]
  );

  // Bug 3 Fix: Convert startListeningForCurrentState to a ref-based function
  // to break the circular dependency with processSpokenAnswer.
  // processSpokenAnswer calls startListeningForCurrentState and vice versa via speech callbacks.
  const startListeningRef = useRef<(targetState: VoiceAssistantState) => void>(() => {});

  const startListeningForCurrentState = useCallback(
    (targetState: VoiceAssistantState) => {
      startListeningRef.current(targetState);
    },
    []
  );

  // Actual implementation assigned to the ref — always reads latest values via refs
  useEffect(() => {
    startListeningRef.current = (_targetState: VoiceAssistantState) => {
      if (!isSpeechSupported) {
        setMicStatus('UNSUPPORTED');
        setErrorMessage('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
        return;
      }

      // Read from refs, not stale closure props
      if (isMutedRef.current) return;
      if (isSafetyAlertActiveRef.current) return;

      // When startListening is invoked (especially from onEnd callback), ensure assistant speaking flag is cleared
      isAssistantSpeakingRef.current = false;

      stopListening();

      try {
        const SpeechClass =
          (window as IWindowWithSpeech).SpeechRecognition ||
          (window as IWindowWithSpeech).webkitSpeechRecognition;
        const recognition = new SpeechClass();
        recognitionRef.current = recognition;

        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        let finalAccumulated = '';

        recognition.onstart = () => {
          isRecognitionActiveRef.current = true;
          // Clear abort flag when a new session starts
          wasManuallyAbortedRef.current = false;
          setMicStatus('LISTENING');
          setTranscript('');
          setInterimTranscript('');
          setErrorMessage(undefined);
        };

        recognition.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalAccumulated += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          setInterimTranscript(interim);
          if (finalAccumulated) {
            setTranscript(finalAccumulated);
          }

          // Generous 2.5s silence timeout so rider isn't cut off mid-thought
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
          }
          silenceTimeoutRef.current = window.setTimeout(() => {
            if (isRecognitionActiveRef.current) {
              recognition.stop();
            }
          }, 2500);
        };

        recognition.onspeechend = () => {
          setMicStatus('PROCESSING');
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
        };

        recognition.onend = () => {
          isRecognitionActiveRef.current = false;
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }

          // Skip processing if this onend came from a manual abort
          if (wasManuallyAbortedRef.current) {
            wasManuallyAbortedRef.current = false;
            return;
          }

          const captured = (finalAccumulated || '').trim();
          processSpokenAnswer(captured);
        };

        recognition.onerror = (event: any) => {
          isRecognitionActiveRef.current = false;
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }

          // Don't process errors from manual aborts
          if (wasManuallyAbortedRef.current) {
            wasManuallyAbortedRef.current = false;
            return;
          }

          if (event.error === 'not-allowed') {
            setMicStatus('PERMISSION_DENIED');
            setErrorMessage('Microphone access denied. Please allow microphone in browser permissions.');
          } else if (event.error === 'no-speech') {
            processSpokenAnswer('');
          } else if (event.error !== 'aborted') {
            setMicStatus('ERROR');
            setErrorMessage(`Recognition error: ${event.error}`);
          }
        };

        // 200ms buffer flush delay ensures speaker audio is fully drained before mic starts listening
        setTimeout(() => {
          if (!isSafetyAlertActiveRef.current && !isMutedRef.current && !isAssistantSpeakingRef.current) {
            try {
              recognition.start();
            } catch {
              // Recognition already started or aborted
            }
          }
        }, 200);
      } catch (err: any) {
        console.warn('Voice assistant recognition start error:', err);
        setMicStatus('ERROR');
      }
    };
  }, [isSpeechSupported, processSpokenAnswer, stopListening]);

  // ------------------------------------------------------------------
  // Safety Priority Observer
  // ------------------------------------------------------------------
  useEffect(() => {
    if (isSafetyAlertActive) {
      if (stateRef.current !== 'IDLE' && stateRef.current !== 'PAUSED_FOR_SAFETY' && stateRef.current !== 'COMPLETE') {
        pausedFromStateRef.current = stateRef.current;
        cancelAssistantSpeech();
        stopListening();
        setState('PAUSED_FOR_SAFETY');
        setMicStatus('PAUSED');
      }
    } else {
      if (stateRef.current === 'PAUSED_FOR_SAFETY' && pausedFromStateRef.current) {
        const resumeToState = pausedFromStateRef.current;
        pausedFromStateRef.current = null;

        speakAssistant(
          "Safety alert handled. We can continue our conversation when you're ready.",
          () => {
            setState(resumeToState);
            startListeningForCurrentState(resumeToState);
          },
          undefined,
          'ENGLISH'
        );
      }
    }
  }, [isSafetyAlertActive, cancelAssistantSpeech, speakAssistant, startListeningForCurrentState, stopListening]);

  // ------------------------------------------------------------------
  // Voice Feedback-Loop Watcher: Stop mic whenever assistant speaks
  // ------------------------------------------------------------------
  useEffect(() => {
    if (isAssistantSpeaking && isRecognitionActiveRef.current) {
      stopListening();
    }
  }, [isAssistantSpeaking, stopListening]);

  const triggerVoiceChat = useCallback(() => {
    if (isSafetyAlertActive) return;
    stopListening();
    cancelAssistantSpeech();

    const invitation = VoiceResponseEngine.getPrompt('INVITATION', languageRef.current);
    setLastAiSpeech(invitation);
    setState('INVITATION_SPEAKING');
    setTranscript('');
    setInterimTranscript('');
    consecutiveSilenceCountRef.current = 0;

    speakAssistant(
      invitation,
      () => {
        setState('WAITING_FOR_ACCEPTANCE');
        startListeningForCurrentState('WAITING_FOR_ACCEPTANCE');
      },
      undefined,
      languageRef.current
    );
  }, [cancelAssistantSpeech, isSafetyAlertActive, speakAssistant, startListeningForCurrentState, stopListening]);

  const handleManualInput = useCallback(
    (text: string) => {
      processSpokenAnswer(text);
    },
    [processSpokenAnswer]
  );

  const toggleMic = useCallback(() => {
    if (micStatus === 'LISTENING') {
      stopListening();
    } else {
      if (stateRef.current === 'IDLE') {
        triggerVoiceChat();
      } else {
        startListeningForCurrentState(stateRef.current);
      }
    }
  }, [micStatus, stopListening, triggerVoiceChat, startListeningForCurrentState]);

  // ------------------------------------------------------------------
  // Manual trigger & Session interaction counter
  // ------------------------------------------------------------------
  const registerInteraction = useCallback(
    (delta = 1) => {
      setInteractionCount((prev) => {
        const next = prev + delta;
        if (next >= 3 && stateRef.current === 'IDLE' && !isSafetyAlertActive) {
          setTimeout(() => {
            if (stateRef.current === 'IDLE' && !isSafetyAlertActive) {
              triggerVoiceChat();
            }
          }, 1800);
        }
        return next;
      });
    },
    [isSafetyAlertActive, triggerVoiceChat]
  );

  // Greet rider once when they start the ride / session
  const greetRiderOnStart = useCallback(() => {
    if (isSafetyAlertActive) return;
    const greeting = 'Hello rider! SafeDrive safety systems are now active. Enjoy your ride!';
    setLastAiSpeech(greeting);
    speakAssistant(greeting, undefined, undefined, 'ENGLISH');
  }, [isSafetyAlertActive, speakAssistant]);

  const triggerDemoVoiceChat = useCallback(() => {
    setInteractionCount(3);
    triggerVoiceChat();
  }, [triggerVoiceChat]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      cancelAssistantSpeech();
    };
  }, [cancelAssistantSpeech, stopListening]);

  const telemetry: VoiceAssistantTelemetry = {
    state,
    micStatus,
    language,
    transcript,
    interimTranscript,
    lastAiSpeech,
    sessionContext,
    interactionCount,
    isPausedForSafety: state === 'PAUSED_FOR_SAFETY',
    errorMessage,
  };

  return {
    telemetry,
    state,
    micStatus,
    language,
    setLanguage,
    sessionContext,
    triggerDemoVoiceChat,
    triggerVoiceChat,
    handleManualInput,
    toggleMic,
    greetRiderOnStart,
    dismissVoiceChat,
    registerInteraction,
    isSpeechSupported,
  };
}
