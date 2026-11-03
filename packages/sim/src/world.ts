import { FIXED_DT } from './constants.js';
import { HULLS } from './hulls.js';
import type { PlayerInput, Ship, Station, World } from './types.js';

/** A blank input: nothing pressed, hold heading. */
export function emptyInput(): PlayerInput {
  return {
    turnLeft: false,
    turnRight: false,
    thrustForward: false,
    thrustReverse: false,
    strafeLeft: false,
    strafeRight: false,
    brake: false,
    toggleDock: false,
  };
}

/**
 * The starter sector: one station and the player ship a short flight away.
 * This is content, not engine. Later sectors will be data files.
 */
export function createStarterWorld(): World {
  const station: Station = {
    id: 'station-harbour',
    name: 'Harbour Station',
    position: { x: 0, y: 0 },
    radius: 90,
    dockRange: 220,
  };

  const player: Ship = {
    id: 'player',
    hullId: 'sparrow',
    position: { x: 600, y: 250 },
    velocity: { x: 0, y: 0 },
    heading: Math.PI,
    angularVelocity: 0,
    state: 'flying',
    dockedAt: null,
  };

  return {
    tick: 0,
    dt: FIXED_DT,
    playerShipId: player.id,
    ships: { [player.id]: player },
    stations: { [station.id]: station },
    hulls: { ...HULLS },
    events: [],
  };
}

export function playerShip(world: World): Ship {
  const ship = world.ships[world.playerShipId];
  if (!ship) throw new Error(`Player ship "${world.playerShipId}" missing from world`);
  return ship;
}
