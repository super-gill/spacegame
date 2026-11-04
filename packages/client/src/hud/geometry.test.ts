import { describe, expect, it } from 'vitest';
import { arcPath, closingSpeed, fraction, reloadProgress, silhouettePoints } from './geometry.js';

/** End point of an arc path, as numbers. */
function arcEnd(path: string): [number, number] {
  const parts = path.trim().split(/[ ,]+/);
  return [Number(parts[parts.length - 2]), Number(parts[parts.length - 1])];
}

describe('fraction', () => {
  it('clamps to 0..1', () => {
    expect(fraction(50, 100)).toBe(0.5);
    expect(fraction(150, 100)).toBe(1);
    expect(fraction(-5, 100)).toBe(0);
  });

  it('reads a zero or broken maximum as empty', () => {
    expect(fraction(10, 0)).toBe(0);
    expect(fraction(Number.NaN, 100)).toBe(0);
  });
});

describe('arcPath', () => {
  it('draws nothing for an empty gauge', () => {
    expect(arcPath(0, 0, 10, 0, 0, 270)).toBe('');
  });

  it('ends a quarter turn clockwise from east at south (screen down)', () => {
    const [x, y] = arcEnd(arcPath(0, 0, 10, 1, 0, 90));
    expect(x).toBeCloseTo(0, 1);
    expect(y).toBeCloseTo(10, 1);
  });

  it('uses the large-arc flag only past half a turn', () => {
    expect(arcPath(0, 0, 10, 1, 0, 170)).toContain(' 0 0 1 ');
    expect(arcPath(0, 0, 10, 1, 0, 200)).toContain(' 0 1 1 ');
  });

  it('draws a full circle as two half arcs, so it shows', () => {
    const path = arcPath(0, 0, 10, 1, -90, 360);
    expect(path.match(/M/g)).toHaveLength(2);
    const [x, y] = arcEnd(path);
    expect(x).toBeCloseTo(0, 1);
    expect(y).toBeCloseTo(-10, 1);
  });

  it('never lets an arc end where it starts', () => {
    for (const f of [0.999, 0.9999, 1]) {
      for (const part of arcPath(0, 0, 84, f, 135, 360).split('M').filter(Boolean)) {
        const nums = part.trim().split(/[ ,A]+/).filter(Boolean).map(Number);
        const [x0, y0] = [nums[0]!, nums[1]!];
        const [x1, y1] = [nums[nums.length - 2]!, nums[nums.length - 1]!];
        expect(Math.hypot(x1 - x0, y1 - y0)).toBeGreaterThan(0.05);
      }
    }
  });
});

describe('closingSpeed', () => {
  const still = { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } };

  it('is positive while the gap shrinks', () => {
    expect(closingSpeed(still, { position: { x: 100, y: 0 }, velocity: { x: -30, y: 0 } })).toBeCloseTo(30);
  });

  it('is negative while the gap grows', () => {
    expect(closingSpeed(still, { position: { x: 100, y: 0 }, velocity: { x: 20, y: 0 } })).toBeCloseTo(-20);
  });

  it('ignores sideways motion', () => {
    expect(closingSpeed(still, { position: { x: 100, y: 0 }, velocity: { x: 0, y: 50 } })).toBeCloseTo(0);
  });

  it('is zero when the ships touch', () => {
    expect(closingSpeed(still, still)).toBe(0);
  });
});

describe('reloadProgress', () => {
  it('is ready with no cooldown left', () => {
    expect(reloadProgress(0, 0.5, 1 / 60)).toBe(1);
  });

  it('is at the start just after firing', () => {
    expect(reloadProgress(30, 0.5, 1 / 60)).toBeCloseTo(0);
  });

  it('is half way half way through', () => {
    expect(reloadProgress(15, 0.5, 1 / 60)).toBeCloseTo(0.5);
  });
});

describe('silhouettePoints', () => {
  it('turns a hull that points east to point up, keeping its right side on the right', () => {
    const points = silhouettePoints(
      [
        { x: 10, y: 0 },
        { x: -10, y: 5 },
      ],
      20,
    )
      .split(' ')
      .map((p) => p.split(',').map(Number));
    expect(points[0]).toEqual([0, -10]);
    expect(points[1]![0]).toBeGreaterThan(0);
    expect(points[1]![1]).toBeCloseTo(10);
  });

  it('fits the widest point to the box', () => {
    const points = silhouettePoints([{ x: 4, y: 0 }], 40);
    expect(points).toBe('0.00,-20.00');
  });
});
