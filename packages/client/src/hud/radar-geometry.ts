/**
 * Pure maths for the radar disc: where a contact sits on the disc, and
 * which contact a click on the disc means. North up: the disc uses the
 * same axes as the screen (world +x right, +y down), so nothing rotates
 * but your own ship's marker.
 */

import type { Vec2 } from '@spacegame/sim';

/** A point placed on the disc, in pixels from its centre. */
export interface RadarPoint {
  x: number;
  y: number;
  /** True when the contact is beyond the disc's range and pinned to its rim. */
  onRim: boolean;
}

/**
 * Place a world point on a disc of `radiusPx` pixels that shows `range`
 * world units round `centre`. Points beyond the range are pinned to the
 * rim along their bearing.
 */
export function radarPoint(centre: Vec2, point: Vec2, range: number, radiusPx: number): RadarPoint {
  const dx = point.x - centre.x;
  const dy = point.y - centre.y;
  const d = Math.hypot(dx, dy);
  if (range <= 0) return { x: 0, y: 0, onRim: true };
  if (d <= range) {
    const k = radiusPx / range;
    return { x: dx * k, y: dy * k, onRim: false };
  }
  return { x: (dx / d) * radiusPx, y: (dy / d) * radiusPx, onRim: true };
}

/** Whether a ship at this distance shows on the radar at all: only within sensor range, and never with no radar. */
export function radarShows(distance: number, sensorRange: number): boolean {
  return sensorRange > 0 && distance <= sensorRange;
}

/** A clickable contact on the disc. */
export interface RadarHit {
  id: string;
  x: number;
  y: number;
}

/** The contact nearest a click, within `slopPx`, or null. */
export function pickContact(hits: readonly RadarHit[], at: Vec2, slopPx: number): string | null {
  let best: string | null = null;
  let bestD = slopPx;
  for (const h of hits) {
    const d = Math.hypot(h.x - at.x, h.y - at.y);
    if (d <= bestD) {
      best = h.id;
      bestD = d;
    }
  }
  return best;
}

/** Range ring spacing for a disc: about three rings, on round numbers. */
export function ringStep(range: number): number {
  if (range <= 0) return 0;
  const rough = range / 3;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * mag >= rough) return m * mag;
  return 10 * mag;
}
