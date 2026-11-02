import { describe, expect, it } from 'vitest';
import { DOCK_MAX_SPEED } from '../constants.js';
import { stepWorld } from '../step.js';
import { createStarterWorld, emptyInput, playerShip } from '../world.js';

describe('docking', () => {
  it('refuses when too far from any station', () => {
    const world = createStarterWorld(); // player starts 650 units out, dock range 220
    const next = stepWorld(world, { ...emptyInput(), toggleDock: true });
    expect(next.events).toEqual([{ type: 'dockRefused', shipId: 'player', reason: 'tooFar' }]);
    expect(playerShip(next).state).toBe('flying');
  });

  it('refuses when too fast', () => {
    const world = createStarterWorld();
    const station = world.stations['station-harbour']!;
    world.ships['player'] = {
      ...playerShip(world),
      position: { x: station.position.x + 100, y: station.position.y },
      velocity: { x: DOCK_MAX_SPEED + 1, y: 0 },
    };
    const next = stepWorld(world, { ...emptyInput(), toggleDock: true });
    expect(next.events[0]).toEqual({ type: 'dockRefused', shipId: 'player', reason: 'tooFast' });
  });

  it('docks when close and slow, then undocks clear of the station', () => {
    const world = createStarterWorld();
    const station = world.stations['station-harbour']!;
    world.ships['player'] = {
      ...playerShip(world),
      position: { x: station.position.x + 100, y: station.position.y },
      velocity: { x: 0, y: 0 },
      heading: 0,
    };

    const docked = stepWorld(world, { ...emptyInput(), toggleDock: true });
    expect(docked.events[0]).toEqual({ type: 'docked', shipId: 'player', stationId: station.id });
    expect(playerShip(docked).state).toBe('docked');
    expect(playerShip(docked).position).toEqual(station.position);

    // Thrust while docked does nothing.
    const still = stepWorld(docked, { ...emptyInput(), thrustForward: true });
    expect(playerShip(still).position).toEqual(station.position);

    const undocked = stepWorld(still, { ...emptyInput(), toggleDock: true });
    expect(undocked.events[0]).toEqual({ type: 'undocked', shipId: 'player', stationId: station.id });
    const ship = playerShip(undocked);
    expect(ship.state).toBe('flying');
    expect(ship.position.x).toBeGreaterThan(station.position.x + station.radius);
    expect(ship.velocity.x).toBeGreaterThan(0);
  });

  it('is pure: the input world is not mutated', () => {
    const world = createStarterWorld();
    const snapshot = JSON.stringify(world);
    stepWorld(world, { ...emptyInput(), thrustForward: true, toggleDock: true });
    expect(JSON.stringify(world)).toBe(snapshot);
  });
});
