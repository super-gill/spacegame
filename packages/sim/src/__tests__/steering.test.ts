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
