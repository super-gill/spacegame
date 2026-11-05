import { describe, expect, it } from 'vitest';
import { applyUpdate, diffWorld } from '../net.js';
import { stepWorld } from '../step.js';
import type { Asteroid, World } from '../types.js';
import { createStarterWorld } from '../world.js';

/** What the server sends a client (docs/shared-world.md): only what changed, rocks one by one. */

const byId = (rocks: readonly Asteroid[]) => Object.fromEntries(rocks.map((a) => [a.id, a]));

describe('world updates', () => {
  it('send only the rocks that changed, and rebuild the same belt on the client', () => {
    const before: World = createStarterWorld();
    const [first, second] = before.asteroids;
    // One rock cut, one gone, one new.
    const cut = { ...first!, contents: {} };
    const fresh: Asteroid = { ...second!, id: 'rock-new' };
    const now: World = { ...before, tick: before.tick + 2, asteroids: [cut, ...before.asteroids.slice(2), fresh] };
    const update = diffWorld(before, now);
    expect(update.rocks!.changed.map((a) => a.id).sort()).toEqual([cut.id, 'rock-new'].sort());
    expect(update.rocks!.removed).toEqual([second!.id]);
    expect('asteroids' in update).toBe(false);
    expect(byId(applyUpdate(before, update, []).asteroids)).toEqual(byId(now.asteroids));
  });

  it('leave out what never changes and what clients never need', () => {
    const before = createStarterWorld();
    const after = stepWorld(before, {});
    const update = diffWorld(before, after);
    for (const key of ['hulls', 'modules', 'goods', 'spawners', 'rockfall', 'events', 'asteroids']) expect(key in update, key).toBe(false);
    expect(applyUpdate(before, update, after.events).tick).toBe(after.tick);
  });
});
