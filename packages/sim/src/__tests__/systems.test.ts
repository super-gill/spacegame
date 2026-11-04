import { describe, expect, it } from 'vitest';
import { angleDelta } from '../angle.js';
import { fireWeapons } from '../combat.js';
import { FIXED_DT } from '../constants.js';
import { buildShip } from '../factory.js';
import { HULLS } from '../hulls.js';
import { LOADOUTS } from '../loadouts.js';
import { stepShip } from '../ship.js';
import { stepWorld } from '../step.js';
import { activationSlots } from '../systems.js';
import { MODULES } from '../modules.js';
import { SAVE_FORMAT, deserializeWorld } from '../save.js';
import { shipStats } from '../stats.js';
import type { Ship, ShipInput, World } from '../types.js';
import { createStarterWorld, emptyInput, joinPilot, pilotShip } from '../world.js';

/** 6f ship systems: slot budgets, fixed system mounts, and saves from before them. */

/** Slot counts by mount type for a hull. */
function slots(hullId: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of HULLS[hullId]!.mounts) out[m.type] = (out[m.type] ?? 0) + 1;
  return out;
}

describe('slot budgets', () => {
  it('follow hull class (docs/ship-systems.md)', () => {
    expect(slots('meridian-courier')).toMatchObject({ weapon: 2, utility: 2, internal: 3, bay: 1 });
    expect(slots('kessari-wedge')).toMatchObject({ weapon: 3, utility: 3, internal: 4, bay: 1 });
    expect(slots('tessaract-spine')).toMatchObject({ weapon: 1, utility: 2, internal: 4, bay: 6 });
  });

  it('every flyable hull has one each of the fixed system mounts; a pod only flight', () => {
    for (const hull of Object.values(HULLS)) {
      const s = slots(hull.id);
      if (hull.escapePod) {
        expect(s, hull.id).toMatchObject({ flight: 1 });
        expect(s['podBay'] ?? 0, hull.id).toBe(0);
        continue;
      }
      expect(s, hull.id).toMatchObject({ flight: 1, podBay: 1, fireControl: 1, nav: 1, radar: 1, computer: 1 });
    }
  });

  it('armour is passive (internal) and active kit is utility', () => {
    expect(MODULES['rookrivet-armour-s']!.mounts).toEqual(['internal']);
    for (const m of Object.values(MODULES).filter((m) => ['tractor', 'afterburner', 'countermeasure'].includes(m.kind))) {
      expect(m.mounts, m.id).toEqual(['utility']);
    }
  });

  it('the starter carries its systems: a flight computer, a pod bay, fire control, a tractor and an afterburner', () => {
    const w = joinPilot(createStarterWorld(), 'ana', 'Ana');
    const stats = shipStats(w, pilotShip(w, 'ana')!);
    expect(stats.flightControl).toBeGreaterThan(0);
    expect(stats.escapePod).toBe(true);
    expect(stats.turretControl).toBeGreaterThanOrEqual(1);
    expect(stats.tractorRange).toBeGreaterThan(0);
    expect(stats.afterburnerSpeed).toBeGreaterThan(0);
    expect(stats.powerDraw).toBeLessThanOrEqual(stats.powerOutput);
  });
});

describe('save version 6', () => {
  /** A version 5 save: the starter as 0.10.0 fitted it, armour on the old utility mount, no system mounts. */
  function version5(): { text: string; shipId: string } {
    const w = joinPilot(createStarterWorld(), 'ana', 'Ana');
    const me = pilotShip(w, 'ana')!;
    const oldFit = {
      n1: 'meridian-nav-s', r1: 'meridian-radar-s', t1: 'meridian-computer-s', w1: 'paragon-pulse-s', w2: 'paragon-turret-s',
      e1: 'meridian-engine-s', c1: 'meridian-thrusters-s', c2: 'meridian-reactor-s', i1: 'meridian-shield-s', u1: 'rookrivet-armour-s', b1: 'meridian-pod-s',
    };
    const old: World = { ...w, ships: { ...w.ships, [me.id]: { ...me, fit: oldFit, state: 'docked', dockedAt: 'station-harbour' } } };
    return { text: JSON.stringify({ format: SAVE_FORMAT, version: 5, savedAt: '', world: old }), shipId: me.id };
  }

  it('moves armour to an internal mount and fits the stock systems free', () => {
    const { text, shipId } = version5();
    const r = deserializeWorld(text);
    if (!r.ok) throw new Error(r.reason);
    const ship = r.world.ships[shipId]!;
    const where = (id: string) => Object.entries(ship.fit).find(([, m]) => m === id)?.[0];
    expect(where('rookrivet-armour-s')).toMatch(/^i/);
    expect(ship.fit['f1']).toBe('meridian-helm-s');
    expect(ship.fit['p1']).toBe('meridian-podbay-s');
    expect(ship.fit['x1']).toBe('paragon-director-s');
    expect(Object.values(ship.fit)).toContain('meridian-gleaner-s'); // the tractor it had built in
    expect(ship.weapons.map((w) => w.mountId)).toEqual(['w1', 'w2']);
    const stats = shipStats(r.world, ship);
    expect(stats.structure).toBeGreaterThan(HULLS['meridian-courier']!.structure); // the armour still counts
    expect(r.world.pilots['ana']!.credits).toBe(JSON.parse(text).world.pilots.ana.credits);
  });
});


const DT = 1 / 60;

function starter(w: World, fit: Record<string, string | null> = {}): Ship {
  const loadout = LOADOUTS['meridian-starter']!;
  const merged: Record<string, string> = { ...loadout.fit };
  for (const [k, v] of Object.entries(fit)) {
    if (v === null) delete merged[k];
    else merged[k] = v;
  }
  const s = buildShip(w, { id: 's', loadout: { ...loadout, fit: merged }, ownerId: null, position: { x: -7000, y: -7000 }, heading: 0, flightMode: 'assisted' });
  return { ...s, state: 'flying', dockedAt: null };
}

function fly(w: World, s: Ship, input: Partial<ShipInput>, seconds: number): Ship {
  const stats = shipStats(w, s);
  for (let i = 0; i < seconds * 60; i++) s = stepShip(s, stats, { ...emptyInput(), ...input }, DT);
  return s;
}

describe('the flight computer', () => {
  const w = createStarterWorld();

  it('without one there is no assist: a drifting ship keeps drifting in full assist', () => {
    const bare = { ...starter(w, { f1: null }), velocity: { x: 50, y: 0 } };
    expect(fly(w, bare, {}, 2).velocity.x).toBeCloseTo(50, 6);
    const helmed = { ...starter(w), velocity: { x: 50, y: 0 } };
    expect(fly(w, helmed, {}, 2).velocity.x).toBeLessThan(50);
  });

  it('without one the nose ignores the mouse', () => {
    expect(fly(w, starter(w, { f1: null }), { aimHeading: Math.PI / 2 }, 2).heading).toBe(0);
  });

  it('a better one turns the nose onto the mouse faster and holds it tighter', () => {
    const aim = Math.PI / 2;
    const cheap = fly(w, starter(w, { f1: 'meridian-helm-s' }), { aimHeading: aim }, 0.8);
    const good = fly(w, starter(w, { f1: 'paragon-helmsman-s' }), { aimHeading: aim }, 0.8);
    expect(Math.abs(angleDelta(good.heading, aim))).toBeLessThan(Math.abs(angleDelta(cheap.heading, aim)));
    const settledCheap = fly(w, starter(w, { f1: 'meridian-helm-s' }), { aimHeading: aim }, 4);
    expect(Math.abs(angleDelta(settledCheap.heading, aim))).toBeLessThan(0.05);
  });
});

describe('fire control', () => {
  const w = createStarterWorld();
  const target: Ship = { ...starter(w), id: 't', position: { x: -7000 + 300, y: -7000 } };
  const hot = (s: Ship): Ship => ({ ...s, weaponsHot: true, locks: [{ targetId: 't', progress: 1 }], activeLock: 't' });

  function shotsIn(s: Ship, seconds: number): number {
    const stats = shipStats(w, s);
    let n = 0;
    for (let i = 0; i < seconds * 60; i++) {
      const r = fireWeapons(s, stats, emptyInput(), () => target, FIXED_DT, i * 10, w);
      s = r.ship;
      n += r.projectiles.length;
    }
    return n;
  }

  it('without it swivels stay idle', () => {
    expect(shotsIn(hot(starter(w)), 2)).toBeGreaterThan(0);
    expect(shotsIn(hot(starter(w, { x1: null })), 2)).toBe(0);
  });

  it('a small director runs one swivel: a second stays idle until a bigger one is fitted', () => {
    const two = hot(starter(w, { w1: 'paragon-turret-s' }));
    const one = hot(starter(w));
    expect(shotsIn(two, 3)).toBe(shotsIn(one, 3));
    expect(shipStats(w, two).turretControl).toBe(1);
  });
});

describe('pod bays', () => {
  it('without one, losing the ship leaves the pilot with nothing until they wake', () => {
    let w = joinPilot(createStarterWorld(), 'ana', 'Ana');
    const me = pilotShip(w, 'ana')!;
    const { p1: _bay, ...fit } = me.fit;
    w = { ...w, ships: { ...w.ships, [me.id]: { ...me, fit, structure: 0.001, position: { x: -7000, y: -7000 }, velocity: { x: 0, y: 0 } } } };
    w = { ...w, ships: { ...w.ships, [me.id]: { ...w.ships[me.id]!, structure: 0 } } };
    w = stepWorld(w, {});
    expect(w.events.some((e) => e.type === 'podEjected')).toBe(false);
    expect(w.pilots['ana']!.shipId).toBeNull();
  });

  it('with one, the pilot gets away in a pod', () => {
    let w = joinPilot(createStarterWorld(), 'ana', 'Ana');
    const me = pilotShip(w, 'ana')!;
    w = { ...w, ships: { ...w.ships, [me.id]: { ...me, structure: 0, position: { x: -7000, y: -7000 }, velocity: { x: 0, y: 0 } } } };
    w = stepWorld(w, {});
    expect(w.events.some((e) => e.type === 'podEjected')).toBe(true);
  });
});

describe('shield timing', () => {
  it('comes from the shield generator: military stock comes back sooner', () => {
    const w = createStarterWorld();
    const civil = shipStats(w, starter(w));
    const military = shipStats(w, buildShip(w, { id: 'x', loadout: LOADOUTS['calder-watch']!, ownerId: null, position: { x: 0, y: 0 }, heading: 0, flightMode: 'assisted' }));
    expect(military.shieldRegenDelay).toBeLessThan(civil.shieldRegenDelay);
  });
});

describe('active modules', () => {
  /** A world with one starter flying in open space. */
  function solo(fit: Record<string, string | null> = {}, extra: Partial<Ship> = {}): { w: World; id: string } {
    const w0 = { ...createStarterWorld(), ships: {}, npcs: {}, spawners: [] };
    const s = { ...starter(w0, fit), ...extra };
    return { w: { ...w0, ships: { [s.id]: s } }, id: s.id };
  }

  it('lists group tiles first, then the active utility modules in mount order', () => {
    const { w, id } = solo({ u2: 'paragon-fairwarning-s' });
    const ship = { ...w.ships[id]!, weapons: w.ships[id]!.weapons.map((x) => (x.mountId === 'w1' ? { ...x, group: 2 } : x)) };
    expect(activationSlots(w, ship)).toEqual([
      { kind: 'group', group: 2 },
      { kind: 'module', mountId: 'u1', moduleId: 'meridian-gleaner-s', moduleKind: 'tractor' },
      { kind: 'module', mountId: 'u2', moduleId: 'paragon-fairwarning-s', moduleKind: 'countermeasure' },
    ]);
  });

  it('the tractor needs a tractor module; its tile leaves it running', () => {
    const none = solo({ u1: null });
    expect(stepWorld(none.w, { [none.id]: { ...emptyInput(), tractor: true } }).ships[none.id]!.tractorActive).toBe(false);
    const { w, id } = solo();
    let x = stepWorld(w, { [id]: { ...emptyInput(), toggleModule: 'u1' } });
    expect(x.ships[id]!.tractorActive).toBe(true);
    x = stepWorld(x, { [id]: emptyInput() });
    expect(x.ships[id]!.tractorActive).toBe(true);
    x = stepWorld(x, { [id]: { ...emptyInput(), toggleModule: 'u1' } });
    expect(x.ships[id]!.tractorActive).toBe(false);
  });

  it('a dispenser tile drops a charge from that dispenser', () => {
    const { w, id } = solo({ u2: 'paragon-fairwarning-s' });
    const x = stepWorld(w, { [id]: { ...emptyInput(), toggleModule: 'u2' } });
    expect(x.events.some((e) => e.type === 'countermeasureLaunched' && e.mountId === 'u2')).toBe(true);
  });

  it('the afterburner, held, lifts the speed cap and burns capacitor; it will not light on an empty one', () => {
    const run = (input: Partial<ShipInput>, extra: Partial<Ship> = {}): Ship => {
      const { w, id } = solo({}, { flightMode: 'manual', ...extra });
      let x = w;
      for (let i = 0; i < 60 * 12; i++) x = stepWorld(x, { [id]: { ...emptyInput(), thrustForward: true, ...input } });
      return x.ships[id]!;
    };
    const plain = run({});
    const burning = run({ afterburner: true });
    const speed = (s: Ship) => Math.hypot(s.velocity.x, s.velocity.y);
    expect(speed(burning)).toBeGreaterThan(speed(plain) * 1.2);
    expect(burning.capacitor).toBeLessThan(plain.capacitor);
    // On an empty capacitor it will not light (the reactor's trickle may let it sputter later).
    const { w, id } = solo({}, { capacitor: 0 });
    expect(stepWorld(w, { [id]: { ...emptyInput(), afterburner: true } }).ships[id]!.afterburning).toBeFalsy();
  });
});

describe('loading a save', () => {
  it('refreshes the starter stations’ market prices from the catalogue', async () => {
    const { serializeWorld } = await import('../save.js');
    const w = createStarterWorld();
    const stale: World = { ...w, stations: { ...w.stations, 'station-harbour': { ...w.stations['station-harbour']!, market: { ...w.stations['station-harbour']!.market, rounds: { ask: 1, bid: 1 } } } } };
    const r = deserializeWorld(serializeWorld(stale, ''));
    expect(r.ok && r.world.stations['station-harbour']!.market['rounds']).toEqual(w.stations['station-harbour']!.market['rounds']);
    expect(r.ok && r.world.stations['station-harbour']!.position).toEqual(stale.stations['station-harbour']!.position);
  });
});
