import type { HullSpec } from './types.js';

/**
 * Hull catalogue. Data only. Add hulls here; nothing else needs to change.
 *
 * Accelerations are force / mass, so a heavier hull with the same engines
 * is slower to speed up, stop and turn.
 */
export const HULLS: Record<string, HullSpec> = {
  sparrow: {
    id: 'sparrow',
    name: 'Sparrow',
    mass: 10,
    mainThrust: 1000, // 100 u/s^2
    reverseThrust: 500, // 50 u/s^2
    lateralThrust: 600, // 60 u/s^2
    maxSpeed: 350,
    rotationThrust: 60, // 6 rad/s^2: full spin in about 0.4 s
    maxTurnRate: 2.4, // about 140 degrees per second
    radius: 18,
  },
};
