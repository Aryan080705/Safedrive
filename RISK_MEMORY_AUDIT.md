# SafeDrive Code-Level Audit Report: Risk Memory & Near-Miss Pattern System

**Date:** September 19, 2026  
**Auditor:** Antigravity AI Code Reviewer  
**Repository:** `safedrive-assistant`  
**Application Type:** Client-Side Single Page Application (React 19 + TypeScript + Vite + TailwindCSS + MediaPipe Vision WASM)

---

## Executive Summary
A comprehensive, code-level inspection of the entire `safedrive-assistant` repository was conducted to assess whether a genuine **"Risk Memory Engine"** / rider-specific and location-specific near-miss pattern system already existed.

### Key Finding:
SafeDrive has sophisticated real-time **perception** modules (`CrashCam AI`, `GuardianDrive`, `SafeRider`, and `Blackspot GIS`), but **zero cross-session persistent risk memory and zero pattern discovery logic existed**. 
- There is **no persistent storage** (no `localStorage`, no `IndexedDB`, no backend database).
- Prior to this audit, every module operated strictly in a stateless per-session or per-clip loop. Once the page refreshed or clip looped, all incident context vanished.
- UI elements such as `IncidentAnalysisPanel` display post-event timeline cards for pre-scripted demo clips or single collision frames, but **never stored, aggregated, or compared events against historical patterns**.

---

## Section A: Feature Status Matrix

| ID | Feature Description | Status | Evidence Summary |
|---|---|---|---|
| 1 | Near-miss event extraction | 🟡 PARTIALLY IMPLEMENTED | `roadRiskEngine.ts` computes TTC and conflict zones; detects collision/near-miss frames, but does not emit structured persistent event records. |
| 2 | Event persistence | ❌ MISSING | Neither `localStorage`, `IndexedDB`, nor backend API existed in the codebase. All state was in React `useState`/`useRef`. |
| 3 | Rider-specific event history | ❌ MISSING | No rider identifier, session history ledger, or persistent violation accumulation existed. |
| 4 | Location-specific event history | ⚠️ SIMULATED/DEMO ONLY | `blackspotData.ts` generates synthetic clusters around GPS coordinates (`generateLocalDemoIncidents`), but does not record real user near-misses by location. |
| 5 | Event categorization | 🟡 PARTIALLY IMPLEMENTED | Categories existed for `IncidentAnalysis` (`VEHICLE_CUT_IN`, `PEDESTRIAN_CONFLICT`, `NO_HELMET`, `PHONE`), but only as ad-hoc strings in pre-recorded clips. |
| 6 | Severity recording | 🟡 PARTIALLY IMPLEMENTED | Risk scores (0-100) and tiers (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`) are computed per-frame, but never archived into an event log. |
| 7 | Context recording | 🟡 PARTIALLY IMPLEMENTED | Frame context (TTC, bounding boxes, EAR, head pose) is evaluated in memory, but discarded after rendering. |
| 8 | Recurring pattern detection | ❌ MISSING | No logic existed to detect when 3+ similar events occur over time. |
| 9 | Rider behavior pattern detection | ❌ MISSING | No profiling of rider habits (e.g. frequent phone use, repeated late shoulder checks). |
| 10 | Location pattern detection | ❌ MISSING | No geographic clustering of user-experienced near-misses. |
| 11 | Current-event pattern matching | ❌ MISSING | Incoming events are evaluated only against instantaneous thresholds, never matched against past incidents. |
| 12 | Pattern confidence | ❌ MISSING | No mathematical formula or deterministic heuristic existed for pattern matching confidence. |
| 13 | Early warning based on recurrence | ❌ MISSING | Alerts were 100% reactive to immediate frames (e.g. TTC < 1.2s or EAR < 0.25), never based on historical recurrence. |
| 14 | Explanation of why a pattern was triggered | ❌ MISSING | No "Why am I seeing this pattern?" explanation mechanism existed. |
| 15 | Risk trend/history visualization | ⚠️ MOCK/UI-ONLY | `RiskTrendChart.tsx` renders a rolling 45-second array of instantaneous scores (`TrendDataPoint[]`), which is cleared on page refresh and contains no discrete events. |

---

## Section B: Component-by-Component Audit

### 1. CrashCam AI (Road Collision Subsystem)
- **File:** `src/services/roadRiskEngine.ts`, `src/services/objectTracker.ts`, `src/hooks/useRoadDetector.ts`
- **Class / Functions:** `RoadRiskEngine.evaluate()`, `ObjectTracker.track()`, `useRoadDetector()`
- **Actual Functionality:** REAL computer vision geometry & optical heuristics. Tracks vehicles/pedestrians, estimates time-to-collision (TTC), calculates ego-corridor penetration, and assigns risk scores.
- **Real vs Simulated:** REAL perception when analyzing video frames; SIMULATED scenario metadata in `sampleClips.ts`.
- **What is Missing:** When a collision or near-miss occurs (`assessment.collisionObserved === true`), it generates a transient `IncidentAnalysis` object in React state, but **does not persist it, does not log coordinates, and does not compare it to prior trips**.

### 2. GuardianDrive (Driver Monitoring Subsystem)
- **File:** `src/hooks/useFaceLandmarker.ts`, `src/components/CameraMonitor.tsx`, `src/services/riskEngine.ts`
- **Class / Functions:** `RiskEngine.evaluate()`, `useFaceLandmarker()`
- **Actual Functionality:** REAL MediaPipe Face Landmarker WASM tracking facial landmarks, eye aspect ratio (EAR), blink count, mouth aspect ratio (MAR yawn), and head pose (yaw/pitch).
- **Real vs Simulated:** REAL live webcam vision processing.
- **What is Missing:** Drowsiness and distraction incidents trigger audio warnings and update instantaneous telemetry, but are **never archived into a historical rider profile or pattern database**.

### 3. SafeRider (Two-Wheeler Subsystem)
- **File:** `src/hooks/useSafeRider.ts`, `src/components/SafeRiderPanel.tsx`
- **Functions:** `useSafeRider()`, `SafeRiderPanel`
- **Actual Functionality:** REAL MediaPipe Vision pipeline for helmet verification, visor transmittance classification, phone-in-zone detection (`EfficientDet-Lite0`), and 3D head pose (shoulder checks & slump nod).
- **Real vs Simulated:** REAL live webcam inference.
- **What is Missing:** Counts lifesaver checks within the current session ref (`totalLifesaverChecksRef`), but **discards all counts on reload**. No persistent rider risk profile.

### 4. Blackspot GIS (Accident Hotspot Subsystem)
- **File:** `src/services/blackspotData.ts`, `src/components/BlackspotMap.tsx`
- **Functions:** `computeBlackspotClusters()`, `generateLocalDemoIncidents()`
- **Actual Functionality:** Renders an interactive Leaflet map with pre-compiled regional Indian highway accident blackspots (Delhi-NCR, NH-44, Bangalore, Pune, etc.). When user GPS is available, it synthesizes demo incidents around their coordinates.
- **Real vs Simulated:** Real GIS rendering, but static dataset and synthetic demo point generation.
- **What is Missing:** It does **not record user near-misses** to create dynamic, personalized blackspots. It is strictly a static reference map.

### 5. Post-Event Incident Analysis Panel
- **File:** `src/components/IncidentAnalysisPanel.tsx`
- **Component:** `IncidentAnalysisPanel`
- **Actual Functionality:** UI card displaying 4 sequential timeline steps ("Vehicle A abrupt cut-in", "Ego emergency braking", etc.) and contributing factor percentages.
- **Real vs Simulated:** UI-ONLY / MOCK. Data comes from static presets in `sampleClips.ts` or `roadRiskEngine.generateIncidentAnalysis()`.
- **What is Missing:** It is a single-event viewer. It has no awareness of any other events that happened before or after.

### 6. Safety Fusion Dashboard
- **File:** `src/App.tsx` (lines 273–346), `src/components/SafetyFusionPanel.tsx`
- **Component / Calculation:** `fusedAssessment` useMemo hook
- **Actual Functionality:** Mathematical blend of instantaneous `driverScore * 0.7 + roadScore * 0.3` with a compound multiplier if both are elevated.
- **Real vs Simulated:** REAL instantaneous math on live telemetry.
- **What is Missing:** Zero temporal memory beyond the immediate render cycle. No memory of yesterday's ride, 10 minutes ago, or recurring conflict locations.

---

## Section C: Current vs Desired Data Flow

### Current Actual Data Flow:
```
Camera / Video Stream
       ↓
MediaPipe WASM / OpenCV Heuristics
       ↓
Instantaneous Telemetry State (React useState)
       ↓
Instantaneous Risk Tier & Alert (Screen UI + Web Speech API)
       ↓
[DISCARDED ON NEXT FRAME OR PAGE RELOAD]
```
*(No database, no event extraction, no pattern recognition, no persistence).*

---

### Desired Risk Memory Architecture to Implement:
```
Live Safety Event (CrashCam Near-Miss / SafeRider Distraction / Drowsiness)
       ↓
Event Extraction (Structured SafetyEventRecord: ID, Timestamp, GPS, Type, Context)
       ↓
Persistent Risk Memory Engine (LocalStorage / Namespaced Partitioning)
       ↓
Pattern Discovery Engine (Rider Recurrence >= 3 events | Location Clustering <= 250m)
       ↓
Current Event vs Previous Patterns Matching (Deterministic Multi-factor Score)
       ↓
Recurrence Alert (🔴 RECURRING RISK PATTERN)
       ↓
Transparent Explanation ("WHY AM I SEEING THIS?") + Event Ledger UI
```

---

## Conclusion
The audit confirms that the **Risk Memory Engine is completely missing** and needs to be built as a clean, non-invasive historical pattern layer that consumes existing outputs from `CrashCam`, `GuardianDrive`, `SafeRider`, and `Blackspot GIS` without modifying their working perception loops.
