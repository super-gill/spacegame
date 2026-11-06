import { describe, expect, it } from 'vitest';
import { adminArena, adminArenaEnd, arenaFits } from '../arena.js';
import { applyCommand, readCommand } from '../commands.js';
import { stepWorld } from '../step.js';
import type { World } from '../types.js';
import { distance } from '../vec2.js';
import { createStarterWorld, joinPilot, pilotShip } from '../world.js';

/** The arena: admin fights on demand with the fitting lab's reference fits (arena.ts). */

function world(): World {
  return joinPilot({ ...createStarterWorld(), npcs: {}, spawners: [] }, 'ana', 'Ana');
}

describe('the arena', () => {
  it('puts the pilot in the chosen fit with the enemies, far out in space', () => {
    const w0 = world();
    const before = pilotShip(w0, 'ana')!;
    const r = adminArena(w0, 'ana', 'Frigate anti-small', 'Warrant brawler', 3);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const w = r.world;
    const mine = pilotShip(w, 'ana')!;
    expect(mine.id).not.toBe(before.id);
    expect(mine.hullId).toBe('union-frigate');
    expect(w.pilots['ana']!.arena?.fromShipId).toBe(before.id);
    const enemies = Object.entries(w.npcs).filter(([, b]) => b.kind === 'arena');
    expect(enemies).toHaveLength(3);
    for (const [id] of enemies) expect(w.ships[id]!.hullId).toBe('kessari-wedge');
    // Nowhere near the stations.
    for (const st of Object.values(w.stations)) expect(distance(st.position, mine.position)).toBeGreaterThan(20000);
    expect(r.event).toEqual({ type: 'arenaStarted', shipId: mine.id, enemies: 3 });
  });

  it('its enemies come for the pilot', () => {
    const r = adminArena(world(), 'ana', 'Meridian Tern, Registry issue', 'Kessari Warrant, Black Strike trophy', 1);
    if (!r.ok) throw new Error(r.reason);
    let w = r.world;
    const mine = pilotShip(w, 'ana')!;
    const foe = Object.keys(w.npcs).find((id) => w.npcs[id]!.kind === 'arena')!;
    const start = distance(w.ships[foe]!.position, mine.position);
    for (let i = 0; i < 300; i++) w = stepWorld(w, {});
    expect(distance(w.ships[foe]!.position, w.ships[mine.id]!.position)).toBeLessThan(start);
    expect(w.ships[foe]!.activeLock).toBe(mine.id);
  });

  it('ending it clears the arena and puts the pilot back where they were', () => {
    const w0 = world();
    const before = pilotShip(w0, 'ana')!;
    const started = adminArena(w0, 'ana', 'Warrant brawler', 'Warrant kiter', 2);
    if (!started.ok) throw new Error(started.reason);
    const arenaShip = pilotShip(started.world, 'ana')!.id;
    const ended = adminArenaEnd(started.world, 'ana');
    expect(ended.ok).toBe(true);
    if (!ended.ok) return;
    expect(pilotShip(ended.world, 'ana')!.id).toBe(before.id);
    expect(ended.world.ships[arenaShip]).toBeUndefined();
    expect(Object.values(ended.world.npcs).some((b) => b.kind === 'arena')).toBe(false);
    expect(ended.world.pilots['ana']!.arena).toBeUndefined();
  });

  it('starting again restarts it rather than piling up ships', () => {
    const first = adminArena(world(), 'ana', 'Warrant brawler', 'Warrant kiter', 2);
    if (!first.ok) throw new Error(first.reason);
    const again = adminArena(first.world, 'ana', 'Warrant brawler', 'Warrant kiter', 2);
    if (!again.ok) throw new Error(again.reason);
    expect(Object.values(again.world.npcs).filter((b) => b.kind === 'arena')).toHaveLength(2);
    expect(Object.keys(again.world.ships)).toHaveLength(Object.keys(first.world.ships).length);
  });

  it('refuses unknown fits, silly counts and ending an arena that is not running', () => {
    const w = world();
    expect(adminArena(w, 'ana', 'No such fit', 'Warrant brawler', 1)).toMatchObject({ ok: false, reason: 'unknownFit' });
    expect(adminArena(w, 'ana', 'Warrant brawler', 'Warrant brawler', 0)).toMatchObject({ ok: false, reason: 'badCount' });
    expect(adminArena(w, 'ana', 'Warrant brawler', 'Warrant brawler', 9)).toMatchObject({ ok: false, reason: 'badCount' });
    expect(adminArenaEnd(w, 'ana')).toMatchObject({ ok: false, reason: 'notInArena' });
  });

  it('travels as a command and offers every reference fit', () => {
    const command = readCommand({ type: 'adminArena', playerFit: 'Warrant brawler', enemyFit: 'Warrant kiter', count: 2 });
    expect(command).not.toBeNull();
    expect(applyCommand(world(), 'ana', command!).ok).toBe(true);
    expect(readCommand({ type: 'adminArenaEnd' })).toEqual({ type: 'adminArenaEnd' });
    expect(arenaFits()).toContain('Frigate anti-small');
  });
});
