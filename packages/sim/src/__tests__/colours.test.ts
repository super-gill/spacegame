import { describe, expect, it } from 'vitest';
import { contactSize, runsDark, startsDark } from '../colours.js';
import { HULLS } from '../hulls.js';
import { runSpawners } from '../lifecycle.js';
import { migrate15to16 } from '../save.js';
import { stepWorld as step } from '../step.js';
import { shipStats } from '../stats.js';
import type { Ship, World } from '../types.js';
import { VIEW_MARGIN, visibleWorld } from '../view.js';
import { createStarterWorld, emptyInput, joinPilot, pilotShip } from '../world.js';

/**
 * Colours (docs/interface.md, section 3): every ship's Registry beacon.
 * Squawking, others see its name and hull; running dark, it is a
 * radar contact until locked and identified.
 */

/** Ana and Bob in starters in open space, Bob 1,000 units east of Ana. */
function two(): { w: World; ana: Ship; bob: Ship } {
  let w: World = { ...createStarterWorld(), ships: {}, npcs: {}, spawners: [] };
  w = joinPilot(joinPilot(w, 'ana', 'Ana'), 'bob', 'Bob');
  const fly = (s: Ship, x: number): Ship => ({ ...s, state: 'flying', dockedAt: null, padId: null, position: { x: -7000 + x, y: -7000 }, velocity: { x: 0, y: 0 } });
  const ana = fly(pilotShip(w, 'ana')!, 0);
  const bob = { ...fly(pilotShip(w, 'bob')!, 1000), hold: { food: 5 } };
  w = { ...w, ships: { ...w.ships, [ana.id]: ana, [bob.id]: bob } };
  return { w, ana, bob };
}

const withShips = (w: World, ...ships: Ship[]): World => ({ ...w, ships: { ...w.ships, ...Object.fromEntries(ships.map((s) => [s.id, s])) } });

describe('colours', () => {
  it('every ship shows its colours until switched, and the switch goes both ways', () => {
    const { w, ana } = two();
    expect(runsDark(w, ana)).toBe(false);
    const input = { ...emptyInput(), toggleColours: true };
    const dark = step(w, { [ana.id]: input });
    expect(dark.ships[ana.id]!.dark).toBe(true);
    expect(dark.events).toContainEqual({ type: 'coloursChanged', shipId: ana.id, dark: true });
    const back = step(dark, { [ana.id]: input });
    expect(back.ships[ana.id]!.dark).toBeUndefined();
    expect(back.events).toContainEqual({ type: 'coloursChanged', shipId: ana.id, dark: false });
  });

  it('pirates and arena enemies start dark; traders, miners and the Watch show colours', () => {
    expect(startsDark({ kind: 'pirate' } as never)).toBe(true);
    expect(startsDark({ kind: 'arena' } as never)).toBe(true);
    for (const kind of ['trader', 'miner', 'watch', 'drone']) expect(startsDark({ kind } as never)).toBe(false);
    expect(startsDark(undefined)).toBe(false);
    // The starter system's spawners agree.
    const w = createStarterWorld();
    let spawned = w;
    for (let i = 0; i < 20000 && Object.keys(spawned.npcs).length < w.spawners.length; i++) spawned = runSpawners({ ...spawned, tick: spawned.tick + 1 });
    for (const [id, brain] of Object.entries(spawned.npcs)) expect(spawned.ships[id]!.dark === true).toBe(startsDark(brain));
    expect(Object.values(spawned.npcs).some((b) => b.kind === 'pirate')).toBe(true);
  });

  it("a drone shows its mother's colours", () => {
    const { w, ana } = two();
    const drone: Ship = { ...ana, id: `${ana.id}/d1`, motherId: ana.id, ownerId: 'ana' };
    expect(runsDark(withShips(w, drone), drone)).toBe(false);
    expect(runsDark(withShips(w, { ...ana, dark: true }, drone), drone)).toBe(true);
  });

  it('a contact is small, medium or large by hull class', () => {
    const of = (cls: string) => contactSize(Object.values(HULLS).find((h) => h.class === cls));
    expect(of('corvette')).toBe('small');
    expect(of('pod')).toBe('small');
    expect(of('patrolBoat')).toBe('small');
    expect(of('prospector')).toBe('small');
    expect(of('miner')).toBe('small');
    expect(of('frigate')).toBe('medium');
    expect(of('freighter')).toBe('medium');
    expect(of('barge')).toBe('medium');
    expect(of('destroyer')).toBe('large');
    expect(contactSize(undefined)).toBe('small');
  });

  it('saves from version 15 put pirates and arena enemies dark and leave everyone else showing', () => {
    const migrated = migrate15to16({
      ships: { p: { id: 'p' }, a: { id: 'a' }, t: { id: 't' }, mine: { id: 'mine' } },
      npcs: { p: { kind: 'pirate' }, a: { kind: 'arena' }, t: { kind: 'trader' } },
    }) as { ships: Record<string, { dark?: true }> };
    expect(migrated.ships['p']!.dark).toBe(true);
    expect(migrated.ships['a']!.dark).toBe(true);
    expect(migrated.ships['t']!.dark).toBeUndefined();
    expect(migrated.ships['mine']!.dark).toBeUndefined();
  });
});

describe('what others see of a ship running dark', () => {
  it('a ship showing colours is sent as it is (bar its hold)', () => {
    const { w, bob } = two();
    const seen = visibleWorld(w, 'ana').ships[bob.id]!;
    expect(seen.contact).toBeUndefined();
    expect(seen.hullId).toBe(bob.hullId);
  });

  it('a dark ship nobody has identified is a contact: motion and size, nothing else', () => {
    const { w, ana, bob } = two();
    const dark: Ship = { ...bob, dark: true, weaponsHot: true, locks: [{ targetId: 'elsewhere', progress: 1 }], activeLock: 'elsewhere' };
    const world = withShips(w, dark);
    const view = visibleWorld(world, 'ana');
    const seen = view.ships[bob.id]!;
    expect(seen.contact).toBe('small');
    expect(seen).toMatchObject({ hullId: '', fit: {}, ownerId: null, weapons: [], hold: {}, locks: [], activeLock: null, shield: 0, structure: 0, weaponsHot: false });
    expect(seen.position).toEqual(dark.position);
    expect(seen.velocity).toEqual(dark.velocity);
    // Nobody is named as flying it.
    expect(view.pilots['bob']!.shipId).toBeNull();
    expect(view.pilots['bob']!.name).toBe('Bob');
    // Its owner still sees it whole.
    expect(visibleWorld(world, 'bob').ships[bob.id]).toBe(dark);
    expect(visibleWorld(world, 'ana').ships[ana.id]).toBe(ana);
  });

  it("keeps a dark ship's locks on you, so being locked still warns", () => {
    const { w, ana, bob } = two();
    const dark: Ship = { ...bob, dark: true, locks: [{ targetId: ana.id, progress: 0.4 }, { targetId: 'other', progress: 1 }], activeLock: ana.id };
    const seen = visibleWorld(withShips(w, dark), 'ana').ships[bob.id]!;
    expect(seen.locks).toEqual([{ targetId: ana.id, progress: 0.4 }]);
    expect(seen.activeLock).toBe(ana.id);
  });

  it('a complete lock identifies it, and it is sent as it is; a lock in progress does not', () => {
    const { w, ana, bob } = two();
    const dark: Ship = { ...bob, dark: true };
    expect(shipStats(w, ana).readouts).toContain('identity');
    const locking = { ...ana, locks: [{ targetId: bob.id, progress: 0.5 }], activeLock: bob.id };
    expect(visibleWorld(withShips(w, dark, locking), 'ana').ships[bob.id]!.contact).toBe('small');
    const locked = { ...ana, locks: [{ targetId: bob.id, progress: 1 }], activeLock: bob.id };
    const view = visibleWorld(withShips(w, dark, locked), 'ana');
    expect(view.ships[bob.id]!.contact).toBeUndefined();
    expect(view.ships[bob.id]!.hullId).toBe(bob.hullId);
    expect(view.pilots['bob']!.shipId).toBe(bob.id);
  });

  it("holds back a dark NPC's brain until identified", () => {
    const { w, bob } = two();
    const pirate: Ship = { ...bob, id: 'npc-pirate-1', ownerId: null, dark: true };
    const world = { ...withShips(w, pirate), npcs: { [pirate.id]: { kind: 'pirate' } as never } };
    const view = visibleWorld(world, 'ana');
    expect(view.ships[pirate.id]!.contact).toBe('small');
    expect(view.npcs[pirate.id]).toBeUndefined();
  });

  it('a contact sitting still is the same object from one view to the next', () => {
    const { w, bob } = two();
    const world = withShips(w, { ...bob, dark: true });
    const first = visibleWorld(world, 'ana');
    const second = visibleWorld(world, 'ana', first);
    expect(second.ships[bob.id]).toBe(first.ships[bob.id]);
    expect(second.pilots).toBe(first.pilots);
  });

  it('keeps back events that would name the pilot of a dark ship', () => {
    const { w, bob } = two();
    const world = { ...withShips(w, { ...bob, dark: true }), events: [{ type: 'boarded', pilotId: 'bob', shipId: bob.id, from: 'x' } as never, { type: 'weaponsHotChanged', shipId: bob.id, hot: true } as never] };
    const events = visibleWorld(world, 'ana').events;
    expect(events.map((e) => e.type)).toEqual(['weaponsHotChanged']);
  });

  it('reaches no further than the view does', () => {
    const { w, ana, bob } = two();
    const far = { ...bob, dark: true as const, position: { x: ana.position.x + shipStats(w, ana).sensorRange + VIEW_MARGIN + 100, y: ana.position.y } };
    expect(visibleWorld(withShips(w, far), 'ana').ships[bob.id]).toBeUndefined();
  });
});
