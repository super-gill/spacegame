import type { Vec2 } from '@spacegame/sim';

/**
 * Camera: maps world units to screen pixels.
 *
 * Follows a target with a little lag so the ship does not sit dead centre
 * while drifting. Zoom is fixed for now.
 */
export class Camera {
  position: Vec2 = { x: 0, y: 0 };
  zoom = 1;
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
