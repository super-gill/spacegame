import { CIWS, GUN_SPREAD_DEGREES, GUN_TRAVERSE, LASER_FALLOFF, SHOT_SPEED_FALLOFF, TURRET_SLEW_FALLOFF } from './constants.js';
import type { ModuleSize, RangeFalloff, WeaponSpec } from './types.js';

/**
 * Weapon catalogue: ballistic profiles. Data only. A weapon module
 * (modules.ts) names the profile it fires, so two makers can share one
 * gun and differ only in mass, power and price.
 *
 * Four families (docs/weapons.md), each in sizes S, M and L. Every main
 * gun is a turret (docs/turrets.md): it follows the active lock and fires
 * with its group when it bears, inside its mount's arc. Traverse by size
 * is what keeps big guns off small, quick ships.
 * - projectile: autocannon (short) and artillery (long); no capacitor,
 *   fed with rounds from the hold (goods: a unit is a box of rounds).
 * - energy: pulse laser (short) and beam laser (long); never run dry,
 *   spend capacitor per shot.
 * - hybrid: blaster (very short) and railgun (very long); charges and a
 *   little capacitor.
 * - point defence: close-in weapon systems (CIWS), on `ciws` hardpoints
 *   that only medium hulls and up have. Very fast, short-ranged; they
 *   shoot down incoming munitions by themselves and engage ships when
 *   weapons are hot (combat.ts). Small ships rely on dispensers.
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
 * crossing close outruns their aim (docs/turrets.md, "Main guns").
 */

type Profile = Omit<WeaponSpec, 'id' | 'name' | 'size'>;

function degrees(d: number): number {
  return (d * Math.PI) / 180;
}

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
    kind: 'turret',
    family: 'projectile',
    damage: 7,
    damageType: 'kinetic',
    fireInterval: 0.2, // 35 dps at S
    projectileSpeed: 850,
    range: 700,
    turretTurnRate: GUN_TRAVERSE,
    capacitorPerShot: 0,
    ammo: 'rounds',
    magazine: 100,
    reloadSeconds: 4,
    spread: degrees(GUN_SPREAD_DEGREES.autocannon),
  }),
  ...family('artillery', 'Artillery', {
    kind: 'turret',
    family: 'projectile',
    damage: 30,
    damageType: 'kinetic',
    fireInterval: 1.2, // 25 dps at S, in big hits
    projectileSpeed: 1100,
    range: 1300,
    turretTurnRate: GUN_TRAVERSE,
    capacitorPerShot: 0,
    ammo: 'shells',
    magazine: 20,
    reloadSeconds: 6,
    spread: degrees(GUN_SPREAD_DEGREES.artillery),
  }),

  // Energy: capacitor per shot, never run dry. Pulse close and quick, beam
  // long and steady.
  ...family('pulse-laser', 'Pulse laser', {
    kind: 'turret',
    family: 'energy',
    damage: 6,
    damageType: 'thermal',
    fireInterval: 0.12, // 50 dps at S
    projectileSpeed: 900,
    range: 700,
    turretTurnRate: GUN_TRAVERSE,
    capacitorPerShot: 1.6,
    ammo: null,
    magazine: 0,
    reloadSeconds: 0,
    falloff: LASER_FALLOFF,
  }),
  ...family('beam-laser', 'Beam laser', {
    kind: 'turret',
    family: 'energy',
    damage: 16,
    damageType: 'thermal',
    fireInterval: 0.4, // 40 dps at S
    projectileSpeed: 1400,
    range: 1100,
    turretTurnRate: GUN_TRAVERSE,
    capacitorPerShot: 5,
    ammo: null,
    magazine: 0,
    reloadSeconds: 0,
    falloff: LASER_FALLOFF,
  }),

  // Hybrid: charges plus a little capacitor. Blaster is point blank and
  // brutal, railgun reaches furthest of all.
  ...family('blaster', 'Blaster', {
    kind: 'turret',
    family: 'hybrid',
    damage: 11,
    damageType: 'thermal',
    fireInterval: 0.18, // about 61 dps at S
    projectileSpeed: 700,
    range: 380,
    turretTurnRate: GUN_TRAVERSE,
    capacitorPerShot: 1,
    ammo: 'charges',
    magazine: 80,
    reloadSeconds: 4,
    spread: degrees(GUN_SPREAD_DEGREES.blaster),
  }),
  ...family('railgun', 'Railgun', {
    kind: 'turret',
    family: 'hybrid',
    damage: 22,
    damageType: 'kinetic',
    fireInterval: 0.9, // about 24 dps at S
    projectileSpeed: 1800,
    range: 1600,
    turretTurnRate: GUN_TRAVERSE,
    capacitorPerShot: 3,
    ammo: 'charges',
    magazine: 40,
    reloadSeconds: 5,
    spread: degrees(GUN_SPREAD_DEGREES.railgun),
  }),

  // Close-in weapon systems (docs/turrets.md): point defence for medium
  // hulls and up, on their own hardpoints. A light round about 30 times a
  // second, short-ranged and quick to traverse, with a deep magazine fed
  // from boxes of rounds. Inside 350 a small ship melts; outside, it is
  // untouched. Munitions first, ships when weapons are hot (combat.ts).
  'ciws-m': {
    id: 'ciws-m',
    name: 'PDC M',
    size: 'M',
    kind: 'turret',
    family: 'pointDefence',
    damage: CIWS.damage,
    damageType: 'kinetic',
    fireInterval: CIWS.fireInterval,
    projectileSpeed: CIWS.projectileSpeed,
    range: CIWS.range,
    turretTurnRate: CIWS.traverse,
    capacitorPerShot: 0,
    ammo: 'rounds',
    magazine: CIWS.magazine,
    reloadSeconds: CIWS.reloadSeconds,
  },

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

/** True for a main gun: a turret fired on the trigger at the lock, not a CIWS, launcher, dispenser or mining laser. */
export function isMainGun(w: Pick<WeaponSpec, 'family'>): boolean {
  return isGun(w) && w.family !== 'pointDefence';
}

/**
 * What share of its damage a shot does after flying `travelled` (0 to 1)
 * of its range: 1 with no falloff, else full to `from`, then straight
 * down to `floor` at full range (docs/turrets.md, "Range").
 */
export function falloffFactor(falloff: RangeFalloff | undefined, travelled: number): number {
  if (!falloff || travelled <= falloff.from) return 1;
  const t = Math.min(1, (travelled - falloff.from) / (1 - falloff.from));
  return 1 - t * (1 - falloff.floor);
}

/** Damage per second of a weapon held on target, with its base ammunition. */
export function weaponDps(w: WeaponSpec): number {
  return w.damage / w.fireInterval;
}
