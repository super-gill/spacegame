import { FIXED_DT, STARTING_CREDITS } from './constants.js';
import { GOODS } from './goods.js';
import { HULLS } from './hulls.js';
import { runSpawners } from './lifecycle.js';
import { LOADOUTS } from './loadouts.js';
import { MANUFACTURERS } from './manufacturers.js';
import { MODULES } from './modules.js';
import { issueShip, STARTER_LOADOUT_ID, STARTER_STATION_ID } from './pilots.js';
import { screeAsteroids } from './asteroids.js';
import { BELT_ID, BELT_PERIOD, BELT_RING_RADIUS, starterBodies } from './bodies.js';
import { pirateHome, setOrbitsMoving } from './rails.js';
import { HARBOUR_ID, LANTERN_ID, RIDGE_ID, RIDGE_PHASE, starterStations } from './stations.js';
import type { Pilot, Ship, ShipInput, Spawner, World, WorldRules } from './types.js';
import { WEAPONS } from './weapons.js';

/** A blank input: nothing pressed. */
export function emptyInput(): ShipInput {
  return {
    turnLeft: false,
    turnRight: false,
    thrustForward: false,
    thrustReverse: false,
    strafeLeft: false,
    strafeRight: false,
    brake: false,
    toggleDock: false,
    cycleFlightMode: false,
    fireFixed: false,
    selectGroup: null,
    launchCountermeasure: false,
    aimHeading: null,
    lock: null,
    unlock: null,
    activateLock: null,
    toggleWeaponsHot: false,
    tractor: false,
  };
}

export { STARTER_STATION_ID, STARTER_LOADOUT_ID, pilotShipId, starterShipId, respawnPilot } from './pilots.js';

/** How far inward of Ridge Outpost, towards the star, the pirate's home is, units. */
const PIRATE_HOME_INWARD = 1300;

/** The rules a new world starts with: mechanics under trial, off (see `WorldRules`). */
export const DEFAULT_RULES: WorldRules = { gravity: false, orbits: false };

/**
 * The starter system, Calder (bodies.ts, stations.ts): a star, a planet
 * with Harbour Station in low orbit, a moon, and the belt with Ridge
 * Outpost on it. A trader runs between the two stations and a pirate
 * prowls inward of Ridge, riding the belt's turn. No pilots; they are added with `joinPilot`.
 * NPCs come from spawners, so a destroyed trader or pirate is replaced
 * after a while. This is content, not engine; later sectors will be data
 * files.
 *
 * New pilots spawn inside Harbour Station's security zone, so they are
 * never hunted the moment they arrive. Harbour has outfitting and a ship
 * mart; Ridge Outpost has neither, so refitting or buying a ship means a
 * trip home. Station data lives in stations.ts.
 */
export function createStarterWorld(): World {
  const stations = starterStations();
  const harbour = stations[HARBOUR_ID]!;
  const outpost = stations[RIDGE_ID]!;

  // The trader starts docked at Harbour and leaves after a short wait.
  // Tessaract contract traders round the triangle: food and medicine from
  // Harbour to the Ridge, ore from the Ridge to Lantern Works, machinery
  // back out. Two of them, starting at opposite corners.
  const works = stations[LANTERN_ID]!;
  const triangle = [harbour.id, outpost.id, works.id];
  const trader: Spawner = {
    id: 'trader',
    loadoutId: 'tessaract-trader',
    position: { ...harbour.position },
    heading: -0.34,
    dockedAt: harbour.id,
    brain: { kind: 'trader', route: triangle, leg: 0, waitTicks: 3 * 60 },
    hold: { food: 30, medicine: 10, rounds: 4 }, // a prize worth a pirate's time, and boxes of rounds for the swivel
    respawnSeconds: 30,
    shipId: null,
    timerTicks: 0,
    spawned: 0,
  };
  const secondTrader: Spawner = {
    ...trader,
    id: 'trader-lantern',
    position: { ...works.position },
    dockedAt: works.id,
    brain: { kind: 'trader', route: triangle, leg: 2, waitTicks: 20 * 60 },
    hold: { machinery: 25, rounds: 4 },
  };

  // The pirate lurks a little inward of Ridge, on the traders' way in,
  // outside its security zone, and turns with the belt so it stays there.
  const bodies = starterBodies();
  const homeOrbit = { parent: BELT_ID, radius: BELT_RING_RADIUS - PIRATE_HOME_INWARD, period: BELT_PERIOD, phase: RIDGE_PHASE, direction: 1 as const };
  const pirateHomeNow = pirateHome({ bodies, tick: 0, dt: FIXED_DT }, { x: 0, y: 0 }, homeOrbit);
  const pirate: Spawner = {
    id: 'pirate',
    loadoutId: 'kessari-raider',
    position: pirateHomeNow,
    heading: Math.PI,
    dockedAt: null,
    brain: {
      kind: 'pirate',
      home: pirateHomeNow,
      homeOrbit,
      mode: 'prowl',
      targetId: null,
      modeTicks: 0,
      cooldownTicks: 0,
      patrolIndex: 0,
      provokedBy: null,
    },
    hold: {}, // the raider's Fairshot runs on its capacitor
    respawnSeconds: 45,
    shipId: null,
    timerTicks: 0,
    spawned: 0,
  };

  // The Calder Watch flies a beat round all three stations, starting from Harbour.
  const watch: Spawner = {
    id: 'watch',
    loadoutId: 'calder-watch',
    position: { ...harbour.position },
    heading: 0,
    dockedAt: harbour.id,
    brain: { kind: 'watch', beat: [harbour.id, works.id, harbour.id, outpost.id], leg: 0, mode: 'patrol', targetId: null, modeTicks: 0 },
    hold: { rounds: 10 }, // boxes for the Picket
    respawnSeconds: 60,
    shipId: null,
    timerTicks: 0,
    spawned: 0,
  };

  const empty: World = {
    tick: 0,
    dt: FIXED_DT,
    pilots: {},
    ships: {},
    npcs: {},
    spawners: [trader, secondTrader, watch, pirate],
    rules: { ...DEFAULT_RULES },
    projectiles: [],
    munitions: [],
    decoys: [],
    wrecks: [],
    loot: [],
    stations,
    bodies,
    asteroids: screeAsteroids(),
    hulls: { ...HULLS },
    modules: { ...MODULES },
    loadouts: { ...LOADOUTS },
    manufacturers: { ...MANUFACTURERS },
    weapons: { ...WEAPONS },
    goods: { ...GOODS },
    nextEntityId: 1,
    events: [],
  };
  // Spawners with no ship and no timer spawn at once, so NPCs exist from tick 0.
  // Orbits start stopped unless the rules say otherwise (WorldRules.orbits).
  return setOrbitsMoving(runSpawners(empty), DEFAULT_RULES.orbits);
}

/**
 * Bring a pilot into the world. Pure: returns a new World.
 *
 * - A pilot seen before keeps everything they had: same ship, same place.
 *   Their progress is theirs and survives leaving and rejoining. If they
 *   lost their escape pod they stay without a ship until they wake.
 * - A new pilot is created with a starter ship in space near the starter station.
 */
export function joinPilot(world: World, pilotId: string, name: string): World {
  const existing = world.pilots[pilotId];
  if (existing) {
    // Returning pilot: only the display name may change.
    if (existing.name === name) return world;
    return { ...world, pilots: { ...world.pilots, [pilotId]: { ...existing, name } } };
  }
  const pilot: Pilot = { id: pilotId, name, shipId: null, shipsIssued: 0, credits: STARTING_CREDITS, storage: {} };
  // New pilots arrive in space just off Harbour, facing it, so the first
  // thing they do is fly and dock.
  return issueShip({ ...world, pilots: { ...world.pilots, [pilotId]: pilot } }, pilotId, STARTER_LOADOUT_ID, STARTER_STATION_ID, true).world;
}

/** The ship a pilot is currently flying, or null. */
export function pilotShip(world: World, pilotId: string): Ship | null {
  const shipId = world.pilots[pilotId]?.shipId;
  return shipId ? (world.ships[shipId] ?? null) : null;
}
