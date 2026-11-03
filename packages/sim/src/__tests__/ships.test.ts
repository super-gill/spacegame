import { describe, expect, it } from 'vitest';
import { MODULE_RESALE_FRACTION, STARTING_CREDITS } from '../constants.js';
import { fitModule, mountRefusal, planRefit, resaleValue, unfitModule, type FitResult } from '../fitting.js';
import { HULLS } from '../hulls.js';
import { LOADOUTS } from '../loadouts.js';
import { MANUFACTURERS } from '../manufacturers.js';
import { MODULES } from '../modules.js';
import { deserializeWorld, SAVE_FORMAT, SAVE_VERSION } from '../save.js';
import { fitStats, shipStats } from '../stats.js';
import { stepWorld } from '../step.js';
import type { Ship, World } from '../types.js';
import { length } from '../vec2.js';
import { WEAPONS } from '../weapons.js';
import { createStarterWorld, emptyInput, joinPilot, pilotShip, STARTER_LOADOUT_ID } from '../world.js';
import { TEST_CATALOGUES, loadoutStats } from './fixtures.js';

/** Modular ships: catalogue integrity, derived stats, bonuses and fitting rules. */

const SECOND = 60;
const HARBOUR = 'station-harbour';
const RIDGE = 'station-ridge';
const courier = HULLS['meridian-courier']!;
const wedge = HULLS['kessari-wedge']!;
const spine = HULLS['tessaract-spine']!;

/** A world with one pilot in a starter ship docked at `stationId`, no NPCs. */
function dockedAt(stationId = HARBOUR, credits = STARTING_CREDITS): { w: World; me: string } {
  const base = { ...createStarterWorld(), ships: {}, npcs: {}, spawners: [] };
  let w = joinPilot(base, 'ana', 'Ana');
  const me = pilotShip(w, 'ana')!.id;
  const st = w.stations[stationId]!;
  w = {
    ...w,
    pilots: { ...w.pilots, ana: { ...w.pilots['ana']!, credits } },
    ships: { ...w.ships, [me]: { ...w.ships[me]!, state: 'docked', dockedAt: st.id, position: { ...st.position } } },
  };
  return { w, me };
}

function ok(r: FitResult): World {
  if (!r.ok) throw new Error(`refused: ${r.reason}`);
  return r.world;
}

const myShip = (w: World): Ship => pilotShip(w, 'ana')!;
const credits = (w: World): number => w.pilots['ana']!.credits;

describe('catalogues', () => {
  it('every hull has unique mount ids and a known maker', () => {
    for (const hull of Object.values(HULLS)) {
      const ids = hull.mounts.map((m) => m.id);
      expect(new Set(ids).size, hull.id).toBe(ids.length);
      expect(MANUFACTURERS[hull.manufacturer], hull.id).toBeDefined();
    }
  });

  it('every module has a known maker, and every weapon module a known weapon', () => {
    for (const m of Object.values(MODULES)) {
      expect(MANUFACTURERS[m.manufacturer], m.id).toBeDefined();
      if (m.kind === 'weapon') expect(WEAPONS[m.weaponId ?? ''], m.id).toBeDefined();
      else expect(m.weaponId, m.id).toBeUndefined();
    }
  });

  it('every loadout fits its hull by the fitting rules and stays within power', () => {
    for (const loadout of Object.values(LOADOUTS)) {
      const hull = HULLS[loadout.hullId]!;
      expect(hull, loadout.id).toBeDefined();
      for (const [mountId, moduleId] of Object.entries(loadout.fit)) {
        const mount = hull.mounts.find((m) => m.id === mountId);
        expect(mount, `${loadout.id} ${mountId}`).toBeDefined();
        expect(mountRefusal(mount!, MODULES[moduleId]!), `${loadout.id} ${mountId}`).toBeNull();
      }
      const s = loadoutStats(loadout.id);
      expect(s.powerDraw, loadout.id).toBeLessThanOrEqual(s.powerOutput);
    }
  });
});

describe('derived stats', () => {
  it('a bare hull has its own mass and structure and nothing else', () => {
    const s = fitStats(TEST_CATALOGUES, wedge, {});
    expect(s.mass).toBe(wedge.mass);
    expect(s.structure).toBe(wedge.structure);
    expect([s.mainThrust, s.reverseThrust, s.rotationThrust, s.shield, s.cargoCapacity, s.powerOutput]).toEqual([0, 0, 0, 0, 0, 0]);
    expect(s.weapons).toEqual({});
  });

  it('adds up mass, thrust, power and structure from the fit', () => {
    const fit = { e1: 'meridian-engine-s', c1: 'meridian-thrusters-s', c2: 'meridian-reactor-s', u1: 'rookrivet-armour-s' };
    const s = fitStats(TEST_CATALOGUES, courier, fit);
    const parts = Object.values(fit).map((id) => MODULES[id]!);
    expect(s.mass).toBeCloseTo(courier.mass + parts.reduce((n, m) => n + m.mass, 0), 9);
    expect(s.mainThrust).toBe(MODULES['meridian-engine-s']!.stats.mainThrust);
    expect(s.rotationThrust).toBe(MODULES['meridian-thrusters-s']!.stats.rotationThrust);
    expect(s.structure).toBe(courier.structure + MODULES['rookrivet-armour-s']!.stats.structure!);
    expect(s.powerOutput).toBe(10);
    expect(s.powerDraw).toBe(3);
  });

  it('adds cargo mass on top of the fit', () => {
    const w = joinPilot(createStarterWorld(), 'ana', 'Ana');
    const ship = { ...myShip(w), hold: { ore: 10 } };
    expect(shipStats(w, ship).mass).toBeCloseTo(loadoutStats(STARTER_LOADOUT_ID).mass + 10 * w.goods['ore']!.unitMass, 9);
  });

  it('gives each weapon mount its own effective weapon', () => {
    const s = loadoutStats(STARTER_LOADOUT_ID);
    expect(s.weapons['w1']!.id).toBe('pulse-cannon');
    expect(s.weapons['w2']!.id).toBe('light-turret');
  });
});

describe('hull bonuses', () => {
  it('a role bonus applies to full-size modules only', () => {
    const full = fitStats(TEST_CATALOGUES, spine, { b1: 'tessaract-container-m' });
    const small = fitStats(TEST_CATALOGUES, spine, { b1: 'meridian-pod-s' });
    expect(full.cargoCapacity).toBe(Math.floor(30 * 1.25));
    expect(small.cargoCapacity).toBe(16); // fits, but loses the bonus
  });

  it('a race bonus rewards the race tech: Kessari shields', () => {
    const fit = { c1: 'itomarr-reactor-m', i1: 'itomarr-shield-m' };
    expect(fitStats(TEST_CATALOGUES, wedge, fit).shield).toBeCloseTo(110 * 1.2, 9);
    expect(fitStats(TEST_CATALOGUES, courier, { c2: 'meridian-reactor-s', i1: 'meridian-shield-s' }).shield).toBe(50);
  });

  it('a combat hull adds damage to full-size weapons only', () => {
    const s = fitStats(TEST_CATALOGUES, wedge, { w1: 'union-autocannon-m', w2: 'paragon-pulse-s' });
    expect(s.weapons['w1']!.damage).toBeCloseTo(WEAPONS['autocannon']!.damage * 1.15, 9);
    expect(s.weapons['w2']!.damage).toBe(WEAPONS['pulse-cannon']!.damage);
  });

  it('bonuses live on the hull: the same module is plain on another hull', () => {
    expect(fitStats(TEST_CATALOGUES, courier, { b1: 'meridian-pod-s' }).cargoCapacity).toBe(20);
    expect(fitStats(TEST_CATALOGUES, wedge, { b1: 'meridian-pod-s' }).cargoCapacity).toBe(16);
  });
});

describe('mount rules', () => {
  const at = (hullId: string, mountId: string) => HULLS[hullId]!.mounts.find((m) => m.id === mountId)!;

  it('checks type, size and services', () => {
    expect(mountRefusal(at('meridian-courier', 'u1'), MODULES['meridian-engine-s']!)).toBe('wrongMount');
    expect(mountRefusal(at('meridian-courier', 'w1'), MODULES['union-autocannon-m']!)).toBe('tooBig');
    expect(mountRefusal(at('meridian-courier', 'w1'), MODULES['paragon-turret-s']!)).toBe('missingService'); // no fire control
    expect(mountRefusal(at('meridian-courier', 'w2'), MODULES['paragon-turret-s']!)).toBeNull();
    expect(mountRefusal(at('kessari-wedge', 'w1'), MODULES['paragon-pulse-s']!)).toBeNull(); // smaller fits
  });

  it('reactors go on core or internal mounts', () => {
    expect(mountRefusal(at('kessari-wedge', 'c1'), MODULES['itomarr-reactor-m']!)).toBeNull();
    expect(mountRefusal(at('kessari-wedge', 'i1'), MODULES['itomarr-reactor-m']!)).toBeNull();
    expect(mountRefusal(at('kessari-wedge', 'u1'), MODULES['itomarr-reactor-m']!)).toBe('wrongMount');
  });
});

describe('fitting', () => {
  it('fits a module into an empty mount and charges its price', () => {
    const { w } = dockedAt();
    const armour = MODULES['rookrivet-armour-s']!;
    const r = fitModule(w, 'ana', 'u1', armour.id);
    const after = ok(r);
    expect(myShip(after).fit['u1']).toBe(armour.id);
    expect(credits(after)).toBe(STARTING_CREDITS - armour.price);
    expect(shipStats(after, myShip(after)).structure).toBe(shipStats(w, myShip(w)).structure + armour.stats.structure!);
    expect(r.ok && r.event).toEqual({ type: 'fitted', shipId: myShip(w).id, mountId: 'u1', moduleId: armour.id, replaced: null, cost: armour.price });
  });

  it('replacing a module refunds part of the old one', () => {
    const { w } = dockedAt();
    const after = ok(fitModule(w, 'ana', 'e1', 'slagline-engine-s'));
    const expected = MODULES['slagline-engine-s']!.price - Math.floor(MODULES['meridian-engine-s']!.price * MODULE_RESALE_FRACTION);
    expect(credits(after)).toBe(STARTING_CREDITS - expected);
  });

  it('removing a module sells it back', () => {
    const { w } = dockedAt();
    const after = ok(unfitModule(w, 'ana', 'b1'));
    expect(myShip(after).fit['b1']).toBeUndefined();
    expect(credits(after)).toBe(STARTING_CREDITS + resaleValue(MODULES['meridian-pod-s']!));
    expect(shipStats(after, myShip(after)).cargoCapacity).toBe(0);
  });

  it('refuses, and changes nothing, when a rule is broken', () => {
    const { w } = dockedAt();
    const sealed = { ...w, ships: { ...w.ships, [myShip(w).id]: { ...myShip(w), hullId: 'sparrow' } } };
    const laden = { ...w, ships: { ...w.ships, [myShip(w).id]: { ...myShip(w), hold: { food: 5 } } } };
    const cases: Array<[FitResult, string]> = [
      [fitModule(w, 'ana', 'u1', 'meridian-engine-s'), 'wrongMount'],
      [fitModule(w, 'ana', 'w1', 'union-autocannon-m'), 'tooBig'],
      [fitModule(w, 'ana', 'w1', 'paragon-turret-s'), 'missingService'],
      [fitModule(w, 'ana', 'zz', 'meridian-pod-s'), 'unknownMount'],
      [fitModule(w, 'ana', 'u1', 'no-such-module'), 'unknownModule'],
      [fitModule(w, 'ana', 'e1', 'meridian-engine-s'), 'alreadyFitted'],
      [unfitModule(w, 'ana', 'u1'), 'emptyMount'],
      [unfitModule(w, 'ana', 'c2'), 'power'], // the only reactor
      [unfitModule(laden, 'ana', 'b1'), 'cargo'], // the only pod, with cargo aboard
      [fitModule(sealed, 'ana', 'u1', 'meridian-pod-s'), 'sealed'],
      [fitModule(w, 'nobody', 'u1', 'rookrivet-armour-s'), 'noShip'],
    ];
    for (const [r, reason] of cases) {
      expect(r.ok ? 'ok' : r.reason).toBe(reason);
      expect(r.world === w || r.world === sealed || r.world === laden).toBe(true);
    }
  });

  it('refuses a fit that draws more power than the reactors make', () => {
    // Starter: 9 of 10 power drawn. Make room, take a hungrier engine, then
    // see that 10 of 10 fits and 11 of 10 does not.
    const { w } = dockedAt(HARBOUR, 100_000);
    const noShield = ok(unfitModule(w, 'ana', 'i1')); // draw 7 of 10
    const kick = ok(fitModule(noShield, 'ana', 'e1', 'slagline-engine-s')); // draw 8
    const back = fitModule(kick, 'ana', 'i1', 'meridian-shield-s'); // draw 10: allowed
    expect(back.ok).toBe(true);
    const thirsty = { ...kick.modules, 'meridian-shield-s': { ...kick.modules['meridian-shield-s']!, power: 3 } };
    const r = fitModule({ ...kick, modules: thirsty }, 'ana', 'i1', 'meridian-shield-s'); // draw 11
    expect(r.ok ? 'ok' : r.reason).toBe('power');
  });

  it('refuses when the pilot cannot pay', () => {
    const { w } = dockedAt(HARBOUR, 100);
    const r = fitModule(w, 'ana', 'u1', 'rookrivet-armour-s');
    expect(r.ok ? 'ok' : r.reason).toBe('credits');
  });

  it('happens only while docked at a station with outfitting', () => {
    const ridge = dockedAt(RIDGE).w;
    expect(planRefit(ridge, 'ana', 'u1', 'rookrivet-armour-s')).toEqual({ ok: false, reason: 'noOutfitting' });
    const { w, me } = dockedAt();
    const flying = { ...w, ships: { ...w.ships, [me]: { ...w.ships[me]!, state: 'flying' as const, dockedAt: null } } };
    expect(planRefit(flying, 'ana', 'u1', 'rookrivet-armour-s')).toEqual({ ok: false, reason: 'notDocked' });
  });

  it('a preview shows the stats after the change without making it', () => {
    const { w } = dockedAt();
    const plan = planRefit(w, 'ana', 'e1', 'slagline-engine-s');
    expect(plan.ok && plan.stats.mainThrust).toBe(MODULES['slagline-engine-s']!.stats.mainThrust);
    expect(myShip(w).fit['e1']).toBe('meridian-engine-s');
  });

  it('keeps weapon state on unchanged mounts and adds or drops weapons with the fit', () => {
    const { w } = dockedAt();
    const before = myShip(w).weapons;
    expect(before.map((s) => s.mountId)).toEqual(['w1', 'w2']);
    const noTurret = ok(unfitModule(w, 'ana', 'w2'));
    expect(myShip(noTurret).weapons).toEqual([before[0]]);
    const again = ok(fitModule(noTurret, 'ana', 'w2', 'paragon-turret-s'));
    expect(myShip(again).weapons.map((s) => s.mountId)).toEqual(['w1', 'w2']);
  });

  it('removing armour takes the structure with it', () => {
    const { w } = dockedAt(HARBOUR, 100_000);
    const armoured = ok(fitModule(w, 'ana', 'u1', 'rookrivet-armour-s'));
    const full = { ...armoured, ships: { ...armoured.ships, [myShip(armoured).id]: { ...myShip(armoured), structure: 130 } } };
    const bare = ok(unfitModule(full, 'ana', 'u1'));
    expect(myShip(bare).structure).toBe(courier.structure);
  });

  it('a refit changes how the ship flies', () => {
    const { w } = dockedAt(HARBOUR, 100_000);
    const fast = ok(fitModule(w, 'ana', 'e1', 'slagline-engine-s'));
    const speedAfterOneSecond = (world: World): number => {
      const me = myShip(world).id;
      let x: World = { ...world, ships: { ...world.ships, [me]: { ...myShip(world), state: 'flying', dockedAt: null, position: { x: 3000, y: 3000 } } } };
      for (let i = 0; i < SECOND; i++) x = stepWorld(x, { [me]: { ...emptyInput(), thrustForward: true } });
      return length(x.ships[me]!.velocity);
    };
    expect(speedAfterOneSecond(fast)).toBeGreaterThan(speedAfterOneSecond(w) * 1.1);
  });

  it('a ship with no engine cannot thrust', () => {
    const { w } = dockedAt();
    const noEngine = ok(unfitModule(w, 'ana', 'e1'));
    const me = myShip(noEngine).id;
    let x: World = { ...noEngine, ships: { ...noEngine.ships, [me]: { ...myShip(noEngine), state: 'flying', dockedAt: null, position: { x: 3000, y: 3000 } } } };
    for (let i = 0; i < SECOND; i++) x = stepWorld(x, { [me]: { ...emptyInput(), thrustForward: true } });
    expect(length(x.ships[me]!.velocity)).toBe(0);
  });
});

describe('ships in the world', () => {
  it('new pilots start in the Meridian starter', () => {
    const w = joinPilot(createStarterWorld(), 'ana', 'Ana');
    const s = myShip(w);
    expect(s.hullId).toBe('meridian-courier');
    expect(s.fit).toEqual(LOADOUTS[STARTER_LOADOUT_ID]!.fit);
    const stats = shipStats(w, s);
    expect(s.shield).toBe(stats.shield);
    expect(s.structure).toBe(stats.structure);
  });

  it('NPCs fly their spawner loadouts', () => {
    const w = createStarterWorld();
    expect(w.ships['npc-trader-1']!.hullId).toBe('tessaract-spine');
    expect(w.ships['npc-pirate-1']!.hullId).toBe('kessari-wedge');
  });

  it('only Harbour Station has outfitting', () => {
    const w = createStarterWorld();
    expect(w.stations[HARBOUR]!.outfitting).toBe(true);
    expect(w.stations[RIDGE]!.outfitting).toBe(false);
  });

  it('refuses saves from before modular ships', () => {
    const old = JSON.stringify({ format: SAVE_FORMAT, version: 1, savedAt: '', world: {} });
    expect(SAVE_VERSION).toBe(2);
    expect(deserializeWorld(old)).toEqual({ ok: false, reason: 'tooOld' });
  });
});
