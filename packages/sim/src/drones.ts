import { rockAt } from './asteroids.js';
import { buildShip } from './factory.js';
import { isLocked } from './locks.js';
import { shipStats } from './stats.js';
import type { DroneBrain, DroneCommand, Ship, StoredDrone, World, WorldEvent } from './types.js';
import { add, distance, fromAngle, scale } from './vec2.js';

/**
 * Drones (docs/drones.md): a general system, mining drones first.
 *
 * - A drone is a ship: it flies, collides, can be locked and shot, and
 *   shows on radar. It has `motherId` and `droneId`, and a `drone` brain
 *   (ai/drone.ts) that flies it. Later kinds (fighters, guards, heavy
 *   mining craft) are other hulls and brains on the same machinery.
 * - A mother ship carries drones in a drone bay module: `droneCapacity`
 *   drones held in all (stowed and out), `droneControl` out at once,
 *   working within `droneRange` of it. Stowed drones are `Ship.droneBay`
 *   items, keeping their structure, so a damaged drone comes back damaged.
 * - The pilot commands; drones fly themselves (`ShipInput.droneCommand`):
 *   launch and recall (all, or one), and send (a drone to the active
 *   lock's rock).
 * - A drone that comes home while returning is stowed. One left out when
 *   its mother docks or is destroyed is lost, as is one destroyed.
 */

/** A returning drone this close to its mother's hull, units, is taken back aboard. */
export const STOW_GAP = 18;

/** The drones a mother has out: ships it commands, in id order. */
export function dronesOut(world: Pick<World, 'ships'>, motherId: string): Ship[] {
  return Object.values(world.ships)
    .filter((s) => s.motherId === motherId)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
}

/** Room left in a ship's drone bays for more drones, stowed or out. */
export function droneRoom(world: World, ship: Ship): number {
  const stats = shipStats(world, ship);
  return Math.max(0, stats.droneCapacity - (ship.droneBay?.length ?? 0) - dronesOut(world, ship.id).length);
}

/** A new drone's id in a mother's bay: d1, d2 and on, never reused while the ship lives. */
export function nextDroneId(world: World, ship: Ship): string {
  const used = new Set([...(ship.droneBay ?? []).map((d) => d.id), ...dronesOut(world, ship.id).map((d) => d.droneId ?? '')]);
  let n = 1;
  while (used.has(`d${n}`)) n++;
  return `d${n}`;
}

/**
 * The drone step, after ships have moved and been destroyed: carry out
 * this tick's drone commands, stow drones that have come home, and lose
 * drones whose mother has docked or gone. `before` is the world at the
 * start of the tick, to notice drones destroyed this tick.
 */
export function stepDrones(world: World, before: World, commands: Readonly<Record<string, DroneCommand>>): { world: World; events: WorldEvent[] } {
  const events: WorldEvent[] = [];
  let ships = { ...world.ships };
  let npcs = { ...world.npcs };

  // Drones destroyed this tick (stowing happens below, so a drone missing now was destroyed).
  for (const was of Object.values(before.ships)) {
    if (was.motherId && was.droneId && !ships[was.id]) {
      events.push({ type: 'droneLost', shipId: was.motherId, droneId: was.droneId, reason: 'destroyed' });
      delete npcs[was.id];
    }
  }

  // Commands, in ship order.
  for (const motherId of Object.keys(commands).sort()) {
    const command = commands[motherId]!;
    const mother = ships[motherId];
    if (!mother) continue;
    const result = command.action === 'launch' ? launch(world, ships, npcs, mother, command.droneId) : order(world, ships, npcs, mother, command);
    ships = result.ships;
    npcs = result.npcs;
    events.push(...result.events);
  }

  // Drones home, and drones left behind.
  for (const drone of Object.values(ships)) {
    if (!drone.motherId || !drone.droneId) continue;
    const mother = ships[drone.motherId];
    const brain = npcs[drone.id];
    if (!mother || mother.state !== 'flying') {
      delete ships[drone.id];
      delete npcs[drone.id];
      events.push({ type: 'droneLost', shipId: drone.motherId, droneId: drone.droneId, reason: 'leftBehind' });
      continue;
    }
    if (brain?.kind !== 'drone' || brain.mode !== 'return') continue;
    const motherRadius = world.hulls[mother.hullId]?.radius ?? 20;
    const droneRadius = world.hulls[drone.hullId]?.radius ?? 6;
    if (distance(drone.position, mother.position) > motherRadius + droneRadius + STOW_GAP) continue;
    const stored: StoredDrone = { id: drone.droneId, loadoutId: loadoutOf(world, drone), structure: drone.structure };
    ships[mother.id] = { ...mother, droneBay: [...(mother.droneBay ?? []), stored].sort((a, b) => (a.id < b.id ? -1 : 1)) };
    delete ships[drone.id];
    delete npcs[drone.id];
    events.push({ type: 'droneStowed', shipId: mother.id, droneId: stored.id });
  }

  return { world: { ...world, ships, npcs }, events };
}

/** The loadout a drone was built from, for stowing it. */
function loadoutOf(world: World, drone: Ship): string {
  return Object.values(world.loadouts).find((l) => l.hullId === drone.hullId)?.id ?? 'rookrivet-mining-drone';
}

interface Changed {
  ships: Record<string, Ship>;
  npcs: World['npcs'];
  events: WorldEvent[];
}

/** Launch one stowed drone, or as many as control allows. */
function launch(world: World, ships: Record<string, Ship>, npcs: World['npcs'], mother: Ship, droneId?: string): Changed {
  const refuse = (reason: Extract<WorldEvent, { type: 'droneRefused' }>['reason']): Changed => ({ ships, npcs, events: [{ type: 'droneRefused', shipId: mother.id, reason }] });
  if (mother.state !== 'flying') return refuse('docked');
  const stats = shipStats(world, mother);
  if (stats.droneCapacity <= 0) return refuse('noBay');
  const bay = mother.droneBay ?? [];
  const wanted = droneId ? bay.filter((d) => d.id === droneId) : bay;
  if (wanted.length === 0) return refuse('noneStowed');
  const out = Object.values(ships).filter((s) => s.motherId === mother.id).length;
  const room = stats.droneControl - out;
  if (room <= 0) return refuse('control');

  const going = wanted.slice(0, room);
  const motherRadius = world.hulls[mother.hullId]?.radius ?? 20;
  const nextShips = { ...ships };
  const nextNpcs = { ...npcs };
  going.forEach((d, i) => {
    const loadout = world.loadouts[d.loadoutId];
    if (!loadout) return;
    // Out of either beam in turn, spread along the hull.
    const side = fromAngle(mother.heading + (i % 2 === 0 ? Math.PI / 2 : -Math.PI / 2));
    const along = fromAngle(mother.heading);
    const at = add(add(mother.position, scale(side, motherRadius + 14)), scale(along, (Math.floor(i / 2) - 0.5) * 24));
    const built = buildShip(world, { id: `${mother.id}/${d.id}`, loadout, ownerId: mother.ownerId, position: at, heading: mother.heading, flightMode: 'assisted' });
    nextShips[built.id] = { ...built, velocity: mother.velocity, structure: Math.min(built.structure, d.structure), motherId: mother.id, droneId: d.id };
    const brain: DroneBrain = { kind: 'drone', motherId: mother.id, mode: 'work', rockId: null, sentRockId: null };
    nextNpcs[built.id] = brain;
  });
  const launched = going.map((d) => d.id);
  nextShips[mother.id] = { ...mother, droneBay: bay.filter((d) => !launched.includes(d.id)) };
  return { ships: nextShips, npcs: nextNpcs, events: [{ type: 'dronesLaunched', shipId: mother.id, droneIds: launched }] };
}

/** Recall (one or all), or send a drone to the active lock's rock. */
function order(world: World, ships: Record<string, Ship>, npcs: World['npcs'], mother: Ship, command: DroneCommand): Changed {
  const out = Object.values(ships)
    .filter((s) => s.motherId === mother.id)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  const nextNpcs = { ...npcs };
  if (command.action === 'recall') {
    for (const d of out) {
      if (command.droneId && d.droneId !== command.droneId) continue;
      const brain = npcs[d.id];
      if (brain?.kind === 'drone') nextNpcs[d.id] = { ...brain, mode: 'return', rockId: null, sentRockId: null };
    }
    return { ships, npcs: nextNpcs, events: [] };
  }

  // Send: the active lock must be a locked rock.
  const rock = mother.activeLock && isLocked(mother, mother.activeLock) && rockAt(world, mother.activeLock) ? mother.activeLock : null;
  if (!rock) return { ships, npcs, events: [{ type: 'droneRefused', shipId: mother.id, reason: 'noRock' }] };
  const brainOf = (s: Ship): DroneBrain | null => {
    const b = npcs[s.id];
    return b?.kind === 'drone' ? b : null;
  };
  const chosen = command.droneId
    ? out.find((d) => d.droneId === command.droneId)
    : (out.find((d) => brainOf(d)?.mode === 'work' && !brainOf(d)?.sentRockId) ?? out.find((d) => brainOf(d)?.mode === 'work') ?? out[0]);
  if (!chosen) {
    // None out: launch one and send it.
    const launched = launch(world, ships, npcs, mother, command.droneId);
    const ids = launched.events.find((e) => e.type === 'dronesLaunched');
    if (!ids || ids.type !== 'dronesLaunched') return launched;
    const shipId = `${mother.id}/${ids.droneIds[0]}`;
    const brain = launched.npcs[shipId];
    if (brain?.kind === 'drone') launched.npcs[shipId] = { ...brain, sentRockId: rock, rockId: rock };
    return launched;
  }
  const brain = brainOf(chosen);
  if (brain) nextNpcs[chosen.id] = { ...brain, mode: 'work', sentRockId: rock, rockId: rock };
  return { ships, npcs: nextNpcs, events: [] };
}
