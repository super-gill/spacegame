import { DOCK_MAX_SPEED } from '../constants.js';
import type { HullSpec, Ship, ShipInput, TraderBrain, World } from '../types.js';
import { add, distance, length, normalise, scale, sub } from '../vec2.js';
import { emptyInput } from '../world.js';
import { arriveVelocity, routeAround, steerToVelocity } from './steer.js';

/**
 * Trader: flies a loop of stations, docking at each for a while.
 *
 * Docked: count down, then undock and head for the next station.
 * Flying: approach the destination's near side, slow down, and dock once
 * inside dock range and below the docking speed limit. A refused dock
 * just means trying again next tick.
 *
 * Later this is where cargo is bought and sold; for now the trader is
 * traffic, and a target.
 */

export const TRADER_TUNING = {
  /** Seconds docked at each station. */
  dwellSeconds: 8,
  /** Cruise speed as a fraction of the hull's top speed. */
  cruiseFraction: 0.8,
  /** How far outside the hull to aim the approach, units. */
  approachStandoff: 50,
  /** Only request docking below this fraction of the docking speed limit. */
  dockSpeedFraction: 0.7,
};

export interface TraderThought {
  input: ShipInput;
  brain: TraderBrain;
}

export function thinkTrader(world: World, ship: Ship, hull: HullSpec, brain: TraderBrain): TraderThought {
  const stationId = brain.route[brain.leg];
  const station = stationId ? world.stations[stationId] : undefined;
  if (!station) return { input: emptyInput(), brain };

  if (ship.state === 'docked') {
    if (brain.waitTicks > 0) return { input: emptyInput(), brain: { ...brain, waitTicks: brain.waitTicks - 1 } };
    // Done here: undock and set course for the next stop.
    return {
      input: { ...emptyInput(), toggleDock: true },
      brain: { ...brain, leg: (brain.leg + 1) % brain.route.length },
    };
  }

  const inRange = distance(ship.position, station.position) <= station.dockRange;
  const slowEnough = length(ship.velocity) <= DOCK_MAX_SPEED * TRADER_TUNING.dockSpeedFraction;
  if (inRange && slowEnough) {
    // Set the dwell now; if the dock is refused, the next tick tries again.
    const dwell = Math.round(TRADER_TUNING.dwellSeconds / world.dt);
    return { input: { ...emptyInput(), toggleDock: true }, brain: { ...brain, waitTicks: dwell } };
  }

  // Aim for the point on the station's near side, just clear of the hull.
  const fromStation = normalise(sub(ship.position, station.position));
  const approach = add(station.position, scale(fromStation, station.radius + hull.radius + TRADER_TUNING.approachStandoff));
  const waypoint = routeAround(ship, hull, approach, world.stations);
  const cruise = hull.maxSpeed * TRADER_TUNING.cruiseFraction;
  const desired = arriveVelocity(ship, hull, waypoint, cruise);
  return { input: steerToVelocity(ship, hull, desired), brain };
}
