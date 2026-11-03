import { describe, expect, it } from 'vitest';
import { HULLS } from '../hulls.js';
import { SAVE_FORMAT, SAVE_VERSION, deserializeWorld, serializeWorld, type Migration } from '../save.js';
import { stepWorld } from '../step.js';
import { buyGood } from '../trade.js';
import type { World } from '../types.js';
import { createStarterWorld, emptyInput, joinPilot, pilotShip } from '../world.js';

const SECOND = 60;
const AT = '2026-11-03T21:00:00.000Z';

/** A world with some history: a pilot who has flown, NPCs that have moved. */
function livedIn(): World {
  let w = joinPilot(createStarterWorld(), 'ana', 'Ana');
  const me = pilotShip(w, 'ana')!.id;
  for (let i = 0; i < SECOND * 20; i++) w = stepWorld(w, { [me]: { ...emptyInput(), thrustForward: i < SECOND } });
  return w;
}

function load(text: string): World {
  const r = deserializeWorld(text);
  if (!r.ok) throw new Error(r.reason);
  return r.world;
}

describe('save round trip', () => {
  it('a loaded world equals the saved one, apart from per-tick events', () => {
    const w = livedIn();
    expect(load(serializeWorld(w, AT))).toEqual({ ...w, events: [] });
  });

  it('a loaded world carries on exactly as the original would have', () => {
    const w = livedIn();
    let a = w;
    let b = load(serializeWorld(w, AT));
    for (let i = 0; i < SECOND * 30; i++) {
      a = stepWorld(a, {});
      b = stepWorld(b, {});
    }
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });

  it("keeps each pilot's credits, ship and cargo", () => {
    let w = joinPilot(createStarterWorld(), 'ana', 'Ana');
    const me = pilotShip(w, 'ana')!.id;
    w = { ...w, ships: { ...w.ships, [me]: { ...w.ships[me]!, state: 'docked', dockedAt: 'station-harbour' } } };
    const r = buyGood(w, 'ana', 'food', 7);
    if (!r.ok) throw new Error(r.reason);
    const back = load(serializeWorld(r.world, AT));
    expect(back.pilots['ana']!.credits).toBe(r.world.pilots['ana']!.credits);
    expect(pilotShip(back, 'ana')!.hold).toEqual({ food: 7 });
  });

  it('records the format, version and time', () => {
    const env = JSON.parse(serializeWorld(createStarterWorld(), AT));
    expect(env.format).toBe(SAVE_FORMAT);
    expect(env.version).toBe(SAVE_VERSION);
    expect(env.savedAt).toBe(AT);
    expect(deserializeWorld(serializeWorld(createStarterWorld(), AT))).toMatchObject({ ok: true, savedAt: AT });
  });
});

describe('loading applies current catalogues', () => {
  it('replaces saved hull stats with the ones in the code', () => {
    const w = createStarterWorld();
    const tampered = { ...w, hulls: { ...w.hulls, sparrow: { ...w.hulls['sparrow']!, maxSpeed: 99999 } } };
    expect(load(serializeWorld(tampered, AT)).hulls['sparrow']!.maxSpeed).toBe(HULLS['sparrow']!.maxSpeed);
  });
});

describe('refusing bad files', () => {
  it('names the reason', () => {
    const good = JSON.parse(serializeWorld(createStarterWorld(), AT));
    const cases: Array<[string, string]> = [
      ['not json at all', 'notJson'],
      [JSON.stringify({ hello: 'world' }), 'notASave'],
      [JSON.stringify({ ...good, format: 'something-else' }), 'notASave'],
      [JSON.stringify({ ...good, version: SAVE_VERSION + 1 }), 'tooNew'],
      [JSON.stringify({ ...good, version: SAVE_VERSION - 1 }), 'tooOld'],
      [JSON.stringify({ ...good, world: { ...good.world, ships: 'nope' } }), 'damaged'],
      [JSON.stringify({ ...good, world: null }), 'damaged'],
    ];
    for (const [text, reason] of cases) expect(deserializeWorld(text), reason).toEqual({ ok: false, reason });
  });
});

describe('migrations', () => {
  it('upgrades an older save one version at a time', () => {
    const current = JSON.parse(serializeWorld(createStarterWorld(), AT));
    // Pretend version 0 stored the tick under another name.
    const { tick, ...rest } = current.world;
    const old = { ...current, version: SAVE_VERSION - 1, world: { ...rest, ticks: tick + 42 } };
    const migrations: Record<number, Migration> = {
      [SAVE_VERSION - 1]: (w) => {
        const { ticks, ...others } = w as Record<string, unknown>;
        return { ...others, tick: ticks };
      },
    };
    const r = deserializeWorld(JSON.stringify(old), migrations);
    expect(r.ok && r.world.tick).toBe(42);
  });
});
