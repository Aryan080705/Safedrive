# SafeDrive Risk Memory Engine - Comprehensive Verification & Test Plan

**Document Version:** 1.0.0  
**Status:** VALIDATED & PRODUCTION READY  
**Component:** `RiskMemoryEngine` (`src/services/riskMemoryEngine.ts`), `RiskMemoryPanel` (`src/components/RiskMemoryPanel.tsx`)  
**Design Standard:** Obsidian HUD Palette (`#090a0e`, `#12131a`, Emerald `#10b981`, Amber `#f59e0b`, Rose `#ef4444`)

---

## 1. Executive Summary

The **SafeDrive Risk Memory Engine** transforms SafeDrive from a reactive single-frame detector into an adaptive, context-aware safety intelligence platform. Instead of treating every red light, cut-in, or slump as an isolated event, the engine maintains an episodic memory ledger across journeys, discovers spatial-behavioral patterns (using DBSCAN/Haversine clustering within 250m), and provides proactive warnings before the rider enters high-risk recurring zones.

This document specifies the exact test protocol used to verify cold starts, event ingestion, pattern discovery, real-vs-demo segregation, and the 60-second hackathon judge presentation.

---

## 2. Test Suite Specifications

### Test 1: Cold Start Guard & Zero-Data Baseline
* **Objective:** Ensure the system does NOT generate false recurring pattern alerts when insufficient historical data exists.
* **Pre-condition:** Real Memory storage is cleared (`safedrive_risk_memory_real_v1` is empty).
* **Execution:**
  1. Open SafeDrive and navigate to the **Risk Memory** tab.
  2. Verify that total events count is `0`.
  3. Verify top status badge shows: `🟢 RISK MEMORY INITIALIZING (Cold Start: 0/3 events)`.
  4. Verify the recurring pattern alert banner is **hidden**.
  5. Add 1 or 2 events manually or via live perception.
* **Pass Criteria:**
  - When event count is `< 3`, system explicitly displays the initializing badge.
  - "Recurring pattern detected" is NEVER triggered prematurely.

---

### Test 2: Real-World Vision Perception Event Ingestion
* **Objective:** Verify automated event generation from CrashCam AI, SafeRider, and GuardianDrive vision pipelines.
* **Execution:**
  1. **CrashCam AI:** Run a road scenario with a cut-in vehicle or collision conflict (`tier === 'CRITICAL'`).
     - *Verified Bridge:* Emits `NEAR_MISS` or `VEHICLE_CUT_IN` event with location, TTC, and vehicle class.
  2. **SafeRider Phone Detection:** Raise phone to ear/face in webcam stream or select `PHONE_ONLY` preset.
     - *Verified Bridge:* Emits `PHONE_DISTRACTION` event with rider state telemetry.
  3. **SafeRider Head Slump:** Tilt or slump head forward (`> 15° pitch/roll` for > 1000ms) or select `HEAD_SLUMP` preset.
     - *Verified Bridge:* Emits `DROWSINESS` event with head orientation metadata.
* **Pass Criteria:**
  - Events appear automatically in the **Incident Memory Ledger** with source module tag (`CrashCam` or `SafeRider`).
  - Throttling prevents event flooding (minimum 8-second cooldown per event type).

---

### Test 3: Geospatial Clustering (Haversine Formula)
* **Objective:** Verify that incidents occurring within 250 meters of each other are accurately clustered into the same location hotspot.
* **Execution:**
  1. Ingest Event A at `(28.5355, 77.3910)` (Noida Expressway Flyover).
  2. Ingest Event B at `(28.5362, 77.3915)` (~98 meters distance).
  3. Ingest Event C at `(28.5370, 77.3920)` (~195 meters distance).
  4. Ingest Event D at `(28.6139, 77.2090)` (Connaught Place, ~18 km away).
* **Pass Criteria:**
  - Events A, B, and C cluster into a single spatial hotspot (`<= 250m`).
  - Event D forms an independent spatial entity or isolated record.

---

### Test 4: Deterministic Pattern Discovery Threshold
* **Objective:** Confirm that exactly **3 or more** geometrically/behaviorally correlated incidents trigger pattern creation.
* **Execution:**
  1. Inject 1 Near-Miss at Sector 18. Pattern count remains `0`.
  2. Inject 2nd Near-Miss at Sector 18. Pattern count remains `0`.
  3. Inject 3rd Near-Miss at Sector 18. Pattern count immediately updates to `1`.
* **Pass Criteria:**
  - Pattern is created with type `LOCATION_HOTSPOT` or `PERSONAL_BEHAVIOR`.
  - Pattern card displays incident count (`3`), confidence (`HIGH`), and recurring hazard type (`NEAR_MISS`).

---

### Test 5: Pattern Matching & Proactive Warning Banner
* **Objective:** Verify that when current telemetry matches an active pattern (score >= 60), the proactive alert banner renders with clear explanations.
* **Execution:**
  1. Have 1 discovered pattern (e.g., Evening Expressway Cut-In Hotspot).
  2. Inject or simulate approaching the same coordinates with matching speed/time-of-day.
* **Pass Criteria:**
  - Red pulsing alert banner renders at the top of the panel:
    `🔴 RECURRING RISK PATTERN DETECTED`
  - "WHY AM I SEEING THIS?" breakdown explains:
    - Recurring location identified
    - Previous near-miss count
    - Time-of-day / speed correlation
  - Proactive coaching recommendation is displayed (e.g., "Maintain > 3.0s following distance in outer lane").

---

### Test 6: Strict Demo vs. Real Data Segregation
* **Objective:** Ensure hackathon demo injections do not corrupt the rider's real safety history.
* **Execution:**
  1. In `REAL` mode, ensure real ledger has 0 or few events.
  2. Click `Switch to Judge Demo Mode` or `Demo Preset A`.
  3. System automatically switches to `DEMO` partition (`safedrive_risk_memory_demo_v1`).
  4. Inject demo scenarios (e.g., "Evening Commute Cut-In Hotspot").
  5. Verify demo patterns appear.
  6. Switch back to `REAL` mode.
* **Pass Criteria:**
  - `REAL` mode ledger remains uncorrupted and intact.
  - `Reset Demo Data` purges ONLY demo storage without touching real user records.

---

### Test 7: Camera Loading Overlay Regression Test
* **Objective:** Verify that the persistent "Loading SafeRider Vision Pipeline..." overlay bug is permanently resolved.
* **Execution:**
  1. Navigate to `SafeRider` tab.
  2. Allow webcam or switch presets.
  3. Observe video feed once active.
* **Pass Criteria:**
  - Spinner disappears immediately as soon as camera stream begins or rider is detected.
  - HUD, bounding boxes, and head orientation indicators remain unobstructed.

---

## 3. 60-Second Hackathon Judge Presentation Script

| Time | Action | Visual in UI | Voiceover / Talking Points |
|---|---|---|---|
| **00:00 - 00:12** | Open **SafeRider** tab with webcam running | Live rider camera stream, clean HUD, green detection box, head pitch/yaw gauges | *"Judges, here is SafeRider. We've eliminated camera latency and our real-time YOLO + MediaPipe pipeline tracks helmet compliance, phone usage, and rider head pitch/slump directly on-device in WebAssembly."* |
| **00:12 - 00:25** | Click **Risk Memory** tab in top navigation | Clean Obsidian HUD, Cold Start badge: `🟢 RISK MEMORY INITIALIZING` | *"Every existing ADAS is amnesic—if you almost get hit at the same blind turn every Friday, current systems react with zero prior memory. SafeDrive solves this with the Risk Memory Engine. Notice our Cold Start Guard: no false alarms until a genuine pattern forms."* |
| **00:25 - 00:45** | Click **"Inject Demo A: Expressway Cut-In"** button | Instant 3-incident ledger entry + Red Banner: `🔴 RECURRING RISK PATTERN DETECTED` | *"With one click, we replay an evening commute where this rider faced three near-miss cut-ins at the Noida Expressway Flyover. The engine clusters them within 250 meters, detects the recurring trend, and triggers a proactive pre-warning before the rider even enters the conflict zone."* |
| **00:45 - 00:60** | Expand **"Why Am I Seeing This?"** & show **Hotspots Tab** | Transparent correlation matrix + Spatial Hotspots list with recurrence count | *"Full transparency: the rider sees exactly why this alert triggered—historical frequency, time-of-day, and speed. Real rider data is completely segregated from demo runs, fully private, running 100% locally in the browser with zero cloud dependencies."* |

---

## 4. Verification Checklist

- [x] TypeScript build compiles with 0 errors (`npm run build`).
- [x] Zero external backend required (persistent via partitioned `localStorage`).
- [x] Strict Obsidian HUD color palette compliance (No generic blue/cyan).
- [x] Header navigation tab & PlatformOverview card integrated.
- [x] SafeRider camera loading overlay bug eradicated.
