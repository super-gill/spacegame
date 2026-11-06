import { describe, expect, it } from 'vitest';
import { angleDelta } from '../angle.js';
import { fireWeapons, gunBearing } from '../combat.js';
import { FIXED_DT, GUN_TRAVERSE, TURRET_SLEW_FALLOFF } from '../constants.js';
import { buildShip } from '../factory.js';
import { HULLS } from '../hulls.js';
import { LOADOUTS } from '../loadouts.js';
import { MODULES } from '../modules.js';
import { shipStats } from '../stats.js';
import type { Ship } from '../types.js';
import { toAngle } from '../vec2.js';
import { isGun, isMainGun, WEAPONS } from '../weapons.js';
import { emptyInput } from '../world.js';
import { TEST_CATALOGUES } from './fixtures.js';

/**
 * The turret model, build step 1 (docs/turrets.md): every main gun is a
 * turret that follows the lock, traverse by size is the lever, and each
 * hardpoint's arc decides where a gun can bear.
 */

describe('every main gun is a turret', () => {
  it('main guns are turrets, traversing S 3.0, M 1.5 and L 0.75 rad/s', () => {
    const traverse = { S: 3, M: 1.5, L: 0.75 } as const;
    expect(GUN_TRAVERSE).toBe(traverse.S);
    expect(TURRET_SLEW_FALLOFF).toBe(2);
    const main = Object.values(WEAPONS).filter((w) => isMainGun(w));
    expect(main.length).toBe(18);
    for (const w of main) {
      expect(w.kind, w.id).toBe('turret');
      expect(w.turretTurnRate, w.id).toBeCloseTo(traverse[w.size as 'S' | 'M' | 'L']);
    }
  });

  it('only launchers, dispensers and light mining lasers are fixed', () => {
    for (const w of Object.values(WEAPONS).filter((x) => x.kind === 'fixed')) {
      expect(['missile', 'countermeasure', 'mining'], w.id).toContain(w.family);
      expect(isGun(w), w.id).toBe(false);
    }
  });

  it('the separate turreted guns and modules are gone', () => {
    expect(Object.keys(WEAPONS).filter((id) => /-turret-[ml]$/.test(id) && !id.startsWith('mining'))).toEqual([]);
    expect(Object.keys(MODULES).filter((id) => id.endsWith('-turret'))).toEqual([]);
  });
});

describe('hardpoint arcs', () => {
  it('every high slot has an arc; forward-facing ones without a wider arc cover the forward half', () => {
    for (const hull of Object.values(HULLS)) {
      for (const m of hull.mounts.filter((x) => x.type === 'high')) {
        expect(m.arc, `${hull.id} ${m.id}`).toBeDefined();
        expect(m.arc!, `${hull.id} ${m.id}`).toBeGreaterThanOrEqual(Math.PI - 1e-9);
      }
    }
    const frigate = HULLS['union-frigate']!;
    expect(frigate.mounts.find((m) => m.id === 'w1')!.arc).toBeCloseTo(Math.PI);
    expect(frigate.mounts.find((m) => m.id === 'w3')!.arc).toBeCloseTo(Math.PI * 1.5);
  });
});

/** A frigate with only its two bow guns (Picket L), heading along +x, and a target `at` from it. */
function bowGuns(): { frigate: Ship; target: (x: number, y: number) => Ship } {
  const fit = { ...LOADOUTS['union-frigate']!.fit };
  for (const id of ['w3', 'w4', 'w5', 'w6']) delete fit[id];
  const loadout = { ...LOADOUTS['union-frigate']!, fit };
  const frigate = buildShip(TEST_CATALOGUES, { id: 'f', loadout, ownerId: null, position: { x: 0, y: 0 }, heading: 0, flightMode: 'assisted' });
  const target = (x: number, y: number): Ship => buildShip(TEST_CATALOGUES, { id: 't', loadout: LOADOUTS['kessari-raider']!, ownerId: null, position: { x, y }, heading: 0, flightMode: 'assisted' });
  return { frigate: { ...frigate, locks: [{ targetId: 't', progress: 1 }], activeLock: 't' }, target };
}

/** Run the frigate's guns for `ticks` against `target` (or no lock), returning the ship and how many shots left it. */
function run(frigate: Ship, target: Ship | null, ticks: number, fire = true): { ship: Ship; shots: number; firstShotTick: number | null; directions: number[] } {
  const stats = shipStats(TEST_CATALOGUES, frigate);
  let ship = frigate;
  let shots = 0;
  let firstShotTick: number | null = null;
  const directions: number[] = [];
  for (let t = 0; t < ticks; t++) {
    const r = fireWeapons(ship, stats, { ...emptyInput(), fireFixed: fire }, () => target, FIXED_DT, t * 10, TEST_CATALOGUES);
    ship = r.ship;
    if (r.projectiles.length > 0 && firstShotTick === null) firstShotTick = t;
    shots += r.projectiles.length;
    for (const p of r.projectiles) directions.push(toAngle({ x: p.velocity.x - ship.velocity.x, y: p.velocity.y - ship.velocity.y }));
  }
  return { ship, shots, firstShotTick, directions };
}

describe('main gun turrets in a fight', () => {
  it('slew to a lock off the nose and fire there, but only on the trigger', () => {
    const { frigate, target } = bowGuns();
    // 45 degrees to starboard: a fixed gun could not have borne.
    const t = target(400, 400);
    const fired = run(frigate, t, 180);
    expect(fired.shots).toBeGreaterThan(0);
    // An L turret takes about a second to slew 45 degrees, so it does not fire at once.
    expect(fired.firstShotTick!).toBeGreaterThan(30);
    for (const d of fired.directions) expect(Math.abs(angleDelta(d, Math.PI / 4))).toBeLessThan(0.15);
    expect(run(frigate, t, 180, false).shots).toBe(0);
  });

  it('a bow gun cannot bear astern', () => {
    const { frigate, target } = bowGuns();
    const t = target(-400, 0);
    expect(run(frigate, t, 300).shots).toBe(0);
    const stats = shipStats(TEST_CATALOGUES, frigate);
    const world = { ...TEST_CATALOGUES, ships: { f: frigate, t } };
    expect(gunBearing(world, frigate, stats, 'w1')).toBe('outOfArc');
  });

  it('with no lock, fires straight along its mount', () => {
    const { frigate } = bowGuns();
    const fired = run({ ...frigate, locks: [], activeLock: null }, null, 30);
    expect(fired.firstShotTick).toBe(0);
    for (const d of fired.directions) expect(Math.abs(angleDelta(d, 0))).toBeLessThan(1e-6);
  });

  it('says whether it bears: no lock, out of range, slewing, then bears', () => {
    const { frigate, target } = bowGuns();
    const stats = shipStats(TEST_CATALOGUES, frigate);
    const near = target(400, 400);
    const world = (ship: Ship, t: Ship) => ({ ...TEST_CATALOGUES, ships: { f: ship, t } });
    expect(gunBearing(world(frigate, near), { ...frigate, locks: [], activeLock: null }, stats, 'w1')).toBe('noLock');
    expect(gunBearing(world(frigate, target(9000, 0)), frigate, stats, 'w1')).toBe('outOfRange');
    expect(gunBearing(world(frigate, near), frigate, stats, 'w1')).toBe('slewing');
    const settled = run(frigate, near, 120, false).ship;
    expect(gunBearing(world(settled, near), settled, stats, 'w1')).toBe('bears');
  });
});
