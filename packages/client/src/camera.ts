import type { Vec2 } from '@spacegame/sim';

/**
 * Camera: maps world units to screen pixels.
 *
 * Follows a target with a little lag so the ship does not sit dead centre
 * while drifting. Zoom moves in steps between MIN_ZOOM and MAX_ZOOM and
 * eases towards the step chosen, so it never jumps.
 */

/** Furthest out the view goes: about three times the area of the default. */
export const MIN_ZOOM = 0.55;
/** Closest in. */
export const MAX_ZOOM = 1.5;
/** Each wheel notch or key press multiplies the zoom by this. */
export const ZOOM_STEP = 1.15;

export class Camera {
  position: Vec2 = { x: 0, y: 0 };
  zoom = 1;
  /** The zoom being eased towards. */
  targetZoom = 1;
  viewportWidth = 1;
  viewportHeight = 1;

  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  /** Move towards the target. `smoothing` is the fraction of the gap closed per second. */
  follow(target: Vec2, dtSeconds: number, smoothing = 6): void {
    const t = 1 - Math.exp(-smoothing * dtSeconds);
    this.position = {
      x: this.position.x + (target.x - this.position.x) * t,
      y: this.position.y + (target.y - this.position.y) * t,
    };
  }

  /** Zoom in (`steps` > 0) or out (< 0) by whole steps, within the limits. */
  zoomBy(steps: number): void {
    this.targetZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.targetZoom * Math.pow(ZOOM_STEP, steps)));
  }

  /** Ease the zoom towards its target. */
  easeZoom(dtSeconds: number, smoothing = 10): void {
    const t = 1 - Math.exp(-smoothing * dtSeconds);
    this.zoom += (this.targetZoom - this.zoom) * t;
  }

  snapTo(target: Vec2): void {
    this.position = { ...target };
  }

  worldToScreen(p: Vec2): Vec2 {
    return {
      x: (p.x - this.position.x) * this.zoom + this.viewportWidth / 2,
      y: (p.y - this.position.y) * this.zoom + this.viewportHeight / 2,
    };
  }

  screenToWorld(p: Vec2): Vec2 {
    return {
      x: (p.x - this.viewportWidth / 2) / this.zoom + this.position.x,
      y: (p.y - this.viewportHeight / 2) / this.zoom + this.position.y,
    };
  }
}
