import { isLocked } from './locks.js';
import { shipStats } from './stats.js';
import type { Pilot, Ship, World, WorldEvent } from './types.js';
import { distance, type Vec2 } from './vec2.js';

/**
 * What one pilot is allowed to know of the world (docs/shared-world.md,
 * "Only what you can see"). The server sends each player this view, not
 * the world: sending everyone everything let any player read other
 * players' holds, credits and storage, and every ship in the system,
 * from their browser.
 *
 * - **Ships:** every ship the pilot owns (wherever it is: "Your ships"
 *   lists them), the drones of the ship they fly, and any other ship
 *   within their ship's sensor range plus `VIEW_MARGIN`, so ships do not
 *   pop in at the edge of the radar.
 * - **Other ships' holds** are left out, unless the pilot's ship holds a
 *   complete lock on that ship and its targeting computer reads cargo:
 *   the client works out lock readouts itself (`lockReadout`), so that
 *   readout needs the hold.
 * - **Other pilots:** a name and the ship they fly, for labels. Credits,
 *   storage, a stowed ship and an arena are theirs alone.
 * - **Shots, munitions, decoys, wrecks and loot** within the same reach;
 *   the pilot's own caches wherever they are (the radar shows them);
 *   charges planted by a ship in view.
 * - **NPC brains** only for ships in view.
 * - Rocks, stations, bodies and the catalogues as they are: the window
 *   shows them to everyone.
 *
 * A pilot with no ship (waiting to wake) sees only what they own. Pure:
 * the same world and pilot always give the same view. Pass the previous
 * view as `previous` and any part whose contents did not change is
 * handed back as the same object, so the network diff (`diffWorld`, which
 * compares by identity) does not resend it.
 */
export function visibleWorld(world: World, pilotId: string, previous?: World): World {
  const pilot = world.pilots[pilotId];
  const flown = pilot?.shipId ? world.ships[pilot.shipId] : undefined;
  const eyes = flown;
  const stats = eyes ? shipStats(world, eyes) : null;
  const reach = stats ? stats.sensorRange + VIEW_MARGIN : 0;
  const seen = (p: Vec2): boolean => eyes !== undefined && reach > 0 && distance(eyes.position, p) <= reach;
  const readsCargo = stats?.readouts.includes('cargo') ?? false;

  const ships: Record<string, Ship> = {};
  for (const ship of Object.values(world.ships)) {
    const mine = ship.ownerId === pilotId || ship.id === flown?.id || (flown !== undefined && ship.motherId === flown.id);
    if (!mine && !seen(ship.position)) continue;
    // Someone else's hold, unless a lock on it reads cargo.
    const holdShown = mine || (readsCargo && eyes !== undefined && isLocked(eyes, ship.id));
    ships[ship.id] = holdShown || Object.keys(ship.hold).length === 0 ? ship : { ...ship, hold: {} };
  }

  const pilots: Record<string, Pilot> = {};
  for (const p of Object.values(world.pilots)) pilots[p.id] = p.id === pilotId ? p : publicPilot(p);

  const npcs: World['npcs'] = {};
  for (const [id, brain] of Object.entries(world.npcs)) if (ships[id]) npcs[id] = brain;

  const prev = previous;
  const view: World = {
    ...world,
    pilots: same(prev?.pilots, pilots),
    ships,
    npcs: same(prev?.npcs, npcs),
    projectiles: sameList(prev?.projectiles, world.projectiles.filter((p) => seen(p.position))),
    munitions: sameList(prev?.munitions, world.munitions.filter((m) => seen(m.position))),
    decoys: sameList(prev?.decoys, world.decoys.filter((d) => seen(d.position))),
    wrecks: sameList(prev?.wrecks, world.wrecks.filter((w) => seen(w.position))),
    loot: sameList(prev?.loot, world.loot.filter((l) => l.cache?.ownerId === pilotId || seen(l.position))),
    ...(world.charges ? { charges: sameList(prev?.charges, world.charges.filter((c) => ships[c.shipId] !== undefined)) } : {}),
    events: visibleEvents(world.events, pilotId, ships),
  };
  return view;
}

/** How far past a ship's sensor range the view reaches, units: things are sent a little before the radar shows them. */
export const VIEW_MARGIN = 500;

/** What other players may know of a pilot: who they are and what they fly. */
function publicPilot(p: Pilot): Pilot {
  const known = PUBLIC.get(p);
  if (known) return known;
  const out: Pilot = { id: p.id, name: p.name, shipId: p.shipId, shipsIssued: 0, credits: 0, storage: {}, ...(p.away ? { away: p.away } : {}) };
  PUBLIC.set(p, out);
  return out;
}

/** Each pilot's public face, made once per pilot object (pilots change rarely), so views keep the same object while it lasts. */
const PUBLIC = new WeakMap<Pilot, Pilot>();

/**
 * The events this pilot should hear: everything about their own pilot,
 * and everything about a ship in their view. An event about a ship they
 * cannot see stays with the server.
 */
export function visibleEvents(events: readonly WorldEvent[], pilotId: string, ships: Readonly<Record<string, Ship>>): WorldEvent[] {
  return events.filter((e) => {
    const fields = e as unknown as Record<string, unknown>;
    if (fields['pilotId'] === pilotId) return true;
    const shipId = fields['shipId'];
    return typeof shipId !== 'string' || ships[shipId] !== undefined;
  });
}

/** `next` unless every entry is the same object as in `before`, then `before`. */
function same<T>(before: Readonly<Record<string, T>> | undefined, next: Record<string, T>): Record<string, T> {
  if (!before) return next;
  const keys = Object.keys(next);
  if (keys.length !== Object.keys(before).length) return next;
  return keys.every((k) => before[k] === next[k]) ? (before as Record<string, T>) : next;
}

/** `next` unless it holds the same objects in the same order as `before`, then `before`. */
function sameList<T>(before: readonly T[] | undefined, next: T[]): T[] {
  if (!before || before.length !== next.length) return next;
  return next.every((x, i) => x === before[i]) ? (before as T[]) : next;
}
