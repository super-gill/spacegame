import type { GoodSpec } from './types.js';

/**
 * Goods catalogue. Data only. Every unit of every good takes one unit of
 * cargo space; `unitMass` is what it adds to the ship's mass.
 */
export const GOODS: Record<string, GoodSpec> = {
  scrap: { id: 'scrap', name: 'Scrap', unitMass: 0.3, basePrice: 8 },
  food: { id: 'food', name: 'Food', unitMass: 0.2, basePrice: 20 },
  ore: { id: 'ore', name: 'Ore', unitMass: 0.3, basePrice: 30 },
  machinery: { id: 'machinery', name: 'Machinery', unitMass: 0.4, basePrice: 85 },
  medicine: { id: 'medicine', name: 'Medicine', unitMass: 0.1, basePrice: 65 },
};
