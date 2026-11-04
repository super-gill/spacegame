import { describe, expect, it } from 'vitest';
import { pickContact, radarPoint, radarShows, ringStep } from './radar-geometry.js';

const centre = { x: 1000, y: -500 };

describe('radarPoint', () => {
  it('scales a point inside the range', () => {
    const p = radarPoint(centre, { x: 1000 + 1500, y: -500 }, 3000, 100);
    expect(p).toEqual({ x: 50, y: 0, onRim: false });
  });

  it('keeps north up: a point north of you sits above the centre', () => {
    const p = radarPoint(centre, { x: 1000, y: -500 - 300 }, 3000, 100);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(-10);
  });

  it('pins a point beyond the range to the rim on its bearing', () => {
    const p = radarPoint(centre, { x: 1000 - 9000, y: -500 }, 3000, 100);
    expect(p).toEqual({ x: -100, y: 0, onRim: true });
  });

  it('puts the edge of the range exactly on the rim, not pinned', () => {
    const p = radarPoint(centre, { x: 1000, y: -500 + 3000 }, 3000, 100);
    expect(p.onRim).toBe(false);
    expect(p.y).toBeCloseTo(100);
  });
});

describe('radarShows', () => {
  it('shows ships within sensor range only', () => {
    expect(radarShows(2999, 3000)).toBe(true);
    expect(radarShows(3001, 3000)).toBe(false);
  });

  it('shows no ships at all without a radar', () => {
    expect(radarShows(0, 0)).toBe(false);
  });
});

describe('pickContact', () => {
  const hits = [
    { id: 'a', x: 10, y: 10 },
    { id: 'b', x: 16, y: 10 },
  ];

  it('picks the nearest contact within reach', () => {
    expect(pickContact(hits, { x: 15, y: 11 }, 8)).toBe('b');
  });

  it('picks nothing when the click is too far from every contact', () => {
    expect(pickContact(hits, { x: 60, y: 60 }, 8)).toBeNull();
  });
});

describe('ringStep', () => {
  it('spaces about three rings on round numbers', () => {
    expect(ringStep(3000)).toBe(1000);
    expect(ringStep(4200)).toBe(2000);
    expect(ringStep(5500)).toBe(2000);
    expect(ringStep(1200)).toBe(500);
  });
});
