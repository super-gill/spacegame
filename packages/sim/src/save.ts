import { GOODS } from './goods.js';
import { HULLS } from './hulls.js';
import { LOADOUTS } from './loadouts.js';
import { MANUFACTURERS } from './manufacturers.js';
import { MODULES } from './modules.js';
import type { World } from './types.js';
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
 */
export const SAVE_VERSION = 2;

/** Upgrade a world from version N to N + 1, keyed by N. Empty until a saved format changes. */
export type Migration = (world: unknown) => unknown;
export const MIGRATIONS: Record<number, Migration> = {};

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
