import type { WeaponSpec } from './types.js';

/**
 * Weapon catalogue: ballistic profiles. Data only. A weapon module
 * (modules.ts) names the profile it fires, so two makers can share one
 * gun and differ only in mass, power and price.
 *
 * The rule (enforced by a test): at the same size, a fixed weapon always
 * does more damage per second than a turret. Fixed weapons are aimed by
 * flying the hull, which takes skill; turrets aim themselves and pay for
 * it in damage.
 */
export const WEAPONS: Record<string, WeaponSpec> = {
  'pulse-cannon': {
    id: 'pulse-cannon',
    name: 'Pulse cannon',
    kind: 'fixed',
    size: 'S',
    damage: 6,
    fireInterval: 0.12, // 50 damage per second
    projectileSpeed: 900,
    range: 700,
    turretTurnRate: 0,
  },
  'light-turret': {
    id: 'light-turret',
    name: 'Light turret',
    kind: 'turret',
    size: 'S',
    damage: 4,
    fireInterval: 0.2, // 20 damage per second
    projectileSpeed: 800,
    range: 650,
    turretTurnRate: 4,
  },
  autocannon: {
    id: 'autocannon',
    name: 'Autocannon',
    kind: 'fixed',
    size: 'M',
    damage: 14,
    fireInterval: 0.2, // 70 damage per second
    projectileSpeed: 850,
    range: 750,
    turretTurnRate: 0,
  },
  'medium-turret': {
    id: 'medium-turret',
    name: 'Medium turret',
    kind: 'turret',
    size: 'M',
    damage: 10,
    fireInterval: 0.3, // about 33 damage per second
    projectileSpeed: 780,
    range: 700,
    turretTurnRate: 2.8,
  },
};

/** Damage per second of a weapon held on target. */
export function weaponDps(w: WeaponSpec): number {
  return w.damage / w.fireInterval;
}
