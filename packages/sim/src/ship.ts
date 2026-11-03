import { DRAG_PER_SECOND } from './constants.js';
import { wrapAngle } from './angle.js';
import type { HullSpec, PlayerInput, Ship } from './types.js';
import { add, fromAngle, length, normalise, rotate, scale, type Vec2 } from './vec2.js';

/**
 * Ship flight model.
 *
 * Newtonian: thrust adds to velocity, the ship keeps drifting, and the only
 * way to stop is to thrust the other way (or brake, which does that for you).
 * A soft drag gives a terminal velocity so ships have a top speed.
 */

/** Sum the thrust vector requested by the input, in world space. */
export function thrustFromInput(hull: HullSpec, heading: number, input: PlayerInput, velocity: Vec2): Vec2 {
  let force: Vec2 = { x: 0, y: 0 };

  const forward = fromAngle(heading);
  const right = rotate(forward, Math.PI / 2);

  if (input.thrustForward) force = add(force, scale(forward, hull.mainThrust));
  if (input.thrustReverse) force = add(force, scale(forward, -hull.reverseThrust));
  if (input.strafeRight) force = add(force, scale(right, hull.lateralThrust));
  if (input.strafeLeft) force = add(force, scale(right, -hull.lateralThrust));

  if (input.brake && length(velocity) > 0) {
    // Brake: push against the current velocity using the lateral thrust
    // figure as a stand-in for "all thrusters together".
    force = add(force, scale(normalise(velocity), -hull.lateralThrust));
  }

  return force;
}

/** Advance one ship by `dt` seconds under `input`. Returns a new Ship. */
export function stepShip(ship: Ship, hull: HullSpec, input: PlayerInput, dt: number): Ship {
  if (ship.state === 'docked') return ship;

  // Screen y points down, so increasing the angle turns clockwise on screen.
  // Both keys held cancel out.
  const turn = (input.turnRight ? 1 : 0) - (input.turnLeft ? 1 : 0);
  const heading = wrapAngle(ship.heading + turn * hull.turnRate * dt);

  const force = thrustFromInput(hull, heading, input, ship.velocity);
  const acceleration = scale(force, 1 / hull.mass);

  let velocity = add(ship.velocity, scale(acceleration, dt));

  // Soft drag: retain DRAG_PER_SECOND of velocity per second, scaled to dt.
  const retain = Math.pow(DRAG_PER_SECOND, dt);
  velocity = scale(velocity, retain);

  // Braking should actually reach zero rather than oscillate around it.
  if (input.brake && length(velocity) < 2) velocity = { x: 0, y: 0 };

  const position = add(ship.position, scale(velocity, dt));

  return { ...ship, heading, velocity, position };
}
