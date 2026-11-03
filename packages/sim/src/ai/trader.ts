import { DOCK_MAX_SPEED } from '../constants.js';
import type { ShipStats, Ship, ShipInput, TraderBrain, World } from '../types.js';
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
 * Defence: while a pirate is hunting it, the trader keeps flying its
 * route, targets the pirate and switches weapons hot, so its turrets
 * engage on their own. It never chases.
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

/** The nearest pirate currently hunting this ship, or null. */
function hunter(world: World, ship: Ship): Ship | null {
  let best: Ship | null = null;
  let bestDist = Infinity;
  for (const [id, brain] of Object.entries(world.npcs)) {
    if (brain.kind !== 'pirate' || brain.mode !== 'hunt' || brain.targetId !== ship.id) continue;
    const pirate = world.ships[id];
    if (!pirate) continue;
    const d = distance(ship.position, pirate.position);
    if (d < bestDist) {
      best = pirate;
      bestDist = d;
    }
  }
  return best;
}

/**
 * Defence uses the same targeting a pilot does: select the hunter as the
 * target and switch weapons hot, and the turrets engage on their own.
 * When nobody is hunting it, the trader goes cold and clears its target.
 */
function defend(world: World, ship: Ship, input: ShipInput): ShipInput {
  const threat = hunter(world, ship);
  const wantHot = threat !== null;
  const wantTarget = threat?.id ?? null;
  return {
    ...input,
    selectTarget: ship.targetId !== wantTarget ? { id: wantTarget } : null,
    toggleWeaponsHot: ship.weaponsHot !== wantHot,
  };
}

export interface TraderThought {
  input: ShipInput;
  brain: TraderBrain;
}

export function thinkTrader(world: World, ship: Ship, stats: ShipStats, brain: TraderBrain): TraderThought {
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
  const approach = add(station.position, scale(fromStation, station.radius + stats.radius + TRADER_TUNING.approachStandoff));
  const waypoint = routeAround(ship, stats, approach, world.stations);
  const cruise = stats.maxSpeed * TRADER_TUNING.cruiseFraction;
  const desired = arriveVelocity(ship, stats, waypoint, cruise);
  return { input: defend(world, ship, steerToVelocity(ship, stats, desired)), brain };
}
