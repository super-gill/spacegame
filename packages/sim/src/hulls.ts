import type { HullSpec } from './types.js';

/**
 * Hull catalogue. Data only. Add hulls here; nothing else needs to change.
 */
export const HULLS: Record<string, HullSpec> = {
  sparrow: {
    id: 'sparrow',
    name: 'Sparrow',
    mass: 10,
    mainThrust: 1000,
    reverseThrust: 500,
    lateralThrust: 600,
    turnRate: 3.2,
    radius: 18,
  },
};
