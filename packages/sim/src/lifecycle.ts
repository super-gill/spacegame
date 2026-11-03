import {
  CARGO_SURVIVAL_FRACTION,
  LOOT_LIFETIME,
  MAX_LOOT_CANISTERS,
  SCOOP_DISTANCE,
  SCRAP_PER_MASS,
  TRACTOR_PULL_SPEED,
  TRACTOR_RANGE,
  WRECK_LIFETIME,
} from './constants.js';
import { buildShip } from './factory.js';
import { fitStats, shipStats } from './stats.js';
import { cargoFree } from './trade.js';
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
 * Remove every ship whose structure has reached zero. Each leaves a wreck,
 * scrap from its hull, and part of its cargo (CARGO_SURVIVAL_FRACTION of
 * each good, rounded down), in canisters. A pilot who loses their ship is left without one
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

    // What spills: scrap from the hull and its modules, plus the surviving part of each good aboard.
    const hull = world.hulls[ship.hullId];
    const builtMass = hull ? fitStats(world, hull, ship.fit).mass : 0;
    const spill: Record<string, number> = {};
    for (const [good, qty] of Object.entries(ship.hold)) {
      const kept = Math.floor(qty * CARGO_SURVIVAL_FRACTION);
      if (kept > 0) spill[good] = kept;
    }
    spill['scrap'] = (spill['scrap'] ?? 0) + Math.round(builtMass * SCRAP_PER_MASS);

    // Each good in up to MAX_LOOT_CANISTERS canisters, fanned out round the wreck.
    const goodsSpilled = Object.keys(spill).sort();
    goodsSpilled.forEach((good, g) => {
      const total = spill[good]!;
      const canisters = Math.min(MAX_LOOT_CANISTERS, total);
      for (let i = 0; i < canisters; i++) {
        const amount = Math.floor(total / canisters) + (i < total % canisters ? 1 : 0);
        const dir = fromAngle(ship.heading + ((i + g * 0.5) / canisters) * Math.PI * 2 + 0.3);
        const item: Loot = {
          id: `l${nextId++}`,
          item: good,
          amount,
          position: add(ship.position, scale(dir, 10)),
          velocity: add(scale(ship.velocity, 0.6), scale(dir, LOOT_SCATTER_SPEED * (1 + g * 0.3))),
          ticksLeft: Math.round(LOOT_LIFETIME / world.dt),
        };
        loot.push(item);
      }
    });
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
 * reach the same canister, the nearer ship wins it. A ship with a full
 * hold does not pull; one with some space takes what fits and leaves the
 * rest of the canister floating.
 */
export function stepLoot(world: World, ships: Record<string, Ship>): LootStep {
  const out: Loot[] = [];
  const updated: Record<string, Ship> = { ...ships };
  const events: WorldEvent[] = [];
  // Cargo capacity and hull radius do not change mid-tick, so look them up once.
  const stats: Record<string, { cargoCapacity: number; radius: number }> = {};
  for (const s of Object.values(ships)) if (world.hulls[s.hullId]) stats[s.id] = shipStats(world, s);
  const beams = Object.values(ships)
    .filter((s) => s.tractorActive && s.state === 'flying' && stats[s.id] && cargoFree(s, stats[s.id]!) > 0)
    .sort((a, b) => (a.id < b.id ? -1 : 1));

  for (const item of world.loot) {
    if (item.ticksLeft <= 1) continue;

    let puller: Ship | null = null;
    let best = TRACTOR_RANGE;
    for (const s of beams) {
      if (cargoFree(updated[s.id]!, stats[s.id]!) <= 0) continue; // filled up this tick
      const d = distance(s.position, item.position);
      if (d <= best) {
        best = d;
        puller = s;
      }
    }

    let velocity = item.velocity;
    if (puller) {
      const radius = stats[puller.id]!.radius;
      if (best <= radius + SCOOP_DISTANCE) {
        const current = updated[puller.id]!;
        const taken = Math.min(item.amount, cargoFree(current, stats[current.id]!));
        const hold = { ...current.hold, [item.item]: (current.hold[item.item] ?? 0) + taken };
        updated[puller.id] = { ...current, hold };
        events.push({ type: 'lootCollected', shipId: puller.id, item: item.item, amount: taken });
        if (taken === item.amount) continue;
        // Hold is now full: the rest stays where it is.
        out.push({ ...item, amount: item.amount - taken, velocity: puller.velocity, ticksLeft: item.ticksLeft - 1 });
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
  const loadout = world.loadouts[sp.loadoutId];
  if (!loadout || !world.hulls[loadout.hullId]) return { world, spawner: sp };
  const id = `npc-${sp.id}-${sp.spawned + 1}`;
  const ship: Ship = buildShip(world, {
    id,
    loadout,
    ownerId: null,
    position: sp.position,
    heading: sp.heading,
    flightMode: 'rotation', // NPC steering handles drift itself; see ai/steer.ts
    dockedAt: sp.dockedAt,
    hold: sp.hold,
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
