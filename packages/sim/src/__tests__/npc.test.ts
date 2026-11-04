import { describe, expect, it } from 'vitest';
import { PIRATE_TUNING } from '../ai/pirate.js';
import { arriveVelocity, steerToVelocity, turnTowards } from '../ai/steer.js';
import { FIXED_DT } from '../constants.js';
import { idleThrusters } from '../flight.js';
import { TEST_SHIP_COMBAT, loadoutStats } from './fixtures.js';
import { stepShip } from '../ship.js';
import { stepWorld } from '../step.js';
import type { PirateBrain, Ship, World, WorldEvent } from '../types.js';
import { distance, length } from '../vec2.js';
import { createStarterWorld, emptyInput, joinPilot, pilotShip } from '../world.js';

/**
 * NPC tests. NPCs fly through the same flight computer as pilots, so
 * these check behaviour over simulated minutes rather than single ticks.
 */

const SECOND = 60;
const TRADER = 'npc-trader-1';
const PIRATE = 'npc-pirate-1';

function run(w: World, seconds: number, onTick?: (w: World) => void): World {
  for (let i = 0; i < seconds * SECOND; i++) {
    w = stepWorld(w, {});
    onTick?.(w);
  }
  return w;
}

function freeShip(hullId: string, overrides: Partial<Ship> = {}): Ship {
  return {
    id: 'x',
    hullId,
    ownerId: null,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    heading: 0,
    angularVelocity: 0,
    state: 'flying',
    dockedAt: null,
    padId: null,
    flightMode: 'rotation',
    thrusters: idleThrusters(),
    ...TEST_SHIP_COMBAT,
    ...overrides,
  };
}

describe('steering', () => {
  it('turns to a heading and settles there without oscillating', () => {
    const hull = loadoutStats('tessaract-trader');
    let s = freeShip('tessaract-spine');
    for (let i = 0; i < SECOND * 4; i++) s = stepShip(s, hull, { ...emptyInput(), ...turnTowards(s, hull, 2) }, FIXED_DT);
    expect(Math.abs(s.heading - 2)).toBeLessThan(0.05);
    expect(s.angularVelocity).toBe(0);
  });

  it('arrives at a point and stops near it', () => {
    const hull = loadoutStats('meridian-starter');
    const target = { x: 1500, y: 600 };
    let s = freeShip('meridian-courier');
    for (let i = 0; i < SECOND * 30; i++) {
      s = stepShip(s, hull, steerToVelocity(s, hull, arriveVelocity(s, hull, target, hull.maxSpeed)), FIXED_DT);
    }
    expect(distance(s.position, target)).toBeLessThan(30);
    expect(length(s.velocity)).toBeLessThan(15);
  });
});

describe('trader', () => {
  it('flies its loop: undocks, docks at the outpost, and comes back', () => {
    const docks: string[] = [];
    // No pirate, so this is purely about flying the route.
    const quiet = { ...createStarterWorld(), spawners: [] };
    const noPirate = { ...quiet, ships: { [TRADER]: quiet.ships[TRADER]! }, npcs: { [TRADER]: quiet.npcs[TRADER]! } };
    run(noPirate, 120, (w) => {
      for (const e of w.events) if (e.type === 'docked' && e.shipId === TRADER) docks.push(e.stationId);
    });
    expect(docks.slice(0, 2)).toEqual(['station-ridge', 'station-harbour']);
  });

  it('never hits a station hull', () => {
    const hits: WorldEvent[] = [];
    run(createStarterWorld(), 240, (w) => hits.push(...w.events.filter((e) => e.type === 'collided')));
    expect(hits).toEqual([]);
  });
});

describe('pirate', () => {
  /** A point in open space 300 units off the pirate. */
  function nearPirate(w: World): { x: number; y: number } {
    const p = w.ships[PIRATE]!.position;
    return { x: p.x + 300, y: p.y };
  }

  /** World with one pilot parked in the open lane, far from both stations. */
  function lonePilotWorld(): { w: World; shipId: string } {
    let w = joinPilot(createStarterWorld(), 'ana', 'Ana');
    const shipId = pilotShip(w, 'ana')!.id;
    // Park the pilot near the pirate, and send the trader away so it is not a candidate.
    w = {
      ...w,
      ships: {
        ...w.ships,
        // Very tough, so the test is about the pirate's flying, not about who wins.
        [shipId]: { ...w.ships[shipId]!, position: nearPirate(w), velocity: { x: 0, y: 0 }, flightMode: 'manual', shield: 1e6 },
        [TRADER]: { ...w.ships[TRADER]!, state: 'docked', dockedAt: 'station-harbour' },
      },
      npcs: { ...w.npcs, [TRADER]: { kind: 'trader', route: ['station-harbour'], leg: 0, waitTicks: 1e9 } },
    };
    return { w, shipId };
  }

  it('hunts a lone ship in the open and holds station off it', () => {
    let { w, shipId } = lonePilotWorld();
    let started = false;
    w = run(w, 20, (x) => {
      if (x.events.some((e) => e.type === 'huntStarted' && e.shipId === shipId)) started = true;
    });
    expect(started).toBe(true);
    const gap = distance(w.ships[PIRATE]!.position, pilotShip(w, 'ana')!.position);
    expect(gap).toBeGreaterThan(PIRATE_TUNING.standoff - 40);
    expect(gap).toBeLessThan(PIRATE_TUNING.standoff + 40);
  });

  it('gives up when the target docks', () => {
    let { w, shipId } = lonePilotWorld();
    w = run(w, 10);
    expect((w.npcs[PIRATE] as PirateBrain).mode).toBe('hunt');
    w = { ...w, ships: { ...w.ships, [shipId]: { ...w.ships[shipId]!, state: 'docked', dockedAt: 'station-harbour' } } };
    const next = stepWorld(w, {});
    expect(next.events).toContainEqual({ type: 'huntEnded', shipId, pirateId: PIRATE });
    expect((next.npcs[PIRATE] as PirateBrain).mode).toBe('withdraw');
  });

  it('does not hunt a ship inside station security', () => {
    let w = joinPilot(createStarterWorld(), 'ana', 'Ana'); // spawns inside Harbour security
    const shipId = pilotShip(w, 'ana')!.id;
    let huntedPilot = false;
    w = run(w, 60, (x) => {
      if (x.events.some((e) => e.type === 'huntStarted' && e.shipId === shipId)) huntedPilot = true;
    });
    expect(huntedPilot).toBe(false);
  });

  it('never enters a station security zone over ten minutes of normal play', () => {
    let deepest = -Infinity;
    run(createStarterWorld(), 600, (w) => {
      // Pirates come and go, so check whichever are present.
      for (const [id, brain] of Object.entries(w.npcs)) {
        const p = w.ships[id];
        if (brain.kind !== 'pirate' || !p) continue;
        for (const s of Object.values(w.stations)) deepest = Math.max(deepest, s.securityRadius - distance(p.position, s.position));
      }
    });
    expect(deepest).toBeLessThan(0);
  });
});

describe('determinism', () => {
  it('two runs from the same start are identical', () => {
    const a = run(createStarterWorld(), 90);
    const b = run(createStarterWorld(), 90);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
