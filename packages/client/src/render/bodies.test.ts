import { describe, expect, it } from 'vitest';
import { createStarterWorld, joinPilot, pilotShip, type Ship } from '@spacegame/sim';
import { Camera } from '../camera.js';
import { drawAsteroids } from './bodies.js';

/** A canvas context that records nothing and, like a real one, throws on a negative radius. */
function fakeContext(): CanvasRenderingContext2D {
  const noop = (): void => {};
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (target, key) => {
      if (key === 'arc') return (_x: number, _y: number, r: number) => {
        if (r < 0) throw new DOMException('The radius provided is negative.', 'IndexSizeError');
      };
      return key in target ? target[key as string] : noop;
    },
    set: (target, key, value) => {
      target[key as string] = value;
      return true;
    },
  });
  return ctx as unknown as CanvasRenderingContext2D;
}

describe('drawing rocks', () => {
  it('a survey pulse drawn a moment before the tick it happened on does not throw (it blanked the screen)', () => {
    const w = joinPilot(createStarterWorld(), 'ana', 'Ana');
    const ship: Ship = { ...pilotShip(w, 'ana')!, survey: { tick: w.tick + 1, origin: { x: 0, y: 0 }, range: 2000, rocks: [] } as unknown as NonNullable<Ship['survey']> };
    const camera = new Camera();
    camera.resize(800, 600);
    // Drawn at a time between updates, half a tick before the survey.
    expect(() => drawAsteroids(fakeContext(), camera, { ...w, tick: w.tick + 0.5 }, ship)).not.toThrow();
  });
});
