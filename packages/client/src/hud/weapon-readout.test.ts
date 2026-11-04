import { describe, expect, it } from 'vitest';
import { WEAPONS, GOODS } from '@spacegame/sim';
import { bearingWords, capacitorTone, gunSupply, gunWord, litSegments, swivelCoverage } from './weapon-readout.js';

const dt = 1 / 30;
const autocannon = WEAPONS['autocannon-s']!;
const pulse = WEAPONS['pulse-laser-s']!;
const blaster = WEAPONS['blaster-s']!;
const rounds = GOODS['rounds'];
const charges = GOODS['charges'];

describe('gunSupply', () => {
  it('reads rounds loaded and spare rounds in the hold', () => {
    const s = gunSupply(autocannon, { loaded: 32, reloadTicks: 0 }, 3, rounds, 50, 80, dt);
    expect(s.text).toBe('32 +60');
    expect(s.fill).toBeCloseTo(32 / autocannon.magazine);
    expect(s.tone).toBe('ok');
  });

  it('shows reload progress while reloading', () => {
    const total = Math.round(autocannon.reloadSeconds / dt);
    const s = gunSupply(autocannon, { loaded: 0, reloadTicks: total / 4 }, 1, rounds, 50, 80, dt);
    expect(s.text).toBe('RELOAD');
    expect(s.fill).toBeCloseTo(0.75);
  });

  it('reads low with a nearly empty magazine and nothing spare, dry with none at all', () => {
    expect(gunSupply(autocannon, { loaded: 3, reloadTicks: 0 }, 0, rounds, 50, 80, dt).tone).toBe('low');
    expect(gunSupply(autocannon, { loaded: 0, reloadTicks: 0 }, 0, rounds, 50, 80, dt)).toEqual({ text: 'DRY', fill: 0, tone: 'dry' });
  });

  it('counts the shots the capacitor can pay for on an energy gun', () => {
    const s = gunSupply(pulse, { loaded: 0, reloadTicks: 0 }, 0, undefined, 40, 80, dt);
    expect(s.text).toBe(`${Math.floor(40 / pulse.capacitorPerShot)} SHOTS`);
    expect(s.fill).toBeCloseTo(0.5);
    expect(gunSupply(pulse, { loaded: 0, reloadTicks: 0 }, 0, undefined, 1, 80, dt).tone).toBe('starved');
  });

  it('starves a hybrid gun of capacitor even with charges loaded', () => {
    const s = gunSupply(blaster, { loaded: 20, reloadTicks: 0 }, 2, charges, 0.5, 80, dt);
    expect(s.text).toBe('NO CAP');
    expect(s.tone).toBe('starved');
  });
});

describe('gunWord', () => {
  it('names the gun type, and swivels as swivels', () => {
    expect(gunWord(autocannon)).toBe('AUTOCANNON');
    expect(gunWord(WEAPONS['beam-laser-m']!)).toBe('BEAM');
    expect(gunWord(WEAPONS['swivel-s']!)).toBe('SWIVEL');
  });
});

describe('capacitorTone', () => {
  it('turns low under a quarter and empty below a shot', () => {
    expect(capacitorTone(60, 80, 1.6)).toBe('ok');
    expect(capacitorTone(15, 80, 1.6)).toBe('low');
    expect(capacitorTone(1.5, 80, 1.6)).toBe('empty');
  });
});

describe('litSegments', () => {
  it('lights the first segment for any charge and all at full', () => {
    expect(litSegments(0, 20)).toBe(0);
    expect(litSegments(0.001, 20)).toBe(1);
    expect(litSegments(0.5, 20)).toBe(10);
    expect(litSegments(1, 20)).toBe(20);
  });
});

describe('swivelCoverage', () => {
  const deg = (d: number) => (d * Math.PI) / 180;

  it('finds a nose swivel of 270 degrees blind astern', () => {
    const c = swivelCoverage([{ facing: 0, arc: deg(270) }]);
    expect(c.degrees).toBe(270);
    expect(c.blind).toEqual(['astern']);
  });

  it('is all round with no arc, and nothing with no swivels', () => {
    expect(swivelCoverage([{ facing: 0 }])).toEqual({ degrees: 360, blind: [] });
    expect(swivelCoverage([])).toEqual({ degrees: 0, blind: [] });
  });

  it('names blind sectors on both beams for fore and aft swivels', () => {
    const c = swivelCoverage([
      { facing: 0, arc: deg(120) },
      { facing: Math.PI, arc: deg(120) },
    ]);
    expect(c.blind.sort()).toEqual(['port beam', 'starboard beam']);
  });
});

describe('bearingWords', () => {
  it('puts positive bearings to starboard', () => {
    expect(bearingWords(0)).toBe('ahead');
    expect(bearingWords(Math.PI / 2)).toBe('starboard beam');
    expect(bearingWords(-Math.PI / 4)).toBe('port bow');
    expect(bearingWords(Math.PI * 0.8)).toBe('starboard quarter');
  });
});
