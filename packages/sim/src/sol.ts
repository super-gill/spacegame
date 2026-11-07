import { CALDER_SITE, screeAsteroids } from './asteroids.js';
import { FIXED_DT } from './constants.js';
import { GOODS } from './goods.js';
import { HULLS } from './hulls.js';
import { runSpawners } from './lifecycle.js';
import { LOADOUTS } from './loadouts.js';
import { MANUFACTURERS } from './manufacturers.js';
import { MODULES } from './modules.js';
import { pirateHome, setOrbitsMoving } from './rails.js';
import {
  CERES_ACCORD_ID,
  CERES_FIELD_ID,
  CERES_FIELD_PERIOD,
  CERES_FIELD_RADIUS,
  CERES_ID,
  CERES_STATION_PHASE,
  EARTH_ID,
  EARTH_ORBITAL_EXCHANGE_ID,
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
import { solStations } from './sol-ports.js';
import type { Body, RockSite, Spawner, Station, World } from './types.js';

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

/** How far inward of the Ceres field's ring the pirate lurks, on the miners' way home. */
const PIRATE_HOME_INWARD = 1_300;

/**
 * Sol's NPCs for slice 1, all round one port each, since only pilots can
 * burn yet: Earth's toll patrol flying round Earth Orbital Exchange, two
 * prospectors and a barge working the Ceres field and selling at the
 * Accord station, and a Black Strike raider lurking at the field's edge
 * for them. Traders come back in slice 2, when NPCs can burn.
 */
function solSpawners(stations: Readonly<Record<string, Station>>, bodies: Readonly<Record<string, Body>>): Spawner[] {
  const exchange = stations[EARTH_ORBITAL_EXCHANGE_ID]!;
  const ceres = stations[CERES_ACCORD_ID]!;
  const blank = { shipId: null, timerTicks: 0, spawned: 0 };
  const homeOrbit = { parent: CERES_FIELD_ID, radius: CERES_FIELD_RADIUS - PIRATE_HOME_INWARD, period: CERES_FIELD_PERIOD, phase: CERES_STATION_PHASE + Math.PI, direction: 1 as const };
  const pirateAt = pirateHome({ bodies, tick: 0, dt: FIXED_DT }, { x: 0, y: 0 }, homeOrbit);
  const miner = (id: string, loadoutId: string, waitSeconds: number, respawnSeconds: number): Spawner => ({
    id,
    loadoutId,
    position: { ...ceres.position },
    heading: 0,
    dockedAt: ceres.id,
    brain: { kind: 'miner', field: ceres.id, market: ceres.id, mode: 'docked', waitTicks: waitSeconds * 60, rockId: null, modeTicks: 0 },
    hold: {},
    respawnSeconds,
    ...blank,
  });
  return [
    {
      id: 'patrol-earth',
      loadoutId: 'calder-watch',
      position: { ...exchange.position },
      heading: 0,
      dockedAt: exchange.id,
      brain: { kind: 'watch', beat: [exchange.id, exchange.id], leg: 0, mode: 'patrol', targetId: null, modeTicks: 0 },
      hold: { rounds: 10 },
      respawnSeconds: 60,
      ...blank,
    },
    miner('miner-ceres-prospector', 'rookrivet-prospector', 5, 90),
    miner('miner-ceres-prospector-2', 'rookrivet-prospector', 40, 90),
    miner('miner-ceres-barge', 'rookrivet-hulk', 20, 180),
    {
      id: 'pirate-ceres',
      loadoutId: 'kessari-raider',
      position: pirateAt,
      heading: Math.PI,
      dockedAt: null,
      brain: { kind: 'pirate', home: pirateAt, homeOrbit, mode: 'prowl', targetId: null, modeTicks: 0, cooldownTicks: 0, patrolIndex: 0, provokedBy: null },
      hold: {},
      respawnSeconds: 45,
      ...blank,
    },
  ];
}

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
    spawners: solSpawners(stations, bodies),
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
