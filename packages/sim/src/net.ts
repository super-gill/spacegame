import type { PilotCommand } from './commands.js';
import type { Asteroid, ShipInput, World, WorldEvent } from './types.js';

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
export const PROTOCOL_VERSION = 1;

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
export type WorldUpdate = Partial<Omit<World, 'events' | 'asteroids'>> & {
  /** Rocks that are new or changed, and the ids of rocks that are gone. */
  rocks?: { changed: Asteroid[]; removed: string[] };
};

/** Parts of the world clients never need after `welcome`: events go separately, and spawn timers are the server's business. */
const NEVER_SENT = new Set(['events', 'spawners', 'rockfall', 'nextEntityId', 'asteroids']);

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
  return out as WorldUpdate;
}

/** A client's world with an update applied: the next world to draw. */
export function applyUpdate(world: World, update: WorldUpdate, events: WorldEvent[]): World {
  const { rocks, ...parts } = update;
  let asteroids = world.asteroids;
  if (rocks) {
    const gone = new Set(rocks.removed);
    const fresh = new Map(rocks.changed.map((a) => [a.id, a]));
    const out = asteroids.filter((a) => !gone.has(a.id)).map((a) => fresh.get(a.id) ?? a);
    const known = new Set(out.map((a) => a.id));
    for (const a of rocks.changed) if (!known.has(a.id)) out.push(a);
    asteroids = out;
  }
  return { ...world, ...parts, asteroids, events };
}

/** A command's outcome as sent back: the event, or why it was refused. */
export type CommandReply = { ok: true; event: WorldEvent } | { ok: false; reason: string };

/** From the server to a client. */
export type ServerMessage =
  /** Logged in: who you are, your key (only when the character was just created), and the whole world. */
  | { t: 'welcome'; pilotId: string; name: string; key: string | null; admin: boolean; world: World }
  /** Login or creation refused, with why. */
  | { t: 'refused'; reason: LoginRefusal }
  /** The world as it is now: the parts that changed since the last update, and the events since then. */
  | { t: 'update'; tick: number; changed: WorldUpdate; events: WorldEvent[] }
  /** What a command did (the world change itself comes in the next update). */
  | { t: 'outcome'; id: number; outcome: CommandReply }
  | { t: 'pong'; sent: number }
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
  const flags = ['turnLeft', 'turnRight', 'thrustForward', 'thrustReverse', 'strafeLeft', 'strafeRight', 'brake', 'toggleDock', 'cycleFlightMode', 'fireFixed', 'launchCountermeasure', 'afterburner', 'toggleWeaponsHot', 'tractor', 'dropCache'] as const;
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
