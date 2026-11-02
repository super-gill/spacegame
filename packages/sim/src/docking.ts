import { DOCK_MAX_SPEED, UNDOCK_CLEARANCE, UNDOCK_PUSH_SPEED } from './constants.js';
import type { Ship, Station, WorldEvent } from './types.js';
import { add, distance, fromAngle, length, scale, sub, toAngle } from './vec2.js';

/**
 * Docking rules.
 *
 * A ship may dock when it is inside a station's dock range and moving
 * slowly. Docking parks the ship at the station; undocking places it just
 * outside the station on the side it was last facing, with a gentle push.
 */

export interface DockAttempt {
  ship: Ship;
  event: WorldEvent;
}

/** Find the nearest station within dock range of the ship, if any. */
export function nearestDockableStation(ship: Ship, stations: Record<string, Station>): Station | null {
  let best: Station | null = null;
  let bestDist = Infinity;
  for (const station of Object.values(stations)) {
    const d = distance(ship.position, station.position);
    if (d <= station.dockRange && d < bestDist) {
      best = station;
      bestDist = d;
    }
  }
  return best;
}

export function tryDock(ship: Ship, stations: Record<string, Station>): DockAttempt {
  const station = nearestDockableStation(ship, stations);
  if (!station) {
    return { ship, event: { type: 'dockRefused', shipId: ship.id, reason: 'tooFar' } };
  }
  if (length(ship.velocity) > DOCK_MAX_SPEED) {
    return { ship, event: { type: 'dockRefused', shipId: ship.id, reason: 'tooFast' } };
  }
  return {
    ship: {
      ...ship,
      state: 'docked',
      dockedAt: station.id,
      position: { ...station.position },
      velocity: { x: 0, y: 0 },
    },
    event: { type: 'docked', shipId: ship.id, stationId: station.id },
  };
}

export function undock(ship: Ship, stations: Record<string, Station>): DockAttempt | null {
  if (ship.state !== 'docked' || ship.dockedAt === null) return null;
  const station = stations[ship.dockedAt];
  if (!station) return null;

  // Leave in the direction the ship is facing, clear of the station hull.
  const outward = fromAngle(ship.heading);
  const position = add(station.position, scale(outward, station.radius + UNDOCK_CLEARANCE));
  const velocity = scale(outward, UNDOCK_PUSH_SPEED);

  return {
    ship: { ...ship, state: 'flying', dockedAt: null, position, velocity },
    event: { type: 'undocked', shipId: ship.id, stationId: station.id },
  };
}

/** Heading from the station centre to the ship, used by renderers to draw approach guides. */
export function bearingFromStation(station: Station, ship: Ship): number {
  return toAngle(sub(ship.position, station.position));
}
