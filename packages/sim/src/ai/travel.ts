import { burnEndPoint, stationTarget } from '../burn.js';
import { BURN_MIN_DISTANCE } from '../constants.js';
import type { Ship, ShipInput, ShipStats, Station, World } from '../types.js';
import { distance, add, scale } from '../vec2.js';
import { emptyInput } from '../world.js';
import { TRADER_TUNING, flyToStation } from './trader.js';
import { awayFromStation, flightOn, steerSafely } from './steer.js';

/**
 * Getting an NPC to a station anywhere in the system (docs/sol-build.md,
 * slice 2, push 4): a burn if it is far, ordinary flight if it is near.
 *
 * - Burning: the burn flies the ship (step.ts); nothing to do but wait.
 * - Far (the burn would be at least `BURN_MIN_DISTANCE`, with a margin so
 *   a burn's own end point never counts as far): first clear the station
 *   just left, then ask for a burn. The step checks and starts it, exactly
 *   as it would a pilot's.
 * - Near: fly in and dock, as Calder's traders always have.
 *
 * In Calder every station is near, so nothing there changes.
 */

/** A station counts as far once its burn would be this many times `BURN_MIN_DISTANCE`. */
export const FAR_FACTOR = 1.5;

export interface Travel {
  input: ShipInput;
  /** Send `toggleDock`: in range and slow enough. */
  dock: boolean;
  /** Ask for a burn for this station. */
  burn?: string;
}

/** Whether `station` is a burn away from `ship`. */
export function farFrom(ship: Ship, station: Station): boolean {
  return distance(ship.position, burnEndPoint(stationTarget(station), ship.position)) >= BURN_MIN_DISTANCE * FAR_FACTOR;
}

export function travelTo(world: World, ship: Ship, stats: ShipStats, station: Station, left?: Station): Travel {
  if (ship.burn) return { input: emptyInput(), dock: false };
  if (!farFrom(ship, station)) return flyToStation(world, ship, stats, station, left);
  // Clear the station just left first, keeping its velocity, so the burn does not start against its hull.
  if (left && distance(ship.position, left.position) < left.radius + TRADER_TUNING.departureClearance) {
    const desired = add(left.velocity, scale(awayFromStation(world, ship, left), TRADER_TUNING.departureSpeed));
    return { input: steerSafely(ship, stats, desired, flightOn(world, ship, stats)), dock: false };
  }
  return { input: emptyInput(), dock: false, burn: station.id };
}
