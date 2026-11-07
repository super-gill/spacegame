import { FIXED_DT } from './constants.js';
import { placeStations } from './rails.js';
import {
  CALLISTO_ID,
  CERES_ACCORD_ID,
  CERES_FIELD_ID,
  CERES_FIELD_PERIOD,
  CERES_FIELD_RADIUS,
  CERES_STATION_PHASE,
  DEIMOS_ID,
  EARTH_ID,
  EARTH_ORBITAL_EXCHANGE_ID,
  ELYSIUM_ID,
  ENCELADUS_ID,
  EUROPA_ID,
  GANYMEDE_ID,
  HYGIEA_ID,
  LUNA_ID,
  MARS_ID,
  MERCURY_ID,
  PALLAS_ID,
  PHOBOS_ID,
  PSYCHE_ID,
  SATURN_ID,
  SLAGLINE_ID,
  SUN_ID,
  THETIS_ORBITAL_ID,
  TITAN_FREE_PORT_ID,
  TITAN_ID,
  TRITON_ID,
  VENUS_ID,
  VESTA_ID,
  solDistance,
  solYear,
} from './sol-layout.js';
import { harbourStation, lanternWorks, padRing, ridgeOutpost } from './stations.js';
import type { Body, MarketEntry, ModuleSize, Orbit, Station, StationHolder, StationRank } from './types.js';

/**
 * Sol's ports (docs/sol.md, "Stations"; docs/sol-build.md, slices 1 and 2):
 * all 31 stations `sol.md` names, each with who runs it, who holds its
 * space, where it orbits, its size and what it trades. Content, not engine.
 *
 * Slice 1's six were built from Calder's three station types (Harbour's
 * trade and outfitting for the capitals, Ridge's ore market at Ceres,
 * Lantern's works at Slagline) and keep them. The other 25 take their
 * markets from a handful of templates by what the station is (a foundry,
 * a yard, a mine, a salvage port, an outpost, a clinic, a toll), with a
 * line or two of local colour each. Prices are placeholders until the
 * money loop (Open Lanes step 4) tunes them; no new goods yet.
 *
 * Placement follows `sol.md`'s "Orbits" column: round a world at a radius
 * chosen to sit clear of it (or just above it, for the low-orbit and
 * dug-in ports, which burns reach by coming straight in), at a Lagrange
 * point (on the body's own orbit, sixty degrees ahead or behind, or a
 * million units sunward for the Sun-Venus L1), or round the Sun where
 * a place is a region rather than a world (the Near Field, the outer
 * Belt, the Hildas, the Gate Reach).
 */

export const SOLACE_MERCY_ID = 'station-solace-mercy';
export const LAVINIA_ALPHA_ID = 'station-lavinia-alpha';
export const HALDEN_BETA_REGIO_ID = 'station-halden-beta-regio';
export const ECF_YARD_L5_ID = 'station-ecf-yard-l5';
export const TESSARACT_L4_ID = 'station-tessaract-l4';
export const TYCHO_PORT_ID = 'station-tycho-port';
export const APOLLO_WORKS_ID = 'station-apollo-works';
export const SHELL_STATION_ID = 'station-shell';
export const CALORIS_FOUNDRY_ID = 'station-caloris-foundry';
export const MRN_YARD_PHOBOS_ID = 'station-mrn-yard-phobos';
export const STATE_YARD_DEIMOS_ID = 'station-state-yard-deimos';
export const STATE_MINE_EUREKA_ID = 'station-state-mine-eureka';
export const VESTA_CONCESSION_ID = 'station-vesta-concession';
export const PSYCHE_DIG_ID = 'station-psyche-dig';
export const BELLOWS_ID = 'station-bellows';
export const BONEYARD_ID = 'station-boneyard';
export const HILDA_MOOT_ID = 'station-hilda-moot';
export const CALLISTO_DEPOT_ID = 'station-callisto-depot';
export const GANYMEDE_LOCAL_ID = 'station-ganymede-local';
export const HAVEN_EUROPA_ID = 'station-haven-europa';
export const RIMEHOLD_ID = 'station-rimehold';
export const PLUME_ID = 'station-plume';
export const TRITON_MOOT_ID = 'station-triton-moot';
export const ECF_TOLL_ID = 'station-ecf-toll';
export const MRN_GATE_ID = 'station-mrn-gate';

// Where things are.

/** A station orbit round a body: the period comes from the body's gravity, as Calder's do. */
function orbitRound(bodies: Readonly<Record<string, Body>>, parent: string, radius: number, phase: number): Orbit {
  const body = bodies[parent]!;
  return { parent, radius, period: Math.round(2 * Math.PI * Math.sqrt(radius ** 3 / Math.max(body.gravity, 1))), phase, direction: 1 };
}

/**
 * A point that rides `bodyId`'s own orbit `offset` radians ahead (+) or
 * behind (−): L4 is sixty degrees ahead, L5 sixty behind. Same parent,
 * radius and period, so it keeps its place if orbits run.
 */
function lagrange(bodies: Readonly<Record<string, Body>>, bodyId: string, offset: number, radiusChange = 0): Orbit {
  const orbit = bodies[bodyId]!.orbit!;
  return { ...orbit, radius: orbit.radius + radiusChange, phase: orbit.phase + offset };
}

/** A place round the Sun that is a region, not a world: `au` out, at `phase`, with that distance's year. */
function sunward(au: number, phase: number): Orbit {
  return { parent: SUN_ID, radius: solDistance(au), period: solYear(au), phase, direction: 1 };
}

// What things are.

/** A station sized for its role: pads round its rim, dock range and protected zone scaled with it. */
function sized(station: Station, radius: number, padSizes: readonly ModuleSize[]): Station {
  return { ...station, radius, dockRange: radius + 150, securityRadius: Math.max(station.securityRadius, radius * 6), pads: padRing(radius, padSizes) };
}

/** A capital port's pads: plenty, every size, large ones spread round. */
const CAPITAL_PADS: readonly ModuleSize[] = ['L', 'S', 'M', 'S', 'L', 'M', 'S', 'M', 'L', 'S', 'M', 'S', 'L', 'M', 'S', 'M'];
/** A yard's: many, heavy on large. */
const YARD_PADS: readonly ModuleSize[] = ['L', 'M', 'S', 'L', 'M', 'S', 'L', 'M', 'S', 'L'];
/** A working port's. */
const PORT_PADS: readonly ModuleSize[] = ['L', 'S', 'M', 'S', 'L', 'M', 'S', 'M'];
/** An outpost's: a few. */
const OUTPOST_PADS: readonly ModuleSize[] = ['L', 'S', 'M', 'S', 'M'];

/**
 * Ship marts by kind, with the first fleet (Open Lanes step 2, docs/ship-pipeline.md): each navy's
 * yard sells its own hulls first, the civil yards the independents' haulers and first miner, the
 * Belt's yard its cutters, hauler and patrol boat. The capitals keep Harbour's; Thetis adds the Lakshmi.
 */
const NAVAL_MART = ['kessari-raider', 'kessari-brig', 'union-frigate'];
const EARTH_NAVAL_MART = ['kessari-citation', ...NAVAL_MART];
const MARS_NAVAL_MART = ['seraphine-picket', 'seraphine-patrol', ...NAVAL_MART];
const CIVIL_MART = ['meridian-starter', 'meridian-dunlin', 'meridian-hauler', 'tessaract-trader', 'kessari-raider'];
const FREIGHT_MART = ['meridian-starter', 'tessaract-hauler', 'tessaract-trader'];
const MINING_MART = ['rookrivet-prospector', 'beltforge-rime', 'beltforge-hauler', 'union-blockade', 'rookrivet-breacher', 'rookrivet-hulk'];

type Market = Record<string, MarketEntry>;

/** A foundry: pays best for ore, makes machinery and ammunition cheap, wants food and medicine. Lantern Works' market. */
const FOUNDRY: Market = lanternWorks().market;
/** A mine: buys ore cheaply where it is dug, sells the kit to dig it, pays for everything shipped in. Ridge's market. */
const MINE: Market = ridgeOutpost().market;
/** A yard: eats machinery and scrap, sells ammunition and munitions, feeds its crews. */
const YARD: Market = {
  food: { ask: 24, bid: 19 },
  machinery: { ask: 112, bid: 96 },
  medicine: { ask: 72, bid: 61 },
  scrap: { ask: null, bid: 12 },
  ore: { ask: null, bid: 34 },
  rounds: { ask: 60, bid: 40 },
  shells: { ask: 72, bid: 50 },
  charges: { ask: 84, bid: 56 },
  'summons-breach': { ask: 225, bid: 145 },
  chaff: { ask: 110, bid: 66 },
  flares: { ask: 110, bid: 66 },
  decoys: { ask: 360, bid: 240 },
};
/** A salvage port: pays best for scrap, sells second-hand machinery cheap. */
const SALVAGE: Market = {
  food: { ask: 28, bid: 23 },
  scrap: { ask: null, bid: 17 },
  machinery: { ask: 62, bid: 52 },
  medicine: { ask: 76, bid: 64 },
  ore: { ask: null, bid: 26 },
  rounds: { ask: 52, bid: 34 },
  chaff: { ask: 105, bid: 62 },
};
/** An outpost far out: little for sale, and dear; pays well for food, medicine and machinery brought in. */
const OUTPOST: Market = {
  food: { ask: 46, bid: 39 },
  medicine: { ask: 112, bid: 96 },
  machinery: { ask: 124, bid: 106 },
  ore: { ask: null, bid: 22 },
  scrap: { ask: null, bid: 10 },
  rounds: { ask: 72, bid: 48 },
};
/** A clinic: medicine at source, cheap. */
const CLINIC: Market = {
  food: { ask: 24, bid: 20 },
  medicine: { ask: 36, bid: 29 },
  machinery: { ask: 98, bid: 84 },
  scrap: { ask: null, bid: 8 },
};
/** A navy's station at the gate: ammunition and munitions, everything else hauled out. */
const TOLL: Market = {
  food: { ask: 52, bid: 44 },
  medicine: { ask: 118, bid: 100 },
  machinery: { ask: 130, bid: 110 },
  rounds: { ask: 66, bid: 44 },
  shells: { ask: 78, bid: 54 },
  charges: { ask: 90, bid: 60 },
  'summons-breach': { ask: 240, bid: 155 },
  'foreclosure-breach': { ask: 600, bid: 400 },
  chaff: { ask: 112, bid: 68 },
  flares: { ask: 112, bid: 68 },
};

/** A template with some entries changed or added. */
function with_(base: Market, changes: Market): Market {
  return { ...base, ...changes };
}

/** The base every new port starts from: no market, no outfitting, no ship mart; the rest set per port. */
function port(id: string, name: string, orbit: Orbit, radius: number, pads: readonly ModuleSize[], market: Market, more: { runBy: string; holder: StationHolder | null; rank?: StationRank; outfitting?: boolean; shipMart?: readonly string[] }): Station {
  const base: Station = {
    id,
    name,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    orbit,
    radius,
    dockRange: radius + 150,
    securityRadius: 700,
    market: { ...market },
    outfitting: more.outfitting ?? false,
    pads: [],
    shipMart: [...(more.shipMart ?? [])],
    runBy: more.runBy,
    holder: more.holder,
    ...(more.rank ? { rank: more.rank } : {}),
  };
  return sized(base, radius, pads);
}

/** Every Sol port, placed where it is at tick 0. */
export function solStations(bodies: Readonly<Record<string, Body>>): Record<string, Station> {
  const capital = harbourStation();
  const stations: Station[] = [
    // Slice 1's six: the four capitals and the two Accord free ports.
    {
      ...sized(capital, 500, CAPITAL_PADS),
      id: EARTH_ORBITAL_EXCHANGE_ID,
      name: 'Earth Orbital Exchange',
      orbit: orbitRound(bodies, EARTH_ID, 110_000, -Math.PI / 2),
      runBy: 'The Board',
      holder: 'earth',
      rank: 'capital',
    },
    {
      ...sized(capital, 450, CAPITAL_PADS),
      id: THETIS_ORBITAL_ID,
      name: 'Thetis Orbital',
      orbit: orbitRound(bodies, VENUS_ID, 120_000, Math.PI / 3),
      runBy: 'The Venusian Assembly',
      holder: 'venus',
      rank: 'capital',
      shipMart: [...capital.shipMart, 'ishtar-guard'],
    },
    {
      ...sized(capital, 450, CAPITAL_PADS),
      id: ELYSIUM_ID,
      name: 'Republic Station Elysium',
      orbit: orbitRound(bodies, MARS_ID, 140_000, Math.PI),
      runBy: 'The Martian parliament',
      holder: 'mars',
      rank: 'capital',
    },
    {
      ...sized(ridgeOutpost(), 300, ['L', 'S', 'M', 'S', 'L', 'M', 'S', 'M']),
      id: CERES_ACCORD_ID,
      name: 'Ceres Accord Station',
      // The Accord's free port refits too: the Belt's miners should not have to burn to Earth for a new laser.
      outfitting: true,
      orbit: { parent: CERES_FIELD_ID, radius: CERES_FIELD_RADIUS, period: CERES_FIELD_PERIOD, phase: CERES_STATION_PHASE, direction: 1 },
      runBy: 'The Ceres Accord',
      holder: 'accord',
      rank: 'freePort',
    },
    {
      ...sized(lanternWorks(), 220, ['L', 'S', 'M', 'S', 'L', 'M']),
      id: SLAGLINE_ID,
      name: 'Slagline',
      // Dug into Pallas: a door in a cliff, just off the surface.
      orbit: orbitRound(bodies, PALLAS_ID, 5_600, 0.8),
      runBy: "The Belt's cooperatives",
      holder: 'belt',
      rank: 'capital',
    },
    {
      ...sized(capital, 350, ['L', 'S', 'M', 'S', 'L', 'M', 'S', 'M']),
      id: TITAN_FREE_PORT_ID,
      name: 'Titan Free Port',
      orbit: orbitRound(bodies, TITAN_ID, 45_000, 0),
      // A free port trades and refits but sells no ships.
      shipMart: [],
      runBy: 'The Ceres Accord',
      holder: 'accord',
      rank: 'freePort',
    },

    // Venus.
    port(SOLACE_MERCY_ID, 'Solace Station Mercy', orbitRound(bodies, VENUS_ID, 190_000, Math.PI / 3 - 0.6), 280, YARD_PADS, with_(CLINIC, { machinery: { ask: 104, bid: 90 }, rounds: { ask: 62, bid: 42 } }), {
      runBy: 'Solace Medical',
      holder: 'venus',
      outfitting: true,
    }),
    // Low over the cloud tops: burns come straight in from above.
    port(LAVINIA_ALPHA_ID, 'Lavinia Alpha Dock', orbitRound(bodies, VENUS_ID, 70_000, Math.PI / 3 + 1.3), 220, PORT_PADS, with_(YARD, { medicine: { ask: 50, bid: 42 } }), {
      runBy: 'Lavinia Atmospherics',
      holder: 'venus',
      outfitting: true,
    }),
    // The Sun-Venus L1 point, a million units sunward of Venus. Arbor Dynamics' drone works next door.
    port(HALDEN_BETA_REGIO_ID, 'Halden Beta Regio Observatory', lagrange(bodies, VENUS_ID, 0, -1_000_000), 170, OUTPOST_PADS, with_(OUTPOST, { food: { ask: 30, bid: 25 }, medicine: { ask: 62, bid: 52 }, 'mining-drone': { ask: 1350, bid: 880 }, glintstone: { ask: null, bid: 165 } }), {
      runBy: 'The Halden Institute',
      holder: 'venus',
      outfitting: true,
    }),

    // Earth and Luna.
    port(ECF_YARD_L5_ID, 'ECF Yard L5', lagrange(bodies, LUNA_ID, -Math.PI / 3), 420, YARD_PADS, with_(YARD, { 'foreclosure-breach': { ask: 580, bid: 390 }, 'summons-scatter': { ask: 225, bid: 145 }, 'summons-heat': { ask: 280, bid: 180 } }), {
      runBy: 'Kessari Orbital Defence',
      holder: 'earth',
      rank: 'navalYard',
      outfitting: true,
      shipMart: EARTH_NAVAL_MART,
    }),
    port(TESSARACT_L4_ID, 'Tessaract Freight Yard L4', lagrange(bodies, LUNA_ID, Math.PI / 3), 400, YARD_PADS, with_(YARD, { food: { ask: 18, bid: 15 }, machinery: { ask: 92, bid: 80 } }), {
      runBy: 'Tessaract Logistics',
      holder: 'earth',
      outfitting: true,
      shipMart: FREIGHT_MART,
    }),
    // Novum Systems and Vantage Aerospace: electronics and fighters. Luna acting like a fifth power.
    port(TYCHO_PORT_ID, 'Tycho Port', orbitRound(bodies, LUNA_ID, 30_000, 2.4), 320, PORT_PADS, with_(YARD, { machinery: { ask: 70, bid: 60 }, food: { ask: 30, bid: 25 }, 'mining-drone': { ask: 1450, bid: 900 } }), {
      runBy: 'Lunar old money',
      holder: 'earth',
      outfitting: true,
      shipMart: ['meridian-starter', 'meridian-dunlin', 'meridian-hauler', 'kessari-raider'],
    }),
    // The Near Field: on Earth's own path round the Sun, a short burn behind it.
    port(APOLLO_WORKS_ID, 'Corvane Apollo Works', lagrange(bodies, EARTH_ID, -0.05), 240, PORT_PADS, FOUNDRY, {
      runBy: 'Corvane Heavy Industries',
      holder: 'earth',
      outfitting: true,
    }),
    // Low orbit, in the Shell: burns come straight in from above.
    port(SHELL_STATION_ID, 'Rook and Rivet Shell Station', orbitRound(bodies, EARTH_ID, 75_000, 0.9), 170, OUTPOST_PADS, SALVAGE, {
      runBy: 'Rook and Rivet, under Earth licence',
      holder: 'earth',
      outfitting: true,
    }),

    // Mercury. A solar smelter: buys ore from anywhere and sells metal cheap.
    port(CALORIS_FOUNDRY_ID, 'Corvane Caloris Foundry', orbitRound(bodies, MERCURY_ID, 45_000, 2.0), 260, PORT_PADS, with_(FOUNDRY, {
      ore: { ask: 56, bid: 46 },
      'banded-ore': { ask: null, bid: 74 },
      'black-ore': { ask: null, bid: 90 },
      glintstone: { ask: null, bid: 205 },
      machinery: { ask: 42, bid: 35 },
    }), {
      runBy: 'Corvane Heavy Industries',
      holder: 'earth',
      outfitting: true,
    }),

    // Mars.
    port(MRN_YARD_PHOBOS_ID, 'MRN Yard Phobos', orbitRound(bodies, PHOBOS_ID, 4_000, 0.4), 400, YARD_PADS, with_(YARD, { shells: { ask: 64, bid: 46 }, 'foreclosure-breach': { ask: 580, bid: 390 } }), {
      runBy: 'Seraphine Naval Yards',
      holder: 'mars',
      rank: 'navalYard',
      outfitting: true,
      shipMart: MARS_NAVAL_MART,
    }),
    port(STATE_YARD_DEIMOS_ID, 'State Yard Deimos', orbitRound(bodies, DEIMOS_ID, 3_000, -0.8), 320, YARD_PADS, YARD, {
      runBy: 'Arcadia Works',
      holder: 'mars',
      outfitting: true,
      shipMart: CIVIL_MART,
    }),
    // Over Mars's L5 Trojans, sixty degrees behind Mars on its path round the Sun.
    port(STATE_MINE_EUREKA_ID, 'State Mine Eureka', lagrange(bodies, MARS_ID, -Math.PI / 3), 170, OUTPOST_PADS, MINE, {
      runBy: 'Arcadia Works',
      holder: 'mars',
      outfitting: true,
    }),

    // The Belt.
    port(VESTA_CONCESSION_ID, 'Vesta Concession', orbitRound(bodies, VESTA_ID, 12_000, 1.1), 230, PORT_PADS, with_(FOUNDRY, { food: { ask: 34, bid: 29 } }), {
      runBy: "Corvane, on Earth's ore rights",
      holder: 'earth',
      outfitting: true,
    }),
    // The platinum rock: pays best for platinum, and nobody agrees whose it is.
    port(PSYCHE_DIG_ID, 'Psyche Dig', orbitRound(bodies, PSYCHE_ID, 6_000, 0.3), 150, OUTPOST_PADS, with_(MINE, { glintstone: { ask: null, bid: 120 } }), {
      runBy: 'A Belt cooperative and a Corvane lease; nobody agrees',
      holder: null,
    }),
    port(BELLOWS_ID, 'Bellows', orbitRound(bodies, HYGIEA_ID, 10_000, -0.4), 300, YARD_PADS, with_(MINE, { 'mining-drone': { ask: 1250, bid: 850 }, 'breach-charge': { ask: 380, bid: 240 }, ore: { ask: 20, bid: 16 } }), {
      runBy: 'Belt Forge Collective',
      holder: 'belt',
      outfitting: true,
      shipMart: MINING_MART,
    }),
    // The outer Belt, near Hygiea: the breaking yard, the salvage market of Sol.
    port(BONEYARD_ID, 'The Boneyard', sunward(3.2, -0.53), 280, YARD_PADS, with_(SALVAGE, { scrap: { ask: null, bid: 20 }, machinery: { ask: 56, bid: 47 } }), {
      runBy: 'Rook and Rivet',
      holder: 'belt',
      outfitting: true,
    }),
    // Wherever the clans anchor it: for now, here.
    port(HILDA_MOOT_ID, 'Hilda Moot', sunward(4.0, 0.25), 220, OUTPOST_PADS, with_(OUTPOST, { food: { ask: 38, bid: 32 } }), {
      runBy: 'The clans',
      holder: 'clans',
    }),

    // The outer system.
    port(CALLISTO_DEPOT_ID, 'Callisto Freight Depot', orbitRound(bodies, CALLISTO_ID, 40_000, 1.6), 240, PORT_PADS, with_(OUTPOST, { food: { ask: 34, bid: 29 } }), {
      runBy: 'Earth (Tessaract)',
      holder: 'earth',
      outfitting: true,
    }),
    port(GANYMEDE_LOCAL_ID, 'The Ganymede Local', orbitRound(bodies, GANYMEDE_ID, 40_000, -1.2), 260, PORT_PADS, with_(OUTPOST, { ore: { ask: null, bid: 30 }, machinery: { ask: 110, bid: 94 } }), {
      runBy: 'A Belt cooperative; Earth claims the ground under it',
      holder: 'belt',
      outfitting: true,
    }),
    port(HAVEN_EUROPA_ID, 'VSG Haven Europa', orbitRound(bodies, EUROPA_ID, 30_000, 0.7), 200, OUTPOST_PADS, with_(CLINIC, { food: { ask: 40, bid: 34 } }), {
      runBy: 'Solace Medical, under Venus',
      holder: 'venus',
    }),
    // On the rings, out from Saturn among the ice.
    port(RIMEHOLD_ID, 'Rimehold', orbitRound(bodies, SATURN_ID, 700_000, 0.5), 190, OUTPOST_PADS, OUTPOST, {
      runBy: 'Belt Forge, for the cooperatives',
      holder: 'belt',
      outfitting: true,
    }),
    port(PLUME_ID, 'Plume', orbitRound(bodies, ENCELADUS_ID, 9_000, -2.0), 130, OUTPOST_PADS, with_(OUTPOST, { food: { ask: 40, bid: 34 } }), {
      runBy: 'A Belt cooperative',
      holder: 'belt',
    }),
    port(TRITON_MOOT_ID, 'Triton Moot', orbitRound(bodies, TRITON_ID, 25_000, 1.0), 200, OUTPOST_PADS, OUTPOST, {
      runBy: 'The clans',
      holder: 'clans',
    }),
    // The Gate Reach: Earth collects and Mars watches, a third of a million units apart.
    port(ECF_TOLL_ID, 'ECF Toll Station', sunward(40, -0.35), 280, PORT_PADS, TOLL, {
      runBy: 'Kessari Orbital Defence',
      holder: 'earth',
      rank: 'depot',
      outfitting: true,
    }),
    port(MRN_GATE_ID, 'MRN Gate Station', sunward(40, -0.3488), 280, PORT_PADS, TOLL, {
      runBy: 'The MRN (Mars)',
      holder: 'mars',
      rank: 'depot',
      outfitting: true,
    }),
  ];
  return placeStations(bodies, Object.fromEntries(stations.map((s) => [s.id, s])), 0, FIXED_DT);
}
