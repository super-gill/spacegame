import { GOODS } from './goods.js';
import { HULLS } from './hulls.js';
import { LOADOUTS } from './loadouts.js';
import { MANUFACTURERS } from './manufacturers.js';
import { MODULES } from './modules.js';
import { starterBodies } from './bodies.js';
import { FIXED_DT, UNDOCK_CLEARANCE } from './constants.js';
import { idleThrusters } from './flight.js';
import { freePadFor, launchPoint, onPad } from './docking.js';
import { runSpawners } from './lifecycle.js';
import { defaultPads, defaultShipMart, HARBOUR_ID, starterStations } from './stations.js';
import type { Ship, Spawner, Station, World } from './types.js';
import { add, fromAngle, scale } from './vec2.js';
import { createStarterWorld } from './world.js';
import { WEAPONS } from './weapons.js';

/**
 * Save format.
 *
 * A save is the whole world, every pilot included, never one pilot's
 * career. That is the same thing a shared-world host will load, so solo
 * saves and server worlds are one format.
 *
 * The file is JSON with a small envelope:
 *
 *   { "format": "spacegame-world", "version": 1, "savedAt": "...", "world": { ... } }
 *
 * On load:
 * - The envelope is checked: right format, a version we know.
 * - Older versions are brought up to date by MIGRATIONS, one step at a
 *   time. Pre-1.0, a change that is not worth migrating bumps the version
 *   with no migration, and old saves are refused with a clear reason.
 * - Catalogues (hulls, modules, loadouts, manufacturers, weapons, goods)
 *   are replaced with the ones in the code, so tuning any of them applies
 *   to existing saves. Ships refer to specs by id (a hull id, and module
 *   ids in their fit) for exactly this reason, and stats are derived, never
 *   saved. Stations, markets
 *   and everything else in the world are kept as saved.
 * - Per-tick events are dropped.
 */

export const SAVE_FORMAT = 'spacegame-world';

/**
 * Bump when the shape of the saved world changes.
 *
 * History:
 * - 1: 0.5.0 to 0.6.x.
 * - 2: 0.7.0, modular ships. Ships carry a fit, spawners a loadout,
 *   stations an outfitting flag. Version 1 saves are refused (no
 *   migration: their hulls no longer exist).
 * - 3: 0.7.1, owned modules. Pilots carry module storage by station.
 *   Version 2 saves migrate: every pilot starts with empty storage.
 * - 4: 0.8.0, ships you own, pads, ship marts and escape pods. Stations
 *   carry pads and ship mart stock, ships the pad they are docked on.
 *   Version 3 saves migrate: see `migrate3to4`.
 * - 5: 0.9.0, the living system. The world has bodies; stations ride
 *   orbits and carry their velocity; pirate brains may have a home on a
 *   rail; ships hold target locks instead of one target. Version 4 saves
 *   migrate: see `migrate4to5`.
 */
export const SAVE_VERSION = 5;

/** Upgrade a world from version N to N + 1, keyed by N. */
export type Migration = (world: unknown) => unknown;
export const MIGRATIONS: Record<number, Migration> = {
  // 2 to 3: pilots gain module storage.
  2: (world) => {
    if (!isRecord(world) || !isRecord(world['pilots'])) return world;
    const pilots: Record<string, unknown> = {};
    for (const [id, p] of Object.entries(world['pilots'])) pilots[id] = isRecord(p) ? { storage: {}, ...p } : p;
    return { ...world, pilots };
  },
  3: (world) => migrate3to4(world),
  4: (world) => migrate4to5(world),
};

/**
 * A ship with target locks in place of the old single target. Version 5
 * worlds saved from `main` before locks landed (6c part 2, same version)
 * have neither; their ships start with no locks.
 */
function withLocks(ship: Ship): Ship {
  const { targetId: _old, ...rest } = ship as Ship & { targetId?: unknown };
  return { ...rest, locks: Array.isArray(rest.locks) ? rest.locks : [], activeLock: rest.activeLock ?? null };
}

/** How far apart ships towed to Harbour with no free pad are left, units. */
const TOW_SPACING = 60;

/**
 * 4 to 5: the flat sector becomes the Calder system.
 *
 * Every pilot keeps their credits, storage and ships; everything else
 * starts fresh in the new system, at the saved tick:
 *
 * - The world gains the starter bodies. Harbour and Ridge are replaced by
 *   their new copies on their orbits (same ids, pads, markets and ship
 *   mart). Any other station is kept where it was, fixed in place.
 * - Pilots' ships docked at a station stay on the same pad there (or the
 *   smallest free pad that fits, if that one is gone or taken).
 * - Pilots' ships in space, flown or empty, are towed to Harbour: set
 *   down on a free pad that fits, or left at rest just off its pads if
 *   none is free. Their old positions mean nothing in the new system.
 * - NPC ships, their brains and spawners are replaced by the new
 *   system's, which spawn at once. Projectiles, wrecks and loot in
 *   flight are lost.
 */
export function migrate4to5(world: unknown): unknown {
  if (!isRecord(world) || !isRecord(world['ships']) || !isRecord(world['stations'])) return world;
  const tick = typeof world['tick'] === 'number' ? world['tick'] : 0;
  const dt = typeof world['dt'] === 'number' ? world['dt'] : FIXED_DT;
  const npcs = isRecord(world['npcs']) ? world['npcs'] : {};

  const stations: Record<string, Station> = {};
  for (const [id, st] of Object.entries(world['stations'])) {
    if (isRecord(st)) stations[id] = { ...(st as unknown as Station), velocity: { x: 0, y: 0 }, orbit: null };
  }
  Object.assign(stations, starterStations(tick, dt));
  const harbour = stations[HARBOUR_ID]!;

  // Pilot-owned ships only; NPCs are replaced. Docked ships go first, so
  // a towed ship never takes the pad a docked one was already on.
  const kept = Object.entries(world['ships'])
    .filter(([id, sh]) => isRecord(sh) && npcs[id] === undefined)
    .map(([, sh]) => ({ ...withLocks(sh as unknown as Ship), velocity: { x: 0, y: 0 }, angularVelocity: 0, thrusters: idleThrusters() }))
    .sort((a, b) => Number(b.state === 'docked') - Number(a.state === 'docked') || (a.id < b.id ? -1 : 1));

  const ships: Record<string, Ship> = {};
  let adrift = 0;
  for (const ship of kept) {
    const size = HULLS[ship.hullId]?.sizeClass ?? 'S';
    const home = ship.state === 'docked' && ship.dockedAt ? stations[ship.dockedAt] : undefined;
    if (home) {
      const same = home.pads.find((p) => p.id === ship.padId);
      const pad = (same && freePadFor({ ...home, pads: [same] }, size, ships)) ?? freePadFor(home, size, ships);
      if (pad) {
        ships[ship.id] = onPad(ship, home, pad);
        continue;
      }
    }
    // In space, or nowhere to put it: tow to Harbour.
    const pad = freePadFor(harbour, size, ships);
    if (pad) {
      ships[ship.id] = onPad(ship, harbour, pad);
      continue;
    }
    const near = harbour.pads[adrift % Math.max(1, harbour.pads.length)];
    const at = near ? launchPoint(harbour, near) : add(harbour.position, scale(fromAngle(0), harbour.radius + UNDOCK_CLEARANCE));
    const out = near ? fromAngle(near.facing) : fromAngle(0);
    const position = add(at, scale(out, TOW_SPACING * Math.floor(adrift / Math.max(1, harbour.pads.length))));
    adrift++;
    ships[ship.id] = {
      ...ship,
      state: 'flying',
      dockedAt: null,
      padId: null,
      position,
      heading: near?.facing ?? 0,
      velocity: { ...harbour.velocity },
    };
  }

  // The new system's NPCs, spawned now at the saved tick.
  const fresh = createStarterWorld();
  const spawners: Spawner[] = fresh.spawners.map((sp) => ({ ...sp, shipId: null, timerTicks: 0, spawned: 0 }));
  const migrated = {
    ...(world as unknown as World),
    tick,
    dt,
    bodies: starterBodies(),
    stations,
    ships,
    npcs: {},
    spawners,
    projectiles: [],
    wrecks: [],
    loot: [],
    hulls: { ...HULLS },
    modules: { ...MODULES },
    loadouts: { ...LOADOUTS },
    manufacturers: { ...MANUFACTURERS },
    weapons: { ...WEAPONS },
    goods: { ...GOODS },
    events: [],
  };
  return runSpawners(migrated);
}

/**
 * 3 to 4: pads and ship marts.
 *
 * - Stations gain the pads and ship mart stock their starter-sector
 *   layout has (stations.ts), or a default ring of pads and no ship mart
 *   if the station is not one of ours.
 * - Every ship gains `padId`. Docked ships, in id order, are set down on
 *   the smallest free pad that fits, exactly as docking would. A docked
 *   ship with no pad left for it is moved just outside the station,
 *   at rest and flying, rather than lost.
 * - Nothing else changes. A pilot whose ship was destroyed under version
 *   3 has none, and wakes as version 4 pilots do.
 */
export function migrate3to4(world: unknown): unknown {
  if (!isRecord(world) || !isRecord(world['stations']) || !isRecord(world['ships'])) return world;

  const stations: Record<string, Station> = {};
  for (const [id, st] of Object.entries(world['stations'])) {
    if (!isRecord(st)) continue;
    const station = st as unknown as Station;
    stations[id] = {
      ...station,
      pads: Array.isArray(st['pads']) ? station.pads : defaultPads(station),
      shipMart: Array.isArray(st['shipMart']) ? station.shipMart : defaultShipMart(id),
    };
  }

  // Undocked ships first get a null pad, so docked ones are placed against a clean slate.
  const ships: Record<string, Ship> = {};
  for (const [id, sh] of Object.entries(world['ships'])) {
    if (!isRecord(sh)) continue;
    ships[id] = { ...(sh as unknown as Ship), padId: null };
  }
  for (const id of Object.keys(ships).sort()) {
    const ship = ships[id]!;
    if (ship.state !== 'docked' || !ship.dockedAt) continue;
    const station = stations[ship.dockedAt];
    const hull = HULLS[ship.hullId];
    const pad = station && hull ? freePadFor(station, hull.sizeClass, ships) : null;
    if (station && pad) {
      ships[id] = onPad(ship, station, pad);
    } else if (station) {
      const out = fromAngle(ship.heading);
      ships[id] = {
        ...ship,
        state: 'flying',
        dockedAt: null,
        position: add(station.position, scale(out, station.radius + UNDOCK_CLEARANCE)),
        velocity: { x: 0, y: 0 },
        angularVelocity: 0,
      };
    }
  }
  return { ...world, stations, ships };
}

export interface SaveEnvelope {
  format: string;
  version: number;
  savedAt: string;
  world: World;
}

export type LoadRefusal =
  | 'notJson' // could not be parsed at all
  | 'notASave' // parsed, but not a spacegame world file
  | 'tooNew' // saved by a newer version of the game
  | 'tooOld' // saved by an older version with no migration path
  | 'damaged'; // the world inside is missing parts it must have

export type LoadResult = { ok: true; world: World; savedAt: string } | { ok: false; reason: LoadRefusal };

/** Turn a world into save-file text. `savedAt` is passed in so the sim stays clock-free. */
export function serializeWorld(world: World, savedAt: string): string {
  const envelope: SaveEnvelope = { format: SAVE_FORMAT, version: SAVE_VERSION, savedAt, world: { ...world, events: [] } };
  return JSON.stringify(envelope);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** The parts of a world without which nothing works. Not a full schema check. */
function looksLikeWorld(w: unknown): w is World {
  if (!isRecord(w)) return false;
  return (
    typeof w['tick'] === 'number' &&
    typeof w['dt'] === 'number' &&
    typeof w['nextEntityId'] === 'number' &&
    isRecord(w['pilots']) &&
    isRecord(w['ships']) &&
    isRecord(w['npcs']) &&
    isRecord(w['stations']) &&
    isRecord(w['bodies']) &&
    Array.isArray(w['spawners']) &&
    Array.isArray(w['projectiles']) &&
    Array.isArray(w['wrecks']) &&
    Array.isArray(w['loot'])
  );
}

/** Read save-file text back into a world, migrating and checking it on the way. */
export function deserializeWorld(text: string, migrations: Record<number, Migration> = MIGRATIONS): LoadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'notJson' };
  }
  if (!isRecord(parsed) || parsed['format'] !== SAVE_FORMAT || typeof parsed['version'] !== 'number') {
    return { ok: false, reason: 'notASave' };
  }

  let version = parsed['version'];
  if (version > SAVE_VERSION) return { ok: false, reason: 'tooNew' };
  let world: unknown = parsed['world'];
  while (version < SAVE_VERSION) {
    const step = migrations[version];
    if (!step) return { ok: false, reason: 'tooOld' };
    world = step(world);
    version++;
  }

  if (!looksLikeWorld(world)) return { ok: false, reason: 'damaged' };
  const savedAt = typeof parsed['savedAt'] === 'string' ? parsed['savedAt'] : '';
  const ships: Record<string, Ship> = {};
  for (const [id, ship] of Object.entries(world.ships)) ships[id] = withLocks(ship);
  return {
    ok: true,
    savedAt,
    world: {
      ...world,
      ships,
      hulls: { ...HULLS },
      modules: { ...MODULES },
      loadouts: { ...LOADOUTS },
      manufacturers: { ...MANUFACTURERS },
      weapons: { ...WEAPONS },
      goods: { ...GOODS },
      events: [],
    },
  };
}
