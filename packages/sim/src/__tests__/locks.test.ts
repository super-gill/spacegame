import { describe, expect, it } from 'vitest';
import { LOCK_BASE_SECONDS } from '../constants.js';
import { buildShip } from '../factory.js';
import { HULLS } from '../hulls.js';
import { LOADOUTS } from '../loadouts.js';
import { activeTarget, lockRefusal, lockSeconds, weaponTarget } from '../locks.js';
import { deserializeWorld, serializeWorld } from '../save.js';
import { shipStats } from '../stats.js';
import { stepWorld } from '../step.js';
import type { Ship, ShipInput, World, WorldEvent } from '../types.js';
import { add } from '../vec2.js';
import { createStarterWorld, emptyInput, joinPilot, pilotShip } from '../world.js';
import { loadoutStats } from './fixtures.js';

/** Target locks: timed, limited by a ship stat, one active, turrets on the active lock. */

const SECOND = 60;

/** Ana in open space far from everything, at rest, plus nothing else. */
function open(): { w: World; me: string } {
  const base = { ...createStarterWorld(), ships: {}, npcs: {}, spawners: [] };
  const w = joinPilot(base, 'ana', 'Ana');
  const me = pilotShip(w, 'ana')!.id;
  return { w: { ...w, ships: { ...w.ships, [me]: { ...w.ships[me]!, position: { x: -6000, y: -6000 }, velocity: { x: 0, y: 0 } } } }, me };
}

/** An unowned ship from a loadout, at rest `offset` from Ana. */
function near(w: World, me: string, id: string, offset: { x: number; y: number }, loadoutId = 'kessari-raider'): World {
  const at = add(w.ships[me]!.position, offset);
  const s: Ship = buildShip(w, { id, loadout: LOADOUTS[loadoutId]!, ownerId: null, position: at, heading: 0, flightMode: 'manual' });
  return { ...w, ships: { ...w.ships, [id]: s } };
}

function step(w: World, me: string, input: Partial<ShipInput> = {}): World {
  return stepWorld(w, { [me]: { ...emptyInput(), ...input } });
}

function runFor(w: World, me: string, seconds: number, events: WorldEvent[] = []): World {
  let x = w;
  for (let i = 0; i < seconds * SECOND; i++) {
    x = step(x, me);
    events.push(...x.events);
  }
  return x;
}

describe('lock time', () => {
  it('is shorter with better scan resolution and against bigger ships', () => {
    expect(lockSeconds({ scanResolution: 2 }, 20)).toBeCloseTo(LOCK_BASE_SECONDS / 2, 9);
    expect(lockSeconds({ scanResolution: 1 }, 30)).toBeLessThan(lockSeconds({ scanResolution: 1 }, 18));
    expect(lockSeconds({ scanResolution: 1 }, 9)).toBeGreaterThan(LOCK_BASE_SECONDS);
  });

  it('comes from the hull: every hull has max locks and a scan resolution', () => {
    for (const hull of Object.values(HULLS)) {
      expect(hull.maxLocks).toBeGreaterThanOrEqual(1);
      expect(hull.scanResolution).toBeGreaterThan(0);
    }
    expect(loadoutStats('meridian-starter').maxLocks).toBe(HULLS['meridian-courier']!.maxLocks);
  });
});

describe('locking', () => {
  it('takes time, then completes and becomes active', () => {
    let { w, me } = open();
    w = near(w, me, 'raider', { x: 500, y: 0 });
    const events: WorldEvent[] = [];
    w = step(w, me, { lock: 'raider' });
    events.push(...w.events);
    expect(events).toContainEqual({ type: 'lockStarted', shipId: me, targetId: 'raider' });
    expect(w.ships[me]!.locks).toHaveLength(1);
    expect(w.ships[me]!.locks[0]!.progress).toBeGreaterThan(0);
    expect(w.ships[me]!.locks[0]!.progress).toBeLessThan(1);
    expect(w.ships[me]!.activeLock).toBe('raider');
    expect(activeTarget(w, w.ships[me]!)).toBeNull(); // not complete yet

    const seconds = lockSeconds(shipStats(w, w.ships[me]!), HULLS['kessari-wedge']!.radius);
    w = runFor(w, me, seconds + 0.1, events);
    expect(events).toContainEqual({ type: 'locked', shipId: me, targetId: 'raider' });
    expect(w.ships[me]!.locks[0]!.progress).toBe(1);
    expect(activeTarget(w, w.ships[me]!)?.id).toBe('raider');
  });

  it('is refused beyond sensor range, at max locks, on itself, and twice on one ship', () => {
    let { w, me } = open();
    const stats = shipStats(w, w.ships[me]!);
    w = near(w, me, 'far', { x: stats.sensorRange + 100, y: 0 });
    expect(lockRefusal(w, w.ships[me]!, 'far')).toBe('outOfRange');
    expect(lockRefusal(w, w.ships[me]!, me)).toBe('invalid');
    expect(lockRefusal(w, w.ships[me]!, 'nobody')).toBe('invalid');

    for (let i = 0; i < stats.maxLocks + 1; i++) w = near(w, me, `t${i}`, { x: 300 + i * 100, y: 200 });
    for (let i = 0; i < stats.maxLocks; i++) w = step(w, me, { lock: `t${i}` });
    expect(w.ships[me]!.locks).toHaveLength(stats.maxLocks);
    expect(lockRefusal(w, w.ships[me]!, 't0')).toBe('already');
    const over = step(w, me, { lock: `t${stats.maxLocks}` });
    expect(over.events).toContainEqual({ type: 'lockRefused', shipId: me, targetId: `t${stats.maxLocks}`, reason: 'maxLocks' });
  });

  it('switches the active lock and unlocks', () => {
    let { w, me } = open();
    w = near(near(w, me, 'a', { x: 400, y: 0 }), me, 'b', { x: 0, y: 400 });
    w = step(w, me, { lock: 'a' });
    w = step(w, me, { lock: 'b' });
    expect(w.ships[me]!.activeLock).toBe('a'); // the first lock stays active
    w = step(w, me, { activateLock: 'b' });
    expect(w.ships[me]!.activeLock).toBe('b');
    w = step(w, me, { unlock: 'b' });
    expect(w.events).toContainEqual({ type: 'lockLost', shipId: me, targetId: 'b', reason: 'unlocked' });
    expect(w.ships[me]!.locks.map((l) => l.targetId)).toEqual(['a']);
    expect(w.ships[me]!.activeLock).toBe('a'); // the next lock takes over
  });

  it('drops when the target leaves sensor range, docks or is destroyed', () => {
    let { w, me } = open();
    const range = shipStats(w, w.ships[me]!).sensorRange;
    w = near(near(w, me, 'leaver', { x: range - 10, y: 0 }), me, 'parker', { x: 0, y: 300 });
    w = { ...w, ships: { ...w.ships, leaver: { ...w.ships['leaver']!, velocity: { x: 50, y: 0 } } } };
    w = step(w, me, { lock: 'leaver' });
    w = step(w, me, { lock: 'parker' });
    const events: WorldEvent[] = [];
    w = runFor(w, me, 1, events);
    expect(events).toContainEqual({ type: 'lockLost', shipId: me, targetId: 'leaver', reason: 'outOfRange' });
    w = { ...w, ships: { ...w.ships, parker: { ...w.ships['parker']!, state: 'docked' } } };
    w = step(w, me);
    expect(w.events).toContainEqual({ type: 'lockLost', shipId: me, targetId: 'parker', reason: 'targetGone' });
    expect(w.ships[me]!.locks).toEqual([]);
    expect(w.ships[me]!.activeLock).toBeNull();
  });

  it('drops every lock when this ship docks', () => {
    let { w, me } = open();
    w = near(w, me, 'a', { x: 400, y: 0 });
    w = step(w, me, { lock: 'a' });
    const harbour = w.stations['station-harbour']!;
    w = { ...w, ships: { ...w.ships, [me]: { ...w.ships[me]!, position: add(harbour.position, { x: 150, y: 0 }), velocity: { ...harbour.velocity } } } };
    // The target is now far out of range anyway; dock and every lock goes.
    w = step(w, me, { toggleDock: true });
    expect(w.ships[me]!.state).toBe('docked');
    expect(w.ships[me]!.locks).toEqual([]);
  });
});

describe('turrets and locks', () => {
  it('turrets fire only at a complete active lock, while hot', () => {
    let { w, me } = open();
    // Ana in the Tacet dev ship, which has turrets.
    const dev = buildShip(w, { id: me, loadout: LOADOUTS['aurel-tacet-dev']!, ownerId: 'ana', position: w.ships[me]!.position, heading: 0, flightMode: 'assisted' });
    w = { ...w, ships: { ...w.ships, [me]: { ...dev, weaponsHot: true } } };
    w = near(w, me, 'raider', { x: 0, y: 300 });
    w = { ...w, ships: { ...w.ships, raider: { ...w.ships['raider']!, shield: 1e6, structure: 1e6 } } };
    const hits = (x: World) => x.events.filter((e) => e.type === 'damaged' && e.shipId === 'raider').length;

    // Hot but no lock: nothing.
    let quiet = 0;
    let x = w;
    for (let i = 0; i < SECOND; i++) {
      x = step(x, me);
      quiet += hits(x);
    }
    expect(quiet).toBe(0);

    // Lock it and wait: the turrets open up once the lock completes.
    x = step(w, me, { lock: 'raider' });
    let fired = 0;
    for (let i = 0; i < SECOND * 6; i++) {
      x = step(x, me);
      fired += hits(x);
    }
    expect(fired).toBeGreaterThan(2);
  });

  it('a weapon assigned to a lock engages that lock rather than the active one', () => {
    let { w, me } = open();
    w = near(near(w, me, 'a', { x: 400, y: 0 }), me, 'b', { x: 0, y: 400 });
    const ship: Ship = { ...w.ships[me]!, locks: [{ targetId: 'a', progress: 1 }, { targetId: 'b', progress: 1 }], activeLock: 'a' };
    expect(weaponTarget(w, ship, {})?.id).toBe('a');
    expect(weaponTarget(w, ship, { lockTarget: 'b' })?.id).toBe('b');
    // An assigned lock still in progress falls back to the active one.
    const partial: Ship = { ...ship, locks: [{ targetId: 'a', progress: 1 }, { targetId: 'b', progress: 0.5 }] };
    expect(weaponTarget(w, partial, { lockTarget: 'b' })?.id).toBe('a');
  });
});

describe('NPCs and saves', () => {
  it('a trader locks the pirate hunting it and holds one lock', () => {
    let w = createStarterWorld();
    let most = 0;
    let lockedPirate = false;
    for (let i = 0; i < SECOND * 70; i++) {
      w = stepWorld(w, {});
      const trader = w.ships['npc-trader-1'];
      if (!trader) break;
      most = Math.max(most, trader.locks.length);
      if (w.events.some((e) => e.type === 'locked' && e.shipId === 'npc-trader-1' && e.targetId.startsWith('npc-pirate'))) lockedPirate = true;
    }
    expect(lockedPirate).toBe(true);
    expect(most).toBe(1);
  });

  it('round-trips locks, and gives ships from saves without them none', () => {
    let { w, me } = open();
    w = near(w, me, 'a', { x: 400, y: 0 });
    w = step(w, me, { lock: 'a' });
    const back = deserializeWorld(serializeWorld(w, ''));
    if (!back.ok) throw new Error(back.reason);
    expect(back.world.ships[me]!.locks).toEqual(w.ships[me]!.locks);

    // A version 5 world saved before locks: targetId, no locks.
    const env = JSON.parse(serializeWorld(w, ''));
    for (const s of Object.values(env.world.ships) as Record<string, unknown>[]) {
      delete s['locks'];
      delete s['activeLock'];
      s['targetId'] = null;
    }
    const old = deserializeWorld(JSON.stringify(env));
    if (!old.ok) throw new Error(old.reason);
    expect(old.world.ships[me]!.locks).toEqual([]);
    expect(old.world.ships[me]!.activeLock).toBeNull();
    expect('targetId' in old.world.ships[me]!).toBe(false);
  });
});
