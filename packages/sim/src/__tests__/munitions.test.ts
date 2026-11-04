import { describe, expect, it } from 'vitest';
import { fireWeapons } from '../combat.js';
import { FIXED_DT } from '../constants.js';
import { buildShip } from '../factory.js';
import { GOODS } from '../goods.js';
import { LOADOUTS } from '../loadouts.js';
import { decoySignature, dropDecoy, launchMunition, spoofRadar, stepMunitions } from '../munitions.js';
import { deserializeWorld, serializeWorld } from '../save.js';
import { shipStats } from '../stats.js';
import { stepWorld } from '../step.js';
import type { Munition, Ship, ShipInput, World } from '../types.js';
import { fromAngle, scale } from '../vec2.js';
import { WEAPONS } from '../weapons.js';
import { createStarterWorld, emptyInput } from '../world.js';

/** 6e part 2: missiles and torpedoes, point defence, countermeasures. */

const SECOND = 60;
const OPEN = { x: -7000, y: -7000 };

function quiet(): World {
  return { ...createStarterWorld(), ships: {}, npcs: {}, spawners: [] };
}

/** A ship from a loadout in open space, with fit changes, hold, heading and offset from OPEN. */
function shipOf(w: World, id: string, loadoutId: string, fit: Record<string, string> = {}, hold: Record<string, number> = {}, heading = 0, at = { x: 0, y: 0 }): Ship {
  const loadout = LOADOUTS[loadoutId]!;
  const position = { x: OPEN.x + at.x, y: OPEN.y + at.y };
  const built = buildShip(w, { id, loadout: { ...loadout, fit: { ...loadout.fit, ...fit } }, ownerId: null, position, heading, flightMode: 'manual' });
  return { ...built, hold };
}

/** `ship` holding a complete, active lock on `targetId`. */
function lockedOn(ship: Ship, targetId: string): Ship {
  return { ...ship, locks: [{ targetId, progress: 1 }], activeLock: targetId };
}

function withShips(w: World, ...ships: Ship[]): World {
  return { ...w, ships: Object.fromEntries(ships.map((s) => [s.id, s])) };
}

/** Group 2 is the launchers' default: select it and fire. */
const launch: ShipInput = { ...emptyInput(), selectGroup: 2, fireFixed: true };

describe('launchers', () => {
  it('a new launcher sits in group 2, loaded with the cheapest munition that fits', () => {
    const w = quiet();
    const s = shipOf(w, 's', 'kessari-raider', { w1: 'itomarr-magazine-m' });
    const tube = s.weapons.find((x) => x.mountId === 'w1')!;
    expect(tube.group).toBe(2);
    expect(tube.loadedGood).toBe('summons-breach');
    expect(tube.loaded).toBe(WEAPONS['missile-launcher-m']!.magazine);
  });

  it('will not launch without a complete lock', () => {
    const w = quiet();
    const s = { ...shipOf(w, 's', 'kessari-raider'), fireGroup: 2 };
    const r = fireWeapons(s, shipStats(w, s), launch, () => null, FIXED_DT, 1, w);
    expect(r.munitions).toEqual([]);
    expect(r.events.some((e) => e.type === 'launchRefused')).toBe(true);
  });

  it('launches at a lock, homes on it and hits with its warhead', () => {
    let w = quiet();
    const shooter = lockedOn(shipOf(w, 's', 'kessari-raider'), 't');
    // A target to one side: the missile has to turn to reach it.
    const target = shipOf(w, 't', 'kessari-raider', { w2: 'paragon-pulse-s' }, {}, 0, { x: 600, y: 500 });
    w = withShips(w, shooter, target);
    w = stepWorld(w, { s: launch });
    expect(w.munitions).toHaveLength(1);
    expect(w.events.some((e) => e.type === 'munitionLaunched' && e.targetId === 't')).toBe(true);
    let hit = null;
    for (let i = 0; i < SECOND * 6 && !hit; i++) {
      w = stepWorld(w, { s: emptyInput() });
      hit = w.events.find((e) => e.type === 'damaged' && e.shipId === 't' && e.cause === 'munition') ?? null;
    }
    expect(hit).not.toBeNull();
    expect(w.munitions).toHaveLength(0);
  });

  it('a radar missile flies straight once its launcher drops the lock', () => {
    let w = quiet();
    const shooter = lockedOn(shipOf(w, 's', 'kessari-raider'), 't');
    const target = shipOf(w, 't', 'kessari-raider', { w2: 'paragon-pulse-s' }, {}, 0, { x: 300, y: 900 });
    w = withShips(w, shooter, target);
    w = stepWorld(w, { s: launch });
    w = stepWorld(w, { s: { ...emptyInput(), unlock: 't' } });
    for (let i = 0; i < SECOND; i++) w = stepWorld(w, { s: emptyInput() });
    const m = w.munitions[0]!;
    expect(m.homingOn).toBeNull();
    // Still on the heading it left with: it never turned for the target.
    expect(Math.abs(m.heading)).toBeLessThan(0.05);
  });

  it('a fast ship outruns a torpedo', () => {
    let w = quiet();
    const shooter = lockedOn(shipOf(w, 's', 'kessari-raider'), 't');
    // The Tern running flat out away from the shooter, already at speed.
    const tern = shipOf(w, 't', 'meridian-starter', {}, {}, Math.PI, { x: -400, y: 0 });
    const running = { ...tern, velocity: scale(fromAngle(Math.PI), shipStats(w, tern).maxSpeed) };
    const torpedo = launchMunition(shooter, shipStats(w, shooter).radius, WEAPONS['torpedo-tube-l']!, GOODS['foreclosure-breach']!, 't', 'm1', FIXED_DT)!;
    w = { ...withShips(w, shooter, running), munitions: [{ ...torpedo, heading: Math.PI, velocity: scale(fromAngle(Math.PI), 210) }] };
    let hurt = false;
    for (let i = 0; i < SECOND * 18; i++) {
      w = stepWorld(w, { t: { ...emptyInput(), thrustForward: true } });
      if (w.events.some((e) => e.type === 'damaged' && e.shipId === 't')) hurt = true;
    }
    expect(hurt).toBe(false);
    expect(w.munitions).toHaveLength(0); // burnt out
  });

  it('reloads the same warhead while there is any, then whatever else fits', () => {
    const w = quiet();
    const target = shipOf(w, 't', 'kessari-raider', {}, {}, 0, { x: 800, y: 0 });
    let s = { ...shipOf(w, 's', 'kessari-raider', {}, { 'summons-scatter': 1, 'summons-breach': 1 }), fireGroup: 2 };
    s = { ...s, weapons: s.weapons.map((x) => (x.mountId === 'w2' ? { ...x, loaded: 0, loadedGood: 'summons-scatter' } : x)) };
    const stats = shipStats(w, s);
    const seen: string[] = [];
    for (let i = 0; i < SECOND * 60; i++) {
      const r = fireWeapons(s, stats, { ...emptyInput(), fireFixed: true }, () => target, FIXED_DT, i * 10, w);
      s = r.ship;
      for (const m of r.munitions) seen.push(m.goodId);
    }
    const perBox = GOODS['summons-scatter']!.ammo!.perUnit;
    expect(seen).toEqual([...Array(perBox).fill('summons-scatter'), ...Array(perBox).fill('summons-breach')]);
    expect(s.hold).toEqual({});
  });

  it('warheads carry their damage type', () => {
    const shooter = shipOf(quiet(), 's', 'kessari-raider');
    const frag = launchMunition(shooter, 25, WEAPONS['missile-launcher-s']!, GOODS['summons-scatter']!, 't', 'm', FIXED_DT)!;
    const blast = launchMunition(shooter, 25, WEAPONS['missile-launcher-s']!, GOODS['summons-breach']!, 't', 'm', FIXED_DT)!;
    expect(frag.damageType).toBe('fragmentation');
    expect(blast.damageType).toBe('explosive');
  });
});

describe('point defence', () => {
  /** A torpedo flying straight at `target` from `range` units dead ahead of it, from a launcher that does not exist. */
  function torpedoAt(target: Ship, range: number): Munition {
    const from = { x: target.position.x + range, y: target.position.y };
    const ghost = { ...target, id: 'ghost', position: from, heading: Math.PI, velocity: { x: 0, y: 0 } };
    const m = launchMunition(ghost, 0, WEAPONS['torpedo-tube-l']!, GOODS['foreclosure-breach']!, target.id, 'm1', FIXED_DT)!;
    return { ...m, velocity: scale(fromAngle(Math.PI), 210) };
  }

  it("a trader's swivel shoots down a torpedo coming at it, without a lock and with weapons cold", () => {
    let w = quiet();
    const trader = shipOf(w, 't', 'tessaract-trader', {}, { rounds: 4 });
    expect(trader.weaponsHot).toBe(false);
    w = { ...withShips(w, trader), munitions: [torpedoAt(trader, 1400)] };
    let downed = null;
    let hurt = false;
    for (let i = 0; i < SECOND * 10 && !downed; i++) {
      w = stepWorld(w, { t: emptyInput() });
      downed = w.events.find((e) => e.type === 'munitionDestroyed' && e.by === 't') ?? null;
      if (w.events.some((e) => e.type === 'damaged' && e.shipId === 't')) hurt = true;
    }
    expect(downed).not.toBeNull();
    expect(hurt).toBe(false);
  });

  it('a swivel cannot defend a blind spot: a torpedo from astern of the Manifest gets through', () => {
    let w = quiet();
    const trader = shipOf(w, 't', 'tessaract-trader', { u1: 'meridian-pod-s' }, { rounds: 4 }, Math.PI); // facing away
    w = { ...withShips(w, trader), munitions: [torpedoAt(trader, 1400)] };
    let hurt = false;
    for (let i = 0; i < SECOND * 10 && !hurt; i++) {
      w = stepWorld(w, { t: emptyInput() });
      if (w.events.some((e) => e.type === 'damaged' && e.shipId === 't' && e.cause === 'munition')) hurt = true;
    }
    expect(hurt).toBe(true);
  });
});

describe('countermeasures', () => {
  it('a dispenser drops its charge on the key, whatever the fire group, and comes with its maker mix', () => {
    const w = quiet();
    const s = shipOf(w, 's', 'calder-watch');
    const dispenser = s.weapons.find((x) => x.mountId === 'u2')!;
    expect(dispenser.loadedGood).toBe('chaff');
    const r = fireWeapons({ ...s, fireGroup: 3 }, shipStats(w, s), { ...emptyInput(), launchCountermeasure: true }, () => null, FIXED_DT, 1, w);
    expect(r.decoys).toHaveLength(1);
    expect(r.decoys[0]!.spoofs).toEqual(['radar']);
    expect(r.ship.weapons.find((x) => x.mountId === 'u2')!.loaded).toBe(dispenser.loaded - 1);
  });

  it('chaff may draw a radar missile: likelier the brighter it is against the ship', () => {
    const w = quiet();
    const shooter = shipOf(w, 's', 'kessari-raider');
    const target = shipOf(w, 't', 'meridian-starter', {}, {}, 0, { x: 600, y: 0 });
    const ships = { s: shooter, t: target };
    const missile = launchMunition(shooter, 25, WEAPONS['missile-launcher-s']!, GOODS['summons-breach']!, 't', 'm1', FIXED_DT)!;
    const chaff = dropDecoy(target, GOODS['chaff']!, 'd1', FIXED_DT)!;
    const bright = { ...GOODS, chaff: { ...GOODS['chaff']!, decoy: { ...GOODS['chaff']!.decoy!, signature: 1e9 } } };
    const dark = { ...GOODS, chaff: { ...GOODS['chaff']!, decoy: { ...GOODS['chaff']!.decoy!, signature: 0 } } };
    expect(spoofRadar([missile], [chaff], ships, w.hulls, bright).munitions[0]!.homingOn).toBe('d1');
    expect(spoofRadar([missile], [chaff], ships, w.hulls, dark).munitions[0]!.homingOn).toBe('t');
    // Flares do nothing to radar seekers.
    const flare = dropDecoy(target, GOODS['flares']!, 'd2', FIXED_DT)!;
    expect(spoofRadar([missile], [flare], ships, w.hulls, GOODS).munitions[0]!.homingOn).toBe('t');
  });

  it('a heat seeker turns for a fresh flare that outshines the ship ahead of it', () => {
    const w = quiet();
    const shooter = shipOf(w, 's', 'kessari-raider');
    const tern = shipOf(w, 't', 'meridian-starter', {}, {}, 0, { x: 700, y: 0 });
    const missile = launchMunition(shooter, 25, WEAPONS['missile-launcher-s']!, GOODS['summons-heat']!, 't', 'm1', FIXED_DT)!;
    const flare = { ...dropDecoy(tern, GOODS['flares']!, 'd1', FIXED_DT)!, position: { x: tern.position.x - 150, y: tern.position.y + 60 } };
    expect(decoySignature(flare, GOODS)).toBeGreaterThan(w.hulls['meridian-courier']!.signature);
    const step = stepMunitions([missile], [], [flare], { s: shooter, t: tern }, w.hulls, {}, GOODS, FIXED_DT, () => ({ x: 0, y: 0 }));
    expect(step.munitions[0]!.homingOn).toBe('d1');
    expect(step.events.some((e) => e.type === 'munitionSpoofed')).toBe(true);
    // A burnt-down flare is dimmer than the hull: the seeker stays on the ship.
    const old = { ...flare, ticksLeft: 1 };
    const cold = stepMunitions([missile], [], [old], { s: shooter, t: tern }, w.hulls, {}, GOODS, FIXED_DT, () => ({ x: 0, y: 0 }));
    expect(cold.munitions[0]!.homingOn).toBe('t');
  });

  it('an NPC with a dispenser drops a countermeasure when a missile closes on it', () => {
    let w = createStarterWorld();
    const trader = Object.values(w.ships).find((s) => w.npcs[s.id]?.kind === 'trader')!;
    const flying = { ...trader, state: 'flying' as const, dockedAt: null, padId: null, position: { x: -7000, y: -7000 }, velocity: { x: 0, y: 0 } };
    const shooter = lockedOn(shipOf(w, 'shooter', 'kessari-raider'), trader.id);
    const m = launchMunition({ ...shooter, position: { x: -7000 + 500, y: -7000 }, heading: Math.PI }, 0, WEAPONS['missile-launcher-s']!, GOODS['summons-breach']!, trader.id, 'm1', FIXED_DT)!;
    w = { ...w, ships: { ...w.ships, [trader.id]: flying, shooter }, munitions: [m] };
    w = stepWorld(w, {});
    expect(w.events.some((e) => e.type === 'countermeasureLaunched' && e.shipId === trader.id)).toBe(true);
  });
});

describe('saves', () => {
  it('keep munitions and decoys in flight, and load older worlds with none', () => {
    let w = quiet();
    const shooter = lockedOn(shipOf(w, 's', 'kessari-raider'), 't');
    const target = shipOf(w, 't', 'kessari-raider', {}, {}, 0, { x: 900, y: 0 });
    w = stepWorld(withShips(w, shooter, target), { s: launch });
    const back = deserializeWorld(serializeWorld(w, ''));
    expect(back.ok && back.world.munitions).toEqual(w.munitions);

    const { munitions: _m, decoys: _d, ...older } = w;
    const loaded = deserializeWorld(serializeWorld(older as World, ''));
    expect(loaded.ok && loaded.world.munitions).toEqual([]);
    expect(loaded.ok && loaded.world.decoys).toEqual([]);
  });
});
