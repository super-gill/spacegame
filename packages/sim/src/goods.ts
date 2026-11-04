import type { GoodSpec } from './types.js';

/**
 * Goods catalogue. Data only. Every unit of every good takes one unit of
 * cargo space; `unitMass` is what it adds to the ship's mass. Ammunition
 * is goods too (docs/weapons.md): guns load it from the hold.
 */
export const GOODS: Record<string, GoodSpec> = {
  scrap: { id: 'scrap', name: 'Scrap', unitMass: 0.3, basePrice: 8 },
  food: { id: 'food', name: 'Food', unitMass: 0.2, basePrice: 20 },
  ore: { id: 'ore', name: 'Ore', unitMass: 0.3, basePrice: 30 },
  machinery: { id: 'machinery', name: 'Machinery', unitMass: 0.4, basePrice: 85 },
  medicine: { id: 'medicine', name: 'Medicine', unitMass: 0.1, basePrice: 65 },
  // Ammunition. One unit is one round; a gun's magazine says how many it
  // holds. Rounds are cheap and everywhere; shells and charges less so.
  // One unit is a box. Plain ammunition takes the gun's own damage type
  // (null); special rounds later name their own and scale the damage.
  rounds: { id: 'rounds', name: 'Rounds (box of 20)', unitMass: 0.4, basePrice: 30, ammo: { perUnit: 20, damageType: null, damage: 1 } },
  shells: { id: 'shells', name: 'Shells (box of 4)', unitMass: 0.6, basePrice: 36, ammo: { perUnit: 4, damageType: null, damage: 1 } },
  charges: { id: 'charges', name: 'Charges (box of 10)', unitMass: 0.5, basePrice: 40, ammo: { perUnit: 10, damageType: null, damage: 1 } },
};
