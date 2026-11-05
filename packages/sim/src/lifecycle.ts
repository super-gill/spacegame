import {
  CARGO_SURVIVAL_FRACTION,
  LOOT_LIFETIME,
  MAX_LOOT_CANISTERS,
  SCOOP_DISTANCE,
  SCRAP_PER_MASS,
  WRECK_LIFETIME,
} from './constants.js';
import { freePadFor, onPad } from './docking.js';
import { buildShip } from './factory.js';
import { isEscapePod, pilotsAboard } from './ownership.js';
import { ejectPilot } from './pilots.js';
import { fitStats, shipStats } from './stats.js';
import { holdSpaceFor } from './trade.js';
import type { Loot, Ship, ShipStats, Spawner, World, WorldEvent, Wreck } from './types.js';
import { applyCarry, frameVelocity, pirateHome, type Carry } from './rails.js';
import { add, distance, fromAngle, normalise, scale, sub, type Vec2 } from './vec2.js';

/**
 * Things being made and unmade: destroyed ships become wrecks and loot,
 * loot drifts until scooped, wrecks fade, and spawners keep the NPC
 * population topped up. Every function here is pure and takes and
 * returns the parts of the world it changes.
 */

/** A spawner whose station has no free pad waits this long before trying again, seconds. */
const SPAWN_RETRY_SECONDS = 5;

/** Speed loot canisters scatter at from a destroyed ship, units/s. */
const LOOT_SCATTER_SPEED = 40;

export interface Destruction {
  world: World;
  events: WorldEvent[];
}

/**
 * Remove every ship whose structure has reached zero. Each leaves a wreck,
 * scrap from its hull, and part of its cargo (CARGO_SURVIVAL_FRACTION of
 * each good, rounded down), in canisters. A pilot flying a destroyed
 * ship is ejected in an escape pod; a pilot whose pod is destroyed has no
 * ship until they wake (pilots.ts). An NPC's spawner starts its respawn
 * countdown.
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
  const aboard = pilotsAboard(world);
  const ejections: { pilotId: string; ship: Ship }[] = [];
  let nextId = world.nextEntityId;

  for (const ship of dead) {
    // Debris keeps part of the ship's motion relative to its local frame,
    // so a wreck near a moving station or in a moving body's sphere does
    // not lose the frame's own motion.
    const frame = frameVelocity(world, ship);
    const keep = (fraction: number): Vec2 => add(frame, scale(sub(ship.velocity, frame), fraction));
    delete ships[ship.id];
    delete npcs[ship.id];
    events.push({ type: 'destroyed', shipId: ship.id, by: killers[ship.id] ?? null });

    // Whoever was flying it: from a ship with a pod bay they get away in a
    // pod; from a pod, or a ship without a pod bay (docs/ship-systems.md),
    // they are left with nothing until they wake at Harbour. Owners who
    // were not aboard lose only the ship.
    const pilotId = aboard[ship.id];
    if (pilotId) {
      if (isEscapePod(world, ship) || !shipStats(world, ship).escapePod) {
        pilots[pilotId] = { ...pilots[pilotId]!, shipId: null };
      } else {
        ejections.push({ pilotId, ship });
      }
    }

    const wreck: Wreck = {
      id: `w${nextId++}`,
      hullId: ship.hullId,
      position: ship.position,
      velocity: keep(0.6),
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
          velocity: add(keep(0.6), scale(dir, LOOT_SCATTER_SPEED * (1 + g * 0.3))),
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

  let out: World = { ...world, ships, npcs, pilots, wrecks, loot, spawners, nextEntityId: nextId };
  for (const e of ejections) {
    const r = ejectPilot(out, e.pilotId, e.ship);
    out = r.world;
    events.push(r.event);
  }
  return { world: out, events };
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

/** Drift wrecks, carried by any body whose sphere they are in, and remove those that have faded. */
export function stepWrecks(wrecks: readonly Wreck[], dt: number, carryAt?: (point: Vec2) => Carry, gravityAt?: (point: Vec2) => Vec2): Wreck[] {
  return wrecks
    .filter((w) => w.ticksLeft > 1)
    .map((w) => {
      const velocity = gravityAt ? add(w.velocity, scale(gravityAt(w.position), dt)) : w.velocity;
      const moved = {
        ...w,
        velocity,
        position: add(w.position, scale(velocity, dt)),
        heading: w.heading + w.angularVelocity * dt,
        ticksLeft: w.ticksLeft - 1,
      };
      return carryAt ? applyCarry(moved, carryAt(w.position)) : moved;
    });
}

export interface LootStep {
  loot: Loot[];
  ships: Record<string, Ship>;
  events: WorldEvent[];
}

/** Loose loot comes to rest against its local frame with this time constant, seconds, so nothing wanders off. */
export const LOOT_SETTLE_SECONDS = 2;
/** A tractor with no room parks loot this far beyond the hull, units, and holds it there. */
export const TRACTOR_PARK_GAP = 40;
/** An ore hopper spits its filtered ore out astern at this speed, units/s, relative to the ship. */
export const HOPPER_EJECT_SPEED = 30;

/**
 * Drift loot, pull it towards ships running a tractor beam, and scoop
 * anything that reaches a hull into that ship's hold (`holdSpaceFor`, so
 * ore can use an ore hopper's space). When two beams reach the same
 * canister, the nearer ship wins it. A ship with no room for a canister
 * still catches it and parks it just off the hull, held there while the
 * beam runs (docs/mining.md); one with some room takes what fits and
 * parks the rest. A ship's ore hopper takes every canister in, but spits
 * its filter's ore straight back out astern, and that ship's tractor
 * leaves those rejects alone afterwards. With the gravity rule off, free loot slows to rest against
 * its local frame.
 */
export function stepLoot(world: World, ships: Record<string, Ship>, carryAt?: (point: Vec2) => Carry, gravityAt?: (point: Vec2) => Vec2): LootStep {
  const out: Loot[] = [];
  const updated: Record<string, Ship> = { ...ships };
  const events: WorldEvent[] = [];
  // Hold size and hull radius do not change mid-tick, so look them up once.
  const stats: Record<string, ShipStats> = {};
  for (const s of Object.values(ships)) if (world.hulls[s.hullId]) stats[s.id] = shipStats(world, s);
  const beams = Object.values(ships)
    .filter((s) => s.tractorActive && s.state === 'flying' && stats[s.id])
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  const settle = Math.exp(-world.dt / LOOT_SETTLE_SECONDS);

  for (const item of world.loot) {
    if (item.ticksLeft <= 1) continue;

    // Each beam reaches as far as its fitted tractor (docs/ship-systems.md).
    let puller: Ship | null = null;
    let best = Infinity;
    for (const s of beams) {
      if (s.hopperEject === item.item && item.ejectedBy === s.id) continue; // its own reject: left alone
      const d = distance(s.position, item.position);
      if (d <= stats[s.id]!.tractorRange && d <= best) {
        best = d;
        puller = s;
      }
    }

    // Free loot falls and settles; loot in a tractor beam goes where the beam takes it.
    let velocity = gravityAt ? add(item.velocity, scale(gravityAt(item.position), world.dt)) : item.velocity;
    let remaining = item;
    if (puller) {
      const radius = stats[puller.id]!.radius;
      const current = updated[puller.id]!;
      // The hopper's filter: taken in, then spat out astern.
      if (current.hopperEject === item.item && best <= radius + SCOOP_DISTANCE) {
        const back = fromAngle(current.heading + Math.PI);
        const spat: Loot = {
          ...item,
          position: add(current.position, scale(back, radius + 10)),
          velocity: add(current.velocity, scale(back, HOPPER_EJECT_SPEED)),
          ticksLeft: item.ticksLeft - 1,
          ejectedBy: current.id,
        };
        out.push(spat);
        events.push({ type: 'oreEjected', shipId: current.id, item: item.item, amount: item.amount });
        continue;
      }
      const room = holdSpaceFor(current, stats[current.id]!, world.goods, item.item);
      if (room > 0 && best <= radius + SCOOP_DISTANCE) {
        const taken = Math.min(item.amount, room);
        const hold = { ...current.hold, [item.item]: (current.hold[item.item] ?? 0) + taken };
        updated[puller.id] = { ...current, hold };
        events.push({ type: 'lootCollected', shipId: puller.id, item: item.item, amount: taken });
        if (taken === item.amount) continue;
        // The hold is now full: the rest is parked like any canister there is no room for.
        remaining = { ...item, amount: item.amount - taken };
      }
      const towards = normalise(sub(puller.position, item.position));
      // No room: hold it just off the hull instead of scooping it.
      const parked = room <= 0 || remaining !== item;
      velocity = parked && best <= radius + TRACTOR_PARK_GAP ? puller.velocity : add(puller.velocity, scale(towards, stats[puller.id]!.tractorPull));
    } else if (!world.rules.gravity) {
      // In flat space loose loot comes to rest; with gravity on it falls as it should.
      // The frame as it was when this velocity was set: the start of the tick (the world passed in has already ticked).
      const frame = frameVelocity({ ...world, tick: world.tick - 1 }, { position: item.position, dockedAt: null });
      velocity = add(frame, scale(sub(velocity, frame), settle));
    }

    const moved = { ...remaining, velocity, position: add(item.position, scale(velocity, world.dt)), ticksLeft: item.ticksLeft - 1 };
    out.push(carryAt ? applyCarry(moved, carryAt(item.position)) : moved);
  }
  return { loot: out, ships: updated, events };
}

/** Spawn an NPC ship and brain from a spawner. */
function spawn(world: World, sp: Spawner): { world: World; spawner: Spawner } {
  const loadout = world.loadouts[sp.loadoutId];
  if (!loadout || !world.hulls[loadout.hullId]) return { world, spawner: sp };
  const id = `npc-${sp.id}-${sp.spawned + 1}`;
  // A pirate whose home rides a rail spawns where its home is now.
  const brain = sp.brain.kind === 'pirate' ? { ...sp.brain, home: pirateHome(world, sp.brain.home, sp.brain.homeOrbit) } : sp.brain;
  const position = brain.kind === 'pirate' && brain.homeOrbit ? brain.home : sp.position;
  let ship: Ship = buildShip(world, {
    id,
    loadout,
    ownerId: null,
    position,
    heading: sp.heading,
    flightMode: 'rotation', // NPC steering handles drift itself; see ai/steer.ts
    hold: sp.hold,
  });
  if (sp.dockedAt) {
    // Starts on a pad. With every fitting pad taken, try again shortly.
    const station = world.stations[sp.dockedAt];
    const pad = station ? freePadFor(station, world.hulls[loadout.hullId]!.sizeClass, world.ships) : null;
    if (!station || !pad) return { world, spawner: { ...sp, timerTicks: Math.round(SPAWN_RETRY_SECONDS / world.dt) } };
    ship = onPad(ship, station, pad);
  }
  return {
    world: { ...world, ships: { ...world.ships, [id]: ship }, npcs: { ...world.npcs, [id]: brain } },
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
