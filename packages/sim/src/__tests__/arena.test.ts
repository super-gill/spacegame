import { describe, expect, it } from 'vitest';
import { arenaEnemies, arenaFits, arenaHulls, createArenaWorld, joinArena, leaveArena, leaveArenaWorld, startArena, stepArenas } from '../arena.js';
import { ARENA_COMMANDS, applyCommand, readCommand } from '../commands.js';
import { ARENA_END_DELAY_SECONDS } from '../constants.js';
import { migrate16to17 } from '../save.js';
import { stepWorld } from '../step.js';
import type { ArenaScenario, World } from '../types.js';
import { distance } from '../vec2.js';
import { createStarterWorld, joinPilot, pilotShip } from '../world.js';

/** The Arena world (arena.ts, docs/worlds.md): its own world, a ship, a fit and a scenario, and back to the setup when it is over. */

const skirmish = (enemyFit: string, count: number): ArenaScenario => ({ kind: 'skirmish', enemyFit, count });

function arena(...pilots: string[]): World {
  return pilots.reduce((w, id) => joinArena(w, id, id), createArenaWorld());
}

/** Step the arena world as the server does: the world, then the arenas. */
function step(w: World, ticks: number): World {
  let next = w;
  for (let i = 0; i < ticks; i++) next = stepArenas(stepWorld(next, {}));
  return next;
}

describe('the Arena world', () => {
  it('starts empty and lets a pilot in with no ship, at the setup', () => {
    const w = arena('ana');
    expect(Object.keys(w.ships)).toHaveLength(0);
    expect(Object.keys(w.npcs)).toHaveLength(0);
    expect(w.spawners).toHaveLength(0);
    expect(w.pilots['ana']).toMatchObject({ shipId: null, credits: 0 });
    // Joining twice changes nothing.
    expect(joinArena(w, 'ana', 'ana')).toBe(w);
  });

  it('offers every hull with a reference fit, smallest first, with its fits', () => {
    const hulls = arenaHulls(createArenaWorld());
    const ids = hulls.map((h) => h.hullId);
    expect(ids).toContain('kessari-wedge');
    expect(ids).toContain('union-frigate');
    expect(ids).not.toContain('escape-pod');
    expect(ids.indexOf('meridian-tern')).toBeLessThan(ids.indexOf('union-frigate'));
    for (const h of hulls) for (const f of h.fits) expect(f.hullId).toBe(h.hullId);
    expect(hulls.flatMap((h) => h.fits.map((f) => f.name)).sort()).toEqual(arenaFits().sort());
  });
});

describe('a skirmish', () => {
  it('puts the pilot in the chosen fit with the enemies, far out in space', () => {
    const r = startArena(arena('ana'), 'ana', 'Walkout anti-small', skirmish('Warrant brawler', 3));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const w = r.world;
    const mine = pilotShip(w, 'ana')!;
    expect(mine.hullId).toBe('union-frigate');
    expect(mine.weaponsHot).toBe(true);
    const enemies = arenaEnemies(w, 'ana');
    expect(enemies).toHaveLength(3);
    for (const id of enemies) expect(w.ships[id]).toMatchObject({ hullId: 'kessari-wedge', dark: true });
    for (const st of Object.values(w.stations)) expect(distance(st.position, mine.position)).toBeGreaterThan(20000);
    expect(r.event).toEqual({ type: 'arenaStarted', shipId: mine.id, enemies: 3 });
  });

  it('its enemies come for the pilot', () => {
    const r = startArena(arena('ana'), 'ana', 'Meridian Tern, Registry issue', skirmish('Kessari Warrant, Black Strike trophy', 1));
    if (!r.ok) throw new Error(r.reason);
    const mine = pilotShip(r.world, 'ana')!.id;
    const foe = arenaEnemies(r.world, 'ana')[0]!;
    const start = distance(r.world.ships[foe]!.position, r.world.ships[mine]!.position);
    const w = step(r.world, 300);
    expect(distance(w.ships[foe]!.position, w.ships[mine]!.position)).toBeLessThan(start);
    expect(w.ships[foe]!.activeLock).toBe(mine);
  });

  it('gives each pilot an arena of their own, apart from the others', () => {
    let w = arena('ana', 'ben');
    for (const id of ['ana', 'ben']) {
      const r = startArena(w, id, 'Warrant brawler', skirmish('Warrant kiter', 1));
      if (!r.ok) throw new Error(r.reason);
      w = r.world;
    }
    const a = w.pilots['ana']!.arena!.centre;
    const b = w.pilots['ben']!.arena!.centre;
    expect(distance(a, b)).toBeGreaterThan(20000);
    // Ana leaves; a newcomer takes her slot, never Ben's.
    w = leaveArenaWorld(w, 'ana');
    w = joinArena(w, 'cal', 'cal');
    const r = startArena(w, 'cal', 'Warrant brawler', skirmish('Warrant kiter', 1));
    if (!r.ok) throw new Error(r.reason);
    expect(r.world.pilots['cal']!.arena!.centre).toEqual(a);
  });

  it('launching again restarts it rather than piling up ships', () => {
    const first = startArena(arena('ana'), 'ana', 'Warrant brawler', skirmish('Warrant kiter', 2));
    if (!first.ok) throw new Error(first.reason);
    const again = startArena(first.world, 'ana', 'Warrant brawler', skirmish('Warrant kiter', 2));
    if (!again.ok) throw new Error(again.reason);
    expect(arenaEnemies(again.world, 'ana')).toHaveLength(2);
    expect(Object.keys(again.world.ships)).toHaveLength(3);
    // New ids, so a client never mistakes the new fight's ships for the old.
    expect(arenaEnemies(again.world, 'ana')).not.toEqual(arenaEnemies(first.world, 'ana'));
  });

  it('leaving clears it and puts the pilot back at the setup', () => {
    const started = startArena(arena('ana'), 'ana', 'Warrant brawler', skirmish('Warrant kiter', 2));
    if (!started.ok) throw new Error(started.reason);
    const left = leaveArena(started.world, 'ana');
    expect(left).toMatchObject({ ok: true, event: { type: 'arenaEnded', pilotId: 'ana', result: 'left' } });
    if (!left.ok) return;
    expect(Object.keys(left.world.ships)).toHaveLength(0);
    expect(Object.keys(left.world.npcs)).toHaveLength(0);
    expect(left.world.pilots['ana']).toMatchObject({ shipId: null });
    expect(left.world.pilots['ana']!.arena).toBeUndefined();
  });

  it('losing the ship ends it a moment later, so the pilot sees the explosion first', () => {
    const r = startArena(arena('ana'), 'ana', 'Warrant brawler', skirmish('Warrant kiter', 1));
    if (!r.ok) throw new Error(r.reason);
    // The arena ship is destroyed (the pilot is in a pod, say): taken out of the world here.
    const shipId = r.world.pilots['ana']!.shipId!;
    const { [shipId]: _lost, ...ships } = r.world.ships;
    let w = step({ ...r.world, ships, pilots: { ...r.world.pilots, ana: { ...r.world.pilots['ana']!, shipId: null } } }, 1);
    expect(w.pilots['ana']!.arena?.over?.result).toBe('lost');
    w = step(w, Math.round(ARENA_END_DELAY_SECONDS / w.dt) - 2);
    expect(w.pilots['ana']!.arena).toBeDefined();
    let ended = false;
    for (let i = 0; i < 4 && !ended; i++) {
      w = step(w, 1);
      ended = w.events.some((e) => e.type === 'arenaEnded' && e.pilotId === 'ana' && e.result === 'lost');
    }
    expect(ended).toBe(true);
    expect(w.pilots['ana']!.arena).toBeUndefined();
    expect(Object.keys(w.ships)).toHaveLength(0);
  });

  it('killing every enemy wins it', () => {
    const r = startArena(arena('ana'), 'ana', 'Warrant brawler', skirmish('Warrant kiter', 1));
    if (!r.ok) throw new Error(r.reason);
    const foe = arenaEnemies(r.world, 'ana')[0]!;
    const { [foe]: _dead, ...ships } = r.world.ships;
    const w = step({ ...r.world, ships }, 1);
    expect(w.pilots['ana']!.arena?.over?.result).toBe('won');
  });

  it('refuses unknown fits, silly counts and leaving an arena that is not running', () => {
    const w = arena('ana');
    expect(startArena(w, 'ana', 'No such fit', skirmish('Warrant brawler', 1))).toMatchObject({ ok: false, reason: 'unknownFit' });
    expect(startArena(w, 'ana', 'Warrant brawler', skirmish('No such fit', 1))).toMatchObject({ ok: false, reason: 'unknownFit' });
    expect(startArena(w, 'ana', 'Warrant brawler', skirmish('Warrant brawler', 0))).toMatchObject({ ok: false, reason: 'badCount' });
    expect(startArena(w, 'ana', 'Warrant brawler', skirmish('Warrant brawler', 9))).toMatchObject({ ok: false, reason: 'badCount' });
    expect(startArena(w, 'nobody', 'Warrant brawler', skirmish('Warrant brawler', 1))).toMatchObject({ ok: false, reason: 'unknownPilot' });
    expect(leaveArena(w, 'ana')).toMatchObject({ ok: false, reason: 'notInArena' });
  });

  it('travels as a command, checked field by field', () => {
    const command = readCommand({ type: 'arenaStart', fit: 'Warrant brawler', scenario: { kind: 'skirmish', enemyFit: 'Warrant kiter', count: 2 } });
    expect(command).not.toBeNull();
    expect(applyCommand(arena('ana'), 'ana', command!).ok).toBe(true);
    expect(readCommand({ type: 'arenaLeave' })).toEqual({ type: 'arenaLeave' });
    expect(readCommand({ type: 'arenaStart', fit: 'Warrant brawler', scenario: { kind: 'waves' } })).toBeNull();
    expect(readCommand({ type: 'arenaStart', fit: 'Warrant brawler' })).toBeNull();
    expect(readCommand({ type: 'adminArena', playerFit: 'a', enemyFit: 'b', count: 1 })).toBeNull();
    expect(ARENA_COMMANDS).toEqual(['arenaStart', 'arenaLeave']);
  });
});

describe('saves from before the Arena world', () => {
  it('end any admin arena left running in the persistent world', () => {
    const w0 = joinPilot({ ...createStarterWorld(), npcs: {}, spawners: [] }, 'ana', 'Ana');
    const home = pilotShip(w0, 'ana')!.id;
    // An arena as the admin arena left it in a version 16 save.
    const raw = {
      ...w0,
      ships: { ...w0.ships, 'ana-arena-2': { ...w0.ships[home]!, id: 'ana-arena-2' }, 'arena-ana-1': { ...w0.ships[home]!, id: 'arena-ana-1', ownerId: null } },
      npcs: { 'arena-ana-1': { kind: 'arena', pilotId: 'ana' } },
      pilots: { ana: { ...w0.pilots['ana']!, shipId: 'ana-arena-2', arena: { shipId: 'ana-arena-2', fromShipId: home, centre: { x: 50000, y: -50000 } } } },
    };
    const migrated = migrate16to17(raw) as World;
    expect(Object.keys(migrated.ships).sort()).toEqual(Object.keys(w0.ships).sort());
    expect(migrated.npcs).toEqual({});
    expect(migrated.pilots['ana']).toMatchObject({ shipId: home });
    expect(migrated.pilots['ana']!.arena).toBeUndefined();
  });
});
