import { describe, expect, it } from 'vitest';
import { rockAt } from '../asteroids.js';
import { BELT_ID, BELT_PERIOD, BELT_RING_RADIUS } from '../bodies.js';
import { FIXED_DT } from '../constants.js';
import { buildShip } from '../factory.js';
import { destroyShips } from '../lifecycle.js';
import { LOADOUTS } from '../loadouts.js';
import { lootClaim } from '../ownership.js';
import { stepWorld } from '../step.js';
import type { Asteroid, Loot, ShipInput, World } from '../types.js';
import { createStarterWorld, emptyInput, joinPilot } from '../world.js';

/** Loot claims and the tractor's MINE / ALL modes (docs/mining.md, "Whose loot"). */

const SECOND = Math.round(1 / FIXED_DT);
const PHASE = 3.5;

const rock: Asteroid = {
  id: 'r1',
  orbit: { parent: BELT_ID, radius: BELT_RING_RADIUS, period: BELT_PERIOD, phase: PHASE, direction: 1, frozen: true },
  radius: 20,
  contents: { ore: 30 },
  hardness: 0.2,
  field: 'ring',
};

/** A prospector 100 units off a soft rock, nose on, in a quiet world. */
function setup(): World {
  const base: World = { ...createStarterWorld(), ships: {}, npcs: {}, spawners: [], asteroids: [rock], rockfall: { made: 0, timerTicks: 1e9 } };
  const at = rockAt(base, rock.id)!.position;
  const ship = buildShip(base, { id: 's', loadout: LOADOUTS['rookrivet-prospector']!, ownerId: null, position: { x: at.x + Math.cos(PHASE) * 120, y: at.y + Math.sin(PHASE) * 120 }, heading: PHASE + Math.PI, flightMode: 'assisted' });
  return { ...base, ships: { s: ship } };
}

function run(w: World, seconds: number, input: Partial<ShipInput> = {}): World {
  for (let i = 0; i < seconds * SECOND; i++) w = stepWorld(w, { s: { ...emptyInput(), ...input } });
  return w;
}

/** A canister at rest 40 units off the ship's flank. */
function canister(w: World, claim?: string): Loot {
  const s = w.ships['s']!;
  return { id: 'can', item: 'ore', amount: 5, position: { x: s.position.x, y: s.position.y + 40 }, velocity: { x: 0, y: 0 }, ticksLeft: 1e6, ...(claim ? { claim } : {}) };
}

const tile = (w: World): World => stepWorld(w, { s: { ...emptyInput(), toggleModule: 'w3' } });

describe('loot claims', () => {
  it('ore a laser frees is claimed by whoever cut it', () => {
    const w = run(setup(), 6, { fireFixed: true });
    const freed = w.loot.filter((l) => l.item === 'ore');
    expect(freed.length).toBeGreaterThan(0);
    for (const l of freed) expect(l.claim).toBe('s');
  });

  it('a pilot claims for themselves, whichever ship they fly; a drone for its mother', () => {
    let w = setup();
    w = joinPilot(w, 'ana', 'Ana');
    w = { ...w, pilots: { ...w.pilots, ana: { ...w.pilots['ana']!, shipId: 's' } } };
    expect(lootClaim(w, 's')).toBe('ana');
    const drone = buildShip(w, { id: 's/d1', loadout: LOADOUTS['rookrivet-mining-drone']!, ownerId: null, position: { x: 0, y: 0 }, heading: 0, flightMode: 'assisted' });
    w = { ...w, ships: { ...w.ships, 's/d1': { ...drone, motherId: 's' } } };
    expect(lootClaim(w, 's/d1')).toBe('ana');
    // An NPC, with nobody aboard and no owner, claims as itself.
    expect(lootClaim(setup(), 's')).toBe('s');
  });

  it("a wreck's spoils are its killer's", () => {
    const w = setup();
    const doomed = { ...w.ships['s']!, structure: 0 };
    const out = destroyShips({ ...w, ships: { s: doomed } }, { s: 'pirate-1' });
    expect(out.world.loot.length).toBeGreaterThan(0);
    for (const l of out.world.loot) expect(l.claim).toBe('pirate-1');
  });

  it("a cache is its owner's, and never takes in other people's canisters", () => {
    let w = setup();
    w = { ...w, ships: { s: { ...w.ships['s']!, hold: { ore: 10 } } }, loot: [canister(w, 'someone')] };
    w = stepWorld(w, { s: { ...emptyInput(), dropCache: true } });
    for (const l of w.loot.filter((x) => x.cache)) expect(l.claim).toBe('s');
    expect(w.loot.find((l) => l.id === 'can')).toMatchObject({ claim: 'someone' });
    expect(w.loot.find((l) => l.id === 'can')!.cache).toBeUndefined();
  });
});

describe('the tractor, MINE and ALL', () => {
  it('MINE takes your own and unclaimed loot and leaves other people\'s', () => {
    for (const [claim, taken] of [['s', true], [undefined, true], ['someone', false]] as const) {
      let w = setup();
      w = { ...w, loot: [canister(w, claim)] };
      w = run(tile(w), 4);
      expect(w.ships['s']!.hold['ore'] ?? 0, String(claim)).toBe(taken ? 5 : 0);
    }
  });

  it('ALL takes other people\'s too, and R alone tractors in the tile\'s mode', () => {
    let w = setup();
    w = { ...w, loot: [canister(w, 'someone')] };
    w = run(tile(tile(w)), 4);
    expect(w.ships['s']!.hold['ore']).toBe(5);
    // Holding R with the tile off: its own loot only.
    let r = setup();
    r = { ...r, loot: [canister(r, 'someone')] };
    r = run(r, 4, { tractor: true });
    expect(r.ships['s']!.hold['ore'] ?? 0).toBe(0);
  });
});
