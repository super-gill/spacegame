import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HULL_GEOMETRY } from './hull-geometry.js';
import { HULLS } from './hulls.js';
// @ts-expect-error: a plain script, no types
import { render } from '../../../scripts/geometry.mjs';

const ships = JSON.parse(readFileSync(new URL('../../../art/ships/ships.json', import.meta.url), 'utf8'));

/** Whether a point is inside a convex polygon grown by `margin`. */
function inside(poly: { x: number; y: number }[], p: { x: number; y: number }, margin: number): boolean {
  const n = poly.length;
  let sign = 0;
  for (let i = 0; i < n; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % n]!;
    const cross = ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) / Math.hypot(b.x - a.x, b.y - a.y);
    if (Math.abs(cross) <= margin) continue;
    const s = Math.sign(cross);
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

describe('hull geometry from the art', () => {
  it('is in step with art/ships/ships.json (run `npm run geometry`)', () => {
    expect(readFileSync(new URL('./hull-geometry.ts', import.meta.url), 'utf8')).toBe(render(ships));
  });

  it('covers every hull in the game, with every weapon and PDC mount marked', () => {
    for (const hull of Object.values(HULLS)) {
      const geometry = HULL_GEOMETRY[hull.id];
      expect(geometry, hull.id).toBeDefined();
      for (const m of hull.mounts) {
        if (m.type === 'high' || m.type === 'ciws') expect(geometry!.mounts[m.id], `${hull.id} ${m.id}`).toBeDefined();
      }
    }
  });

  it('puts every mount on the drawn hull', () => {
    for (const hull of Object.values(HULLS)) {
      for (const m of hull.mounts) {
        expect(inside(hull.outline, m.position, hull.radius * 0.15), `${hull.id} ${m.id}`).toBe(true);
      }
    }
  });
});
