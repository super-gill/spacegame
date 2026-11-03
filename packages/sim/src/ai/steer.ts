import { angleDelta } from '../angle.js';
import { shipAxes } from '../flight.js';
import type { ShipStats, Ship, ShipInput, Station } from '../types.js';
import { add, distance, length, normalise, scale, sub, toAngle, type Vec2 } from '../vec2.js';
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

/**
 * If the straight line from the ship to `goal` passes through a station
 * hull, return a waypoint to one side of that station instead. Otherwise
 * return `goal` unchanged. Good enough for open space with a few
 * stations; real pathfinding can come with busier sectors.
 */
export function routeAround(ship: Ship, stats: ShipStats, goal: Vec2, stations: Record<string, Station>): Vec2 {
  const path = sub(goal, ship.position);
  const pathLength = length(path);
  if (pathLength < 1) return goal;
  const dir = scale(path, 1 / pathLength);

  let nearestBlock: { station: Station; along: number } | null = null;
  for (const station of Object.values(stations)) {
    const clearance = station.radius + stats.radius + STATION_CLEARANCE;
    if (distance(goal, station.position) < clearance) continue; // goal is at this station
    const along = dot(sub(station.position, ship.position), dir);
    if (along <= 0 || along >= pathLength) continue;
    const closest = add(ship.position, scale(dir, along));
    if (distance(closest, station.position) >= clearance) continue;
    if (!nearestBlock || along < nearestBlock.along) nearestBlock = { station, along };
  }
  if (!nearestBlock) return goal;

  // Go round on whichever side the ship is already offset towards.
  const { station } = nearestBlock;
  const clearance = station.radius + stats.radius + STATION_CLEARANCE;
  const side = { x: -dir.y, y: dir.x };
  const offsetSide = dot(sub(ship.position, station.position), side) >= 0 ? 1 : -1;
  return add(station.position, scale(side, offsetSide * (clearance + 40)));
}
