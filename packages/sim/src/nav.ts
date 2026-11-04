import { localFrame, bodyStates, gravityFrom, innermostBody, railTime, type LocalFrame } from './rails.js';
import { shipStats } from './stats.js';
import type { Ship, World } from './types.js';
import { add, length, scale, sub, type Vec2 } from './vec2.js';

/**
 * The navigation computer: what a ship knows about where it is and where
 * it is going. Every stock fit carries one; explorers fit bigger ones that
 * see further ahead (`ShipStats.navHorizon`). Without one a pilot flies by
 * eye: `navReadout` is null, so no speed, no orbit, no path, no gravity
 * warnings.
 *
 * Like `lockReadout`, this is the only way the client learns these
 * things; it never works them out from the world itself.
 */

/** How far apart predicted path points are, seconds. */
export const PATH_STEP_SECONDS = 0.25;

/** Gravity warning tiers, against the ship's own main thrust (docs/system.md, "Warnings"). */
export type GravityTier = 'none' | 'advisory' | 'caution' | 'warning' | 'alarm';

/** Gravity over main thrust above which each tier starts. */
export const GRAVITY_TIERS = { caution: 0.25, warning: 0.6, alarm: 1 } as const;

/** A free orbit round the body whose sphere you are in, worked out from position and velocity relative to it. */
export interface OrbitReadout {
  bodyId: string;
  /** Distance from the centre at the lowest point, units. */
  periapsis: number;
  /** Distance from the centre at the highest point, units. Infinity if not bound to the body. */
  apoapsis: number;
  /** Heights above the surface. A negative periapsis altitude means this orbit meets the surface. */
  periapsisAltitude: number;
  apoapsisAltitude: number;
  /** False if the ship is on an escape path, or its high point is beyond the sphere. */
  bound: boolean;
}

/** Where the ship will be if it coasts, as far ahead as the nav computer sees. */
export interface PathReadout {
  /**
   * The body the path is drawn relative to (the innermost at the start),
   * or null in flat space. Points are offsets from that body's centre at
   * each future moment, so the path reads as the orbit you will fly; in
   * flat space they are system positions.
   */
  relativeTo: string | null;
  /** One point every PATH_STEP_SECONDS, starting with now. */
  points: Vec2[];
  /** The first surface the path meets, and in how many seconds, or null. */
  impact: { bodyId: string; seconds: number } | null;
}

export interface NavReadout {
  /** What speed is measured against. */
  frame: LocalFrame;
  /** Velocity relative to the frame, and its size. */
  relativeVelocity: Vec2;
  speed: number;
  position: Vec2;
  /** The pull here, from the innermost body with gravity, against main thrust. */
  gravity: { bodyId: string | null; acceleration: Vec2; strength: number; ratio: number; tier: GravityTier };
  orbit: OrbitReadout | null;
  path: PathReadout;
}

/** The warning tier for a gravity of `strength` against a main engine giving `mainAccel`. */
export function gravityTier(strength: number, mainAccel: number, inWell: boolean): GravityTier {
  if (!inWell) return 'none';
  const ratio = mainAccel > 0 ? strength / mainAccel : Infinity;
  if (ratio > GRAVITY_TIERS.alarm) return 'alarm';
  if (ratio > GRAVITY_TIERS.warning) return 'warning';
  if (ratio > GRAVITY_TIERS.caution) return 'caution';
  return 'advisory';
}

/**
 * Orbit elements from position and velocity relative to a body of
 * gravitational parameter `mu`: energy gives the size, angular momentum
 * the shape. Ignores the eased edge of the sphere, which only matters
 * near it.
 */
export function orbitElements(relPosition: Vec2, relVelocity: Vec2, mu: number): { periapsis: number; apoapsis: number } {
  const r = length(relPosition);
  const v2 = relVelocity.x * relVelocity.x + relVelocity.y * relVelocity.y;
  const energy = v2 / 2 - mu / r;
  const h = relPosition.x * relVelocity.y - relPosition.y * relVelocity.x;
  const e = Math.sqrt(Math.max(0, 1 + (2 * energy * h * h) / (mu * mu)));
  if (energy >= 0) return { periapsis: (h * h) / (mu * (1 + e)), apoapsis: Infinity };
  const a = -mu / (2 * energy);
  return { periapsis: a * (1 - e), apoapsis: a * (1 + e) };
}

/**
 * Predict a coasting path for `seconds` from `position` and `velocity` at
 * `tick`: gravity and carrying as the sim applies them, at a coarser step.
 * No thrust, no collisions with ships or stations.
 */
export function predictPath(world: Pick<World, 'bodies' | 'tick' | 'dt' | 'rules'>, position: Vec2, velocity: Vec2, seconds: number): PathReadout {
  const bodies = world.bodies;
  const start = railTime(world.tick, world.dt);
  const startStates = bodyStates(bodies, start);
  const frameBody = innermostBody(bodies, startStates, position);
  const relativeTo = frameBody?.id ?? null;
  const steps = Math.max(0, Math.floor(seconds / PATH_STEP_SECONDS));

  const points: Vec2[] = [];
  let impact: PathReadout['impact'] = null;
  let x = position;
  let v = velocity;
  let states = startStates;
  for (let i = 0; i <= steps; i++) {
    const t = start + i * PATH_STEP_SECONDS;
    points.push(relativeTo ? sub(x, states[relativeTo]!.position) : x);
    if (i === steps) break;
    // Surface first: once it is reached the path ends.
    const hit = Object.keys(bodies)
      .sort()
      .find((id) => bodies[id]!.radius > 0 && length(sub(x, states[id]!.position)) < bodies[id]!.radius);
    if (hit) {
      impact = { bodyId: hit, seconds: i * PATH_STEP_SECONDS };
      break;
    }
    const next = bodyStates(bodies, t + PATH_STEP_SECONDS);
    const carrier = innermostBody(bodies, states, x);
    const g = carrier && world.rules.gravity ? gravityFrom(carrier, states[carrier.id]!, x) : { x: 0, y: 0 };
    let nv = add(v, scale(g, PATH_STEP_SECONDS));
    let nx = add(x, scale(nv, PATH_STEP_SECONDS));
    if (carrier) {
      const a = states[carrier.id]!;
      const b = next[carrier.id]!;
      nx = add(nx, sub(sub(b.position, a.position), scale(a.velocity, PATH_STEP_SECONDS)));
      nv = add(nv, sub(b.velocity, a.velocity));
    }
    x = nx;
    v = nv;
    states = next;
  }
  return { relativeTo, points, impact };
}

/**
 * Everything the ship's nav computer tells its pilot, or null with no nav
 * computer fitted. The path reaches as far ahead as the computer sees.
 */
export function navReadout(world: World, ship: Ship): NavReadout | null {
  const stats = shipStats(world, ship);
  if (stats.navHorizon <= 0) return null;
  const frame = localFrame(world, ship);
  const relativeVelocity = sub(ship.velocity, frame.velocity);
  const states = bodyStates(world.bodies, railTime(world.tick, world.dt));
  const body = innermostBody(world.bodies, states, ship.position);
  const docked = ship.state === 'docked';

  // With gravity off (`World.rules`) there is no well, no pull and no orbit to read.
  const pulls = world.rules.gravity && !!body && body.gravity > 0 && !docked;
  const acceleration = pulls ? gravityFrom(body!, states[body!.id]!, ship.position) : { x: 0, y: 0 };
  const strength = length(acceleration);
  const mainAccel = stats.mass > 0 ? stats.mainThrust / stats.mass : 0;
  const inWell = pulls;
  const ratio = mainAccel > 0 ? strength / mainAccel : strength > 0 ? Infinity : 0;

  let orbit: OrbitReadout | null = null;
  if (pulls) {
    const state = states[body!.id]!;
    const el = orbitElements(sub(ship.position, state.position), sub(ship.velocity, state.velocity), body!.gravity);
    const bound = Number.isFinite(el.apoapsis) && el.apoapsis < body!.sphere;
    orbit = {
      bodyId: body!.id,
      periapsis: el.periapsis,
      apoapsis: el.apoapsis,
      periapsisAltitude: el.periapsis - body!.radius,
      apoapsisAltitude: el.apoapsis - body!.radius,
      bound,
    };
  }

  const path = docked ? { relativeTo: null, points: [], impact: null } : predictPath(world, ship.position, ship.velocity, stats.navHorizon);
  return {
    frame,
    relativeVelocity,
    speed: length(relativeVelocity),
    position: ship.position,
    gravity: { bodyId: inWell ? body!.id : null, acceleration, strength, ratio, tier: gravityTier(strength, mainAccel, inWell) },
    orbit,
    path,
  };
}
