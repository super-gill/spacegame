import { CALDER_SITE, screeAsteroids } from './asteroids.js';
import { FIXED_DT } from './constants.js';
import { GOODS } from './goods.js';
import { HULLS } from './hulls.js';
import { runSpawners } from './lifecycle.js';
import { LOADOUTS } from './loadouts.js';
import { MANUFACTURERS } from './manufacturers.js';
import { MODULES } from './modules.js';
import { setOrbitsMoving } from './rails.js';
import {
  CERES_ACCORD_ID,
  CERES_FIELD_ID,
  CERES_FIELD_PERIOD,
  CERES_FIELD_RADIUS,
  CERES_ID,
  CERES_STATION_PHASE,
  EARTH_ID,
  EARTH_ORBITAL_EXCHANGE_ID,
  ELYSIUM_ID,
  SLAGLINE_ID,
  THETIS_ORBITAL_ID,
  TITAN_FREE_PORT_ID,
  LUNA_ID,
  MARS_ID,
  PHOBOS_ID,
  DEIMOS_ID,
  IO_ID,
  EUROPA_ID,
  GANYMEDE_ID,
  CALLISTO_ID,
  ENCELADUS_ID,
  TITAN_ID,
  TRITON_ID,
  JUPITER_ID,
  SATURN_ID,
  NEPTUNE_ID,
  URANUS_ID,
  MERCURY_ID,
  VENUS_ID,
  VESTA_ID,
  PALLAS_ID,
  PSYCHE_ID,
  HYGIEA_ID,
  SUN_ID,
  gm,
  solDistance,
  solYear,
} from './sol-layout.js';
import {
  ECF_TOLL_ID,
  ECF_YARD_L5_ID,
  CALLISTO_DEPOT_ID,
  GANYMEDE_LOCAL_ID,
  HAVEN_EUROPA_ID,
  HILDA_MOOT_ID,
  PSYCHE_DIG_ID,
  SOLACE_MERCY_ID,
  STATE_YARD_DEIMOS_ID,
  TESSARACT_L4_ID,
  TYCHO_PORT_ID,
  solStations,
} from './sol-ports.js';
import type { Body, PowerId, RockSite, Spawner, Station, World } from './types.js';

export * from './sol-layout.js';
export * from './sol-ports.js';
import { WEAPONS } from './weapons.js';
import { DEFAULT_RULES } from './world.js';

/**
 * Sol, the first build (docs/sol.md for what it is, docs/sol-build.md for
 * the numbers): the Sun, the planets in order, the moons and big rocks
 * that matter in play, its 31 ports (sol-ports.ts) and the Accord's lanes
 * (lanes.ts). Content, not engine. Ids and scale live in sol-layout.ts.
 *
 * Scale: bodies are enormous and distances compressed. A planet's
 * distance from the Sun is 30 million units × AU^0.6, so the inner system
 * is close and the outer system lonely, and the Gate Reach is 274 million
 * units out. Crossings are burns (burn.ts): Earth to Mars about three
 * minutes. Bodies stay off the local view: stations orbit well clear of
 * their worlds, and ships and stations are drawn at their real size.
 *
 * Planets stand where they are drawn for now: orbits run on rails as in
 * Calder, and stop with the world's orbits rule (off by default). While
 * the local flight model flies against a still frame, a planet moving at
 * a few hundred units a second round the Sun would carry its ports away
 * from the ships flying round them.
 *
 * Still to come (docs/sol-build.md, "Slices"): the Relay and security
 * computed from it, NPC traffic that burns along the lanes (today's
 * traders run between Calder's stations and wait for it), the eight
 * starts, more rock sites, and the hazards.
 */

/**
 * Something orbiting the Sun: real distance in AU, the angle it stands at
 * (chosen so the inner worlds sit within a few minutes' burn of each
 * other), its radius and surface pull.
 */
interface SolBody {
  id: string;
  name: string;
  kind: Body['kind'];
  au: number;
  phase: number;
  radius: number;
  surface: number;
}

/** The Sun's children, inside out (docs/sol.md, "Bodies, inside out"). */
const ORBITING_THE_SUN: readonly SolBody[] = [
  { id: MERCURY_ID, name: 'Mercury', kind: 'planet', au: 0.39, phase: 0.5, radius: 24_000, surface: 20 },
  { id: VENUS_ID, name: 'Venus', kind: 'planet', au: 0.72, phase: 0.2, radius: 57_000, surface: 30 },
  { id: EARTH_ID, name: 'Earth', kind: 'planet', au: 1.0, phase: 0, radius: 60_000, surface: 30 },
  { id: MARS_ID, name: 'Mars', kind: 'planet', au: 1.52, phase: -0.15, radius: 32_000, surface: 20 },
  { id: VESTA_ID, name: 'Vesta', kind: 'moon', au: 2.36, phase: -0.2, radius: 5_000, surface: 5 },
  { id: CERES_ID, name: 'Ceres', kind: 'moon', au: 2.77, phase: -0.35, radius: 9_000, surface: 6 },
  { id: PALLAS_ID, name: 'Pallas', kind: 'moon', au: 2.77, phase: -0.42, radius: 5_000, surface: 5 },
  { id: PSYCHE_ID, name: 'Psyche', kind: 'moon', au: 2.92, phase: -0.1, radius: 2_500, surface: 4 },
  { id: HYGIEA_ID, name: 'Hygiea', kind: 'moon', au: 3.14, phase: -0.5, radius: 4_000, surface: 4 },
  { id: JUPITER_ID, name: 'Jupiter', kind: 'planet', au: 5.2, phase: -0.3, radius: 450_000, surface: 60 },
  { id: SATURN_ID, name: 'Saturn', kind: 'planet', au: 9.54, phase: -0.25, radius: 380_000, surface: 40 },
  { id: URANUS_ID, name: 'Uranus', kind: 'planet', au: 19.2, phase: 0.3, radius: 160_000, surface: 30 },
  { id: NEPTUNE_ID, name: 'Neptune', kind: 'planet', au: 30.1, phase: -0.6, radius: 160_000, surface: 30 },
];

/** Moons round their planets: units from the planet's centre, and where they stand. */
const MOONS: readonly { id: string; name: string; parent: string; distance: number; phase: number; radius: number; surface: number }[] = [
  { id: LUNA_ID, name: 'Luna', parent: EARTH_ID, distance: 600_000, phase: 1.2, radius: 16_000, surface: 8 },
  { id: PHOBOS_ID, name: 'Phobos', parent: MARS_ID, distance: 50_000, phase: 2.0, radius: 1_200, surface: 2 },
  { id: DEIMOS_ID, name: 'Deimos', parent: MARS_ID, distance: 90_000, phase: -1.0, radius: 700, surface: 2 },
  { id: IO_ID, name: 'Io', parent: JUPITER_ID, distance: 1_200_000, phase: 0.4, radius: 17_000, surface: 8 },
  { id: EUROPA_ID, name: 'Europa', parent: JUPITER_ID, distance: 1_600_000, phase: 2.2, radius: 15_000, surface: 7 },
  { id: GANYMEDE_ID, name: 'Ganymede', parent: JUPITER_ID, distance: 2_200_000, phase: -2.0, radius: 25_000, surface: 8 },
  { id: CALLISTO_ID, name: 'Callisto', parent: JUPITER_ID, distance: 3_200_000, phase: -0.6, radius: 23_000, surface: 7 },
  { id: ENCELADUS_ID, name: 'Enceladus', parent: SATURN_ID, distance: 1_100_000, phase: 1.0, radius: 4_000, surface: 3 },
  { id: TITAN_ID, name: 'Titan', parent: SATURN_ID, distance: 2_500_000, phase: -2.4, radius: 25_000, surface: 8 },
  { id: TRITON_ID, name: 'Triton', parent: NEPTUNE_ID, distance: 1_500_000, phase: 2.6, radius: 12_000, surface: 5 },
];

/** Gravity reaches this many radii out from a world: steep near the surface, nothing between worlds. */
const WELL_RADII = 2.5;

export const SOL_ROCK_SITE: RockSite = {
  beltId: CERES_FIELD_ID,
  stationId: 'station-ceres-accord',
  ringRadius: CERES_FIELD_RADIUS,
  ringWidth: CALDER_SITE.ringWidth,
  period: CERES_FIELD_PERIOD,
  phase: CERES_STATION_PHASE,
};

/** Every Sol body, keyed by id. */
/** Each navy's patrol fit (Open Lanes step 2): Earth keeps the Calder Watch's Warrant. */
const NAVY_PATROL: Record<PowerId, string> = {
  earth: 'calder-watch',
  mars: 'seraphine-patrol',
  venus: 'ishtar-guard',
  belt: 'union-blockade',
  aurel: 'calder-watch',
};

export function solBodies(): Record<string, Body> {
  const sun: Body = { id: SUN_ID, name: 'The Sun', kind: 'star', orbit: null, radius: 1_500_000, gravity: gm(1_500_000, 100), sphere: 1_500_000 * 1.5 };
  const bodies: Body[] = [sun];
  for (const b of ORBITING_THE_SUN) {
    bodies.push({
      id: b.id,
      name: b.name,
      kind: b.kind,
      orbit: { parent: SUN_ID, radius: solDistance(b.au), period: solYear(b.au), phase: b.phase, direction: 1 },
      radius: b.radius,
      gravity: gm(b.radius, b.surface),
      sphere: b.radius * WELL_RADII,
    });
  }
  for (const m of MOONS) {
    const parent = bodies.find((b) => b.id === m.parent)!;
    // A moon's month: slow enough not to matter while orbits are stopped, and still sensible if they run.
    const period = Math.round(2 * Math.PI * Math.sqrt(m.distance ** 3 / parent.gravity));
    bodies.push({
      id: m.id,
      name: m.name,
      kind: 'moon',
      orbit: { parent: m.parent, radius: m.distance, period, phase: m.phase, direction: 1 },
      radius: m.radius,
      gravity: gm(m.radius, m.surface),
      sphere: m.radius * WELL_RADII,
    });
  }
  // Ceres's field sits on Ceres and only turns; the ring is what you see.
  bodies.push({
    id: CERES_FIELD_ID,
    name: 'The Ceres field',
    kind: 'belt',
    orbit: { parent: CERES_ID, radius: 0, period: CERES_FIELD_PERIOD, phase: 0, direction: 1 },
    radius: 0,
    gravity: 0,
    sphere: 0,
    ring: { radius: CERES_FIELD_RADIUS, width: CALDER_SITE.ringWidth },
  });
  return Object.fromEntries(bodies.map((b) => [b.id, b]));
}

/**
 * Sol's NPCs (docs/sol-build.md, slice 2, push 4). Today's hulls stand in
 * until the first fleet (Open Lanes step 2) swaps the loadouts:
 *
 * - **Traders** burn along every Accord lane, and out to the contested
 *   and open ports where the pirates are (Psyche Dig, Jupiter's moons,
 *   Hilda Moot), so the danger has traffic to prey on.
 * - **Patrols** by navy (sol.md, "The navies in Sol"): the MRN on the
 *   Accord lanes, the UDF on the Belt Lane, the ECF round Earth, the VSG
 *   round Venus. They burn between the stations on their beats.
 * - **Miners** work the Ceres field as before.
 * - **Pirates** wait outside contested and open ports, where the Relay says
 *   nobody answers (relay.ts `guardedStations`): the Black Strike at the
 *   Hildas' edge and round Jupiter, raiders at Psyche Dig. The Ceres field
 *   is Core now, so its pirate has gone.
 */
function solSpawners(stations: Readonly<Record<string, Station>>): Spawner[] {
  const blank = { shipId: null, timerTicks: 0, spawned: 0 };
  const docked = (stationId: string): Pick<Spawner, 'position' | 'heading' | 'dockedAt'> => ({ position: { ...stations[stationId]!.position }, heading: 0, dockedAt: stationId });

  const miner = (id: string, loadoutId: string, waitSeconds: number, respawnSeconds: number): Spawner => ({
    id,
    loadoutId,
    ...docked(CERES_ACCORD_ID),
    brain: { kind: 'miner', field: CERES_ACCORD_ID, market: CERES_ACCORD_ID, mode: 'docked', waitTicks: waitSeconds * 60, rockId: null, modeTicks: 0 },
    hold: {},
    respawnSeconds,
    ...blank,
  });

  /** A trader on a loop of ports, starting docked at the first, waiting `waitSeconds` so they do not all leave at once. */
  const trader = (id: string, route: string[], waitSeconds: number, loadoutId = 'tessaract-trader'): Spawner => ({
    id,
    loadoutId,
    ...docked(route[0]!),
    brain: { kind: 'trader', route, leg: 0, waitTicks: Math.round(waitSeconds * 60) },
    hold: { rounds: 4 },
    respawnSeconds: 120,
    ...blank,
  });

  /** A navy patrol on a beat of ports, in its own navy's hull (the first fleet). */
  const patrol = (id: string, power: PowerId, beat: string[], loadoutId = NAVY_PATROL[power]): Spawner => ({
    id,
    loadoutId,
    ...docked(beat[0]!),
    brain: { kind: 'watch', power, beat, leg: 0, mode: 'patrol', targetId: null, modeTicks: 0 },
    hold: { rounds: 10 },
    respawnSeconds: 90,
    ...blank,
  });

  /**
   * A pirate waiting by a port: its home rides the port's own orbit,
   * `PIRATE_LURK` further out, so it stays at the door wherever the port is.
   */
  const pirate = (id: string, stationId: string, phase: number): Spawner => {
    const st = stations[stationId]!;
    const homeOrbit = { ...st.orbit!, radius: st.orbit!.radius + PIRATE_LURK, phase: st.orbit!.phase + phase };
    const at = { x: st.position.x, y: st.position.y };
    return {
      id,
      loadoutId: 'kessari-raider',
      position: at,
      heading: 0,
      dockedAt: null,
      brain: { kind: 'pirate', home: at, homeOrbit, mode: 'prowl', targetId: null, modeTicks: 0, cooldownTicks: 0, patrolIndex: 0, provokedBy: null },
      hold: {},
      respawnSeconds: 120,
      ...blank,
    };
  };

  return [
    // Navies. The ECF's beat keeps its slice-one id so a running world's patrol carries on.
    patrol('patrol-earth', 'earth', [EARTH_ORBITAL_EXCHANGE_ID, ECF_YARD_L5_ID]),
    patrol('patrol-venus', 'venus', [THETIS_ORBITAL_ID, SOLACE_MERCY_ID]),
    patrol('patrol-mars-inner', 'mars', [THETIS_ORBITAL_ID, EARTH_ORBITAL_EXCHANGE_ID, ELYSIUM_ID, EARTH_ORBITAL_EXCHANGE_ID]),
    patrol('patrol-mars-ceres', 'mars', [ELYSIUM_ID, CERES_ACCORD_ID]),
    patrol('patrol-belt', 'belt', [CERES_ACCORD_ID, SLAGLINE_ID]),
    // Pickets: the light hulls, on short beats near home.
    patrol('picket-earth', 'earth', [EARTH_ORBITAL_EXCHANGE_ID, TYCHO_PORT_ID], 'kessari-citation'),
    patrol('picket-mars', 'mars', [ELYSIUM_ID, STATE_YARD_DEIMOS_ID], 'seraphine-picket'),

    // Lane traffic. Start ports are spread so no port runs out of pads at the start (Ceres keeps room for its miners).
    trader('trader-inner', [THETIS_ORBITAL_ID, EARTH_ORBITAL_EXCHANGE_ID, ELYSIUM_ID, EARTH_ORBITAL_EXCHANGE_ID], 5),
    trader('trader-inner-2', [ELYSIUM_ID, EARTH_ORBITAL_EXCHANGE_ID, THETIS_ORBITAL_ID, EARTH_ORBITAL_EXCHANGE_ID], 25),
    trader('trader-ceres', [ELYSIUM_ID, CERES_ACCORD_ID], 15),
    trader('trader-belt', [CERES_ACCORD_ID, SLAGLINE_ID], 10, 'beltforge-hauler'),
    trader('trader-long', [CALLISTO_DEPOT_ID, TITAN_FREE_PORT_ID, CALLISTO_DEPOT_ID, CERES_ACCORD_ID], 20),
    trader('trader-gate', [TITAN_FREE_PORT_ID, ECF_TOLL_ID], 30),
    // Local runs off the lanes, in held space.
    trader('trader-earth', [EARTH_ORBITAL_EXCHANGE_ID, TYCHO_PORT_ID, TESSARACT_L4_ID], 12, 'tessaract-hauler'),
    trader('trader-mars', [ELYSIUM_ID, STATE_YARD_DEIMOS_ID], 18, 'meridian-hauler'),
    // Out where nobody answers: the pirates' prey.
    trader('trader-psyche', [PSYCHE_DIG_ID, CERES_ACCORD_ID], 8, 'beltforge-hauler'),
    trader('trader-jupiter', [CALLISTO_DEPOT_ID, GANYMEDE_LOCAL_ID, HAVEN_EUROPA_ID], 14),
    trader('trader-hilda', [HILDA_MOOT_ID, CERES_ACCORD_ID], 35, 'meridian-hauler'),

    // Miners at Ceres.
    miner('miner-ceres-prospector', 'rookrivet-prospector', 5, 90),
    miner('miner-ceres-prospector-2', 'rookrivet-prospector', 40, 90),
    miner('miner-ceres-barge', 'rookrivet-hulk', 20, 180),
    miner('miner-ceres-rime', 'beltforge-rime', 60, 120),
    miner('miner-ceres-dunlin', 'meridian-dunlin', 80, 120),

    // Pirates where the lore puts them.
    pirate('pirate-psyche', PSYCHE_DIG_ID, 0.15),
    pirate('pirate-ganymede', GANYMEDE_LOCAL_ID, 0.05),
    pirate('pirate-hilda', HILDA_MOOT_ID, 0.00002),
  ];
}

/** How far further out than its port a waiting pirate's home rides, units: close enough that its radar covers the port's approaches. */
const PIRATE_LURK = 1_000;

/** A new Sol world: no pilots yet; new pilots start at Earth Orbital Exchange. */
export function createSolWorld(): World {
  const bodies = solBodies();
  const stations = solStations(bodies);
  const empty: World = {
    system: 'sol',
    homeStationId: EARTH_ORBITAL_EXCHANGE_ID,
    rockSite: SOL_ROCK_SITE,
    tick: 0,
    dt: FIXED_DT,
    pilots: {},
    ships: {},
    npcs: {},
    spawners: solSpawners(stations),
    rules: { ...DEFAULT_RULES },
    projectiles: [],
    munitions: [],
    decoys: [],
    wrecks: [],
    loot: [],
    stations,
    bodies,
    asteroids: screeAsteroids(undefined, undefined, GOODS, SOL_ROCK_SITE),
    hulls: { ...HULLS },
    modules: { ...MODULES },
    loadouts: { ...LOADOUTS },
    manufacturers: { ...MANUFACTURERS },
    weapons: { ...WEAPONS },
    goods: { ...GOODS },
    nextEntityId: 1,
    events: [],
  };
  return setOrbitsMoving(runSpawners(empty), DEFAULT_RULES.orbits);
}
