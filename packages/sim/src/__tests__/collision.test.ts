import { describe, expect, it } from 'vitest';
import { collideWithStations } from '../collision.js';
import { HULL_RESTITUTION } from '../constants.js';
import { idleThrusters } from '../flight.js';
import { TEST_SHIP_COMBAT, TEST_STATS } from './fixtures.js';
import type { Ship, Station } from '../types.js';
import { distance } from '../vec2.js';

const hull = TEST_STATS;
const station: Station = { id: 'st', name: 'St', position: { x: 0, y: 0 }, radius: 90, dockRange: 220, securityRadius: 900, market: {}, outfitting: false, pads: [], shipMart: [] };
const stations = { st: station };

function ship(overrides: Partial<Ship>): Ship {
  return {
    id: 's',
    hullId: 'aurel-tacet',
    ownerId: null,
    position: { x: 200, y: 0 },
    velocity: { x: 0, y: 0 },
    heading: 0,
    angularVelocity: 0,
    state: 'flying',
    dockedAt: null,
    padId: null,
    flightMode: 'manual',
    thrusters: idleThrusters(),
    ...TEST_SHIP_COMBAT,
    ...overrides,
  };
}

describe('station collision', () => {
  it('leaves a ship clear of the hull alone', () => {
    const s = ship({ velocity: { x: -100, y: 0 } });
    expect(collideWithStations(s, hull, stations)).toEqual({ ship: s, events: [], damage: [] });
  });

  it('pushes an overlapping ship out to the hull surface', () => {
    const r = collideWithStations(ship({ position: { x: 100, y: 0 }, velocity: { x: -100, y: 0 } }), hull, stations);
    expect(distance(r.ship.position, station.position)).toBeCloseTo(station.radius + hull.radius, 9);
  });

  it('bounces the inward part of velocity, reduced by restitution', () => {
    const r = collideWithStations(ship({ position: { x: 100, y: 0 }, velocity: { x: -100, y: 0 } }), hull, stations);
    expect(r.ship.velocity.x).toBeCloseTo(100 * HULL_RESTITUTION, 9);
    expect(r.events).toEqual([{ type: 'collided', shipId: 's', stationId: 'st', speed: 100 }]);
  });

  it('keeps most of a glancing slide along the hull', () => {
    const r = collideWithStations(ship({ position: { x: 100, y: 0 }, velocity: { x: -5, y: 80 } }), hull, stations);
    expect(r.ship.velocity.y).toBeGreaterThan(60);
    expect(r.events).toEqual([]); // 5 u/s inward is contact, not a collision
  });

  it('ignores docked ships', () => {
    const s = ship({ position: { x: 0, y: 0 }, state: 'docked', dockedAt: 'st' });
    expect(collideWithStations(s, hull, stations).ship).toBe(s);
  });
});
