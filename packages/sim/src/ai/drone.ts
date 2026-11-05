import { rockAt, rockSeam } from '../asteroids.js';
import { isLocked } from '../locks.js';
import type { DroneBrain, Ship, ShipInput, ShipStats, World } from '../types.js';
import { add, distance, fromAngle, scale, sub, toAngle, type Vec2 } from '../vec2.js';
import { angleDelta } from '../angle.js';
import { emptyInput } from '../world.js';
import { asteroidPositions } from '../asteroids.js';
import { arriveVelocity, flightOn, steerSafely, travelVelocity, type Obstacle } from './steer.js';
import { clear, findPath, type Circle } from './path.js';

/**
 * Mining drones (docs/drones.md). A drone flies itself; its mother ship
 * only commands it. It works the rocks the mother has locked that its
 * laser can cut: the one it
 * was sent to while that stays locked, else a locked rock nobody else is
 * on (no turret, no other drone), else the least crowded; once on a rock
 * it stays unless another is emptier. It parks off
 * the rock's seam side, faces it and cuts. It has no hold: the ore it
 * frees waits by the rock for the mother's tractor. With nothing locked
 * it comes back and waits beside the mother; recalled, or out of the
 * bay's range, it comes home to be stowed.
 */

export const DRONE_TUNING = {
  /** Gap kept between a drone and the rock face it cuts, units. */
  standoff: 40,
  /** Close enough to its spot to start cutting, units. */
  onSpot: 20,
  /** Facing the rock within this, radians, before the laser runs. */
  aimTolerance: 0.12,
  /** Cruising speed as a share of the drone's top speed. */
  cruise: 0.4,
  /** Where an idle drone waits: this far beyond the mother's hull, units. */
  waitGap: 40,
};

export interface DroneThought {
  input: ShipInput;
  brain: DroneBrain;
}

/**
 * `decided` holds the brains other NPCs have already been given this tick
 * (drones think in id order), so drones of one mother share rocks out
 * without all rushing the same one.
 */
export function thinkDrone(world: World, ship: Ship, stats: ShipStats, brain: DroneBrain, decided: World['npcs'] = {}): DroneThought {
  const mother = world.ships[brain.motherId];
  if (!mother || mother.state !== 'flying') return { input: emptyInput(), brain };
  const motherStats = world.hulls[mother.hullId] ? { radius: world.hulls[mother.hullId]!.radius } : { radius: 20 };
  const range = droneRangeOf(world, mother);
  const flight = flightOn(world, ship);
  const cruise = stats.maxSpeed * DRONE_TUNING.cruise;

  // Too far from home: come back, whatever it was doing.
  let mode = brain.mode;
  if (mode === 'work' && distance(ship.position, mother.position) > range) mode = 'return';

  // Rocks near the drone, for planning; ships close by, for steering clear.
  const rocks: Circle[] = asteroidPositions(world)
    .filter((r) => distance(r.position, ship.position) < 900)
    .map((r) => ({ position: r.position, radius: r.radius }));
  const hull: Circle = { position: mother.position, radius: motherStats.radius };
  const around: Obstacle[] = rocks.filter((r) => distance(r.position, ship.position) < 300);
  for (const other of Object.values(world.ships)) {
    if (other.id === ship.id || other.state !== 'flying' || distance(other.position, ship.position) > 300) continue;
    around.push({ position: other.position, radius: world.hulls[other.hullId]?.radius ?? 10 });
  }
  const clearance = stats.radius + CLEAR_MARGIN;

  /**
   * Fly to `spot` (moving with `frame`) along a planned path round the
   * rocks (and the mother's hull, unless `spot` is the mother), replanned
   * every second or when the spot moves. Returns the velocity wanted and
   * the brain's path state.
   */
  const head = (spot: Vec2, frame: Vec2, avoidHull: boolean): { velocity: Vec2; plan: Pick<DroneBrain, 'path' | 'goal' | 'planTick'> } => {
    const obstacles = avoidHull ? [...rocks, hull] : rocks;
    const stale = !brain.path || !brain.goal || brain.planTick === undefined || world.tick - brain.planTick >= REPLAN_TICKS || distance(brain.goal, spot) > 25;
    let path = stale ? (findPath(ship.position, spot, obstacles, clearance) ?? [spot]) : brain.path!;
    const planTick = stale ? world.tick : brain.planTick!;
    // Drop waypoints reached, and any the drone can already see past.
    while (path.length > 1 && (distance(ship.position, path[0]!) < WAYPOINT_REACHED || clear(ship.position, path[1]!, obstacles, clearance))) path = path.slice(1);
    const next = path[0]!;
    // Slow among rocks: a drone burns only forwards, so it needs room to turn and stop.
    const gap = Math.min(Infinity, ...obstacles.map((o) => distance(ship.position, o.position) - o.radius - stats.radius));
    const careful = Math.min(cruise, Math.max(CLUTTER_MIN_SPEED, gap * CLUTTER_SPEED_PER_UNIT));
    const wanted = path.length === 1 ? arriveVelocity(ship, stats, next, careful) : travelVelocity(ship, stats, next, spot, careful);
    return { velocity: add(frame, keepClear(ship, stats.radius, wanted, around)), plan: { path, goal: spot, planTick } };
  };

  if (mode === 'return') {
    const { velocity, plan } = head(mother.position, mother.velocity, false);
    return { input: steerSafely(ship, stats, velocity, flight), brain: { ...brain, ...plan, mode, rockId: null } };
  }

  // Choose a rock: the one it was sent to, else a free locked one.
  // Only rocks its laser can cut.
  const strength = Math.max(0, ...Object.values(stats.weapons).map((w) => w.mining?.strength ?? 0));
  const cuttable = (id: string): boolean => (rockAt(world, id)?.rock.hardness ?? Infinity) <= strength;
  const sent = brain.sentRockId && isLocked(mother, brain.sentRockId) && cuttable(brain.sentRockId) ? brain.sentRockId : null;
  const rockId = sent ?? pickRock(world, mother, ship.id, brain.rockId, decided, cuttable);
  const next: DroneBrain = { ...brain, mode, rockId, sentRockId: sent };
  const rock = rockId ? rockAt(world, rockId) : null;

  if (!rock || distance(rock.position, mother.position) > range) {
    // Nothing to do: wait beside the mother.
    const side = fromAngle(mother.heading + Math.PI / 2 + (hashSide(ship.id) ? Math.PI : 0));
    const spot = add(mother.position, scale(side, motherStats.radius + DRONE_TUNING.waitGap));
    const { velocity, plan } = head(spot, mother.velocity, true);
    return { input: steerSafely(ship, stats, velocity, flight), brain: { ...next, ...plan, rockId: null } };
  }

  // Park on the rock's near side (where its ore drifts to the mother's
  // tractor), on the seam if the seam is on that side, face it, cut.
  // Drones sharing a rock spread along its face.
  const slot = slotOn(world, decided, ship.id, mother.id, rock.rock.id);
  const homeward = toAngle(sub(mother.position, rock.position));
  const seamAngle = rockSeam(rock.rock.id);
  const base = Math.abs(angleDelta(homeward, seamAngle)) <= Math.PI / 2 ? seamAngle : homeward;
  // Not a spot wedged against another rock or the mother: step round the face until clear.
  const reach = rock.rock.radius + DRONE_TUNING.standoff + stats.radius;
  const others = [...rocks.filter((r) => distance(r.position, rock.position) > 1), hull];
  const first = base + SLOT_OFFSETS[slot % SLOT_OFFSETS.length]!;
  let spot = add(rock.position, scale(fromAngle(first), reach));
  for (let k = 0; k < SPOT_TRIES; k++) {
    const angle = first + (k % 2 === 0 ? 1 : -1) * Math.ceil(k / 2) * SPOT_STEP;
    const candidate = add(rock.position, scale(fromAngle(angle), reach));
    if (others.every((o) => distance(candidate, o.position) >= o.radius + clearance + 4)) {
      spot = candidate;
      break;
    }
  }
  const { velocity: desired, plan } = head(spot, rock.velocity, true);
  // Face the rock only once nearly there: with forward thrust only, a drone flies where it points.
  const near = distance(ship.position, spot) <= DRONE_TUNING.onSpot * 3;
  const input = steerSafely(ship, stats, desired, flight, near ? rock.position : undefined);
  const facing = Math.abs(angleDelta(ship.heading, toAngle(sub(rock.position, ship.position)))) <= DRONE_TUNING.aimTolerance;
  const there = distance(ship.position, spot) <= DRONE_TUNING.onSpot;
  return { input: { ...input, fireFixed: facing && there }, brain: { ...next, ...plan } };
}

/** Among rocks a drone flies no faster than this many units a second per unit of room, nor slower than the minimum. */
const CLUTTER_SPEED_PER_UNIT = 0.9;
const CLUTTER_MIN_SPEED = 20;
/** Replan a drone's path this often, ticks (a second). */
const REPLAN_TICKS = 60;
/** A waypoint this close counts as reached, units. */
const WAYPOINT_REACHED = 18;
/** Looking for a clear cutting spot: this many steps round the rock's face, this far apart, radians. */
const SPOT_TRIES = 12;
const SPOT_STEP = 0.3;

/** Within this many units of clearance, a drone is pushed off an obstacle. */
const CLEAR_MARGIN = 22;
/** How hard, units/s at contact, falling to nothing at the margin. */
const CLEAR_PUSH = 90;

/**
 * The velocity a drone wants, bent round whatever it is about to touch:
 * near an obstacle, the part of `wanted` heading into it is turned to
 * slide along its edge instead (so a drone works its way round the
 * mother's hull rather than stalling against it), and a push moves it
 * off the edge.
 */
function keepClear(ship: Ship, radius: number, wanted: Vec2, around: readonly Obstacle[]): Vec2 {
  let v = wanted;
  for (const o of around) {
    const gap = distance(ship.position, o.position) - o.radius - radius;
    if (gap >= CLEAR_MARGIN) continue;
    const away = fromAngle(toAngle(sub(ship.position, o.position)));
    const into = v.x * away.x + v.y * away.y;
    if (into < 0) {
      // Slide: drop the inward part and spend it along the edge, on the side it was already leaning.
      const edge = { x: -away.y, y: away.x };
      const lean = v.x * edge.x + v.y * edge.y >= 0 ? 1 : -1;
      v = add(sub(v, scale(away, into)), scale(edge, -into * lean));
    }
    v = add(v, scale(away, CLEAR_PUSH * (1 - Math.max(0, gap) / CLEAR_MARGIN)));
  }
  return v;
}

/** How far the mother's drones will work from it: its bay's range. */
export function droneRangeOf(world: World, mother: Ship): number {
  let range = 0;
  for (const moduleId of Object.values(mother.fit)) range = Math.max(range, world.modules[moduleId]?.stats.droneRange ?? 0);
  return range;
}

/**
 * A rock for a drone working on its own: among the mother's locked rocks,
 * one no turret and no other drone is on, in lock order; failing that,
 * the one with the fewest drones on it. It keeps its current rock if that
 * is still locked and no busier than the alternatives.
 */
function pickRock(world: World, mother: Ship, droneShipId: string, current: string | null, decided: World['npcs'], cuttable: (id: string) => boolean): string | null {
  const rocks = mother.locks.filter((l) => l.progress >= 1 && rockAt(world, l.targetId) && cuttable(l.targetId)).map((l) => l.targetId);
  if (rocks.length === 0) return null;
  const load = new Map<string, number>(rocks.map((r) => [r, 0]));
  for (const w of mother.weapons) if (w.lockTarget && load.has(w.lockTarget)) load.set(w.lockTarget, load.get(w.lockTarget)! + 1);
  for (const id of Object.keys(world.npcs)) {
    // A drone that has already thought this tick counts where it is now going.
    const brain = decided[id] ?? world.npcs[id]!;
    if (id === droneShipId || brain.kind !== 'drone' || brain.motherId !== mother.id || !brain.rockId) continue;
    if (load.has(brain.rockId)) load.set(brain.rockId, load.get(brain.rockId)! + 1);
  }
  const least = Math.min(...load.values());
  // Stay put unless another rock is emptier. Drones decide one after another, so they settle rather than swap back and forth.
  if (current && load.has(current) && load.get(current)! <= least) return current;
  return rocks.find((r) => load.get(r) === least) ?? null;
}

/** Where along a rock's face drones sharing it sit, radians from the seam: the first two on it. */
const SLOT_OFFSETS = [0, 0.32, -0.32, 0.64, -0.64, 0.96];

/** This drone's place among its mother's drones on the same rock, by id. */
function slotOn(world: World, decided: World['npcs'], droneShipId: string, motherId: string, rockId: string): number {
  let before = 0;
  for (const id of Object.keys(world.npcs)) {
    if (id >= droneShipId) continue;
    const brain = decided[id] ?? world.npcs[id]!;
    if (brain.kind === 'drone' && brain.motherId === motherId && brain.rockId === rockId) before++;
  }
  return before;
}

/** Which side of the mother an idle drone waits on, from its id. */
function hashSide(id: string): boolean {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (h & 1) === 1;
}

