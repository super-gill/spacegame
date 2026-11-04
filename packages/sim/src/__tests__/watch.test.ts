import { describe, expect, it } from 'vitest';
import { buildShip } from '../factory.js';
import { LOADOUTS } from '../loadouts.js';
import { stepWorld } from '../step.js';
import type { Ship, World, WorldEvent } from '../types.js';
import { add } from '../vec2.js';
import { createStarterWorld, joinPilot, pilotShip } from '../world.js';

/** The Calder Watch: a beatable patrol that locks before it shoots and leaves pilots alone. */

const SECOND = 60;
const WATCH = 'npc-watch-1';

function run(w: World, seconds: number, each?: (w: World) => void): World {
  let x = w;
  for (let i = 0; i < seconds * SECOND; i++) {
    x = stepWorld(x, {});
    each?.(x);
  }
  return x;
}

/** The starter system with only the Watch, out of dock, and anything added. */
function withWatch(): World {
  const w = createStarterWorld();
  const ships: Record<string, Ship> = { [WATCH]: w.ships[WATCH]! };
  return { ...w, ships, npcs: { [WATCH]: w.npcs[WATCH]! }, spawners: [] };
}

/** A pirate (brain and all) at `offset` from the Watch. */
function addPirate(w: World, offset: { x: number; y: number }): World {
  const at = add(w.ships[WATCH]!.position, offset);
  const ship = buildShip(w, { id: 'raider', loadout: LOADOUTS['kessari-raider']!, ownerId: null, position: at, heading: 0, flightMode: 'rotation' });
  const brain = { kind: 'pirate' as const, home: at, mode: 'prowl' as const, targetId: null, modeTicks: 0, cooldownTicks: 1e9, patrolIndex: 0, provokedBy: null };
  return { ...w, ships: { ...w.ships, raider: { ...ship, velocity: { ...w.ships[WATCH]!.velocity } } }, npcs: { ...w.npcs, raider: brain } };
}

describe('the Calder Watch', () => {
  it('starts on a pad at Harbour and sets out on its beat', () => {
    const w = createStarterWorld();
    expect(w.ships[WATCH]!.dockedAt).toBe('station-harbour');
    const later = run(w, 15);
    expect(later.ships[WATCH]!.state).toBe('flying');
  });

  it('locks a pirate it can see, and fires only once the lock is complete', () => {
    let w = run(withWatch(), 30); // out on the beat
    w = addPirate(w, { x: 600, y: 0 });
    const events: WorldEvent[] = [];
    let firstHit = -1;
    let lockedAt = -1;
    run(w, 20, (x) => {
      for (const e of x.events) {
        events.push(e);
        if (e.type === 'locked' && e.shipId === WATCH && lockedAt < 0) lockedAt = x.tick;
        if (e.type === 'damaged' && e.shipId === 'raider' && e.by === WATCH && firstHit < 0) firstHit = x.tick;
      }
    });
    expect(events).toContainEqual({ type: 'lockStarted', shipId: WATCH, targetId: 'raider' });
    expect(lockedAt).toBeGreaterThan(0);
    expect(firstHit).toBeGreaterThan(lockedAt);
  });

  it('leaves pilots alone', () => {
    let w = run(withWatch(), 30);
    w = joinPilot(w, 'ana', 'Ana');
    const me = pilotShip(w, 'ana')!.id;
    w = { ...w, ships: { ...w.ships, [me]: { ...w.ships[me]!, position: add(w.ships[WATCH]!.position, { x: 400, y: 0 }), velocity: { ...w.ships[WATCH]!.velocity } } } };
    let touched = false;
    run(w, 20, (x) => {
      if (x.events.some((e) => (e.type === 'lockStarted' && e.shipId === WATCH && e.targetId === me) || (e.type === 'damaged' && e.shipId === me))) touched = true;
    });
    expect(touched).toBe(false);
  });

  it('flies its beat without hitting a planet, a moon or a station', () => {
    const hits: WorldEvent[] = [];
    run(withWatch(), 240, (x) => hits.push(...x.events.filter((e) => (e.type === 'impacted' || e.type === 'collided') && e.shipId === WATCH)));
    expect(hits).toEqual([]);
  });
});
