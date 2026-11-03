import { thinkNpcs } from './ai/index.js';
import { applyDamage, fireWeapons, regenerateShield, stepProjectiles, type Damage } from './combat.js';
import { collideShips, collideWithStations } from './collision.js';
import { tryDock, undock } from './docking.js';
import { nextFlightMode } from './flight.js';
import { DOCK_REPAIR_PER_SECOND } from './constants.js';
import { departShips, destroyShips, runSpawners, stepLoot, stepWrecks } from './lifecycle.js';
import { stepShip } from './ship.js';
import { loadedHull } from './trade.js';
import type { HullSpec, Projectile, Ship, ShipInput, World, WorldEvent } from './types.js';
import { emptyInput } from './world.js';

/**
 * Advance the world by exactly one fixed tick.
 *
 * `inputs` maps ship id to that ship's control input for this tick, from
 * people (on this machine or, later, over the network). Ships with an NPC
 * brain get their input from the brain instead; an input supplied for an
 * NPC ship wins, which is how tests and debugging can take one over.
 * Any other ship gets an empty input and keeps drifting under whatever
 * its flight computer does on its own.
 *
 * Order within a tick:
 *   1. NPCs decide, all from the start-of-tick world.
 *   2. Each ship docks or undocks, changes flight mode, moves, bounces off
 *      stations, fires, and recharges shields; docked ships are repaired.
 *   3. Ships collide with each other (rams).
 *   4. Projectiles fly and hit.
 *   5. All damage from this tick is applied; destroyed ships become
 *      wrecks and loot; NPCs that chose to leave the sector go.
 *   6. Loot is pulled in and scooped, wrecks drift, spawners replace
 *      lost NPCs.
 *
 * Pure: returns a new World and never mutates the one passed in. The client
 * calls this from a fixed-timestep accumulator; tests call it directly.
 */
export function stepWorld(world: World, inputs: Readonly<Record<string, ShipInput>>): World {
  const npc = thinkNpcs(world);
  const events: WorldEvent[] = [...npc.events];
  const damage: Damage[] = [];
  const newProjectiles: Projectile[] = [];
  let nextEntityId = world.nextEntityId;
  let ships: Record<string, Ship> = {};

  // 2. Per-ship. Sorted so results never depend on object insertion order.
  for (const id of Object.keys(world.ships).sort()) {
    let ship = world.ships[id]!;
    const input = inputs[id] ?? npc.inputs[id] ?? emptyInput();
    const baseHull = world.hulls[ship.hullId];
    if (!baseHull) throw new Error(`Unknown hull "${ship.hullId}" on ship "${id}"`);
    // Cargo adds mass, so the ship flies as its loaded hull.
    const hull = loadedHull(baseHull, ship, world.goods);

    // Docking is handled before movement so a docked ship does not drift.
    if (input.toggleDock) {
      if (ship.state === 'docked') {
        const result = undock(ship, world.stations);
        if (result) {
          ship = result.ship;
          events.push(result.event);
        }
      } else {
        const result = tryDock(ship, world.stations);
        ship = result.ship;
        events.push(result.event);
      }
    }

    // Mode changes apply before movement so the new mode governs this tick.
    if (input.cycleFlightMode) {
      const mode = nextFlightMode(ship.flightMode);
      ship = { ...ship, flightMode: mode };
      events.push({ type: 'flightModeChanged', shipId: ship.id, mode });
    }

    const moved = collideWithStations(stepShip(ship, hull, input, world.dt), hull, world.stations);
    events.push(...moved.events);
    damage.push(...moved.damage);

    // Targeting: apply any change, then drop a target that is gone, docked or ourselves.
    let targeted = moved.ship;
    if (input.selectTarget) targeted = { ...targeted, targetId: input.selectTarget.id };
    if (input.toggleWeaponsHot) {
      targeted = { ...targeted, weaponsHot: !targeted.weaponsHot };
      events.push({ type: 'weaponsHotChanged', shipId: id, hot: targeted.weaponsHot });
    }
    const target = targeted.targetId ? world.ships[targeted.targetId] : undefined;
    const validTarget = target && target.state === 'flying' && target.id !== id ? target : null;
    if (targeted.targetId && !validTarget) targeted = { ...targeted, targetId: null };

    const fired = fireWeapons(targeted, hull, world.weapons, input, validTarget, world.dt, nextEntityId);
    nextEntityId += fired.idsUsed;
    newProjectiles.push(...fired.projectiles);

    ship = regenerateShield(fired.ship, hull, world.dt);
    if (ship.state === 'docked') {
      // Stations repair docked ships: shields at once, structure over time.
      const structure = Math.min(hull.structure, ship.structure + DOCK_REPAIR_PER_SECOND * world.dt);
      ship = { ...ship, shield: hull.shield, structure };
    }
    ships[id] = { ...ship, tractorActive: input.tractor && ship.state === 'flying' };
  }

  // 3. Rams.
  const hullFor = (s: Ship): HullSpec | undefined => {
    const h = world.hulls[s.hullId];
    return h ? loadedHull(h, s, world.goods) : undefined;
  };
  const rams = collideShips(ships, hullFor);
  ships = rams.ships;
  events.push(...rams.events);
  damage.push(...rams.damage);

  // 4. Projectiles already in flight move and hit; new ones start moving next tick.
  const shots = stepProjectiles(world.projectiles, ships, world.hulls, world.stations, world.dt);
  damage.push(...shots.damage);

  // 5. Apply damage in a fixed order and note who last hurt each ship.
  const killers: Record<string, string | null> = {};
  const npcs = { ...npc.npcs };
  for (const d of damage) {
    const target = ships[d.shipId];
    const hull = target ? world.hulls[target.hullId] : undefined;
    if (!target || !hull || target.structure <= 0) continue;
    ships[d.shipId] = applyDamage(target, hull, d.amount, world.dt);
    killers[d.shipId] = d.by;
    events.push({ type: 'damaged', shipId: d.shipId, by: d.by, amount: d.amount, cause: d.cause });

    // A pirate remembers who attacked it.
    const brain = npcs[d.shipId];
    if (brain?.kind === 'pirate' && d.by && d.by !== d.shipId) npcs[d.shipId] = { ...brain, provokedBy: d.by };
  }

  let next: World = {
    ...world,
    tick: world.tick + 1,
    ships,
    npcs,
    projectiles: [...shots.projectiles, ...newProjectiles],
    nextEntityId,
    events,
  };

  const destruction = destroyShips(next, killers);
  next = destruction.world;
  events.push(...destruction.events);

  const departure = departShips(next, npc.departures);
  next = departure.world;
  events.push(...departure.events);

  // 6. Loot, wrecks, spawners.
  const loot = stepLoot(next, next.ships);
  events.push(...loot.events);
  next = { ...next, ships: loot.ships, loot: loot.loot, wrecks: stepWrecks(next.wrecks, world.dt) };
  next = runSpawners(next);

  return { ...next, events };
}
