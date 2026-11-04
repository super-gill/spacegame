import { REST_EPSILON } from './constants.js';
import { wrapAngle } from './angle.js';
import { computeThrusters, idleThrusters, shipAxes } from './flight.js';
import type { ShipStats, ShipInput, Ship, Thrusters } from './types.js';
import { add, length, scale, type Vec2 } from './vec2.js';

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
 * Linear thrust is applied along the heading the flight computer planned
 * with, before the heading is advanced, so assist and brake cancel drift
 * exactly instead of chasing a moving target.
 */

/** Cap a vector's length. */
function clampLength(v: Vec2, max: number): Vec2 {
  const len = length(v);
  return len > max ? scale(v, max / len) : v;
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
 */
export function stepShip(ship: Ship, stats: ShipStats, input: ShipInput | null, dt: number): Ship {
  if (ship.state === 'docked') return { ...ship, thrusters: idleThrusters() };

  const thrusters = input ? computeThrusters(ship, stats, input, dt) : idleThrusters();

  let velocity = add(ship.velocity, scale(linearAcceleration(stats, ship.heading, thrusters), dt));
  velocity = settle(clampLength(velocity, stats.maxSpeed));

  let angularVelocity = ship.angularVelocity + angularAcceleration(stats, thrusters) * dt;
  angularVelocity = clamp(angularVelocity, stats.maxTurnRate);
  if (Math.abs(angularVelocity) < REST_EPSILON) angularVelocity = 0;

  const position = add(ship.position, scale(velocity, dt));
  const heading = wrapAngle(ship.heading + angularVelocity * dt);

  return { ...ship, heading, angularVelocity, velocity, position, thrusters };
}
