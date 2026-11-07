import type { PilotCommand } from './commands.js';
import type { Asteroid, Ship, ShipInput, World, WorldEvent } from './types.js';
import type { TrafficContact } from './traffic.js';

/**
 * The messages between a client and the server (docs/shared-world.md).
 * Plain data, sent as JSON over a WebSocket. Shared by both ends so they
 * cannot disagree about the shape.
 *
 * A client connects, then either logs in as a character it has a key for
 * or creates one. From then on it sends its controls every tick and
 * commands when the pilot does something, and the server sends it the
 * world.
 */

/** Bumped when the messages change in a way an older client cannot follow. */
/**
 * 2 (0.17): ships running dark arrive as contacts with no hull (`Ship.contact`).
 * 3 (0.18): worlds. `welcome` carries no world; the client chooses one with `enter`.
 */
export const PROTOCOL_VERSION = 3;

/**
 * The worlds a server runs (docs/worlds.md): the persistent one, saved,
 * and the Arena, never saved. What the persistent world is called
 * depends on the server (`ServerKind`): Dev on the dev server, the
 * Universe on the live one.
 */
export type WorldId = 'persistent' | 'arena';
export const WORLD_IDS: readonly WorldId[] = ['persistent', 'arena'];

/**
 * Which server this is (docs/worlds.md, "The two servers"): `dev` runs
 * `main`, `live` runs releases. Every server is `dev` for now; the split
 * is parked until the functional game (docs/roadmap.md). Both call their
 * persistent world the Universe (Jason, 7 November 2026: Dev as a world
 * of its own is gone).
 */
export type ServerKind = 'dev' | 'live';

/** What a server's persistent world is called: the Universe on every server. */
export function persistentName(_server: ServerKind): string {
  return 'Universe';
}

/** The longest character name, in characters. */
export const MAX_NAME_LENGTH = 24;

/** From a client to the server. */
export type ClientMessage =
  /** Log in as an existing character. */
  | { t: 'login'; protocol: number; name: string; key: string }
  /** Create a character; the server replies with its key. */
  | { t: 'create'; protocol: number; name: string }
  /** The pilot's controls this tick (`ShipInput`), sent every client tick while flying. */
  | { t: 'input'; input: ShipInput }
  /** A pilot command (`PilotCommand`); `id` matches the server's reply. */
  | { t: 'command'; id: number; command: PilotCommand }
  /** Go into a world (the mode screen); leaves the one the connection was in. */
  | { t: 'enter'; world: WorldId }
  /** A ping, answered with a pong carrying the same `sent`, for the connection meter. */
  | { t: 'ping'; sent: number };

/**
 * What changed in the world since a client last heard: each top-level
 * part that is no longer the same object (the sim never changes a world
 * in place, so the same object means unchanged), except the belt, which
 * comes rock by rock because a miner cutting one rock should not resend
 * four hundred. Catalogues never change, so after `welcome` they are
 * never sent again.
 */
export type WorldUpdate = Partial<Omit<World, 'events' | 'asteroids' | 'ships'>> & {
  /** Rocks that are new or changed, and the ids of rocks that are gone. */
  rocks?: { changed: Asteroid[]; removed: string[] };
  /**
   * Ships, field by field: for each ship that changed, the fields that
   * changed (`set`; a new ship comes whole) and the fields it no longer
   * has (`unset`), and the ids of ships that are gone. A ship's fit, hold
   * and the rest rarely change; its position changes every tick.
   */
  ships?: { changed: Record<string, ShipChange>; removed: string[] };
};

/** What changed in one ship. */
export interface ShipChange {
  set: Partial<Ship>;
  unset?: string[];
}

/** Parts of the world clients never need after `welcome`: events go separately, and spawn timers are the server's business. */
const NEVER_SENT = new Set(['events', 'spawners', 'rockfall', 'nextEntityId', 'asteroids', 'ships']);

/** What changed from `before` to `now` (both worlds the server gave out). */
export function diffWorld(before: World, now: World): WorldUpdate {
  const out: Record<string, unknown> = {};
  const n = now as unknown as Record<string, unknown>;
  const b = before as unknown as Record<string, unknown>;
  for (const key of Object.keys(n)) {
    if (!NEVER_SENT.has(key) && n[key] !== b[key]) out[key] = n[key];
  }
  if (now.asteroids !== before.asteroids) {
    const old = new Map(before.asteroids.map((a) => [a.id, a]));
    const changed = now.asteroids.filter((a) => old.get(a.id) !== a);
    const kept = new Set(now.asteroids.map((a) => a.id));
    const removed = before.asteroids.filter((a) => !kept.has(a.id)).map((a) => a.id);
    if (changed.length > 0 || removed.length > 0) out['rocks'] = { changed, removed };
  }
  if (now.ships !== before.ships) {
    const changed: Record<string, ShipChange> = {};
    for (const ship of Object.values(now.ships)) {
      const old = before.ships[ship.id];
      if (old === ship) continue;
      if (!old) {
        changed[ship.id] = { set: ship };
        continue;
      }
      const fields = changedFields(old, ship);
      if (fields) changed[ship.id] = fields;
    }
    const removed = Object.keys(before.ships).filter((id) => !now.ships[id]);
    if (Object.keys(changed).length > 0 || removed.length > 0) out['ships'] = { changed, removed };
  }
  return out as WorldUpdate;
}

/**
 * The fields of a ship that differ from before, or null if none do. The
 * sim often rebuilds a part (its weapons' state, its thrusters) with the
 * same contents, so a part that is a new object is compared by value
 * before it is sent.
 */
function changedFields(before: Ship, now: Ship): ShipChange | null {
  const b = before as unknown as Record<string, unknown>;
  const n = now as unknown as Record<string, unknown>;
  const set: Record<string, unknown> = {};
  const unset: string[] = [];
  for (const key of new Set([...Object.keys(b), ...Object.keys(n)])) {
    const was = b[key];
    const is = n[key];
    if (was === is) continue;
    if (is === undefined) {
      unset.push(key);
      continue;
    }
    if (typeof is === 'object' && is !== null && typeof was === 'object' && was !== null && JSON.stringify(was) === JSON.stringify(is)) continue;
    set[key] = is;
  }
  if (Object.keys(set).length === 0 && unset.length === 0) return null;
  return unset.length > 0 ? { set: set as Partial<Ship>, unset } : { set: set as Partial<Ship> };
}

/** A client's world with an update applied: the next world to draw. */
export function applyUpdate(world: World, update: WorldUpdate, events: WorldEvent[]): World {
  const { rocks, ships: shipChanges, ...parts } = update;
  let ships = world.ships;
  if (shipChanges) {
    const next: Record<string, Ship> = { ...ships };
    for (const id of shipChanges.removed) delete next[id];
    for (const [id, change] of Object.entries(shipChanges.changed)) {
      const merged = { ...(next[id] ?? {}), ...change.set } as Record<string, unknown>;
      for (const k of change.unset ?? []) delete merged[k];
      next[id] = merged as unknown as Ship;
    }
    ships = next;
  }
  let asteroids = world.asteroids;
  if (rocks) {
    const gone = new Set(rocks.removed);
    const fresh = new Map(rocks.changed.map((a) => [a.id, a]));
    const out = asteroids.filter((a) => !gone.has(a.id)).map((a) => fresh.get(a.id) ?? a);
    const known = new Set(out.map((a) => a.id));
    for (const a of rocks.changed) if (!known.has(a.id)) out.push(a);
    asteroids = out;
  }
  return { ...world, ...parts, asteroids, ships, events };
}

/** A command's outcome as sent back: the event, or why it was refused. */
export type CommandReply = { ok: true; event: WorldEvent } | { ok: false; reason: string };

/** From the server to a client. */
export type ServerMessage =
  /** Logged in: who you are and your key (only when the character was just created). No world yet: the client sends `enter`. */
  | { t: 'welcome'; pilotId: string; name: string; key: string | null; admin: boolean; server: ServerKind }
  /** In a world (after `enter`): which, and the whole of it as this pilot sees it. Updates follow. */
  | { t: 'entered'; world: WorldId; view: World }
  /** Login or creation refused, with why. */
  | { t: 'refused'; reason: LoginRefusal }
  /** The world as it is now: the parts that changed since the last update, and the events since then. */
  | { t: 'update'; tick: number; changed: WorldUpdate; events: WorldEvent[] }
  /** What a command did (the world change itself comes in the next update). */
  | { t: 'outcome'; id: number; outcome: CommandReply }
  | { t: 'pong'; sent: number }
  /** Ships this pilot's chart shows beyond their radar (traffic.ts), about once a second. Sol only. Older clients ignore it. */
  | { t: 'traffic'; tick: number; ships: TrafficContact[] }
  /** The server is closing this connection, and why. */
  | { t: 'kicked'; reason: KickReason };

export type LoginRefusal =
  | 'protocol' // the client is a different version from the server: reload the page
  | 'badName' // empty, too long, or not printable
  | 'nameTaken' // another character has that name
  | 'unknown'; // no character with that name and key

export type KickReason =
  | 'loggedInElsewhere' // the same character logged in from another connection
  | 'serverClosing';

/** A client's `enter`, checked: the world it names, or null. */
export function readWorldId(value: unknown): WorldId | null {
  return WORLD_IDS.includes(value as WorldId) ? (value as WorldId) : null;
}

/** A name as the server will keep it: trimmed, inner spaces single; null if it cannot be a name. */
export function cleanName(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  const clean = name.trim().replace(/\s+/g, ' ');
  if (clean.length === 0 || clean.length > MAX_NAME_LENGTH) return null;
  // Letters, digits, spaces and a little punctuation: names show in labels and lists.
  if (!/^[\p{L}\p{N} '._-]+$/u.test(clean)) return null;
  return clean;
}

/**
 * Controls from outside (a client's message), checked field by field: a
 * `ShipInput` with every field the right type, or null. Missing optional
 * fields become null; anything unexpected is dropped.
 */
export function readInput(value: unknown): ShipInput | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  const flag = (k: string): boolean | undefined => (typeof v[k] === 'boolean' ? (v[k] as boolean) : v[k] === undefined ? false : undefined);
  const id = (k: string): string | null | undefined => (v[k] === null || v[k] === undefined ? null : typeof v[k] === 'string' && (v[k] as string).length <= 64 ? (v[k] as string) : undefined);
  const flags = ['turnLeft', 'turnRight', 'thrustForward', 'thrustReverse', 'strafeLeft', 'strafeRight', 'brake', 'toggleDock', 'cycleFlightMode', 'fireFixed', 'launchCountermeasure', 'afterburner', 'toggleWeaponsHot', 'toggleColours', 'tractor', 'dropCache'] as const;
  const ids = ['toggleModule', 'lock', 'unlock', 'activateLock', 'jettison'] as const;
  const out: Record<string, unknown> = {};
  for (const k of flags) {
    const f = flag(k);
    if (f === undefined) return null;
    out[k] = f;
  }
  for (const k of ids) {
    const s = id(k);
    if (s === undefined) return null;
    out[k] = s;
  }
  const aim = v['aimHeading'];
  if (aim !== null && aim !== undefined && !(typeof aim === 'number' && Number.isFinite(aim))) return null;
  out['aimHeading'] = aim ?? null;
  const group = v['selectGroup'];
  if (group !== null && group !== undefined && !(Number.isInteger(group) && (group as number) >= 1 && (group as number) <= 4)) return null;
  out['selectGroup'] = group ?? null;
  // Drone commands and the hopper's list: small, checked shapes.
  const drone = v['droneCommand'];
  if (drone !== null && drone !== undefined) {
    if (typeof drone !== 'object') return null;
    const d = drone as Record<string, unknown>;
    if (d['action'] !== 'launch' && d['action'] !== 'recall' && d['action'] !== 'send') return null;
    if (d['droneId'] !== undefined && typeof d['droneId'] !== 'string') return null;
    out['droneCommand'] = d['droneId'] === undefined ? { action: d['action'] } : { action: d['action'], droneId: d['droneId'] };
  } else out['droneCommand'] = null;
  const drop = v['hopperDrop'];
  if (drop !== null && drop !== undefined) {
    if (!Array.isArray(drop) || drop.length > 32 || !drop.every((g) => typeof g === 'string' && g.length <= 64)) return null;
    out['hopperDrop'] = [...drop];
  } else out['hopperDrop'] = null;
  return out as unknown as ShipInput;
}
