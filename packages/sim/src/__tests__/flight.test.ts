import { describe, expect, it } from 'vitest';
import { ASSIST_LINEAR_STRENGTH, FIXED_DT } from '../constants.js';
import { FLIGHT_MODES, idleThrusters, nextFlightMode } from '../flight.js';
import { TEST_SHIP_COMBAT } from './fixtures.js';
import { HULLS } from '../hulls.js';
import { stepShip } from '../ship.js';
import { stepWorld } from '../step.js';
import type { FlightMode, HullSpec, ShipInput, Ship } from '../types.js';
import { createStarterWorld, emptyInput, joinPilot, pilotShip } from '../world.js';
import { length } from '../vec2.js';

/** Flight computer tests: what each assist mode does on the pilot's behalf. */

const hull = HULLS['sparrow']!;
const SECOND = 60;

function ship(mode: FlightMode, overrides: Partial<Ship> = {}): Ship {
  return {
    id: 's',
    hullId: hull.id,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    heading: 0,
    angularVelocity: 0,
    state: 'flying',
    dockedAt: null,
    ownerId: null,
    flightMode: mode,
    thrusters: idleThrusters(),
    ...TEST_SHIP_COMBAT,
    ...overrides,
  };
}

function input(overrides: Partial<ShipInput> = {}): ShipInput {
  return { ...emptyInput(), ...overrides };
}

function run(s: Ship, i: ShipInput = emptyInput(), ticks = 1, h: HullSpec = hull): Ship {
  for (let n = 0; n < ticks; n++) s = stepShip(s, h, i, FIXED_DT);
  return s;
}

describe('mode cycling', () => {
  it('cycles assisted, rotation, manual, then back', () => {
    expect(FLIGHT_MODES).toEqual(['assisted', 'rotation', 'manual']);
    expect(nextFlightMode('assisted')).toBe('rotation');
    expect(nextFlightMode('rotation')).toBe('manual');
    expect(nextFlightMode('manual')).toBe('assisted');
  });

  it('new pilots start in full assist', () => {
    const w = joinPilot(createStarterWorld(), 'p1', 'Tester');
    expect(pilotShip(w, 'p1')!.flightMode).toBe('assisted');
  });

  it('the cycle input switches mode and emits an event', () => {
    const w = joinPilot(createStarterWorld(), 'p1', 'Tester');
    const shipId = pilotShip(w, 'p1')!.id;
    const next = stepWorld(w, { [shipId]: input({ cycleFlightMode: true }) });
    expect(pilotShip(next, 'p1')!.flightMode).toBe('rotation');
    expect(next.events).toEqual([{ type: 'flightModeChanged', shipId, mode: 'rotation' }]);
  });
});

describe('full assist', () => {
  it('stops spin when no rotate key is held', () => {
    const spinning = ship('assisted', { angularVelocity: 2 });
    const s = run(spinning, emptyInput(), SECOND);
    expect(s.angularVelocity).toBe(0);
  });

  it('lets the pilot spin up while a rotate key is held', () => {
    const s = run(ship('assisted'), input({ turnRight: true }), 10);
    expect(s.angularVelocity).toBeGreaterThan(0);
  });

  it('eases drift to an exact stop with no keys held', () => {
    const drifting = ship('assisted', { velocity: { x: 150, y: -80 } });
    const s = run(drifting, emptyInput(), SECOND * 10);
    expect(s.velocity).toEqual({ x: 0, y: 0 });
  });

  it('eases rather than slams: uses partial thruster strength', () => {
    const drifting = ship('assisted', { velocity: { x: 0, y: 200 } }); // pure sideways drift
    const s = run(drifting, emptyInput(), 1);
    expect(s.thrusters.strafeLeft).toBeCloseTo(ASSIST_LINEAR_STRENGTH, 9);
  });

  it('cancels sideways drift while the pilot thrusts forward', () => {
    // Moving sideways, pilot holds W: forward axis is the pilot's, lateral is the computer's.
    const drifting = ship('assisted', { velocity: { x: 0, y: 100 } });
    const s = run(drifting, input({ thrustForward: true }), SECOND * 5);
    expect(Math.abs(s.velocity.y)).toBeLessThan(1e-6);
    expect(s.velocity.x).toBeGreaterThan(100);
  });

  it('does not fight a key the pilot is holding on that axis', () => {
    const s = run(ship('assisted'), input({ strafeRight: true }), SECOND);
    expect(s.velocity.y).toBeGreaterThan(0);
    expect(s.thrusters.strafeLeft).toBe(0);
  });

  it('is limited by the real thrusters: a heavier hull settles more slowly', () => {
    const heavy: HullSpec = { ...hull, mass: hull.mass * 4 };
    const start = { velocity: { x: 100, y: 0 } };
    const light = run(ship('assisted', start), emptyInput(), SECOND);
    const slow = run(ship('assisted', start), emptyInput(), SECOND, heavy);
    expect(length(slow.velocity)).toBeGreaterThan(length(light.velocity));
  });
});

describe('rotation assist', () => {
  it('stops spin when no rotate key is held', () => {
    const s = run(ship('rotation', { angularVelocity: -2 }), emptyInput(), SECOND);
    expect(s.angularVelocity).toBe(0);
  });

  it('leaves drift alone', () => {
    const s = run(ship('rotation', { velocity: { x: 40, y: 30 } }), emptyInput(), SECOND * 10);
    expect(s.velocity).toEqual({ x: 40, y: 30 });
  });
});

describe('manual', () => {
  it('leaves spin and drift alone', () => {
    const start = ship('manual', { velocity: { x: 40, y: 30 }, angularVelocity: 1 });
    const s = run(start, emptyInput(), SECOND * 10);
    expect(s.velocity).toEqual({ x: 40, y: 30 });
    expect(s.angularVelocity).toBe(1);
    expect(s.thrusters).toEqual(idleThrusters());
  });
});

describe('brake', () => {
  it('stops spin and drift in every mode', () => {
    for (const mode of FLIGHT_MODES) {
      const start = ship(mode, { velocity: { x: 120, y: -60 }, angularVelocity: 2 });
      const s = run(start, input({ brake: true }), SECOND * 5);
      expect(s.velocity).toEqual({ x: 0, y: 0 });
      expect(s.angularVelocity).toBe(0);
    }
  });
});
