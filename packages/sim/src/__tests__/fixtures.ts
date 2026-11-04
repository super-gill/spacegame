import { GOODS } from '../goods.js';
import { HULLS } from '../hulls.js';
import { LOADOUTS } from '../loadouts.js';
import { MODULES } from '../modules.js';
import { fitStats, type Catalogues } from '../stats.js';
import type { Ship, ShipStats } from '../types.js';
import { WEAPONS } from '../weapons.js';

/**
 * Combat and cargo fields for hand-built test ships: plenty of shield and
 * structure, no fit and no weapons, empty hold. Spread into a fixture
 * before any overrides so tests about flight are not affected by combat.
 */
export const TEST_SHIP_COMBAT: Pick<
  Ship,
  'fit' | 'shield' | 'structure' | 'shieldDelayTicks' | 'weapons' | 'tractorActive' | 'hold' | 'locks' | 'activeLock' | 'weaponsHot' | 'capacitor' | 'fireGroup'
> = {
  fit: {},
  shield: 1000,
  structure: 1000,
  shieldDelayTicks: 0,
  weapons: [],
  tractorActive: false,
  hold: {},
  locks: [],
  activeLock: null,
  capacitor: 1000,
  fireGroup: 1,
  weaponsHot: false,
};

/** The code's catalogues, for computing stats in tests. */
export const TEST_CATALOGUES: Catalogues = { hulls: HULLS, modules: MODULES, weapons: WEAPONS, goods: GOODS };

/** Stats of a loadout as built, empty hold. */
export function loadoutStats(loadoutId: string): ShipStats {
  const loadout = LOADOUTS[loadoutId]!;
  return fitStats(TEST_CATALOGUES, HULLS[loadout.hullId]!, loadout.fit);
}

/** Flight stats for physics tests: the Aurel Tacet development ship as built. */
export const TEST_STATS: ShipStats = loadoutStats('aurel-tacet-dev');
