import { angleDelta } from '../angle.js';
import { shipAxes } from '../flight.js';
import { asteroidPositions } from '../asteroids.js';
import { bodyStates, gravityAt, railTime } from '../rails.js';
import { isLocked } from '../locks.js';
import { incomingMunitions } from '../munitions.js';
import type { RunState, ShipStats, Ship, ShipInput, Station, WeaponSpec, World } from '../types.js';
import { isGun } from '../weapons.js';
import { add, distance, fromAngle, length, normalise, scale, sub, toAngle, type Vec2 } from '../vec2.js';
import { emptyInput } from '../world.js';

/**
 * NPC piloting.
 *
 * NPCs fly by producing a ShipInput, the same keys a person would press,
 * which then goes through the same flight computer and physics as every
 * other ship. They get no extra thrust and no shortcuts, so they can be
 * outflown, and anything that makes ships easier or harder to fly
 * changes NPCs too.
 *
 * NPCs fly in rotation-assist mode: releasing a rotate key stops the spin,
 * and drift is left to the steering here, which presses thrust keys to
 * pull the ship's velocity towards a desired velocity.
 *
 * Desired velocities are in system coordinates. To arrive at something
 * that moves (a station on its orbit), add its velocity to the approach
 * velocity: the ship then closes on it and ends up moving with it.
 */

/** Velocity error (units/s) a steering axis tolerates before firing. Stops thruster chatter. */
const VELOCITY_DEADBAND = 6;

/** Heading error (radians) a turn tolerates before firing. About 1.5 degrees. */
const HEADING_TOLERANCE = 0.025;

/** Below this desired speed the ship keeps its current heading rather than chasing a tiny vector. */
const MIN_SPEED_TO_FACE = 20;

/** Fraction of braking thrust assumed available when planning a stop, leaving margin for turning. */
const BRAKE_PLANNING_FACTOR = 0.6;

/** Extra clearance (units) kept from station hulls when planning a path round them. */
const STATION_CLEARANCE = 70;

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

/**
 * Press rotate keys to bring the heading round to `target`.
 *
 * With rotation assist, releasing the keys stops the spin at the hull's
 * full rotation thrust. So: keep turning until the angle left is about
 * the angle needed to stop, then let go and let the assist brake.
 */
export function turnTowards(ship: Ship, stats: ShipStats, target: number): Pick<ShipInput, 'turnLeft' | 'turnRight'> {
  const error = angleDelta(ship.heading, target);
  const spin = ship.angularVelocity;
  const alpha = stats.rotationThrust / stats.mass;
  const stoppingAngle = (spin * spin) / (2 * alpha);

  const spinningTowards = Math.sign(spin) === Math.sign(error) && spin !== 0;
  if (spinningTowards && Math.abs(error) <= stoppingAngle + HEADING_TOLERANCE) {
    return { turnLeft: false, turnRight: false }; // coast in; assist brakes the spin
  }
  if (Math.abs(error) <= HEADING_TOLERANCE) return { turnLeft: false, turnRight: false };
  return { turnLeft: error < 0, turnRight: error > 0 };
}

/**
 * Inputs that pull the ship's velocity towards `desired`.
 *
 * The hull turns to face along the desired velocity (or towards `faceAt`,
 * if given), so the strong main engine does most of the work, and the
 * thrusters on each axis fire to close whatever error remains.
 */
export function steerToVelocity(ship: Ship, stats: ShipStats, desired: Vec2, faceAt?: Vec2): ShipInput {
  const input = emptyInput();

  let targetHeading = ship.heading;
  if (faceAt) targetHeading = toAngle(sub(faceAt, ship.position));
  else if (length(desired) > MIN_SPEED_TO_FACE) targetHeading = toAngle(desired);
  Object.assign(input, turnTowards(ship, stats, targetHeading));

  const error = sub(desired, ship.velocity);
  const { forward, right } = shipAxes(ship.heading);
  const errForward = dot(error, forward);
  const errRight = dot(error, right);

  input.thrustForward = errForward > VELOCITY_DEADBAND;
  input.thrustReverse = errForward < -VELOCITY_DEADBAND;
  input.strafeRight = errRight > VELOCITY_DEADBAND;
  input.strafeLeft = errRight < -VELOCITY_DEADBAND;
  return input;
}

/** Deceleration (units/s^2) the hull can plan on when stopping head-on with its retro engine. */
export function plannedBraking(stats: ShipStats): number {
  return (Math.min(stats.reverseThrust, stats.lateralThrust) / stats.mass) * BRAKE_PLANNING_FACTOR;
}

/**
 * Desired velocity to arrive at `point` and stop there, travelling no
 * faster than `cruise`. Speed falls off as sqrt(2 * a * d), the fastest
 * you can go and still stop in the distance left.
 */
export function arriveVelocity(ship: Ship, stats: ShipStats, point: Vec2, cruise: number): Vec2 {
  const offset = sub(point, ship.position);
  const dist = length(offset);
  if (dist < 1) return { x: 0, y: 0 };
  const speed = Math.min(cruise, Math.sqrt(2 * plannedBraking(stats) * dist));
  return scale(normalise(offset), speed);
}

/** NPCs steer for the velocity gravity will have added over this long, seconds, so they do not sag. */
const GRAVITY_LEAD_SECONDS = 0.5;
/**
 * NPCs route round a body at the distance where its gravity falls to this
 * fraction of their own main thrust, if that is further out than its
 * surface. A heavy freighter gives a star a wider berth than a courier.
 */
const GRAVITY_ROUTE_FRACTION = 0.3;
/** NPCs route round a body at least this many times its radius from its centre. */
const BODY_BERTH = 1.6;

/**
 * Steer like `steerToVelocity`, but leaning into gravity rather than
 * sagging under it. `pull` is gravity where the ship is. (Routing round
 * obstacles is done before this, in `routeAround`.)
 */
export function steerSafely(ship: Ship, stats: ShipStats, desired: Vec2, pull: Vec2, faceAt?: Vec2): ShipInput {
  return steerToVelocity(ship, stats, sub(desired, scale(pull, GRAVITY_LEAD_SECONDS)), faceAt);
}

/**
 * Desired velocity towards `waypoint` on the way to `goal`: as fast as
 * `arriveVelocity` allows for the distance left to the goal (via the
 * waypoint), pointed at the waypoint. So a detour is flown through at
 * speed instead of stopping at every waypoint, and the ship still stops at
 * the goal itself.
 */
export function travelVelocity(ship: Ship, stats: ShipStats, waypoint: Vec2, goal: Vec2, cruise: number): Vec2 {
  if (waypoint.x === goal.x && waypoint.y === goal.y) return arriveVelocity(ship, stats, goal, cruise);
  const left = distance(ship.position, waypoint) + distance(waypoint, goal);
  const speed = Math.min(cruise, Math.sqrt(2 * plannedBraking(stats) * left));
  return scale(normalise(sub(waypoint, ship.position)), speed);
}

/** Something round to steer clear of: a station hull or a body's surface. */
export interface Obstacle {
  position: Vec2;
  radius: number;
}

/**
 * Every station hull, body surface and asteroid as it stands at the start
 * of this tick.
 */
export function obstacles(world: Pick<World, 'stations' | 'bodies' | 'asteroids' | 'tick' | 'dt' | 'rules'>, stats?: ShipStats): Obstacle[] {
  const out: Obstacle[] = Object.values(world.stations).map((s) => ({ position: s.position, radius: s.radius }));
  for (const rock of asteroidPositions(world)) out.push({ position: rock.position, radius: rock.radius });
  const states = bodyStates(world.bodies, railTime(world.tick, world.dt));
  const mainAccel = stats && stats.mass > 0 ? stats.mainThrust / stats.mass : 0;
  for (const id of Object.keys(world.bodies).sort()) {
    const body = world.bodies[id]!;
    if (body.radius <= 0) continue;
    // Keep out of the depth where gravity would beat the engine.
    const deep = world.rules.gravity && mainAccel > 0 && body.gravity > 0 ? Math.sqrt(body.gravity / (GRAVITY_ROUTE_FRACTION * mainAccel)) : 0;
    // A body gets a wider berth than a hull: its pull bends a path towards it.
    out.push({ position: states[id]!.position, radius: Math.min(Math.max(body.radius * BODY_BERTH, deep), body.sphere * 0.6 || body.radius) });
  }
  return out;
}

/**
 * Which way to move off a station just left or brushed against: straight
 * away from it, unless that leads towards the body it orbits. Then lean
 * away from the body as well, never so far that the way leads back into
 * the hull: from the planet-facing side, first slip round the hull
 * sideways (still edging out) until there is room to climb.
 */
export function awayFromStation(world: Pick<World, 'bodies' | 'tick' | 'dt'>, ship: Ship, station: Station): Vec2 {
  const out = normalise(sub(ship.position, station.position));
  const parentId = station.orbit?.parent;
  const parent = parentId ? world.bodies[parentId] : undefined;
  if (!parentId || !parent || parent.radius <= 0) return out;
  const upward = normalise(sub(station.position, bodyStates(world.bodies, railTime(world.tick, world.dt))[parentId]!.position));
  const facing = dot(out, upward);
  if (facing >= 0) return out;
  // Mildly towards the body: climbing as well still leads away from the hull.
  if (facing >= -STEEP_PAD) return normalise(add(out, scale(upward, 2)));
  // Steeply towards it: round the hull's side first.
  const side = sub(out, scale(upward, facing));
  const sideways = length(side) > 1e-6 ? normalise(side) : { x: -upward.y, y: upward.x };
  return normalise(add(sideways, scale(out, 0.3)));
}

/** A pad facing the body more steeply than this (cosine) leaves sideways first. */
const STEEP_PAD = 0.3;

/**
 * Gunnery discipline for NPCs with fixed guns (docs/weapons.md): fire
 * only when the gun can pay. An energy gun holds fire once the capacitor
 * is under a reserve, then opens up again when it has recovered, so an
 * NPC fights in bursts like a pilot who watches the ring instead of
 * clicking on an empty pool. An ammunition gun fires whenever loaded.
 */
export function canAfford(ship: Ship, stats: ShipStats, gun: { capacitorPerShot: number; ammo: string | null }, mountId: string): boolean {
  if (gun.ammo) {
    const state = ship.weapons.find((w) => w.mountId === mountId);
    return !!state && state.loaded > 0;
  }
  if (gun.capacitorPerShot <= 0 || stats.capacitor <= 0) return true;
  const fraction = ship.capacitor / stats.capacitor;
  // Hysteresis: below the floor, wait until back above the ceiling.
  const state = ship.weapons.find((w) => w.mountId === mountId);
  const resting = state ? state.cooldownTicks === 0 && ship.capacitor < gun.capacitorPerShot * 2 : false;
  return !resting && fraction > GUNNERY_RESERVE;
}

/** NPCs stop firing energy guns below this fraction of the capacitor, keeping some for shields. */
const GUNNERY_RESERVE = 0.15;

/** Gravity where the ship is, for steering. */
export function pullOn(world: Pick<World, 'bodies' | 'tick' | 'dt' | 'rules'>, ship: Ship): Vec2 {
  if (!world.rules.gravity) return { x: 0, y: 0 };
  return gravityAt(world.bodies, bodyStates(world.bodies, railTime(world.tick, world.dt)), ship.position);
}

/**
 * If the straight line from the ship to `goal` passes through an
 * obstacle (a station hull or a body), return a waypoint to one side of
 * it instead. Otherwise return `goal` unchanged. Good enough for open
 * space with a few obstacles; real pathfinding can come with busier
 * systems.
 */
export function routeAround(ship: Ship, stats: ShipStats, goal: Vec2, list: readonly Obstacle[]): Vec2 {
  const path = sub(goal, ship.position);
  const pathLength = length(path);
  if (pathLength < 1) return goal;
  const dir = scale(path, 1 / pathLength);

  let nearestBlock: { obstacle: Obstacle; along: number; clearance: number } | null = null;
  for (const obstacle of list) {
    const hullGap = obstacle.radius + stats.radius;
    const toGoal = distance(goal, obstacle.position);
    if (toGoal < hullGap) continue; // the goal is inside it: nothing to route round
    // A goal close beside an obstacle (the near side of the station being
    // docked at) shrinks the room kept from it, so the way in stays open
    // without ever cutting through the hull.
    const clearance = Math.min(hullGap + STATION_CLEARANCE, Math.max(hullGap + 5, toGoal - 5));
    const along = dot(sub(obstacle.position, ship.position), dir);
    if (along <= 0 || along >= pathLength) continue;
    const closest = add(ship.position, scale(dir, along));
    if (distance(closest, obstacle.position) >= clearance) continue;
    if (!nearestBlock || along < nearestBlock.along) nearestBlock = { obstacle, along, clearance };
  }
  if (!nearestBlock) return goal;

  // Go round on whichever side the ship is already offset towards, aiming
  // along the tangent to a cushion round the obstacle, so the leg to the
  // waypoint itself never cuts through it. Inside the cushion, back out first.
  const { obstacle } = nearestBlock;
  const cushion = nearestBlock.clearance + 40;
  const side = { x: -dir.y, y: dir.x };
  const offsetSide = dot(sub(ship.position, obstacle.position), side) >= 0 ? 1 : -1;
  const out = sub(ship.position, obstacle.position);
  const d = length(out);
  const hull = obstacle.radius + stats.radius;
  // Already inside the cushion: slide round at the distance it has, or
  // back straight out if it is nearly touching.
  if (d <= hull + 10) return add(obstacle.position, scale(normalise(out), cushion + 60));
  const base = Math.atan2(out.y, out.x);
  // Turning the outward bearing towards the chosen side.
  const toward = (angle: number): number => (dot(fromAngle(base + angle), side) * offsetSide > 0 ? angle : -angle);
  if (d < cushion) {
    // Inside the cushion (gravity pulled it in, or it was launched there):
    // climb back out while going round, never deeper.
    return add(obstacle.position, scale(fromAngle(base + toward(INSIDE_CUSHION_STEP)), cushion * TANGENT_MARGIN));
  }
  const tangent = Math.acos(cushion / d);
  return add(obstacle.position, scale(fromAngle(base + toward(tangent)), cushion * TANGENT_MARGIN));
}

/** A ship inside an obstacle's cushion aims this far round it (radians) and back out to the cushion. */
const INSIDE_CUSHION_STEP = 0.5;

/** Tangent waypoints sit this much beyond the cushion, so a ship cutting the corner still clears it. */
const TANGENT_MARGIN = 1.08;

/**
 * Lock inputs that get and hold a complete, active lock on `targetId`:
 * drop a stray lock if the computer is full, lock, then make it active.
 * Missiles need this; fixed guns do not.
 */
export function holdLock(ship: Ship, stats: ShipStats, targetId: string): Partial<ShipInput> {
  if (!ship.locks.some((l) => l.targetId === targetId)) {
    const stray = ship.locks.find((l) => l.targetId !== targetId);
    if (stray && ship.locks.length >= stats.maxLocks) return { unlock: stray.targetId };
    return { lock: targetId };
  }
  return ship.activeLock !== targetId ? { activateLock: targetId } : {};
}

/** The fixed gun an NPC aims its nose with: the first fixed mount that is a gun, not a launcher. */
export function mainGun(stats: ShipStats): [string, WeaponSpec] | null {
  const found = Object.entries(stats.weapons).find(([, w]) => w.kind === 'fixed' && isGun(w));
  return found ?? null;
}

/** NPC guns sit in this group; launchers in their own (`weaponStatesFor`). */
const NPC_GUN_GROUP = 1;

/**
 * Whether to launch at `target` this tick, and the inputs that do it:
 * a loaded, cooled launcher, a complete lock, the target between
 * `minRange` and `maxRange`, and the nose within `aimTolerance` of it (a
 * missile turns, but not from behind). Launching selects the launcher's
 * group for the tick; otherwise the guns' group is put back, so the
 * caller's `fireFixed` fires guns.
 */
export function missileInputs(ship: Ship, stats: ShipStats, target: Ship, minRange: number, maxRange: number, aimTolerance: number): Partial<ShipInput> {
  const back: Partial<ShipInput> = ship.fireGroup !== NPC_GUN_GROUP ? { selectGroup: NPC_GUN_GROUP } : {};
  if (!isLocked(ship, target.id)) return back;
  const range = distance(ship.position, target.position);
  if (range < minRange || range > maxRange) return back;
  if (Math.abs(angleDelta(ship.heading, toAngle(sub(target.position, ship.position)))) > aimTolerance) return back;
  const ready = ship.weapons.find((w) => {
    const spec = stats.weapons[w.mountId];
    return spec?.family === 'missile' && w.loaded > 0 && w.cooldownTicks === 0 && w.reloadTicks === 0;
  });
  if (!ready) return back;
  return { selectGroup: ready.group, fireFixed: true };
}

/** NPCs drop a countermeasure when a munition coming for them is this close, units. */
const COUNTERMEASURE_RANGE = 700;

/** True if an NPC should drop a countermeasure now: something is coming and a dispenser is ready. */
export function wantsCountermeasure(world: Pick<World, 'munitions'>, ship: Ship, stats: ShipStats): boolean {
  if (ship.state !== 'flying') return false;
  const coming = incomingMunitions(world.munitions, ship.id).some((m) => distance(m.position, ship.position) <= COUNTERMEASURE_RANGE);
  if (!coming) return false;
  return ship.weapons.some((w) => stats.weapons[w.mountId]?.family === 'countermeasure' && w.loaded > 0 && w.cooldownTicks === 0);
}

export const RUN_TUNING = {
  /** Break off an attack run this close to the target, units: early enough to pass clear, never ramming it. */
  breakRange: 220,
  /** Inside its guns' range, close no faster than this on the target, units/s: a firing window, not a flypast. */
  firingClosingSpeed: 110,
  /** Break off after this long on one run even if not that close, seconds. */
  attackSeconds: 8,
  /** Veer this far off the line to the target when breaking, radians: it passes the target's side, well clear. */
  breakAngle: 1.0,
  /** Extend at least this long before turning back, seconds. */
  breakSeconds: 2,
  /** ...and until at least this far from the target, units. */
  extendRange: 550,
  /** Turn back for another run after this long whatever the range, seconds. */
  breakMaxSeconds: 5,
  /** Extend at this share of top speed: fast enough to get clear, slow enough to turn back without a long loop. */
  breakSpeedFraction: 0.65,
};

export interface RunPlan {
  /** Velocity to steer for. */
  desired: Vec2;
  /** Where to point the nose; absent, the nose follows the velocity (breaking away). */
  faceAt?: Vec2;
  /** True on the attacking part of the run, when the guns may fire. */
  attacking: boolean;
  state: RunState;
}

/**
 * Attack runs (4 November 2026). Ships cannot slide sideways at speed
 * (`WorldRules.manoeuvreSpeed`), so fighters make passes, as in Flatspace:
 *
 * - attack: fly at the target nose-on, aiming at `aimPoint` and firing
 *   (the caller decides when to fire), until close or the run has gone on
 *   long enough;
 * - break: veer off past the target's side and burn away with the nose
 *   along the velocity, showing it a side and stern, until far enough
 *   out; then turn back for the next run.
 *
 * Passes come from wherever the last one left off, so a target that just
 * sits turning to face them still gets shots into its beams and stern.
 */
export function attackRun(
  world: Pick<World, 'dt'>,
  ship: Ship,
  stats: ShipStats,
  target: Ship,
  aimPoint: Vec2,
  fireRange: number,
  state: RunState | undefined,
  around: Obstacle[],
): RunPlan {
  let s: RunState = state ? { ...state, runTicks: state.runTicks + 1 } : { run: 'attack', runTicks: 0, breakHeading: 0 };
  const range = distance(ship.position, target.position);
  const seconds = s.runTicks * world.dt;

  if (s.run === 'attack' && (range <= RUN_TUNING.breakRange || seconds >= RUN_TUNING.attackSeconds)) {
    // Pass the target on the side the ship is already drifting towards.
    const toTarget = toAngle(sub(target.position, ship.position));
    const rel = sub(ship.velocity, target.velocity);
    const across = Math.cos(toTarget) * rel.y - Math.sin(toTarget) * rel.x;
    s = { run: 'break', runTicks: 0, breakHeading: toTarget + (across >= 0 ? 1 : -1) * RUN_TUNING.breakAngle };
  } else if (s.run === 'break' && ((seconds >= RUN_TUNING.breakSeconds && range >= RUN_TUNING.extendRange) || seconds >= RUN_TUNING.breakMaxSeconds)) {
    s = { ...s, run: 'attack', runTicks: 0 };
  }

  if (s.run === 'break') {
    const waypoint = routeAround(ship, stats, add(ship.position, scale(fromAngle(s.breakHeading), 600)), around);
    return { desired: add(target.velocity, scale(normalise(sub(waypoint, ship.position)), stats.maxSpeed * RUN_TUNING.breakSpeedFraction)), attacking: false, state: s };
  }
  const waypoint = routeAround(ship, stats, target.position, around);
  const closing = range <= fireRange ? Math.min(stats.maxSpeed, RUN_TUNING.firingClosingSpeed) : stats.maxSpeed;
  return { desired: add(target.velocity, scale(normalise(sub(waypoint, ship.position)), closing)), faceAt: aimPoint, attacking: true, state: s };
}
