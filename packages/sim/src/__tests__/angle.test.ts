import { describe, expect, it } from 'vitest';
import { angleDelta, turnTowards, wrapAngle } from '../angle.js';

describe('angle helpers', () => {
  it('wraps into (-PI, PI]', () => {
    expect(wrapAngle(Math.PI * 3)).toBeCloseTo(Math.PI, 9);
    expect(wrapAngle(-Math.PI)).toBeCloseTo(Math.PI, 9);
    expect(wrapAngle(0.5)).toBeCloseTo(0.5, 9);
  });

  it('gives the shortest signed difference', () => {
    expect(angleDelta(Math.PI * 0.9, -Math.PI * 0.9)).toBeCloseTo(Math.PI * 0.2, 9);
  });

  // Used by AI ships to steer towards a target.
  it('turnTowards steps by at most maxStep, the short way round', () => {
    expect(turnTowards(0, 1, 0.1)).toBeCloseTo(0.1, 9);
    expect(turnTowards(0, 0.05, 0.1)).toBeCloseTo(0.05, 9);
    expect(turnTowards(Math.PI * 0.9, -Math.PI * 0.9, 0.1)).toBeGreaterThan(Math.PI * 0.9);
  });
});
