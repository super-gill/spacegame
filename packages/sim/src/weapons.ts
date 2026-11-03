import type { WeaponSpec } from './types.js';

/**
 * Weapon catalogue. Data only.
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
    size: 'light',
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
    size: 'light',
    damage: 4,
    fireInterval: 0.2, // 20 damage per second
    projectileSpeed: 800,
    range: 650,
    turretTurnRate: 4,
  },
};

/** Damage per second of a weapon held on target. */
export function weaponDps(w: WeaponSpec): number {
  return w.damage / w.fireInterval;
}
