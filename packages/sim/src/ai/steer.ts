import { angleDelta } from '../angle.js';
import { shipAxes } from '../flight.js';
import { asteroidPositions } from '../asteroids.js';
import { bodyStates, gravityAt, railTime } from '../rails.js';
import type { ShipStats, Ship, ShipInput, Station, World } from '../types.js';
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
export function obstacles(world: Pick<World, 'stations' | 'bodies' | 'asteroids' | 'tick' | 'dt'>, stats?: ShipStats): Obstacle[] {
  const out: Obstacle[] = Object.values(world.stations).map((s) => ({ position: s.position, radius: s.radius }));
  for (const rock of asteroidPositions(world)) out.push({ position: rock.position, radius: rock.radius });
  const states = bodyStates(world.bodies, railTime(world.tick, world.dt));
  const mainAccel = stats && stats.mass > 0 ? stats.mainThrust / stats.mass : 0;
  for (const id of Object.keys(world.bodies).sort()) {
    const body = world.bodies[id]!;
    if (body.radius <= 0) continue;
    // Keep out of the depth where gravity would beat the engine.
    const deep = mainAccel > 0 && body.gravity > 0 ? Math.sqrt(body.gravity / (GRAVITY_ROUTE_FRACTION * mainAccel)) : 0;
    // A body gets a wider berth than a hull: its pull bends a path towards it.
    out.push({ position: states[id]!.position, radius: Math.min(Math.max(body.radius * BODY_BERTH, deep), body.sphere * 0.6 || body.radius) });
  }
  return out;
}

/**
 * Which way to move off a station just left or brushed against: straight
 * away from it, unless that leads towards the body it orbits, when the
 * way out is away from the body instead.
 */
export function awayFromStation(world: Pick<World, 'bodies' | 'tick' | 'dt'>, ship: Ship, station: Station): Vec2 {
  const out = normalise(sub(ship.position, station.position));
  const parentId = station.orbit?.parent;
  const parent = parentId ? world.bodies[parentId] : undefined;
  if (!parentId || !parent || parent.radius <= 0) return out;
  const upward = normalise(sub(station.position, bodyStates(world.bodies, railTime(world.tick, world.dt))[parentId]!.position));
  return dot(out, upward) < 0 ? normalise(add(out, scale(upward, 2))) : out;
}

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
export function pullOn(world: Pick<World, 'bodies' | 'tick' | 'dt'>, ship: Ship): Vec2 {
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
