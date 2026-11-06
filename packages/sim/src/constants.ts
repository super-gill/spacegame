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

/** Capacitor spent for each point of shield restored. Shields are the capacitor's main steady customer. */
export const SHIELD_CAPACITOR_PER_POINT = 0.4;

/** A turret fires only when within this angle of its lead point, radians. About 5 degrees. */
export const TURRET_FIRE_TOLERANCE = 0.08;

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
 * charged each way and rounded up to whole credits. None for now (Jason,
 * docs/fitting.md): experimenting with a fit costs nothing once the
 * modules are bought.
 */
export const FIT_FEE_FRACTION = 0;

/**
 * Fraction of a module's price a station pays for a stored module sold
 * back to it. A placeholder until modules join the goods economy.
 */
export const MODULE_RESALE_FRACTION = 0.5;


/**
 * Boarding in space: the ship being boarded must be within this distance
 * of the pilot's ship, centre to centre, units.
 */
export const BOARD_RANGE = 150;

/**
 * Gravity eases from full strength to zero over the outer part of a
 * body's sphere of influence, from this fraction of the sphere's radius
 * to its edge, so crossing the edge never jolts a ship.
 */
export const GRAVITY_EASE_START = 0.75;

/**
 * Surface impacts. A body's surface is immovable like a station hull, so
 * a ship takes the whole bounce; damage uses the same delta-v rule as
 * hulls (IMPACT_SAFE_DELTA_V, IMPACT_DAMAGE_PER_DELTA_V).
 */
export const SURFACE_RESTITUTION = 0.3;
export const SURFACE_FRICTION = 0.2;

/**
 * Target locks. Seconds for a targeting computer of scan resolution 1 to
 * lock a hull of signature LOCK_REFERENCE_SIGNATURE. Time is divided by
 * the computer's scan resolution, and goes with the square root of the
 * reference signature over the target's: big freighters lock fast,
 * small or stealthy frames slowly.
 */
export const LOCK_BASE_SECONDS = 2.5;
export const LOCK_REFERENCE_SIGNATURE = 20;

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

// Munitions and countermeasures (docs/weapons.md, part 2; munitions.ts).

/** How quickly a munition reaches its speed: this many times its speed per second. */
export const MUNITION_ACCELERATION = 2;

/** A munition bursts this close to the hull of the ship it is homing on, units. */
export const MUNITION_PROXIMITY_FUSE = 6;

/** A heat seeker sees things within this angle either side of its nose, radians. About 50 degrees. */
export const HEAT_SEEKER_CONE = 0.87;

/** How far a heat seeker sees, units. */
export const HEAT_SEEKER_RANGE = 1200;

/** Chaff or a decoy draws radar seekers chasing its owner within this distance of it, units. */
export const RADAR_SPOOF_RANGE = 1500;

/** A munition chasing a decoy is spent when it gets this close, units. */
export const DECOY_FUSE = 10;

/** A dropped countermeasure leaves its ship this fast, astern, units/s. */
export const DECOY_DROP_SPEED = 40;

/** Shots hit a munition within this margin of its body: point defence fuzes, units. */
export const MUNITION_HIT_MARGIN = 3;

/** Point defence engages munitions within this fraction of the CIWS's range. */
export const POINT_DEFENCE_RANGE_FRACTION = 1;

/**
 * How far a stock shield wraps round the hull, radians, centred on the
 * bow: 270 degrees, leaving the stern quarter open for the main drive's
 * wash (docs/weapons.md, "Shield arcs").
 */
export const STOCK_SHIELD_ARC = (3 * Math.PI) / 2;

// Fitting step 4, costs (docs/fitting.md, "Costs that make choices").

/**
 * How much each size up slows a turret's traverse: S turns this many times
 * faster than M, and M than L (docs/turrets.md: S 3.0, M 1.5, L 0.75 rad/s
 * for main guns). The main lever that keeps big guns off small ships.
 */
export const TURRET_SLEW_FALLOFF = 2;
/** How fast a small main gun turret slews, rad/s; each size up is `TURRET_SLEW_FALLOFF` slower. */
export const GUN_TRAVERSE = 3;
/**
 * Half angle of each shot gun's cone, degrees (docs/turrets.md, "Range"):
 * a big target is hit anyway, a small one at long range mostly is not.
 * The same at every size.
 */
export const GUN_SPREAD_DEGREES = { autocannon: 2.0, blaster: 2.5, artillery: 0.8, railgun: 0.3 } as const;
/**
 * Close-in weapon systems (docs/turrets.md): a light round every 0.03 s
 * (two ticks, so 30 a second) at 2 damage, out to 350 units, traversing
 * 6 rad/s, with 2,000 rounds before a reload from the hold.
 */
export const CIWS = { damage: 2, fireInterval: 0.03, projectileSpeed: 1000, range: 350, traverse: 6, magazine: 2000, reloadSeconds: 6 } as const;
/** Lasers keep full power to half their range, then fade to 40% at full range: the beam spreads and the energy disperses. */
export const LASER_FALLOFF = { from: 0.5, floor: 0.4 } as const;
/**
 * Signature fitted kit adds to the hull's, by kind and size, unless the
 * module names its own (`ModuleSpec.stats.signature`). Big drives and big
 * guns are hot and bright; small kit adds nothing.
 */
export const KIT_SIGNATURE: Partial<Record<string, { S: number; M: number; L: number; XL: number }>> = {
  engine: { S: 2, M: 4, L: 8, XL: 16 },
  weapon: { S: 0, M: 1, L: 4, XL: 8 },
};
/** A burning afterburner blooms the ship's signature by this share: fast, but easy to see and to hit. */
export const AFTERBURNER_SIGNATURE_BLOOM = 0.5;
/**
 * How much each size up slows a gun's shot: a large shell flies this
 * squared slower than a small round, so a quick target can slip it at range.
 */
export const SHOT_SPEED_FALLOFF = 1.15;
// The Arena world (arena.ts, docs/worlds.md).
/** How far apart pilots' arenas are, and how far the first is from the system, units. */
export const ARENA_SEPARATION = 50000;
/** The most enemies an arena may hold. */
export const ARENA_MAX_ENEMIES = 8;
/** Seconds between an arena fight being decided and the pilot going back to the setup: long enough to see the last explosion. */
export const ARENA_END_DELAY_SECONDS = 3;
