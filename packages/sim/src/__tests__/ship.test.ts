import { describe, expect, it } from 'vitest';
import { FIXED_DT } from '../constants.js';
import { idleThrusters } from '../flight.js';
import { TEST_SHIP_COMBAT } from './fixtures.js';
import { HULLS } from '../hulls.js';
import { stepShip } from '../ship.js';
import type { FlightMode, ShipInput, Ship } from '../types.js';
import { emptyInput } from '../world.js';
import { length } from '../vec2.js';

/**
 * Physics tests. These run in manual mode so the flight computer only
 * fires what the input asks for, and we are testing pure Newtonian motion.
 * Assist behaviour is tested in flight.test.ts.
 */

const hull = HULLS['sparrow']!;
const mainAccel = hull.mainThrust / hull.mass;
const angularAccel = hull.rotationThrust / hull.mass;

function ship(overrides: Partial<Ship> = {}, mode: FlightMode = 'manual'): Ship {
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

function run(s: Ship, i: ShipInput = emptyInput(), ticks = 1): Ship {
  for (let n = 0; n < ticks; n++) s = stepShip(s, hull, i, FIXED_DT);
  return s;
}

const SECOND = 60;

describe('linear flight (manual)', () => {
  it('stays put with no input', () => {
    const s = run(ship(), emptyInput(), SECOND);
    expect(s.position).toEqual({ x: 0, y: 0 });
    expect(s.velocity).toEqual({ x: 0, y: 0 });
  });

  it('accelerates along its heading at exactly thrust / mass', () => {
    const s = run(ship(), input({ thrustForward: true }), SECOND);
    expect(s.velocity.x).toBeCloseTo(mainAccel, 6);
    expect(Math.abs(s.velocity.y)).toBeLessThan(1e-9);
  });

  it('has no drag: drift is preserved exactly', () => {
    const drifting = ship({ velocity: { x: 12, y: -9 } });
    const later = run(drifting, emptyInput(), SECOND * 60);
    expect(later.velocity).toEqual({ x: 12, y: -9 });
  });

  it('never exceeds the hull speed limit', () => {
    const s = run(ship(), input({ thrustForward: true }), SECOND * 30);
    expect(length(s.velocity)).toBeCloseTo(hull.maxSpeed, 6);
  });

  it('can still change direction at the speed limit', () => {
    const fast = run(ship(), input({ thrustForward: true }), SECOND * 30);
    const bent = run(fast, input({ strafeRight: true }), SECOND);
    expect(bent.velocity.y).toBeGreaterThan(10);
    expect(length(bent.velocity)).toBeLessThanOrEqual(hull.maxSpeed + 1e-9);
  });

  it('braking brings the ship to an exact stop', () => {
    const moving = run(ship(), input({ thrustForward: true, strafeLeft: true }), SECOND);
    const stopped = run(moving, input({ brake: true }), SECOND * 5);
    expect(stopped.velocity).toEqual({ x: 0, y: 0 });
  });

  it('brake overrides thrust keys held at the same time', () => {
    const moving = run(ship(), input({ thrustForward: true }), SECOND);
    const stopped = run(moving, input({ brake: true, thrustForward: true }), SECOND * 5);
    expect(stopped.velocity).toEqual({ x: 0, y: 0 });
  });

  it('brakes with the real thrusters: forward motion is stopped by the weaker reverse engine', () => {
    const moving = ship({ velocity: { x: 100, y: 0 } });
    const s = run(moving, input({ brake: true }), 1);
    expect(s.thrusters.reverse).toBe(1);
    expect(s.thrusters.main).toBe(0);
    expect(s.velocity.x).toBeCloseTo(100 - (hull.reverseThrust / hull.mass) * FIXED_DT, 9);
  });

  it('records which thrusters fired', () => {
    const s = run(ship(), input({ thrustForward: true, strafeRight: true }), 1);
    expect(s.thrusters).toEqual({ ...idleThrusters(), main: 1, strafeRight: 1 });
  });
});

describe('rotation (manual)', () => {
  it('rotation thrusters add spin, clockwise for turnRight', () => {
    const s = run(ship(), input({ turnRight: true }), 1);
    expect(s.angularVelocity).toBeCloseTo(angularAccel * FIXED_DT, 9);
    expect(s.heading).toBeGreaterThan(0);
  });

  it('turnLeft adds anticlockwise spin', () => {
    const s = run(ship(), input({ turnLeft: true }), 1);
    expect(s.angularVelocity).toBeLessThan(0);
    expect(s.heading).toBeLessThan(0);
  });

  it('has no angular drag: spin is preserved exactly', () => {
    const spun = run(ship(), input({ turnRight: true }), 10);
    const later = run(spun, emptyInput(), SECOND * 10);
    expect(later.angularVelocity).toBe(spun.angularVelocity);
  });

  it('the opposite key slows the spin', () => {
    const spun = run(ship(), input({ turnRight: true }), 10);
    const countered = run(spun, input({ turnLeft: true }), 5);
    expect(countered.angularVelocity).toBeLessThan(spun.angularVelocity);
  });

  it('spin is capped at the hull turn rate', () => {
    const s = run(ship(), input({ turnRight: true }), SECOND * 5);
    expect(s.angularVelocity).toBeCloseTo(hull.maxTurnRate, 9);
  });

  it('brake kills spin exactly', () => {
    const spun = run(ship(), input({ turnRight: true }), SECOND);
    const s = run(spun, input({ brake: true }), SECOND);
    expect(s.angularVelocity).toBe(0);
  });

  it('both or neither keys add no spin', () => {
    expect(run(ship(), input({ turnLeft: true, turnRight: true }), SECOND).heading).toBe(0);
    expect(run(ship(), emptyInput(), SECOND).heading).toBe(0);
  });

  it('keeps heading wrapped into (-PI, PI]', () => {
    const s = run(ship(), input({ turnRight: true }), SECOND * 5);
    expect(s.heading).toBeGreaterThan(-Math.PI);
    expect(s.heading).toBeLessThanOrEqual(Math.PI);
  });

  it('rotating does not change velocity', () => {
    const moving = run(ship(), input({ thrustForward: true }), 30);
    const turned = stepShip(moving, hull, input({ turnRight: true }), FIXED_DT);
    const coasted = stepShip(moving, hull, emptyInput(), FIXED_DT);
    expect(turned.velocity).toEqual(coasted.velocity);
  });
});

describe('docked', () => {
  it('does not move, spin or fire thrusters while docked', () => {
    const docked = ship({ state: 'docked', dockedAt: 'x' });
    const s = run(docked, input({ thrustForward: true, turnRight: true }), SECOND);
    expect(s).toEqual(docked);
  });
});
