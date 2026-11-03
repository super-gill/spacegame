/** Tuning constants. Everything that affects feel lives here or in a HullSpec. */

/** Simulation runs at a fixed 60 ticks per second. */
export const TICKS_PER_SECOND = 60;
export const FIXED_DT = 1 / TICKS_PER_SECOND;

/**
 * Space drag, in units/s^2: a small fixed deceleration opposing velocity.
 *
 * Its only job is to bleed off stray drift so a ship left alone eventually
 * comes to rest. It is deliberately tiny next to engine thrust (a Sparrow's
 * main engine gives 100 u/s^2) so it never fights the pilot. Top speed is
 * set per hull by `maxSpeed`, not by drag.
 */
export const SPACE_DRAG = 3;

/**
 * Angular drag, in rad/s^2: the rotational equivalent of SPACE_DRAG.
 * Stray spin dies away slowly; deliberate rotation is unaffected.
 */
export const SPACE_ANGULAR_DRAG = 0.2;

/** A ship must be slower than this (units/s) to dock. */
export const DOCK_MAX_SPEED = 60;

/** When undocking, ships are placed this far outside the station and given this push. */
export const UNDOCK_CLEARANCE = 40;
export const UNDOCK_PUSH_SPEED = 30;
