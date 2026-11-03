/** Tuning constants. Everything that affects feel lives here or in a HullSpec. */

/** Simulation runs at a fixed 60 ticks per second. */
export const TICKS_PER_SECOND = 60;
export const FIXED_DT = 1 / TICKS_PER_SECOND;

/**
 * There is no space drag. Physics is pure Newtonian: a ship left alone
 * drifts and spins forever. Anything that feels like drag comes from the
 * flight computer firing real thrusters (see flight.ts).
 */

/**
 * Fraction of thruster strength the full-assist mode spends cancelling
 * drift on axes the pilot is not using. Below 1 so assisted flight eases
 * to a stop like drag, rather than slamming to a halt.
 */
export const ASSIST_LINEAR_STRENGTH = 0.5;

/**
 * Fraction of rotation thruster strength the assist spends cancelling
 * spin when no rotate key is held. Full strength, because stopping
 * crisply on a heading is the point of rotation assist.
 */
export const ASSIST_ROTATION_STRENGTH = 1;

/** Brake always uses every relevant thruster at full strength. */
export const BRAKE_STRENGTH = 1;

/**
 * Speeds below this (units/s or rad/s) are treated as exactly zero.
 * Only mops up floating-point dust after the computer cancels motion;
 * it is far too small to feel like drag.
 */
export const REST_EPSILON = 1e-9;

/** A ship must be slower than this (units/s) to dock. */
export const DOCK_MAX_SPEED = 60;

/**
 * Station hull collisions. Restitution is the fraction of the inward
 * speed kept after bouncing off; friction is the fraction of sliding
 * speed lost at contact.
 */
export const HULL_RESTITUTION = 0.4;
export const HULL_FRICTION = 0.1;

/** Impacts slower than this (units/s) are contact, not collision, and raise no event. */
export const COLLISION_EVENT_MIN_SPEED = 8;

/** When undocking, ships are placed this far outside the station and given this push. */
export const UNDOCK_CLEARANCE = 40;
export const UNDOCK_PUSH_SPEED = 30;
