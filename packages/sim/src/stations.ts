import { BELT_ID, BELT_PERIOD, BELT_RING_RADIUS, MOON_GRAVITY, MOON_ID, PLANET_GRAVITY, PLANET_ID, boundOrbit, starterBodies } from './bodies.js';
import { FIXED_DT } from './constants.js';
import { placeStations } from './rails.js';
import type { ModuleSize, Pad, Station } from './types.js';
import { fromAngle, scale } from './vec2.js';

/**
 * The starter system's stations, as data. Content, not engine: later
 * systems will be generated and stored. Save migrations read pad layouts
 * and ship mart stock from here too, so a station in an old save gains
 * exactly what a new world's copy has.
 *
 * Stations ride orbits (bodies.ts has what they orbit). The factories
 * here give a station with its orbit and a placeholder position; place
 * it with `placeStations` for the tick you need, as `starterStations`
 * does for tick 0.
 */

/** Harbour's orbit round the planet, units from its centre: a low orbit, a little over two minutes round. */
export const HARBOUR_ORBIT_RADIUS = 1100;

/** How far beyond the station hull a pad's centre sits, by pad size, units. */
const PAD_REACH: Record<ModuleSize, number> = { S: 14, M: 24, L: 36, XL: 44 };

/**
 * Pads spaced evenly round a station's rim, facing straight out, in the
 * order given, starting at `startAngle` and going clockwise. Ids number
 * each size separately: `s1`, `s2`, `m1`, `l1`.
 */
export function padRing(stationRadius: number, sizes: readonly ModuleSize[], startAngle = 0): Pad[] {
  const counts: Partial<Record<ModuleSize, number>> = {};
  return sizes.map((size, i) => {
    const n = (counts[size] = (counts[size] ?? 0) + 1);
    const angle = startAngle + (i / sizes.length) * Math.PI * 2;
    return {
      id: `${size.toLowerCase()}${n}`,
      size,
      position: scale(fromAngle(angle), stationRadius + PAD_REACH[size]),
      facing: angle,
    };
  });
}

export const HARBOUR_ID = 'station-harbour';
export const RIDGE_ID = 'station-ridge';
export const LANTERN_ID = 'station-lantern';

/** Lantern Works' orbit round Lantern, units from the moon's centre. */
export const LANTERN_ORBIT_RADIUS = 480;

/** Where on the belt Ridge Outpost is at tick 0, radians. Pirates lurk a little inward of it. */
export const RIDGE_PHASE = 0.6;

/** A busy farming and manufacturing hub in low orbit round the planet, home of new pilots. Outfitting and a ship mart. */
export function harbourStation(): Station {
  return {
    id: HARBOUR_ID,
    name: 'Harbour Station',
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    orbit: boundOrbit(PLANET_ID, PLANET_GRAVITY, HARBOUR_ORBIT_RADIUS, -Math.PI / 2),
    radius: 90,
    dockRange: 220,
    securityRadius: 900,
    // Fieldmark's harvest and a Solace clinic make food and medicine
    // cheap. Machinery comes in from Lantern Works, so it is middling.
    market: {
      food: { ask: 14, bid: 11 },
      ore: { ask: 40, bid: 30 },
      'mining-drone': { ask: 1500, bid: 900 },
      'banded-ore': { ask: null, bid: 52 },
      'black-ore': { ask: null, bid: 64 },
      glintstone: { ask: null, bid: 140 },
      'gate-glass': { ask: null, bid: 850 },
      'breach-charge': { ask: 500, bid: 250 },
      machinery: { ask: 78, bid: 66 },
      medicine: { ask: 55, bid: 47 },
      scrap: { ask: null, bid: 7 },
      // Ammunition from the free port's dealers.
      rounds: { ask: 64, bid: 40 },
      charges: { ask: 88, bid: 56 },
      // Missiles and countermeasures: the everyday kinds.
      'summons-breach': { ask: 230, bid: 150 },
      chaff: { ask: 115, bid: 70 },
      flares: { ask: 115, bid: 70 },
    },
    outfitting: true,
    // Ten pads, sizes mixed so large hulls are never side by side.
    pads: padRing(90, ['L', 'S', 'M', 'S', 'L', 'M', 'S', 'L', 'M', 'S']),
    shipMart: ['meridian-starter', 'kessari-raider', 'tessaract-trader', 'rookrivet-prospector', 'kessari-brig', 'union-frigate'],
  };
}

/**
 * A mining outpost on the belt, turning with it. Outfitting while the
 * starter system is the dev environment; its ship
 * mart sells prospectors. The belt has no gravity, so its period is the belt's, not one
 * worked out from gravity.
 */
export function ridgeOutpost(): Station {
  return {
    id: RIDGE_ID,
    name: 'Ridge Outpost',
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    orbit: { parent: BELT_ID, radius: BELT_RING_RADIUS, period: BELT_PERIOD, phase: RIDGE_PHASE, direction: 1 },
    radius: 70,
    dockRange: 190,
    securityRadius: 700,
    // Ore is cheap, everything else has to be shipped in.
    market: {
      food: { ask: 32, bid: 27 },
      ore: { ask: 18, bid: 14 },
      // The Collective buys what its prospectors bring in, cheaply: the
      // real money is a long haul away at Lantern Works.
      'mining-drone': { ask: 1400, bid: 900 },
      'banded-ore': { ask: null, bid: 30 },
      'black-ore': { ask: null, bid: 36 },
      glintstone: { ask: null, bid: 80 },
      'gate-glass': { ask: null, bid: 500 },
      'breach-charge': { ask: 420, bid: 250 },
      machinery: { ask: 112, bid: 98 },
      medicine: { ask: 86, bid: 75 },
      scrap: { ask: null, bid: 9 },
      // Any Belter can make rounds.
      rounds: { ask: 48, bid: 32 },
    },
    // Every station outfits while the starter system is the dev environment (docs/fitting.md).
    outfitting: true,
    pads: padRing(70, ['L', 'S', 'M', 'L', 'S', 'M']),
    // The Collective sells its prospectors to anyone who will dig.
    shipMart: ['rookrivet-prospector', 'rookrivet-breacher', 'rookrivet-hulk'],
  };
}

/**
 * A Corvane Heavy Industries foundry round Lantern, the ice moon: Ridge
 * ore is smelted here, where ice for cooling is free. Wants ore and
 * scrap, makes machinery cheap, pays dearly for food and medicine.
 * Outfitting (Corvane's industrial modules, stocked from the general
 * catalogue until Corvane has its own); no ship mart.
 */
export function lanternWorks(): Station {
  return {
    id: LANTERN_ID,
    name: 'Lantern Works',
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    orbit: boundOrbit(MOON_ID, MOON_GRAVITY, LANTERN_ORBIT_RADIUS, 0),
    radius: 70,
    dockRange: 190,
    securityRadius: 700,
    market: {
      food: { ask: 40, bid: 34 },
      ore: { ask: 52, bid: 42 },
      // A foundry pays best for every ore.
      'banded-ore': { ask: null, bid: 68 },
      'black-ore': { ask: null, bid: 84 },
      glintstone: { ask: null, bid: 190 },
      'gate-glass': { ask: null, bid: 1000 },
      machinery: { ask: 48, bid: 40 },
      medicine: { ask: 96, bid: 82 },
      scrap: { ask: null, bid: 14 },
      // A foundry: every kind of ammunition, cheapest here.
      rounds: { ask: 52, bid: 36 },
      shells: { ask: 68, bid: 48 },
      charges: { ask: 76, bid: 52 },
      // Munitions too: KOD's whole range passes through the Works.
      'summons-breach': { ask: 210, bid: 140 },
      'summons-scatter': { ask: 210, bid: 140 },
      'summons-heat': { ask: 265, bid: 175 },
      'foreclosure-breach': { ask: 570, bid: 380 },
      chaff: { ask: 105, bid: 62 },
      flares: { ask: 105, bid: 62 },
      decoys: { ask: 370, bid: 245 },
    },
    outfitting: true,
    pads: padRing(70, ['L', 'M', 'S', 'L', 'M', 'S']),
    shipMart: [],
  };
}

/** Every station in the starter system, by id, placed where they are at `tick`. */
export function starterStations(tick = 0, dt = FIXED_DT): Record<string, Station> {
  const all = [harbourStation(), ridgeOutpost(), lanternWorks()];
  return placeStations(starterBodies(), Object.fromEntries(all.map((s) => [s.id, s])), tick, dt);
}

/**
 * Pads for a station that has none (from an old save): its starter-sector
 * layout if it is one of ours, otherwise a default ring of two of each
 * size up to L.
 */
export function defaultPads(station: Pick<Station, 'id' | 'radius'>): Pad[] {
  const known = starterStations()[station.id];
  if (known) return known.pads;
  return padRing(station.radius, ['L', 'S', 'M', 'L', 'S', 'M']);
}

/** Ship mart stock for a station that has none recorded (from an old save). */
export function defaultShipMart(stationId: string): string[] {
  return starterStations()[stationId]?.shipMart ?? [];
}
