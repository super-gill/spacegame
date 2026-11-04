import { describe, expect, it } from 'vitest';
import { createStarterWorld, bodyPosition } from '@spacegame/sim';
import { DEFAULT_NAV, formatDistance, formatEta, navFix } from './nav-target.js';

describe('navFix', () => {
  const world = createStarterWorld();
  const harbour = world.stations[DEFAULT_NAV.id]!;

  it('starts at Harbour, which exists in the starter world', () => {
    expect(harbour).toBeDefined();
  });

  it('gives an arrival time when closing and none when holding station', () => {
    const at = { x: harbour.position.x - 1000, y: harbour.position.y };
    const closing = navFix(world, { position: at, velocity: { x: harbour.velocity.x + 50, y: harbour.velocity.y } }, DEFAULT_NAV)!;
    expect(closing.distance).toBeCloseTo(1000);
    expect(closing.closing).toBeCloseTo(50);
    expect(closing.eta).toBeCloseTo((1000 - harbour.radius) / 50);

    const holding = navFix(world, { position: at, velocity: { ...harbour.velocity } }, DEFAULT_NAV)!;
    expect(holding.eta).toBeNull();
  });

  it('finds a body where the rails put it', () => {
    const body = Object.values(world.bodies).find((b) => !b.ring && b.radius > 0)!;
    const fix = navFix(world, { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }, { kind: 'body', id: body.id })!;
    const p = bodyPosition(world, body.id);
    expect(fix.position.x).toBeCloseTo(p.x);
    expect(fix.position.y).toBeCloseTo(p.y);
  });

  it('is null for something that is not there', () => {
    expect(navFix(world, { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }, { kind: 'station', id: 'nowhere' })).toBeNull();
  });
});

describe('formatting', () => {
  it('shortens distances', () => {
    expect(formatDistance(850.4)).toBe('850 u');
    expect(formatDistance(2360)).toBe('2.4k u');
    expect(formatDistance(18200)).toBe('18k u');
  });

  it('writes arrival times as minutes and seconds', () => {
    expect(formatEta(42)).toBe('0:42');
    expect(formatEta(725)).toBe('12:05');
    expect(formatEta(5000)).toBe('1 h+');
    expect(formatEta(null)).toBe('-');
  });
});
