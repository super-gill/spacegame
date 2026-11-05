import type { PilotCommand } from './commands.js';
import type { ShipInput, World, WorldEvent } from './types.js';

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
 * The parts of the world that change while it runs, sent when they
 * change. Everything else (catalogues, rules of the system) comes once,
 * in `welcome`.
 */
export type WorldUpdate = Partial<Omit<World, 'events'>>;

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
