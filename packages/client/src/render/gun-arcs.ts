import type { GunBearing } from '@spacegame/sim';
import type { Camera } from '../camera.js';

/**
 * The coverage ring round your own ship (docs/interface.md, "Turret arcs
 * and aim", option B chosen by Jason on 6 November 2026): one ring, like
 * the shield arc, thicker where more of your main guns can bear and
 * missing where none can; a tick on it for where each gun points now,
 * coloured by whether it bears on your lock.
 */

/** An arc a gun can bear through: its mount's facing and width, radians, relative to the nose. */
export interface GunArc {
  facing: number;
  arc: number;
}

/** A stretch of the ring, ship-relative radians from `from` to `to`, and how many guns bear there. */
export interface CoverageSegment {
  from: number;
  to: number;
  count: number;
}

/** The ring is worked out in steps this wide, radians (4 degrees): fine enough to look smooth. */
const STEP = (4 * Math.PI) / 180;

/**
 * Stretches of the ring with how many of `arcs` cover each, measured from
 * the ship's centre (a mount's offset from the centre is small next to a
 * gun's range). Neighbouring steps with the same count are merged; steps
 * no gun covers are left out, so the gaps are the blind spots.
 */
export function coverage(arcs: readonly GunArc[]): CoverageSegment[] {
  const out: CoverageSegment[] = [];
  const steps = Math.round((Math.PI * 2) / STEP);
  for (let i = 0; i < steps; i++) {
    const from = -Math.PI + i * STEP;
    const mid = from + STEP / 2;
    const count = arcs.filter((a) => covers(a, mid)).length;
    if (count === 0) continue;
    const last = out[out.length - 1];
    if (last && last.count === count && Math.abs(last.to - from) < 1e-9) last.to = from + STEP;
    else out.push({ from, to: from + STEP, count });
  }
  // Join the stretch that runs over the stern (the end of the circle) to the one that starts there.
  const first = out[0];
  const last = out[out.length - 1];
  if (out.length > 1 && first && last && first.count === last.count && Math.abs(first.from + Math.PI) < 1e-9 && Math.abs(last.to - Math.PI) < 1e-9) {
    out.pop();
    first.from = last.from - Math.PI * 2;
  }
  return out;
}

function covers(a: GunArc, bearing: number): boolean {
  if (a.arc >= Math.PI * 2 - 1e-9) return true;
  const off = Math.atan2(Math.sin(bearing - a.facing), Math.cos(bearing - a.facing));
  return Math.abs(off) <= a.arc / 2;
}

/** Where a gun points now (a world bearing) and how it stands against your lock. */
export interface GunTick {
  aim: number;
  bearing: GunBearing;
}

/** Tick colours: bright when it bears, amber while it slews, dim otherwise. */
const TICK_INK: Record<GunBearing, string> = {
  bears: '#dffbf3',
  slewing: '#e0a458',
  outOfRange: '#9fd3c7',
  outOfArc: '#6a988f',
  noLock: '#6a988f',
};

const RING_INK = '#9fd3c7';
/** The ring sits this many pixels outside the shield arc. */
const RING_GAP = 12;
/** And never closer than this to the ship's centre, pixels, so a small ship's ring stays readable when zoomed out. */
const RING_MIN = 34;

/**
 * Draw the ring round the ship at `at` (world), facing `heading`.
 * `hullRadius` places it just outside the shield arc.
 */
export function drawGunArcs(ctx: CanvasRenderingContext2D, camera: Camera, at: { x: number; y: number }, heading: number, hullRadius: number, segments: readonly CoverageSegment[], ticks: readonly GunTick[]): void {
  if (segments.length === 0 && ticks.length === 0) return;
  const c = camera.worldToScreen(at);
  const r = Math.max(RING_MIN, (hullRadius + 7) * camera.zoom + RING_GAP);
  ctx.save();
  ctx.strokeStyle = RING_INK;
  for (const s of segments) {
    ctx.globalAlpha = Math.min(0.75, 0.15 + s.count * 0.1);
    ctx.lineWidth = Math.min(4, 0.6 + s.count * 0.6);
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, heading + s.from, heading + s.to);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2;
  for (const t of ticks) {
    ctx.strokeStyle = TICK_INK[t.bearing];
    ctx.beginPath();
    ctx.moveTo(c.x + Math.cos(t.aim) * (r - 6), c.y + Math.sin(t.aim) * (r - 6));
    ctx.lineTo(c.x + Math.cos(t.aim) * (r + 6), c.y + Math.sin(t.aim) * (r + 6));
    ctx.stroke();
  }
  ctx.restore();
}
