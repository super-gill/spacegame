import { describe, expect, it } from 'vitest';
import { adminGrantCredits, adminSetRule, adminSpawnShip, boardShip } from '../pilots.js';
import { deserializeWorld, serializeWorld } from '../save.js';
import type { World } from '../types.js';
import { createStarterWorld, joinPilot, pilotShip } from '../world.js';

/** Admin commands for playtesting: credits and ships from nothing. */

const HARBOUR = 'station-harbour';

function docked(): World {
  const w = joinPilot({ ...createStarterWorld(), ships: {}, npcs: {}, spawners: [] }, 'ana', 'Ana');
  const me = pilotShip(w, 'ana')!;
  const st = w.stations[HARBOUR]!;
  return { ...w, ships: { ...w.ships, [me.id]: { ...me, state: 'docked', dockedAt: st.id, padId: st.pads[0]!.id, position: { ...st.position } } } };
}

describe('admin', () => {
  it('grants credits, whole and positive only', () => {
    const w = docked();
    const before = w.pilots['ana']!.credits;
    const r = adminGrantCredits(w, 'ana', 100_000);
    expect(r.ok && r.world.pilots['ana']!.credits).toBe(before + 100_000);
    expect(adminGrantCredits(w, 'ana', -5)).toMatchObject({ ok: false, reason: 'badAmount' });
    expect(adminGrantCredits(w, 'ana', 1.5)).toMatchObject({ ok: false, reason: 'badAmount' });
    expect(adminGrantCredits(w, 'nobody', 10)).toMatchObject({ ok: false, reason: 'unknownPilot' });
  });

  it('spawns any loadout free, sealed hulls included, on a pad where the pilot is docked, ready to board', () => {
    const w = docked();
    const credits = w.pilots['ana']!.credits;
    const r = adminSpawnShip(w, 'ana', 'aurel-tacet-dev');
    expect(r.ok).toBe(true);
    if (!r.ok || r.event.type !== 'adminShipSpawned') return;
    const ship = r.world.ships[r.event.shipId]!;
    expect(ship.hullId).toBe('aurel-tacet');
    expect(ship.ownerId).toBe('ana');
    expect(ship.state).toBe('docked');
    expect(ship.dockedAt).toBe(HARBOUR);
    expect(r.world.pilots['ana']!.credits).toBe(credits);
    expect(boardShip(r.world, 'ana', ship.id).ok).toBe(true);
  });

  it('needs the pilot docked, and a real loadout', () => {
    const w = docked();
    const me = pilotShip(w, 'ana')!;
    const flying = { ...w, ships: { ...w.ships, [me.id]: { ...me, state: 'flying' as const, dockedAt: null, padId: null } } };
    expect(adminSpawnShip(flying, 'ana', 'aurel-tacet-dev')).toMatchObject({ ok: false, reason: 'notDocked' });
    expect(adminSpawnShip(w, 'ana', 'no-such-ship')).toMatchObject({ ok: false, reason: 'unknownLoadout' });
  });
});

describe('admin rules', () => {
  it('switches gravity on and off for the whole world, and saves keep it', () => {
    const w = docked();
    expect(w.rules.gravity).toBe(false);
    const on = adminSetRule(w, 'ana', 'gravity', true);
    expect(on.ok && on.world.rules.gravity).toBe(true);
    const back = on.ok ? deserializeWorld(serializeWorld(on.world, '')) : null;
    expect(back?.ok && back.world.rules.gravity).toBe(true);
    // A save from before the rules existed loads with the default: off.
    const { rules: _r, ...older } = w;
    const old = deserializeWorld(serializeWorld(older as World, ''));
    expect(old.ok && old.world.rules.gravity).toBe(false);
  });
});
