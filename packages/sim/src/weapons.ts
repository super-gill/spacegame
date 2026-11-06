import { MAIN_TURRET_DAMAGE, MAIN_TURRET_SLEW, SHOT_SPEED_FALLOFF, TURRET_SLEW_FALLOFF } from './constants.js';
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
 * - point defence: swivels, small only, turreted and multi-role: light
 *   rounds fired fast (30 a second), so every fixed gun hits harder per shot (the
 *   standing rule, enforced by a test), but a battery of them puts out a
 *   lot of fire. With no ship to shoot at they shoot down incoming munitions
 *   by themselves (combat.ts).
 * - missile: launchers (Ito-Marr Magazine) and torpedo tubes (Arsenal).
 *   No capacitor; they load munition goods, which bring their own
 *   airframe and warhead (goods.ts). `damage` here is the warhead base
 *   the good scales. They need a complete lock to fire.
 * - countermeasure: dispensers. Not guns at all, but they load boxes and
 *   drop charges by the same machinery. Fire on `launchCountermeasure`.
 * - mining: mining lasers (docs/mining.md). Not guns either: a beam along
 *   the nose while held, cutting ore from rocks no harder than its
 *   `mining.strength`. `damage` is ore freed per second and
 *   `capacitorPerShot` capacitor per second. Fire group 3 by default.
 *
 * Each size roughly doubles the one below in damage per shot and in
 * capacitor or round cost, a little less in damage per second, so bigger
 * guns are about alpha rather than sustained fire. Nothing cuts a big
 * gun's damage against a small ship: physics does that. Bigger shots fly
 * slower (`SHOT_SPEED_FALLOFF`), so a quick target slips them at range,
 * and bigger turrets slew slower (`TURRET_SLEW_FALLOFF`), so a small ship
 * crossing close outruns their aim (docs/fitting.md, "As built: step 4").
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
    turretTurnRate: base.turretTurnRate / Math.pow(TURRET_SLEW_FALLOFF, step),
    projectileSpeed: base.projectileSpeed / Math.pow(SHOT_SPEED_FALLOFF, step),
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

  // Swivels: the point defence family, small only (Jason: a PDC is
  // always small; a big ship carries several). Turreted, light rounds,
  // modest damage, but they aim themselves and shoot down munitions.
  'swivel-s': sized('swivel-s', 'Swivel S', 'S', {
    kind: 'turret',
    family: 'pointDefence',
    // Light rounds, fast (Jason, 6 November): a battery of swivels shreds
    // small ships, while a big ship's shields and plate shrug them off.
    damage: 3,
    damageType: 'kinetic',
    fireInterval: 0.1, // 30 dps (Jason, 6 November: 40 made fixed guns feel secondary)
    projectileSpeed: 800,
    // Further than any small ship's guns reach (Jason, 6 November): a
    // small ship making passes flies through point defence fire.
    range: 900,
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

  // Mining lasers. Slow on purpose: cutting, not hauling, should be most
  // of a mining trip (about 45 seconds to fill a prospector). A light one
  // fits a weapon mount and cuts soft, small rocks; the medium cuts most of what a cutter or sloop will meet. Heavy
  // lasers for the hulk's mining mounts come with part 2.
  'mining-laser-s': miningLaser('mining-laser-s', 'Mining laser S', 'S', 0.45, 0.75, 4, 260),
  'mining-laser-m': miningLaser('mining-laser-m', 'Mining laser M', 'M', 0.7, 1.3, 8, 300),
  // Heavy mining turrets for a hulk's mining mounts: each is assigned a
  // locked rock and cuts it on its own, slewing to keep the beam on it.
  // Strong enough for any rock in the Scree.
  // A mining drone's laser: weak and short, but a drone parks on the seam.
  'mining-laser-drone': miningLaser('mining-laser-drone', 'Drone mining laser', 'S', 0.5, 0.6, 3, 90),
  'mining-turret-l': miningLaser('mining-turret-l', 'Mining turret L', 'L', 1, 2.2, 10, 480, 0.8),
};

/** The main guns that also come turreted, by profile prefix. */
const TURRETED_GUNS = ['autocannon', 'artillery', 'pulse-laser', 'beam-laser', 'blaster', 'railgun'];

/**
 * Turreted main guns (Jason, 5 November): the fixed gun's profile on a
 * turret, medium and large only. They engage the lock and need no fire
 * control, but they are no point defence, they do less damage than the
 * fixed gun of their size (the standing rule), and they traverse slowly,
 * the large ones very slowly: a small ship crossing close outruns them.
 */
for (const prefix of TURRETED_GUNS) {
  for (const size of ['M', 'L'] as const) {
    const fixed = WEAPONS[`${prefix}-${size.toLowerCase()}`]!;
    const id = `${prefix}-turret-${size.toLowerCase()}`;
    const step = { S: 0, M: 1, L: 2, XL: 3 }[size];
    WEAPONS[id] = {
      ...fixed,
      id,
      name: fixed.name.replace(/ (M|L)$/, ` turret $1`),
      kind: 'turret',
      damage: fixed.damage * MAIN_TURRET_DAMAGE,
      turretTurnRate: MAIN_TURRET_SLEW / Math.pow(TURRET_SLEW_FALLOFF, step),
    };
  }
}

function miningLaser(id: string, name: string, size: ModuleSize, strength: number, yieldPerSecond: number, capacitorPerSecond: number, range: number, turretTurnRate = 0): WeaponSpec {
  return {
    id, name, size, kind: turretTurnRate > 0 ? 'turret' : 'fixed', family: 'mining', damage: yieldPerSecond, damageType: 'thermal', fireInterval: 1,
    projectileSpeed: 0, range, turretTurnRate, capacitorPerShot: capacitorPerSecond, ammo: null, magazine: 0, reloadSeconds: 0,
    mining: { strength },
  };
}

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

/** True for a weapon that fires a shot: a gun, not a launcher, a dispenser or a mining laser. */
export function isGun(w: Pick<WeaponSpec, 'family'>): boolean {
  return w.family !== 'missile' && w.family !== 'countermeasure' && w.family !== 'mining';
}

/** Damage per second of a weapon held on target, with its base ammunition. */
export function weaponDps(w: WeaponSpec): number {
  return w.damage / w.fireInterval;
}
