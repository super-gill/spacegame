import { describe, expect, it } from 'vitest';
import { asteroidPositions, oreLeft, rockAt } from '../asteroids.js';
import { slotPlace, thinkDrone } from '../ai/drone.js';
import { findPath } from '../ai/path.js';
import { BELT_ID, BELT_PERIOD, BELT_RING_RADIUS } from '../bodies.js';
import { FIXED_DT } from '../constants.js';
import { freePadFor, onPad } from '../docking.js';
import { droneIdleReason, dronesOut, droneStrength, stepDrones } from '../drones.js';
import { buildShip } from '../factory.js';
import { LOADOUTS } from '../loadouts.js';
import { ownedShips } from '../ownership.js';
import { deserializeWorld, serializeWorld } from '../save.js';
import { shipStats } from '../stats.js';
import { stepWorld } from '../step.js';
import { buyGood, maxBuyable, sellGood } from '../trade.js';
import type { Asteroid, DroneBrain, DroneCommand, ShipInput, World, WorldEvent } from '../types.js';
import { createStarterWorld, emptyInput, joinPilot, pilotShip } from '../world.js';

/** Drones (docs/drones.md): mining drones that fly themselves and work their mother's locked rocks. */

const SECOND = Math.round(1 / FIXED_DT);
const PHASE = 3.5;

function rock(id: string, offset: number, over: Partial<Asteroid> = {}): Asteroid {
  return {
    id,
    orbit: { parent: BELT_ID, radius: BELT_RING_RADIUS, period: BELT_PERIOD, phase: PHASE + offset, direction: 1, frozen: true },
    radius: 30,
    contents: { ore: 400 },
    hardness: 0.3,
    field: 'ring',
    ...over,
  };
}

/** A hulk with its four drones stowed, parked between two soft rocks. */
function hulkWorld(rocks: Asteroid[] = [rock('a', -0.015), rock('b', 0.015)]): World {
  const base: World = { ...createStarterWorld(), ships: {}, npcs: {}, spawners: [], asteroids: rocks, rockfall: { made: 0, timerTicks: 1e9 } };
  const at = rockAt(base, 'a')!.position;
  const bt = rockAt(base, 'b')!.position;
  const mid = { x: (at.x + bt.x) / 2, y: (at.y + bt.y) / 2 };
  const ship = buildShip(base, { id: 'h', loadout: LOADOUTS['rookrivet-hulk']!, ownerId: null, position: mid, heading: 0, flightMode: 'assisted' });
  return { ...base, ships: { h: ship } };
}

function run(w: World, seconds: number, input: Partial<ShipInput> = {}): { w: World; events: WorldEvent[] } {
  const events: WorldEvent[] = [];
  for (let i = 0; i < Math.round(seconds * SECOND); i++) {
    w = stepWorld(w, { h: { ...emptyInput(), ...input } });
    events.push(...w.events);
  }
  return { w, events };
}

const command = (w: World, c: DroneCommand): World => stepWorld(w, { h: { ...emptyInput(), droneCommand: c } });

/** Lock both rocks (and wait for the locks). */
function lockRocks(w: World): World {
  w = stepWorld(w, { h: { ...emptyInput(), lock: 'a' } });
  w = stepWorld(w, { h: { ...emptyInput(), lock: 'b' } });
  return run(w, 4).w;
}

describe('drone bays', () => {
  it('a hulk comes with four drones and controls four; a prospector one', () => {
    const w = hulkWorld();
    const hulk = w.ships['h']!;
    expect(hulk.droneBay?.map((d) => d.id)).toEqual(['d1', 'd2', 'd3', 'd4']);
    const stats = shipStats(w, hulk);
    expect(stats.droneCapacity).toBe(6);
    expect(stats.droneControl).toBe(4);
    const p = buildShip(w, { id: 'p', loadout: LOADOUTS['rookrivet-prospector']!, ownerId: null, position: { x: 0, y: 0 }, heading: 0, flightMode: 'assisted' });
    expect(p.droneBay).toHaveLength(1);
    expect(shipStats(w, p).powerDraw).toBeLessThanOrEqual(shipStats(w, p).powerOutput);
  });

  it('launch puts drones out as ships with brains, up to the control limit', () => {
    const w = command(hulkWorld(), { action: 'launch' });
    const out = dronesOut(w, 'h');
    expect(out.map((d) => d.id)).toEqual(['h/d1', 'h/d2', 'h/d3', 'h/d4']);
    expect(w.ships['h']!.droneBay).toEqual([]);
    for (const d of out) {
      expect(d.motherId).toBe('h');
      expect(w.npcs[d.id]).toMatchObject({ kind: 'drone', motherId: 'h', mode: 'work' });
    }
    expect(w.events).toContainEqual({ type: 'dronesLaunched', shipId: 'h', droneIds: ['d1', 'd2', 'd3', 'd4'] });
    // Nothing left to launch.
    const again = command(w, { action: 'launch' });
    expect(again.events).toContainEqual({ type: 'droneRefused', shipId: 'h', reason: 'noneStowed' });
  });

  it('with nothing locked, drones wait beside their mother and cut nothing', () => {
    let { w } = run(command(hulkWorld(), { action: 'launch' }), 10);
    expect(w.loot).toHaveLength(0);
    for (const d of dronesOut(w, 'h')) {
      expect(Math.hypot(d.position.x - w.ships['h']!.position.x, d.position.y - w.ships['h']!.position.y)).toBeLessThan(140);
      expect(d.beams).toBeUndefined();
    }
    expect(oreLeft(w.asteroids[0]!)).toBe(400);
    w = run(w, 1).w;
  });

  it('drones fly to the locked rocks, share them out, and cut; the tractor brings the ore in', () => {
    let w = lockRocks(hulkWorld());
    w = command(w, { action: 'launch' });
    // The hulk's turrets are left idle: only the drones work.
    const r = run(w, 30, { tractor: true });
    w = r.w;
    const working = dronesOut(w, 'h').map((d) => (w.npcs[d.id] as { rockId: string | null }).rockId);
    expect(working.filter((x) => x === 'a')).toHaveLength(2);
    expect(working.filter((x) => x === 'b')).toHaveLength(2);
    expect(oreLeft(w.asteroids.find((x) => x.id === 'a')!)).toBeLessThan(400);
    expect(oreLeft(w.asteroids.find((x) => x.id === 'b')!)).toBeLessThan(400);
    expect(w.ships['h']!.hold['ore'] ?? 0).toBeGreaterThan(0);
  });

  it('a drone short of its spot, nose on the rock, cuts from there', () => {
    // With no reverse thrust it cannot back off to its spot; it used to wait for ever.
    let w = lockRocks(hulkWorld());
    w = command(w, { action: 'launch', droneId: 'd1' });
    w = run(w, 2).w;
    const drone = w.ships['h/d1']!;
    const brain = w.npcs['h/d1'] as DroneBrain;
    const rock = rockAt(w, brain.rockId!)!;
    // 15 units off the face (its spot is 40 off), pointing at the rock, at rest.
    const bearing = Math.atan2(brain.goal!.y - rock.position.y, brain.goal!.x - rock.position.x);
    const position = { x: rock.position.x + Math.cos(bearing) * (30 + 15 + 6), y: rock.position.y + Math.sin(bearing) * (30 + 15 + 6) };
    const placed = { ...drone, position, velocity: rock.velocity, heading: bearing + Math.PI };
    w = { ...w, ships: { ...w.ships, [placed.id]: placed } };
    expect(thinkDrone(w, placed, shipStats(w, placed), brain).input.fireFixed).toBe(true);
  });

  it('a dozen drones on one small rock each get a spot of their own, all in laser range', () => {
    // Spots used to repeat from the seventh drone, so a hulk full of drone bays piled them up.
    for (const rockRadius of [12, 30, 64]) {
      const spots = Array.from({ length: 24 }, (_, i) => {
        const p = slotPlace(i, rockRadius, 6, 90);
        return { x: Math.cos(p.offset) * p.reach, y: Math.sin(p.offset) * p.reach, gap: p.reach - rockRadius };
      });
      for (const s of spots) expect(s.gap).toBeLessThanOrEqual(90 * 0.9);
      for (let i = 0; i < 12; i++) for (let j = 0; j < i; j++) expect(Math.hypot(spots[i]!.x - spots[j]!.x, spots[i]!.y - spots[j]!.y)).toBeGreaterThanOrEqual(12);
    }
  });

  it('say why they wait: nothing locked, or every locked rock too hard for them', () => {
    // Jason's drones sat idle beside a hulk with big rocks locked: their lasers cut up to 0.5.
    const hard = hulkWorld([rock('a', -0.015, { hardness: 0.8 }), rock('b', 0.015, { hardness: 0.3 })]);
    expect(droneStrength(hard, hard.ships['h']!)).toBe(0.5);
    expect(droneIdleReason(hard, hard.ships['h']!)).toBe('noLock');
    let w = stepWorld(hard, { h: { ...emptyInput(), lock: 'a' } });
    w = run(w, 4).w;
    expect(droneIdleReason(w, w.ships['h']!)).toBe('tooHard');
    w = stepWorld(w, { h: { ...emptyInput(), lock: 'b' } });
    w = run(w, 4).w;
    expect(droneIdleReason(w, w.ships['h']!)).toBeNull();
  });

  it("drones skip a rock a turret is on while there is a free one", () => {
    let w = lockRocks(hulkWorld());
    w = stepWorld(w, { h: { ...emptyInput(), activateLock: 'a' } });
    w = stepWorld(w, { h: { ...emptyInput(), toggleModule: 'm1' } });
    w = command(w, { action: 'launch', droneId: 'd1' });
    w = run(w, 2).w;
    expect(w.npcs['h/d1']).toMatchObject({ rockId: 'b' });
  });

  it('send puts a drone on the active lock', () => {
    let w = lockRocks(hulkWorld());
    w = command(w, { action: 'launch', droneId: 'd1' });
    w = stepWorld(w, { h: { ...emptyInput(), activateLock: 'a' } });
    w = command(w, { action: 'send', droneId: 'd1' });
    w = run(w, 2).w;
    expect(w.npcs['h/d1']).toMatchObject({ rockId: 'a', sentRockId: 'a' });
    // Sending with none out launches one.
    let v = lockRocks(hulkWorld());
    v = stepWorld(v, { h: { ...emptyInput(), activateLock: 'b' } });
    v = command(v, { action: 'send' });
    expect(v.npcs['h/d1']).toMatchObject({ sentRockId: 'b' });
  });

  it('recall brings them home and stows them, keeping their damage', () => {
    let w = lockRocks(hulkWorld());
    w = command(w, { action: 'launch' });
    w = run(w, 6).w;
    w = { ...w, ships: { ...w.ships, 'h/d2': { ...w.ships['h/d2']!, structure: 25 } } };
    w = command(w, { action: 'recall' });
    const r = run(w, 20);
    expect(dronesOut(r.w, 'h')).toHaveLength(0);
    expect(r.w.ships['h']!.droneBay?.map((d) => d.id)).toEqual(['d1', 'd2', 'd3', 'd4']);
    expect(r.w.ships['h']!.droneBay?.find((d) => d.id === 'd2')!.structure).toBe(25);
    expect(r.events.filter((e) => e.type === 'droneStowed')).toHaveLength(4);
  });

  it('a drone destroyed is lost; drones out when the mother goes are lost', () => {
    let w = command(hulkWorld(), { action: 'launch' });
    w = stepWorld({ ...w, ships: { ...w.ships, 'h/d1': { ...w.ships['h/d1']!, shield: 0, structure: 0 } } }, { h: emptyInput() });
    expect(w.events).toContainEqual({ type: 'droneLost', shipId: 'h', droneId: 'd1', reason: 'destroyed' });
    const { h: _gone, ...rest } = w.ships;
    const after = stepDrones({ ...w, ships: rest }, w, {});
    expect(dronesOut(after.world, 'h')).toHaveLength(0);
    expect(after.events.filter((e) => e.type === 'droneLost' && e.reason === 'leftBehind')).toHaveLength(3);
  });

  it('drones are not ships a pilot can board or list as owned', () => {
    let w = joinPilot({ ...createStarterWorld(), ships: {}, npcs: {}, spawners: [] }, 'ana', 'Ana');
    const mine = pilotShip(w, 'ana')!;
    const hulk = buildShip(w, { id: 'h', loadout: LOADOUTS['rookrivet-hulk']!, ownerId: 'ana', position: { x: 4000, y: 4000 }, heading: 0, flightMode: 'assisted' });
    w = { ...w, ships: { ...w.ships, h: hulk } };
    w = stepWorld(w, { h: { ...emptyInput(), droneCommand: { action: 'launch' } } });
    expect(ownedShips(w, 'ana').map((s) => s.id).sort()).toEqual(['h', mine.id].sort());
  });

  it('drones are bought into the bay and sold from it, worst first', () => {
    let w = joinPilot({ ...createStarterWorld(), ships: {}, npcs: {}, spawners: [] }, 'ana', 'Ana');
    const old = pilotShip(w, 'ana')!;
    const station = w.stations['station-ridge']!;
    const hulk = buildShip(w, { id: old.id, loadout: LOADOUTS['rookrivet-hulk']!, ownerId: 'ana', position: { x: 0, y: 0 }, heading: 0, flightMode: 'assisted' });
    const pad = freePadFor(station, 'L', {})!;
    w = { ...w, ships: { [old.id]: { ...onPad(hulk, station, pad), droneBay: [{ id: 'd1', loadoutId: 'rookrivet-mining-drone', structure: 10 }] } }, pilots: { ...w.pilots, ana: { ...w.pilots['ana']!, credits: 100_000 } } };
    expect(maxBuyable(w, 'ana', 'mining-drone')).toBe(5);
    const bought = buyGood(w, 'ana', 'mining-drone', 2);
    expect(bought.ok).toBe(true);
    if (!bought.ok) return;
    expect(bought.world.ships[old.id]!.droneBay?.map((d) => d.id)).toEqual(['d1', 'd2', 'd3']);
    expect(bought.world.ships[old.id]!.hold['mining-drone']).toBeUndefined();
    // Past the bays' room it is the bays that are full, whatever the cargo hold has free.
    expect(buyGood(bought.world, 'ana', 'mining-drone', 4)).toMatchObject({ ok: false, reason: 'droneBay' });
    const sold = sellGood(bought.world, 'ana', 'mining-drone', 1);
    expect(sold.ok).toBe(true);
    if (!sold.ok) return;
    expect(sold.world.ships[old.id]!.droneBay?.map((d) => d.id)).toEqual(['d2', 'd3']);
  });

  it('drones out survive a save', () => {
    let w = lockRocks(hulkWorld());
    w = command(w, { action: 'launch' });
    w = run(w, 3).w;
    const back = deserializeWorld(serializeWorld(w, ''));
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(dronesOut(back.world, 'h')).toHaveLength(4);
    expect(back.world.npcs['h/d1']).toEqual(w.npcs['h/d1']);
  });

  it('find their way into the densest part of the belt without hitting anything', () => {
    // Jason saw a drone wedge itself between two rocks: park a hulk beside the
    // most crowded patch of the Scree and send drones to rocks deep inside it.
    const base: World = { ...createStarterWorld(), ships: {}, npcs: {}, spawners: [], rockfall: { made: 0, timerTicks: 1e9 } };
    const rocks = asteroidPositions(base);
    const crowd = (r: (typeof rocks)[number]): number => rocks.filter((o) => Math.hypot(o.position.x - r.position.x, o.position.y - r.position.y) < 400).length;
    const centre = [...rocks].sort((a, b) => crowd(b) - crowd(a) || (a.id < b.id ? -1 : 1))[0]!;
    const far = rocks
      .filter((o) => Math.hypot(o.position.x - centre.position.x, o.position.y - centre.position.y) < 450 && o.radius < 45)
      .sort((a, b) => Math.hypot(b.position.x - centre.position.x, b.position.y - centre.position.y) - Math.hypot(a.position.x - centre.position.x, a.position.y - centre.position.y))
      .slice(0, 2);
    let w: World = { ...base, ships: { h: buildShip(base, { id: 'h', loadout: LOADOUTS['rookrivet-hulk']!, ownerId: null, position: { x: centre.position.x + 520, y: centre.position.y }, heading: Math.PI, flightMode: 'assisted' }) } };
    for (const r of far) w = stepWorld(w, { h: { ...emptyInput(), lock: r.id } });
    w = run(w, 5).w;
    w = command(w, { action: 'launch' });
    const r = run(w, 40);
    const hurt = r.events.filter((e) => e.type === 'damaged' && e.shipId.startsWith('h/'));
    expect(hurt).toHaveLength(0);
    // Every drone got to a rock and cut it.
    const cutters = new Set(r.events.filter((e) => e.type === 'oreFreed').map((e) => e.shipId));
    expect([...cutters].sort()).toEqual(['h/d1', 'h/d2', 'h/d3', 'h/d4']);
  });

  it('plans a way round rocks, and straight across open space', () => {
    const wall = [{ position: { x: 100, y: 0 }, radius: 40 }];
    expect(findPath({ x: 0, y: 0 }, { x: 300, y: 0 }, [], 10)).toEqual([{ x: 300, y: 0 }]);
    const path = findPath({ x: 0, y: 0 }, { x: 300, y: 0 }, wall, 10)!;
    expect(path.at(-1)).toEqual({ x: 300, y: 0 });
    expect(path.length).toBeGreaterThan(1);
    // Every leg keeps clear of the rock.
    let at = { x: 0, y: 0 };
    for (const p of path) {
      for (let t = 0; t <= 1; t += 0.05) {
        const q = { x: at.x + (p.x - at.x) * t, y: at.y + (p.y - at.y) * t };
        expect(Math.hypot(q.x - 100, q.y)).toBeGreaterThanOrEqual(49);
      }
      at = p;
    }
  });
});
