import { describe, expect, it } from 'vitest';
import { FIXED_DT } from '../constants.js';
import { HULLS } from '../hulls.js';
import { stepShip } from '../ship.js';
import type { Ship } from '../types.js';
import { emptyInput } from '../world.js';
import { length } from '../vec2.js';

const hull = HULLS['sparrow']!;

function ship(): Ship {
  return {
    id: 's',
    hullId: hull.id,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    heading: 0,
    state: 'flying',
    dockedAt: null,
  };
}

function run(s: Ship, input = emptyInput(), ticks = 1): Ship {
  for (let i = 0; i < ticks; i++) s = stepShip(s, hull, input, FIXED_DT);
  return s;
}

describe('ship flight model', () => {
  it('stays put with no input', () => {
    const s = run(ship(), emptyInput(), 60);
    expect(s.position).toEqual({ x: 0, y: 0 });
    expect(s.velocity).toEqual({ x: 0, y: 0 });
  });

  it('accelerates along its heading when thrusting forward', () => {
    const s = run(ship(), { ...emptyInput(), thrustForward: true }, 60);
    expect(s.velocity.x).toBeGreaterThan(0);
    expect(Math.abs(s.velocity.y)).toBeLessThan(1e-9);
    expect(s.position.x).toBeGreaterThan(0);
  });

  it('keeps drifting after thrust stops (Newtonian)', () => {
    const moving = run(ship(), { ...emptyInput(), thrustForward: true }, 60);
    const later = run(moving, emptyInput(), 30);
    expect(length(later.velocity)).toBeGreaterThan(0);
    expect(later.position.x).toBeGreaterThan(moving.position.x);
  });

  it('has a terminal velocity', () => {
    const a = run(ship(), { ...emptyInput(), thrustForward: true }, 60 * 30);
    const b = run(a, { ...emptyInput(), thrustForward: true }, 60 * 30);
    expect(length(b.velocity) - length(a.velocity)).toBeLessThan(1);
    expect(length(b.velocity)).toBeLessThan(1000);
  });

  it('braking brings the ship to a full stop', () => {
    const moving = run(ship(), { ...emptyInput(), thrustForward: true }, 60);
    const stopped = run(moving, { ...emptyInput(), brake: true }, 60 * 10);
    expect(stopped.velocity).toEqual({ x: 0, y: 0 });
  });

  it('turns towards the aim heading at a bounded rate', () => {
    const s = run(ship(), { ...emptyInput(), aimHeading: Math.PI / 2 }, 1);
    expect(s.heading).toBeCloseTo(hull.turnRate * FIXED_DT, 6);
    const settled = run(ship(), { ...emptyInput(), aimHeading: Math.PI / 2 }, 60 * 2);
    expect(settled.heading).toBeCloseTo(Math.PI / 2, 6);
  });

  it('turns the short way round', () => {
    const start = { ...ship(), heading: Math.PI * 0.9 };
    const s = run(start, { ...emptyInput(), aimHeading: -Math.PI * 0.9 }, 1);
    // Should go through PI, not back through 0.
    expect(s.heading).toBeGreaterThan(Math.PI * 0.9);
  });

  it('does not move while docked', () => {
    const docked: Ship = { ...ship(), state: 'docked', dockedAt: 'x' };
    const s = run(docked, { ...emptyInput(), thrustForward: true }, 60);
    expect(s).toEqual(docked);
  });
});
