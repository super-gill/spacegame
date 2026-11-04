/** Tuning constants. Everything that affects feel lives here or in a catalogue (hulls, modules, weapons). */

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

/**
 * Collision damage. A ship takes damage from how sharply its own velocity
 * changes in an impact (delta-v), not from closing speed. Momentum is
 * shared by mass, so in a ram the heavy ship's velocity barely changes and
 * the light ship's changes a lot: a big hull can ram a small one safely.
 * Station hulls are immovable, so the ship takes the whole change.
 *
 * Damage = (delta-v - safe delta-v) * damage per unit, when positive.
 */
export const IMPACT_SAFE_DELTA_V = 40;
export const IMPACT_DAMAGE_PER_DELTA_V = 0.5;

/** Ship to ship bounce: fraction of closing speed kept after impact. */
export const SHIP_RESTITUTION = 0.4;

/** Structure repaired per second while docked at a station. Shields refill at once. */
export const DOCK_REPAIR_PER_SECOND = 25;

/** A turret fires only when within this angle of its lead point, radians. About 5 degrees. */
export const TURRET_FIRE_TOLERANCE = 0.08;

/** Tractor beam reach from the ship centre, units. */
export const TRACTOR_RANGE = 260;
/** Speed loot is pulled towards the ship, relative to it, units/s. */
export const TRACTOR_PULL_SPEED = 140;
/** Loot this close to the hull edge is scooped into the hold, units. */
export const SCOOP_DISTANCE = 14;

/** Seconds a wreck drifts before it is gone. */
export const WRECK_LIFETIME = 45;
/** Seconds loot floats before it is gone. */
export const LOOT_LIFETIME = 90;
/**
 * Fraction of each good in the hold that survives a ship's destruction
 * as loot. The rest is lost. Piracy pays, but not everything.
 */
export const CARGO_SURVIVAL_FRACTION = 0.6;

/** Credits a new pilot starts with. */
export const STARTING_CREDITS = 1000;

/** Scrap dropped per unit of hull mass when a ship is destroyed. */
export const SCRAP_PER_MASS = 0.5;
/** Scrap canisters per destroyed ship, at most. */
export const MAX_LOOT_CANISTERS = 4;

/** When undocking, ships are placed this far outside the station and given this push. */
export const UNDOCK_CLEARANCE = 40;
export const UNDOCK_PUSH_SPEED = 30;

/** Seconds after taking damage before shields start recharging. */
export const SHIELD_REGEN_DELAY = 3;

/**
 * Fee for fitting or unfitting a module, as a fraction of its price,
 * charged each way and rounded up to whole credits. Handling, not buying:
 * an owned module costs only this to move between ship and storage.
 */
export const FIT_FEE_FRACTION = 0.05;

/**
 * Fraction of a module's price a station pays for a stored module sold
 * back to it. A placeholder until modules join the goods economy.
 */
export const MODULE_RESALE_FRACTION = 0.5;

/**
 * How much longer a new pilot in the starter fit survives the raider than
 * the raider survives them, at full damage output. Below this the first
 * pirate fight stops being winnable by a new player who fights back.
 */
export const STARTER_VS_RAIDER_MIN_EDGE = 1.4;

/**
 * Boarding in space: the ship being boarded must be within this distance
 * of the pilot's ship, centre to centre, units.
 */
export const BOARD_RANGE = 150;

/**
 * Target locks. Seconds to lock a ship of hull radius
 * LOCK_REFERENCE_RADIUS with scan resolution 1. Bigger ships lock faster
 * (time goes with the square root of reference radius over target
 * radius), better sensors faster (time divided by scan resolution).
 */
export const LOCK_BASE_SECONDS = 2.5;
export const LOCK_REFERENCE_RADIUS = 20;

/** Boarding in space: the two ships' relative speed may be at most this, units/s. */
export const BOARD_MAX_RELATIVE_SPEED = 20;

/** An escape pod keeps this fraction of its destroyed ship's velocity. */
export const POD_INHERIT_FRACTION = 0.3;

/** An escape pod is fired out to the ship's right at this speed, units/s, clear of the wreck. */
export const POD_EJECT_SPEED = 30;

/**
 * Stepping out: the pod leaves the ship's right side at this speed
 * relative to the ship, units/s. Gentle, so the pod can turn round and
 * board the ship again (under BOARD_MAX_RELATIVE_SPEED).
 */
export const POD_STEP_OUT_SPEED = 8;
