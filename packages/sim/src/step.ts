import { thinkNpcs } from './ai/index.js';
import { applyDamage, fireWeapons, regenerateShield, stepProjectiles, type Damage } from './combat.js';
import { collideShips, collideWithStations } from './collision.js';
import { ridePad, tryDock, undock } from './docking.js';
import { nextFlightMode } from './flight.js';
import { DOCK_REPAIR_PER_SECOND } from './constants.js';
import { departShips, destroyShips, runSpawners, stepLoot, stepWrecks } from './lifecycle.js';
import { pilotsAboard } from './ownership.js';
import { applyCarry, frameVelocity, placeStations, tickRails } from './rails.js';
import { stepShip } from './ship.js';
import { shipStats } from './stats.js';
import type { Projectile, Ship, ShipInput, ShipStats, World, WorldEvent } from './types.js';
import { emptyInput } from './world.js';

/**
 * Advance the world by exactly one fixed tick.
 *
 * `inputs` maps ship id to that ship's control input for this tick, from
 * people (on this machine or, later, over the network). Ships with an NPC
 * brain get their input from the brain instead; an input supplied for an
 * NPC ship wins, which is how tests and debugging can take one over.
 * A ship a pilot is flying with no input this tick gets a blank one, so
 * its flight computer still runs (assist still bleeds off drift).
 * An empty ship (nobody aboard, see ownership.ts) with no input gets
 * none at all: it coasts with every thruster and gun idle.
 *
 * Inputs are trusted. Over a network, the host must accept a client's
 * input only for the ship that client's pilot is flying.
 *
 * Order within a tick:
 *   0. Bodies and stations are on rails: their places at the end of the
 *      tick are worked out up front (rails.ts).
 *   1. NPCs decide, all from the start-of-tick world.
 *   2. Each ship docks or undocks, changes flight mode, moves against its
 *      local frame, is carried by the body whose sphere it is in, bounces
 *      off stations, fires, and recharges shields; docked ships are
 *      repaired and ride their pads.
 *   3. Ships collide with each other (rams).
 *   4. Projectiles fly (carried like ships) and hit.
 *   5. All damage from this tick is applied; destroyed ships become
 *      wrecks and loot; NPCs that chose to leave the sector go.
 *   6. Loot is pulled in and scooped, wrecks drift (both carried),
 *      spawners replace lost NPCs.
 *
 * Pure: returns a new World and never mutates the one passed in. The client
 * calls this from a fixed-timestep accumulator; tests call it directly.
 */
export function stepWorld(world: World, inputs: Readonly<Record<string, ShipInput>>): World {
  // 0. Rails: what carries what this tick, and where stations will be.
  const rails = tickRails(world.bodies, world.tick, world.dt);
  const stationsNext = placeStations(world.bodies, world.stations, world.tick + 1, world.dt);

  const npc = thinkNpcs(world);
  const events: WorldEvent[] = [...npc.events];
  const damage: Damage[] = [];
  const newProjectiles: Projectile[] = [];
  let nextEntityId = world.nextEntityId;
  let ships: Record<string, Ship> = {};
  const aboard = pilotsAboard(world);

  // 2. Per-ship. Sorted so results never depend on object insertion order.
  for (const id of Object.keys(world.ships).sort()) {
    let ship = world.ships[id]!;
    const crewed = aboard[id] !== undefined || world.npcs[id] !== undefined;
    const given = inputs[id] ?? npc.inputs[id] ?? (crewed ? emptyInput() : null);
    const input = given ?? emptyInput();
    // The ship flies as its fit and cargo make it. Fits only change while
    // docked, so these hold for the whole tick.
    const stats = shipStats(world, ship);

    // Docking is handled before movement so a docked ship does not drift.
    if (input.toggleDock) {
      if (ship.state === 'docked') {
        const result = undock(ship, world.stations);
        if (result) {
          ship = result.ship;
          events.push(result.event);
        }
      } else {
        // Ships already handled this tick are seen as they now are, so two
        // ships docking together never land on the same pad.
        const result = tryDock(ship, { stations: world.stations, hulls: world.hulls, ships: { ...world.ships, ...ships } });
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

    // Fly against the local frame, then be carried by the body whose
    // sphere the ship started the tick in. Station hulls are where they
    // will be at the end of the tick, as the ship is.
    const stepped = stepShip(ship, stats, given, world.dt, frameVelocity(world, ship));
    const flown = ship.state === 'flying' ? applyCarry(stepped, rails.carryAt(ship.position)) : stepped;
    const moved = collideWithStations(flown, stats, stationsNext);
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

    const fired = fireWeapons(targeted, stats, input, validTarget, world.dt, nextEntityId);
    nextEntityId += fired.idsUsed;
    newProjectiles.push(...fired.projectiles);

    ship = regenerateShield(fired.ship, stats, world.dt);
    if (ship.state === 'docked') {
      // Stations repair docked ships: shields at once, structure over time.
      const structure = Math.min(stats.structure, ship.structure + DOCK_REPAIR_PER_SECOND * world.dt);
      ship = { ...ship, shield: stats.shield, structure };
    }
    // Docked ships ride their pads to where the station now is.
    ships[id] = ridePad({ ...ship, tractorActive: input.tractor && ship.state === 'flying' }, stationsNext);
  }

  // 3. Rams.
  const statsFor = (s: Ship): ShipStats | undefined => (world.hulls[s.hullId] ? shipStats(world, s) : undefined);
  const rams = collideShips(ships, statsFor);
  ships = rams.ships;
  events.push(...rams.events);
  damage.push(...rams.damage);

  // 4. Projectiles already in flight move and hit; new ones start moving next tick.
  const shots = stepProjectiles(world.projectiles, ships, world.hulls, stationsNext, world.dt, rails.carryAt);
  damage.push(...shots.damage);

  // 5. Apply damage in a fixed order and note who last hurt each ship.
  const killers: Record<string, string | null> = {};
  const npcs = { ...npc.npcs };
  for (const d of damage) {
    const target = ships[d.shipId];
    if (!target || target.structure <= 0) continue;
    ships[d.shipId] = applyDamage(target, shipStats(world, target), d.amount, world.dt);
    killers[d.shipId] = d.by;
    events.push({ type: 'damaged', shipId: d.shipId, by: d.by, amount: d.amount, cause: d.cause });

    // A pirate remembers who attacked it.
    const brain = npcs[d.shipId];
    if (brain?.kind === 'pirate' && d.by && d.by !== d.shipId) npcs[d.shipId] = { ...brain, provokedBy: d.by };
  }

  let next: World = {
    ...world,
    tick: world.tick + 1,
    stations: stationsNext,
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
  const loot = stepLoot(next, next.ships, rails.carryAt);
  events.push(...loot.events);
  next = { ...next, ships: loot.ships, loot: loot.loot, wrecks: stepWrecks(next.wrecks, world.dt, rails.carryAt) };
  next = runSpawners(next);

  return { ...next, events };
}
