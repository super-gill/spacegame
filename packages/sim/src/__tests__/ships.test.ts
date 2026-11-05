import { describe, expect, it } from 'vitest';
import { FIT_FEE_FRACTION, MODULE_RESALE_FRACTION, STARTING_CREDITS } from '../constants.js';
import { leadPoint } from '../combat.js';
import { angleDelta } from '../angle.js';
import { fitFee, fitModule, mountRefusal, planRefit, resaleValue, sellModule, storedCount, unfitModule, type FitResult } from '../fitting.js';
import { HULLS } from '../hulls.js';
import { LOADOUTS } from '../loadouts.js';
import { MANUFACTURERS } from '../manufacturers.js';
import { MODULES } from '../modules.js';
import { deserializeWorld, SAVE_FORMAT, SAVE_VERSION } from '../save.js';
import { fitStats, flightWarnings, shipStats } from '../stats.js';
import { stepWorld } from '../step.js';
import type { Ship, World } from '../types.js';
import { distance, length, sub, toAngle } from '../vec2.js';
import { WEAPONS, weaponDps } from '../weapons.js';
import { createStarterWorld, emptyInput, joinPilot, pilotShip, STARTER_LOADOUT_ID } from '../world.js';
import { TEST_CATALOGUES, loadoutStats } from './fixtures.js';
import { PIRATE_TUNING } from '../ai/index.js';

/** Modular ships: catalogue integrity, derived stats, bonuses and fitting rules. */

const SECOND = 60;
const HARBOUR = 'station-harbour';
const RIDGE = 'station-ridge';
const courier = HULLS['meridian-courier']!;
const wedge = HULLS['kessari-wedge']!;
const spine = HULLS['tessaract-spine']!;

/**
 * A world with one pilot in a starter ship docked at `stationId`, no NPCs.
 * The utility mount is emptied so tests have a free mount to fit into.
 */
/** The same world with outfitting switched off at Ridge, for the rules about stations without it. */
function noOutfitting(w: World): World {
  return { ...w, stations: { ...w.stations, [RIDGE]: { ...w.stations[RIDGE]!, outfitting: false } } };
}

function dockedAt(stationId = HARBOUR, credits = STARTING_CREDITS): { w: World; me: string } {
  const base = { ...createStarterWorld(), ships: {}, npcs: {}, spawners: [] };
  let w = joinPilot(base, 'ana', 'Ana');
  const me = pilotShip(w, 'ana')!.id;
  const st = w.stations[stationId]!;
  // Strip the armour plate, the tractor and fire control so tests have a free
  // internal slot and power to spare (the stock starter runs at full power).
  const { i2: _armour, w3: _tractor, x1: _fireControl, ...fit } = w.ships[me]!.fit;
  const hull = HULLS[w.ships[me]!.hullId]!;
  const stats = fitStats(w, hull, fit);
  w = {
    ...w,
    pilots: { ...w.pilots, ana: { ...w.pilots['ana']!, credits } },
    ships: {
      ...w.ships,
      [me]: { ...w.ships[me]!, fit, hold: {}, structure: stats.structure, state: 'docked', dockedAt: st.id, position: { ...st.position } },
    },
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
      if (m.kind === 'weapon' || m.kind === 'countermeasure') expect(WEAPONS[m.weaponId ?? ''], m.id).toBeDefined();
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
    const fit = { e1: 'meridian-engine-s', c1: 'meridian-thrusters-s', c2: 'meridian-reactor-s', i2: 'rookrivet-armour-s' };
    const s = fitStats(TEST_CATALOGUES, courier, fit);
    const parts = Object.values(fit).map((id) => MODULES[id]!);
    expect(s.mass).toBeCloseTo(courier.mass + parts.reduce((n, m) => n + m.mass, 0), 9);
    expect(s.mainThrust).toBe(MODULES['meridian-engine-s']!.stats.mainThrust);
    expect(s.rotationThrust).toBe(MODULES['meridian-thrusters-s']!.stats.rotationThrust);
    expect(s.structure).toBe(courier.structure + MODULES['rookrivet-armour-s']!.stats.structure!);
    expect(s.powerOutput).toBe(13);
    expect(s.powerDraw).toBe(3);
  });

  it('adds cargo mass on top of the fit', () => {
    const w = joinPilot(createStarterWorld(), 'ana', 'Ana');
    const ship = { ...myShip(w), hold: { ore: 10 } };
    expect(shipStats(w, ship).mass).toBeCloseTo(loadoutStats(STARTER_LOADOUT_ID).mass + 10 * w.goods['ore']!.unitMass, 9);
  });

  it('gives each weapon mount its own effective weapon', () => {
    const s = loadoutStats(STARTER_LOADOUT_ID);
    expect(s.weapons['w1']!.id).toBe('pulse-laser-s');
    expect(s.weapons['w2']!.id).toBe('swivel-s');
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
    const fit = { c1: 'itomarr-reactor-m', u1: 'itomarr-shield-m' };
    const m = MODULES['itomarr-shield-m']!.stats.shield!;
    const s = MODULES['meridian-shield-s']!.stats.shield!;
    expect(fitStats(TEST_CATALOGUES, wedge, fit).shield).toBeCloseTo(m * 1.2, 9);
    expect(fitStats(TEST_CATALOGUES, courier, { c2: 'meridian-reactor-s', u1: 'meridian-shield-s' }).shield).toBe(s);
  });

  it('the Warrant adds damage to full-size launchers only: its family is missiles', () => {
    const s = fitStats(TEST_CATALOGUES, wedge, { w1: 'itomarr-magazine-m', w2: 'itomarr-magazine-s' });
    expect(s.weapons['w1']!.damage).toBeCloseTo(WEAPONS['missile-launcher-m']!.damage * 1.25, 9);
    expect(s.weapons['w2']!.damage).toBe(WEAPONS['missile-launcher-s']!.damage); // undersized
    const guns = fitStats(TEST_CATALOGUES, wedge, { w1: 'union-autocannon-m' });
    expect(guns.weapons['w1']!.damage).toBe(WEAPONS['autocannon-m']!.damage); // not its family
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
    // Since 6f any weapon mount takes a swivel: fire control comes from a fire-control computer.
    expect(mountRefusal(at('meridian-courier', 'w1'), MODULES['paragon-turret-s']!)).toBeNull();
    expect(mountRefusal(at('meridian-courier', 'w2'), MODULES['paragon-turret-s']!)).toBeNull();
    expect(mountRefusal(at('kessari-wedge', 'w1'), MODULES['paragon-pulse-s']!)).toBeNull(); // smaller fits
  });

  it('reactors go on core mounts or in low slots', () => {
    expect(mountRefusal(at('kessari-wedge', 'c1'), MODULES['itomarr-reactor-m']!)).toBeNull();
    expect(mountRefusal(at('kessari-wedge', 'i1'), MODULES['itomarr-reactor-m']!)).toBeNull();
    expect(mountRefusal(at('kessari-wedge', 'u1'), MODULES['itomarr-reactor-m']!)).toBe('wrongMount');
  });
});

describe('fitting', () => {
  it('buys a module it does not own, paying its price plus the fitting fee', () => {
    const { w } = dockedAt();
    const armour = MODULES['rookrivet-armour-s']!;
    const r = fitModule(w, 'ana', 'i2', armour.id);
    const after = ok(r);
    expect(myShip(after).fit['i2']).toBe(armour.id);
    expect(credits(after)).toBe(STARTING_CREDITS - armour.price - fitFee(armour));
    expect(shipStats(after, myShip(after)).structure).toBe(shipStats(w, myShip(w)).structure + armour.stats.structure!);
    expect(r.ok && r.event).toEqual({
      type: 'fitted',
      shipId: myShip(w).id,
      mountId: 'i2',
      moduleId: armour.id,
      replaced: null,
      bought: true,
      cost: armour.price + fitFee(armour),
    });
  });

  it('charges no fitting fee for now (docs/fitting.md)', () => {
    expect(FIT_FEE_FRACTION).toBe(0);
    for (const m of Object.values(MODULES)) expect(fitFee(m)).toBe(0);
  });

  it('unfitting puts the module in storage at this station for a fee', () => {
    const { w } = dockedAt();
    const pod = MODULES['meridian-pod-s']!;
    const r = unfitModule(w, 'ana', 'b1');
    const after = ok(r);
    expect(myShip(after).fit['b1']).toBeUndefined();
    expect(credits(after)).toBe(STARTING_CREDITS - fitFee(pod));
    expect(storedCount(after.pilots['ana']!, HARBOUR, pod.id)).toBe(1);
    expect(shipStats(after, myShip(after)).cargoCapacity).toBe(0);
    expect(r.ok && r.event).toEqual({ type: 'unfitted', shipId: myShip(w).id, mountId: 'b1', moduleId: pod.id, fee: fitFee(pod) });
  });

  it('replacing a module stores the old one and charges both fees', () => {
    const { w } = dockedAt();
    const kick = MODULES['slagline-engine-s']!;
    const steady = MODULES['meridian-engine-s']!;
    const after = ok(fitModule(w, 'ana', 'e1', kick.id));
    expect(credits(after)).toBe(STARTING_CREDITS - kick.price - fitFee(kick) - fitFee(steady));
    expect(storedCount(after.pilots['ana']!, HARBOUR, steady.id)).toBe(1);
  });

  it('fits an owned module from storage for the fee alone', () => {
    const { w } = dockedAt();
    const pod = MODULES['meridian-pod-s']!;
    const stored = ok(unfitModule(w, 'ana', 'b1'));
    const r = fitModule(stored, 'ana', 'b1', pod.id);
    const back = ok(r);
    expect(myShip(back).fit['b1']).toBe(pod.id);
    expect(credits(back)).toBe(STARTING_CREDITS - 2 * fitFee(pod));
    expect(back.pilots['ana']!.storage).toEqual({});
    expect(r.ok && r.event.type === 'fitted' && r.event.bought).toBe(false);
  });

  it('swapping between two owned modules costs only fees', () => {
    const { w } = dockedAt(HARBOUR, 100_000);
    const kick = MODULES['slagline-engine-s']!;
    const steady = MODULES['meridian-engine-s']!;
    const a = ok(fitModule(w, 'ana', 'e1', kick.id)); // steady to storage
    const b = ok(fitModule(a, 'ana', 'e1', steady.id)); // kick to storage, steady back
    expect(credits(a) - credits(b)).toBe(fitFee(steady) + fitFee(kick));
    expect(storedCount(b.pilots['ana']!, HARBOUR, kick.id)).toBe(1);
    expect(storedCount(b.pilots['ana']!, HARBOUR, steady.id)).toBe(0);
  });

  it('sells a stored module back for MODULE_RESALE_FRACTION of its price', () => {
    const { w } = dockedAt();
    const pod = MODULES['meridian-pod-s']!;
    const stored = ok(unfitModule(w, 'ana', 'b1'));
    const r = sellModule(stored, 'ana', pod.id);
    const sold = ok(r);
    expect(resaleValue(pod)).toBe(Math.floor(pod.price * MODULE_RESALE_FRACTION));
    expect(credits(sold)).toBe(credits(stored) + resaleValue(pod));
    expect(sold.pilots['ana']!.storage).toEqual({});
    expect(r.ok && r.event).toEqual({ type: 'moduleSold', shipId: myShip(w).id, stationId: HARBOUR, moduleId: pod.id, credits: resaleValue(pod) });
  });

  it('refuses to sell what is not stored here, or away from outfitting', () => {
    const { w } = dockedAt();
    const notStored = sellModule(w, 'ana', 'meridian-pod-s');
    expect(notStored.ok ? 'ok' : notStored.reason).toBe('notStored');
    expect(notStored.world).toBe(w);
    const ridge = noOutfitting(dockedAt(RIDGE).w);
    const away = sellModule(ridge, 'ana', 'meridian-pod-s');
    expect(away.ok ? 'ok' : away.reason).toBe('noOutfitting');
  });

  it('refuses, and changes nothing, when a rule is broken', () => {
    const { w } = dockedAt();
    const sealed = { ...w, ships: { ...w.ships, [myShip(w).id]: { ...myShip(w), hullId: 'aurel-tacet' } } };
    const laden = { ...w, ships: { ...w.ships, [myShip(w).id]: { ...myShip(w), hold: { food: 5 } } } };
    const cases: Array<[FitResult, string]> = [
      [fitModule(w, 'ana', 'u1', 'meridian-engine-s'), 'wrongMount'],
      [fitModule(w, 'ana', 'w1', 'union-autocannon-m'), 'tooBig'],
      [fitModule(w, 'ana', 'zz', 'meridian-pod-s'), 'unknownMount'],
      [fitModule(w, 'ana', 'u1', 'no-such-module'), 'unknownModule'],
      [fitModule(w, 'ana', 'e1', 'meridian-engine-s'), 'alreadyFitted'],
      [unfitModule(w, 'ana', 'w3'), 'emptyMount'],
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
    // Stripped starter: 12 of 13 power drawn. Make room, take a hungrier engine,
    // then see that 13 of 13 fits and 14 of 13 does not.
    const { w } = dockedAt(HARBOUR, 100_000);
    const noShield = ok(unfitModule(w, 'ana', 'u1')); // draw 10 of 13
    const kick = ok(fitModule(noShield, 'ana', 'e1', 'slagline-engine-s')); // draw 11
    const back = fitModule(kick, 'ana', 'u1', 'meridian-shield-s'); // draw 13: allowed
    expect(back.ok).toBe(true);
    const thirsty = { ...kick.modules, 'meridian-shield-s': { ...kick.modules['meridian-shield-s']!, power: 3 } };
    const r = fitModule({ ...kick, modules: thirsty }, 'ana', 'u1', 'meridian-shield-s'); // draw 14
    expect(r.ok ? 'ok' : r.reason).toBe('power');
  });

  it('refuses when the pilot cannot pay', () => {
    const { w } = dockedAt(HARBOUR, 100);
    const r = fitModule(w, 'ana', 'i2', 'rookrivet-armour-s');
    expect(r.ok ? 'ok' : r.reason).toBe('credits');
  });

  it('happens only while docked at a station with outfitting', () => {
    const ridge = noOutfitting(dockedAt(RIDGE).w);
    expect(planRefit(ridge, 'ana', 'i2', 'rookrivet-armour-s')).toEqual({ ok: false, reason: 'noOutfitting' });
    const { w, me } = dockedAt();
    const flying = { ...w, ships: { ...w.ships, [me]: { ...w.ships[me]!, state: 'flying' as const, dockedAt: null } } };
    expect(planRefit(flying, 'ana', 'i2', 'rookrivet-armour-s')).toEqual({ ok: false, reason: 'notDocked' });
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
    const armoured = ok(fitModule(w, 'ana', 'i2', 'rookrivet-armour-s'));
    const full = { ...armoured, ships: { ...armoured.ships, [myShip(armoured).id]: { ...myShip(armoured), structure: shipStats(armoured, myShip(armoured)).structure } } };
    const bare = ok(unfitModule(full, 'ana', 'i2'));
    expect(myShip(bare).structure).toBe(courier.structure);
  });

  it('a refit changes how the ship flies', () => {
    const { w } = dockedAt(HARBOUR, 100_000);
    const fast = ok(fitModule(w, 'ana', 'e1', 'slagline-engine-s'));
    const speedAfterOneSecond = (world: World): number => {
      const me = myShip(world).id;
      let x: World = { ...world, ships: { ...world.ships, [me]: { ...myShip(world), state: 'flying', dockedAt: null, padId: null, position: { x: 3000, y: 3000 }, velocity: { x: 0, y: 0 } } } };
      for (let i = 0; i < SECOND; i++) x = stepWorld(x, { [me]: { ...emptyInput(), thrustForward: true } });
      return length(x.ships[me]!.velocity);
    };
    expect(speedAfterOneSecond(fast)).toBeGreaterThan(speedAfterOneSecond(w) * 1.1);
  });

  it('a ship with no engine cannot thrust', () => {
    const { w } = dockedAt();
    const noEngine = ok(unfitModule(w, 'ana', 'e1'));
    const me = myShip(noEngine).id;
    let x: World = { ...noEngine, ships: { ...noEngine.ships, [me]: { ...myShip(noEngine), state: 'flying', dockedAt: null, padId: null, position: { x: 3000, y: 3000 }, velocity: { x: 0, y: 0 } } } };
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

  it('warns when a fit cannot thrust, turn or shoot', () => {
    expect(flightWarnings(loadoutStats(STARTER_LOADOUT_ID))).toEqual([]);
    const { e1: _engine, c1: _thrusters, w1: _gun, w2: _turret, ...stripped } = LOADOUTS[STARTER_LOADOUT_ID]!.fit;
    expect(flightWarnings(fitStats(TEST_CATALOGUES, courier, stripped))).toEqual(['noMainThrust', 'noTurning', 'noWeapons']);
  });

  it('a new pilot who fights back in the starter beats the raider, and feels the capacitor', () => {
    // Ana flies at the real pirate AI as the client flies by default: nose on the lead point by mouse, burn in when far, fire when on it.
    let w = joinPilot(createStarterWorld(), 'ana', 'Ana');
    const me = pilotShip(w, 'ana')!.id;
    const pir = Object.keys(w.npcs).find((id) => w.npcs[id]!.kind === 'pirate')!;
    const p = w.ships[pir]!;
    w = { ...w, ships: { ...w.ships, [me]: { ...w.ships[me]!, position: { x: p.position.x + 400, y: p.position.y }, velocity: { ...p.velocity } } } };
    let ranDry = false;
    let seconds = 0;
    for (let t = 0; t < SECOND * 120; t++) {
      const mine = w.ships[me];
      const foe = w.ships[pir];
      if (!mine || !foe) break;
      const gun = Object.values(shipStats(w, mine).weapons).find((x) => x.kind === 'fixed')!;
      const want = toAngle(sub(leadPoint(mine, foe, gun.projectileSpeed), mine.position));
      const err = angleDelta(mine.heading, want);
      const d = distance(mine.position, foe.position);
      w = stepWorld(w, {
        [me]: { ...emptyInput(), aimHeading: want, thrustForward: d > 300 && Math.abs(err) < 0.5, fireFixed: Math.abs(err) < 0.08 && d < gun.range * 0.9, lock: t === 0 ? pir : null, activateLock: t === 0 ? pir : null, toggleWeaponsHot: t === 0 },
      });
      if (w.events.some((e) => e.type === 'capacitorEmpty' && e.shipId === me)) ranDry = true;
      seconds = t / SECOND;
    }
    expect(w.ships[me]).toBeDefined();
    expect(w.ships[pir]).toBeUndefined();
    // Long enough to matter, short enough to be a fight; and the pulse laser drains the pool at least once.
    expect(seconds).toBeGreaterThan(5);
    expect(seconds).toBeLessThan(40);
    expect(ranDry).toBe(true);
  });

  it('every station outfits while Calder is the dev environment', () => {
    for (const st of Object.values(createStarterWorld().stations)) expect(st.outfitting, st.id).toBe(true);
  });

  it('refuses saves from before modular ships', () => {
    const old = JSON.stringify({ format: SAVE_FORMAT, version: 1, savedAt: '', world: {} });
    expect(deserializeWorld(old)).toEqual({ ok: false, reason: 'tooOld' });
  });

  it('upgrades 0.7.0 saves by giving every pilot empty storage', () => {
    const w = joinPilot(createStarterWorld(), 'ana', 'Ana');
    const { storage: _storage, ...pilot } = w.pilots['ana']!;
    const v2 = JSON.stringify({ format: SAVE_FORMAT, version: 2, savedAt: '', world: { ...w, pilots: { ana: pilot } } });
    expect(SAVE_VERSION).toBeGreaterThan(2); // migrates through every version since
    const r = deserializeWorld(v2);
    expect(r.ok && r.world.pilots['ana']).toEqual(w.pilots['ana']);
  });
});

describe('sensor range', () => {
  it('comes only from a fitted radar: a bare hull sees nothing', () => {
    for (const hull of Object.values(HULLS)) {
      expect(fitStats(TEST_CATALOGUES, hull, {}).sensorRange, hull.id).toBe(0);
      // Drones see through their mother's sensors.
      if (hull.class !== 'drone') expect(hull.mounts.filter((m) => m.type === 'radar'), hull.id).toHaveLength(1);
    }
    const radar = MODULES['meridian-radar-s']!;
    expect(fitStats(TEST_CATALOGUES, courier, { r1: radar.id }).sensorRange).toBe(radar.stats.sensorRange);
  });

  it('a new pilot can see as far as a pirate can', () => {
    expect(loadoutStats(STARTER_LOADOUT_ID).sensorRange).toBeGreaterThanOrEqual(PIRATE_TUNING.detectRange);
  });
});
