import type { Pilot, Ship, World } from './types.js';

/**
 * Owning a ship and flying it are separate facts.
 *
 * - `Ship.ownerId` says whose property a ship is. A pilot may own any
 *   number of ships, parked at stations or drifting where they left them.
 * - `Pilot.shipId` says which ship a pilot is aboard and flying. A pilot
 *   flies at most one ship at a time.
 * - An NPC brain in `World.npcs` flies the ship it is keyed by.
 *
 * A ship nobody is flying (no pilot aboard, no brain) is **empty**. Empty
 * ships take no input: no flight computer, no guns, no tractor. They keep
 * whatever momentum they had and can be shot like any other ship.
 *
 * Never read `ownerId` as "the pilot aboard". Later, hired NPC pilots will
 * fly ships a pilot owns, and the owner may be somewhere else entirely.
 */

/** Ship id to the id of the pilot flying it, for every flown ship. */
export function pilotsAboard(world: Pick<World, 'pilots'>): Record<string, string> {
  const aboard: Record<string, string> = {};
  for (const id of Object.keys(world.pilots).sort()) {
    const shipId = world.pilots[id]!.shipId;
    if (shipId) aboard[shipId] = id;
  }
  return aboard;
}

/**
 * Whose loot a ship frees, kills or caches (`Loot.claim`): the pilot
 * aboard, else its owner, else the ship itself (an NPC). A drone's is its
 * mother's. `aboard` saves recomputing `pilotsAboard` in a loop.
 */
export function lootClaim(world: Pick<World, 'pilots' | 'ships'>, shipId: string, aboard: Record<string, string> = pilotsAboard(world)): string {
  const ship = world.ships[shipId];
  if (ship?.motherId && ship.motherId !== shipId) return lootClaim(world, ship.motherId, aboard);
  return aboard[shipId] ?? ship?.ownerId ?? shipId;
}

/** True if a ship's tractor will take this loot: its own, nobody's, or anything when set to take all. */
export function tractorTakes(ship: Pick<Ship, 'tractorMode'>, claim: string, loot: { claim?: string }): boolean {
  return ship.tractorMode === 'all' || loot.claim === undefined || loot.claim === claim;
}

/** The pilot flying this ship, or null if no pilot is aboard. */
export function shipPilot(world: Pick<World, 'pilots'>, shipId: string): Pilot | null {
  const id = pilotsAboard(world)[shipId];
  return id ? world.pilots[id]! : null;
}

/** True if no pilot and no NPC brain is flying the ship. */
export function isEmptyShip(world: Pick<World, 'pilots' | 'npcs'>, ship: Ship): boolean {
  return !world.npcs[ship.id] && shipPilot(world, ship.id) === null;
}

/** True if the ship is an escape pod. */
export function isEscapePod(world: Pick<World, 'hulls'>, ship: Ship): boolean {
  return world.hulls[ship.hullId]?.escapePod === true;
}

/**
 * Ships a pilot owns, escape pods and drones left out, sorted by id. Pods
 * are lifeboats, not property: owning only a pod counts as owning
 * nothing. Drones belong to their mother ship's bay.
 */
export function ownedShips(world: Pick<World, 'ships' | 'hulls'>, pilotId: string): Ship[] {
  return Object.keys(world.ships)
    .sort()
    .map((id) => world.ships[id]!)
    .filter((s) => s.ownerId === pilotId && !isEscapePod(world, s) && !s.motherId);
}

/**
 * The ship as it is left when its pilot steps out: guns cold, no target,
 * tractor off, thrusters idle. Position, heading and momentum are kept.
 */
export function vacated(ship: Ship): Ship {
  return {
    ...ship,
    weaponsHot: false,
    locks: [],
    activeLock: null,
    tractorActive: false,
    thrusters: { main: 0, reverse: 0, strafeLeft: 0, strafeRight: 0, rotateLeft: 0, rotateRight: 0 },
  };
}
