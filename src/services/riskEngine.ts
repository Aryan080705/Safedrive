import type { DriverTelemetry, RiskAssessment, RiskFactor, RiskTier } from '../types';

/**
 * Calculates continuous Driver Risk Score (0 - 100) based on real-time
 * computer vision telemetry, sustained duration, and vehicle speed.
 * Clearly labeled as an explainable heuristic safety-assistance indicator.
 */
export class RiskEngine {
  private smoothedScore: number = 8;

  public evaluate(telemetry: DriverTelemetry): RiskAssessment {
    const factors: RiskFactor[] = [];
    let rawScore = 5; // Nominal base road attention baseline

    // 1. Vehicle Speed Multiplier Context
    // At higher speeds, risk exponentially compounds because reaction distance shrinks.
    // At zero speed (stationary/parked), risk is heavily mitigated.
    let speedMultiplier = 1.0;
    if (telemetry.speedKmH <= 5) {
      speedMultiplier = 0.4;
    } else if (telemetry.speedKmH < 50) {
      speedMultiplier = 0.85;
    } else if (telemetry.speedKmH <= 80) {
      speedMultiplier = 1.0;
    } else if (telemetry.speedKmH <= 110) {
      speedMultiplier = 1.2;
    } else {
      speedMultiplier = 1.35;
    }

    // 2. Eye Closure & Sleep Posture Analysis
    if (telemetry.drowsinessState === 'DROWSINESS_CONFIRMED') {
      const pts = 65;
      rawScore += pts;
      factors.push({
        id: 'confirmed-drowsiness',
        label: 'Confirmed Driver Drowsiness / Sleep Posture',
        severity: 'critical',
        points: pts,
        description: telemetry.pitch < -20
          ? `Head slump (${telemetry.pitch}°) with eye closure (Immediate sleep hazard)`
          : `Sustained eye closure for ${(telemetry.eyeClosureDurationMs / 1000).toFixed(1)}s (Micro-sleep hazard)`,
      });
    } else if (telemetry.isEyeClosed && telemetry.eyeClosureDurationMs >= 800) {
      const durationSec = telemetry.eyeClosureDurationMs / 1000;
      if (durationSec >= 2.2) {
        const pts = Math.min(65, Math.round(50 + (durationSec - 2.2) * 15));
        rawScore += pts;
        factors.push({
          id: 'crit-eye-closure',
          label: 'Prolonged Eye Closure',
          severity: 'critical',
          points: pts,
          description: `Eyes closed for ${durationSec.toFixed(1)}s (Micro-sleep hazard)`,
        });
      } else if (durationSec >= 1.2) {
        const pts = Math.min(45, Math.round(28 + (durationSec - 1.2) * 16));
        rawScore += pts;
        factors.push({
          id: 'prolonged-eye-closure',
          label: 'Prolonged Eye Closure',
          severity: 'high',
          points: pts,
          description: `Eyes closed for ${durationSec.toFixed(1)}s (Fatigue escalating)`,
        });
      } else {
        const pts = 14;
        rawScore += pts;
        factors.push({
          id: 'sluggish-blink',
          label: 'Sluggish Eye Blink',
          severity: 'moderate',
          points: pts,
          description: `Slow eyelid reopening (${Math.round(telemetry.eyeClosureDurationMs)}ms)`,
        });
      }
    } else if (telemetry.ear < 0.15 && telemetry.ear > 0 && telemetry.eyeClosureDurationMs >= 600) {
      // Partial drooping / heavy eyelids sustained
      const pts = 10;
      rawScore += pts;
      factors.push({
        id: 'heavy-eyelids',
        label: 'Drooping Eyelids',
        severity: 'low',
        points: pts,
        description: `Sub-optimal EAR (${telemetry.ear.toFixed(2)} vs ~0.28 nominal)`,
      });
    }

    // 3. Yawning / Fatigue Analysis (Temporal sequence confirmed or sustained >= 1.3s)
    const isYawnActive = telemetry.yawnState === 'YAWN_CONFIRMED' || (telemetry.isYawning && telemetry.yawnDurationMs >= 1300);
    if (isYawnActive) {
      const yawnSec = Math.max(1.3, telemetry.yawnDurationMs / 1000);
      const pts = Math.min(25, Math.round(15 + (yawnSec - 1.3) * 8));
      rawScore += pts;
      factors.push({
        id: 'sustained-yawn',
        label: 'Confirmed Sustained Yawn',
        severity: 'moderate',
        points: pts,
        description: `Deep yawn (${telemetry.mar.toFixed(2)} MAR sustained for ${yawnSec.toFixed(1)}s)`,
      });
    }

    // 4. Distraction / Directional Head Pose Analysis
    const isDistractedActive = telemetry.isDistracted && telemetry.distractionDurationMs >= 1200;
    if (isDistractedActive) {
      const distSec = telemetry.distractionDurationMs / 1000;
      const absYaw = Math.abs(telemetry.yaw);
      const isLookingDown = telemetry.headState === 'LOOKING_DOWN' || telemetry.pitch < -20;
      const directionLabel = telemetry.headState === 'LOOKING_LEFT'
        ? 'Left gaze deviation'
        : telemetry.headState === 'LOOKING_RIGHT'
        ? 'Right gaze deviation'
        : isLookingDown
        ? 'Downward gaze (Device/Slump)'
        : 'Off-road head deviation';

      if (distSec >= 2.8) {
        const pts = Math.min(55, Math.round(35 + (distSec - 2.8) * 12));
        rawScore += pts;
        factors.push({
          id: 'severe-distraction',
          label: `Severe ${directionLabel}`,
          severity: 'critical',
          points: pts,
          description: `Off-road orientation for ${distSec.toFixed(1)}s (${isLookingDown ? `Pitch ${telemetry.pitch}°` : `Yaw ${absYaw}°`})`,
        });
      } else if (distSec >= 1.8) {
        const pts = Math.min(30, Math.round(18 + (distSec - 1.8) * 12));
        rawScore += pts;
        factors.push({
          id: 'head-turned',
          label: `Sustained ${directionLabel}`,
          severity: 'high',
          points: pts,
          description: `Driver head oriented off-center for ${distSec.toFixed(1)}s`,
        });
      } else {
        const pts = 10;
        rawScore += pts;
        factors.push({
          id: 'gaze-drift',
          label: `Brief ${directionLabel}`,
          severity: 'low',
          points: pts,
          description: `Off-center gaze orientation (${absYaw.toFixed(0)}° yaw)`,
        });
      }
    }

    // 5. Compound Risk (Concurrent Distraction / Slump + Fatigue)
    if (
      (telemetry.isEyeClosed || telemetry.drowsinessState === 'SUSTAINED_HEAD_DOWN') &&
      telemetry.isDistracted &&
      telemetry.distractionDurationMs >= 1200
    ) {
      const compoundBonus = 22;
      rawScore += compoundBonus;
      factors.push({
        id: 'compound-hazard',
        label: 'Compound Inattention & Fatigue Hazard',
        severity: 'critical',
        points: compoundBonus,
        description: 'Simultaneous fatigue and head displacement detected',
      });
    }

    // 6. Apply Speed Multiplier to Total Risk (except nominal baseline)
    const variableRisk = Math.max(0, rawScore - 5);
    const speedAdjustedScore = 5 + variableRisk * speedMultiplier;

    if (telemetry.speedKmH > 85 && variableRisk > 10) {
      factors.push({
        id: 'speed-amplifier',
        label: `High-Speed Scaling (${telemetry.speedKmH} km/h)`,
        severity: telemetry.speedKmH > 100 ? 'high' : 'moderate',
        points: Math.round(variableRisk * (speedMultiplier - 1.0)),
        description: `${speedMultiplier.toFixed(1)}x risk multiplier applied for highway velocity`,
      });
    }

    // 7. Temporal Smoothing for UI Fluidity (No sudden 0 to 100 flicker)
    const targetScore = Math.min(100, Math.max(5, Math.round(speedAdjustedScore)));
    const smoothing = targetScore > this.smoothedScore ? 0.25 : 0.08;
    this.smoothedScore = this.smoothedScore * (1 - smoothing) + targetScore * smoothing;
    const finalScore = Math.min(100, Math.max(5, Math.round(this.smoothedScore)));

    // 8. Tier & Guidance Determination
    const assessment = this.classifyTier(finalScore, factors);
    return assessment;
  }

  public reset(initialScore: number = 8) {
    this.smoothedScore = initialScore;
  }

  private classifyTier(score: number, factors: RiskFactor[]): RiskAssessment {
    let tier: RiskTier = 'LOW';
    let recommendedAction = 'Normal Driving State';
    let actionSubtitle = 'Driver attention focused on the roadway. Maintain situational awareness.';
    let colorClass = 'text-emerald-400';
    let bgClass = 'bg-emerald-500/10';
    let borderClass = 'border-emerald-500/30';

    if (score >= 85) {
      tier = 'CRITICAL';
      recommendedAction = 'CRITICAL RISK — IMMEDIATE INTERVENTION';
      actionSubtitle = 'Severe fatigue or prolonged distraction detected. Emergency assistance triggered.';
      colorClass = 'text-rose-500';
      bgClass = 'bg-rose-500/15';
      borderClass = 'border-rose-500/50';
    } else if (score >= 65) {
      tier = 'HIGH';
      recommendedAction = 'PLEASE STAY ALERT — CONSIDER REST STOP';
      actionSubtitle = 'Sustained drowsiness or off-road attention detected. Take a break soon.';
      colorClass = 'text-amber-400';
      bgClass = 'bg-amber-500/15';
      borderClass = 'border-amber-500/40';
    } else if (score >= 40) {
      tier = 'MODERATE';
      recommendedAction = 'Gentle Reminder: Refocus on Roadway';
      actionSubtitle = 'Minor indicators of fatigue or glance distraction detected.';
      colorClass = 'text-yellow-300';
      bgClass = 'bg-yellow-500/10';
      borderClass = 'border-yellow-500/30';
    }

    // Default factor if score is low
    if (factors.length === 0) {
      factors.push({
        id: 'attentive',
        label: 'Optimal Road Attention',
        severity: 'low',
        points: 0,
        description: 'Eyes open, forward gaze alignment, nominal blink frequency',
      });
    }

    return {
      score,
      tier,
      factors,
      recommendedAction,
      actionSubtitle,
      colorClass,
      bgClass,
      borderClass,
    };
  }
}
