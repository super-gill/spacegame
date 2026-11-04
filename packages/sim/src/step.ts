import { thinkNpcs } from './ai/index.js';
import { applyDamage, fireWeapons, rechargeCapacitor, regenerateShield, stepProjectiles, type Damage } from './combat.js';
import { asteroidStates } from './asteroids.js';
import { collideShips, collideWithStations, collideWithSurfaces, insideSurface, type Surface } from './collision.js';
import { ridePad, tryDock, undock } from './docking.js';
import { nextFlightMode } from './flight.js';
import { DOCK_REPAIR_PER_SECOND } from './constants.js';
import { departShips, destroyShips, runSpawners, stepLoot, stepWrecks } from './lifecycle.js';
import { stepLocks, weaponTarget } from './locks.js';
import { pilotsAboard } from './ownership.js';
import { applyCarry, frameVelocity, placeStations, surfacesNext, tickRails } from './rails.js';
import { stepShip } from './ship.js';
import { shipStats } from './stats.js';
import type { Projectile, Ship, ShipInput, ShipStats, World, WorldEvent } from './types.js';
import { emptyInput } from './world.js';

/** Boxes of each ammunition an NPC keeps aboard. */
const NPC_AMMO_BOXES = 4;

/**
 * An NPC ship at a dock with full magazines and its boxes of ammunition.
 * Traders and the Watch pay for this off-screen; it is not a market trade.
 */
function restockNpc(ship: Ship, stats: ShipStats, world: Pick<World, 'goods'>): Ship {
  let hold = ship.hold;
  const weapons = ship.weapons.map((w) => {
    const spec = stats.weapons[w.mountId];
    if (!spec?.ammo) return w;
    if ((hold[spec.ammo] ?? 0) < NPC_AMMO_BOXES) hold = { ...hold, [spec.ammo]: NPC_AMMO_BOXES };
    return w.loaded < spec.magazine ? { ...w, loaded: spec.magazine, reloadTicks: 0 } : w;
  });
  return hold === ship.hold && weapons.every((w, i) => w === ship.weapons[i]) ? ship : { ...ship, hold, weapons };
}

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
 *      local frame under gravity, is carried by the body whose sphere it
 *      is in, bounces off stations and surfaces, fires, and recharges shields; docked ships are
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
  const surfaces = surfacesNext(world.bodies, rails);
  // The belt's rocks at the end of the tick: solid to ships and shots alike.
  const rockStates = asteroidStates(world.bodies, world.asteroids, world.tick + 1, world.dt);
  const rocks: Surface[] = world.asteroids.map((a, i) => ({ bodyId: a.id, position: rockStates[i]!.position, velocity: rockStates[i]!.velocity, radius: a.radius }));
  const solid = [...surfaces, ...rocks];

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
    const pull = ship.state === 'flying' ? rails.gravityAt(ship.position) : { x: 0, y: 0 };
    const stepped = stepShip(ship, stats, given, world.dt, frameVelocity(world, ship), pull);
    const flown = ship.state === 'flying' ? applyCarry(stepped, rails.carryAt(ship.position)) : stepped;
    const hulls = collideWithStations(flown, stats, stationsNext);
    const ground = collideWithSurfaces(hulls.ship, stats, solid);
    const moved = { ship: ground.ship, events: [...hulls.events, ...ground.events], damage: [...hulls.damage, ...ground.damage] };
    events.push(...moved.events);
    damage.push(...moved.damage);

    // Locks: inputs, progress, and dropping those that no longer hold.
    const locked = stepLocks(world, moved.ship, stats, input);
    events.push(...locked.events);
    let targeted = locked.ship;
    if (input.toggleWeaponsHot) {
      targeted = { ...targeted, weaponsHot: !targeted.weaponsHot };
      events.push({ type: 'weaponsHotChanged', shipId: id, hot: targeted.weaponsHot });
    }
    // Fire groups: a number key picks which fixed guns Space fires.
    if (input.selectGroup !== null && input.selectGroup !== targeted.fireGroup && input.selectGroup >= 1 && input.selectGroup <= 4) {
      targeted = { ...targeted, fireGroup: input.selectGroup };
      events.push({ type: 'fireGroupChanged', shipId: id, group: input.selectGroup });
    }

    const aimer = targeted;
    const fired = fireWeapons(targeted, stats, input, (w) => weaponTarget(world, aimer, w), world.dt, nextEntityId, world);
    nextEntityId += fired.idsUsed;
    newProjectiles.push(...fired.projectiles);
    events.push(...fired.events);

    // The reactor refills the capacitor; shields recharge from it.
    ship = regenerateShield(rechargeCapacitor(fired.ship, stats, world.dt), stats, world.dt);
    if (ship.state === 'docked') {
      // Stations repair docked ships: shields and capacitor at once, structure over time.
      const structure = Math.min(stats.structure, ship.structure + DOCK_REPAIR_PER_SECOND * world.dt);
      ship = { ...ship, shield: stats.shield, structure, capacitor: stats.capacitor };
      // NPC crews restock their guns at the dock (their contracts cover it); pilots buy their own.
      if (world.npcs[id]) ship = restockNpc(ship, stats, world);
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
  const shots = stepProjectiles(world.projectiles, ships, world.hulls, stationsNext, world.dt, rails.carryAt, rails.gravityAt);
  shots.projectiles = shots.projectiles.filter((p) => !insideSurface(p.position, solid));
  damage.push(...shots.damage);

  // 5. Apply damage in a fixed order and note who last hurt each ship.
  const killers: Record<string, string | null> = {};
  const npcs = { ...npc.npcs };
  for (const d of damage) {
    const target = ships[d.shipId];
    if (!target || target.structure <= 0) continue;
    ships[d.shipId] = applyDamage(target, shipStats(world, target), d.amount, world.dt, d.type);
    killers[d.shipId] = d.by;
    events.push({ type: 'damaged', shipId: d.shipId, by: d.by, amount: d.amount, cause: d.cause });

    // A pirate remembers who attacked it.
    const brain = npcs[d.shipId];
    if (brain?.kind === 'pirate' && d.by && d.by !== d.shipId) npcs[d.shipId] = { ...brain, provokedBy: d.by };
    // The Watch turns on any pirate that shoots it.
    if (brain?.kind === 'watch' && d.by && world.npcs[d.by]?.kind === 'pirate' && brain.mode !== 'engage') {
      npcs[d.shipId] = { ...brain, mode: 'engage', targetId: d.by, modeTicks: 0 };
    }
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
  const loot = stepLoot(next, next.ships, rails.carryAt, rails.gravityAt);
  events.push(...loot.events);
  // Loot and wrecks that fall into a surface are gone.
  next = {
    ...next,
    ships: loot.ships,
    loot: loot.loot.filter((l) => !insideSurface(l.position, surfaces)),
    wrecks: stepWrecks(next.wrecks, world.dt, rails.carryAt, rails.gravityAt).filter((w) => !insideSurface(w.position, surfaces)),
  };
  next = runSpawners(next);

  return { ...next, events };
}
