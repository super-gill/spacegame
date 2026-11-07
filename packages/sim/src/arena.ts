import { ARENA_END_DELAY_SECONDS, ARENA_MAX_ENEMIES, ARENA_SEPARATION } from './constants.js';
import { buildShip } from './factory.js';
import type { CommandResult } from './pilots.js';
import { REFERENCE_FITS } from './reference-fits.js';
import { ammunitionHold, type FitSpec } from './fitlab.js';
import type { ArenaScenario, ArenaState, HullClass, Loadout, Pilot, Ship, World } from './types.js';
import { createStarterWorld } from './world.js';
import { add, type Vec2 } from './vec2.js';

/**
 * The Arena (docs/worlds.md): a world of its own, never saved, for
 * fighting and trying fits. A pilot enters it with no ship and picks a
 * ship, one of its ready-to-fly fits (the fitting lab's reference fits)
 * and a scenario; they are put straight into the fight, far out in empty
 * space, each pilot in their own arena out of reach of the others. The
 * enemies fly the lab's own scripts (ai/arena.ts), so what Jason feels is
 * what the audit measures.
 *
 * Losing the arena ship, or killing every enemy, ends the arena a moment
 * later (`stepArenas`); leaving ends it at once. Either way everything in
 * it is removed and the pilot is back at the setup, with no ship. Nothing
 * here touches the persistent world: the Arena is a separate `World` the
 * server runs beside it.
 */

export type ArenaRefusal =
  | 'unknownPilot' // no such pilot
  | 'unknownFit' // no reference fit by that name
  | 'badCount' // not a whole number of enemies from 1 to ARENA_MAX_ENEMIES
  | 'notInArena'; // leaving an arena the pilot is not in

/** The names an arena can use: every reference fit. */
export function arenaFits(): string[] {
  return REFERENCE_FITS.map((f) => f.name);
}

/** A hull the arena offers, with the reference fits it can be flown with. */
export interface ArenaHull {
  hullId: string;
  name: string;
  class: HullClass;
  fits: FitSpec[];
}

/** Smallest first, military ladder then civilian, so the list reads like the class ladders (docs/lore.md, "Hull classes"). */
const CLASS_ORDER: HullClass[] = ['pod', 'drone', 'corvette', 'patrolBoat', 'frigate', 'destroyer', 'cruiser', 'battleship', 'carrier', 'dreadnought', 'prospector', 'miner', 'freighter', 'barge', 'aurel'];

/**
 * Every hull the arena can put you in: each hull in the catalogue with at
 * least one reference fit, smallest class first. Read from the code, so a
 * new hull with a reference fit appears by itself.
 */
export function arenaHulls(world: World): ArenaHull[] {
  const out: ArenaHull[] = [];
  for (const hull of Object.values(world.hulls)) {
    const fits = REFERENCE_FITS.filter((f) => f.hullId === hull.id);
    if (fits.length > 0) out.push({ hullId: hull.id, name: hull.name, class: hull.class, fits });
  }
  return out.sort((a, b) => CLASS_ORDER.indexOf(a.class) - CLASS_ORDER.indexOf(b.class) || a.name.localeCompare(b.name));
}

/**
 * The Arena world, fresh: the starter system's catalogues and space with
 * nobody in it (no traffic, no spawners, no ships). The server makes one
 * at start and never saves it.
 */
export function createArenaWorld(): World {
  return { ...createStarterWorld(), ships: {}, npcs: {}, pilots: {}, spawners: [], wrecks: [], loot: [], projectiles: [], munitions: [], decoys: [] };
}

/** A pilot enters the Arena: there, with no ship, until they launch. A pilot already there is left as they are. */
export function joinArena(world: World, pilotId: string, name: string): World {
  if (world.pilots[pilotId]) return world;
  const pilot: Pilot = { id: pilotId, name, shipId: null, shipsIssued: 0, credits: 0, storage: {} };
  return { ...world, pilots: { ...world.pilots, [pilotId]: pilot } };
}

/** A pilot leaves the Arena world: their arena, if any, is cleared and they are gone. */
export function leaveArenaWorld(world: World, pilotId: string): World {
  if (!world.pilots[pilotId]) return world;
  const cleared = clearArena(world, pilotId);
  const { [pilotId]: _gone, ...pilots } = cleared.pilots;
  return { ...cleared, pilots };
}

/**
 * Where a new arena goes: the first slot along the line that no running
 * arena uses, so arenas never meet however pilots come and go.
 */
function freeCentre(world: World): Vec2 {
  const used = new Set(Object.values(world.pilots).flatMap((p) => (p.arena ? [Math.round(p.arena.centre.x / ARENA_SEPARATION)] : [])));
  let k = 1;
  while (used.has(k)) k++;
  return { x: ARENA_SEPARATION * k, y: -ARENA_SEPARATION };
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
export function arenaEnemies(world: World, pilotId: string): string[] {
  return Object.entries(world.npcs)
    .filter(([, b]) => b.kind === 'arena' && b.pilotId === pilotId)
    .map(([id]) => id);
}

/**
 * Launch: the pilot flies `fit` from the west side of a free arena. For
 * a skirmish, `count` ships of `enemyFit` start 1,400 units east, spread
 * north to south, and come for them. An arena already running is cleared
 * first, so launching again restarts.
 */
export function startArena(world: World, pilotId: string, fit: string, scenario: ArenaScenario): CommandResult<ArenaRefusal> {
  if (!world.pilots[pilotId]) return { ok: false, world, reason: 'unknownPilot' };
  const mine = fitLoadout(fit);
  const theirs = fitLoadout(scenario.enemyFit);
  if (!mine || !theirs || !world.hulls[mine.hullId] || !world.hulls[theirs.hullId]) return { ok: false, world, reason: 'unknownFit' };
  const count = scenario.count;
  if (!Number.isInteger(count) || count < 1 || count > ARENA_MAX_ENEMIES) return { ok: false, world, reason: 'badCount' };

  const w = clearArena(world, pilotId);
  const pilot = w.pilots[pilotId]!;
  const centre = freeCentre(w);
  const n = pilot.shipsIssued + 1;
  const shipId = `${pilotId}-arena-${n}`;
  const ships: Record<string, Ship> = { ...w.ships, [shipId]: arenaShip(w, shipId, mine, pilotId, add(centre, { x: -700, y: 0 }), 0) };
  const npcs = { ...w.npcs };
  for (let i = 0; i < count; i++) {
    // Numbered by launch too, so a restart never reuses an id the client still has in its last frame.
    const id = `arena-${pilotId}-${n}-${i + 1}`;
    const offset = (i - (count - 1) / 2) * 180;
    ships[id] = arenaShip(w, id, theirs, null, add(centre, { x: 700, y: offset }), Math.PI);
    npcs[id] = { kind: 'arena', pilotId };
  }
  const arena: ArenaState = { shipId, centre, fit, scenario: { ...scenario } };
  return {
    ok: true,
    world: { ...w, ships, npcs, pilots: { ...w.pilots, [pilotId]: { ...pilot, shipsIssued: n, shipId, arena } } },
    event: { type: 'arenaStarted', shipId, enemies: count },
  };
}

/** Leave the fight: the arena is cleared and the pilot is back at the setup. */
export function leaveArena(world: World, pilotId: string): CommandResult<ArenaRefusal> {
  const pilot = world.pilots[pilotId];
  if (!pilot) return { ok: false, world, reason: 'unknownPilot' };
  if (!pilot.arena) return { ok: false, world, reason: 'notInArena' };
  return { ok: true, world: clearArena(world, pilotId), event: { type: 'arenaEnded', shipId: pilot.arena.shipId, pilotId, result: 'left' } };
}

/**
 * Everything of a pilot's arena removed: its enemies, the arena ship, any
 * escape pod the pilot ended up in, and their shots in flight. The pilot
 * is left with no ship. A pilot with no arena is returned unchanged.
 */
function clearArena(world: World, pilotId: string): World {
  const pilot = world.pilots[pilotId];
  if (!pilot?.arena) return world;
  const gone = new Set(arenaEnemies(world, pilotId));
  gone.add(pilot.arena.shipId);
  if (pilot.shipId) gone.add(pilot.shipId);
  // Anything the pilot owns here goes too (a pod left behind after boarding, say): nothing in the Arena outlives a fight.
  for (const ship of Object.values(world.ships)) if (ship.ownerId === pilotId) gone.add(ship.id);
  const { arena: _ended, ...rest } = pilot;
  return {
    ...world,
    ships: Object.fromEntries(Object.entries(world.ships).filter(([id]) => !gone.has(id))),
    npcs: Object.fromEntries(Object.entries(world.npcs).filter(([id]) => !gone.has(id))),
    projectiles: world.projectiles.filter((p) => !gone.has(p.ownerShipId)),
    munitions: world.munitions.filter((m) => !gone.has(m.ownerShipId)),
    pilots: { ...world.pilots, [pilotId]: { ...rest, shipId: null } },
  };
}

/** How an arena ends by itself: the pilot lost their ship, or every enemy is gone. Null while the fight goes on. */
function arenaOutcome(world: World, pilot: Pilot): 'won' | 'lost' | null {
  const arena = pilot.arena!;
  if (pilot.shipId !== arena.shipId || !world.ships[arena.shipId]) return 'lost';
  if (arenaEnemies(world, pilot.id).every((id) => !world.ships[id])) return 'won';
  return null;
}

/**
 * Once a tick, after the world steps: an arena whose fight is decided is
 * marked over, and `ARENA_END_DELAY_SECONDS` later it is cleared and the
 * pilot is back at the setup, so they see the last explosion first.
 * Raises `arenaEnded` when it clears.
 */
export function stepArenas(world: World): World {
  let next = world;
  const delay = Math.round(ARENA_END_DELAY_SECONDS / world.dt);
  for (const pilot of Object.values(world.pilots)) {
    if (!pilot.arena) continue;
    if (!pilot.arena.over) {
      const result = arenaOutcome(next, pilot);
      if (result) next = { ...next, pilots: { ...next.pilots, [pilot.id]: { ...pilot, arena: { ...pilot.arena, over: { result, atTick: world.tick } } } } };
      continue;
    }
    if (world.tick - pilot.arena.over.atTick >= delay) {
      const { result } = pilot.arena.over;
      const shipId = pilot.arena.shipId;
      next = clearArena(next, pilot.id);
      next = { ...next, events: [...next.events, { type: 'arenaEnded', shipId, pilotId: pilot.id, result }] };
    }
  }
  return next;
}
