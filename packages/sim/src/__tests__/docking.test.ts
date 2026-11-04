import { describe, expect, it } from 'vitest';
import { DOCK_MAX_SPEED } from '../constants.js';
import { stepWorld } from '../step.js';
import type { ShipInput, World } from '../types.js';
import { createStarterWorld, emptyInput, joinPilot, pilotShip } from '../world.js';

const SHIP = 'ship-p1-1';

function world(): World {
  return joinPilot(createStarterWorld(), 'p1', 'Tester');
}

function ship(w: World) {
  return pilotShip(w, 'p1')!;
}

function step(w: World, overrides: Partial<ShipInput>): World {
  return stepWorld(w, { [SHIP]: { ...emptyInput(), ...overrides } });
}

describe('docking', () => {
  it('refuses when too far from any station', () => {
    const w = world(); // pilot starts 650 units out, dock range 220
    const next = step(w, { toggleDock: true });
    expect(next.events).toEqual([{ type: 'dockRefused', shipId: SHIP, reason: 'tooFar' }]);
    expect(ship(next).state).toBe('flying');
  });

  it('refuses when too fast', () => {
    const w = world();
    const station = w.stations['station-harbour']!;
    w.ships[SHIP] = {
      ...ship(w),
      position: { x: station.position.x + 100, y: station.position.y },
      velocity: { x: DOCK_MAX_SPEED + 1, y: 0 },
      flightMode: 'manual',
    };
    const next = step(w, { toggleDock: true });
    expect(next.events[0]).toEqual({ type: 'dockRefused', shipId: SHIP, reason: 'tooFast' });
  });

  it('docks when close and slow, then undocks clear of the station', () => {
    const w = world();
    const station = w.stations['station-harbour']!;
    w.ships[SHIP] = {
      ...ship(w),
      position: { x: station.position.x + 100, y: station.position.y },
      velocity: { x: 0, y: 0 },
      heading: 0,
    };

    const docked = step(w, { toggleDock: true });
    // The Courier is size S: the smallest free pad that fits is Harbour's first S pad.
    expect(docked.events[0]).toEqual({ type: 'docked', shipId: SHIP, stationId: station.id, padId: 's1' });
    const pad = station.pads.find((p) => p.id === 's1')!;
    const padAt = { x: station.position.x + pad.position.x, y: station.position.y + pad.position.y };
    expect(ship(docked).state).toBe('docked');
    expect(ship(docked).padId).toBe('s1');
    expect(ship(docked).position).toEqual(padAt);
    expect(ship(docked).heading).toBe(pad.facing);

    // Thrust while docked does nothing.
    const still = step(docked, { thrustForward: true });
    expect(ship(still).position).toEqual(padAt);

    const undocked = step(still, { toggleDock: true });
    expect(undocked.events[0]).toEqual({ type: 'undocked', shipId: SHIP, stationId: station.id });
    const s = ship(undocked);
    expect(s.state).toBe('flying');
    expect(s.padId).toBeNull();
    // Launched out along the pad's facing, clear of the hull.
    const out = { x: Math.cos(pad.facing), y: Math.sin(pad.facing) };
    const dist = Math.hypot(s.position.x - station.position.x, s.position.y - station.position.y);
    expect(dist).toBeGreaterThan(station.radius + 18);
    expect(s.velocity.x * out.x + s.velocity.y * out.y).toBeGreaterThan(0);
  });

  it('is pure: the input world is not mutated', () => {
    const w = world();
    const snapshot = JSON.stringify(w);
    step(w, { thrustForward: true, toggleDock: true });
    expect(JSON.stringify(w)).toBe(snapshot);
  });
});
