import { describe, expect, it } from 'vitest';
import { coverage } from './gun-arcs.js';

const DEG = Math.PI / 180;
const span = (s: { from: number; to: number }): number => Math.round((s.to - s.from) / DEG);

describe('the coverage ring', () => {
  it('one bow gun covers the forward half and leaves the stern open', () => {
    const segs = coverage([{ facing: 0, arc: Math.PI }]);
    expect(segs).toHaveLength(1);
    expect(segs[0]!.count).toBe(1);
    expect(span(segs[0]!)).toBe(180);
    // Centred on the nose, to within half a 4 degree step.
    expect(Math.abs((segs[0]!.from + segs[0]!.to) / 2)).toBeLessThanOrEqual(2 * DEG + 1e-9);
  });

  it('counts overlapping guns, and leaves out where none can bear', () => {
    // Two bow guns and one broadside gun to starboard (270 degrees, blind to port).
    const segs = coverage([
      { facing: 0, arc: Math.PI },
      { facing: 0, arc: Math.PI },
      { facing: Math.PI / 2, arc: Math.PI * 1.5 },
    ]);
    const total = segs.reduce((n, s) => n + span(s), 0);
    // Uncovered: the port quarter, from straight to port round to the stern-port quarter (45 degrees).
    expect(total).toBe(360 - 44);
    expect(Math.max(...segs.map((s) => s.count))).toBe(3);
  });

  it('joins a stretch that runs over the stern into one', () => {
    const segs = coverage([{ facing: Math.PI, arc: Math.PI / 2 }]);
    expect(segs).toHaveLength(1);
    expect(span(segs[0]!)).toBe(88);
  });

  it('no guns, no ring', () => {
    expect(coverage([])).toEqual([]);
  });
});
