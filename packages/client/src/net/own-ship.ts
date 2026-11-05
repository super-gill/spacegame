import type { Ship, Vec2 } from '@spacegame/sim';

/**
 * Where to draw your own ship (docs/shared-world.md, "Feel").
 *
 * Everything else is drawn about 100 ms in the past so it moves smoothly
 * (timeline.ts). Your own ship is what you are steering, and that delay
 * reads as lag and stutter. So it is drawn from the newest update
 * instead, carried forward by its own speed and spin for the time since
 * that update arrived. When the next update lands, any difference between
 * where we guessed and where the server says is faded out over a moment
 * rather than snapped, so a correction never jumps.
 *
 * This is drawing only: the server still decides where the ship is.
 */

/** Never carry the ship forward more than this, seconds: a stalled connection should not fling it across the screen. */
const MAX_AHEAD_SECONDS = 0.15;
/** How quickly a correction fades, seconds (about two thirds gone in this time). */
const CORRECTION_SECONDS = 0.08;
/** A correction bigger than this, units, is a teleport (boarding, waking, docking): snap. */
const SNAP_DISTANCE = 120;

export interface Pose {
  position: Vec2;
  heading: number;
}

interface Base {
  id: string;
  position: Vec2;
  velocity: Vec2;
  heading: number;
  spin: number;
  atMs: number;
}

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

export class OwnShipView {
  private base: Base | null = null;
  /** The difference still being faded out, and when it started. */
  private correction = { x: 0, y: 0, heading: 0, sinceMs: 0 };

  /** A new update with our ship in it, arriving at `nowMs`. */
  update(ship: Ship, nowMs: number): void {
    const guessed = this.base && this.base.id === ship.id ? this.pose(nowMs) : null;
    this.base = { id: ship.id, position: ship.position, velocity: ship.velocity, heading: ship.heading, spin: ship.angularVelocity, atMs: nowMs };
    if (!guessed || ship.state !== 'flying') {
      this.correction = { x: 0, y: 0, heading: 0, sinceMs: nowMs };
      return;
    }
    const dx = guessed.position.x - ship.position.x;
    const dy = guessed.position.y - ship.position.y;
    this.correction = Math.hypot(dx, dy) > SNAP_DISTANCE ? { x: 0, y: 0, heading: 0, sinceMs: nowMs } : { x: dx, y: dy, heading: wrap(guessed.heading - ship.heading), sinceMs: nowMs };
  }

  /** Forget the ship (gone, or a different one now). */
  clear(): void {
    this.base = null;
  }

  /** Where to draw it at `nowMs`, or null before the first update. */
  pose(nowMs: number): Pose | null {
    const b = this.base;
    if (!b) return null;
    const ahead = Math.min(MAX_AHEAD_SECONDS, Math.max(0, (nowMs - b.atMs) / 1000));
    const fade = Math.exp(-((nowMs - this.correction.sinceMs) / 1000) / CORRECTION_SECONDS);
    return {
      position: {
        x: b.position.x + b.velocity.x * ahead + this.correction.x * fade,
        y: b.position.y + b.velocity.y * ahead + this.correction.y * fade,
      },
      heading: b.heading + b.spin * ahead + this.correction.heading * fade,
    };
  }
}
