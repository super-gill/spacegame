import { describe, expect, it } from 'vitest';
import { applyDamage, shieldCovers } from '../combat.js';
import { FIXED_DT, STOCK_SHIELD_ARC } from '../constants.js';
import { buildShip } from '../factory.js';
import { LOADOUTS } from '../loadouts.js';
import { MODULES } from '../modules.js';
import { shipStats } from '../stats.js';
import type { Ship } from '../types.js';
import { createStarterWorld } from '../world.js';

/** Shield arcs: the shield covers the bow and beams; the stern is open for the drive (4 November 2026). */

const w = createStarterWorld();

function tern(): Ship {
  const s = buildShip(w, { id: 't', loadout: LOADOUTS['meridian-starter']!, ownerId: null, position: { x: 0, y: 0 }, heading: 0, flightMode: 'assisted' });
  return { ...s, state: 'flying', dockedAt: null };
}

describe('shield arcs', () => {
  it('every shield generator leaves the stern open', () => {
    for (const m of Object.values(MODULES).filter((m) => m.kind === 'shieldGenerator')) {
      expect(m.shieldArc ?? STOCK_SHIELD_ARC, m.id).toBeLessThan(Math.PI * 2);
    }
  });

  it('covers the bow and beams, not the stern', () => {
    const s = tern();
    const stats = shipStats(w, s);
    expect(stats.shieldArc).toBeCloseTo(STOCK_SHIELD_ARC, 9);
    expect(shieldCovers(s, stats, { x: 100, y: 0 })).toBe(true); // ahead
    expect(shieldCovers(s, stats, { x: 0, y: 100 })).toBe(true); // abeam
    expect(shieldCovers(s, stats, { x: -100, y: 30 })).toBe(false); // astern
    // The arc turns with the ship.
    expect(shieldCovers({ ...s, heading: Math.PI }, stats, { x: -100, y: 30 })).toBe(true);
  });

  it('a hit from astern goes past the shield into the hull; the same hit ahead stops on the shield', () => {
    const s = tern();
    const stats = shipStats(w, s);
    const ahead = applyDamage(s, stats, 50, FIXED_DT, 'kinetic', { x: 200, y: 0 });
    const astern = applyDamage(s, stats, 50, FIXED_DT, 'kinetic', { x: -200, y: 0 });
    expect(ahead.structure).toBe(s.structure);
    expect(ahead.shield).toBeLessThan(s.shield);
    expect(astern.shield).toBe(s.shield);
    expect(astern.structure).toBeLessThan(s.structure);
  });

  it('a ship with no shield generator has no arc', () => {
    const s = tern();
    const { u1: _shield, ...fit } = s.fit;
    expect(shipStats(w, { ...s, fit }).shieldArc).toBe(0);
  });
});
