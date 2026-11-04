import type { ModuleSize, WeaponSpec } from './types.js';

/**
 * Weapon catalogue: ballistic profiles. Data only. A weapon module
 * (modules.ts) names the profile it fires, so two makers can share one
 * gun and differ only in mass, power and price.
 *
 * Four families (docs/weapons.md), each in sizes S, M and L:
 * - projectile: autocannon (short) and artillery (long); no capacitor,
 *   fed with rounds from the hold (goods: a unit is a box of rounds).
 * - energy: pulse laser (short) and beam laser (long); never run dry,
 *   spend capacitor per shot.
 * - hybrid: blaster (very short) and railgun (very long); charges and a
 *   little capacitor.
 * - point defence: swivels, turreted and multi-role, worse than a fixed
 *   gun of their size at everything (the standing rule, enforced by a
 *   test). With no ship to shoot at they shoot down incoming munitions
 *   by themselves (combat.ts).
 * - missile: launchers (Ito-Marr Magazine) and torpedo tubes (Arsenal).
 *   No capacitor; they load munition goods, which bring their own
 *   airframe and warhead (goods.ts). `damage` here is the warhead base
 *   the good scales. They need a complete lock to fire.
 * - countermeasure: dispensers. Not guns at all, but they load boxes and
 *   drop charges by the same machinery. Fire on `launchCountermeasure`.
 *
 * Each size roughly doubles the one below in damage per shot and in
 * capacitor or round cost, a little less in damage per second, so bigger
 * guns are about alpha rather than sustained fire.
 */

type Profile = Omit<WeaponSpec, 'id' | 'name' | 'size'>;

/** Scale a base S profile up a size. */
function sized(id: string, name: string, size: ModuleSize, base: Profile): WeaponSpec {
  const step = { S: 0, M: 1, L: 2, XL: 3 }[size];
  const k = Math.pow(2, step);
  return {
    id,
    name,
    size,
    ...base,
    damage: base.damage * k,
    fireInterval: base.fireInterval * Math.pow(1.15, step),
    capacitorPerShot: base.capacitorPerShot * k,
    range: base.range * Math.pow(1.12, step),
    turretTurnRate: base.turretTurnRate / Math.pow(1.3, step),
  };
}

function family(prefix: string, name: string, base: Profile): Record<string, WeaponSpec> {
  const out: Record<string, WeaponSpec> = {};
  for (const size of ['S', 'M', 'L'] as const) {
    const id = `${prefix}-${size.toLowerCase()}`;
    out[id] = sized(id, `${name} ${size}`, size, base);
  }
  return out;
}

export const WEAPONS: Record<string, WeaponSpec> = {
  // Projectile: no capacitor, rounds from the hold. Autocannon fires fast
  // and close; artillery slow, far and hard.
  ...family('autocannon', 'Autocannon', {
    kind: 'fixed',
    family: 'projectile',
    damage: 7,
    damageType: 'kinetic',
    fireInterval: 0.2, // 35 dps at S
    projectileSpeed: 850,
    range: 700,
    turretTurnRate: 0,
    capacitorPerShot: 0,
    ammo: 'rounds',
    magazine: 100,
    reloadSeconds: 4,
  }),
  ...family('artillery', 'Artillery', {
    kind: 'fixed',
    family: 'projectile',
    damage: 30,
    damageType: 'kinetic',
    fireInterval: 1.2, // 25 dps at S, in big hits
    projectileSpeed: 1100,
    range: 1300,
    turretTurnRate: 0,
    capacitorPerShot: 0,
    ammo: 'shells',
    magazine: 20,
    reloadSeconds: 6,
  }),

  // Energy: capacitor per shot, never run dry. Pulse close and quick, beam
  // long and steady.
  ...family('pulse-laser', 'Pulse laser', {
    kind: 'fixed',
    family: 'energy',
    damage: 6,
    damageType: 'thermal',
    fireInterval: 0.12, // 50 dps at S
    projectileSpeed: 900,
    range: 700,
    turretTurnRate: 0,
    capacitorPerShot: 1.6,
    ammo: null,
    magazine: 0,
    reloadSeconds: 0,
  }),
  ...family('beam-laser', 'Beam laser', {
    kind: 'fixed',
    family: 'energy',
    damage: 16,
    damageType: 'thermal',
    fireInterval: 0.4, // 40 dps at S
    projectileSpeed: 1400,
    range: 1100,
    turretTurnRate: 0,
    capacitorPerShot: 5,
    ammo: null,
    magazine: 0,
    reloadSeconds: 0,
  }),

  // Hybrid: charges plus a little capacitor. Blaster is point blank and
  // brutal, railgun reaches furthest of all.
  ...family('blaster', 'Blaster', {
    kind: 'fixed',
    family: 'hybrid',
    damage: 11,
    damageType: 'thermal',
    fireInterval: 0.18, // about 61 dps at S
    projectileSpeed: 700,
    range: 380,
    turretTurnRate: 0,
    capacitorPerShot: 1,
    ammo: 'charges',
    magazine: 80,
    reloadSeconds: 4,
  }),
  ...family('railgun', 'Railgun', {
    kind: 'fixed',
    family: 'hybrid',
    damage: 22,
    damageType: 'kinetic',
    fireInterval: 0.9, // about 24 dps at S
    projectileSpeed: 1800,
    range: 1600,
    turretTurnRate: 0,
    capacitorPerShot: 3,
    ammo: 'charges',
    magazine: 40,
    reloadSeconds: 5,
  }),

  // Swivels: the point defence family. Turreted, light rounds, modest
  // damage, but they aim themselves.
  ...family('swivel', 'Swivel', {
    kind: 'turret',
    family: 'pointDefence',
    damage: 4,
    damageType: 'kinetic',
    fireInterval: 0.2, // 20 dps at S
    projectileSpeed: 800,
    range: 650,
    turretTurnRate: 4,
    capacitorPerShot: 0,
    ammo: 'rounds',
    magazine: 200,
    reloadSeconds: 3,
  }),

  // Launchers: no capacitor, whole boxes of munitions. The munition
  // brings speed, turning and warhead; the launcher brings rate and how
  // many it holds. Range here is how far a missile flies before burning out.
  'missile-launcher-s': launcher('missile-launcher-s', 'Missile launcher S', 'S', 'missile', 36, 2.5, 8, 8, 3800),
  'missile-launcher-m': launcher('missile-launcher-m', 'Missile launcher M', 'M', 'missile', 72, 2.5, 16, 8, 3800),
  'missile-launcher-l': launcher('missile-launcher-l', 'Missile launcher L', 'L', 'missile', 144, 2.5, 24, 8, 3800),
  'torpedo-tube-m': launcher('torpedo-tube-m', 'Torpedo tube M', 'M', 'torpedo', 160, 6, 4, 12, 3400),
  'torpedo-tube-l': launcher('torpedo-tube-l', 'Torpedo tube L', 'L', 'torpedo', 320, 6, 8, 12, 3400),

  // Dispensers: a box of charges, one drop at a time.
  'dispenser-s': dispenser('dispenser-s', 'Dispenser S', 'S', 12, 1),
  'dispenser-m': dispenser('dispenser-m', 'Dispenser M', 'M', 24, 0.8),
};

function launcher(id: string, name: string, size: ModuleSize, slot: 'missile' | 'torpedo', damage: number, interval: number, magazine: number, reload: number, range: number): WeaponSpec {
  return {
    id, name, size, kind: 'fixed', family: 'missile', damage, damageType: 'explosive', fireInterval: interval,
    projectileSpeed: slot === 'missile' ? 420 : 210, range, turretTurnRate: 0, capacitorPerShot: 0, ammo: slot, magazine, reloadSeconds: reload,
  };
}

function dispenser(id: string, name: string, size: ModuleSize, magazine: number, interval: number): WeaponSpec {
  return {
    id, name, size, kind: 'fixed', family: 'countermeasure', damage: 0, damageType: 'kinetic', fireInterval: interval,
    projectileSpeed: 0, range: 0, turretTurnRate: 0, capacitorPerShot: 0, ammo: 'countermeasure', magazine, reloadSeconds: 4,
  };
}

/** True for a weapon that fires a shot: a gun, not a launcher or a dispenser. */
export function isGun(w: Pick<WeaponSpec, 'family'>): boolean {
  return w.family !== 'missile' && w.family !== 'countermeasure';
}

/** Damage per second of a weapon held on target, with its base ammunition. */
export function weaponDps(w: WeaponSpec): number {
  return w.damage / w.fireInterval;
}
