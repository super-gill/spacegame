import { GOODS } from './goods.js';
import { HULLS } from './hulls.js';
import { LOADOUTS } from './loadouts.js';
import { MANUFACTURERS } from './manufacturers.js';
import { MODULES } from './modules.js';
import { UNDOCK_CLEARANCE } from './constants.js';
import { freePadFor, onPad } from './docking.js';
import { defaultPads, defaultShipMart } from './stations.js';
import type { Ship, Station, World } from './types.js';
import { add, fromAngle, scale } from './vec2.js';
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
 */
export const SAVE_VERSION = 4;

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
};

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
  return {
    ok: true,
    savedAt,
    world: {
      ...world,
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
