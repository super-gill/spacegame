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
      // Too fast relative to the station, which is itself moving.
      velocity: { x: station.velocity.x + DOCK_MAX_SPEED + 1, y: station.velocity.y },
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
      velocity: { ...station.velocity },
      heading: 0,
    };

    const docked = step(w, { toggleDock: true });
    // The Courier is size S: the smallest free pad that fits is Harbour's first S pad.
    expect(docked.events[0]).toEqual({ type: 'docked', shipId: SHIP, stationId: station.id, padId: 's1' });
    const pad = station.pads.find((p) => p.id === 's1')!;
    // The ship rides its pad wherever the station is, at the station's velocity.
    const padAt = (x: World) => ({ x: x.stations[station.id]!.position.x + pad.position.x, y: x.stations[station.id]!.position.y + pad.position.y });
    expect(ship(docked).state).toBe('docked');
    expect(ship(docked).padId).toBe('s1');
    expect(ship(docked).position).toEqual(padAt(docked));
    expect(ship(docked).velocity).toEqual(docked.stations[station.id]!.velocity);
    expect(ship(docked).heading).toBe(pad.facing);

    // Thrust while docked does nothing but ride the pad.
    const still = step(docked, { thrustForward: true });
    expect(ship(still).position).toEqual(padAt(still));

    const undocked = step(still, { toggleDock: true });
    expect(undocked.events[0]).toEqual({ type: 'undocked', shipId: SHIP, stationId: station.id });
    const s = ship(undocked);
    expect(s.state).toBe('flying');
    expect(s.padId).toBeNull();
    // Launched out along the pad's facing, clear of the hull.
    const out = { x: Math.cos(pad.facing), y: Math.sin(pad.facing) };
    const here = undocked.stations[station.id]!;
    const dist = Math.hypot(s.position.x - here.position.x, s.position.y - here.position.y);
    expect(dist).toBeGreaterThan(station.radius + 18);
    // Moving away from the station, relative to it.
    const rel = { x: s.velocity.x - here.velocity.x, y: s.velocity.y - here.velocity.y };
    expect(rel.x * out.x + rel.y * out.y).toBeGreaterThan(0);
  });

  it('is pure: the input world is not mutated', () => {
    const w = world();
    const snapshot = JSON.stringify(w);
    step(w, { thrustForward: true, toggleDock: true });
    expect(JSON.stringify(w)).toBe(snapshot);
  });
});
