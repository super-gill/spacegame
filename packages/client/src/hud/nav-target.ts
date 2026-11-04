/**
 * The nav target: one station or body you are flying to, chosen in the
 * contacts list (or on the radar) and set with N. Client state only: the
 * sim knows nothing of it. New pilots, and pilots waking, get Harbour.
 *
 * Pure helpers here (tested); drawing is in render/draw.ts and the
 * readouts in flight-hud.ts.
 */

import type { Ship, Vec2, World } from '@spacegame/sim';
import { HARBOUR_ID, bodyState, railTime } from '@spacegame/sim';

/** Something on the charts you can fly to. */
export interface NavTarget {
  kind: 'station' | 'body';
  id: string;
}

/** The station new and waking pilots fly to first. */
export const DEFAULT_NAV: NavTarget = { kind: 'station', id: HARBOUR_ID };

/** Where the nav target is and how you are closing on it. */
export interface NavFix {
  name: string;
  position: Vec2;
  /** World units to its centre. */
  distance: number;
  /** World units to its surface or hull: what you actually fly. */
  clearance: number;
  /** Its own radius, for drawing round it. */
  radius: number;
  /** How fast you are closing on it, u/s; negative when opening. */
  closing: number;
  /** Seconds to arrive at the closing speed, or null when not closing. */
  eta: number | null;
}

/** Below this closing speed there is no meaningful arrival time. */
const MIN_CLOSING = 1;

/** Where a nav target is now, and how fast it moves; null if it no longer exists. */
export function navTargetState(world: World, target: NavTarget): { name: string; position: Vec2; velocity: Vec2; radius: number } | null {
  if (target.kind === 'station') {
    const s = world.stations[target.id];
    return s ? { name: s.name, position: s.position, velocity: s.velocity, radius: s.radius } : null;
  }
  const b = world.bodies[target.id];
  if (!b) return null;
  const state = bodyState(world.bodies, b.id, railTime(world.tick, world.dt));
  return { name: b.name, position: state.position, velocity: state.velocity, radius: b.radius };
}

/** Distance, closing speed and arrival time from your ship to the nav target. */
export function navFix(world: World, ship: Pick<Ship, 'position' | 'velocity'>, target: NavTarget): NavFix | null {
  const t = navTargetState(world, target);
  if (!t) return null;
  const dx = t.position.x - ship.position.x;
  const dy = t.position.y - ship.position.y;
  const distance = Math.hypot(dx, dy);
  const clearance = Math.max(0, distance - t.radius);
  const rvx = ship.velocity.x - t.velocity.x;
  const rvy = ship.velocity.y - t.velocity.y;
  const closing = distance > 0 ? (rvx * dx + rvy * dy) / distance : 0;
  const eta = closing >= MIN_CLOSING ? clearance / closing : null;
  return { name: t.name, position: t.position, distance, clearance, radius: t.radius, closing, eta };
}

/** A distance for the HUD: `850 u`, `2.4k u`, `18k u`. */
export function formatDistance(d: number): string {
  if (d < 1000) return `${Math.round(d)} u`;
  if (d < 10000) return `${(Math.round(d / 100) / 10).toFixed(1)}k u`;
  return `${Math.round(d / 1000)}k u`;
}

/** An arrival time: `0:42`, `12:05`, `1 h+`, or `-` when not closing. */
export function formatEta(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '-';
  if (seconds >= 3600) return '1 h+';
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Same target? */
export function sameTarget(a: NavTarget | null, b: NavTarget | null): boolean {
  return a !== null && b !== null && a.kind === b.kind && a.id === b.id;
}
