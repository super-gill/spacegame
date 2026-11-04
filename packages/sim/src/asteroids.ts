import { BELT_ID, BELT_PERIOD, BELT_RING_RADIUS } from './bodies.js';
import { seededRandom } from './random.js';
import { bodyState, orbitState, railTime } from './rails.js';
import { RIDGE_PHASE } from './stations.js';
import type { Asteroid, Body, World } from './types.js';
import type { Vec2 } from './vec2.js';

/**
 * The Scree's rocks: generated once from a seed when the world is made,
 * then stored in the world like any other content. Most are scattered
 * round the ring; a denser field crowds round Ridge Outpost (the "ridge"
 * the Collective is dug into), kept clear of the outpost itself and of
 * its approach lane from the inner system.
 */

/** The seed the starter system's belt is generated from. */
export const SCREE_SEED = 0x5c7ee;

/** Rocks spread round the whole ring. */
const SCATTERED = 120;
/** Rocks in the field round Ridge Outpost. */
const RIDGE_FIELD = 60;
/** The field spans this far either side of Ridge along the ring, radians. */
const RIDGE_FIELD_SPREAD = 0.25;
/** No rock's edge comes closer than this to Ridge's centre, units: the Collective keeps its doorstep clear. */
const RIDGE_CLEARANCE = 1000;
/**
 * The Collective also keeps a lane clear from Ridge inward towards the
 * star, where its traffic comes from: no rocks on the inner side of the
 * ring within this angle of Ridge, radians.
 */
const RIDGE_LANE_HALF_ANGLE = 0.16;
const MIN_RADIUS = 18;
const MAX_RADIUS = 80;

export function screeAsteroids(seed = SCREE_SEED, ringWidth = 1400): Asteroid[] {
  const random = seededRandom(seed);
  const out: Asteroid[] = [];
  const ridgeAt = { x: Math.cos(RIDGE_PHASE) * BELT_RING_RADIUS, y: Math.sin(RIDGE_PHASE) * BELT_RING_RADIUS };
  let tries = 0;
  while (out.length < SCATTERED + RIDGE_FIELD && tries < 5000) {
    tries++;
    const inField = out.length >= SCATTERED;
    const phase = inField ? RIDGE_PHASE + (random() * 2 - 1) * RIDGE_FIELD_SPREAD : random() * Math.PI * 2;
    const radius = BELT_RING_RADIUS + (random() - 0.5) * ringWidth;
    // Small rocks are common, big ones rare.
    const size = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * random() * random();
    const at = { x: Math.cos(phase) * radius, y: Math.sin(phase) * radius };
    if (Math.hypot(at.x - ridgeAt.x, at.y - ridgeAt.y) < RIDGE_CLEARANCE + size) continue;
    const offRidge = Math.abs(Math.atan2(Math.sin(phase - RIDGE_PHASE), Math.cos(phase - RIDGE_PHASE)));
    if (radius < BELT_RING_RADIUS + size && offRidge < RIDGE_LANE_HALF_ANGLE) continue;
    out.push({ id: `rock-${out.length + 1}`, orbit: { parent: BELT_ID, radius, period: BELT_PERIOD, phase, direction: 1 }, radius: Math.round(size) });
  }
  return out;
}

/** Where each asteroid is at `tick`, and how it moves, in the same order. */
export function asteroidStates(bodies: Readonly<Record<string, Body>>, asteroids: readonly Asteroid[], tick: number, dt: number): { position: Vec2; velocity: Vec2 }[] {
  const time = railTime(tick, dt);
  const parents: Record<string, ReturnType<typeof bodyState>> = {};
  return asteroids.map((a) => {
    const parent = (parents[a.orbit.parent] ??= bodyState(bodies, a.orbit.parent, time));
    const s = orbitState(a.orbit, parent, time);
    return { position: s.position, velocity: s.velocity };
  });
}

/** Where each asteroid is now. */
export function asteroidPositions(world: Pick<World, 'bodies' | 'asteroids' | 'tick' | 'dt'>): { id: string; position: Vec2; radius: number }[] {
  const states = asteroidStates(world.bodies, world.asteroids, world.tick, world.dt);
  return world.asteroids.map((a, i) => ({ id: a.id, position: states[i]!.position, radius: a.radius }));
}
