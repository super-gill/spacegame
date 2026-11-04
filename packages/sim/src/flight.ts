import { ASSIST_LINEAR_STRENGTH, ASSIST_ROTATION_STRENGTH, BRAKE_STRENGTH } from './constants.js';
import type { FlightMode, ShipStats, ShipInput, Ship, Thrusters } from './types.js';
import { fromAngle, rotate, type Vec2 } from './vec2.js';

/**
 * Flight computer.
 *
 * Turns pilot intent (a ShipInput) plus the ship's flight mode into
 * thruster throttles. It never touches velocity or position itself; the
 * physics in ship.ts applies whatever it decides. So an assist can only do
 * what the hull's real thrusters can do: a heavy hull with weak thrusters
 * is just as sluggish to settle in assisted mode as it is to stop by hand.
 *
 * NPC ships will use this same computer, so they fly by the same rules.
 *
 * Priority on each axis, highest first:
 *   1. Brake: cancel motion on every axis, ignoring pilot keys.
 *   2. Pilot keys: fire what was asked for.
 *   3. Assist: if the mode allows it and no key is held on that axis,
 *      cancel motion on that axis.
 */

/** Order the cycle key steps through, and the default for new ships. */
export const FLIGHT_MODES: readonly FlightMode[] = ['assisted', 'rotation', 'manual'];

export const FLIGHT_MODE_LABELS: Record<FlightMode, string> = {
  assisted: 'Full assist',
  rotation: 'Rotation assist',
  manual: 'Manual',
};

export function nextFlightMode(mode: FlightMode): FlightMode {
  const i = FLIGHT_MODES.indexOf(mode);
  return FLIGHT_MODES[(i + 1) % FLIGHT_MODES.length]!;
}

export function idleThrusters(): Thrusters {
  return { main: 0, reverse: 0, strafeLeft: 0, strafeRight: 0, rotateLeft: 0, rotateRight: 0 };
}

/** The ship's forward and right unit vectors in world space. */
export function shipAxes(heading: number): { forward: Vec2; right: Vec2 } {
  const forward = fromAngle(heading);
  return { forward, right: rotate(forward, Math.PI / 2) };
}

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

/**
 * Throttle needed to cancel `speed` along one axis in one tick, capped at
 * `strength`. Asking for exactly enough (rather than full burn) is what
 * makes the ship settle at zero instead of overshooting and jittering.
 */
function cancelThrottle(speed: number, accel: number, dt: number, strength: number): number {
  if (accel <= 0) return 0;
  return Math.min(strength, Math.abs(speed) / (accel * dt));
}

/**
 * Cancel motion on one axis using a pair of opposing thrusters.
 * `plusAccel` pushes along the positive axis, `minusAccel` along the negative.
 */
function cancelAxis(
  speed: number,
  plusAccel: number,
  minusAccel: number,
  dt: number,
  strength: number,
): { plus: number; minus: number } {
  if (speed > 0) return { plus: 0, minus: cancelThrottle(speed, minusAccel, dt, strength) };
  if (speed < 0) return { plus: cancelThrottle(speed, plusAccel, dt, strength), minus: 0 };
  return { plus: 0, minus: 0 };
}

const on = (held: boolean): number => (held ? 1 : 0);

/**
 * Decide this tick's thruster throttles. Pure.
 *
 * `frame` is the velocity of the ship's local frame (rails.ts): assist
 * and brake cancel motion relative to it, so full assist holds a ship
 * still beside a moving station or in a moving body's sphere. Zero in
 * flat space.
 */
export function computeThrusters(ship: Ship, stats: ShipStats, input: ShipInput, dt: number, frame: Vec2 = { x: 0, y: 0 }): Thrusters {
  const { forward, right } = shipAxes(ship.heading);
  const relative = { x: ship.velocity.x - frame.x, y: ship.velocity.y - frame.y };
  const forwardSpeed = dot(relative, forward);
  const rightSpeed = dot(relative, right);

  const mainAccel = stats.mainThrust / stats.mass;
  const reverseAccel = stats.reverseThrust / stats.mass;
  const lateralAccel = stats.lateralThrust / stats.mass;
  const rotationAccel = stats.rotationThrust / stats.mass;

  const linearAssist = ship.flightMode === 'assisted';
  const rotationAssist = ship.flightMode === 'assisted' || ship.flightMode === 'rotation';

  const out = idleThrusters();

  // Forward / back axis.
  const pilotForwardAxis = input.thrustForward || input.thrustReverse;
  if (input.brake || (linearAssist && !pilotForwardAxis)) {
    const strength = input.brake ? BRAKE_STRENGTH : ASSIST_LINEAR_STRENGTH;
    const c = cancelAxis(forwardSpeed, mainAccel, reverseAccel, dt, strength);
    out.main = c.plus;
    out.reverse = c.minus;
  } else {
    out.main = on(input.thrustForward);
    out.reverse = on(input.thrustReverse);
  }

  // Lateral axis.
  const pilotLateralAxis = input.strafeLeft || input.strafeRight;
  if (input.brake || (linearAssist && !pilotLateralAxis)) {
    const strength = input.brake ? BRAKE_STRENGTH : ASSIST_LINEAR_STRENGTH;
    const c = cancelAxis(rightSpeed, lateralAccel, lateralAccel, dt, strength);
    out.strafeRight = c.plus;
    out.strafeLeft = c.minus;
  } else {
    out.strafeLeft = on(input.strafeLeft);
    out.strafeRight = on(input.strafeRight);
  }

  // Rotation. Positive spin is clockwise on screen.
  const pilotRotating = input.turnLeft || input.turnRight;
  if (input.brake || (rotationAssist && !pilotRotating)) {
    const strength = input.brake ? BRAKE_STRENGTH : ASSIST_ROTATION_STRENGTH;
    const c = cancelAxis(ship.angularVelocity, rotationAccel, rotationAccel, dt, strength);
    out.rotateRight = c.plus;
    out.rotateLeft = c.minus;
  } else {
    out.rotateLeft = on(input.turnLeft);
    out.rotateRight = on(input.turnRight);
  }

  return out;
}
