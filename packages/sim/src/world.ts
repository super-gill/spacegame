import { FIXED_DT } from './constants.js';
import { buildShip } from './factory.js';
import { HULLS } from './hulls.js';
import { runSpawners } from './lifecycle.js';
import type { Pilot, Ship, ShipInput, Spawner, Station, World } from './types.js';
import { WEAPONS } from './weapons.js';
import { add, fromAngle, scale } from './vec2.js';

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
    selectTarget: null,
    toggleWeaponsHot: false,
    tractor: false,
  };
}

/** The station new pilots start next to. */
export const STARTER_STATION_ID = 'station-harbour';

/** Hull every new pilot is given. */
export const STARTER_HULL_ID = 'sparrow';

/** How far from the starter station a new pilot's ship appears. */
const SPAWN_DISTANCE = 650;

/**
 * The starter sector: two stations, a trader running between them and a
 * pirate prowling the lane. No pilots; they are added with `joinPilot`.
 * NPCs come from spawners, so a destroyed trader or pirate is replaced
 * after a while. This is content, not engine; later sectors will be data
 * files.
 *
 * New pilots spawn inside Harbour Station's security zone, so they are
 * never hunted the moment they arrive.
 */
export function createStarterWorld(): World {
  const harbour: Station = {
    id: STARTER_STATION_ID,
    name: 'Harbour Station',
    position: { x: 0, y: 0 },
    radius: 90,
    dockRange: 220,
    securityRadius: 900,
  };
  const outpost: Station = {
    id: 'station-ridge',
    name: 'Ridge Outpost',
    position: { x: 4800, y: -1600 },
    radius: 70,
    dockRange: 190,
    securityRadius: 700,
  };

  // The trader starts docked at Harbour and leaves after a short wait.
  const trader: Spawner = {
    id: 'trader',
    hullId: 'mule',
    position: { ...harbour.position },
    heading: -0.34,
    dockedAt: harbour.id,
    brain: { kind: 'trader', route: [harbour.id, outpost.id], leg: 0, waitTicks: 3 * 60 },
    respawnSeconds: 30,
    shipId: null,
    timerTicks: 0,
    spawned: 0,
  };

  // The pirate lurks off the lane between the two stations, outside both zones.
  const pirateHome = { x: 2600, y: -300 };
  const pirate: Spawner = {
    id: 'pirate',
    hullId: 'jackal',
    position: pirateHome,
    heading: Math.PI,
    dockedAt: null,
    brain: {
      kind: 'pirate',
      home: pirateHome,
      mode: 'prowl',
      targetId: null,
      modeTicks: 0,
      cooldownTicks: 0,
      patrolIndex: 0,
      provokedBy: null,
    },
    respawnSeconds: 45,
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
    spawners: [trader, pirate],
    projectiles: [],
    wrecks: [],
    loot: [],
    stations: { [harbour.id]: harbour, [outpost.id]: outpost },
    hulls: { ...HULLS },
    weapons: { ...WEAPONS },
    nextEntityId: 1,
    events: [],
  };
  // Spawners with no ship and no timer spawn at once, so NPCs exist from tick 0.
  return runSpawners(empty);
}

/** Deterministic id for the `n`th ship issued to a pilot, counting from 1. */
export function pilotShipId(pilotId: string, n: number): string {
  return `ship-${pilotId}-${n}`;
}

/** Id of a pilot's first ship. */
export function starterShipId(pilotId: string): string {
  return pilotShipId(pilotId, 1);
}

/**
 * Issue a pilot a new starter ship near the starter station. Spawn points
 * are spread round the station by how many pilots there are, so pilots
 * arriving together do not appear on top of each other.
 */
function issueStarterShip(world: World, pilot: Pilot): World {
  const station = world.stations[STARTER_STATION_ID];
  const hull = world.hulls[STARTER_HULL_ID];
  if (!station) throw new Error(`Starter station "${STARTER_STATION_ID}" missing from world`);
  if (!hull) throw new Error(`Starter hull "${STARTER_HULL_ID}" missing from world`);

  const index = Object.keys(world.pilots).sort().indexOf(pilot.id);
  const angle = Math.max(0, index) * (Math.PI / 3);
  const n = pilot.shipsIssued + 1;
  const ship = buildShip({
    id: pilotShipId(pilot.id, n),
    hull,
    weapons: world.weapons,
    ownerId: pilot.id,
    position: add(station.position, scale(fromAngle(angle), SPAWN_DISTANCE)),
    heading: angle + Math.PI, // facing the station
    flightMode: 'assisted',
  });
  return {
    ...world,
    pilots: { ...world.pilots, [pilot.id]: { ...pilot, shipId: ship.id, shipsIssued: n } },
    ships: { ...world.ships, [ship.id]: ship },
  };
}

/**
 * Bring a pilot into the world. Pure: returns a new World.
 *
 * - A pilot seen before keeps everything they had: same ship, same place.
 *   Their progress is theirs and survives leaving and rejoining. If their
 *   ship was destroyed they stay without one until they respawn.
 * - A new pilot is created with a starter ship near the starter station.
 */
export function joinPilot(world: World, pilotId: string, name: string): World {
  const existing = world.pilots[pilotId];
  if (existing) {
    // Returning pilot: only the display name may change.
    if (existing.name === name) return world;
    return { ...world, pilots: { ...world.pilots, [pilotId]: { ...existing, name } } };
  }
  const pilot: Pilot = { id: pilotId, name, shipId: null, shipsIssued: 0 };
  return issueStarterShip({ ...world, pilots: { ...world.pilots, [pilotId]: pilot } }, pilot);
}

/**
 * Give a pilot whose ship was destroyed a fresh starter ship at the
 * starter station. Does nothing if the pilot still has a ship. This is a
 * pilot command, not a ship input: over a network it is a request the
 * client sends once.
 */
export function respawnPilot(world: World, pilotId: string): World {
  const pilot = world.pilots[pilotId];
  if (!pilot || pilot.shipId) return world;
  return issueStarterShip(world, pilot);
}

/** The ship a pilot is currently flying, or null. */
export function pilotShip(world: World, pilotId: string): Ship | null {
  const shipId = world.pilots[pilotId]?.shipId;
  return shipId ? (world.ships[shipId] ?? null) : null;
}
