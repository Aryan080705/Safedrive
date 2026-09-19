# SafeDrive — Live Camera & Voice Functionality Audit

**Audit Date**: 2026-09-19  
**System Target**: SafeDrive v2.0 Live Prototype (`http://localhost:5173`)  
**Scope**: Camera Pipeline (`useFaceLandmarker.ts`, `riskEngine.ts`, `CameraMonitor.tsx`, `useSafeRider.ts`) & Voice Pipeline (`useVoiceAssistant.ts`, `useAudioAlerts.ts`, `VoiceAssistantHUD.tsx`, `App.tsx`)

---

## Executive Summary

| Subsystem | Audit Status | Key Failure Root Cause | Proposed Fix Summary |
| :--- | :--- | :--- | :--- |
| **1. Yawn Detection** | **FAILING** | Single-frame MAR check with unrealistic static threshold; no temporal open-sustain-close state machine. | Implement multi-stage temporal state machine (`NORMAL` → `MOUTH_OPENING` → `POSSIBLE_YAWN` → `YAWN_CONFIRMED` → `COOLDOWN`) with calibrated MAR (~0.45). |
| **2. Side Head Pose** | **FAILING** | Raw yaw calculation had no temporal hold states (`LOOKING_LEFT`, `LOOKING_RIGHT`, `FORWARD`, `UNKNOWN`), causing instantaneous flickering; missing landmarks were treated as normal or ignored. | Add temporal head state classifier with sustained-hold filter (>= 1.2s before hazard flag) and explicit `UNKNOWN` state on face loss. |
| **3. Looking Down / Sleep Posture** | **FAILING** | Pitch alone was evaluated without eye integration; EAR < 0.17 check failed during downward gaze due to landmark compression; missing landmarks were not handled properly. | Fuse downward pitch (pitch < -20°) with sustained duration and EAR; introduce `POSSIBLE_SLEEPING_POSTURE` only when supported by multiple concurrent signals; flag `EYES_UNAVAILABLE` when face angle prevents eye tracking. |
| **4. Drowsiness Fusion** | **FAILING** | Arbitrary arithmetic sum of points in `RiskEngine`; momentary head tilts immediately spiked risk tier to HIGH/CRITICAL. | Implement explainable rule-based evidence accumulator with multi-signal cross-validation and explicit user-facing reasons. |
| **5. Developer Diagnostics** | **MISSING** | Production UI lacked live numerical readout for developer verification (raw MAR, EAR, Yaw, Pitch, States, Last Trigger). | Add toggleable "Developer Diagnostics" HUD overlay for real-time telemetry inspection without cluttering production. |
| **6. Voice Personal Interaction** | **FAILING** | Stale closure & race condition: `isAssistantSpeakingRef` in `useVoiceAssistant` remains `true` when `onEnd` triggers `startListeningForCurrentState`, causing the mic startup to immediately abort; voice output self-triggers mic; text input box used instead of speech. | Remove text box/submit button; add 200ms audio flush delay between TTS finish and mic start; decouple `onEnd` mic trigger from stale speaking ref; fix audio feedback loop. |
| **7. Safety Interruption & Counter** | **PARTIAL** | Voice chat could overlap with safety alerts or trigger unexpectedly; interaction counter was hardcoded to 2 instead of 3. | Enforce 3 meaningful interactions (`interactions: X/3`); guarantee immediate pause/abort of voice assistant on critical safety alerts. |

---

## Detailed Component Audits

### Problem 1: Live Camera Yawn Detection
- **Status**: FAILING
- **Exact File**: [`src/hooks/useFaceLandmarker.ts`](file:///c:/Users/aryan/OneDrive/Documents/New%20folder/safedrive-assistant/safedrive-assistant/src/hooks/useFaceLandmarker.ts#L353-L379) & [`src/services/riskEngine.ts`](file:///c:/Users/aryan/OneDrive/Documents/New%20folder/safedrive-assistant/safedrive-assistant/src/services/riskEngine.ts#L79-L93)
- **Exact Function/Component**: `useFaceLandmarker` frame processing loop (MAR calculation) and `RiskEngine.evaluate`
- **Actual Input**: Facial landmarks [13, 14, 78, 308] (lip boundaries) during natural speech and yawning.
- **Actual Output**: Either false yawn detections during normal speech or zero yawn detections during actual yawning.
- **Failure Point**:
  1. MAR calculation relies strictly on inner lip center distance `dist(13, 14) / dist(78, 308)`.
  2. Static threshold comparison (`mar > 0.62` or `mar > 0.50`) does not evaluate the temporal curve of a yawn (gradual opening over 0.8s, wide aperture hold for 1.0-2.5s, then closure).
  3. No cooldown mechanism, leading to repeated alerts or immediate drop-off.
- **Root Cause**: Yawn was treated as a momentary scalar threshold rather than a temporal physiological trajectory.
- **Proposed Fix**:
  - Implement a 5-stage temporal state machine: `NORMAL` → `MOUTH_OPENING` (MAR > 0.42 for > 300ms) → `POSSIBLE_YAWN` (MAR > 0.48 for > 800ms) → `YAWN_CONFIRMED` (sustained hold for >= 1.5s followed by closure) → `COOLDOWN` (3.5s).
  - Speech rejection: fast MAR oscillations (frequency > 2Hz or duration < 600ms) are categorized as `NORMAL_SPEECH` and rejected.

---

### Problem 2: Side Head Movement / Attention
- **Status**: FAILING
- **Exact File**: [`src/hooks/useFaceLandmarker.ts`](file:///c:/Users/aryan/OneDrive/Documents/New%20folder/safedrive-assistant/safedrive-assistant/src/hooks/useFaceLandmarker.ts#L380-L419)
- **Exact Function/Component**: `useFaceLandmarker` Head Pose (Yaw / Pitch Estimation)
- **Actual Input**: Landmarks 1 (noseTip), 234 (leftCheek), 454 (rightCheek).
- **Actual Output**: Instantaneous boolean `isDistracted = Math.abs(yaw) > 28`, with no directional state representation.
- **Failure Point**:
  1. Head orientation is reduced to a binary `isDistracted` boolean without persistent directional states (`LOOKING_LEFT`, `LOOKING_RIGHT`, `FORWARD`, `UNKNOWN`).
  2. When the user turns their head past ~40°, MediaPipe loses face symmetry or drops landmarks, which either froze previous values or flashed error states.
- **Root Cause**: Lack of stateful head pose tracking with explicit hysteresis and loss handling.
- **Proposed Fix**:
  - Implement head state tracking:
    - `yaw < -22°`: `LOOKING_LEFT`
    - `yaw > 22°`: `LOOKING_RIGHT`
    - `-22° <= yaw <= 22°` and `pitch >= -18°`: `FORWARD`
    - No face landmarks detected: `UNKNOWN` (must NEVER default to `LOOKING_DOWN` or `EYES_CLOSED`).
  - Sustained duration filter: Only transition to attention risk if `LOOKING_LEFT` or `LOOKING_RIGHT` persists for >= 1.2 seconds.

---

### Problem 3: Looking Down / Sleeping Posture
- **Status**: FAILING
- **Exact File**: [`src/hooks/useFaceLandmarker.ts`](file:///c:/Users/aryan/OneDrive/Documents/New%20folder/safedrive-assistant/safedrive-assistant/src/hooks/useFaceLandmarker.ts#L393-L418) & [`src/services/riskEngine.ts`](file:///c:/Users/aryan/OneDrive/Documents/New%20folder/safedrive-assistant/safedrive-assistant/src/services/riskEngine.ts#L94-L135)
- **Exact Function/Component**: Pitch estimation and distraction/fatigue compounding in `RiskEngine`.
- **Actual Input**: Forehead (10), Nose (1), Chin (152) landmark Y-coordinates during head downward slump.
- **Actual Output**: Evaluated purely as generic "distraction" or ignored when eyelids become occluded by camera angle.
- **Failure Point**:
  1. Looking down was treated purely as looking at a phone (`isLookingDown`), failing to detect actual sleep slump.
  2. When head pitches down sharply (`pitch < -24°`), camera perspective causes eyelids to appear closed or eye landmarks become unstable. The system either reported false eye closure or failed to recognize head-down sleep posture.
- **Root Cause**: Disconnected classification of head pitch and eye state without a dedicated `POSSIBLE_SLEEPING_POSTURE` detector.
- **Proposed Fix**:
  - State machine: `NORMAL` → `HEAD_DOWN` (pitch < -20° for > 500ms) → `SUSTAINED_HEAD_DOWN` (> 1.5s) → `POSSIBLE_DROWSINESS` (sustained head down + low/unobservable EAR) → `DROWSINESS_CONFIRMED` (> 2.5s).
  - Explicit eye visibility guard: If head pitch is steep (`pitch < -25°`), set eye status to `EYES_UNAVAILABLE` rather than guessing `EYES_CLOSED`.

---

### Problem 4: Drowsiness Multi-Signal Fusion
- **Status**: FAILING
- **Exact File**: [`src/services/riskEngine.ts`](file:///c:/Users/aryan/OneDrive/Documents/New%20folder/safedrive-assistant/safedrive-assistant/src/services/riskEngine.ts#L30-L155)
- **Exact Function/Component**: `RiskEngine.evaluate`
- **Actual Input**: `DriverTelemetry` with individual flags (`isEyeClosed`, `isYawning`, `isDistracted`).
- **Actual Output**: Ad-hoc points summation without clear multi-evidence corroboration.
- **Failure Point**: A brief single-factor anomaly (e.g. looking down for 1.2s) added enough points to escalate to HIGH risk tier without cross-validation.
- **Root Cause**: Linear additive heuristic rather than structured multi-signal evidence fusion.
- **Proposed Fix**:
  - Require cross-signal corroboration for HIGH/CRITICAL drowsiness:
    - High confidence drowsiness = (Prolonged eye closure >= 1.2s) OR (Sustained head down >= 2.0s + Drooping eyes) OR (Confirmed Yawn + Subsequent sluggish eye closure).
    - Isolated head turn = Attention warning only (severity bounded to MODERATE).
  - Expose explainable reasons array in assessment output.

---

### Problem 5: Voice Personal Interaction & Mic/TTS Feedback Loop
- **Status**: FAILING
- **Exact File**: [`src/hooks/useVoiceAssistant.ts`](file:///c:/Users/aryan/OneDrive/Documents/New%20folder/safedrive-assistant/safedrive-assistant/src/hooks/useVoiceAssistant.ts#L340-L450), [`src/hooks/useAudioAlerts.ts`](file:///c:/Users/aryan/OneDrive/Documents/New%20folder/safedrive-assistant/safedrive-assistant/src/hooks/useAudioAlerts.ts#L254-L349), [`src/components/VoiceAssistantHUD.tsx`](file:///c:/Users/aryan/OneDrive/Documents/New%20folder/safedrive-assistant/safedrive-assistant/src/components/VoiceAssistantHUD.tsx#L248-L266)
- **Exact Function/Component**: `useVoiceAssistant.startListeningForCurrentState`, `useAudioAlerts.speakAssistant.finish`, and manual text input form.
- **Actual Input**: User clicking "Talk to SafeDrive" or triggering demo.
- **Actual Output**: SafeDrive speaks invitation, then microphone NEVER starts listening; user is forced to type in fallback text box.
- **Failure Point**:
  1. In `useVoiceAssistant.ts`, `startListeningForCurrentState` checks `if (isAssistantSpeakingRef.current) return;`.
  2. In `useAudioAlerts.ts`, `finish()` calls `setIsAssistantSpeaking(false)` (asynchronous React state update) and immediately on the next line calls `onEnd?.()`.
  3. Because React has not re-rendered yet, `useVoiceAssistant`'s `isAssistantSpeakingRef.current` is STILL `true`!
  4. `startListeningForCurrentState` aborts immediately on line 351!
  5. The SpeechRecognition engine is never started, mic never activates, and the user must type manually.
  6. The UI contains a prominent text input and send button, violating the 100% hands-free requirement.
- **Root Cause**: Synchronous callback execution against asynchronous React state update coupled with restrictive speaking guards in the listener.
- **Proposed Fix**:
  - Remove text input form and submit button from `VoiceAssistantHUD.tsx`.
  - In `speakAssistant`, ensure `onEnd` is called after a clean 150ms delay to let the audio buffer clear and React states flush.
  - In `startListeningForCurrentState`, override `isAssistantSpeakingRef.current = false` when called from a completion callback so recognition starts reliably every time.
  - Add explicit audio isolation: SpeechRecognition is aborted before TTS starts and only instantiated 200ms after TTS finishes.

---

### Problem 6: Voice Interaction Trigger & Demo Mode
- **Status**: PARTIAL / FAILING
- **Exact File**: [`src/App.tsx`](file:///c:/Users/aryan/OneDrive/Documents/New%20folder/safedrive-assistant/safedrive-assistant/src/App.tsx#L260-L284) & [`src/hooks/useVoiceAssistant.ts`](file:///c:/Users/aryan/OneDrive/Documents/New%20folder/safedrive-assistant/safedrive-assistant/src/hooks/useVoiceAssistant.ts#L555-L570)
- **Exact Function/Component**: `registerInteraction` and `App` hazard clearance listener.
- **Actual Input**: User interactions / safety alert clearances.
- **Actual Output**: Threshold set to 2 interactions; no dedicated judge-accessible DEMO trigger for voice personal chat.
- **Failure Point**:
  1. `next >= 2` in `useVoiceAssistant.ts` does not match the required 3-interaction threshold.
  2. Judge has no one-click "DEMO — VOICE PERSONAL CHAT" button that guarantees instant start of the 4-stage personal conversation without waiting for alerts.
- **Root Cause**: Inconsistent interaction threshold and missing dedicated demo trigger.
- **Proposed Fix**:
  - Update interaction threshold to exactly 3 meaningful interactions (`interactions >= 3`).
  - Add prominent "DEMO — VOICE PERSONAL CHAT" trigger button in the HUD and Developer Diagnostics panel.
  - Display diagnostic counter `Meaningful interactions: X/3`.
