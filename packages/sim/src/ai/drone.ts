import { rockAt, rockSeam } from '../asteroids.js';
import { isLocked } from '../locks.js';
import type { DroneBrain, Ship, ShipInput, ShipStats, World } from '../types.js';
import { add, distance, fromAngle, scale, sub, toAngle, type Vec2 } from '../vec2.js';
import { angleDelta } from '../angle.js';
import { emptyInput } from '../world.js';
import { asteroidPositions } from '../asteroids.js';
import { flightOn, steerSafely } from './steer.js';
import { CLEAR_MARGIN, navigate } from './navigate.js';

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
  /** Close to its spot, units: within three times this it turns to face the rock. */
  onSpot: 20,
  /** Facing the rock within this, radians, before the laser runs. */
  aimTolerance: 0.12,
  /** Cuts once the rock's face is within this share of its laser's range. */
  reachShare: 0.9,
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
  const flight = flightOn(world, ship, stats);
  const cruise = stats.maxSpeed * DRONE_TUNING.cruise;

  // Too far from home: come back, whatever it was doing.
  let mode = brain.mode;
  if (mode === 'work' && distance(ship.position, mother.position) > range) mode = 'return';

  // Rocks near the drone, for choosing a clear cutting spot.
  const rocks = asteroidPositions(world)
    .filter((r) => distance(r.position, ship.position) < 900)
    .map((r) => ({ position: r.position, radius: r.radius }));
  const hull = { position: mother.position, radius: motherStats.radius };
  const clearance = stats.radius + CLEAR_MARGIN;
  // Sister drones and the mother are not steered round: they pass through
  // each other harmlessly, and a sister cutting on the face boxed a drone in
  // against the rock (6 November 2026). Their spots keep them apart; the
  // mother's hull is planned round when it is in the way.
  const family = (other: Ship): boolean => other.id === mother.id || other.motherId === mother.id;
  const head = (spot: Vec2, frame: Vec2, avoidHull: boolean) => navigate(world, ship, stats, brain, spot, frame, cruise, { avoid: avoidHull ? [hull] : [], ignoreShips: family });

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
  // Its place among them: round the face from the seam, then, once a ring
  // round the rock is full, a second ring further out, still in laser range.
  const laserReach = Math.max(0, ...Object.values(stats.weapons).filter((w) => w.mining).map((w) => w.range));
  const place = slotPlace(slot, rock.rock.radius, stats.radius, laserReach);
  // Not a spot wedged against another rock or the mother: step round the face until clear.
  const reach = place.reach;
  // Nor on top of a sister drone's spot on this rock (on a small rock the search can land two on one).
  const sisters = sisterSpots(world, decided, ship.id, mother.id, rock.rock.id).map((p) => ({ position: p, radius: stats.radius }));
  const others = [...rocks.filter((r) => distance(r.position, rock.position) > 1), hull, ...sisters];
  const first = base + place.offset;
  // In a crowded patch every place round the face may be tight: then the
  // one with the most room, out to the edge of laser range, never simply
  // the first (which may be wedged against a neighbour).
  const roomAt = (p: Vec2): number => Math.min(...others.map((o) => distance(p, o.position) - o.radius - clearance - 4));
  const outermost = rock.rock.radius + Math.max(DRONE_TUNING.standoff, laserReach * DRONE_TUNING.reachShare - stats.radius - SLOT_GAP) + stats.radius;
  let spot = add(rock.position, scale(fromAngle(first), reach));
  let bestRoom = -Infinity;
  search: for (const r of reach < outermost ? [reach, (reach + outermost) / 2, outermost] : [reach]) {
    for (let k = 0; k < SPOT_TRIES; k++) {
      const angle = first + (k % 2 === 0 ? 1 : -1) * Math.ceil(k / 2) * SPOT_STEP;
      const candidate = add(rock.position, scale(fromAngle(angle), r));
      const room = others.length > 0 ? roomAt(candidate) : Infinity;
      if (room >= 0) {
        spot = candidate;
        break search;
      }
      if (room > bestRoom) {
        bestRoom = room;
        spot = candidate;
      }
    }
  }
  const { velocity: desired, plan } = head(spot, rock.velocity, true);
  // Face the rock only once nearly there: on the way it points where it
  // goes, so its strong main engine does the work (its side and reverse
  // thrusters are weaker; `HullSpec.manoeuvre`).
  const near = distance(ship.position, spot) <= DRONE_TUNING.onSpot * 3;
  const input = steerSafely(ship, stats, desired, flight, near ? rock.position : undefined);
  const facing = Math.abs(angleDelta(ship.heading, toAngle(sub(rock.position, ship.position)))) <= DRONE_TUNING.aimTolerance;
  // Cut from wherever it can reach the face, not only from its exact spot:
  // a drone a little short of its spot, nose on the rock, need not shuffle
  // the last few units before it starts.
  const gap = distance(ship.position, rock.position) - rock.rock.radius;
  const inReach = near && gap <= laserReach * DRONE_TUNING.reachShare;
  return { input: { ...input, fireFixed: facing && inReach }, brain: { ...next, ...plan } };
}

/** Looking for a clear cutting spot: this many steps round the rock's face, this far apart, radians. */
const SPOT_TRIES = 12;
const SPOT_STEP = 0.3;

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

/**
 * Where the `slot`th drone on a rock sits: an angle from the seam and a
 * distance from the rock's centre. Drones fill a ring round the face, a
 * drone's width and a little apart, alternating either side of the seam
 * (0, +1, -1, +2, -2...), then the next ring out, a drone's width further,
 * as long as the face stays in laser range; past that they double up on
 * the outer ring.
 */
export function slotPlace(slot: number, rockRadius: number, droneRadius: number, laserReach: number): { offset: number; reach: number } {
  const width = droneRadius * 2 + SLOT_GAP;
  const furthest = Math.max(DRONE_TUNING.standoff, laserReach * DRONE_TUNING.reachShare - droneRadius - SLOT_GAP);
  let left = slot;
  for (let ring = 0; ; ring++) {
    const standoff = Math.min(DRONE_TUNING.standoff + ring * width, furthest);
    const reach = rockRadius + standoff + droneRadius;
    // At least the old spacing, so a few drones on a big rock still spread out.
    const step = Math.max(SLOT_MIN_STEP, width / reach);
    const fits = Math.max(1, Math.floor((Math.PI * 2) / step));
    const last = standoff >= furthest;
    if (left < fits || last) {
      const k = last ? left % fits : left;
      // Rings after the first sit between the spots of the one inside.
      const shift = ring % 2 === 1 ? step / 2 : 0;
      return { offset: (k % 2 === 1 ? 1 : -1) * Math.ceil(k / 2) * step + shift, reach };
    }
    left -= fits;
  }
}

/** Space between neighbouring drones' spots, units; and the least angle between them, radians. */
const SLOT_GAP = 6;
const SLOT_MIN_STEP = 0.32;

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

/** Where the mother's drones before this one (by id) on the same rock mean to sit. */
function sisterSpots(world: World, decided: World['npcs'], droneShipId: string, motherId: string, rockId: string): Vec2[] {
  const spots: Vec2[] = [];
  for (const id of Object.keys(world.npcs)) {
    if (id >= droneShipId) continue;
    const brain = decided[id] ?? world.npcs[id]!;
    if (brain.kind === 'drone' && brain.motherId === motherId && brain.rockId === rockId && brain.goal) spots.push(brain.goal);
  }
  return spots;
}

/** Which side of the mother an idle drone waits on, from its id. */
function hashSide(id: string): boolean {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (h & 1) === 1;
}

