import { describe, expect, it } from 'vitest';
import { shipStats } from '../stats.js';
import type { Loot, Projectile, Ship, World, WorldEvent } from '../types.js';
import { VIEW_MARGIN, visibleEvents, visibleWorld } from '../view.js';
import { createStarterWorld, joinPilot, pilotShip } from '../world.js';

/**
 * Only what you can see (docs/shared-world.md): the server sends each
 * player `visibleWorld`, not the world.
 */

/** Ana and Bob, each in a starter, flying in open space, Bob `apart` units east of Ana. */
function two(apart: number): { w: World; ana: Ship; bob: Ship } {
  let w: World = { ...createStarterWorld(), ships: {}, npcs: {}, spawners: [] };
  w = joinPilot(joinPilot(w, 'ana', 'Ana'), 'bob', 'Bob');
  const at = { x: -7000, y: -7000 };
  const fly = (s: Ship, x: number): Ship => ({ ...s, state: 'flying', dockedAt: null, padId: null, position: { x: at.x + x, y: at.y }, velocity: { x: 0, y: 0 } });
  const ana = fly(pilotShip(w, 'ana')!, 0);
  const bob = { ...fly(pilotShip(w, 'bob')!, apart), hold: { food: 5 } };
  w = { ...w, ships: { ...w.ships, [ana.id]: ana, [bob.id]: bob } };
  return { w, ana, bob };
}

const reach = (w: World, s: Ship) => shipStats(w, s).sensorRange + VIEW_MARGIN;

describe('only what you can see', () => {
  it('leaves out ships beyond sensor range and the margin, and keeps those inside', () => {
    const near = two(1000);
    expect(visibleWorld(near.w, 'ana').ships[near.bob.id]).toBeDefined();
    const far = two(reach(near.w, near.ana) + 100);
    expect(visibleWorld(far.w, 'ana').ships[far.bob.id]).toBeUndefined();
    expect(visibleWorld(far.w, 'ana').ships[far.ana.id]).toBeDefined();
  });

  it('keeps every ship the pilot owns, however far', () => {
    const { w, ana } = two(1000);
    const spare: Ship = { ...ana, id: 'spare', position: { x: 90000, y: 90000 } };
    const world = { ...w, ships: { ...w.ships, spare } };
    expect(visibleWorld(world, 'ana').ships['spare']).toBeDefined();
    expect(visibleWorld(world, 'bob').ships['spare']).toBeUndefined();
  });

  it("hides other ships' holds, but not your own", () => {
    const { w, ana, bob } = two(1000);
    const anaView = visibleWorld(w, 'ana');
    expect(anaView.ships[bob.id]!.hold).toEqual({});
    expect(visibleWorld(w, 'bob').ships[bob.id]!.hold).toEqual({ food: 5 });
    expect(anaView.ships[ana.id]).toBe(ana);
  });

  it('shows a hold to a complete lock whose computer reads cargo', () => {
    const { w, ana, bob } = two(1000);
    const tally = { ...ana, fit: { ...ana.fit, t1: 'tessaract-scanner-s' } };
    expect(shipStats(w, tally).readouts).toContain('cargo');
    const locking = { ...tally, locks: [{ targetId: bob.id, progress: 0.5 }], activeLock: bob.id };
    const locked = { ...tally, locks: [{ targetId: bob.id, progress: 1 }], activeLock: bob.id };
    expect(visibleWorld({ ...w, ships: { ...w.ships, [ana.id]: locking } }, 'ana').ships[bob.id]!.hold).toEqual({});
    expect(visibleWorld({ ...w, ships: { ...w.ships, [ana.id]: locked } }, 'ana').ships[bob.id]!.hold).toEqual({ food: 5 });
    // The starter's own computer does not read cargo: a lock alone is not enough.
    const plain = { ...ana, locks: [{ targetId: bob.id, progress: 1 }], activeLock: bob.id };
    expect(visibleWorld({ ...w, ships: { ...w.ships, [ana.id]: plain } }, 'ana').ships[bob.id]!.hold).toEqual({});
  });

  it("gives other pilots' names and ships, never their credits or storage", () => {
    const { w } = two(1000);
    const rich: World = { ...w, pilots: { ...w.pilots, bob: { ...w.pilots['bob']!, credits: 99_999, storage: { harbour: { food: 3 } } } } };
    const view = visibleWorld(rich, 'ana');
    expect(view.pilots['bob']).toMatchObject({ name: 'Bob', shipId: rich.pilots['bob']!.shipId, credits: 0, storage: {} });
    expect(view.pilots['ana']).toBe(rich.pilots['ana']);
  });

  it('leaves out shots and loot out of reach, but keeps your own cache anywhere', () => {
    const { w, ana } = two(1000);
    const far = { x: 90000, y: 0 };
    const shot = (id: string, position: { x: number; y: number }): Projectile => ({ id, ownerShipId: 'x', position, velocity: { x: 0, y: 0 }, damage: 1, damageType: 'kinetic', ticksLeft: 10 });
    const loot = (id: string, position: { x: number; y: number }, cache?: string): Loot => ({ id, item: 'food', amount: 1, position, velocity: { x: 0, y: 0 }, ticksLeft: 100, ...(cache ? { cache: { ownerId: cache } } : {}) });
    const world = { ...w, projectiles: [shot('near', ana.position), shot('far', far)], loot: [loot('near', ana.position), loot('far', far), loot('mine', far, 'ana')] };
    const view = visibleWorld(world, 'ana');
    expect(view.projectiles.map((p) => p.id)).toEqual(['near']);
    expect(view.loot.map((l) => l.id)).toEqual(['near', 'mine']);
  });

  it('a pilot with no ship sees only what they own', () => {
    const { w, ana } = two(1000);
    const world = { ...w, pilots: { ...w.pilots, ana: { ...w.pilots['ana']!, shipId: null } } };
    const view = visibleWorld(world, 'ana');
    expect(Object.keys(view.ships)).toEqual([ana.id]);
  });

  it('hands back unchanged parts as the same objects, so they are not resent', () => {
    const { w } = two(1000);
    const first = visibleWorld(w, 'ana');
    const again = visibleWorld({ ...w, tick: w.tick + 1 }, 'ana', first);
    expect(again.pilots).toBe(first.pilots);
    expect(again.loot).toBe(first.loot);
    expect(again.npcs).toBe(first.npcs);
  });

  it('passes on events about your pilot or a ship in view, and keeps the rest back', () => {
    const { w, ana, bob } = two(90000);
    const ships = visibleWorld(w, 'ana').ships;
    const events = [
      { type: 'docked', shipId: ana.id, stationId: 's', padId: 'p' },
      { type: 'docked', shipId: bob.id, stationId: 's', padId: 'p' },
      { type: 'pilotWoke', pilotId: 'ana', shipId: 'gone' },
    ] as unknown as WorldEvent[];
    expect(visibleEvents(events, 'ana', ships)).toEqual([events[0], events[2]]);
  });
});
