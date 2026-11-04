import { DOCK_MAX_SPEED, UNDOCK_CLEARANCE, UNDOCK_PUSH_SPEED } from './constants.js';
import type { HullSpec, ModuleSize, Pad, Ship, Station, World, WorldEvent } from './types.js';
import { add, distance, fromAngle, length, scale, sub, toAngle, type Vec2 } from './vec2.js';

/**
 * Docking rules.
 *
 * A ship may dock when it is inside a station's dock range, moving
 * slowly relative to the station (stations move on rails), and a pad its
 * hull fits is free. It is set down on the smallest
 * free pad that fits (ties go to the lowest pad id), facing the way the
 * pad faces. A docked ship rides its pad: its position is the pad's and
 * its velocity the station's, every tick. Undocking launches it from that
 * pad: placed a little way out along the pad's facing, moving with the
 * station plus a gentle push.
 */

export interface DockAttempt {
  ship: Ship;
  event: WorldEvent;
}

/** The parts of the world docking reads. */
export type DockingView = Pick<World, 'stations' | 'ships' | 'hulls'>;

const SIZE_RANK: Record<ModuleSize, number> = { S: 0, M: 1, L: 2, XL: 3 };

/** True if a hull of size class `size` fits on the pad. Smaller hulls fit bigger pads. */
export function padFits(pad: Pad, size: ModuleSize): boolean {
  return SIZE_RANK[size] <= SIZE_RANK[pad.size];
}

/** Pad ids at this station that have a ship on them. */
export function occupiedPads(station: Station, ships: Record<string, Ship>): Set<string> {
  const taken = new Set<string>();
  for (const s of Object.values(ships)) if (s.dockedAt === station.id && s.padId) taken.add(s.padId);
  return taken;
}

/**
 * The pad a hull of size class `size` would be given here: the smallest
 * free pad that fits, lowest id first among equals. Null if none is free.
 */
export function freePadFor(station: Station, size: ModuleSize, ships: Record<string, Ship>): Pad | null {
  const taken = occupiedPads(station, ships);
  const fitting = station.pads
    .filter((p) => !taken.has(p.id) && padFits(p, size))
    .sort((a, b) => SIZE_RANK[a.size] - SIZE_RANK[b.size] || (a.id < b.id ? -1 : 1));
  return fitting[0] ?? null;
}

/** Where a pad is in the world. */
export function padWorldPosition(station: Station, pad: Pad): Vec2 {
  return add(station.position, pad.position);
}

/** Where a ship leaving a pad is placed: out along the pad's facing, clear of the station hull. */
export function launchPoint(station: Station, pad: Pad): Vec2 {
  return add(padWorldPosition(station, pad), scale(fromAngle(pad.facing), UNDOCK_CLEARANCE));
}

/** The ship set down on a pad: docked there, moving with the station, facing the pad's way. */
export function onPad(ship: Ship, station: Station, pad: Pad): Ship {
  return {
    ...ship,
    state: 'docked',
    dockedAt: station.id,
    padId: pad.id,
    position: padWorldPosition(station, pad),
    heading: pad.facing,
    velocity: { ...station.velocity },
    angularVelocity: 0,
  };
}

/**
 * A docked ship put back on its pad where the station now is. Ships that
 * are not docked, or whose station or pad is gone, are returned as they
 * are.
 */
export function ridePad(ship: Ship, stations: Record<string, Station>): Ship {
  if (ship.state !== 'docked' || !ship.dockedAt) return ship;
  const station = stations[ship.dockedAt];
  const pad = station?.pads.find((p) => p.id === ship.padId);
  if (!station || !pad) return ship;
  return { ...ship, position: padWorldPosition(station, pad), velocity: { ...station.velocity } };
}

/** A ship's speed relative to a station, units/s. */
export function speedRelativeTo(ship: Ship, station: Station): number {
  return length(sub(ship.velocity, station.velocity));
}

/** Find the nearest station within dock range of the ship, if any. */
export function nearestDockableStation(ship: Pick<Ship, 'position'>, stations: Record<string, Station>): Station | null {
  let best: Station | null = null;
  let bestDist = Infinity;
  for (const station of Object.values(stations)) {
    const d = distance(ship.position, station.position);
    if (d <= station.dockRange && d < bestDist) {
      best = station;
      bestDist = d;
    }
  }
  return best;
}

/**
 * Try to dock at the nearest station in range. `world.ships` must hold
 * every other ship as it stands now, so two ships docking in the same
 * tick are never given the same pad.
 */
export function tryDock(ship: Ship, world: DockingView): DockAttempt {
  const station = nearestDockableStation(ship, world.stations);
  if (!station) {
    return { ship, event: { type: 'dockRefused', shipId: ship.id, reason: 'tooFar' } };
  }
  if (speedRelativeTo(ship, station) > DOCK_MAX_SPEED) {
    return { ship, event: { type: 'dockRefused', shipId: ship.id, reason: 'tooFast' } };
  }
  const hull: HullSpec | undefined = world.hulls[ship.hullId];
  const pad = hull ? freePadFor(station, hull.sizeClass, world.ships) : null;
  if (!pad) {
    return { ship, event: { type: 'dockRefused', shipId: ship.id, reason: 'noPad' } };
  }
  return {
    ship: onPad(ship, station, pad),
    event: { type: 'docked', shipId: ship.id, stationId: station.id, padId: pad.id },
  };
}

export function undock(ship: Ship, stations: Record<string, Station>): DockAttempt | null {
  if (ship.state !== 'docked' || ship.dockedAt === null) return null;
  const station = stations[ship.dockedAt];
  if (!station) return null;
  const pad = station.pads.find((p) => p.id === ship.padId);

  // Leave from the pad along its facing. A ship with no pad (should not
  // happen) leaves the old way: out from the centre along its heading.
  const facing = pad ? pad.facing : ship.heading;
  const outward = fromAngle(facing);
  const position = pad ? launchPoint(station, pad) : add(station.position, scale(outward, station.radius + UNDOCK_CLEARANCE));
  const velocity = add(station.velocity, scale(outward, UNDOCK_PUSH_SPEED));

  return {
    ship: { ...ship, state: 'flying', dockedAt: null, padId: null, heading: facing, position, velocity },
    event: { type: 'undocked', shipId: ship.id, stationId: station.id },
  };
}

/** Heading from the station centre to the ship, used by renderers to draw approach guides. */
export function bearingFromStation(station: Station, ship: Ship): number {
  return toAngle(sub(ship.position, station.position));
}
