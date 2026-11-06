import { contactSize, identifies, runsDark } from './colours.js';
import { idleThrusters } from './flight.js';
import { isLocked } from './locks.js';
import { shipStats } from './stats.js';
import type { HullSpec, Pilot, Ship, World, WorldEvent } from './types.js';
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
 * - **Ships running dark** (colours.ts) that the pilot has not
 *   identified are sent as contacts (`Ship.contact`): where they are and
 *   how they move, nothing else. No hull, fit, guns, owner, condition or
 *   hold; no NPC brain; locks only on the pilot's own ships (so "being
 *   locked" still warns); no pilot named as flying them; no events
 *   naming another pilot. A complete lock that identifies sends the ship
 *   as it is.
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
  /** Ships in view that are only contacts to this pilot. */
  const hidden = new Set<string>();
  for (const ship of Object.values(world.ships)) {
    const mine = ship.ownerId === pilotId || ship.id === flown?.id || (flown !== undefined && ship.motherId === flown.id);
    if (!mine && !seen(ship.position)) continue;
    if (!mine && runsDark(world, ship) && !(eyes !== undefined && identifies(world, eyes, ship.id))) {
      hidden.add(ship.id);
      ships[ship.id] = contactOf(ship, world.hulls[ship.hullId], pilotId, world);
      continue;
    }
    // Someone else's hold, unless a lock on it reads cargo.
    const holdShown = mine || (readsCargo && eyes !== undefined && isLocked(eyes, ship.id));
    ships[ship.id] = holdShown || Object.keys(ship.hold).length === 0 ? ship : { ...ship, hold: {} };
  }

  const pilots: Record<string, Pilot> = {};
  for (const p of Object.values(world.pilots)) pilots[p.id] = p.id === pilotId ? p : publicPilot(p, p.shipId !== null && hidden.has(p.shipId));

  const npcs: World['npcs'] = {};
  for (const [id, brain] of Object.entries(world.npcs)) if (ships[id] && !hidden.has(id)) npcs[id] = brain;

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
    events: visibleEvents(world.events, pilotId, ships).filter((e) => !namesHiddenPilot(e, pilotId, hidden)),
  };
  return view;
}

/**
 * A dark ship as a contact: where it is and how it moves, its size, and
 * any locks it holds on this pilot's ships. Made once per ship object
 * and viewer's ships, so a contact sitting still stays the same object
 * and the diff does not resend it.
 */
function contactOf(ship: Ship, hull: HullSpec | undefined, pilotId: string, world: World): Ship {
  const locks = ship.locks.filter((l) => world.ships[l.targetId]?.ownerId === pilotId || world.pilots[pilotId]?.shipId === l.targetId);
  const byViewer = CONTACTS.get(ship) ?? new Map<string, Ship>();
  const cached = byViewer.get(pilotId);
  if (cached && sameLocks(cached.locks, locks)) return cached;
  const contact: Ship = {
    id: ship.id,
    hullId: '',
    fit: {},
    ownerId: null,
    position: ship.position,
    velocity: ship.velocity,
    heading: ship.heading,
    angularVelocity: ship.angularVelocity,
    state: ship.state,
    dockedAt: ship.dockedAt,
    padId: ship.padId,
    flightMode: ship.flightMode,
    thrusters: idleThrusters(),
    shield: 0,
    structure: 0,
    shieldDelayTicks: 0,
    weapons: [],
    tractorActive: false,
    hold: {},
    locks,
    activeLock: locks.some((l) => l.targetId === ship.activeLock) ? ship.activeLock : null,
    capacitor: 0,
    fireGroup: 1,
    weaponsHot: false,
    dark: true,
    contact: contactSize(hull),
  };
  byViewer.set(pilotId, contact);
  CONTACTS.set(ship, byViewer);
  return contact;
}

/** The contact made from each ship object, by viewer. */
const CONTACTS = new WeakMap<Ship, Map<string, Ship>>();

function sameLocks(a: Ship['locks'], b: Ship['locks']): boolean {
  return a.length === b.length && a.every((l, i) => l === b[i]);
}

/** True for an event about a hidden ship that names another pilot: who flies a dark ship is not for others to know. */
function namesHiddenPilot(e: WorldEvent, pilotId: string, hidden: ReadonlySet<string>): boolean {
  const fields = e as unknown as Record<string, unknown>;
  const shipId = fields['shipId'];
  const other = fields['pilotId'];
  return typeof shipId === 'string' && hidden.has(shipId) && typeof other === 'string' && other !== pilotId;
}

/** How far past a ship's sensor range the view reaches, units: things are sent a little before the radar shows them. */
export const VIEW_MARGIN = 500;

/**
 * What other players may know of a pilot: who they are and what they fly,
 * unless the ship they fly is running dark and unidentified (`dark`):
 * then not what they fly.
 */
function publicPilot(p: Pilot, dark: boolean): Pilot {
  const cache = dark ? PUBLIC_DARK : PUBLIC;
  const known = cache.get(p);
  if (known) return known;
  const out: Pilot = { id: p.id, name: p.name, shipId: dark ? null : p.shipId, shipsIssued: 0, credits: 0, storage: {}, ...(p.away ? { away: p.away } : {}) };
  cache.set(p, out);
  return out;
}

/** Each pilot's public face, made once per pilot object (pilots change rarely), so views keep the same object while it lasts. */
const PUBLIC = new WeakMap<Pilot, Pilot>();
/** The same, for a pilot whose ship the viewer sees only as a contact. */
const PUBLIC_DARK = new WeakMap<Pilot, Pilot>();

/**
 * The events this pilot should hear: everything about their own pilot,
 * and everything about a ship in their view. An event about a ship they
 * cannot see stays with the server.
 */
export function visibleEvents(events: readonly WorldEvent[], pilotId: string, ships: Readonly<Record<string, Ship>>): WorldEvent[] {
  return events.filter((e) => {
    const fields = e as unknown as Record<string, unknown>;
    // An event about a pilot is that pilot's alone.
    if (typeof fields['pilotId'] === 'string') return fields['pilotId'] === pilotId;
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
