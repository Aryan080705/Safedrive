import type { SceneCalibration } from '../types';

export class SceneCalibrator {
  private horizonY: number = 0.45;
  private sampleCount: number = 0;
  private lighting: 'DAYLIGHT' | 'OVERCAST' | 'LOW_LIGHT' = 'DAYLIGHT';

  public updateFromDetections(boxes: { x: number; y: number; height: number }[]) {
    if (boxes.length === 0) return;

    // Distant vehicles have small heights (< 0.15). Their tops align near the horizon.
    const distantBoxes = boxes.filter((b) => b.height < 0.20 && b.y > 0.25 && b.y < 0.65);
    if (distantBoxes.length > 0) {
      const avgTop = distantBoxes.reduce((acc, b) => acc + b.y, 0) / distantBoxes.length;
      // Exponential moving average for horizon
      this.horizonY = this.horizonY * 0.90 + avgTop * 0.10;
      this.sampleCount++;
    }
  }

  public estimateLighting(canvas: HTMLCanvasElement | null) {
    if (!canvas) return;
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx || canvas.width === 0 || canvas.height === 0) return;

      // Sample a small 16x16 patch
      const sampleW = 16;
      const sampleH = 16;
      const imgData = ctx.getImageData(0, 0, Math.min(sampleW, canvas.width), Math.min(sampleH, canvas.height));
      const data = imgData.data;

      let totalBrightness = 0;
      for (let i = 0; i < data.length; i += 4) {
        // Luminance formula
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        totalBrightness += 0.299 * r + 0.587 * g + 0.114 * b;
      }

      const avgBrightness = totalBrightness / (data.length / 4);
      if (avgBrightness < 45) {
        this.lighting = 'LOW_LIGHT';
      } else if (avgBrightness < 110) {
        this.lighting = 'OVERCAST';
      } else {
        this.lighting = 'DAYLIGHT';
      }
    } catch {
      // CORS or canvas security fallback
    }
  }

  public getCalibration(): SceneCalibration {
    return {
      estimatedHorizonY: Number(this.horizonY.toFixed(2)),
      lightingCondition: this.lighting,
      laneCorridorWidth: 0.40,
      isCalibrated: this.sampleCount >= 4,
    };
  }

  public reset() {
    this.horizonY = 0.45;
    this.sampleCount = 0;
    this.lighting = 'DAYLIGHT';
  }
}
