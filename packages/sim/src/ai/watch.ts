import { angleDelta } from '../angle.js';
import { leadPoint } from '../combat.js';
import { isLocked } from '../locks.js';
import type { Ship, ShipInput, ShipStats, WatchBrain, World, WorldEvent } from '../types.js';
import { bodyPosition } from '../rails.js';
import { add, distance, fromAngle, normalise, scale, sub, toAngle } from '../vec2.js';
import { emptyInput } from '../world.js';
import { arriveVelocity, obstacles, pullOn, routeAround, steerSafely, travelVelocity } from './steer.js';

/**
 * The Calder Watch: the port's own patrol (docs/lore.md, "Who flies in
 * Calder").
 *
 * - patrol: fly to a point just outside the next station's security zone
 *   on the side facing the next station on the beat, hold there a while,
 *   then move on. Look for pirates on its own radar.
 * - engage: lock the pirate (that is how it knows what it is looking at),
 *   then close and fight with its fixed guns, nose on the lead point, as
 *   a pilot would. Give up if the pirate gets too far from the beat, out
 *   of radar range, or is gone; break off when badly hurt.
 *
 * It is an ordinary ship flown by ordinary rules: it can lose. It does not
 * touch pilots until law arrives (milestone 7).
 */

export const WATCH_TUNING = {
  /** Seconds on the pad before setting out. */
  launchSeconds: 10,
  /** How far outside a security zone's edge the beat points sit, units. */
  beatStandoff: 300,
  /** Seconds held at each beat point. */
  holdSeconds: 12,
  /** Beat point counts as reached within this, units. */
  pointReached: 150,
  /** Engage pirates only within this distance of the nearest station, units: the Watch works near the stations and the lanes between. */
  leash: 3500,
  /** Distance held off the pirate while fighting, units. */
  standoff: 220,
  /** Cruise as a fraction of top speed on patrol. */
  cruiseFraction: 0.6,
  /** Fire when the nose is within this of the lead point, radians. */
  aimTolerance: 0.05,
  /** Fire within this fraction of weapon range. */
  rangeFraction: 0.9,
  /** Room kept round bystanders when deciding whether to fire, units. */
  lineOfFireMargin: 40,
  /** Break off below this fraction of structure. */
  breakOffFraction: 0.3,
};

export interface WatchThought {
  input: ShipInput;
  brain: WatchBrain;
  events: WorldEvent[];
}

/**
 * True if a ship other than the target, and not a pirate, is near the line
 * of fire: the Watch holds fire rather than hit traffic.
 */
function bystanderInLine(world: World, ship: Ship, target: Ship, range: number): boolean {
  const dir = fromAngle(ship.heading);
  for (const other of Object.values(world.ships)) {
    if (other.id === ship.id || other.id === target.id || other.state !== 'flying') continue;
    if (world.npcs[other.id]?.kind === 'pirate') continue;
    const rel = sub(other.position, ship.position);
    const along = rel.x * dir.x + rel.y * dir.y;
    if (along <= 0 || along > range) continue;
    const off = Math.abs(rel.x * dir.y - rel.y * dir.x);
    if (off < (world.hulls[other.hullId]?.radius ?? 20) + WATCH_TUNING.lineOfFireMargin) return true;
  }
  return false;
}

/** Distance from `point` to the nearest station. */
function nearestStation(world: World, point: { x: number; y: number }): number {
  let best = Infinity;
  for (const s of Object.values(world.stations)) best = Math.min(best, distance(point, s.position));
  return best;
}

/** The nearest pirate its radar shows, inside the leash, or null. */
function spotPirate(world: World, ship: Ship, stats: ShipStats): Ship | null {
  let best: Ship | null = null;
  let bestDist = Infinity;
  for (const [id, brain] of Object.entries(world.npcs)) {
    if (brain.kind !== 'pirate') continue;
    const p = world.ships[id];
    if (!p || p.state !== 'flying') continue;
    const d = distance(ship.position, p.position);
    if (d > stats.sensorRange || nearestStation(world, p.position) > WATCH_TUNING.leash) continue;
    if (d < bestDist || (d === bestDist && best && id < best.id)) {
      best = p;
      bestDist = d;
    }
  }
  return best;
}

export function thinkWatch(world: World, ship: Ship, stats: ShipStats, brain: WatchBrain): WatchThought {
  const events: WorldEvent[] = [];
  let b: WatchBrain = { ...brain, modeTicks: brain.modeTicks + 1 };
  const around = obstacles(world, stats);
  const pull = pullOn(world, ship);

  // Docked: a short wait on the pad, then out to start the beat.
  if (ship.state === 'docked') {
    if (b.modeTicks * world.dt < WATCH_TUNING.launchSeconds) return { input: emptyInput(), brain: b, events };
    return { input: { ...emptyInput(), toggleDock: true }, brain: { ...b, mode: 'patrol', modeTicks: 0 }, events };
  }

  const strongEnough = ship.structure >= stats.structure * WATCH_TUNING.breakOffFraction;

  if (b.mode === 'engage') {
    const target = b.targetId ? world.ships[b.targetId] : undefined;
    const lost =
      !target ||
      target.state !== 'flying' ||
      !strongEnough ||
      distance(ship.position, target.position) > stats.sensorRange ||
      nearestStation(world, target.position) > WATCH_TUNING.leash;
    if (lost) {
      b = { ...b, mode: 'patrol', targetId: null, modeTicks: 0 };
    } else {
      const t = target!;
      // Lock first: until the lock completes it does not know enough to shoot.
      const lockInput: Partial<ShipInput> = {};
      if (!ship.locks.some((l) => l.targetId === t.id)) {
        const stray = ship.locks.find((l) => l.targetId !== t.id);
        if (stray && ship.locks.length >= stats.maxLocks) lockInput.unlock = stray.targetId;
        else lockInput.lock = t.id;
      } else if (ship.activeLock !== t.id) {
        lockInput.activateLock = t.id;
      }
      const back = normalise(sub(ship.position, t.position));
      const hold = add(t.position, scale(back, WATCH_TUNING.standoff));
      const desired = add(t.velocity, arriveVelocity(ship, stats, hold, stats.maxSpeed));
      const gun = Object.values(stats.weapons).find((w) => w.kind === 'fixed');
      const aimPoint = gun ? leadPoint(ship, t, gun.projectileSpeed) : t.position;
      const input = { ...steerSafely(ship, stats, desired, pull, aimPoint), ...lockInput };
      input.toggleWeaponsHot = !ship.weaponsHot;
      if (gun && isLocked(ship, t.id)) {
        const aimError = Math.abs(angleDelta(ship.heading, toAngle(sub(aimPoint, ship.position))));
        const inRange = distance(ship.position, t.position) <= gun.range * WATCH_TUNING.rangeFraction;
        input.fireFixed = aimError <= WATCH_TUNING.aimTolerance && inRange && !bystanderInLine(world, ship, t, gun.range);
      }
      return { input, brain: b, events };
    }
  }

  // Patrol: look out for pirates.
  if (strongEnough) {
    const pirate = spotPirate(world, ship, stats);
    if (pirate) {
      b = { ...b, mode: 'engage', targetId: pirate.id, modeTicks: 0 };
      return { input: { ...steerSafely(ship, stats, ship.velocity, pull), lock: pirate.id, activateLock: pirate.id }, brain: b, events };
    }
  }

  // Drop any locks left from a fight, and go cold.
  const tidy: Partial<ShipInput> = {};
  if (ship.locks.length > 0) tidy.unlock = ship.locks[0]!.targetId;
  if (ship.weaponsHot) tidy.toggleWeaponsHot = true;

  const here = world.stations[b.beat[b.leg % b.beat.length] ?? ''];
  const next = world.stations[b.beat[(b.leg + 1) % b.beat.length] ?? ''];
  if (!here) return { input: { ...emptyInput(), ...tidy }, brain: b, events };
  // Off a station orbiting a planet or moon, the beat point is on the far
  // side from the body (never inside it); otherwise it faces the next stop.
  const parentId = here.orbit?.parent;
  const parent = parentId ? world.bodies[parentId] : undefined;
  const towards =
    parent && parent.radius > 0
      ? normalise(sub(here.position, bodyPosition(world, parentId!)))
      : next && next.id !== here.id
        ? normalise(sub(next.position, here.position))
        : { x: 1, y: 0 };
  const point = add(here.position, scale(towards, here.securityRadius + WATCH_TUNING.beatStandoff));

  if (distance(ship.position, point) <= WATCH_TUNING.pointReached) {
    // Hold station here, moving with the station's frame, then move on.
    if (b.modeTicks * world.dt >= WATCH_TUNING.holdSeconds) b = { ...b, leg: (b.leg + 1) % b.beat.length, modeTicks: 0 };
    const desired = add(here.velocity, arriveVelocity(ship, stats, point, stats.maxSpeed * WATCH_TUNING.cruiseFraction));
    return { input: { ...steerSafely(ship, stats, desired, pull), ...tidy }, brain: b, events };
  }
  const waypoint = routeAround(ship, stats, point, around);
  const desired = add(here.velocity, travelVelocity(ship, stats, waypoint, point, stats.maxSpeed * WATCH_TUNING.cruiseFraction));
  // The hold clock only runs once at the point.
  return { input: { ...steerSafely(ship, stats, desired, pull), ...tidy }, brain: { ...b, modeTicks: 0 }, events };
}
