import { describe, expect, it } from 'vitest';
import { scatter, stepProjectiles } from '../combat.js';
import { FIXED_DT, GUN_SPREAD_DEGREES, LASER_FALLOFF } from '../constants.js';
import { buildShip } from '../factory.js';
import { LOADOUTS } from '../loadouts.js';
import type { Projectile } from '../types.js';
import { falloffFactor, isMainGun, WEAPONS } from '../weapons.js';
import { TEST_CATALOGUES } from './fixtures.js';

/**
 * The turret model, build step 2 (docs/turrets.md, "Range"): range costs
 * shot guns accuracy, not damage, and costs lasers power.
 */

const DEG = Math.PI / 180;

describe('spread', () => {
  it('shot guns carry their cone at every size; lasers fly straight', () => {
    for (const w of Object.values(WEAPONS).filter((x) => isMainGun(x))) {
      const stem = w.id.replace(/-[sml]$/, '') as keyof typeof GUN_SPREAD_DEGREES;
      if (w.family === 'energy') expect(w.spread, w.id).toBeUndefined();
      else expect(w.spread!, w.id).toBeCloseTo(GUN_SPREAD_DEGREES[stem] * DEG);
    }
    // The long guns are the true ones.
    expect(WEAPONS['railgun-l']!.spread!).toBeLessThan(WEAPONS['artillery-l']!.spread!);
    expect(WEAPONS['artillery-l']!.spread!).toBeLessThan(WEAPONS['autocannon-l']!.spread!);
  });

  it('scatters each shot inside its cone, the same way every time, and not all alike', () => {
    const spread = 2 * DEG;
    const offsets = Array.from({ length: 200 }, (_, i) => scatter(`p${i}`, spread));
    for (const o of offsets) expect(Math.abs(o)).toBeLessThanOrEqual(spread);
    expect(offsets).toEqual(Array.from({ length: 200 }, (_, i) => scatter(`p${i}`, spread)));
    expect(new Set(offsets).size).toBeGreaterThan(190);
    // Both sides of the aim, roughly evenly.
    const left = offsets.filter((o) => o < 0).length;
    expect(left).toBeGreaterThan(70);
    expect(left).toBeLessThan(130);
    expect(scatter('p1', undefined)).toBe(0);
  });
});

describe('laser falloff', () => {
  it('lasers keep full power to half range, then fade to 40% at full range', () => {
    expect(WEAPONS['pulse-laser-m']!.falloff).toEqual(LASER_FALLOFF);
    expect(WEAPONS['beam-laser-l']!.falloff).toEqual(LASER_FALLOFF);
    expect(WEAPONS['autocannon-m']!.falloff).toBeUndefined();
    expect(falloffFactor(LASER_FALLOFF, 0.25)).toBe(1);
    expect(falloffFactor(LASER_FALLOFF, 0.5)).toBe(1);
    expect(falloffFactor(LASER_FALLOFF, 0.75)).toBeCloseTo(0.7);
    expect(falloffFactor(LASER_FALLOFF, 1)).toBeCloseTo(0.4);
    expect(falloffFactor(undefined, 1)).toBe(1);
  });

  /** A laser shot `travelled` of the way through a 100-tick life, about to hit a ship just ahead. */
  const landing = (ticksLeft: number, falloff = LASER_FALLOFF): number => {
    const target = buildShip(TEST_CATALOGUES, { id: 't', loadout: LOADOUTS['kessari-raider']!, ownerId: null, position: { x: 5, y: 0 }, heading: 0, flightMode: 'assisted' });
    const shot: Projectile = { id: 'p1', ownerShipId: 'someone', position: { x: 0, y: 0 }, velocity: { x: 900, y: 0 }, damage: 10, damageType: 'thermal', ticksLeft, lifeTicks: 100, falloff };
    const r = stepProjectiles([shot], { t: target }, TEST_CATALOGUES.hulls, {}, FIXED_DT);
    expect(r.damage).toHaveLength(1);
    return r.damage[0]!.amount;
  };

  it('does full damage close in and much less near the end of its range', () => {
    expect(landing(100)).toBe(10);
    expect(landing(1)).toBeCloseTo(10 * falloffFactor(LASER_FALLOFF, 0.99));
    expect(landing(1)).toBeLessThan(4.2);
  });

  it('shots without a falloff, or from older saves, land at full damage', () => {
    const target = buildShip(TEST_CATALOGUES, { id: 't', loadout: LOADOUTS['kessari-raider']!, ownerId: null, position: { x: 5, y: 0 }, heading: 0, flightMode: 'assisted' });
    const old: Projectile = { id: 'p1', ownerShipId: 'someone', position: { x: 0, y: 0 }, velocity: { x: 900, y: 0 }, damage: 10, damageType: 'kinetic', ticksLeft: 1 };
    expect(stepProjectiles([old], { t: target }, TEST_CATALOGUES.hulls, {}, FIXED_DT).damage[0]!.amount).toBe(10);
  });
});
