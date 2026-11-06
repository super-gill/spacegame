import { angleDelta } from '../angle.js';
import { leadPoint } from '../combat.js';
import { isLocked } from '../locks.js';
import type { Ship, ShipInput, ShipStats, WatchBrain, World, WorldEvent } from '../types.js';
import { bodyPosition } from '../rails.js';
import { add, distance, fromAngle, normalise, scale, sub, toAngle } from '../vec2.js';
import { emptyInput } from '../world.js';
import { arriveVelocity, attackRun, awayFromStation, canAfford, holdLock, mainGun, missileInputs, obstacles, flightOn, routeAround, steerSafely, travelVelocity } from './steer.js';

/**
 * The Calder Watch: the port's own patrol (docs/lore.md, "Who flies in
 * Calder").
 *
 * - patrol: fly to a point just outside the next station's security zone
 *   on the side facing the next station on the beat, hold there a while,
 *   then move on. Look for pirates on its own radar.
 * - engage: lock the pirate (that is how it knows what it is looking at),
 *   launch missiles from range, then close and fight with its fixed guns,
 *   nose on the lead point, as a pilot would. Give up if the pirate gets too far from the beat, out
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
  /** Launch missiles at targets between these ranges, units. */
  missileMinRange: 350,
  missileMaxRange: 2200,
  /** Launch with the nose within this of the target, radians. */
  missileAimTolerance: 0.5,
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
  const pull = flightOn(world, ship, stats);

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
      const lockInput = holdLock(ship, stats, t.id);
      // Attack runs round stations, rocks and bodies, not through them.
      const gunMount = mainGun(stats);
      const gun = gunMount?.[1];
      const aimPoint = gun ? leadPoint(ship, t, gun.projectileSpeed) : t.position;
      const plan = attackRun(world, ship, stats, t, aimPoint, gun ? gun.range * WATCH_TUNING.rangeFraction : 0, b.attack, around);
      b = { ...b, attack: plan.state };
      const input = { ...steerSafely(ship, stats, plan.desired, pull, plan.faceAt), ...lockInput };
      input.toggleWeaponsHot = !ship.weaponsHot;
      // Main guns are turrets: they fire whenever they bear on the lock, so
      // hold the trigger in range rather than waiting for the nose.
      if (gun && isLocked(ship, t.id)) {
        const inRange = distance(ship.position, t.position) <= gun.range * WATCH_TUNING.rangeFraction;
        input.fireFixed = inRange && !bystanderInLine(world, ship, t, gun.range) && canAfford(ship, stats, gun, gunMount![0]);
      }
      // Missiles from further out; they home, so a bystander is less of a worry.
      Object.assign(input, missileInputs(ship, stats, t, WATCH_TUNING.missileMinRange, WATCH_TUNING.missileMaxRange, WATCH_TUNING.missileAimTolerance));
      return { input, brain: b, events };
    }
  }

  // Patrol: look out for pirates.
  if (strongEnough) {
    const pirate = spotPirate(world, ship, stats);
    if (pirate) {
      const { attack: _run, ...fresh } = b;
      b = { ...fresh, mode: 'engage', targetId: pirate.id, modeTicks: 0 };
      return { input: { ...steerSafely(ship, stats, ship.velocity, pull), lock: pirate.id, activateLock: pirate.id }, brain: b, events };
    }
  }

  // Close beside a station (just launched, or swept up by it): get clear
  // first, moving with it, as traders do.
  const crowding = Object.values(world.stations).find((st) => distance(ship.position, st.position) < st.radius + 260);
  if (crowding) {
    return { input: steerSafely(ship, stats, add(crowding.velocity, scale(awayFromStation(world, ship, crowding), 70)), pull), brain: b, events };
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
