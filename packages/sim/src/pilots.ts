import { BOARD_MAX_RELATIVE_SPEED, BOARD_RANGE, POD_EJECT_SPEED, POD_INHERIT_FRACTION, POD_STEP_OUT_SPEED } from './constants.js';
import { freePadFor, onPad } from './docking.js';
import { buildShip } from './factory.js';
import { isEmptyShip, isEscapePod, ownedShips, vacated } from './ownership.js';
import { HARBOUR_ID } from './stations.js';
import type { Catalogues } from './stats.js';
import type { Loadout, Pilot, Ship, World, WorldEvent } from './types.js';
import { add, distance, fromAngle, length, scale, sub } from './vec2.js';

/**
 * Pilot commands about ships: buying them, boarding them, getting out of
 * a destroyed one in an escape pod, and waking up after losing the pod.
 *
 * Like trading and fitting, these are requests a person makes once; over
 * a network the client sends them and the host applies them. Each returns
 * the new world and an event, or the unchanged world and why not. The
 * client never applies these rules itself; it asks the `...Refusal`
 * functions, which give the same answer the command would.
 *
 * The flow when things go wrong:
 *
 *   step out        -> in space, the pilot leaves in a pod; the ship stays,
 *                      empty, to be boarded again later
 *   ship destroyed  -> the pilot is ejected in a pod at the wreck
 *   pod destroyed   -> the pilot has no ship until they wake (`wakePilot`)
 *   wake            -> at Harbour, in a pod if they own a ship anywhere,
 *                      or in a free starter Courier if they own none
 *   in a pod at Harbour, owning nothing -> may claim the free starter
 */

/** The station new pilots start at and pilots wake at. */
export const STARTER_STATION_ID = HARBOUR_ID;

/** Loadout every new pilot is given, and the free starter: a Meridian Courier. */
export const STARTER_LOADOUT_ID = 'meridian-starter';

/** The fixed fit every escape pod has. */
export const ESCAPE_POD_LOADOUT_ID = 'escape-pod';

/** How far from the starter station a ship placed in space appears. */
const SPAWN_DISTANCE = 650;

/** Deterministic id for the `n`th ship issued to a pilot, counting from 1. */
export function pilotShipId(pilotId: string, n: number): string {
  return `ship-${pilotId}-${n}`;
}

/** Id of a pilot's first ship. */
export function starterShipId(pilotId: string): string {
  return pilotShipId(pilotId, 1);
}

/** Result of a pilot command. */
export type CommandResult<R extends string> = { ok: true; world: World; event: WorldEvent } | { ok: false; world: World; reason: R };

/**
 * A new ship for a pilot from a loadout, with the next ship id in the
 * pilot's sequence. Returns the ship (not yet in the world) and the pilot
 * with the count moved on. The pilot owns it but is not aboard.
 */
function nextShip(
  cat: Catalogues,
  pilot: Pilot,
  loadout: Loadout,
  place: { position: Ship['position']; heading: number },
): { ship: Ship; pilot: Pilot } {
  const n = pilot.shipsIssued + 1;
  const ship = buildShip(cat, {
    id: pilotShipId(pilot.id, n),
    loadout,
    ownerId: pilot.id,
    position: place.position,
    heading: place.heading,
    flightMode: 'assisted',
  });
  return { ship, pilot: { ...pilot, shipsIssued: n } };
}

function loadoutOrThrow(world: World, id: string): Loadout {
  const loadout = world.loadouts[id];
  if (!loadout || !world.hulls[loadout.hullId]) throw new Error(`Loadout "${id}" missing from world`);
  return loadout;
}

/**
 * Put a pilot aboard a new ship from `loadoutId` at a station: docked on
 * a free pad that fits, or, if none is free, in space just off the
 * station facing it, spread round it by pilot so arrivals do not overlap.
 */
export function issueShip(world: World, pilotId: string, loadoutId: string, stationId: string, inSpace = false): { world: World; ship: Ship } {
  const station = world.stations[stationId];
  if (!station) throw new Error(`Station "${stationId}" missing from world`);
  const loadout = loadoutOrThrow(world, loadoutId);
  const hull = world.hulls[loadout.hullId]!;
  const pilot = world.pilots[pilotId]!;

  const index = Object.keys(world.pilots).sort().indexOf(pilotId);
  const angle = Math.max(0, index) * (Math.PI / 3);
  const made = nextShip(world, pilot, loadout, {
    position: add(station.position, scale(fromAngle(angle), SPAWN_DISTANCE)),
    heading: angle + Math.PI, // facing the station
  });
  const pad = inSpace ? null : freePadFor(station, hull.sizeClass, world.ships);
  const ship = pad ? onPad(made.ship, station, pad) : made.ship;
  return {
    ship,
    world: {
      ...world,
      pilots: { ...world.pilots, [pilotId]: { ...made.pilot, shipId: ship.id } },
      ships: { ...world.ships, [ship.id]: ship },
    },
  };
}

// ---------------------------------------------------------------------------
// Ship mart

/** A ship's price at a ship mart: its hull plus every module fitted. */
export function shipPrice(cat: Catalogues, loadout: Loadout): number {
  const hull = cat.hulls[loadout.hullId];
  if (!hull) return 0;
  let price = hull.price;
  for (const m of hull.mounts) {
    const moduleId = loadout.fit[m.id];
    const module = moduleId ? cat.modules[moduleId] : undefined;
    if (module) price += module.price;
  }
  return price;
}

export type BuyRefusal =
  | 'noShip' // the pilot is flying nothing
  | 'notDocked' // the pilot's ship is not docked
  | 'noShipMart' // this station sells no ships
  | 'notSold' // this station's ship mart does not sell that loadout
  | 'credits' // the pilot cannot afford it
  | 'noPad'; // no free pad here fits the new ship

/** Why the pilot could not buy this loadout here right now, or null if they could. */
export function buyRefusal(world: World, pilotId: string, loadoutId: string): BuyRefusal | null {
  const pilot = world.pilots[pilotId];
  const ship = pilot?.shipId ? world.ships[pilot.shipId] : undefined;
  if (!pilot || !ship) return 'noShip';
  if (ship.state !== 'docked' || !ship.dockedAt) return 'notDocked';
  const station = world.stations[ship.dockedAt];
  if (!station || station.shipMart.length === 0) return 'noShipMart';
  const loadout = world.loadouts[loadoutId];
  const hull = loadout ? world.hulls[loadout.hullId] : undefined;
  if (!loadout || !hull || hull.sealed || !station.shipMart.includes(loadoutId)) return 'notSold';
  if (shipPrice(world, loadout) > pilot.credits) return 'credits';
  if (!freePadFor(station, hull.sizeClass, world.ships)) return 'noPad';
  return null;
}

/**
 * Buy a ship from the ship mart at the station the pilot is docked at.
 * The new ship is the pilot's, empty, and docked on the smallest free pad
 * that fits it. The pilot stays in the ship they are in; boarding the new
 * one is a separate command.
 */
export function buyShip(world: World, pilotId: string, loadoutId: string): CommandResult<BuyRefusal> {
  const reason = buyRefusal(world, pilotId, loadoutId);
  if (reason) return { ok: false, world, reason };
  const pilot = world.pilots[pilotId]!;
  const station = world.stations[world.ships[pilot.shipId!]!.dockedAt!]!;
  const loadout = world.loadouts[loadoutId]!;
  const pad = freePadFor(station, world.hulls[loadout.hullId]!.sizeClass, world.ships)!;
  const price = shipPrice(world, loadout);

  const made = nextShip(world, pilot, loadout, { position: station.position, heading: 0 });
  const ship = onPad(made.ship, station, pad);
  return {
    ok: true,
    world: {
      ...world,
      pilots: { ...world.pilots, [pilotId]: { ...made.pilot, credits: pilot.credits - price } },
      ships: { ...world.ships, [ship.id]: ship },
    },
    event: { type: 'shipBought', shipId: ship.id, stationId: station.id, loadoutId, price },
  };
}

// ---------------------------------------------------------------------------
// Boarding

export type BoardRefusal =
  | 'noShip' // the pilot is flying nothing
  | 'unknownShip' // no such ship
  | 'sameShip' // already aboard it
  | 'notOwned' // the pilot does not own it
  | 'notEmpty' // someone or something is flying it
  | 'notTogether' // not both docked at the same station, nor both in space
  | 'tooFar' // in space, too far apart
  | 'tooFast'; // in space, moving too fast relative to each other

/** Why the pilot could not board this ship right now, or null if they could. */
export function boardRefusal(world: World, pilotId: string, shipId: string): BoardRefusal | null {
  const pilot = world.pilots[pilotId];
  const from = pilot?.shipId ? world.ships[pilot.shipId] : undefined;
  if (!pilot || !from) return 'noShip';
  const to = world.ships[shipId];
  if (!to) return 'unknownShip';
  if (to.id === from.id) return 'sameShip';
  if (to.ownerId !== pilotId) return 'notOwned';
  if (!isEmptyShip(world, to)) return 'notEmpty';
  if (from.state === 'docked' && to.state === 'docked') {
    return from.dockedAt === to.dockedAt ? null : 'notTogether';
  }
  if (from.state !== 'flying' || to.state !== 'flying') return 'notTogether';
  if (distance(from.position, to.position) > BOARD_RANGE) return 'tooFar';
  if (length(sub(from.velocity, to.velocity)) > BOARD_MAX_RELATIVE_SPEED) return 'tooFast';
  return null;
}

/** Ships the pilot could board right now, nearest first (ties on id). */
export function boardableShips(world: World, pilotId: string): Ship[] {
  const from = world.pilots[pilotId]?.shipId ? world.ships[world.pilots[pilotId]!.shipId!] : undefined;
  if (!from) return [];
  return Object.values(world.ships)
    .filter((s) => boardRefusal(world, pilotId, s.id) === null)
    .sort((a, b) => distance(from.position, a.position) - distance(from.position, b.position) || (a.id < b.id ? -1 : 1));
}

/**
 * Move the pilot from the ship they are in to another ship they own that
 * nobody is flying: both docked at the same station, or both in space
 * within BOARD_RANGE and BOARD_MAX_RELATIVE_SPEED of each other. The ship
 * left behind stays exactly where it is, empty, guns cold. Boarding from
 * an escape pod uses the pod up: it is gone.
 */
export function boardShip(world: World, pilotId: string, shipId: string): CommandResult<BoardRefusal> {
  const reason = boardRefusal(world, pilotId, shipId);
  if (reason) return { ok: false, world, reason };
  const pilot = world.pilots[pilotId]!;
  const from = world.ships[pilot.shipId!]!;
  const ships = { ...world.ships };
  if (isEscapePod(world, from)) delete ships[from.id];
  else ships[from.id] = vacated(from);
  return {
    ok: true,
    world: { ...world, ships, pilots: { ...world.pilots, [pilotId]: { ...pilot, shipId } } },
    event: { type: 'boarded', shipId, from: from.id },
  };
}

// ---------------------------------------------------------------------------
// Escape pods and waking

/**
 * The pilot of a destroyed ship gets away in an escape pod: a new pod at
 * the wreck, fired out to the ship's right, keeping a little of the
 * ship's velocity. Called by destruction with the ship as it died; the
 * ship must already be gone from `world.ships`.
 */
export function ejectPilot(world: World, pilotId: string, dead: Ship): { world: World; event: WorldEvent } {
  const right = fromAngle(dead.heading + Math.PI / 2);
  const deadRadius = world.hulls[dead.hullId]?.radius ?? 0;
  const pod = launchPod(world, pilotId, dead, {
    offset: deadRadius,
    velocity: add(scale(dead.velocity, POD_INHERIT_FRACTION), scale(right, POD_EJECT_SPEED)),
  });
  return { world: pod.world, event: { type: 'podEjected', shipId: pod.podId, from: dead.id } };
}

/**
 * A new pod for the pilot, off the right side of `from`, `offset` units
 * from its centre, moving at `velocity`, with the pilot aboard. Leaves
 * `from` alone: the caller decides what happens to it.
 */
function launchPod(
  world: World,
  pilotId: string,
  from: Ship,
  place: { offset: number; velocity: Ship['velocity'] },
): { world: World; podId: string } {
  const pilot = world.pilots[pilotId]!;
  const loadout = loadoutOrThrow(world, ESCAPE_POD_LOADOUT_ID);
  const right = fromAngle(from.heading + Math.PI / 2);
  const made = nextShip(world, pilot, loadout, {
    position: add(from.position, scale(right, place.offset)),
    heading: from.heading,
  });
  // The pilot keeps the flight mode they were using.
  const pod: Ship = { ...made.ship, velocity: place.velocity, flightMode: from.flightMode };
  return {
    podId: pod.id,
    world: {
      ...world,
      pilots: { ...world.pilots, [pilotId]: { ...made.pilot, shipId: pod.id } },
      ships: { ...world.ships, [pod.id]: pod },
    },
  };
}

export type StepOutRefusal =
  | 'noShip' // the pilot is flying nothing
  | 'docked' // docked: board another ship here instead
  | 'inPod'; // already in a pod

/** Why the pilot could not step out right now, or null if they could. */
export function stepOutRefusal(world: World, pilotId: string): StepOutRefusal | null {
  const pilot = world.pilots[pilotId];
  const ship = pilot?.shipId ? world.ships[pilot.shipId] : undefined;
  if (!pilot || !ship) return 'noShip';
  if (ship.state !== 'flying') return 'docked';
  if (isEscapePod(world, ship)) return 'inPod';
  return null;
}

/**
 * Leave the ship you are flying, in space, in an escape pod. The ship
 * stays exactly where it is, empty and coasting, guns cold; the pod
 * leaves its right side gently, so it can come back and board it. A
 * ship left moving keeps moving: slow down first to park it. This
 * is how a ship of yours ends up empty in space: step out, fly the pod
 * to a station, board another ship there, and come back for this one.
 */
export function stepOut(world: World, pilotId: string): CommandResult<StepOutRefusal> {
  const reason = stepOutRefusal(world, pilotId);
  if (reason) return { ok: false, world, reason };
  const ship = world.ships[world.pilots[pilotId]!.shipId!]!;
  const right = fromAngle(ship.heading + Math.PI / 2);
  const podRadius = world.hulls[world.loadouts[ESCAPE_POD_LOADOUT_ID]?.hullId ?? '']?.radius ?? 0;
  const shipRadius = world.hulls[ship.hullId]?.radius ?? 0;
  const pod = launchPod(world, pilotId, ship, {
    // Clear of the hull, so the two do not ram each other.
    offset: shipRadius + podRadius + 4,
    velocity: add(ship.velocity, scale(right, POD_STEP_OUT_SPEED)),
  });
  return {
    ok: true,
    world: { ...pod.world, ships: { ...pod.world.ships, [ship.id]: vacated(ship) } },
    event: { type: 'steppedOut', shipId: pod.podId, from: ship.id },
  };
}

export type WakeRefusal = 'unknownPilot' | 'hasShip';

/**
 * A pilot who has lost their escape pod wakes at Harbour: in a new pod if
 * they own a ship somewhere (fetching it is up to them), or in a free
 * starter Courier if they own none. Docked on a free pad, or just off the
 * station if every fitting pad is taken. Does nothing for a pilot who is
 * still aboard a ship.
 */
export function wakePilot(world: World, pilotId: string): CommandResult<WakeRefusal> {
  const pilot = world.pilots[pilotId];
  if (!pilot) return { ok: false, world, reason: 'unknownPilot' };
  if (pilot.shipId && world.ships[pilot.shipId]) return { ok: false, world, reason: 'hasShip' };
  const loadoutId = ownedShips(world, pilotId).length > 0 ? ESCAPE_POD_LOADOUT_ID : STARTER_LOADOUT_ID;
  const issued = issueShip(world, pilotId, loadoutId, STARTER_STATION_ID);
  return {
    ok: true,
    world: issued.world,
    event: { type: 'pilotWoke', shipId: issued.ship.id, stationId: STARTER_STATION_ID },
  };
}

/** `wakePilot` for callers that only want the world. Unchanged if the pilot cannot wake. */
export function respawnPilot(world: World, pilotId: string): World {
  return wakePilot(world, pilotId).world;
}

export type ClaimRefusal =
  | 'noShip' // the pilot is flying nothing
  | 'notInPod' // the pilot is not in an escape pod
  | 'notAtStarterStation' // the pod is not docked at Harbour
  | 'ownsShips'; // the pilot owns a ship and must fetch it

/** Why the pilot could not claim the free starter right now, or null if they could. */
export function claimRefusal(world: World, pilotId: string): ClaimRefusal | null {
  const pilot = world.pilots[pilotId];
  const pod = pilot?.shipId ? world.ships[pilot.shipId] : undefined;
  if (!pilot || !pod) return 'noShip';
  if (!isEscapePod(world, pod)) return 'notInPod';
  if (pod.state !== 'docked' || pod.dockedAt !== STARTER_STATION_ID) return 'notAtStarterStation';
  if (ownedShips(world, pilotId).length > 0) return 'ownsShips';
  return null;
}

/**
 * A pilot in an escape pod docked at Harbour who owns no ship takes a
 * free starter Courier. The pod is used up; the starter is docked and the
 * pilot is aboard it.
 */
export function claimStarterShip(world: World, pilotId: string): CommandResult<ClaimRefusal> {
  const reason = claimRefusal(world, pilotId);
  if (reason) return { ok: false, world, reason };
  const podId = world.pilots[pilotId]!.shipId!;
  const ships = { ...world.ships };
  delete ships[podId];
  // The pod's pad is free now, and a starter fits any pad a pod does.
  const issued = issueShip({ ...world, ships }, pilotId, STARTER_LOADOUT_ID, STARTER_STATION_ID);
  return {
    ok: true,
    world: issued.world,
    event: { type: 'starterClaimed', shipId: issued.ship.id, stationId: STARTER_STATION_ID },
  };
}
