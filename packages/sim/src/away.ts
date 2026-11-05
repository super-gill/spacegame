import type { Ship, StoredDrone, World } from './types.js';

/**
 * Logging off in space (docs/shared-world.md, decision 1, Jason): the
 * ship stays where it is for a short while, then disappears until its
 * pilot returns, and comes back where it was.
 *
 * Only the ship the pilot is flying, and only in flight: a docked ship is
 * already safe at its station, and ships the pilot owns but is not flying
 * stay wherever they were left, as they always have. Drones out are taken
 * back into the bay with the ship, so nothing is lost by logging off.
 *
 * The server calls `pilotLeft` and `pilotReturned` as players disconnect
 * and log in, and `stepAway` every tick.
 */

/** How long a logged-off pilot's ship stays in space before it disappears, seconds. */
export const AWAY_GRACE_SECONDS = 60;

/** A pilot logged off: note when. */
export function pilotLeft(world: World, pilotId: string): World {
  const pilot = world.pilots[pilotId];
  if (!pilot || pilot.away) return world;
  return { ...world, pilots: { ...world.pilots, [pilotId]: { ...pilot, away: { sinceTick: world.tick } } } };
}

/** A pilot logged back in: their ship comes back where it was, stopped. */
export function pilotReturned(world: World, pilotId: string): World {
  const pilot = world.pilots[pilotId];
  if (!pilot || (!pilot.away && !pilot.stowed)) return world;
  const { away: _away, stowed, ...rest } = pilot;
  const ships = stowed ? { ...world.ships, [stowed.id]: { ...stowed, velocity: { x: 0, y: 0 }, angularVelocity: 0 } } : world.ships;
  return { ...world, ships, pilots: { ...world.pilots, [pilotId]: rest } };
}

/** Take the ships of pilots away longer than the grace out of space. */
export function stepAway(world: World): World {
  const graceTicks = Math.round(AWAY_GRACE_SECONDS / world.dt);
  let next = world;
  for (const pilot of Object.values(world.pilots)) {
    if (!pilot.away || pilot.stowed || world.tick - pilot.away.sinceTick < graceTicks || !pilot.shipId) continue;
    const ship = next.ships[pilot.shipId];
    if (!ship || ship.state !== 'flying') continue;
    next = stow(next, pilot.id, ship);
  }
  return next;
}

/** One ship out of space, with its drones back in its bay. */
function stow(world: World, pilotId: string, ship: Ship): World {
  const ships = { ...world.ships };
  const npcs = { ...world.npcs };
  const bay: StoredDrone[] = [...(ship.droneBay ?? [])];
  for (const drone of Object.values(world.ships)) {
    if (drone.motherId !== ship.id || !drone.droneId) continue;
    const loadoutId = Object.values(world.loadouts).find((l) => l.hullId === drone.hullId)?.id ?? 'rookrivet-mining-drone';
    bay.push({ id: drone.droneId, loadoutId, structure: drone.structure });
    delete ships[drone.id];
    delete npcs[drone.id];
  }
  delete ships[ship.id];
  const stowed: Ship = { ...ship, droneBay: bay.sort((a, b) => (a.id < b.id ? -1 : 1)), locks: [], activeLock: null };
  const pilot = world.pilots[pilotId]!;
  return { ...world, ships, npcs, pilots: { ...world.pilots, [pilotId]: { ...pilot, stowed } } };
}
