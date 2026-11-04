import { describe, expect, it } from 'vitest';
import { WEAPONS, createStarterWorld } from '@spacegame/sim';
import { describeGun, sustainedDps } from './outfitting-panel.js';

describe('sustainedDps', () => {
  it('spreads a magazine over its reload', () => {
    const w = WEAPONS['autocannon-s']!;
    const expected = (w.damage * w.magazine) / (w.magazine * w.fireInterval + w.reloadSeconds);
    expect(sustainedDps(w)).toBeCloseTo(expected);
    expect(sustainedDps(w)).toBeLessThan(w.damage / w.fireInterval);
  });

  it('is the plain rate for an energy gun', () => {
    const w = WEAPONS['pulse-laser-s']!;
    expect(sustainedDps(w)).toBeCloseTo(w.damage / w.fireInterval);
  });
});

describe('describeGun', () => {
  const world = createStarterWorld();

  it('says what an ammunition gun loads and that it needs no capacitor', () => {
    const text = describeGun(WEAPONS['autocannon-s']!, world).join('; ');
    expect(text).toMatch(/sustained/);
    expect(text).toMatch(/magazine of rounds/);
    expect(text).toMatch(/no capacitor/);
  });

  it('gives an energy gun its capacitor cost per shot and per second firing', () => {
    const w = WEAPONS['pulse-laser-s']!;
    const text = describeGun(w, world).join('; ');
    expect(text).toContain(`${w.capacitorPerShot} cap a shot`);
    expect(text).not.toMatch(/sustained|magazine/);
  });
});
