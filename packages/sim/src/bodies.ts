import { circularPeriod } from './rails.js';
import type { Body, Orbit } from './types.js';

/**
 * The starter system's natural bodies, as data: Calder, a star with one
 * planet, its moon, and an asteroid belt. Content, not engine: later
 * systems are generated once from a seed and stored in the world in this
 * same shape (docs/system.md).
 *
 * Names from the lore (docs/lore.md, "Bodies"): Fieldmark, a farmed
 * garden world; Lantern, its ice moon; the Scree, the belt.
 *
 * Sizes and periods are for play time, since the world never pauses:
 * a low orbit round the planet (Harbour's) takes two minutes, the moon
 * about seven, the planet half an hour round the star and the belt an
 * hour and a half. Planet and belt orbits sit outside the star's sphere,
 * so their periods are free; anything inside a sphere orbits at the
 * period its parent's gravity gives.
 */

export const STAR_ID = 'body-calder';
export const PLANET_ID = 'body-calder-1';
export const MOON_ID = 'body-calder-1a';
export const BELT_ID = 'body-calder-belt';

/** The planet's gravitational parameter, units^3/s^2. Sets Harbour's and the moon's periods. */
export const PLANET_GRAVITY = 2.0e6;

/** How far out the belt's ring is from the star, units. Ridge sits on it. */
export const BELT_RING_RADIUS = 9000;

/** The belt's turn, seconds. Ridge Outpost and the pirates' home turn with it. */
export const BELT_PERIOD = 5400;

/** Where the moon orbits the planet, units from its centre. */
const MOON_ORBIT_RADIUS = 2000;

/** An orbit round `parent` inside its sphere: the period comes from the parent's gravity. */
export function boundOrbit(parent: string, parentGravity: number, radius: number, phase: number, direction: 1 | -1 = 1): Orbit {
  return { parent, radius, period: circularPeriod(parentGravity, radius), phase, direction };
}

export function starterBodies(): Record<string, Body> {
  const star: Body = {
    id: STAR_ID,
    name: 'Calder',
    kind: 'star',
    orbit: null,
    radius: 500,
    gravity: 7.5e6,
    // Only the star's own neighbourhood: you can still park in open space.
    sphere: 1200,
  };
  const planet: Body = {
    id: PLANET_ID,
    name: 'Fieldmark',
    kind: 'planet',
    orbit: { parent: STAR_ID, radius: 4500, period: 1800, phase: 0, direction: 1 },
    radius: 400,
    gravity: PLANET_GRAVITY,
    // Holds Harbour's orbit, its security zone and the moon's sphere.
    sphere: 2600,
  };
  const moon: Body = {
    id: MOON_ID,
    name: 'Lantern',
    kind: 'moon',
    orbit: boundOrbit(PLANET_ID, PLANET_GRAVITY, MOON_ORBIT_RADIUS, Math.PI),
    radius: 150,
    gravity: 1.2e5,
    sphere: 450,
  };
  const belt: Body = {
    id: BELT_ID,
    name: 'The Scree',
    kind: 'belt',
    // Sits on the star and only turns; the ring is what you see.
    orbit: { parent: STAR_ID, radius: 0, period: BELT_PERIOD, phase: 0, direction: 1 },
    radius: 0,
    gravity: 0,
    sphere: 0,
    ring: { radius: BELT_RING_RADIUS, width: 1400 },
  };
  return Object.fromEntries([star, planet, moon, belt].map((b) => [b.id, b]));
}
