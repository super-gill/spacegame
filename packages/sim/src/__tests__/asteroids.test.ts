import { describe, expect, it } from 'vitest';
import { asteroidPositions, screeAsteroids } from '../asteroids.js';
import { BELT_PERIOD, BELT_RING_RADIUS } from '../bodies.js';
import { buildShip } from '../factory.js';
import { LOADOUTS } from '../loadouts.js';
import { deserializeWorld, serializeWorld } from '../save.js';
import { stepWorld } from '../step.js';
import type { World, WorldEvent } from '../types.js';
import { add, distance, normalise, scale } from '../vec2.js';
import { createStarterWorld } from '../world.js';

/** The Scree's rocks: generated once, on rails, solid to ships and shots. */

function quiet(): World {
  return { ...createStarterWorld(), ships: {}, npcs: {}, spawners: [] };
}

describe('the Scree', () => {
  it('is generated the same way every time from its seed, and differently from another', () => {
    expect(screeAsteroids()).toEqual(screeAsteroids());
    expect(screeAsteroids(7)).not.toEqual(screeAsteroids());
  });

  it('lies in the ring, turning with the belt', () => {
    const rocks = screeAsteroids();
    expect(rocks.length).toBeGreaterThan(100);
    for (const r of rocks) {
      expect(Math.abs(r.orbit.radius - BELT_RING_RADIUS)).toBeLessThanOrEqual(700);
      expect(r.orbit.period).toBe(BELT_PERIOD);
    }
  });

  it("keeps Ridge Outpost's doorstep clear", () => {
    const w = createStarterWorld();
    const ridge = w.stations['station-ridge']!;
    for (const rock of asteroidPositions(w)) expect(distance(rock.position, ridge.position) - rock.radius).toBeGreaterThan(ridge.dockRange + 300);
  });

  it('is stored in the world and saved with it', () => {
    const w = createStarterWorld();
    expect(w.asteroids).toEqual(screeAsteroids());
    const r = deserializeWorld(serializeWorld(w, ''));
    if (!r.ok) throw new Error(r.reason);
    expect(r.world.asteroids).toEqual(w.asteroids);
  });

  it('a ship that flies into a rock bounces off it', () => {
    let w = quiet();
    const rock = asteroidPositions(w)[0]!;
    const out = normalise(rock.position); // outward from the star, along which the rock barely moves
    const start = add(rock.position, scale(out, rock.radius + 80));
    const ship = buildShip(w, { id: 'probe', loadout: LOADOUTS['meridian-starter']!, ownerId: null, position: start, heading: 0, flightMode: 'manual' });
    w = { ...w, ships: { probe: { ...ship, velocity: scale(out, -60) } } };
    const events: WorldEvent[] = [];
    for (let i = 0; i < 120; i++) {
      w = stepWorld(w, {});
      events.push(...w.events);
    }
    expect(events).toContainEqual(expect.objectContaining({ type: 'impacted', shipId: 'probe', bodyId: rock.id }));
    const now = asteroidPositions(w).find((r) => r.id === rock.id)!;
    expect(distance(w.ships['probe']!.position, now.position)).toBeGreaterThan(rock.radius);
  });

  it('stops shots: rocks give cover', () => {
    let w = quiet();
    const rock = asteroidPositions(w)[0]!;
    const out = normalise(rock.position);
    const from = add(rock.position, scale(out, rock.radius + 100));
    w = { ...w, projectiles: [{ id: 'p1', ownerShipId: 'x', position: from, velocity: scale(out, -600), damage: 10, ticksLeft: 120 }] };
    for (let i = 0; i < 30; i++) w = stepWorld(w, {});
    expect(w.projectiles).toEqual([]);
  });
});
