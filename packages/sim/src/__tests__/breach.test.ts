import { describe, expect, it } from 'vitest';
import { CORE_MIN_RADIUS, oreLeft, rockAt, rockCore, screeAsteroids } from '../asteroids.js';
import { seededRandom } from '../random.js';
import { BELT_ID, BELT_PERIOD, BELT_RING_RADIUS } from '../bodies.js';
import { BLAST_RADIUS, BLOOM_RANGE, CORE_LIFETIME, PLANT_REACH, SAFE_DISTANCE } from '../breach.js';
import { FIXED_DT } from '../constants.js';
import { buildShip } from '../factory.js';
import { LOADOUTS } from '../loadouts.js';
import { lockReadout } from '../locks.js';
import { deserializeWorld, migrate7to8, migrate8to9, serializeWorld } from '../save.js';
import { shipStats } from '../stats.js';
import { stepWorld } from '../step.js';
import { activationSlots } from '../systems.js';
import type { Asteroid, ShipInput, World, WorldEvent } from '../types.js';
import type { Vec2 } from '../vec2.js';
import { createStarterWorld, emptyInput, joinPilot } from '../world.js';

/** Breaching for gate-glass (docs/mining.md, "Breaching"). */

const SECOND = Math.round(1 / FIXED_DT);
const PHASE = 3.5;

function bigRock(over: Partial<Asteroid> = {}): Asteroid {
  return {
    id: 'big',
    orbit: { parent: BELT_ID, radius: BELT_RING_RADIUS, period: BELT_PERIOD, phase: PHASE, direction: 1, frozen: true },
    radius: 64,
    contents: { ore: 300, 'banded-ore': 60 },
    hardness: 0.7,
    field: 'ring',
    core: { glass: 40, points: [0, Math.PI] },
    ...over,
  };
}

/** A breacher `gap` units off the big rock's surface at `bearing`, with charges aboard, the rock locked and active. */
function setup(bearing = 0, gap = 30, extra: Asteroid[] = [], loadout = 'rookrivet-breacher'): World {
  const base: World = { ...createStarterWorld(), ships: {}, npcs: {}, spawners: [], asteroids: [bigRock(), ...extra], rockfall: { made: 0, timerTicks: 1e9 } };
  const at = rockAt(base, 'big')!.position;
  const r = 64 + 26 + gap;
  const ship = buildShip(base, { id: 's', loadout: LOADOUTS[loadout]!, ownerId: null, position: { x: at.x + Math.cos(bearing) * r, y: at.y + Math.sin(bearing) * r }, heading: bearing + Math.PI, flightMode: 'assisted', hold: { 'breach-charge': 4 } });
  let w: World = { ...base, ships: { s: ship } };
  w = stepWorld(w, { s: { ...emptyInput(), lock: 'big' } });
  for (let i = 0; i < 4 * SECOND; i++) w = stepWorld(w, { s: emptyInput() });
  return w;
}

const press = (w: World): World => stepWorld(w, { s: { ...emptyInput(), toggleModule: 'u2' } });

/** Move the ship to `gap` off the rock's surface at `bearing`, at rest. */
function moveTo(w: World, bearing: number, gap: number): World {
  const at = rockAt(w, 'big')!.position;
  const r = 64 + 26 + gap;
  const position: Vec2 = { x: at.x + Math.cos(bearing) * r, y: at.y + Math.sin(bearing) * r };
  return { ...w, ships: { ...w.ships, s: { ...w.ships['s']!, position, velocity: { x: 0, y: 0 }, heading: bearing + Math.PI } } };
}

function run(w: World, seconds: number, input: Partial<ShipInput> = {}): { w: World; events: WorldEvent[] } {
  const events: WorldEvent[] = [];
  for (let i = 0; i < Math.round(seconds * SECOND); i++) {
    w = stepWorld(w, { s: { ...emptyInput(), ...input } });
    events.push(...w.events);
  }
  return { w, events };
}

describe('gate-glass cores', () => {
  it('hide only in big rocks, in some of them', () => {
    const rocks = screeAsteroids();
    const cored = rocks.filter((r) => r.core);
    expect(cored.length).toBeGreaterThan(0);
    expect(cored.length).toBeLessThan(rocks.filter((r) => r.radius >= CORE_MIN_RADIUS).length);
    for (const r of cored) {
      expect(r.radius).toBeGreaterThanOrEqual(CORE_MIN_RADIUS);
      expect(r.core!.points.length).toBeGreaterThanOrEqual(2);
      expect(r.contents['gate-glass']).toBeUndefined(); // never loose in the rock
    }
  });

  it('grow with the rock: small cores and fewer points in smaller rocks, and some fractured', () => {
    const draw = (radius: number) => {
      const out = [];
      for (let seed = 1; out.length < 200; seed++) {
        const core = rockCore(seededRandom(seed), radius);
        if (core) out.push(core);
      }
      return out;
    };
    const small = draw(CORE_MIN_RADIUS);
    const big = draw(80);
    for (const c of small) {
      expect(c.glass).toBeGreaterThanOrEqual(8);
      expect(c.glass).toBeLessThanOrEqual(20);
      expect([2, 3]).toContain(c.points.length);
    }
    for (const c of big) {
      expect(c.glass).toBeGreaterThanOrEqual(20);
      expect(c.glass).toBeLessThanOrEqual(40);
      expect([3, 4]).toContain(c.points.length);
    }
    const fractured = [...small, ...big].filter((c) => c.fractured).length / 400;
    expect(fractured).toBeGreaterThan(0.15);
    expect(fractured).toBeLessThan(0.35);
  });

  it('only a deep assay reads a core and its breach points', () => {
    const w = setup();
    expect(lockReadout(w, w.ships['s']!, 'big')!.composition!.core).toEqual({ points: [0, Math.PI], glass: 40 });
    const plain = setup(0, 30, [], 'rookrivet-prospector');
    expect(lockReadout(plain, plain.ships['s']!, 'big')!.composition!.core).toBeUndefined();
  });
});

describe('breach charges', () => {
  it('plant on the active lock where the ship is, one charge from the hold each', () => {
    let w = press(setup(0));
    expect(w.events).toContainEqual({ type: 'chargePlaced', shipId: 's', rockId: 'big', placed: 1 });
    expect(w.ships['s']!.hold['breach-charge']).toBe(3);
    expect(w.charges).toHaveLength(1);
    expect(Math.abs(w.charges![0]!.bearing)).toBeLessThan(0.05);
  });

  it('refuse without charges, too far off, or on a small rock', () => {
    let w = setup(0);
    w = { ...w, ships: { s: { ...w.ships['s']!, hold: {} } } };
    expect(press(w).events).toContainEqual({ type: 'chargeRefused', shipId: 's', reason: 'noCharges' });
    expect(press(moveTo(setup(0), 0, PLANT_REACH + 40)).events).toContainEqual({ type: 'chargeRefused', shipId: 's', reason: 'tooFar' });
  });

  it('will not go off with the ship too close', () => {
    const w = moveTo(press(setup(0)), 0, PLANT_REACH + 40);
    expect(press(w).events).toContainEqual({ type: 'chargeRefused', shipId: 's', reason: 'tooClose' });
  });

  it('on every breach point: the rock splits and all the glass is exposed, brittle and on a clock', () => {
    let w = press(setup(0));
    w = press(moveTo(w, Math.PI, 30));
    w = press(moveTo(w, Math.PI, SAFE_DISTANCE + BLAST_RADIUS));
    const breached = w.events.find((e) => e.type === 'breached');
    expect(breached).toMatchObject({ type: 'breached', shipId: 's', rockId: 'big', chunks: 3, glass: 40, quality: 1 });
    expect(w.asteroids.find((a) => a.id === 'big')).toBeUndefined();
    const glass = w.asteroids.find((a) => a.fragile)!;
    expect(glass.contents).toEqual({ 'gate-glass': 40 });
    expect(glass.expiresTick).toBe(w.tick + Math.round(CORE_LIFETIME / FIXED_DT) - 0);
    // The ore is shared among the chunks, which are softer for the cracking.
    const chunks = w.asteroids.filter((a) => a.id.startsWith('big.') && !a.fragile);
    expect(chunks.reduce((n, a) => n + oreLeft(a), 0)).toBe(360);
    for (const c of chunks) expect(c.hardness).toBeCloseTo(0.5);
    expect(w.charges).toEqual([]);
  });

  it('a fractured core gives half, however clean the breach', () => {
    let w = setup(0);
    w = { ...w, asteroids: w.asteroids.map((a) => (a.id === 'big' ? { ...a, core: { ...a.core!, fractured: true as const } } : a)) };
    expect(lockReadout(w, w.ships['s']!, 'big')!.composition!.core).toMatchObject({ fractured: true });
    w = press(w);
    w = press(moveTo(w, Math.PI, 30));
    w = press(moveTo(w, Math.PI, SAFE_DISTANCE + BLAST_RADIUS));
    expect(w.events.find((e) => e.type === 'breached')).toMatchObject({ glass: 20, quality: 1 });
  });

  it('off the breach points: only a quarter of the glass survives', () => {
    let w = press(setup(Math.PI / 2));
    w = press(moveTo(w, Math.PI / 2, SAFE_DISTANCE + BLAST_RADIUS));
    expect(w.events.find((e) => e.type === 'breached')).toMatchObject({ glass: 10, quality: 0 });
  });

  it('the blast hurts ships close by, shatters small rocks and knocks ore off bigger ones', () => {
    const { core: _core, ...plainRock } = bigRock();
    const near: Asteroid = { ...plainRock, id: 'pebble', radius: 20, contents: { ore: 22 }, hardness: 0.2, orbit: { ...bigRock().orbit, phase: PHASE + 0.008 } };
    let w = press(setup(0, 30, [near]));
    // A bystander inside the blast.
    const at = rockAt(w, 'big')!.position;
    const bystander = buildShip(w, { id: 'b', loadout: LOADOUTS['meridian-starter']!, ownerId: null, position: { x: at.x, y: at.y - 64 - 60 }, heading: 0, flightMode: 'assisted' });
    w = { ...w, ships: { ...w.ships, b: bystander } };
    w = press(moveTo(w, 0, SAFE_DISTANCE + 20));
    expect(w.events.some((e) => e.type === 'damaged' && e.shipId === 'b' && e.cause === 'blast')).toBe(true);
    expect(w.events.some((e) => e.type === 'damaged' && e.shipId === 's' && e.cause === 'blast')).toBe(true);
    expect(w.asteroids.find((a) => a.id === 'pebble')).toBeUndefined();
    expect(w.loot.reduce((n, l) => n + (l.item === 'ore' ? l.amount : 0), 0)).toBeGreaterThanOrEqual(22);
  });

  it('the signature bloom brings pirates from far off to hunt whoever is there', () => {
    let w = press(setup(0));
    // Someone aboard, or there is nobody to hunt.
    const ana = joinPilot(w, 'ana', 'Ana').pilots['ana']!;
    w = { ...w, pilots: { ana: { ...ana, shipId: 's' } } };
    const at = rockAt(w, 'big')!.position;
    const pirate = buildShip(w, { id: 'p', loadout: LOADOUTS['kessari-raider']!, ownerId: null, position: { x: at.x + BLOOM_RANGE - 500, y: at.y }, heading: 0, flightMode: 'rotation' });
    w = { ...w, ships: { ...w.ships, p: pirate }, npcs: { p: { kind: 'pirate', home: pirate.position, mode: 'prowl', targetId: null, modeTicks: 0, cooldownTicks: 0, patrolIndex: 0, provokedBy: null } } };
    w = press(moveTo(w, 0, SAFE_DISTANCE + BLAST_RADIUS));
    expect(w.npcs['p']).toMatchObject({ mode: 'prowl', drawnTo: { x: expect.any(Number) } });
    let hunted = false;
    for (let i = 0; i < 90 * SECOND && !hunted; i++) {
      w = stepWorld(w, { s: emptyInput() });
      hunted = w.npcs['p']?.kind === 'pirate' && w.npcs['p'].mode === 'hunt' && w.npcs['p'].targetId === 's';
    }
    expect(hunted).toBe(true);
  });
});

describe('exposed gate-glass', () => {
  function exposed(): World {
    let w = press(setup(0));
    w = press(moveTo(w, Math.PI, 30));
    return press(moveTo(w, Math.PI, SAFE_DISTANCE + BLAST_RADIUS));
  }

  it('drones and light lasers free it; a heavy turret shatters it', () => {
    // A prospector's light laser on the glass: canisters of gate-glass.
    let w = exposed();
    const glass = w.asteroids.find((a) => a.fragile)!;
    const at = rockAt(w, glass.id)!.position;
    const p = buildShip(w, { id: 's', loadout: LOADOUTS['rookrivet-prospector']!, ownerId: null, position: { x: at.x + 70, y: at.y }, heading: Math.PI, flightMode: 'assisted' });
    // Clear the chunks so only the glass is in the beam.
    w = { ...w, ships: { s: p }, asteroids: [glass] };
    const light = run(w, 10, { fireFixed: true });
    expect(light.w.loot.some((l) => l.item === 'gate-glass')).toBe(true);
    expect(light.events.some((e) => e.type === 'glassShattered')).toBe(false);

    // A hulk's turret on it: shattered.
    const h = buildShip(w, { id: 's', loadout: LOADOUTS['rookrivet-hulk']!, ownerId: null, position: { x: at.x + 200, y: at.y }, heading: Math.PI, flightMode: 'assisted' });
    let v: World = { ...w, ships: { s: h } };
    v = stepWorld(v, { s: { ...emptyInput(), lock: glass.id } });
    v = run(v, 4).w;
    v = stepWorld(v, { s: { ...emptyInput(), activateLock: glass.id } });
    v = stepWorld(v, { s: { ...emptyInput(), toggleModule: 'm1' } });
    const heavy = run(v, 10);
    expect(heavy.events.some((e) => e.type === 'glassShattered')).toBe(true);
    expect(heavy.w.loot.some((l) => l.item === 'gate-glass')).toBe(false);
  });

  it('the chunks drift apart, and the breacher\'s drones can reach the glass', () => {
    let w = exposed();
    const glass = w.asteroids.find((a) => a.fragile)!;
    w = run(w, 20).w;
    const at = rockAt(w, glass.id)!.position;
    for (const c of w.asteroids.filter((a) => a.id.startsWith('big.') && !a.fragile)) {
      expect(Math.hypot(rockAt(w, c.id)!.position.x - at.x, rockAt(w, c.id)!.position.y - at.y) - c.radius - glass.radius).toBeGreaterThan(100);
      // At rest again.
      expect(Math.hypot(rockAt(w, c.id)!.velocity.x, rockAt(w, c.id)!.velocity.y)).toBeLessThan(0.01);
    }
    // Lock the glass, send the drones, tractor on.
    w = stepWorld(w, { s: { ...emptyInput(), lock: glass.id } });
    w = run(w, 4).w;
    w = stepWorld(w, { s: { ...emptyInput(), activateLock: glass.id, droneCommand: { action: 'launch' } } });
    const r = run(w, 60, { tractor: true });
    expect(r.events.some((e) => e.type === 'oreFreed' && e.item === 'gate-glass')).toBe(true);
    expect(r.events.some((e) => e.type === 'glassShattered')).toBe(false);
  });

  it('collapses when its time is up', () => {
    let w = exposed();
    const id = w.asteroids.find((a) => a.fragile)!.id;
    w = { ...w, ships: {} };
    w = { ...w, asteroids: w.asteroids.map((a) => (a.id === id ? { ...a, expiresTick: w.tick + 2 } : a)) };
    const r = run(w, 0.1);
    expect(r.w.asteroids.find((a) => a.id === id)).toBeUndefined();
    expect(r.events).toContainEqual({ type: 'coreCollapsed', rockId: id, shipId: '', amount: 40 });
  });
});

describe('the breacher', () => {
  it('fits within its power, reads cores, carries a charge rig with a tile, three drones, and is sold at Ridge', () => {
    const w = createStarterWorld();
    const ship = setup().ships['s']!;
    const stats = shipStats(w, ship);
    expect(stats.powerDraw).toBeLessThanOrEqual(stats.powerOutput);
    expect(stats.readouts).toContain('core');
    expect(stats.breachTolerance).toBeCloseTo(0.21);
    expect(ship.droneBay).toHaveLength(3);
    expect(activationSlots(w, ship).some((s) => s.kind === 'module' && s.moduleKind === 'breachCharger')).toBe(true);
    expect(w.stations['station-ridge']!.shipMart).toContain('rookrivet-breacher');
  });
});

describe('saves', () => {
  it('keep planted charges and exposed glass', () => {
    let w = press(setup(0));
    w = press(moveTo(w, Math.PI, 30));
    const loaded = deserializeWorld(serializeWorld(w, 'now'));
    expect(loaded.ok && loaded.world.charges).toEqual(w.charges);
    expect(loaded.ok && loaded.world.asteroids.find((a) => a.id === 'big')!.core).toEqual(bigRock().core);
  });

  it('give an older belt its cores, the same on every load', () => {
    const old = { asteroids: screeAsteroids().map(({ core: _c, ...a }) => a) };
    const once = migrate7to8(old) as World;
    expect(once.asteroids.filter((a) => a.core).length).toBeGreaterThan(0);
    expect(migrate7to8(old)).toEqual(once);
    expect(once.charges).toEqual([]);
  });

  it('retune an older belt\'s cores, leaving exposed glass and charged rocks alone', () => {
    const old = { asteroids: [{ ...bigRock(), id: 'a', radius: 80 }, { ...bigRock(), id: 'b' }, { ...bigRock(), id: 'g', fragile: true }], charges: [{ id: 'c', shipId: 's', rockId: 'b', bearing: 0 }] };
    const after = migrate8to9(old) as World;
    expect(after.asteroids.find((a) => a.id === 'b')!.core).toEqual(bigRock().core);
    expect(after.asteroids.find((a) => a.id === 'g')!.core).toEqual(bigRock().core);
    expect(migrate8to9(old)).toEqual(after);
  });
});
