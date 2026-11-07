import { stepBurn } from './burn.js';
import { thinkNpcs } from './ai/index.js';
import { applyDamage, shieldCovers, fireWeapons, loadedGoodOf, rechargeCapacitor, regenerateShield, stepProjectiles, type BeamShot, type Damage } from './combat.js';
import { goodsFitting } from './goods.js';
import { incomingMunitions, spoofRadar, stepDecoys, stepMunitions } from './munitions.js';
import { asteroidStates, stepRockfall } from './asteroids.js';
import { stepDrones } from './drones.js';
import { breachAction, collapseCores, detonate } from './breach.js';
import { CACHE_LIFETIME, ORE_LOOT_LIFETIME, cutRocks, dropCache, hopperAfterTile, hopperList, surveyPulse } from './mining.js';
import { collideShips, collideWithStations, collideWithSurfaces, insideSurface, type Surface } from './collision.js';
import { ridePad, tryDock, undock } from './docking.js';
import { nextFlightMode } from './flight.js';
import { DOCK_REPAIR_PER_SECOND, FALL_FATAL_SPEED } from './constants.js';
import { HOPPER_EJECT_SPEED, departShips, destroyShips, runSpawners, stepLoot, stepWrecks, sellNpcOre } from './lifecycle.js';
import { stepLocks, weaponTarget } from './locks.js';
import { isSwitchedOn } from './systems.js';
import { lootClaim, pilotsAboard } from './ownership.js';
import { applyCarry, frameVelocity, placeStations, surfacesNext, tickRails } from './rails.js';
import { manoeuvreShare, stepShip } from './ship.js';
import { shipStats } from './stats.js';
import { add, fromAngle, scale, type Vec2 } from './vec2.js';
import type { Decoy, DroneCommand, Loot, Munition, Projectile, Ship, ShipInput, ShipStats, World, WorldEvent } from './types.js';
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
    // Whatever it was using, else the cheapest that fits.
    const current = loadedGoodOf(w, spec, world.goods);
    const good = current && world.goods[current]?.ammo?.fits === spec.ammo ? current : (goodsFitting(world.goods, spec.ammo)[0]?.id ?? null);
    if (!good) return w;
    if ((hold[good] ?? 0) < NPC_AMMO_BOXES) hold = { ...hold, [good]: NPC_AMMO_BOXES };
    return w.loaded < spec.magazine || w.loadedGood !== good ? { ...w, loaded: spec.magazine, loadedGood: good, reloadTicks: 0 } : w;
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
 *      repaired and ride their pads. A survey scanner's tile sends a pulse.
 *      Then mining lasers cut the rocks they reach, freeing ore as loot (mining.ts).
 *   3. Ships collide with each other (rams).
 *   4. Projectiles fly (carried like ships) and hit ships or munitions;
 *      countermeasures drift and burn, fresh ones may draw radar seekers;
 *      munitions take their hits, steer and strike (munitions.ts).
 *   5. All damage from this tick is applied; destroyed ships become
 *      wrecks and loot; NPCs that chose to leave the sector go.
 *   6. Loot is pulled in and scooped, wrecks drift (both carried),
 *      spawners replace lost NPCs, and the belt tops up its rocks.
 *
 * Pure: returns a new World and never mutates the one passed in. The client
 * calls this from a fixed-timestep accumulator; tests call it directly.
 */
/** A hit on a world (not a belt rock) at `FALL_FATAL_SPEED` or more, from a tick's impacts: the end of the ship. */
function fallInto(impacts: readonly WorldEvent[], world: World): { bodyId: string; event: WorldEvent } | null {
  for (const e of impacts) {
    if (e.type === 'impacted' && world.bodies[e.bodyId] && e.speed >= FALL_FATAL_SPEED) {
      return { bodyId: e.bodyId, event: { type: 'fellInto', shipId: e.shipId, bodyId: e.bodyId, speed: e.speed } };
    }
  }
  return null;
}

export function stepWorld(world: World, inputs: Readonly<Record<string, ShipInput>>): World {
  // 0. Rails: what carries what this tick, and where stations will be.
  const rails = tickRails(world.bodies, world.tick, world.dt, world.rules.gravity);
  const stationsNext = placeStations(world.bodies, world.stations, world.tick + 1, world.dt);
  const surfaces = surfacesNext(world.bodies, rails);
  // The belt's rocks at the end of the tick: solid to ships and shots alike.
  const rockStates = asteroidStates(world.bodies, world.asteroids, world.tick + 1, world.dt);
  // Rocks by id, for mining turrets and their assignment.
  const rockIndex = new Map(world.asteroids.map((a, i) => [a.id, i]));
  const rockFor = (rockId: string): { position: Vec2; radius: number } | null => {
    const i = rockIndex.get(rockId);
    return i === undefined ? null : { position: rockStates[i]!.position, radius: world.asteroids[i]!.radius };
  };
  const rocks: Surface[] = world.asteroids.map((a, i) => ({ bodyId: a.id, position: rockStates[i]!.position, velocity: rockStates[i]!.velocity, radius: a.radius }));
  const solid = [...surfaces, ...rocks];

  const npc = thinkNpcs(world);
  const events: WorldEvent[] = [...npc.events];
  const damage: Damage[] = [];
  const newProjectiles: Projectile[] = [];
  const newMunitions: Munition[] = [];
  const newDecoys: Decoy[] = [];
  const beams: BeamShot[] = [];
  const cacheLoot: Loot[] = [];
  const jettisoned: Loot[] = [];
  const droneCommands: Record<string, DroneCommand> = {};
  let charges = [...(world.charges ?? [])];
  const detonations: { shipId: string; rockId: string; tolerance: number }[] = [];
  const cacheMarks = new Map<string, string>();
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

    // A burning ship flies itself and does nothing else (burn.ts): no
    // docking, locks or guns until it arrives or the pilot cancels.
    if (ship.burn && ship.state === 'flying') {
      const burned = stepBurn(world, ship, stationsNext);
      events.push(...burned.events);
      // Worlds are solid even at burn speed: the detour should keep clear, and if it does not, this is a fall.
      const fall = fallInto(collideWithSurfaces(burned.ship, stats, surfaces).events, world);
      if (fall) {
        events.push(fall.event);
        ships[id] = { ...burned.ship, structure: 0, fellInto: fall.bodyId };
        continue;
      }
      ships[id] = regenerateShield(rechargeCapacitor(burned.ship, stats, world.dt), stats, world.dt);
      continue;
    }

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
    // The afterburner, held: a higher speed cap and more main thrust this
    // tick, paid for from the capacitor; it will not light on an empty one.
    const burnCost = stats.afterburnerDraw * world.dt;
    const lit = !!given?.afterburner && ship.state === 'flying' && stats.afterburnerSpeed > 0 && ship.capacitor >= burnCost;
    const flightStats = lit ? { ...stats, maxSpeed: stats.maxSpeed * (1 + stats.afterburnerSpeed), mainThrust: stats.mainThrust * (1 + stats.afterburnerThrust) } : stats;
    const burnt = stepShip(ship, flightStats, given, world.dt, frameVelocity(world, ship), pull, manoeuvreShare(world.rules.manoeuvreSpeed, stats));
    const stepped = lit ? { ...burnt, capacitor: burnt.capacitor - burnCost, afterburning: true } : burnt.afterburning ? { ...burnt, afterburning: false } : burnt;
    const flown = ship.state === 'flying' ? applyCarry(stepped, rails.carryAt(ship.position)) : stepped;
    const hulls = collideWithStations(flown, stats, stationsNext);
    const ground = collideWithSurfaces(hulls.ship, stats, solid);
    const fall = fallInto(ground.events, world);
    if (fall) {
      // Too fast into a world: the ship is gone (lifecycle.ts recovers the pod). No bounce, no damage to count.
      events.push(...hulls.events, fall.event);
      ships[id] = { ...ground.ship, structure: 0, fellInto: fall.bodyId };
      continue;
    }
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
    // The Registry beacon: showing colours or running dark (colours.ts).
    if (input.toggleColours) {
      const next: Ship = { ...targeted };
      if (next.dark) delete next.dark;
      else next.dark = true;
      targeted = next;
      events.push({ type: 'coloursChanged', shipId: id, dark: targeted.dark === true });
    }
    // Switching a module on or off from its tile (a tractor). A dispenser's
    // tile fires it instead: fireWeapons reads the same input.
    if (input.toggleModule) {
      const moduleId = targeted.fit[input.toggleModule];
      // A survey scanner's tile sends a pulse (mining.ts).
      if (moduleId && world.modules[moduleId]?.kind === 'surveyScanner') {
        const pulse = surveyPulse(targeted, stats, world.asteroids, rockStates, world.goods, world.tick, world.dt);
        targeted = pulse.ship;
        events.push(pulse.event);
      }
      // A mining turret's tile gives it the active lock's rock to cut, or takes it away (pressed again, or with no rock active).
      const turret = targeted.weapons.find((w) => w.mountId === input.toggleModule);
      const turretSpec = turret ? stats.weapons[turret.mountId] : undefined;
      if (turret && turretSpec?.family === 'mining' && turretSpec.kind === 'turret') {
        const active = targeted.activeLock;
        const rock = active && rockFor(active) ? active : null;
        const rockId = rock && turret.lockTarget !== rock ? rock : null;
        targeted = { ...targeted, weapons: targeted.weapons.map((w) => (w === turret ? { ...w, lockTarget: rockId } : w)) };
        events.push({ type: 'laserAssigned', shipId: id, mountId: turret.mountId, rockId });
      }
      // A breach charger's tile plants a charge, or sets them off (breach.ts).
      if (moduleId && world.modules[moduleId]?.kind === 'breachCharger') {
        const action = breachAction({ asteroids: world.asteroids, charges }, targeted, rockFor, `c${nextEntityId}`);
        if (action.kind === 'plant') {
          nextEntityId++;
          charges = [...charges, action.charge];
          const left = (targeted.hold['breach-charge'] ?? 1) - 1;
          const { 'breach-charge': _used, ...rest } = targeted.hold;
          targeted = { ...targeted, hold: left > 0 ? { ...rest, 'breach-charge': left } : rest };
          events.push({ type: 'chargePlaced', shipId: id, rockId: action.charge.rockId, placed: charges.filter((c) => c.shipId === id && c.rockId === action.charge.rockId).length });
        } else if (action.kind === 'detonate') {
          detonations.push({ shipId: id, rockId: action.rockId, tolerance: stats.breachTolerance });
        } else {
          events.push({ type: 'chargeRefused', shipId: id, reason: action.reason });
        }
      }
      // An ore hopper's tile: a small one steps its one dropped ore along, a bigger one switches its list on or off.
      if (moduleId && world.modules[moduleId]?.kind === 'oreHopper') {
        const { hopper: _old, ...plain } = targeted;
        const hopper = hopperAfterTile(targeted, stats.hopperGrade, world.goods);
        targeted = hopper ? { ...plain, hopper } : plain;
        events.push({ type: 'hopperFilterChanged', shipId: id, drop: hopper?.drop ?? [], on: Boolean(hopper && !hopper.off) });
      }
      // A tractor's tile cycles off, on taking only its own loot, on taking everything, and off.
      if (moduleId && world.modules[moduleId]?.kind === 'tractor') {
        const on = isSwitchedOn(targeted, input.toggleModule);
        const { tractorMode: _mode, ...plain } = targeted;
        if (!on) {
          targeted = { ...plain, switchedOn: [...(targeted.switchedOn ?? []), input.toggleModule] };
          events.push({ type: 'tractorModeChanged', shipId: id, mode: 'mine' });
        } else if (targeted.tractorMode !== 'all') {
          targeted = { ...targeted, tractorMode: 'all' };
          events.push({ type: 'tractorModeChanged', shipId: id, mode: 'all' });
        } else {
          targeted = { ...plain, switchedOn: (targeted.switchedOn ?? []).filter((m) => m !== input.toggleModule) };
          events.push({ type: 'tractorModeChanged', shipId: id, mode: 'off' });
        }
      }
    }
    // The hold panel sets the hopper's list, and switches sorting on.
    if (input.hopperDrop && stats.hopperGrade > 0) {
      const drop = hopperList(input.hopperDrop, stats.hopperGrade, world.goods);
      const { hopper: _old, ...plain } = targeted;
      targeted = drop.length > 0 ? { ...plain, hopper: { drop } } : plain;
      events.push({ type: 'hopperFilterChanged', shipId: id, drop, on: drop.length > 0 });
    }
    // Jettison: a whole stack out astern, for anyone to take.
    if (input.jettison) {
      const amount = targeted.hold[input.jettison] ?? 0;
      if (targeted.state !== 'flying') events.push({ type: 'jettisonRefused', shipId: id, reason: 'docked' });
      else if (amount <= 0) events.push({ type: 'jettisonRefused', shipId: id, reason: 'notHeld' });
      else {
        const { [input.jettison]: _gone, ...hold } = targeted.hold;
        const back = fromAngle(targeted.heading + Math.PI);
        jettisoned.push({
          id: `l${nextEntityId++}`,
          item: input.jettison,
          amount,
          position: add(targeted.position, scale(back, stats.radius + 10)),
          velocity: add(targeted.velocity, scale(back, HOPPER_EJECT_SPEED)),
          ticksLeft: Math.round(ORE_LOOT_LIFETIME / world.dt),
          ejectedBy: id,
          jettisoned: true,
        });
        targeted = { ...targeted, hold };
        events.push({ type: 'jettisoned', shipId: id, item: input.jettison, amount });
      }
    }
    // Fire groups: a number key picks which fixed guns Space fires.
    if (input.selectGroup !== null && input.selectGroup !== targeted.fireGroup && input.selectGroup >= 1 && input.selectGroup <= 4) {
      targeted = { ...targeted, fireGroup: input.selectGroup };
      events.push({ type: 'fireGroupChanged', shipId: id, group: input.selectGroup });
    }

    // Orders for drones are carried out after ships move (drones.ts).
    if (input.droneCommand) droneCommands[id] = input.droneCommand;

    // Drop a cache: the ore aboard, and loose ore canisters nearby.
    if (input.dropCache && targeted.state === 'flying') {
      const owner = aboard[id] ?? targeted.ownerId ?? id;
      const dropped = dropCache(targeted, stats, owner, world.loot, world.goods, frameVelocity(world, targeted), world.dt, nextEntityId);
      targeted = dropped.ship;
      // A tractor left running would scoop the cache straight back up: dropping one switches it off.
      if (dropped.event && targeted.switchedOn?.some((m) => world.modules[targeted.fit[m] ?? '']?.kind === 'tractor')) {
        const { tractorMode: _mode, ...plain } = targeted;
        targeted = { ...plain, switchedOn: targeted.switchedOn.filter((m) => world.modules[targeted.fit[m] ?? '']?.kind !== 'tractor') };
      }
      nextEntityId += dropped.idsUsed;
      cacheLoot.push(...dropped.added);
      for (const lootId of dropped.marked) cacheMarks.set(lootId, owner);
      if (dropped.event) events.push(dropped.event);
    }

    const aimer = targeted;
    const threats = incomingMunitions(world.munitions, id);
    const fired = fireWeapons(targeted, stats, input, (w) => weaponTarget(world, aimer, w), world.dt, nextEntityId, world, threats, rockFor);
    nextEntityId += fired.idsUsed;
    newProjectiles.push(...fired.projectiles);
    newMunitions.push(...fired.munitions);
    newDecoys.push(...fired.decoys);
    beams.push(...fired.beams);
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
    // The tractor runs while R is held or its module is switched on, if one is fitted.
    const tractorOn = input.tractor || (ship.switchedOn ?? []).some((m) => world.modules[ship.fit[m] ?? '']?.kind === 'tractor');
    ships[id] = ridePad({ ...ship, tractorActive: tractorOn && ship.state === 'flying' && stats.tractorRange > 0 }, stationsNext);
  }

  // Mining lasers cut the rocks they reach; freed ore joins the loot below.
  const claimFor = (shipId: string): string => lootClaim(world, shipId, aboard);
  const cut = cutRocks(world.asteroids, rockStates, ships, world.ships, beams, world.dt, nextEntityId, claimFor);
  nextEntityId += cut.idsUsed;
  ships = cut.ships;
  events.push(...cut.events);

  // Breach charges go off; exposed cores past their time collapse.
  let asteroids = cut.asteroids;
  const blastLoot: Loot[] = [];
  const drawn: Record<string, Vec2> = {};
  for (const d of detonations) {
    const blast = detonate(world, asteroids, charges, ships, d.shipId, d.rockId, d.tolerance, world.tick + 1, nextEntityId, claimFor(d.shipId));
    asteroids = blast.asteroids;
    charges = blast.charges;
    nextEntityId += blast.idsUsed;
    blastLoot.push(...blast.loot);
    damage.push(...blast.damage);
    events.push(...blast.events);
    for (const [pid, brain] of Object.entries(blast.npcs)) if (brain.kind === 'pirate' && brain.drawnTo && world.npcs[pid] !== brain) drawn[pid] = brain.drawnTo;
  }
  const collapsed = collapseCores(asteroids, world.tick + 1);
  asteroids = collapsed.asteroids;
  events.push(...collapsed.events);
  // Charges on rocks that are gone go with them.
  const standing = new Set(asteroids.map((a) => a.id));
  charges = charges.filter((c) => standing.has(c.rockId));

  // 3. Rams.
  const statsFor = (s: Ship): ShipStats | undefined => (world.hulls[s.hullId] ? shipStats(world, s) : undefined);
  const rams = collideShips(ships, statsFor);
  ships = rams.ships;
  events.push(...rams.events);
  damage.push(...rams.damage);

  // 4. Projectiles already in flight move and hit ships or munitions; new ones start moving next tick.
  const munitionRadius = (m: Munition): number => world.goods[m.goodId]?.munition?.radius ?? 2;
  const shots = stepProjectiles(world.projectiles, ships, world.hulls, stationsNext, world.dt, rails.carryAt, rails.gravityAt, world.munitions, munitionRadius);
  shots.projectiles = shots.projectiles.filter((p) => !insideSurface(p.position, solid));
  damage.push(...shots.damage);

  // Countermeasures drift and burn; ones dropped this tick may draw radar
  // seekers. Then munitions take their hits, steer, and strike.
  const decoys = [...stepDecoys(world.decoys, world.dt, rails.carryAt), ...newDecoys];
  const spoofed = spoofRadar(world.munitions, newDecoys, ships, world.hulls, world.goods);
  events.push(...spoofed.events);
  const frameAt = (point: { x: number; y: number }) => frameVelocity(world, { position: point, dockedAt: null });
  const guided = stepMunitions(spoofed.munitions, shots.munitionHits, decoys, ships, world.hulls, stationsNext, world.goods, world.dt, frameAt, rails.carryAt);
  events.push(...guided.events);
  damage.push(...guided.damage);
  const munitions = guided.munitions.filter((m) => !insideSurface(m.position, solid));

  // 5. Apply damage in a fixed order and note who last hurt each ship.
  const killers: Record<string, string | null> = {};
  const npcs = { ...npc.npcs };
  // Pirates that saw a breach's signature bloom come to see.
  for (const [pid, at] of Object.entries(drawn)) {
    const brain = npcs[pid];
    if (brain?.kind === 'pirate' && brain.mode !== 'hunt') npcs[pid] = { ...brain, drawnTo: at };
  }
  for (const d of damage) {
    const target = ships[d.shipId];
    if (!target || target.structure <= 0) continue;
    const targetStats = shipStats(world, target);
    ships[d.shipId] = applyDamage(target, targetStats, d.amount, world.dt, d.type, d.from);
    killers[d.shipId] = d.by;
    // Note hits that came in through the open stern while there was a shield to miss.
    const unshielded = d.from && targetStats.shield > 0 && !shieldCovers(target, targetStats, d.from) ? { unshielded: true as const } : {};
    events.push({ type: 'damaged', shipId: d.shipId, by: d.by, amount: d.amount, cause: d.cause, ...unshielded });

    // A pirate remembers who attacked it.
    const brain = npcs[d.shipId];
    if (brain?.kind === 'pirate' && d.by && d.by !== d.shipId) npcs[d.shipId] = { ...brain, provokedBy: d.by };
    // The Watch turns on any pirate that shoots it.
    if (brain?.kind === 'watch' && d.by && world.npcs[d.by]?.kind === 'pirate' && brain.mode !== 'engage') {
      const { attack: _run, ...fresh } = brain;
      npcs[d.shipId] = { ...fresh, mode: 'engage', targetId: d.by, modeTicks: 0 };
    }
  }

  let next: World = {
    ...world,
    asteroids,
    charges,
    // Marked canisters join their cache and last as long.
    loot: [
      ...world.loot.map((l) => {
        const owner = cacheMarks.get(l.id);
        return owner ? { ...l, cache: { ownerId: owner }, claim: owner, ticksLeft: Math.max(l.ticksLeft, Math.round(CACHE_LIFETIME / world.dt)) } : l;
      }),
      ...cacheLoot,
      ...jettisoned,
      ...cut.loot,
      ...blastLoot,
    ],
    tick: world.tick + 1,
    stations: stationsNext,
    ships,
    npcs,
    projectiles: [...shots.projectiles, ...newProjectiles],
    munitions: [...munitions, ...newMunitions],
    decoys,
    nextEntityId,
    events,
  };

  const destruction = destroyShips(next, killers);
  next = destruction.world;
  events.push(...destruction.events);

  const departure = departShips(next, npc.departures);
  next = departure.world;
  events.push(...departure.events);

  // Drones: orders, homecomings, and drones lost.
  const drones = stepDrones(next, world, droneCommands);
  next = drones.world;
  events.push(...drones.events);
  next = sellNpcOre(next);

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
  // The belt tops itself up.
  next = { ...next, ...stepRockfall(next) };

  return { ...next, events };
}
