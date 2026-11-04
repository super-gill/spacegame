/**
 * Pure helpers for the HUD's instruments: arc paths for gauges, gauge
 * fractions and readouts worked out from the world. No DOM here, so
 * they can be tested on their own.
 */

import type { Ship, Vec2 } from '@spacegame/sim';

/** Clamp to 0..1; anything not a finite number reads as empty. */
export function fraction(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.min(1, Math.max(0, value / max));
}

/**
 * SVG path for an arc of a circle, drawn clockwise on screen.
 *
 * - `startDeg`: where the arc starts, in degrees clockwise from east
 *   (screen right), as SVG measures angles.
 * - `totalDeg`: the arc a full gauge covers.
 * - `f`: how much of it to draw, 0..1.
 *
 * Returns an empty path for an empty gauge, and two half arcs for a
 * full circle.
 */
export function arcPath(cx: number, cy: number, r: number, f: number, startDeg: number, totalDeg: number): string {
  const sweep = Math.min(totalDeg * Math.min(1, Math.max(0, f)), 360);
  if (sweep <= 0) return '';
  if (sweep >= 359.9) {
    // An SVG arc whose ends meet draws nothing, so a full ring is two halves.
    const half = arcPath(cx, cy, r, 1, startDeg, 180);
    const rest = arcPath(cx, cy, r, 1, startDeg + 180, 180);
    return `${half} ${rest}`;
  }
  const a0 = (startDeg * Math.PI) / 180;
  const a1 = ((startDeg + sweep) * Math.PI) / 180;
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const large = sweep > 180 ? 1 : 0;
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
}

/**
 * Closing speed between two ships, units/s: positive while the gap is
 * shrinking, negative while it grows, zero when they touch.
 */
export function closingSpeed(from: Pick<Ship, 'position' | 'velocity'>, to: Pick<Ship, 'position' | 'velocity'>): number {
  const dx = to.position.x - from.position.x;
  const dy = to.position.y - from.position.y;
  const range = Math.hypot(dx, dy);
  if (range === 0) return 0;
  const rvx = to.velocity.x - from.velocity.x;
  const rvy = to.velocity.y - from.velocity.y;
  return -(dx * rvx + dy * rvy) / range;
}

/**
 * How far through its reload a weapon is, 0..1: 0 just fired, 1 ready.
 * `cooldownTicks` is from the weapon's state, `fireInterval` (seconds)
 * from its spec, `dt` the world's tick length.
 */
export function reloadProgress(cooldownTicks: number, fireInterval: number, dt: number): number {
  if (fireInterval <= 0 || cooldownTicks <= 0) return 1;
  return 1 - fraction(cooldownTicks * dt, fireInterval);
}

/**
 * SVG polygon points for a hull outline drawn nose up, scaled to fit a
 * box of `size` units across, centred on 0,0. Hull outlines point along
 * +x (east), so each point turns a quarter left.
 */
export function silhouettePoints(outline: readonly Vec2[], size: number): string {
  if (outline.length === 0) return '';
  let reach = 0;
  for (const p of outline) reach = Math.max(reach, Math.abs(p.x), Math.abs(p.y));
  const scale = reach > 0 ? size / 2 / reach : 1;
  return outline.map((p) => `${(p.y * scale).toFixed(2)},${(-p.x * scale).toFixed(2)}`).join(' ');
}
