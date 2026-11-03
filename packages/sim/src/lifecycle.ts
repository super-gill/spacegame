import {
  LOOT_LIFETIME,
  MAX_LOOT_CANISTERS,
  SCOOP_DISTANCE,
  SCRAP_PER_MASS,
  TRACTOR_PULL_SPEED,
  TRACTOR_RANGE,
  WRECK_LIFETIME,
} from './constants.js';
import { buildShip } from './factory.js';
import type { Loot, Ship, Spawner, World, WorldEvent, Wreck } from './types.js';
import { add, distance, fromAngle, normalise, scale, sub } from './vec2.js';

/**
 * Things being made and unmade: destroyed ships become wrecks and loot,
 * loot drifts until scooped, wrecks fade, and spawners keep the NPC
 * population topped up. Every function here is pure and takes and
 * returns the parts of the world it changes.
 */

/** Speed loot canisters scatter at from a destroyed ship, units/s. */
const LOOT_SCATTER_SPEED = 40;

export interface Destruction {
  world: World;
  events: WorldEvent[];
}

/**
 * Remove every ship whose structure has reached zero. Each leaves a wreck
 * and scrap canisters. A pilot who loses their ship is left without one
 * until they respawn; an NPC's spawner starts its respawn countdown.
 * `killers` names who last damaged each ship, for the event.
 */
export function destroyShips(world: World, killers: Record<string, string | null>): Destruction {
  const dead = Object.values(world.ships)
    .filter((s) => s.structure <= 0)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  if (dead.length === 0) return { world, events: [] };

  const ships = { ...world.ships };
  const npcs = { ...world.npcs };
  const pilots = { ...world.pilots };
  const wrecks = [...world.wrecks];
  const loot = [...world.loot];
  const events: WorldEvent[] = [];
  let nextId = world.nextEntityId;

  for (const ship of dead) {
    delete ships[ship.id];
    delete npcs[ship.id];
    events.push({ type: 'destroyed', shipId: ship.id, by: killers[ship.id] ?? null });

    if (ship.ownerId && pilots[ship.ownerId]?.shipId === ship.id) {
      pilots[ship.ownerId] = { ...pilots[ship.ownerId]!, shipId: null };
    }

    const wreck: Wreck = {
      id: `w${nextId++}`,
      hullId: ship.hullId,
      position: ship.position,
      velocity: scale(ship.velocity, 0.6),
      heading: ship.heading,
      angularVelocity: ship.angularVelocity * 0.5 + 0.4,
      ticksLeft: Math.round(WRECK_LIFETIME / world.dt),
    };
    wrecks.push(wreck);

    // Scrap from the hull, plus whatever was in the hold, split into canisters.
    const hull = world.hulls[ship.hullId];
    const scrap = Math.round((hull?.mass ?? 0) * SCRAP_PER_MASS) + (ship.hold['scrap'] ?? 0);
    const canisters = Math.min(MAX_LOOT_CANISTERS, scrap);
    for (let i = 0; i < canisters; i++) {
      const amount = Math.floor(scrap / canisters) + (i < scrap % canisters ? 1 : 0);
      const dir = fromAngle(ship.heading + (i / canisters) * Math.PI * 2 + 0.3);
      const item: Loot = {
        id: `l${nextId++}`,
        item: 'scrap',
        amount,
        position: add(ship.position, scale(dir, 10)),
        velocity: add(scale(ship.velocity, 0.6), scale(dir, LOOT_SCATTER_SPEED)),
        ticksLeft: Math.round(LOOT_LIFETIME / world.dt),
      };
      loot.push(item);
    }
  }

  const spawners = world.spawners.map((sp) =>
    sp.shipId && !ships[sp.shipId]
      ? { ...sp, shipId: null, timerTicks: Math.round(sp.respawnSeconds / world.dt) }
      : sp,
  );

  return { world: { ...world, ships, npcs, pilots, wrecks, loot, spawners, nextEntityId: nextId }, events };
}

/**
 * Remove NPC ships that are leaving the sector: no wreck, no loot. Their
 * spawners start the respawn countdown, so a replacement arrives later.
 */
export function departShips(world: World, shipIds: readonly string[]): Destruction {
  const leaving = shipIds.filter((id) => world.ships[id]);
  if (leaving.length === 0) return { world, events: [] };
  const ships = { ...world.ships };
  const npcs = { ...world.npcs };
  for (const id of leaving) {
    delete ships[id];
    delete npcs[id];
  }
  const spawners = world.spawners.map((sp) =>
    sp.shipId && leaving.includes(sp.shipId)
      ? { ...sp, shipId: null, timerTicks: Math.round(sp.respawnSeconds / world.dt) }
      : sp,
  );
  return {
    world: { ...world, ships, npcs, spawners },
    events: leaving.map((shipId) => ({ type: 'departed' as const, shipId })),
  };
}

/** Drift wrecks and remove those that have faded. */
export function stepWrecks(wrecks: readonly Wreck[], dt: number): Wreck[] {
  return wrecks
    .filter((w) => w.ticksLeft > 1)
    .map((w) => ({
      ...w,
      position: add(w.position, scale(w.velocity, dt)),
      heading: w.heading + w.angularVelocity * dt,
      ticksLeft: w.ticksLeft - 1,
    }));
}

export interface LootStep {
  loot: Loot[];
  ships: Record<string, Ship>;
  events: WorldEvent[];
}

/**
 * Drift loot, pull it towards ships running a tractor beam, and scoop
 * anything that reaches a hull into that ship's hold. When two beams
 * reach the same canister, the nearer ship wins it.
 */
export function stepLoot(world: World, ships: Record<string, Ship>): LootStep {
  const out: Loot[] = [];
  const updated: Record<string, Ship> = { ...ships };
  const events: WorldEvent[] = [];
  const beams = Object.values(ships)
    .filter((s) => s.tractorActive && s.state === 'flying')
    .sort((a, b) => (a.id < b.id ? -1 : 1));

  for (const item of world.loot) {
    if (item.ticksLeft <= 1) continue;

    let puller: Ship | null = null;
    let best = TRACTOR_RANGE;
    for (const s of beams) {
      const d = distance(s.position, item.position);
      if (d <= best) {
        best = d;
        puller = s;
      }
    }

    let velocity = item.velocity;
    if (puller) {
      const radius = world.hulls[puller.hullId]?.radius ?? 0;
      if (best <= radius + SCOOP_DISTANCE) {
        const current = updated[puller.id]!;
        const hold = { ...current.hold, [item.item]: (current.hold[item.item] ?? 0) + item.amount };
        updated[puller.id] = { ...current, hold };
        events.push({ type: 'lootCollected', shipId: puller.id, item: item.item, amount: item.amount });
        continue;
      }
      const towards = normalise(sub(puller.position, item.position));
      velocity = add(puller.velocity, scale(towards, TRACTOR_PULL_SPEED));
    }

    out.push({
      ...item,
      velocity,
      position: add(item.position, scale(velocity, world.dt)),
      ticksLeft: item.ticksLeft - 1,
    });
  }
  return { loot: out, ships: updated, events };
}

/** Spawn an NPC ship and brain from a spawner. */
function spawn(world: World, sp: Spawner): { world: World; spawner: Spawner } {
  const hull = world.hulls[sp.hullId];
  if (!hull) return { world, spawner: sp };
  const id = `npc-${sp.id}-${sp.spawned + 1}`;
  const ship: Ship = buildShip({
    id,
    hull,
    weapons: world.weapons,
    ownerId: null,
    position: sp.position,
    heading: sp.heading,
    flightMode: 'rotation', // NPC steering handles drift itself; see ai/steer.ts
    dockedAt: sp.dockedAt,
  });
  return {
    world: { ...world, ships: { ...world.ships, [id]: ship }, npcs: { ...world.npcs, [id]: sp.brain } },
    spawner: { ...sp, shipId: id, spawned: sp.spawned + 1, timerTicks: 0 },
  };
}

/**
 * Count down spawners that have no ship and spawn when they reach zero.
 * A spawner whose ship exists does nothing.
 */
export function runSpawners(world: World): World {
  let w = world;
  const spawners: Spawner[] = [];
  for (const sp of world.spawners) {
    if (sp.shipId && w.ships[sp.shipId]) {
      spawners.push(sp);
    } else if (sp.timerTicks > 0) {
      spawners.push({ ...sp, timerTicks: sp.timerTicks - 1 });
    } else {
      const r = spawn(w, sp);
      w = r.world;
      spawners.push(r.spawner);
    }
  }
  return { ...w, spawners };
}
