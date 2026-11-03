import { SPACE_ANGULAR_DRAG, SPACE_DRAG } from './constants.js';
import { wrapAngle } from './angle.js';
import type { HullSpec, PlayerInput, Ship } from './types.js';
import { add, fromAngle, length, rotate, scale, type Vec2 } from './vec2.js';

/**
 * Ship flight model.
 *
 * Newtonian, both linear and rotational. Thrusters add velocity and spin;
 * the ship keeps drifting and spinning until something opposes it.
 *
 * - Space drag is a small fixed deceleration that bleeds off stray drift
 *   and spin. It is tiny compared with any thruster.
 * - Each hull has a flight computer limit on speed and spin. Thrust can
 *   still change direction at the limit, it just cannot add magnitude.
 * - Brake fires thrusters against current velocity and spin.
 */

/**
 * Reduce the magnitude of a scalar towards zero by `amount`, never
 * overshooting. Used for drag and braking so they stop at exactly zero
 * instead of oscillating.
 */
function towardsZero(value: number, amount: number): number {
  if (Math.abs(value) <= amount) return 0;
  return value - Math.sign(value) * amount;
}

/** Same as towardsZero, for vectors: shrinks length, keeps direction. */
function shrinkVector(v: Vec2, amount: number): Vec2 {
  const len = length(v);
  if (len <= amount) return { x: 0, y: 0 };
  return scale(v, (len - amount) / len);
}

/** Cap a vector's length. */
function clampLength(v: Vec2, max: number): Vec2 {
  const len = length(v);
  return len > max ? scale(v, max / len) : v;
}

/** Sum the engine thrust requested by the input, in world space. Brake is handled separately. */
export function thrustFromInput(hull: HullSpec, heading: number, input: PlayerInput): Vec2 {
  let force: Vec2 = { x: 0, y: 0 };

  const forward = fromAngle(heading);
  const right = rotate(forward, Math.PI / 2);

  if (input.thrustForward) force = add(force, scale(forward, hull.mainThrust));
  if (input.thrustReverse) force = add(force, scale(forward, -hull.reverseThrust));
  if (input.strafeRight) force = add(force, scale(right, hull.lateralThrust));
  if (input.strafeLeft) force = add(force, scale(right, -hull.lateralThrust));

  return force;
}

/** Advance the ship's spin and heading by `dt`. */
function stepRotation(ship: Ship, hull: HullSpec, input: PlayerInput, dt: number): { heading: number; angularVelocity: number } {
  const angularAccel = hull.rotationThrust / hull.mass;

  // Screen y points down, so positive spin is clockwise on screen.
  // Both keys held cancel out.
  const turn = (input.turnRight ? 1 : 0) - (input.turnLeft ? 1 : 0);
  let spin = ship.angularVelocity + turn * angularAccel * dt;

  if (input.brake) spin = towardsZero(spin, angularAccel * dt);
  spin = towardsZero(spin, SPACE_ANGULAR_DRAG * dt);
  spin = Math.max(-hull.maxTurnRate, Math.min(hull.maxTurnRate, spin));

  return { heading: wrapAngle(ship.heading + spin * dt), angularVelocity: spin };
}

/** Advance one ship by `dt` seconds under `input`. Returns a new Ship. */
export function stepShip(ship: Ship, hull: HullSpec, input: PlayerInput, dt: number): Ship {
  if (ship.state === 'docked') return ship;

  const { heading, angularVelocity } = stepRotation(ship, hull, input, dt);

  const acceleration = scale(thrustFromInput(hull, heading, input), 1 / hull.mass);
  let velocity = add(ship.velocity, scale(acceleration, dt));

  if (input.brake) {
    // Brake uses the lateral thrusters' strength as "all thrusters together".
    velocity = shrinkVector(velocity, (hull.lateralThrust / hull.mass) * dt);
  }
  velocity = shrinkVector(velocity, SPACE_DRAG * dt);
  velocity = clampLength(velocity, hull.maxSpeed);

  const position = add(ship.position, scale(velocity, dt));

  return { ...ship, heading, angularVelocity, velocity, position };
}
