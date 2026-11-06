import { ARENA_MAX_ENEMIES, ARENA_SEPARATION } from './constants.js';
import { buildShip } from './factory.js';
import type { CommandResult } from './pilots.js';
import { REFERENCE_FITS } from './reference-fits.js';
import { ammunitionHold } from './fitlab.js';
import type { Loadout, Ship, World } from './types.js';
import { add, distance, type Vec2 } from './vec2.js';

/**
 * The arena (admin testing; docs/fitting.md, "The arena"). An operator
 * picks a fit to fly and a fit and number of enemies, both from the
 * fitting lab's reference fits, and is put straight into a fight far out
 * in empty space. The enemies fly the lab's own scripts (ai/arena.ts), so
 * what Jason feels is what the audit measures. Ending the arena removes
 * its ships and puts the pilot back in the ship they came from.
 *
 * Arena ships are free and leave no trace: the arena ship is the pilot's
 * while the arena lasts, but it is removed when it ends.
 */

export type ArenaRefusal =
  | 'unknownPilot' // no such pilot
  | 'unknownFit' // no reference fit by that name
  | 'badCount' // not a whole number of enemies from 1 to ARENA_MAX_ENEMIES
  | 'notInArena'; // ending an arena the pilot is not in

/** The names an arena can use: every reference fit. */
export function arenaFits(): string[] {
  return REFERENCE_FITS.map((f) => f.name);
}

/** Where a pilot's arena is: far from the system, one per pilot so arenas never meet. */
function arenaCentre(world: World, pilotId: string): Vec2 {
  const k = Object.keys(world.pilots).sort().indexOf(pilotId);
  return { x: ARENA_SEPARATION * (k + 1), y: -ARENA_SEPARATION };
}

/** A loadout for a reference fit, so a ship can be built from it. */
function fitLoadout(name: string): Loadout | null {
  const spec = REFERENCE_FITS.find((f) => f.name === name);
  return spec ? { id: `arena:${spec.name}`, name: spec.name, hullId: spec.hullId, fit: spec.fit } : null;
}

/** A ship built for the arena: its fit, a hold full of ammunition for it, weapons hot. */
function arenaShip(world: World, id: string, loadout: Loadout, ownerId: string | null, position: Vec2, heading: number): Ship {
  const ship = buildShip(world, { id, loadout, ownerId, position, heading, flightMode: 'assisted' });
  // Enemies (no owner) run dark like the pirates they stand in for (colours.ts).
  return { ...ship, hold: ammunitionHold(world, loadout.hullId, ship.fit), weaponsHot: true, ...(ownerId === null ? { dark: true as const } : {}) };
}

/** Ids of the enemy ships in a pilot's arena. */
function arenaEnemies(world: World, pilotId: string): string[] {
  return Object.entries(world.npcs)
    .filter(([, b]) => b.kind === 'arena' && b.pilotId === pilotId)
    .map(([id]) => id);
}

/**
 * Admin: start an arena. The pilot flies `playerFit` from the west side of
 * their arena; `count` ships of `enemyFit` start 1,400 units east, spread
 * north to south, and come for them. An arena already running is ended first.
 */
export function adminArena(world: World, pilotId: string, playerFit: string, enemyFit: string, count: number): CommandResult<ArenaRefusal> {
  if (!world.pilots[pilotId]) return { ok: false, world, reason: 'unknownPilot' };
  const mine = fitLoadout(playerFit);
  const theirs = fitLoadout(enemyFit);
  if (!mine || !theirs || !world.hulls[mine.hullId] || !world.hulls[theirs.hullId]) return { ok: false, world, reason: 'unknownFit' };
  if (!Number.isInteger(count) || count < 1 || count > ARENA_MAX_ENEMIES) return { ok: false, world, reason: 'badCount' };

  let w = world;
  if (w.pilots[pilotId]!.arena) {
    const ended = adminArenaEnd(w, pilotId);
    if (ended.ok) w = ended.world;
  }
  const pilot = w.pilots[pilotId]!;
  const centre = arenaCentre(w, pilotId);
  const n = pilot.shipsIssued + 1;
  const shipId = `${pilotId}-arena-${n}`;
  const ship = arenaShip(w, shipId, mine, pilotId, add(centre, { x: -700, y: 0 }), 0);
  const ships: Record<string, Ship> = { ...w.ships, [shipId]: ship };
  const npcs = { ...w.npcs };
  for (let i = 0; i < count; i++) {
    const id = `arena-${pilotId}-${i + 1}`;
    const offset = (i - (count - 1) / 2) * 180;
    ships[id] = arenaShip(w, id, theirs, null, add(centre, { x: 700, y: offset }), Math.PI);
    npcs[id] = { kind: 'arena', pilotId };
  }
  return {
    ok: true,
    world: {
      ...w,
      ships,
      npcs,
      pilots: { ...w.pilots, [pilotId]: { ...pilot, shipsIssued: n, shipId, arena: { shipId, fromShipId: pilot.shipId, centre } } },
    },
    event: { type: 'arenaStarted', shipId, enemies: count },
  };
}

/**
 * Admin: end the pilot's arena. Its enemies, the arena ship and anything
 * else of the pilot's left near the arena (an escape pod) are removed, and
 * the pilot is back in the ship they came from, if it is still there.
 */
export function adminArenaEnd(world: World, pilotId: string): CommandResult<ArenaRefusal> {
  const pilot = world.pilots[pilotId];
  if (!pilot) return { ok: false, world, reason: 'unknownPilot' };
  const arena = pilot.arena;
  if (!arena) return { ok: false, world, reason: 'notInArena' };
  const from = arena.fromShipId && world.ships[arena.fromShipId] ? arena.fromShipId : null;
  const gone = new Set(arenaEnemies(world, pilotId));
  gone.add(arena.shipId);
  // A pod the pilot ended up in after losing the arena ship goes too, if they have a ship to go back to.
  if (from && pilot.shipId && pilot.shipId !== from && world.ships[pilot.shipId] && distance(world.ships[pilot.shipId]!.position, arena.centre) < ARENA_SEPARATION / 2) gone.add(pilot.shipId);
  const ships = Object.fromEntries(Object.entries(world.ships).filter(([id]) => !gone.has(id)));
  const npcs = Object.fromEntries(Object.entries(world.npcs).filter(([id]) => !gone.has(id)));
  const { arena: _ended, ...rest } = pilot;
  const shipId = from ?? (pilot.shipId && ships[pilot.shipId] ? pilot.shipId : null);
  return {
    ok: true,
    world: {
      ...world,
      ships,
      npcs,
      projectiles: world.projectiles.filter((p) => !gone.has(p.ownerShipId)),
      munitions: world.munitions.filter((m) => !gone.has(m.ownerShipId)),
      pilots: { ...world.pilots, [pilotId]: { ...rest, shipId } },
    },
    event: { type: 'arenaEnded', shipId: shipId ?? '' },
  };
}
