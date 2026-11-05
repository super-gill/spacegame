import { describe, expect, it } from 'vitest';
import { duel, fitProblems, fitSummary } from '../fitlab.js';
import { REFERENCE_FITS } from '../reference-fits.js';
import { TEST_CATALOGUES } from './fixtures.js';

/** The fitting lab behind the fitter and the audit (docs/fitting.md, "The fitter"). */

const byName = (name: string) => REFERENCE_FITS.find((f) => f.name.startsWith(name))!;

describe('the fitting lab', () => {
  it('every reference fit could be fitted for real', () => {
    for (const f of REFERENCE_FITS) expect(fitProblems(TEST_CATALOGUES, f), f.name).toEqual([]);
  });

  it('names what is wrong with a fit that could not be', () => {
    const starter = byName('Meridian Tern');
    const problems = fitProblems(TEST_CATALOGUES, { ...starter, fit: { ...starter.fit, w1: 'union-picket-l', u2: 'tessaract-container-m' } });
    expect(problems).toContainEqual({ mountId: 'w1', moduleId: 'union-picket-l', reason: 'tooBig' });
    expect(problems).toContainEqual({ mountId: 'u2', moduleId: 'tessaract-container-m', reason: 'wrongMount' });
  });

  it('sums a fit into the numbers a pilot compares', () => {
    const s = fitSummary(TEST_CATALOGUES, byName('Rook and Rivet Hulk'))!;
    expect(s.oreHold).toBe(1200);
    expect(s.miningRate).toBeGreaterThan(0);
    expect(s.powerDraw).toBeLessThanOrEqual(s.powerOutput);
    expect(s.price).toBeGreaterThan(85000);
  });

  it('duels: the starter beats the raider, the same way every time', () => {
    const r = duel(byName('Meridian Tern'), byName('Kessari Warrant, Black'));
    expect(r.winsA).toBe(4);
    expect(duel(byName('Meridian Tern'), byName('Kessari Warrant, Black'))).toEqual(r);
  });
});
