import { describe, expect, it } from 'vitest';
import { FIXED_DT } from '../constants.js';
import { buildShip } from '../factory.js';
import { storeGoods, storedGoods, takeGoods } from '../hangar.js';
import { LOADOUTS } from '../loadouts.js';
import { issueShip } from '../pilots.js';
import { migrate9to10 } from '../save.js';
import { shipStats } from '../stats.js';
import { stepWorld } from '../step.js';
import type { Loot, Ship, ShipInput, World, WorldEvent } from '../types.js';
import { createStarterWorld, emptyInput } from '../world.js';

/** Holds, hoppers, jettison and station storage (docs/mining.md, "Holds"). */

const SECOND = Math.round(1 / FIXED_DT);

/** A quiet, empty patch of space with one ship of `loadout` at rest, far from anything. */
function alone(loadout: string, extra: Partial<Ship> = {}): World {
  const base: World = { ...createStarterWorld(), ships: {}, npcs: {}, spawners: [], asteroids: [], rockfall: { made: 0, timerTicks: 1e9 } };
  const ship = buildShip(base, { id: 's', loadout: LOADOUTS[loadout]!, ownerId: null, position: { x: 0, y: -30000 }, heading: 0, flightMode: 'assisted' });
  return { ...base, ships: { s: { ...ship, ...extra } } };
}

function run(w: World, seconds: number, input: Partial<ShipInput> = {}): { w: World; events: WorldEvent[] } {
  const events: WorldEvent[] = [];
  for (let i = 0; i < seconds * SECOND; i++) {
    w = stepWorld(w, { s: { ...emptyInput(), ...input } });
    events.push(...w.events);
  }
  return { w, events };
}

/** A canister at rest 60 units off the ship's flank. */
function can(w: World, item: string, amount: number, extra: Partial<Loot> = {}): Loot {
  const s = w.ships['s']!;
  return { id: `can-${item}`, item, amount, position: { x: s.position.x, y: s.position.y + 60 }, velocity: { x: 0, y: 0 }, ticksLeft: 1e6, ...extra };
}

describe('hoppers', () => {
  it('a small hopper drops one ore at most; the panel list is trimmed to the first in the catalogue', () => {
    const w = stepWorld(alone('rookrivet-prospector'), { s: { ...emptyInput(), hopperDrop: ['ore', 'banded-ore'] } });
    expect(w.ships['s']!.hopper).toEqual({ drop: ['banded-ore'] });
  });

  it('a medium hopper sorts by a list, and its tile switches the list off and on', () => {
    let w = alone('rookrivet-breacher');
    w = stepWorld(w, { s: { ...emptyInput(), hopperDrop: ['banded-ore', 'ore', 'not-an-ore'] } });
    expect(w.ships['s']!.hopper).toEqual({ drop: ['banded-ore', 'ore'] });
    w = { ...w, loot: [can(w, 'ore', 5), can(w, 'glintstone', 5)] };
    w = run(w, 4, { tractor: true }).w;
    expect(w.ships['s']!.hold).toMatchObject({ glintstone: 5 });
    expect(w.ships['s']!.hold['ore']).toBeUndefined();
    // Off: the list is kept but everything is taken.
    w = stepWorld(w, { s: { ...emptyInput(), toggleModule: 'i2' } });
    expect(w.ships['s']!.hopper).toEqual({ drop: ['banded-ore', 'ore'], off: true });
    w = run(w, 6, { tractor: true }).w;
    expect(w.ships['s']!.hold['ore']).toBe(5);
  });

  it('a large hopper with the ore hold full trades its cheapest ore for better', () => {
    let w = alone('rookrivet-hulk');
    const cap = shipStats(w, w.ships['s']!).oreCapacity;
    w = { ...w, ships: { s: { ...w.ships['s']!, hold: { ore: cap } } } };
    w = { ...w, loot: [can(w, 'glintstone', 5)] };
    const r = run(w, 5, { tractor: true });
    expect(r.w.ships['s']!.hold).toMatchObject({ glintstone: 5, ore: cap - 5 });
    expect(r.events).toContainEqual({ type: 'oreTradedUp', shipId: 's', item: 'glintstone', dropped: 'ore', amount: 5 });
    // The traded-out ore is left beside it, not pulled back in.
    expect(r.w.loot.filter((l) => l.item === 'ore').reduce((n, l) => n + l.amount, 0)).toBe(5);
  });

  it('a medium hopper does not trade up', () => {
    let w = alone('rookrivet-breacher');
    const cap = shipStats(w, w.ships['s']!).oreCapacity;
    w = { ...w, ships: { s: { ...w.ships['s']!, hold: { ore: cap } } } };
    w = { ...w, loot: [can(w, 'glintstone', 5)] };
    expect(run(w, 5, { tractor: true }).w.ships['s']!.hold).toEqual({ ore: cap });
  });
});

describe('jettison', () => {
  it('throws a whole stack out astern, for anyone; your own MINE tractor leaves it, ALL takes it back', () => {
    let w = alone('rookrivet-prospector', { hold: { ore: 20, food: 3 } });
    w = stepWorld(w, { s: { ...emptyInput(), jettison: 'ore' } });
    expect(w.events).toContainEqual({ type: 'jettisoned', shipId: 's', item: 'ore', amount: 20 });
    expect(w.ships['s']!.hold).toEqual({ food: 3 });
    const thrown = w.loot.find((l) => l.item === 'ore')!;
    expect(thrown).toMatchObject({ amount: 20, jettisoned: true, ejectedBy: 's' });
    expect(thrown.claim).toBeUndefined();
    w = run(w, 4, { tractor: true }).w;
    expect(w.ships['s']!.hold['ore']).toBeUndefined();
    w = { ...w, ships: { s: { ...w.ships['s']!, tractorMode: 'all' } } };
    w = run(w, 8, { tractor: true }).w;
    expect(w.ships['s']!.hold['ore']).toBe(20);
  });

  it('refuses with nothing aboard', () => {
    const w = stepWorld(alone('rookrivet-prospector'), { s: { ...emptyInput(), jettison: 'gate-glass' } });
    expect(w.events).toContainEqual({ type: 'jettisonRefused', shipId: 's', reason: 'notHeld' });
  });
});

describe('station storage', () => {
  function docked(): World {
    let w = createStarterWorld();
    w = { ...w, pilots: { ...w.pilots, ana: { id: 'ana', name: 'Ana', shipId: null, shipsIssued: 0, credits: 0, storage: {} } } };
    const made = issueShip(w, 'ana', 'rookrivet-prospector', 'station-ridge');
    w = made.world;
    return { ...w, ships: { ...w.ships, [made.ship.id]: { ...made.ship, hold: { ore: 30, food: 4 } } } };
  }

  it('moves goods between the hold and the station, and only where docked', () => {
    let w = docked();
    const stored = storeGoods(w, 'ana', 'ore', 30);
    expect(stored.ok).toBe(true);
    if (!stored.ok) return;
    w = stored.world;
    const ship = w.ships[w.pilots['ana']!.shipId!]!;
    expect(ship.hold).toEqual({ food: 4 });
    expect(storedGoods(w.pilots['ana']!, 'station-ridge', 'ore')).toBe(30);
    expect(storeGoods(w, 'ana', 'ore', 1)).toMatchObject({ ok: false, reason: 'notHeld' });
    expect(takeGoods(w, 'ana', 'ore', 31)).toMatchObject({ ok: false, reason: 'notHeld' });
    const back = takeGoods(w, 'ana', 'ore', 10);
    expect(back.ok && back.world.ships[ship.id]!.hold['ore']).toBe(10);
    expect(back.ok && storedGoods(back.world.pilots['ana']!, 'station-ridge', 'ore')).toBe(20);
    // Not docked: nothing moves.
    const flying = { ...w, ships: { ...w.ships, [ship.id]: { ...ship, state: 'flying' as const, dockedAt: null, padId: null } } };
    expect(storeGoods(flying, 'ana', 'food', 1)).toMatchObject({ ok: false, reason: 'notDocked' });
  });

  it('takes only what fits the hold', () => {
    let w = docked();
    const pilot = w.pilots['ana']!;
    w = { ...w, pilots: { ana: { ...pilot, hangar: { 'station-ridge': { ore: 500 } } } } };
    expect(takeGoods(w, 'ana', 'ore', 500)).toMatchObject({ ok: false, reason: 'space' });
  });
});

describe('saves', () => {
  it('turn Ore Hold L modules into containers and a one-ore filter into a list', () => {
    const old = {
      ships: { h: { id: 'h', fit: { b1: 'rookrivet-orehold-l', b2: 'rookrivet-orehold-l', i1: 'x' }, hopperEject: 'ore' }, p: { id: 'p', fit: {}, hopperEject: null } },
      pilots: { ana: { id: 'ana', storage: { 'station-ridge': { 'rookrivet-orehold-l': 2, 'tessaract-container-l': 1 } } } },
    };
    const after = migrate9to10(old) as { ships: Record<string, Record<string, unknown>>; pilots: Record<string, { storage: unknown }> };
    expect(after.ships['h']).toEqual({ id: 'h', fit: { b1: 'tessaract-container-l', b2: 'tessaract-container-l', i1: 'x' }, hopper: { drop: ['ore'] } });
    expect(after.ships['p']).toEqual({ id: 'p', fit: {} });
    expect(after.pilots['ana']!.storage).toEqual({ 'station-ridge': { 'tessaract-container-l': 3 } });
  });
});

describe('save 11: slot tiers', () => {
  it('moves what no longer fits to a free slot of its tier, keeping a running tractor on', async () => {
    const { migrate10to11 } = await import('../save.js');
    const old = {
      pilots: {},
      ships: {
        s: {
          id: 's', hullId: 'meridian-courier', ownerId: null, heading: 0, state: 'flying', weapons: [],
          fit: { w1: 'paragon-pulse-s', w2: 'paragon-turret-s', i1: 'meridian-shield-s', i2: 'rookrivet-armour-s', u1: 'meridian-gleaner-s', u2: 'slagline-kick-s', b1: 'meridian-pod-s' },
          switchedOn: ['u1'],
        },
      },
    };
    const after = migrate10to11(old) as { ships: Record<string, Ship> };
    const ship = after.ships['s']!;
    expect(ship.fit).toEqual({ w1: 'paragon-pulse-s', w2: 'paragon-turret-s', w3: 'meridian-gleaner-s', u1: 'meridian-shield-s', u2: 'slagline-kick-s', i2: 'rookrivet-armour-s', b1: 'meridian-pod-s' });
    expect(ship.switchedOn).toEqual(['w3']);
  });

  it('sends what has nowhere to go to the owner\'s storage', async () => {
    const { migrate10to11 } = await import('../save.js');
    const old = {
      pilots: { ana: { id: 'ana', storage: {} } },
      ships: { s: { id: 's', hullId: 'meridian-courier', ownerId: 'ana', heading: 0, state: 'docked', dockedAt: 'station-ridge', weapons: [], fit: { i1: 'meridian-shield-s', u1: 'meridian-shield-s', u2: 'meridian-shield-s' } } },
    };
    const after = migrate10to11(old) as { pilots: Record<string, { storage: Record<string, Record<string, number>> }> };
    expect(after.pilots['ana']!.storage['station-ridge']).toEqual({ 'meridian-shield-s': 1 });
  });
});
