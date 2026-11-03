import { FIXED_DT } from './constants.js';
import { idleThrusters } from './flight.js';
import { HULLS } from './hulls.js';
import type { NpcBrain, Pilot, Ship, ShipInput, Station, World } from './types.js';
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
  };
}

/** The station new pilots start next to. */
export const STARTER_STATION_ID = 'station-harbour';

/** Hull every new pilot is given. */
export const STARTER_HULL_ID = 'sparrow';

/** How far from the starter station a new pilot's ship appears. */
const SPAWN_DISTANCE = 650;

/** An NPC ship with its brain, ready to add to a world. */
function npcShip(id: string, hullId: string, position: Ship['position'], heading: number): Ship {
  return {
    id,
    hullId,
    ownerId: null,
    position,
    velocity: { x: 0, y: 0 },
    heading,
    angularVelocity: 0,
    state: 'flying',
    dockedAt: null,
    flightMode: 'rotation', // NPC steering handles drift itself; see ai/steer.ts
    thrusters: idleThrusters(),
  };
}

/**
 * The starter sector: two stations, a trader running between them and a
 * pirate prowling the lane. No pilots; they are added with `joinPilot`.
 * This is content, not engine; later sectors will be data files.
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
  const trader: Ship = {
    ...npcShip('npc-trader-1', 'mule', { ...harbour.position }, -0.34),
    state: 'docked',
    dockedAt: harbour.id,
  };
  const traderBrain: NpcBrain = { kind: 'trader', route: [harbour.id, outpost.id], leg: 0, waitTicks: 3 * 60 };

  // The pirate lurks off the lane between the two stations, outside both zones.
  const pirateHome = { x: 2600, y: -300 };
  const pirate = npcShip('npc-pirate-1', 'jackal', pirateHome, Math.PI);
  const pirateBrain: NpcBrain = {
    kind: 'pirate',
    home: pirateHome,
    mode: 'prowl',
    targetId: null,
    modeTicks: 0,
    cooldownTicks: 0,
    patrolIndex: 0,
  };

  return {
    tick: 0,
    dt: FIXED_DT,
    pilots: {},
    ships: { [trader.id]: trader, [pirate.id]: pirate },
    npcs: { [trader.id]: traderBrain, [pirate.id]: pirateBrain },
    stations: { [harbour.id]: harbour, [outpost.id]: outpost },
    hulls: { ...HULLS },
    events: [],
  };
}

/** Deterministic ship id for a pilot's starter ship. */
export function starterShipId(pilotId: string): string {
  return `ship-${pilotId}-1`;
}

/**
 * Bring a pilot into the world. Pure: returns a new World.
 *
 * - A pilot seen before keeps everything they had: same ship, same place.
 *   Their progress is theirs and survives leaving and rejoining.
 * - A new pilot is created with a starter ship near the starter station.
 *   Spawn points are spread round the station so pilots joining together
 *   do not appear on top of each other.
 */
export function joinPilot(world: World, pilotId: string, name: string): World {
  const existing = world.pilots[pilotId];
  if (existing) {
    // Returning pilot: only the display name may change.
    if (existing.name === name) return world;
    return { ...world, pilots: { ...world.pilots, [pilotId]: { ...existing, name } } };
  }

  const station = world.stations[STARTER_STATION_ID];
  if (!station) throw new Error(`Starter station "${STARTER_STATION_ID}" missing from world`);

  // Spread spawns evenly by join order, starting east of the station.
  const index = Object.keys(world.pilots).length;
  const angle = index * (Math.PI / 3);
  const position = add(station.position, scale(fromAngle(angle), SPAWN_DISTANCE));

  const shipId = starterShipId(pilotId);
  const ship: Ship = {
    id: shipId,
    hullId: STARTER_HULL_ID,
    ownerId: pilotId,
    position,
    velocity: { x: 0, y: 0 },
    heading: angle + Math.PI, // facing the station
    angularVelocity: 0,
    state: 'flying',
    dockedAt: null,
    flightMode: 'assisted',
    thrusters: idleThrusters(),
  };
  const pilot: Pilot = { id: pilotId, name, shipId };

  return {
    ...world,
    pilots: { ...world.pilots, [pilotId]: pilot },
    ships: { ...world.ships, [shipId]: ship },
  };
}

/** The ship a pilot is currently flying, or null. */
export function pilotShip(world: World, pilotId: string): Ship | null {
  const shipId = world.pilots[pilotId]?.shipId;
  return shipId ? (world.ships[shipId] ?? null) : null;
}
