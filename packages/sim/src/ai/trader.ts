import { angleDelta } from '../angle.js';
import { leadPoint } from '../combat.js';
import { DOCK_MAX_SPEED } from '../constants.js';
import type { HullSpec, Ship, ShipInput, TraderBrain, World } from '../types.js';
import { add, distance, length, normalise, scale, sub, toAngle } from '../vec2.js';
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
 * route and fires its turrets at the pirate whenever it is in range and
 * the turret has slewed on to the lead point. It never chases.
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
  /** Fire a turret when it is within this angle of its lead point, radians. */
  turretTolerance: 0.1,
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

/** Aim turrets at whoever is hunting us and fire when on target and in range. */
function defend(world: World, ship: Ship, input: ShipInput): ShipInput {
  const threat = hunter(world, ship);
  if (!threat) return input;
  const turret = ship.weapons.find((w) => world.weapons[w.weaponId]?.kind === 'turret');
  const spec = turret ? world.weapons[turret.weaponId] : undefined;
  if (!turret || !spec) return input;

  const aimAt = leadPoint(ship, threat, spec.projectileSpeed);
  const onTarget = Math.abs(angleDelta(turret.aim, toAngle(sub(aimAt, ship.position)))) <= TRADER_TUNING.turretTolerance;
  const inRange = distance(ship.position, threat.position) <= spec.range;
  return { ...input, aimAt, fireTurret: onTarget && inRange };
}

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
  return { input: defend(world, ship, steerToVelocity(ship, hull, desired)), brain };
}
