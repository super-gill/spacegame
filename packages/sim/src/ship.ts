import { REST_EPSILON } from './constants.js';
import { wrapAngle } from './angle.js';
import { computeThrusters, idleThrusters, shipAxes } from './flight.js';
import type { ShipStats, ShipInput, Ship, Thrusters } from './types.js';
import { add, length, scale, sub, type Vec2 } from './vec2.js';

/**
 * Ship physics.
 *
 * Pure Newtonian, linear and rotational. There is no drag: thrusters add
 * velocity and spin, and nothing else takes them away. Each tick:
 *
 *   1. The flight computer (flight.ts) turns input and flight mode into
 *      thruster throttles.
 *   2. This module applies those throttles as accelerations (force / mass).
 *   3. The hull's hard limits on speed and spin are enforced.
 *
 * Speed is measured against the ship's local frame (rails.ts), so the
 * limit is relative to the station or body you are flying near. Thrust
 * can never take you past the limit, but a ship already past it (carried
 * across a frame edge, rammed, or later flung by a slingshot) is not
 * slowed: thrust can only turn that speed or bleed it off. So crossing
 * into a moving frame never jolts a ship, and slingshots can gain speed.
 *
 * Linear thrust is applied along the heading the flight computer planned
 * with, before the heading is advanced, so assist and brake cancel drift
 * exactly instead of chasing a moving target.
 */

/**
 * The velocity after thrust, relative to the frame: `after`, unless that
 * is past the limit, when it is cut back to the larger of the limit and
 * the speed the ship already had. Thrust never adds speed past the limit.
 */
function limitThrust(before: Vec2, after: Vec2, max: number): Vec2 {
  const len = length(after);
  if (len <= max) return after;
  const cap = Math.max(max, length(before));
  return len > cap ? scale(after, cap / len) : after;
}

function clamp(value: number, max: number): number {
  return Math.max(-max, Math.min(max, value));
}

/** Snap floating-point dust to an exact stop. */
function settle(v: Vec2): Vec2 {
  return length(v) < REST_EPSILON ? { x: 0, y: 0 } : v;
}

/** Linear acceleration (units/s^2, world space) produced by the given throttles. */
export function linearAcceleration(stats: ShipStats, heading: number, t: Thrusters): Vec2 {
  const { forward, right } = shipAxes(heading);
  const along = (t.main * stats.mainThrust - t.reverse * stats.reverseThrust) / stats.mass;
  const across = ((t.strafeRight - t.strafeLeft) * stats.lateralThrust) / stats.mass;
  return add(scale(forward, along), scale(right, across));
}

/** Angular acceleration (rad/s^2, positive clockwise) produced by the given throttles. */
export function angularAcceleration(stats: ShipStats, t: Thrusters): number {
  return ((t.rotateRight - t.rotateLeft) * stats.rotationThrust) / stats.mass;
}

/**
 * Advance one ship by `dt` seconds under `input`. Returns a new Ship.
 *
 * `input` is null for an empty ship (nobody aboard): the flight computer
 * does not run, no thruster fires, and the ship coasts on its momentum.
 * `frame` is the local frame's velocity (rails.ts `frameVelocity`) and
 * `gravity` the pull where the ship is (rails.ts `gravityAt`). Carrying by
 * a body is applied by the caller, after this.
 */
export function stepShip(
  ship: Ship,
  stats: ShipStats,
  input: ShipInput | null,
  dt: number,
  frame: Vec2 = { x: 0, y: 0 },
  gravity: Vec2 = { x: 0, y: 0 },
): Ship {
  if (ship.state === 'docked') return { ...ship, thrusters: idleThrusters() };

  // The flight computer plans against where gravity will have taken the
  // ship's velocity by the end of the tick, so full assist and brake hold
  // it still against gravity as far as its thrusters can.
  const pull = scale(gravity, dt);
  const thrusters = input ? computeThrusters(ship, stats, input, dt, sub(frame, pull)) : idleThrusters();

  // Work relative to the local frame, then back to system coordinates.
  // The speed limit caps thrust only; gravity is never capped, so a fall
  // or a slingshot can take a ship past it. Velocity changes before
  // position, which keeps free orbits from gaining or losing energy.
  const before = sub(ship.velocity, frame);
  const after = add(before, scale(linearAcceleration(stats, ship.heading, thrusters), dt));
  const velocity = add(frame, settle(add(limitThrust(before, after, stats.maxSpeed), pull)));

  let angularVelocity = ship.angularVelocity + angularAcceleration(stats, thrusters) * dt;
  angularVelocity = clamp(angularVelocity, stats.maxTurnRate);
  if (Math.abs(angularVelocity) < REST_EPSILON) angularVelocity = 0;

  const position = add(ship.position, scale(velocity, dt));
  const heading = wrapAngle(ship.heading + angularVelocity * dt);

  return { ...ship, heading, angularVelocity, velocity, position, thrusters };
}
