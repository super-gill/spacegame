import { describe, expect, it } from 'vitest';
import { FIXED_DT, SPACE_ANGULAR_DRAG, SPACE_DRAG } from '../constants.js';
import { HULLS } from '../hulls.js';
import { stepShip } from '../ship.js';
import type { PlayerInput, Ship } from '../types.js';
import { emptyInput } from '../world.js';
import { length } from '../vec2.js';

const hull = HULLS['sparrow']!;
const mainAccel = hull.mainThrust / hull.mass;
const angularAccel = hull.rotationThrust / hull.mass;

function ship(overrides: Partial<Ship> = {}): Ship {
  return {
    id: 's',
    hullId: hull.id,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    heading: 0,
    angularVelocity: 0,
    state: 'flying',
    dockedAt: null,
    ...overrides,
  };
}

function input(overrides: Partial<PlayerInput> = {}): PlayerInput {
  return { ...emptyInput(), ...overrides };
}

function run(s: Ship, i: PlayerInput = emptyInput(), ticks = 1): Ship {
  for (let n = 0; n < ticks; n++) s = stepShip(s, hull, i, FIXED_DT);
  return s;
}

const SECOND = 60;

describe('linear flight', () => {
  it('stays put with no input', () => {
    const s = run(ship(), emptyInput(), SECOND);
    expect(s.position).toEqual({ x: 0, y: 0 });
    expect(s.velocity).toEqual({ x: 0, y: 0 });
  });

  it('accelerates along its heading when thrusting forward', () => {
    const s = run(ship(), input({ thrustForward: true }), SECOND);
    expect(s.velocity.x).toBeGreaterThan(0);
    expect(Math.abs(s.velocity.y)).toBeLessThan(1e-9);
  });

  it('keeps drifting after thrust stops (Newtonian)', () => {
    const moving = run(ship(), input({ thrustForward: true }), SECOND);
    const later = run(moving, emptyInput(), SECOND);
    expect(length(later.velocity)).toBeGreaterThan(length(moving.velocity) * 0.9);
  });

  it('space drag is minor next to engine thrust', () => {
    // One second of thrust should land within a few percent of drag-free.
    const s = run(ship(), input({ thrustForward: true }), SECOND);
    expect(s.velocity.x).toBeCloseTo(mainAccel - SPACE_DRAG, 6);
    expect(SPACE_DRAG / mainAccel).toBeLessThan(0.05);
  });

  it('space drag bleeds stray drift to exactly zero', () => {
    const drifting = ship({ velocity: { x: 12, y: -9 } }); // 15 u/s
    const s = run(drifting, emptyInput(), SECOND * 10);
    expect(s.velocity).toEqual({ x: 0, y: 0 });
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

  it('braking brings the ship to a full stop', () => {
    const moving = run(ship(), input({ thrustForward: true }), SECOND);
    const stopped = run(moving, input({ brake: true }), SECOND * 5);
    expect(stopped.velocity).toEqual({ x: 0, y: 0 });
  });
});

describe('rotation', () => {
  it('rotation thrusters add spin, clockwise for turnRight', () => {
    const s = run(ship(), input({ turnRight: true }), 1);
    expect(s.angularVelocity).toBeCloseTo((angularAccel - SPACE_ANGULAR_DRAG) * FIXED_DT, 9);
    expect(s.heading).toBeGreaterThan(0);
  });

  it('turnLeft adds anticlockwise spin', () => {
    const s = run(ship(), input({ turnLeft: true }), 1);
    expect(s.angularVelocity).toBeLessThan(0);
    expect(s.heading).toBeLessThan(0);
  });

  it('keeps spinning after the key is released (angular momentum)', () => {
    const spun = run(ship(), input({ turnRight: true }), 10);
    const later = run(spun, emptyInput(), SECOND / 2);
    expect(later.angularVelocity).toBeGreaterThan(spun.angularVelocity * 0.8);
    expect(later.heading).toBeGreaterThan(spun.heading);
  });

  it('angular drag is minor next to rotation thrust', () => {
    expect(SPACE_ANGULAR_DRAG / angularAccel).toBeLessThan(0.05);
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

  it('angular drag bleeds stray spin to exactly zero', () => {
    const s = run(ship({ angularVelocity: 0.5 }), emptyInput(), SECOND * 5);
    expect(s.angularVelocity).toBe(0);
  });

  it('brake kills spin', () => {
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
  it('does not move or spin while docked', () => {
    const docked = ship({ state: 'docked', dockedAt: 'x', angularVelocity: 0 });
    const s = run(docked, input({ thrustForward: true, turnRight: true }), SECOND);
    expect(s).toEqual(docked);
  });
});
