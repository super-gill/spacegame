import { DOCK_MAX_SPEED } from '../constants.js';
import type { ShipStats, Ship, ShipInput, TraderBrain, World } from '../types.js';
import { speedRelativeTo } from '../docking.js';
import { bodyPosition } from '../rails.js';
import { add, distance, normalise, scale, sub } from '../vec2.js';
import { emptyInput } from '../world.js';
import { awayFromStation, obstacles, pullOn, routeAround, steerSafely, travelVelocity } from './steer.js';

/**
 * Trader: flies a loop of stations, docking at each for a while.
 *
 * Docked: count down, then undock and head for the next station.
 * Flying: approach the destination's near side, match its velocity (it
 * moves on its orbit), and dock once inside dock range and below the
 * docking speed limit relative to it. A refused dock
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
  /** After undocking, move this far clear of the station's hull before setting course, units. */
  departureClearance: 260,
  /** Speed away from the station while clearing it, units/s relative to it. */
  departureSpeed: 70,
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
 * Defence uses the same locks a pilot does, and holds one: lock the
 * hunter, make it active and switch weapons hot, and the turrets engage
 * on their own once the lock completes. Any other lock is dropped first.
 * When nobody is hunting it, the trader unlocks and goes cold.
 */
function defend(world: World, ship: Ship, input: ShipInput): ShipInput {
  const threat = hunter(world, ship);
  const stray = ship.locks.find((l) => l.targetId !== threat?.id);
  const holding = threat ? ship.locks.some((l) => l.targetId === threat.id) : false;
  return {
    ...input,
    unlock: stray?.targetId ?? null,
    lock: threat && !holding && !stray ? threat.id : null,
    activateLock: threat && holding && ship.activeLock !== threat.id ? threat.id : null,
    toggleWeaponsHot: ship.weaponsHot !== (threat !== null),
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
  const slowEnough = speedRelativeTo(ship, station) <= DOCK_MAX_SPEED * TRADER_TUNING.dockSpeedFraction;
  if (inRange && slowEnough) {
    // Set the dwell now; if the dock is refused, the next tick tries again.
    const dwell = Math.round(TRADER_TUNING.dwellSeconds / world.dt);
    return { input: { ...emptyInput(), toggleDock: true }, brain: { ...brain, waitTicks: dwell } };
  }

  // Just undocked: stations move fast on their orbits, so first move
  // clear of the one just left, keeping its velocity, before setting
  // course. Otherwise the station runs the ship down from behind.
  const leftId = brain.route[(brain.leg + brain.route.length - 1) % brain.route.length];
  const left = leftId ? world.stations[leftId] : undefined;
  if (left && left.id !== station.id && distance(ship.position, left.position) < left.radius + TRADER_TUNING.departureClearance) {
    const desired = add(left.velocity, scale(awayFromStation(world, ship, left), TRADER_TUNING.departureSpeed));
    return { input: defend(world, ship, steerSafely(ship, stats, desired, pullOn(world, ship))), brain };
  }

  // Aim for the point on the station's near side, just clear of the hull,
  // unless that side faces the body it orbits: then come in from outside.
  const around = obstacles(world, stats);
  const standoff = station.radius + stats.radius + TRADER_TUNING.approachStandoff;
  let approach = add(station.position, scale(normalise(sub(ship.position, station.position)), standoff));
  const parent = station.orbit ? bodyPosition(world, station.orbit.parent) : null;
  const parentBody = station.orbit ? world.bodies[station.orbit.parent] : undefined;
  if (parent && parentBody && parentBody.radius > 0 && distance(approach, parent) < station.orbit!.radius) {
    approach = add(station.position, scale(normalise(sub(station.position, parent)), standoff));
  }
  const waypoint = routeAround(ship, stats, approach, around);
  const cruise = stats.maxSpeed * TRADER_TUNING.cruiseFraction;
  // Stations move: arrive at the approach point and end up moving with the station.
  const desired = add(station.velocity, travelVelocity(ship, stats, waypoint, approach, cruise));
  return { input: defend(world, ship, steerSafely(ship, stats, desired, pullOn(world, ship))), brain };
}
