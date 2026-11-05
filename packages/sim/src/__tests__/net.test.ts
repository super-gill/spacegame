import { describe, expect, it } from 'vitest';
import { applyUpdate, diffWorld } from '../net.js';
import { stepWorld } from '../step.js';
import type { Asteroid, Ship, World } from '../types.js';
import { createStarterWorld, joinPilot } from '../world.js';

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

  it('send ships field by field, and rebuild every ship exactly on the client', () => {
    let server = joinPilot(createStarterWorld(), 'ana', 'Ana');
    let client = server;
    for (let i = 0; i < 300; i++) {
      const next = stepWorld(server, {});
      const update = diffWorld(server, next);
      client = applyUpdate(client, update, next.events);
      server = next;
      if (i === 150) {
        // A ship that gains a field and then loses it again: gone on the client too.
        const ship = Object.values(server.ships)[0]!;
        const gained = { ...ship, beams: [] } as unknown as Ship;
        const withField = { ...server, ships: { ...server.ships, [ship.id]: gained } };
        client = applyUpdate(client, diffWorld(server, withField), []);
        const { beams: _gone, ...rest } = gained as unknown as Record<string, unknown>;
        const without = { ...withField, ships: { ...withField.ships, [ship.id]: rest as unknown as Ship } };
        client = applyUpdate(client, diffWorld(withField, without), []);
        expect('beams' in client.ships[ship.id]!).toBe(false);
        server = without;
      }
    }
    expect(JSON.parse(JSON.stringify(client.ships))).toEqual(JSON.parse(JSON.stringify(server.ships)));
    // And an update for ships that are only moving is small: no fits, no holds.
    const next = stepWorld(server, {});
    const text = JSON.stringify(diffWorld(server, next).ships ?? {});
    expect(text).not.toContain('"fit"');
    expect(text.length).toBeLessThan(JSON.stringify(next.ships).length / 3);
  });
});
