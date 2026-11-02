/** Tuning constants. Everything that affects feel lives here or in a HullSpec. */

/** Simulation runs at a fixed 60 ticks per second. */
export const TICKS_PER_SECOND = 60;
export const FIXED_DT = 1 / TICKS_PER_SECOND;

/**
 * Linear drag applied to velocity each second (fraction retained per second).
 * 1.0 would be pure Newtonian with no top speed. Slightly below 1.0 gives a
 * soft terminal velocity so ships cannot accelerate forever, the way
 * Flatspace felt. Tune towards 1.0 for floatier ships.
 */
export const DRAG_PER_SECOND = 0.75;

/** A ship must be slower than this (units/s) to dock. */
export const DOCK_MAX_SPEED = 60;

/** When undocking, ships are placed this far outside the station and given this push. */
export const UNDOCK_CLEARANCE = 40;
export const UNDOCK_PUSH_SPEED = 30;
