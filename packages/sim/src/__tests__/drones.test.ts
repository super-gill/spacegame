import { describe, expect, it } from 'vitest';
import { oreLeft, rockAt } from '../asteroids.js';
import { BELT_ID, BELT_PERIOD, BELT_RING_RADIUS } from '../bodies.js';
import { FIXED_DT } from '../constants.js';
import { freePadFor, onPad } from '../docking.js';
import { dronesOut, stepDrones } from '../drones.js';
import { buildShip } from '../factory.js';
import { LOADOUTS } from '../loadouts.js';
import { ownedShips } from '../ownership.js';
import { deserializeWorld, serializeWorld } from '../save.js';
import { shipStats } from '../stats.js';
import { stepWorld } from '../step.js';
import { buyGood, maxBuyable, sellGood } from '../trade.js';
import type { Asteroid, DroneCommand, ShipInput, World, WorldEvent } from '../types.js';
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
});
