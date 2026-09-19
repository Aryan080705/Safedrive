import type { BoundingBox, EgoCorridorConfidence, EgoCorridorGeometry, EgoCorridorStatus } from '../types';

export class EgoLaneEstimator {
  private horizonY: number = 0.45;
  private centerX: number = 0.50;
  private topCorridorHalfWidth: number = 0.08;
  private bottomCorridorHalfWidth: number = 0.28;
  private confidence: EgoCorridorConfidence = 'MEDIUM';
  private alignedObservations: number = 0;

  public setHorizonY(horizonY: number) {
    this.horizonY = Math.max(0.35, Math.min(0.58, horizonY));
  }

  public updateFromTracks(boxes: BoundingBox[]) {
    // Vehicles driving ahead align in vertical corridor
    const centeredVehicles = boxes.filter(
      (b) => Math.abs(b.x + b.width / 2 - this.centerX) < 0.22 && b.y > this.horizonY
    );

    if (centeredVehicles.length > 0) {
      this.alignedObservations++;
      if (this.alignedObservations >= 5) {
        this.confidence = 'HIGH';
      }
    } else if (this.alignedObservations > 0) {
      this.alignedObservations = Math.max(0, this.alignedObservations - 1);
      if (this.alignedObservations < 2) {
        this.confidence = 'LOW';
      }
    }
  }

  public getCorridorHalfWidthAtY(y: number): number {
    const clampedY = Math.max(this.horizonY, Math.min(1.0, y));
    const progress = (clampedY - this.horizonY) / (1.0 - this.horizonY);
    return this.topCorridorHalfWidth + (this.bottomCorridorHalfWidth - this.topCorridorHalfWidth) * progress;
  }

  public getCorridorBoundsAtY(y: number): { leftX: number; rightX: number } {
    const halfWidth = this.getCorridorHalfWidthAtY(y);
    return {
      leftX: Math.max(0, this.centerX - halfWidth),
      rightX: Math.min(1, this.centerX + halfWidth),
    };
  }

  public isPointInside(x: number, y: number): boolean {
    const { leftX, rightX } = this.getCorridorBoundsAtY(y);
    return x >= leftX && x <= rightX;
  }

  public evaluateObjectCorridorStatus(box: BoundingBox): EgoCorridorStatus {
    const bottomCenterX = box.x + box.width / 2;
    const bottomY = box.y + box.height;

    const { leftX, rightX } = this.getCorridorBoundsAtY(bottomY);
    const boxLeft = box.x;
    const boxRight = box.x + box.width;

    // Inside corridor
    if (bottomCenterX >= leftX && bottomCenterX <= rightX) {
      return 'INSIDE_CORRIDOR';
    }

    // Overlapping / entering corridor edge
    if ((boxLeft < rightX && boxRight > leftX) || (boxRight > leftX && boxLeft < rightX)) {
      return 'ENTERING_CORRIDOR';
    }

    // In adjacent lane margin
    const margin = 0.15;
    if (bottomCenterX >= leftX - margin && bottomCenterX <= rightX + margin) {
      return 'ADJACENT_LANE';
    }

    return 'OUTSIDE_CORRIDOR';
  }

  public getGeometry(): EgoCorridorGeometry {
    return {
      horizonY: this.horizonY,
      topLeftX: this.centerX - this.topCorridorHalfWidth,
      topRightX: this.centerX + this.topCorridorHalfWidth,
      bottomLeftX: this.centerX - this.bottomCorridorHalfWidth,
      bottomRightX: this.centerX + this.bottomCorridorHalfWidth,
      confidence: this.confidence,
    };
  }

  public reset() {
    this.horizonY = 0.45;
    this.confidence = 'MEDIUM';
    this.alignedObservations = 0;
  }
}
