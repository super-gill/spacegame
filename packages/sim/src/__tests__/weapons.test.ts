import { describe, expect, it } from 'vitest';
import { applyDamage, fireWeapons, rechargeCapacitor, withinArc } from '../combat.js';
import { FIXED_DT, SHIELD_CAPACITOR_PER_POINT } from '../constants.js';
import { buildShip } from '../factory.js';
import { GOODS, goodsFitting } from '../goods.js';
import { HULLS } from '../hulls.js';
import { LOADOUTS } from '../loadouts.js';
import { MODULES } from '../modules.js';
import { deserializeWorld, serializeWorld } from '../save.js';
import { fitStats, shipStats } from '../stats.js';
import { stepWorld } from '../step.js';
import type { Ship, ShipInput, World } from '../types.js';
import { isGun, WEAPONS, weaponDps } from '../weapons.js';
import { createStarterWorld, emptyInput } from '../world.js';
import { TEST_CATALOGUES } from './fixtures.js';

/** 6e part 1: the capacitor, weapon families, ammunition, damage types, arcs and fire groups. */

const SECOND = 60;

function quiet(): World {
  return { ...createStarterWorld(), ships: {}, npcs: {}, spawners: [] };
}

/** A ship from a loadout in flat space, with the given fit changes, hold and heading. */
function shipOf(w: World, id: string, loadoutId: string, fit: Record<string, string> = {}, hold: Record<string, number> = {}, heading = 0): Ship {
  const base = buildShip(w, { id, loadout: LOADOUTS[loadoutId]!, ownerId: null, position: { x: -7000, y: -7000 }, heading, flightMode: 'manual' });
  const merged = { ...base, fit: { ...base.fit, ...fit }, hold };
  // Rebuild weapon states for the changed fit.
  const rebuilt = buildShip(w, { id, loadout: { id: 'x', name: 'x', hullId: base.hullId, fit: merged.fit }, ownerId: null, position: base.position, heading, flightMode: 'manual' });
  return { ...rebuilt, hold };
}

const fire: ShipInput = { ...emptyInput(), fireFixed: true };

describe('the catalogue', () => {
  it('has every gun in S, M and L, and the swivel small only', () => {
    for (const prefix of ['autocannon', 'artillery', 'pulse-laser', 'beam-laser', 'blaster', 'railgun']) {
      for (const size of ['s', 'm', 'l']) expect(WEAPONS[`${prefix}-${size}`], `${prefix}-${size}`).toBeDefined();
    }
    expect(WEAPONS['swivel-s']).toBeDefined();
    for (const w of Object.values(WEAPONS)) {
      if (w.family === 'energy') expect(w.ammo).toBeNull();
      if (w.family === 'projectile') expect(w.capacitorPerShot).toBe(0);
      if (w.ammo) expect(goodsFitting(GOODS, w.ammo).length, `${w.id} loads a real good`).toBeGreaterThan(0);
    }
  });

  it('keeps the rule: every fixed gun out-damages the small swivel', () => {
    const swivel = WEAPONS['swivel-s']!;
    for (const size of ['S', 'M', 'L'] as const) {
      for (const gun of Object.values(WEAPONS).filter((w) => w.kind === 'fixed' && isGun(w) && w.size === size)) {
        expect(weaponDps(gun), `${gun.id} vs ${swivel.id}`).toBeGreaterThan(weaponDps(swivel));
      }
    }
  });

  it('every weapon module fits a mount of its size and names a weapon of that size', () => {
    for (const m of Object.values(MODULES).filter((m) => m.kind === 'weapon')) {
      const w = WEAPONS[m.weaponId!];
      expect(w, m.id).toBeDefined();
      expect(w!.size, m.id).toBe(m.size);
      // Since 6f a swivel fits any weapon mount; a fire-control computer directs it.
    }
  });

  it('every hull has a class and a capacitor', () => {
    for (const h of Object.values(HULLS)) {
      expect(h.class, h.id).toBeDefined();
      expect(h.capacitor, h.id).toBeGreaterThan(0);
      expect(h.capacitorRecharge, h.id).toBeGreaterThan(0);
    }
    expect(HULLS['tessaract-spine']!.class).toBe('merchantman');
    expect(HULLS['meridian-courier']!.class).toBe('cutter');
  });
});

describe('the capacitor', () => {
  it('energy guns spend it per shot and stop firing when it is empty; projectile guns do not touch it', () => {
    const w = quiet();
    let laser = shipOf(w, 'laser', 'meridian-starter');
    laser = { ...laser, capacitor: 10 };
    const stats = shipStats(w, laser);
    let shots = 0;
    let dryEvents = 0;
    for (let i = 0; i < SECOND * 2; i++) {
      const r = fireWeapons(laser, stats, fire, () => null, FIXED_DT, i * 10, w);
      laser = r.ship;
      shots += r.projectiles.length;
      dryEvents += r.events.filter((e) => e.type === 'capacitorEmpty').length;
    }
    expect(shots).toBe(Math.floor(10 / WEAPONS['pulse-laser-s']!.capacitorPerShot));
    expect(laser.capacitor).toBeLessThan(WEAPONS['pulse-laser-s']!.capacitorPerShot);
    expect(dryEvents).toBeGreaterThan(0);

    let gun = shipOf(w, 'gun', 'meridian-starter', { w1: 'union-picket-s' }, { rounds: 2 });
    gun = { ...gun, capacitor: 0 };
    const r = fireWeapons(gun, shipStats(w, gun), fire, () => null, FIXED_DT, 1, w);
    expect(r.projectiles.length).toBe(1);
    expect(r.ship.capacitor).toBe(0);
  });

  it('recharges from empty, fastest when low, and drains for full-size sensors', () => {
    const w = quiet();
    const s = shipOf(w, 's', 'meridian-starter');
    const stats = shipStats(w, s);
    let empty = { ...s, capacitor: 0 };
    let half = { ...s, capacitor: stats.capacitor * 0.5 };
    let nearFull = { ...s, capacitor: stats.capacitor * 0.95 };
    for (let i = 0; i < SECOND; i++) {
      empty = rechargeCapacitor(empty, stats, FIXED_DT);
      half = rechargeCapacitor(half, stats, FIXED_DT);
      nearFull = rechargeCapacitor(nearFull, stats, FIXED_DT);
    }
    expect(empty.capacitor).toBeGreaterThan(0);
    const gained = (a: Ship, from: number) => a.capacitor - from;
    expect(gained(half, stats.capacitor * 0.5)).toBeGreaterThan(gained(nearFull, stats.capacitor * 0.95));
    expect(rechargeCapacitor({ ...s, capacitor: stats.capacitor }, stats, FIXED_DT).capacitor).toBeLessThanOrEqual(stats.capacitor);
    // The starter's small radar, plotter and nav computer fill their small mounts, so they draw.
    expect(stats.capacitorDraw).toBeGreaterThan(0);
    // An undersized module draws nothing.
    const wedge = HULLS['kessari-wedge']!;
    const small = fitStats(TEST_CATALOGUES, wedge, { t1: 'meridian-computer-s' }); // S computer on the Warrant's M mount
    const full = fitStats(TEST_CATALOGUES, wedge, { t1: 'paragon-computer-m' });
    expect(small.capacitorDraw).toBe(0);
    expect(full.capacitorDraw).toBeGreaterThan(0);
  });

  it('shield recharge spends capacitor', () => {
    const w = quiet();
    const s = shipOf(w, 's', 'meridian-starter');
    const stats = shipStats(w, s);
    let x: World = { ...w, ships: { s: { ...s, shield: 0, shieldDelayTicks: 0, capacitor: stats.capacitor } } };
    for (let i = 0; i < SECOND * 2; i++) x = stepWorld(x, {});
    const restored = x.ships['s']!.shield;
    expect(restored).toBeGreaterThan(0);
    // Less than full after two seconds, so the recharge itself is what cost it.
    expect(x.ships['s']!.capacitor).toBeLessThan(stats.capacitor - restored * SHIELD_CAPACITOR_PER_POINT * 0.5);
  });

  it('is refilled at once when docked', () => {
    let w = quiet();
    const harbour = w.stations['station-harbour']!;
    const s = { ...shipOf(w, 's', 'meridian-starter'), capacitor: 0, state: 'docked' as const, dockedAt: harbour.id, padId: 's1', position: { ...harbour.position }, velocity: { ...harbour.velocity } };
    w = { ...w, ships: { s } };
    w = stepWorld(w, {});
    expect(w.ships['s']!.capacitor).toBe(shipStats(w, w.ships['s']!).capacitor);
  });
});

describe('ammunition', () => {
  it('fires from the magazine, reloads whole boxes from the hold, and runs dry', () => {
    const w = quiet();
    const spec = WEAPONS['autocannon-s']!;
    const perBox = GOODS['rounds']!.ammo!.perUnit;
    let s = shipOf(w, 's', 'meridian-starter', { w1: 'union-picket-s', w2: 'union-picket-s' }, { rounds: 1 });
    // Only w1 is in group 1 by default? Both fixed guns default to group 1; empty the magazine of each.
    const stats = shipStats(w, s);
    let shots = 0;
    let dry = 0;
    for (let i = 0; i < SECOND * 90; i++) {
      const r = fireWeapons(s, stats, fire, () => null, FIXED_DT, i * 10, w);
      s = r.ship;
      shots += r.projectiles.length;
      dry += r.events.filter((e) => e.type === 'outOfAmmo').length;
    }
    // Two magazines, plus one box of 20 reloaded into whichever gun emptied first.
    expect(shots).toBe(spec.magazine * 2 + perBox);
    expect(s.hold['rounds']).toBeUndefined();
    expect(dry).toBeGreaterThan(0);
  });

  it('ammunition is a good: bought at a station, carried in the hold, adding mass', () => {
    const w = createStarterWorld();
    expect(w.stations['station-harbour']!.market['rounds']?.ask).toBeGreaterThan(0);
    const light = shipOf(w, 'a', 'meridian-starter', {}, {});
    const laden = { ...light, hold: { rounds: 5 } };
    expect(shipStats(w, laden).mass).toBeGreaterThan(shipStats(w, light).mass);
  });
});

describe('damage types', () => {
  it('a shot carries its type, and defences resist by type', () => {
    const w = quiet();
    const s = shipOf(w, 's', 'meridian-starter', { w1: 'union-picket-s' }, { rounds: 1 });
    const r = fireWeapons(s, shipStats(w, s), fire, () => null, FIXED_DT, 1, w);
    expect(r.projectiles[0]!.damageType).toBe('kinetic');
    const laser = shipOf(w, 'l', 'meridian-starter');
    expect(fireWeapons(laser, shipStats(w, laser), fire, () => null, FIXED_DT, 1, w).projectiles[0]!.damageType).toBe('thermal');

    const target = shipOf(w, 't', 'meridian-starter');
    const stats = shipStats(w, target);
    const heat = applyDamage(target, stats, 50, FIXED_DT, 'thermal');
    const rounds = applyDamage(target, stats, 50, FIXED_DT, 'kinetic');
    // Shields stop more heat than rounds.
    expect(heat.shield).toBeGreaterThan(rounds.shield);
  });
});

describe('arcs and fire groups', () => {
  it("a swivel cannot slew outside its mount's arc", () => {
    const hull = HULLS['tessaract-spine']!;
    const mount = hull.mounts.find((m) => m.id === 'w1')!;
    const ship = shipOf(quiet(), 's', 'tessaract-trader');
    expect(withinArc(ship, mount, 0)).toBe(true); // dead ahead
    expect(withinArc(ship, mount, Math.PI / 2 - 0.1)).toBe(true); // just inside the half circle
    expect(withinArc(ship, mount, Math.PI)).toBe(false); // astern
  });

  it('Space fires only the selected group; a number key changes it', () => {
    let w = quiet();
    let s = shipOf(w, 's', 'meridian-starter', { w1: 'union-picket-s' }, { rounds: 2 });
    s = { ...s, weapons: s.weapons.map((x) => (x.mountId === 'w1' ? { ...x, group: 2 } : x)) };
    w = { ...w, ships: { s } };
    let a = stepWorld(w, { s: fire });
    expect(a.projectiles.length).toBe(0); // group 1 has nothing fixed (w2 is a swivel)
    let b = stepWorld(w, { s: { ...fire, selectGroup: 2 } });
    expect(b.events).toContainEqual({ type: 'fireGroupChanged', shipId: 's', group: 2 });
    expect(b.projectiles.length).toBe(1);
  });
});

describe('saves', () => {
  it('ships from before 6e gain a full capacitor, group 1 and loaded magazines', () => {
    const w = createStarterWorld();
    const env = JSON.parse(serializeWorld(w, ''));
    for (const s of Object.values(env.world.ships) as Record<string, unknown>[]) {
      delete s['capacitor'];
      delete s['fireGroup'];
      for (const wp of s['weapons'] as Record<string, unknown>[]) {
        delete wp['loaded'];
        delete wp['reloadTicks'];
        delete wp['group'];
      }
    }
    const r = deserializeWorld(JSON.stringify(env));
    if (!r.ok) throw new Error(r.reason);
    for (const s of Object.values(r.world.ships)) {
      expect(s.capacitor).toBe(HULLS[s.hullId]!.capacitor);
      expect(s.fireGroup).toBe(1);
      for (const wp of s.weapons) expect(wp.loaded).toBeGreaterThanOrEqual(0);
    }
  });
});
