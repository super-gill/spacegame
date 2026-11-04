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
 *   test). Point defence against munitions comes in part 2.
 * Missiles and torpedoes are part 2.
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
    magazine: 40,
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
    magazine: 8,
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
    magazine: 30,
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
    magazine: 12,
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
    magazine: 60,
    reloadSeconds: 3,
  }),
};

/** Damage per second of a weapon held on target, with its base ammunition. */
export function weaponDps(w: WeaponSpec): number {
  return w.damage / w.fireInterval;
}
