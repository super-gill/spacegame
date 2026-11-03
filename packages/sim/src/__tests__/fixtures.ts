import type { Ship } from '../types.js';

/**
 * Combat and cargo fields for hand-built test ships: plenty of shield and
 * structure, no weapons, empty hold. Spread into a fixture before any
 * overrides so tests about flight are not affected by combat.
 */
export const TEST_SHIP_COMBAT: Pick<
  Ship,
  'shield' | 'structure' | 'shieldDelayTicks' | 'weapons' | 'tractorActive' | 'hold' | 'targetId' | 'weaponsHot'
> = {
  shield: 1000,
  structure: 1000,
  shieldDelayTicks: 0,
  weapons: [],
  tractorActive: false,
  hold: {},
  targetId: null,
  weaponsHot: false,
};
