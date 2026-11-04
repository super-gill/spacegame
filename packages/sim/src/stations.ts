import type { ModuleSize, Pad, Station } from './types.js';
import { fromAngle, scale } from './vec2.js';

/**
 * The starter sector's stations, as data. Content, not engine: later
 * sectors will be data files. Save migrations read pad layouts and ship
 * mart stock from here too, so a station in an old save gains exactly
 * what a new world's copy has.
 */

/** How far beyond the station hull a pad's centre sits, by pad size, units. */
const PAD_REACH: Record<ModuleSize, number> = { S: 14, M: 22, L: 32, XL: 44 };

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

/** A busy farming and manufacturing hub, home of new pilots. Outfitting and a ship mart. */
export function harbourStation(): Station {
  return {
    id: HARBOUR_ID,
    name: 'Harbour Station',
    position: { x: 0, y: 0 },
    radius: 90,
    dockRange: 220,
    securityRadius: 900,
    // Food, machinery and medicine are cheap here, ore is wanted.
    market: {
      food: { ask: 14, bid: 11 },
      ore: { ask: 46, bid: 38 },
      machinery: { ask: 70, bid: 60 },
      medicine: { ask: 55, bid: 47 },
      scrap: { ask: null, bid: 7 },
    },
    outfitting: true,
    // Ten pads, sizes mixed so large hulls are never side by side.
    pads: padRing(90, ['L', 'S', 'M', 'S', 'L', 'M', 'S', 'L', 'M', 'S']),
    shipMart: ['meridian-starter', 'kessari-raider', 'tessaract-trader'],
  };
}

/** A mining outpost. No outfitting, no ship mart. */
export function ridgeOutpost(): Station {
  return {
    id: RIDGE_ID,
    name: 'Ridge Outpost',
    position: { x: 4800, y: -1600 },
    radius: 70,
    dockRange: 190,
    securityRadius: 700,
    // Ore is cheap, everything else has to be shipped in.
    market: {
      food: { ask: 32, bid: 27 },
      ore: { ask: 18, bid: 14 },
      machinery: { ask: 112, bid: 98 },
      medicine: { ask: 86, bid: 75 },
      scrap: { ask: null, bid: 9 },
    },
    outfitting: false,
    pads: padRing(70, ['L', 'S', 'M', 'L', 'S', 'M']),
    shipMart: [],
  };
}

/** Every station in the starter sector, by id. */
export function starterStations(): Record<string, Station> {
  const all = [harbourStation(), ridgeOutpost()];
  return Object.fromEntries(all.map((s) => [s.id, s]));
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
