import { describe, expect, it } from 'vitest';
import { angleDelta } from '../angle.js';
import { buildShip } from '../factory.js';
import { LOADOUTS } from '../loadouts.js';
import { stepShip } from '../ship.js';
import { shipStats } from '../stats.js';
import type { FlightMode, Ship, ShipInput } from '../types.js';
import { createStarterWorld, emptyInput } from '../world.js';

/** Mouse steering: the flight computer turns the nose to `ShipInput.aimHeading` (4 November 2026). */

const DT = 1 / 60;
const w = createStarterWorld();

function tern(mode: FlightMode, loadoutId = 'meridian-starter'): Ship {
  const s = buildShip(w, { id: 'x', loadout: LOADOUTS[loadoutId]!, ownerId: null, position: { x: 0, y: 0 }, heading: 0, flightMode: mode });
  return { ...s, state: 'flying', dockedAt: null };
}

function fly(s: Ship, input: Partial<ShipInput>, seconds: number): Ship {
  const stats = shipStats(w, s);
  for (let i = 0; i < seconds * 60; i++) s = stepShip(s, stats, { ...emptyInput(), ...input }, DT);
  return s;
}

describe('mouse steering', () => {
  it('turns the nose to the aim and stops there, in every flight mode', () => {
    for (const mode of ['assisted', 'rotation', 'manual'] as const) {
      const s = fly(tern(mode), { aimHeading: Math.PI / 2 }, 3);
      expect(Math.abs(angleDelta(s.heading, Math.PI / 2)), mode).toBeLessThan(0.01);
      expect(Math.abs(s.angularVelocity), mode).toBeLessThan(0.05);
    }
  });

  it('takes the short way round and does not overshoot', () => {
    let s = tern('assisted');
    const stats = shipStats(w, s);
    let worst = 0;
    for (let i = 0; i < 180; i++) {
      s = stepShip(s, stats, { ...emptyInput(), aimHeading: -2 }, DT);
      worst = Math.min(worst, s.heading);
      // Never swings past the aim.
      expect(angleDelta(s.heading, -2)).toBeLessThanOrEqual(0.001);
    }
    expect(worst).toBeGreaterThanOrEqual(-2.001);
  });

  it('a heavy hull turns more slowly to the same aim', () => {
    const quick = fly(tern('assisted'), { aimHeading: Math.PI / 2 }, 1);
    const slow = fly(tern('assisted', 'tessaract-trader'), { aimHeading: Math.PI / 2 }, 1);
    expect(Math.abs(angleDelta(quick.heading, Math.PI / 2))).toBeLessThan(Math.abs(angleDelta(slow.heading, Math.PI / 2)));
  });

  it('held turn keys win over the aim', () => {
    const s = fly(tern('assisted'), { aimHeading: Math.PI / 2, turnLeft: true }, 0.5);
    expect(s.heading).toBeLessThan(0);
  });

  it('does nothing without rotation thrusters', () => {
    const s = tern('assisted');
    const { c1: _thrusters, ...fit } = s.fit;
    const after = fly({ ...s, fit }, { aimHeading: Math.PI / 2 }, 1);
    expect(after.heading).toBe(0);
  });
});

describe('manoeuvring speed (WorldRules.manoeuvreSpeed)', () => {
  /** Fly with the limit at `share` for `seconds`. */
  function flyAt(s: Ship, input: Partial<ShipInput>, seconds: number, share: number): Ship {
    const stats = shipStats(w, s);
    for (let i = 0; i < seconds * 60; i++) s = stepShip(s, stats, { ...emptyInput(), ...input }, DT, { x: 0, y: 0 }, { x: 0, y: 0 }, share);
    return s;
  }

  it('lets thrust reach top speed forward but only its share sideways and backwards', () => {
    const top = shipStats(w, tern('manual')).maxSpeed;
    const forward = flyAt(tern('manual'), { thrustForward: true }, 10, 0.2);
    const sideways = flyAt(tern('manual'), { strafeRight: true }, 10, 0.2);
    const backwards = flyAt(tern('manual'), { thrustReverse: true }, 10, 0.2);
    expect(Math.hypot(forward.velocity.x, forward.velocity.y)).toBeCloseTo(top, 3);
    expect(Math.hypot(sideways.velocity.x, sideways.velocity.y)).toBeCloseTo(top * 0.2, 3);
    expect(Math.hypot(backwards.velocity.x, backwards.velocity.y)).toBeCloseTo(top * 0.2, 3);
  });

  it('never cuts momentum: a ship that turns at speed keeps its drift', () => {
    const fast = flyAt(tern('manual'), { thrustForward: true }, 10, 0.2);
    const turned = { ...fast, heading: Math.PI / 2 };
    const after = flyAt(turned, {}, 1, 0.2);
    expect(after.velocity.x).toBeCloseTo(fast.velocity.x, 6);
  });

  it('at 0 a ship only thrusts where its nose points; at 1 every way alike', () => {
    expect(Math.hypot(...Object.values(flyAt(tern('manual'), { strafeRight: true }, 3, 0).velocity))).toBe(0);
    const top = shipStats(w, tern('manual')).maxSpeed;
    expect(Math.hypot(...Object.values(flyAt(tern('manual'), { strafeRight: true }, 20, 1).velocity))).toBeCloseTo(top, 3);
  });

  it('starts new worlds at 20%', () => {
    expect(w.rules.manoeuvreSpeed).toBe(0.2);
  });
});
