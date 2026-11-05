import { describe, expect, it } from 'vitest';
import { ROCK_FIELDS, ROCKFALL_SECONDS, oreLeft, rockAt, rockMakeup, rockSeam, screeAsteroids, stepRockfall } from '../asteroids.js';
import { BELT_ID, BELT_PERIOD, BELT_RING_RADIUS } from '../bodies.js';
import { FIXED_DT } from '../constants.js';
import { buildShip } from '../factory.js';
import { GOODS, oreGoods } from '../goods.js';
import { LOADOUTS } from '../loadouts.js';
import { lockReadout, lockRefusal } from '../locks.js';
import { CACHE_LIFETIME, CANISTER_UNITS, ORE_LOOT_LIFETIME, SEAM_HALF_ARC, SURVEY_CYCLE_SECONDS, cutRate } from '../mining.js';
import { holdCapacity, holdSpaceFor } from '../trade.js';
import { angleDelta } from '../angle.js';
import { seededRandom } from '../random.js';
import { SAVE_FORMAT, deserializeWorld, serializeWorld } from '../save.js';
import { stepWorld } from '../step.js';
import { shipStats } from '../stats.js';
import { activationSlots } from '../systems.js';
import type { Asteroid, Ship, ShipInput, World, WorldEvent } from '../types.js';
import { createStarterWorld, emptyInput } from '../world.js';

/** Mining part 1 (docs/mining.md): rocks with ore, surveying, cutting, collecting, and the belt topping itself up. */

const SECOND = Math.round(1 / FIXED_DT);
/** Where the test rock sits on the ring: far round from Ridge and the other stations. */
const PHASE = 3.5;

function testRock(over: Partial<Asteroid> = {}): Asteroid {
  return {
    id: 'r1',
    orbit: { parent: BELT_ID, radius: BELT_RING_RADIUS, period: BELT_PERIOD, phase: PHASE, direction: 1, frozen: true },
    radius: 20,
    contents: { ore: 12, glintstone: 3 },
    hardness: 0.2,
    field: 'ring',
    ...over,
  };
}

/** A quiet world with one rock and a prospector 100 units short of it, nose on. The belt does not top itself up. */
function setup(rock: Asteroid = testRock(), loadoutId = 'rookrivet-prospector', side = PHASE): World {
  const base: World = { ...createStarterWorld(), ships: {}, npcs: {}, spawners: [], asteroids: [rock], rockfall: { made: 0, timerTicks: 1e9 } };
  const at = rockAt(base, rock.id)!.position;
  // `side`: the bearing from the rock to the ship; the ship faces the rock.
  const dir = { x: Math.cos(side), y: Math.sin(side) };
  // Approach along the ring's radius, from outside.
  const gap = rock.radius + 100;
  const ship = buildShip(base, {
    id: 's',
    loadout: LOADOUTS[loadoutId]!,
    ownerId: null,
    position: { x: at.x + dir.x * gap, y: at.y + dir.y * gap },
    heading: side + Math.PI,
    flightMode: 'assisted',
  });
  return { ...base, ships: { s: ship } };
}

function run(w: World, seconds: number, input: Partial<ShipInput> = {}): { w: World; events: WorldEvent[] } {
  const events: WorldEvent[] = [];
  for (let i = 0; i < seconds * SECOND; i++) {
    w = stepWorld(w, { s: { ...emptyInput(), ...input } });
    events.push(...w.events);
  }
  return { w, events };
}

/** Ore in loot canisters, by good. */
function oreInLoot(w: World): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of w.loot) out[l.item] = (out[l.item] ?? 0) + l.amount;
  return out;
}

describe('rocks hold ore', () => {
  it('every rock in the Scree holds some, mostly common ore, and big rocks are harder', () => {
    const rocks = screeAsteroids();
    let common = 0;
    let all = 0;
    for (const r of rocks) {
      expect(oreLeft(r), r.id).toBeGreaterThan(0);
      expect(r.hardness).toBeGreaterThan(0);
      expect(r.hardness).toBeLessThanOrEqual(1);
      common += r.contents['ore'] ?? 0;
      all += oreLeft(r);
    }
    expect(common / all).toBeGreaterThan(0.6);
    const small = rocks.filter((r) => r.radius < 30);
    const big = rocks.filter((r) => r.radius > 50);
    const mean = (rs: Asteroid[]): number => rs.reduce((n, r) => n + r.hardness, 0) / rs.length;
    expect(mean(big)).toBeGreaterThan(mean(small) + 0.3);
  });

  it('keeps each field at its count', () => {
    const rocks = screeAsteroids();
    for (const f of ROCK_FIELDS) expect(rocks.filter((r) => r.field === f.id).length, f.id).toBe(f.target);
  });

  it('richer ores turn up somewhere, the best only in bigger rocks', () => {
    const rocks = screeAsteroids();
    for (const good of oreGoods(GOODS)) {
      if (good.ore!.tier === 'common') continue;
      const holding = rocks.filter((r) => (r.contents[good.id] ?? 0) > 0);
      expect(holding.length, good.id).toBeGreaterThan(0);
      for (const r of holding) expect(r.radius).toBeGreaterThanOrEqual(good.ore!.minRadius);
    }
  });

  it('the ore catalogue is just goods: a new ore good turns up in new rocks', () => {
    const goods = { ...GOODS, starglass: { id: 'starglass', name: 'Starglass', unitMass: 0.1, basePrice: 900, ore: { tier: 'rare' as const, chance: 1, share: 0.1, minRadius: 0 } } };
    const made = rockMakeup(seededRandom(1), 40, goods);
    expect(made.contents['starglass']).toBeGreaterThan(0);
    expect(oreGoods(goods).map((g) => g.id)).toContain('starglass');
  });
});

describe('locking a rock', () => {
  it('any targeting computer can lock one; only a mining computer reads what it holds', () => {
    let w = setup();
    expect(lockRefusal(w, w.ships['s']!, 'r1')).toBeNull();
    w = run(w, 1, { lock: 'r1' }).w;
    w = run(w, 2).w;
    const reading = lockReadout(w, w.ships['s']!, 'r1')!;
    expect(reading.composition).toEqual({ ores: { ore: 12, glintstone: 3 }, total: 15, hardness: 0.2, radius: 20, seam: rockSeam('r1') });
    expect(reading.motion!.range).toBeGreaterThan(100);

    // A civil plotter locks it too, but sees only where it is.
    let civil = setup(testRock(), 'meridian-starter');
    civil = run(civil, 1, { lock: 'r1' }).w;
    civil = run(civil, 2).w;
    const plain = lockReadout(civil, civil.ships['s']!, 'r1')!;
    expect(plain.composition).toBeUndefined();
    expect(plain.motion).toBeDefined();
  });
});

describe('mining lasers', () => {
  it('cut a soft rock into canisters of ore, ore for ore, and it crumbles when empty', () => {
    const w0 = setup();
    expect(w0.ships['s']!.fireGroup).toBe(3); // the laser's group is ready
    const { w, events } = run(w0, 20, { fireFixed: true });
    expect(w.asteroids.find((a) => a.id === 'r1')).toBeUndefined();
    expect(events.some((e) => e.type === 'rockCrumbled' && e.rockId === 'r1' && e.shipId === 's')).toBe(true);
    // Every unit of the rock came out, in canisters of at most CANISTER_UNITS.
    const freed = events.filter((e): e is Extract<WorldEvent, { type: 'oreFreed' }> => e.type === 'oreFreed');
    expect(freed.reduce((n, e) => n + e.amount, 0)).toBe(15);
    for (const e of freed) expect(e.amount).toBeLessThanOrEqual(CANISTER_UNITS);
    expect(oreInLoot(w)).toEqual({ ore: 12, glintstone: 3 });
  });

  it("free ore in the rock's mix from the first canister: a light ship gets what it gets", () => {
    const { events } = run(setup(testRock({ contents: { ore: 80, 'banded-ore': 20 } })), 30, { fireFixed: true });
    const freed = events.filter((e): e is Extract<WorldEvent, { type: 'oreFreed' }> => e.type === 'oreFreed').slice(0, 5);
    expect(freed).toHaveLength(5);
    expect(freed.filter((e) => e.item === 'banded-ore')).toHaveLength(1);
  });

  it('cut at the laser rate, paid from the capacitor', () => {
    const w0 = setup(testRock({ contents: { ore: 500 } }));
    const stats = shipStats(w0, w0.ships['s']!);
    const laser = stats.weapons['w1']!;
    const { w } = run(w0, 8, { fireFixed: true });
    const rock = w.asteroids.find((a) => a.id === 'r1')!;
    const taken = 500 - oreLeft(rock);
    const seam = w.ships['s']!.beams![0]!.onSeam ? 1.5 : 1;
    expect(taken + (rock.cut ?? 0)).toBeCloseTo(laser.damage * cutRate(0.45, 0.2) * seam * 8, 0);
    // The prospector's role bonus is in the laser's rate.
    expect(laser.damage).toBeCloseTo(w0.weapons['mining-laser-s']!.damage * 1.25);
    expect(w.ships['s']!.beams?.[0]).toMatchObject({ mountId: 'w1', rockId: 'r1', cutting: true });
  });

  it('do nothing to a rock harder than they are strong, and say so once', () => {
    const { w, events } = run(setup(testRock({ hardness: 0.9 })), 3, { fireFixed: true });
    expect(w.loot).toHaveLength(0);
    expect(oreLeft(w.asteroids[0]!)).toBe(15);
    expect(events.filter((e) => e.type === 'miningTooHard')).toHaveLength(1);
    expect(w.ships['s']!.beams?.[0]).toMatchObject({ rockId: 'r1', cutting: false });
  });

  it('stop when the trigger is let go', () => {
    let { w } = run(setup(), 1, { fireFixed: true });
    expect(w.ships['s']!.beams).toBeDefined();
    w = run(w, 0.1).w;
    expect(w.ships['s']!.beams).toBeUndefined();
  });

  it('with the tractor on, the ore ends up in the hold', () => {
    const { w } = run(setup(), 25, { fireFixed: true, tractor: true });
    expect(w.ships['s']!.hold).toMatchObject({ ore: 12, glintstone: 3 });
    expect(w.loot).toHaveLength(0);
  });
});

describe('making the light ship pay', () => {
  it('soft rock cuts faster: twice the rate on the softest, the plain rate at the laser\'s limit', () => {
    expect(cutRate(0.45, 0.45)).toBe(1);
    expect(cutRate(0.45, 0)).toBe(2);
    expect(cutRate(0.45, 0.2)).toBeGreaterThan(cutRate(0.45, 0.4));
  });

  it("a beam on the rock's seam cuts half as fast again as one on the far side", () => {
    const seam = rockSeam('r1');
    const rock = testRock({ contents: { ore: 500 } });
    const onSeam = run(setup(rock, 'rookrivet-prospector', seam), 4, { fireFixed: true }).w;
    const offSeam = run(setup(rock, 'rookrivet-prospector', seam + Math.PI), 4, { fireFixed: true }).w;
    expect(onSeam.ships['s']!.beams![0]!.onSeam).toBe(true);
    expect(offSeam.ships['s']!.beams![0]!.onSeam).toBeUndefined();
    const taken = (w: World): number => 500 - oreLeft(w.asteroids[0]!) + (w.asteroids[0]!.cut ?? 0);
    expect(taken(onSeam) / taken(offSeam)).toBeCloseTo(1.5, 1);
    expect(Math.abs(angleDelta(seam, seam + SEAM_HALF_ARC / 2))).toBeLessThan(SEAM_HALF_ARC);
  });

  it('freed ore stays where it was cut, and lasts ten minutes', () => {
    const { w } = run(setup(testRock({ contents: { ore: 500 } })), 8, { fireFixed: true });
    expect(w.loot.length).toBeGreaterThan(0);
    for (const l of w.loot) {
      expect(Math.hypot(l.velocity.x, l.velocity.y)).toBeLessThan(1e-6);
      expect(l.ticksLeft).toBeGreaterThan(ORE_LOOT_LIFETIME / FIXED_DT - 10 * SECOND);
    }
  });

  it('an ore hopper adds space only ore may use', () => {
    const ship = setup().ships['s']!;
    const stats = shipStats(createStarterWorld(), ship);
    expect(stats.oreCapacity).toBe(40);
    expect(holdCapacity(stats)).toBe(stats.cargoCapacity + 40);
    const full = { ...ship, hold: { ore: stats.cargoCapacity + 40 } };
    expect(holdSpaceFor(full, stats, GOODS, 'ore')).toBe(0);
    const someOre = { ...ship, hold: { ore: 30 } };
    expect(holdSpaceFor(someOre, stats, GOODS, 'food')).toBe(stats.cargoCapacity);
    expect(holdSpaceFor(someOre, stats, GOODS, 'ore')).toBe(stats.cargoCapacity + 10);
  });

  it("the hopper's tile cycles its filter; filtered ore is taken in and spat out astern, then left alone", () => {
    let w = setup(testRock({ contents: { ore: 12, glintstone: 3 } }));
    w = stepWorld(w, { s: { ...emptyInput(), toggleModule: 'i2' } });
    expect(w.ships['s']!.hopperEject).toBe('banded-ore');
    expect(w.events).toContainEqual({ type: 'hopperFilterChanged', shipId: 's', eject: 'banded-ore' });
    w = { ...w, ships: { s: { ...w.ships['s']!, hopperEject: 'ore' } } };
    const r = run(w, 40, { fireFixed: true, tractor: true });
    w = r.w;
    expect(w.ships['s']!.hold).toEqual({ glintstone: 3 });
    expect(oreInLoot(w)).toEqual({ ore: 12 });
    expect(r.events.filter((e) => e.type === 'oreEjected').reduce((n, e) => n + (e.type === 'oreEjected' ? e.amount : 0), 0)).toBe(12);
    // Behind the ship, away from the rock it faces, and marked as its rejects.
    const ship = w.ships['s']!;
    for (const l of w.loot) {
      expect(l.ejectedBy).toBe('s');
      const ahead = (l.position.x - ship.position.x) * Math.cos(ship.heading) + (l.position.y - ship.position.y) * Math.sin(ship.heading);
      expect(ahead).toBeLessThan(0);
    }
  });

  it('with no room, a ship sitting still gathers canisters beside it; moving off leaves them behind', () => {
    let w = setup(testRock({ contents: { ore: 500 } }));
    const stats = shipStats(w, w.ships['s']!);
    w = { ...w, ships: { s: { ...w.ships['s']!, hold: { ore: holdCapacity(stats) } } } };
    w = run(w, 20, { fireFixed: true, tractor: true }).w;
    expect(w.loot.length).toBeGreaterThan(0);
    for (const l of w.loot) expect(Math.hypot(l.position.x - w.ships['s']!.position.x, l.position.y - w.ships['s']!.position.y)).toBeLessThanOrEqual(stats.radius + 45);

    // Fly off with the tractor still on: the bunch stays where it is.
    const pile = w.loot.map((l) => ({ ...l.position }));
    const start = { ...w.ships['s']!.position };
    const away = { x: -Math.cos(w.ships['s']!.heading) * 60, y: -Math.sin(w.ships['s']!.heading) * 60 };
    w = { ...w, ships: { s: { ...w.ships['s']!, velocity: away, flightMode: 'manual' } } };
    w = run(w, 6, { tractor: true }).w;
    expect(Math.hypot(w.ships['s']!.position.x - start.x, w.ships['s']!.position.y - start.y)).toBeGreaterThan(200);
    w.loot.forEach((l, i) => expect(Math.hypot(l.position.x - pile[i]!.x, l.position.y - pile[i]!.y)).toBeLessThan(3));
  });

  it('a cache takes the ore aboard and the loose ore nearby, and lasts an hour', () => {
    let w = setup(testRock({ contents: { ore: 500 } }));
    w = run(w, 10, { fireFixed: true }).w;
    const loose = oreInLoot(w)['ore'] ?? 0;
    w = { ...w, ships: { s: { ...w.ships['s']!, hold: { ore: 20, food: 5 } } } };
    w = stepWorld(w, { s: { ...emptyInput(), dropCache: true } });
    expect(w.ships['s']!.hold).toEqual({ food: 5 });
    expect(w.events).toContainEqual({ type: 'cacheDropped', shipId: 's', units: 20 + loose });
    const cached = w.loot.filter((l) => l.cache);
    expect(cached.reduce((n, l) => n + l.amount, 0)).toBe(20 + loose);
    for (const l of cached) {
      expect(l.cache).toEqual({ ownerId: 's' });
      expect(l.ticksLeft).toBeGreaterThan(CACHE_LIFETIME / FIXED_DT - SECOND);
    }
    expect(CACHE_LIFETIME).toBe(3600);
  });

  it('dropping a cache switches a running tractor off, so it is not scooped straight back up', () => {
    let w = setup(testRock({ contents: { ore: 500 } }));
    w = stepWorld(w, { s: { ...emptyInput(), toggleModule: 'u1' } });
    expect(w.ships['s']!.switchedOn).toEqual(['u1']);
    w = { ...w, ships: { s: { ...w.ships['s']!, hold: { ore: 20 } } } };
    w = stepWorld(w, { s: { ...emptyInput(), dropCache: true } });
    w = run(w, 5).w;
    expect(w.ships['s']!.switchedOn).toEqual([]);
    expect(w.ships['s']!.hold['ore'] ?? 0).toBe(0);
  });

  it('nothing to cache, no cache', () => {
    const w = stepWorld(setup(), { s: { ...emptyInput(), dropCache: true } });
    expect(w.events.some((e) => e.type === 'cacheDropped')).toBe(false);
  });
});

describe('survey scanners', () => {
  const press = (_w: World): ShipInput => ({ ...emptyInput(), toggleModule: 'u2' });

  it('pulse from their tile: rocks in reach are reported, paid from the capacitor, then cycle', () => {
    let w = setup(testRock());
    const before = w.ships['s']!.capacitor;
    w = stepWorld(w, { s: press(w) });
    const ship = w.ships['s']!;
    expect(ship.capacitor).toBeLessThan(before);
    // A Dowser S tells rich rock from plain, not what is in it.
    expect(ship.survey!.rocks).toEqual([{ id: 'r1', reading: 'rich' }]);
    expect(w.events).toContainEqual({ type: 'surveyed', shipId: 's', found: 1 });

    w = stepWorld(w, { s: press(w) });
    expect(w.events).toContainEqual({ type: 'surveyRefused', shipId: 's', reason: 'cycling' });
    w = run(w, SURVEY_CYCLE_SECONDS).w;
    w = stepWorld(w, { s: press(w) });
    expect(w.events.some((e) => e.type === 'surveyed')).toBe(true);
  });

  it('a better scanner names the best ore', () => {
    let w = setup(testRock());
    // Stats only: outfitting would refuse an M scanner on an S mount.
    w = { ...w, ships: { s: { ...w.ships['s']!, fit: { ...w.ships['s']!.fit, u2: 'tessaract-survey-m' } } } };
    w = stepWorld(w, { s: press(w) });
    expect(w.ships['s']!.survey!.rocks).toEqual([{ id: 'r1', reading: 'valuable' }]);
  });

  it('plain rock reads as common', () => {
    let w = setup(testRock({ contents: { ore: 30 } }));
    w = stepWorld(w, { s: press(w) });
    expect(w.ships['s']!.survey!.rocks).toEqual([{ id: 'r1', reading: 'common' }]);
    expect(w.events).toContainEqual({ type: 'surveyed', shipId: 's', found: 0 });
  });
});

describe('the belt tops itself up', () => {
  function thinned(): World {
    const w = { ...createStarterWorld(), npcs: {}, spawners: [] };
    // Take ten rocks out of the ring.
    const gone = new Set(w.asteroids.filter((a) => a.field === 'ring').slice(0, 10).map((a) => a.id));
    return { ...w, asteroids: w.asteroids.filter((a) => !gone.has(a.id)), rockfall: { made: 0, timerTicks: 1 } };
  }

  it('one new rock per field below its count per check, away from ships, with fresh ids', () => {
    const w = thinned();
    const ships: Ship[] = Object.values(w.ships);
    const r = stepRockfall(w);
    expect(r.asteroids.length).toBe(w.asteroids.length + 1);
    const added = r.asteroids[r.asteroids.length - 1]!;
    expect(added.field).toBe('ring');
    expect(added.id).toBe('rock-n1');
    expect(oreLeft(added)).toBeGreaterThan(0);
    expect(added.orbit.frozen).toBe(true); // orbits are stopped by default
    const at = rockAt({ ...w, asteroids: r.asteroids }, added.id)!.position;
    for (const s of ships.filter((s) => s.state === 'flying')) expect(Math.hypot(s.position.x - at.x, s.position.y - at.y)).toBeGreaterThan(1500);
    expect(r.rockfall!.timerTicks).toBe(Math.round(ROCKFALL_SECONDS / w.dt));
  });

  it('the same way every time', () => {
    expect(stepRockfall(thinned())).toEqual(stepRockfall(thinned()));
  });

  it('waits between checks and stops at the count', () => {
    const full = { ...createStarterWorld(), rockfall: { made: 0, timerTicks: 1 } };
    expect(stepRockfall(full).asteroids).toBe(full.asteroids);
    const waiting = { ...thinned(), rockfall: { made: 0, timerTicks: 5 } };
    expect(stepRockfall(waiting).asteroids).toBe(waiting.asteroids);
  });
});

describe('the prospector', () => {
  it('is sold at Ridge and Harbour, fits within its power, and has tiles for its laser, tractor and scanner', () => {
    const w = createStarterWorld();
    expect(w.stations['station-ridge']!.shipMart).toContain('rookrivet-prospector');
    expect(w.stations['station-harbour']!.shipMart).toContain('rookrivet-prospector');
    const ship = setup().ships['s']!;
    const stats = shipStats(w, ship);
    expect(stats.powerDraw).toBeLessThanOrEqual(stats.powerOutput);
    expect(stats.readouts).toContain('composition');
    expect(activationSlots(w, ship)).toEqual([
      { kind: 'group', group: 3 },
      { kind: 'module', mountId: 'u1', moduleId: 'meridian-gleaner-s', moduleKind: 'tractor' },
      { kind: 'module', mountId: 'u2', moduleId: 'rookrivet-survey-s', moduleKind: 'surveyScanner' },
      { kind: 'module', mountId: 'i2', moduleId: 'rookrivet-hopper-s', moduleKind: 'oreHopper' },
    ]);
  });

  it('Lantern Works pays best for every ore', () => {
    const w = createStarterWorld();
    for (const good of oreGoods(GOODS)) {
      const bids = Object.values(w.stations).map((s) => s.market[good.id]?.bid ?? 0);
      expect(w.stations['station-lantern']!.market[good.id]!.bid, good.id).toBe(Math.max(...bids));
    }
  });
});

describe('saves', () => {
  it('a version 6 world gains ore in its rocks, the same on every load', () => {
    const w = createStarterWorld();
    const old = { ...w, asteroids: w.asteroids.map(({ contents: _c, hardness: _h, field: _f, ...a }) => a) };
    const text = JSON.stringify({ format: SAVE_FORMAT, version: 6, savedAt: '', world: old });
    const a = deserializeWorld(text);
    const b = deserializeWorld(text);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.world.asteroids).toEqual(b.world.asteroids);
    for (const r of a.world.asteroids) expect(oreLeft(r)).toBeGreaterThan(0);
    expect(a.world.asteroids.filter((r) => r.field === 'ridge').length).toBe(ROCK_FIELDS[1]!.target);
  });

  it('mined rocks, survey results and rockfall survive a save', () => {
    const { w } = run(setup(testRock({ contents: { ore: 500 } })), 2, { fireFixed: true });
    const back = deserializeWorld(serializeWorld(w, ''));
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(back.world.asteroids).toEqual(w.asteroids);
    expect(back.world.rockfall).toEqual(w.rockfall);
  });
});

describe('the hulk', () => {
  /** A hulk parked between two rocks, one off each beam: rock a to port, rock b to starboard. */
  function hulkBetween(): World {
    const base: World = { ...createStarterWorld(), ships: {}, npcs: {}, spawners: [], asteroids: [], rockfall: { made: 0, timerTicks: 1e9 } };
    const a = testRock({ id: 'a', radius: 60, hardness: 0.8, contents: { ore: 400 }, orbit: { ...testRock().orbit, phase: PHASE - 0.03 } });
    const b = testRock({ id: 'b', radius: 60, hardness: 0.8, contents: { ore: 300, 'black-ore': 100 }, orbit: { ...testRock().orbit, phase: PHASE + 0.03 } });
    const w0 = { ...base, asteroids: [a, b] };
    const pa = rockAt(w0, 'a')!.position;
    const pb = rockAt(w0, 'b')!.position;
    const mid = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
    // Nose along the ring, out of the way of both: the rocks sit off the beams.
    const across = Math.atan2(pb.y - pa.y, pb.x - pa.x);
    const ship = buildShip(w0, { id: 's', loadout: LOADOUTS['rookrivet-hulk']!, ownerId: null, position: mid, heading: across + Math.PI / 2, flightMode: 'assisted' });
    return { ...w0, ships: { s: ship } };
  }
  const lockAndAssign = (w: World, rockId: string, mountId: string): World => {
    w = stepWorld(w, { s: { ...emptyInput(), lock: rockId } });
    w = run(w, 2).w;
    w = stepWorld(w, { s: { ...emptyInput(), activateLock: rockId } });
    return stepWorld(w, { s: { ...emptyInput(), toggleModule: mountId } });
  };

  it('fits within its power, holds 1,100 ore and nothing else, locks eight rocks, and is sold at Ridge', () => {
    const w = createStarterWorld();
    const ship = hulkBetween().ships['s']!;
    const stats = shipStats(w, ship);
    expect(stats.powerDraw).toBeLessThanOrEqual(stats.powerOutput);
    expect(stats.oreCapacity).toBe(1100);
    expect(holdSpaceFor(ship, stats, GOODS, 'food')).toBe(0);
    expect(stats.maxLocks).toBe(8);
    expect(w.stations['station-ridge']!.shipMart).toContain('rookrivet-hulk');
    expect(activationSlots(w, ship).slice(0, 2)).toEqual([
      { kind: 'module', mountId: 'm1', moduleId: 'rookrivet-excavator-l', moduleKind: 'weapon' },
      { kind: 'module', mountId: 'm2', moduleId: 'rookrivet-excavator-l', moduleKind: 'weapon' },
    ]);
  });

  it('each turret cuts the rock it was assigned, on its own, with no trigger held', () => {
    let w = hulkBetween();
    // Which turret faces which rock: m1 is to port.
    const ship = w.ships['s']!;
    const pa = rockAt(w, 'a')!.position;
    const port = Math.sin(Math.atan2(pa.y - ship.position.y, pa.x - ship.position.x) - ship.heading) < 0;
    w = lockAndAssign(w, 'a', port ? 'm1' : 'm2');
    expect(w.events).toContainEqual({ type: 'laserAssigned', shipId: 's', mountId: port ? 'm1' : 'm2', rockId: 'a' });
    w = lockAndAssign(w, 'b', port ? 'm2' : 'm1');
    const r = run(w, 10, { tractor: true });
    const left = (id: string): number => oreLeft(r.w.asteroids.find((x) => x.id === id)!);
    expect(left('a')).toBeLessThan(400);
    expect(left('b')).toBeLessThan(400);
    expect(r.w.ships['s']!.beams).toHaveLength(2);
    expect(oreLeft({ contents: r.w.ships['s']!.hold })).toBeGreaterThan(0);
  });

  it("a turret's tile pressed again lets its rock go; a turret with no rock does nothing", () => {
    let w = hulkBetween();
    const ship = w.ships['s']!;
    const pa = rockAt(w, 'a')!.position;
    const mountId = Math.sin(Math.atan2(pa.y - ship.position.y, pa.x - ship.position.x) - ship.heading) < 0 ? 'm1' : 'm2';
    w = lockAndAssign(w, 'a', mountId);
    w = stepWorld(w, { s: { ...emptyInput(), toggleModule: mountId } });
    expect(w.events).toContainEqual({ type: 'laserAssigned', shipId: 's', mountId, rockId: null });
    const { w: after } = run(w, 5);
    expect(after.ships['s']!.beams).toBeUndefined();
    expect(oreLeft(after.asteroids.find((x) => x.id === 'a')!)).toBe(400);
  });

  it('turrets never engage ships', () => {
    let w = hulkBetween();
    w = { ...w, ships: { ...w.ships, s: { ...w.ships['s']!, weaponsHot: true, weapons: w.ships['s']!.weapons.map((x) => ({ ...x, lockTarget: null })) } } };
    const { w: after } = run(w, 3, { fireFixed: true });
    expect(after.ships['s']!.beams).toBeUndefined();
  });
});

