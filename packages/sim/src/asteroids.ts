import { BELT_ID, BELT_PERIOD, BELT_RING_RADIUS } from './bodies.js';
import { GOODS, oreGoods } from './goods.js';
import { seededRandom } from './random.js';
import { bodyState, orbitAngle, orbitState, railTime, withOrbitMoving } from './rails.js';
import { RIDGE_ID, RIDGE_PHASE } from './stations.js';
import type { Asteroid, Body, GoodSpec, Orbit, OreTier, Rockfall, World } from './types.js';
import type { Vec2 } from './vec2.js';

/**
 * The Scree's rocks: generated once from a seed when the world is made,
 * then stored in the world like any other content. Most are scattered
 * round the ring; a denser field crowds round Ridge Outpost (the "ridge"
 * the Collective is dug into), kept clear of the outpost itself and of
 * its approach lane from the inner system.
 *
 * Rocks hold ore (docs/mining.md): each is mostly common ore, some hold
 * richer ores, and bigger rocks are harder to cut. Mined out, a rock
 * crumbles away; each field slowly tops itself back up (`stepRockfall`).
 */

/** The seed the starter system's belt is generated from. */
export const SCREE_SEED = 0x5c7ee;

/** The Scree's fields and how many rocks each keeps: rocks spread round the whole ring, and the field round Ridge Outpost. */
export const ROCK_FIELDS: readonly { id: string; target: number }[] = [
  { id: 'ring', target: 120 },
  { id: 'ridge', target: 60 },
];
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
const RING_WIDTH = 1400;

/** Ore in a rock per unit of radius squared: a rock of radius 18 holds about 27 units, one of 80 about 530. */
const ORE_PER_AREA = 1 / 12;
/** Hardness from size: the smallest rocks are this soft, the biggest this plus HARDNESS_SPAN. */
const HARDNESS_MIN = 0.1;
const HARDNESS_SPAN = 0.8;
/** How far a rock's hardness may stray from its size's, either way. */
const HARDNESS_JITTER = 0.08;

/** Seconds between rockfall checks. Each check adds at most one rock to each field below its target. */
export const ROCKFALL_SECONDS = 20;
/** A new rock never appears closer than this to a ship, units, so nobody sees it arrive. */
const ROCKFALL_CLEARANCE = 1500;
/** Placement attempts per new rock before giving up until the next check. */
const ROCKFALL_TRIES = 40;

/** Only rocks at least this big can hide a gate-glass core (docs/mining.md, "Breaching"). */
export const CORE_MIN_RADIUS = 50;
/** The share of such rocks that do. */
const CORE_CHANCE = 0.3;

/** What a new rock of this radius holds, and how hard it is. Draws from `random`. */
export function rockMakeup(random: () => number, radius: number, goods: Readonly<Record<string, GoodSpec>> = GOODS): Pick<Asteroid, 'contents' | 'hardness' | 'core'> {
  const size = Math.max(0, Math.min(1, (radius - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS)));
  const hardness = Math.max(0.05, Math.min(1, HARDNESS_MIN + HARDNESS_SPAN * size + (random() * 2 - 1) * HARDNESS_JITTER));
  const total = Math.max(1, Math.round(radius * radius * ORE_PER_AREA));
  const contents: Record<string, number> = {};
  const ores = oreGoods(goods);
  let left = total;
  // Richer ores first, each by its chance; the common ore fills the rest.
  for (const good of ores) {
    const spec = good.ore!;
    if (spec.share <= 0 || radius < spec.minRadius) continue;
    if (random() >= spec.chance) continue;
    const amount = Math.min(left, Math.max(1, Math.round(total * spec.share * (0.6 + random() * 0.8))));
    if (amount <= 0) continue;
    contents[good.id] = amount;
    left -= amount;
  }
  const common = ores.find((g) => g.ore!.tier === 'common');
  if (left > 0 && common) contents[common.id] = (contents[common.id] ?? 0) + left;
  const core = rockCore(random, radius, goods);
  return { contents, hardness: Math.round(hardness * 100) / 100, ...(core ? { core } : {}) };
}

/** Some big rocks hide a gate-glass core, with two or three breach points round them; null for the rest. */
export function rockCore(random: () => number, radius: number, goods: Readonly<Record<string, GoodSpec>> = GOODS): Asteroid['core'] | null {
  if (radius < CORE_MIN_RADIUS || !goods['gate-glass'] || random() >= CORE_CHANCE) return null;
  const glass = 20 + Math.round(random() * 20);
  const count = random() < 0.5 ? 2 : 3;
  const start = random() * Math.PI * 2;
  const points = Array.from({ length: count }, (_, i) => Math.round(((start + (i * Math.PI * 2) / count + (random() - 0.5) * 0.6) % (Math.PI * 2)) * 1000) / 1000);
  return { glass, points };
}

/**
 * One rock for `field`, placed as the belt stood at tick 0 (Ridge at
 * `RIDGE_PHASE`), or null if the spot drawn breaks the Collective's
 * clearances.
 */
function drawRock(random: () => number, field: string, id: string, goods: Readonly<Record<string, GoodSpec>>, ringWidth = RING_WIDTH): Asteroid | null {
  const ridgeAt = { x: Math.cos(RIDGE_PHASE) * BELT_RING_RADIUS, y: Math.sin(RIDGE_PHASE) * BELT_RING_RADIUS };
  const phase = field === 'ridge' ? RIDGE_PHASE + (random() * 2 - 1) * RIDGE_FIELD_SPREAD : random() * Math.PI * 2;
  const radius = BELT_RING_RADIUS + (random() - 0.5) * ringWidth;
  // Small rocks are common, big ones rare.
  const size = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * random() * random();
  const at = { x: Math.cos(phase) * radius, y: Math.sin(phase) * radius };
  if (Math.hypot(at.x - ridgeAt.x, at.y - ridgeAt.y) < RIDGE_CLEARANCE + size) return null;
  const offRidge = Math.abs(Math.atan2(Math.sin(phase - RIDGE_PHASE), Math.cos(phase - RIDGE_PHASE)));
  if (radius < BELT_RING_RADIUS + size && offRidge < RIDGE_LANE_HALF_ANGLE) return null;
  const rockRadius = Math.round(size);
  return {
    id,
    orbit: { parent: BELT_ID, radius, period: BELT_PERIOD, phase, direction: 1 },
    radius: rockRadius,
    ...rockMakeup(random, rockRadius, goods),
    field,
  };
}

export function screeAsteroids(seed = SCREE_SEED, ringWidth = RING_WIDTH, goods: Readonly<Record<string, GoodSpec>> = GOODS): Asteroid[] {
  const random = seededRandom(seed);
  const out: Asteroid[] = [];
  const total = ROCK_FIELDS.reduce((n, f) => n + f.target, 0);
  let tries = 0;
  while (out.length < total && tries < 5000) {
    tries++;
    // Fields in order: the ring's rocks first, then Ridge's.
    let before = 0;
    const field = ROCK_FIELDS.find((f) => out.length < (before += f.target))!;
    const rock = drawRock(random, field.id, `rock-${out.length + 1}`, goods, ringWidth);
    if (rock) out.push(rock);
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

/** One rock by id, where it is at `tick` (default now), or null if there is no such rock. */
export function rockAt(world: Pick<World, 'bodies' | 'asteroids' | 'tick' | 'dt'>, id: string, tick = world.tick): { rock: Asteroid; position: Vec2; velocity: Vec2 } | null {
  const rock = world.asteroids.find((a) => a.id === id);
  if (!rock) return null;
  const s = asteroidStates(world.bodies, [rock], tick, world.dt)[0]!;
  return { rock, position: s.position, velocity: s.velocity };
}

/** The world bearing of a rock's seam from its centre: fixed for the rock, from its id. Rocks do not turn. */
export function rockSeam(rockId: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < rockId.length; i++) h = Math.imul(h ^ rockId.charCodeAt(i), 0x01000193);
  return ((h >>> 0) / 4294967296) * Math.PI * 2 - Math.PI;
}

/** Units of ore left in a rock. */
export function oreLeft(rock: Pick<Asteroid, 'contents'>): number {
  return Object.values(rock.contents).reduce((n, q) => n + q, 0);
}

const TIER_RANK: Record<OreTier, number> = { common: 0, middling: 1, valuable: 2, rare: 3 };

/** The best tier of ore a rock holds, or null if it holds none the catalogue knows. */
export function bestTier(rock: Pick<Asteroid, 'contents'>, goods: Readonly<Record<string, GoodSpec>>): OreTier | null {
  let best: OreTier | null = null;
  for (const [id, q] of Object.entries(rock.contents)) {
    const tier = goods[id]?.ore?.tier;
    if (q > 0 && tier && (best === null || TIER_RANK[tier] > TIER_RANK[best])) best = tier;
  }
  return best;
}

/**
 * The belt tops itself up. Every `ROCKFALL_SECONDS`, each field with
 * fewer rocks than its target gains one, drifting in somewhere no ship is
 * near enough to see it arrive. Seeded by how many rocks have been made,
 * so a world replays the same way. New rocks keep to the belt's current
 * motion: frozen with everything else when orbits are stopped.
 */
export function stepRockfall(world: World): Pick<World, 'asteroids' | 'rockfall'> {
  const state: Rockfall = world.rockfall ?? { made: 0, timerTicks: Math.round(ROCKFALL_SECONDS / world.dt) };
  if (state.timerTicks > 1) return { asteroids: world.asteroids, rockfall: { ...state, timerTicks: state.timerTicks - 1 } };

  const time = railTime(world.tick, world.dt);
  const ridge = world.stations[RIDGE_ID];
  // Rocks are drawn as the belt stood at tick 0; turn them to where Ridge is now.
  const shift = ridge?.orbit ? orbitAngle(ridge.orbit, time) - RIDGE_PHASE : 0;
  const beltAt = bodyState(world.bodies, BELT_ID, time).position;
  const ships = Object.values(world.ships).filter((s) => s.state === 'flying');
  let asteroids = world.asteroids;
  let made = state.made;

  for (const field of ROCK_FIELDS) {
    if (asteroids.filter((a) => a.field === field.id).length >= field.target) continue;
    made++;
    const random = seededRandom((SCREE_SEED + Math.imul(made, 0x9e3779b1)) >>> 0);
    for (let t = 0; t < ROCKFALL_TRIES; t++) {
      const drawn = drawRock(random, field.id, `rock-n${made}`, world.goods);
      if (!drawn) continue;
      const angle = drawn.orbit.phase + shift;
      const at = { x: beltAt.x + Math.cos(angle) * drawn.orbit.radius, y: beltAt.y + Math.sin(angle) * drawn.orbit.radius };
      if (ships.some((s) => Math.hypot(s.position.x - at.x, s.position.y - at.y) < ROCKFALL_CLEARANCE + drawn.radius)) continue;
      const others = asteroidStates(world.bodies, asteroids, world.tick, world.dt);
      if (others.some((o, i) => Math.hypot(o.position.x - at.x, o.position.y - at.y) < asteroids[i]!.radius + drawn.radius + 10)) continue;
      const still: Orbit = { ...drawn.orbit, phase: angle, frozen: true };
      asteroids = [...asteroids, { ...drawn, orbit: world.rules.orbits ? withOrbitMoving(still, true, time) : still }];
      break;
    }
  }
  return { asteroids, rockfall: { made, timerTicks: Math.round(ROCKFALL_SECONDS / world.dt) } };
}
