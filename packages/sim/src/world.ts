import { FIXED_DT } from './constants.js';
import { idleThrusters } from './flight.js';
import { HULLS } from './hulls.js';
import type { Pilot, Ship, ShipInput, Station, World } from './types.js';
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

/**
 * An empty starter sector: one station, no pilots. Pilots are added with
 * `joinPilot`. This is content, not engine; later sectors will be data
 * files.
 */
export function createStarterWorld(): World {
  const station: Station = {
    id: STARTER_STATION_ID,
    name: 'Harbour Station',
    position: { x: 0, y: 0 },
    radius: 90,
    dockRange: 220,
  };

  return {
    tick: 0,
    dt: FIXED_DT,
    pilots: {},
    ships: {},
    stations: { [station.id]: station },
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
