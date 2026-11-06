import { describe, expect, it } from 'vitest';
import { buildShip, createStarterWorld, LOADOUTS, shipStats, type Ship, type World } from '@spacegame/sim';
import { conditions, secondsToReach, soonestCollision } from './warnings.js';
import { WarningSounds } from './warning-sounds.js';

/** An empty patch of space far from everything, with one Tern in it. */
function alone(over: Partial<Ship> = {}): { world: World; ship: Ship } {
  const base: World = { ...createStarterWorld(), ships: {}, npcs: {}, spawners: [], asteroids: [] };
  const ship = { ...buildShip(base, { id: 's', loadout: LOADOUTS['meridian-starter']!, ownerId: null, position: { x: 90000, y: 90000 }, heading: 0, flightMode: 'assisted' }), ...over };
  return { world: { ...base, ships: { s: ship } }, ship };
}

const keys = (world: World, ship: Ship) => conditions(world, ship, shipStats(world, ship), null).map((c) => `${c.tier}:${c.key}`);

describe('warning conditions', () => {
  it('a healthy ship alone in space has none', () => {
    const { world, ship } = alone();
    expect(keys(world, ship)).toEqual([]);
  });

  it('shields low, then down; hull low, then critical; alarms first', () => {
    const { world, ship } = alone();
    const stats = shipStats(world, ship);
    expect(keys(world, { ...ship, shield: stats.shield * 0.2 })).toEqual(['caution:shield']);
    expect(keys(world, { ...ship, shield: 0, structure: stats.structure * 0.4 })).toEqual(['warning:hull', 'warning:shield']);
    expect(keys(world, { ...ship, shield: 0, structure: stats.structure * 0.1 })).toEqual(['alarm:hull', 'warning:shield']);
  });

  it('someone locking you, then locked on', () => {
    const { world, ship } = alone();
    const other = buildShip(world, { id: 'o', loadout: LOADOUTS['kessari-raider']!, ownerId: null, position: { x: 91000, y: 90000 }, heading: 0, flightMode: 'assisted' });
    const locking: World = { ...world, ships: { ...world.ships, o: { ...other, locks: [{ targetId: 's', progress: 0.3 }] } } };
    expect(conditions(locking, ship, shipStats(locking, ship), null).find((c) => c.key === 'lockedOn')?.text).toBe('BEING LOCKED');
    const locked: World = { ...world, ships: { ...world.ships, o: { ...other, locks: [{ targetId: 's', progress: 1 }] } } };
    expect(conditions(locked, ship, shipStats(locked, ship), null).find((c) => c.key === 'lockedOn')?.text).toBe('TARGET LOCK ON YOU');
  });

  it('a station ahead: caution, warning, alarm as it gets closer in time; drifting slowly, nothing', () => {
    const { world, ship } = alone();
    const station = Object.values(world.stations)[0]!;
    const stats = shipStats(world, ship);
    const edge = station.radius + stats.radius;
    // 200 u/s straight at it, from 1,000, 500 and 200 units out from contact.
    const at = (gap: number, speed: number): Ship => ({ ...ship, position: { x: station.position.x - edge - gap, y: station.position.y }, velocity: { x: station.velocity.x + speed, y: station.velocity.y } });
    const tierAt = (gap: number, speed = 200) => conditions(world, at(gap, speed), stats, null).find((c) => c.key === 'collision')?.tier ?? null;
    expect(tierAt(1000)).toBe('caution');
    expect(tierAt(500)).toBe('warning');
    expect(tierAt(200)).toBe('alarm');
    expect(tierAt(2000)).toBeNull();
    // Too slow to hurt: docking speeds stay quiet.
    expect(tierAt(30, 20)).toBeNull();
    expect(soonestCollision(world, at(500, 200), stats)?.what).toBe('STATION');
  });

  it('time to reach: head on, passing wide, already there, standing still', () => {
    expect(secondsToReach({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 0 }, 10)).toBeCloseTo(9);
    expect(secondsToReach({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 100, y: 50 }, { x: 0, y: 0 }, 10)).toBe(Infinity);
    expect(secondsToReach({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 0 }, { x: 0, y: 0 }, 10)).toBe(0);
    expect(secondsToReach({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 0 }, 10)).toBe(Infinity);
  });
});

describe('when warnings sound', () => {
  const c = (key: string, tier: 'alarm' | 'warning' | 'caution' | 'advisory') => ({ key, tier, text: key });

  it('a caution sounds once when it starts, and again only if it clears and comes back', () => {
    const s = new WarningSounds();
    expect(s.update(0, [c('shield', 'caution')])).toEqual(['caution']);
    expect(s.update(5, [c('shield', 'caution')])).toEqual([]);
    expect(s.update(6, [])).toEqual([]);
    expect(s.update(7, [c('shield', 'caution')])).toEqual(['caution']);
  });

  it('a warning repeats every 3 seconds; an alarm every second until silenced', () => {
    const s = new WarningSounds();
    expect(s.update(0, [c('m', 'warning')])).toEqual(['warning']);
    expect(s.update(2, [c('m', 'warning')])).toEqual([]);
    expect(s.update(3, [c('m', 'warning')])).toEqual(['warning']);
    expect(s.update(3.5, [c('m', 'alarm')])).toEqual(['alarm']);
    expect(s.alarmSounding()).toBe(true);
    expect(s.update(4.5, [c('m', 'alarm')])).toEqual(['alarm']);
    s.silence();
    expect(s.alarmSounding()).toBe(false);
    expect(s.update(6, [c('m', 'alarm')])).toEqual([]);
  });

  it('rising a tier sounds at once; falling does not', () => {
    const s = new WarningSounds();
    s.update(0, [c('hull', 'warning')]);
    expect(s.update(0.5, [c('hull', 'alarm')])).toEqual(['alarm']);
    expect(s.update(0.6, [c('hull', 'warning')])).toEqual([]);
  });

  it('a burst of the same event sound is one sound', () => {
    const s = new WarningSounds();
    expect(s.update(0, [], ['advisory', 'advisory', 'caution'])).toEqual(['caution', 'advisory']);
    expect(s.update(0.1, [], ['advisory'])).toEqual([]);
    expect(s.update(0.5, [], ['advisory'])).toEqual(['advisory']);
  });
});
