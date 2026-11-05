import { describe, expect, it } from 'vitest';
import { AWAY_GRACE_SECONDS, pilotLeft, pilotReturned, stepAway } from '../away.js';
import { FIXED_DT } from '../constants.js';
import { dronesOut } from '../drones.js';
import { buildShip } from '../factory.js';
import { LOADOUTS } from '../loadouts.js';
import { stepWorld } from '../step.js';
import type { ShipInput, World } from '../types.js';
import { createStarterWorld, emptyInput, joinPilot, pilotShip } from '../world.js';

/**
 * Logging off in space (docs/shared-world.md, decision 1): the ship stays
 * a while, then disappears until its pilot returns, and comes back where
 * it was, with everything aboard.
 */

const SECOND = Math.round(1 / FIXED_DT);

/** Ana in a hulk with drones, in space off Harbour. */
function anaInHulk(): World {
  let w = joinPilot({ ...createStarterWorld(), npcs: {}, spawners: [] }, 'ana', 'Ana');
  const starter = pilotShip(w, 'ana')!;
  const hulk = buildShip(w, { id: 'ana-hulk', loadout: LOADOUTS['rookrivet-hulk']!, ownerId: 'ana', position: starter.position, heading: 0, flightMode: 'assisted', hold: { food: 3 } });
  const ships = { ...w.ships, [hulk.id]: hulk };
  delete ships[starter.id];
  w = { ...w, ships, pilots: { ...w.pilots, ana: { ...w.pilots['ana']!, shipId: hulk.id } } };
  return w;
}

/** As the server does: the world steps, then away pilots' ships are taken out once their grace is up. */
function run(w: World, seconds: number, input: Partial<ShipInput> = {}): World {
  for (let i = 0; i < Math.round(seconds * SECOND); i++) w = stepAway(stepWorld(w, { 'ana-hulk': { ...emptyInput(), ...input } }));
  return w;
}

describe('logging off in space', () => {
  it('leaves the ship a while, then takes it out of space, drones and all', () => {
    let w = anaInHulk();
    w = stepWorld(w, { 'ana-hulk': { ...emptyInput(), droneCommand: { action: 'launch' } } });
    w = run(w, 2);
    const out = dronesOut(w, 'ana-hulk').length;
    expect(out).toBeGreaterThan(0);
    const bayBefore = (w.ships['ana-hulk']!.droneBay ?? []).length;

    w = pilotLeft(w, 'ana');
    w = run(w, AWAY_GRACE_SECONDS - 5);
    expect(w.ships['ana-hulk']).toBeDefined();

    w = run(w, 10);
    expect(w.ships['ana-hulk']).toBeUndefined();
    expect(dronesOut(w, 'ana-hulk')).toHaveLength(0);
    const stowed = w.pilots['ana']!.stowed!;
    expect(stowed.droneBay).toHaveLength(bayBefore + out);
    expect(stowed.hold['food']).toBe(3);
  });

  it('brings the ship back where it was, stopped, when the pilot returns', () => {
    let w = run(anaInHulk(), 1, { thrustForward: true });
    w = pilotLeft(w, 'ana');
    w = run(w, AWAY_GRACE_SECONDS + 1);
    const where = w.pilots['ana']!.stowed!.position;
    w = run(w, 30); // the world goes on without her
    w = pilotReturned(w, 'ana');
    const back = pilotShip(w, 'ana')!;
    expect(back.position).toEqual(where);
    expect(back.velocity).toEqual({ x: 0, y: 0 });
    expect(w.pilots['ana']!.away).toBeUndefined();
    expect(w.pilots['ana']!.stowed).toBeUndefined();
  });

  it('does nothing if the pilot returns within the grace', () => {
    let w = anaInHulk();
    w = pilotLeft(w, 'ana');
    w = run(w, 10);
    w = pilotReturned(w, 'ana');
    w = run(w, AWAY_GRACE_SECONDS);
    expect(w.ships['ana-hulk']).toBeDefined();
    expect(w.pilots['ana']!.away).toBeUndefined();
  });
});
