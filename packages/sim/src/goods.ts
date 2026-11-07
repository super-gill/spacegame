import type { GoodSpec } from './types.js';

/**
 * Goods catalogue. Data only. Every unit of every good takes one unit of
 * cargo space; `unitMass` is what it adds to the ship's mass. Ammunition
 * is goods too (docs/weapons.md): guns load it from the hold.
 */
export const GOODS: Record<string, GoodSpec> = {
  scrap: { id: 'scrap', name: 'Scrap', unitMass: 0.3, basePrice: 8 },
  food: { id: 'food', name: 'Food', unitMass: 0.2, basePrice: 20 },
  // Ores (docs/mining.md). The ore catalogue is every good with an `ore`
  // block: add one here and rocks made from then on can hold it. The
  // Scree is nickel-iron and ice; names are from docs/lore.md. The common
  // ore keeps the id `ore` so saves and markets are untouched. Every rock is
  // mostly common ore; richer ores turn up in some rocks, the best only
  // in bigger, harder ones.
  // Drones: bought into a drone bay, not the hold (docs/drones.md).
  'mining-drone': { id: 'mining-drone', name: 'Knocker (mining drone)', unitMass: 0.6, basePrice: 1500, drone: { loadoutId: 'rookrivet-mining-drone' } },
  ore: { id: 'ore', name: 'Nickel-iron', unitMass: 0.3, basePrice: 30, ore: { tier: 'common', chance: 1, share: 0, minRadius: 0 } },
  'banded-ore': { id: 'banded-ore', name: 'Copper', unitMass: 0.3, basePrice: 60, ore: { tier: 'middling', chance: 0.35, share: 0.25, minRadius: 0 } },
  'black-ore': { id: 'black-ore', name: 'Zinc', unitMass: 0.3, basePrice: 75, ore: { tier: 'middling', chance: 0.25, share: 0.3, minRadius: 25 } },
  // Gate-glass: never loose in rock, only in the cores some big rocks hide,
  // reached by breaching (docs/mining.md, "Breaching"). Rare and precious.
  'gate-glass': { id: 'gate-glass', name: 'Gate-glass', unitMass: 0.1, basePrice: 900, ore: { tier: 'rare', chance: 0, share: 0, minRadius: 0 } },
  // Crackers (breach charges): planted on a rock and set off together to split it.
  'breach-charge': { id: 'breach-charge', name: 'Cracker', unitMass: 0.5, basePrice: 400 },
  glintstone: { id: 'glintstone', name: 'Platinum', unitMass: 0.2, basePrice: 170, ore: { tier: 'valuable', chance: 0.15, share: 0.15, minRadius: 35 } },
  machinery: { id: 'machinery', name: 'Machinery', unitMass: 0.4, basePrice: 85 },
  medicine: { id: 'medicine', name: 'Medicine', unitMass: 0.1, basePrice: 65 },
  // Ammunition. One unit is one round; a gun's magazine says how many it
  // holds. Rounds are cheap and everywhere; shells and charges less so.
  // One unit is a box. Plain ammunition takes the gun's own damage type
  // (null); special rounds later name their own and scale the damage.
  rounds: { id: 'rounds', name: 'Rounds (box of 100)', unitMass: 0.4, basePrice: 60, ammo: { perUnit: 100, damageType: null, damage: 1, fits: 'rounds' } },
  shells: { id: 'shells', name: 'Shells (box of 20)', unitMass: 0.6, basePrice: 70, ammo: { perUnit: 20, damageType: null, damage: 1, fits: 'shells' } },
  charges: { id: 'charges', name: 'Charges (box of 40)', unitMass: 0.5, basePrice: 80, ammo: { perUnit: 40, damageType: null, damage: 1, fits: 'charges' } },
  // Munitions (docs/weapons.md, part 2). A box fits a launcher slot
  // (`fits`); the warhead is the `ammo` block, the airframe `munition`.
  // KOD Summons missiles: Breach (explosive, the all-rounder), Scatter
  // (fragmentation, shreds bare hulls, poor against shields) and Heat
  // (fire and forget). KOD Foreclosure torpedoes: slow, heavy, a big-ship
  // weapon that a CIWS can shoot down.
  'summons-breach': {
    id: 'summons-breach', name: 'KOD Summons Breach (box of 8)', unitMass: 0.8, basePrice: 200,
    ammo: { perUnit: 8, damageType: 'explosive', damage: 1, fits: 'missile' },
    munition: { class: 'missile', guidance: 'radar', speed: 420, turnRate: 2.8, lifetimeSeconds: 9, radius: 2, signature: 6, structure: 8 },
  },
  'summons-scatter': {
    id: 'summons-scatter', name: 'KOD Summons Scatter (box of 8)', unitMass: 0.8, basePrice: 200,
    ammo: { perUnit: 8, damageType: 'fragmentation', damage: 1.15, fits: 'missile' },
    munition: { class: 'missile', guidance: 'radar', speed: 420, turnRate: 2.8, lifetimeSeconds: 9, radius: 2, signature: 6, structure: 8 },
  },
  'summons-heat': {
    id: 'summons-heat', name: 'KOD Summons Breach Heat (box of 8)', unitMass: 0.8, basePrice: 250,
    ammo: { perUnit: 8, damageType: 'explosive', damage: 0.9, fits: 'missile' },
    munition: { class: 'missile', guidance: 'heat', speed: 440, turnRate: 3.2, lifetimeSeconds: 8, radius: 2, signature: 6, structure: 8 },
  },
  'foreclosure-breach': {
    id: 'foreclosure-breach', name: 'KOD Foreclosure Breach (box of 4)', unitMass: 1.6, basePrice: 550,
    ammo: { perUnit: 4, damageType: 'explosive', damage: 1, fits: 'torpedo' },
    munition: { class: 'torpedo', guidance: 'radar', speed: 210, turnRate: 1.1, lifetimeSeconds: 16, radius: 4, signature: 16, structure: 30 },
  },
  // Countermeasures: a box fits a dispenser. Chaff draws radar seekers,
  // flares heat seekers, a decoy both for longer and costs accordingly.
  chaff: {
    id: 'chaff', name: 'Chaff (box of 12)', unitMass: 0.3, basePrice: 100,
    ammo: { perUnit: 12, damageType: null, damage: 0, fits: 'countermeasure' },
    decoy: { spoofs: ['radar'], signature: 30, lifetimeSeconds: 6 },
  },
  flares: {
    id: 'flares', name: 'Flares (box of 12)', unitMass: 0.3, basePrice: 100,
    ammo: { perUnit: 12, damageType: null, damage: 0, fits: 'countermeasure' },
    decoy: { spoofs: ['heat'], signature: 36, lifetimeSeconds: 5 },
  },
  decoys: {
    id: 'decoys', name: 'Decoys (box of 4)', unitMass: 0.6, basePrice: 350,
    ammo: { perUnit: 4, damageType: null, damage: 0, fits: 'countermeasure' },
    decoy: { spoofs: ['radar', 'heat'], signature: 50, lifetimeSeconds: 12 },
  },
};

/** The goods whose boxes fit an ammunition slot, cheapest first. */
/** The ore catalogue: every good that turns up in rocks, in id order. */
export function oreGoods(goods: Readonly<Record<string, GoodSpec>>): GoodSpec[] {
  return Object.values(goods).filter((g) => g.ore).sort((a, b) => a.id.localeCompare(b.id));
}

export function goodsFitting(goods: Record<string, GoodSpec>, slot: string): GoodSpec[] {
  return Object.values(goods).filter((g) => g.ammo?.fits === slot).sort((a, b) => a.basePrice - b.basePrice || a.id.localeCompare(b.id));
}
