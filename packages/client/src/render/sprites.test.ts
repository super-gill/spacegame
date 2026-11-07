import { HULLS } from '@spacegame/sim';
import { describe, expect, it } from 'vitest';
import { hullReady, pickSize, turretStem } from './sprites.js';

/** Ship sprites (docs/ship-pipeline.md): which picture, which turret, and when a hull switches to its art. */

const pictures = {
  far: { file: 'x/base-far.png', pixels: 38, unitsPerPixel: 1 },
  card: { file: 'x/base-card.png', pixels: 256, unitsPerPixel: 0.15 },
  flight: { file: 'x/base-flight.png', pixels: 114, unitsPerPixel: 0.33 },
};

describe('ship sprites', () => {
  it('picks the smallest picture that is not much smaller than the screen needs, and the largest beyond that', () => {
    expect(pickSize(pictures, 30)!.file).toBe('x/base-far.png');
    expect(pickSize(pictures, 40)!.file).toBe('x/base-far.png');
    expect(pickSize(pictures, 60)!.file).toBe('x/base-flight.png');
    expect(pickSize(pictures, 200)!.file).toBe('x/base-card.png');
    expect(pickSize(pictures, 900)!.file).toBe('x/base-card.png');
    expect(pickSize({}, 100)).toBeNull();
  });

  it('names a turret picture by weapon id, adding a size to the few ids without one', () => {
    expect(turretStem('autocannon-m')).toBe('autocannon-m');
    expect(turretStem('ciws-m')).toBe('ciws-m');
    expect(turretStem('mining-laser-drone')).toBe('mining-laser-drone-s');
  });

  it('switches a hull to its art only when the art marks every weapon mount the game gives it', () => {
    const tern = HULLS['meridian-courier']!;
    expect(hullReady(tern, { mounts: [{ id: 'w1', type: 'high', x: 15, y: 0 }, { id: 'w2', type: 'high', x: 6, y: -7 }, { id: 'w3', type: 'high', x: 6, y: 7 }] })).toBe(true);
    expect(hullReady(tern, { mounts: [{ id: 'w1', type: 'high', x: 15, y: 0 }] })).toBe(false);
    // A PDC the art does not draw does not hold it back: it is drawn at the game's position.
    const walkout = HULLS['union-frigate']!;
    const weapons = walkout.mounts.filter((m) => m.type === 'high').map((m) => ({ id: m.id, type: 'high', x: m.position.x, y: m.position.y }));
    expect(hullReady(walkout, { mounts: weapons })).toBe(true);
    // A hull with no weapon mounts (the Ark) is ready with none marked.
    expect(hullReady(HULLS['escape-pod']!, { mounts: [] })).toBe(true);
  });
});
