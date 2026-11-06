import { describe, expect, it } from 'vitest';
import { createStarterWorld, diffWorld, emptyInput, pilotShip, visibleWorld } from '@spacegame/sim';
import { Accounts, newKey } from './accounts.js';
import { makeWorlds, allowedIn } from './worlds.js';

/** The server's pieces that do not need a network (docs/shared-world.md). */

describe('characters', () => {
  it('get a key shown once, and log in with name and key only', () => {
    const accounts = new Accounts(null);
    const made = accounts.create('  Jason   Gill ');
    expect(made.ok).toBe(true);
    if (!made.ok) return;
    expect(made.character.name).toBe('Jason Gill');
    expect(made.key).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    // Only the hash is kept.
    expect(JSON.stringify(accounts.toData())).not.toContain(made.key);
    // Case and spacing of the key do not matter; the name's case does not either.
    expect(accounts.login('jason gill', made.key.toLowerCase().replace(/-/g, ' '))?.pilotId).toBe(made.character.pilotId);
    expect(accounts.login('Jason Gill', newKey())).toBeNull();
    expect(accounts.login('Nobody', made.key)).toBeNull();
  });

  it('have unique names of a sensible length; the first is the host', () => {
    const accounts = new Accounts(null);
    const first = accounts.create('Ana');
    const second = accounts.create('Ben');
    expect(first.ok && first.character.admin).toBe(true);
    expect(second.ok && second.character.admin).toBeFalsy();
    expect(accounts.create('ANA')).toMatchObject({ ok: false, reason: 'nameTaken' });
    expect(accounts.create('')).toMatchObject({ ok: false, reason: 'badName' });
    expect(accounts.create('x'.repeat(25))).toMatchObject({ ok: false, reason: 'badName' });
    expect(accounts.create('<script>')).toMatchObject({ ok: false, reason: 'badName' });
    // Kept across a restart.
    expect(new Accounts(accounts.toData()).nameFree('ben')).toBe(false);
    // The console makes operators and players.
    expect(accounts.setOperator('ben', true)).toBe(true);
    expect(accounts.list().find((c) => c.name === 'Ben')?.admin).toBe(true);
    expect(accounts.setOperator('Ana', false)).toBe(true);
    expect(accounts.list().find((c) => c.name === 'Ana')?.admin).toBeUndefined();
    expect(accounts.setOperator('Nobody', true)).toBe(false);
  });
});

describe('the running world', () => {
  it('gives a new pilot a ship and flies it with their controls', () => {
    const game = makeWorlds({ ...createStarterWorld(), spawners: [] }).persistent;
    game.join('pilot-a', 'Ana');
    const ship = pilotShip(game.current, 'pilot-a')!;
    for (let i = 0; i < 30; i++) {
      game.input('pilot-a', { ...emptyInput(), thrustForward: true });
      game.step();
    }
    const moved = pilotShip(game.current, 'pilot-a')!;
    expect(Math.hypot(moved.velocity.x - ship.velocity.x, moved.velocity.y - ship.velocity.y)).toBeGreaterThan(1);
  });

  it('keeps held controls through a tick with no message, but presses happen once', () => {
    const game = makeWorlds({ ...createStarterWorld(), spawners: [] }).persistent;
    game.join('pilot-a', 'Ana');
    game.input('pilot-a', { ...emptyInput(), thrustForward: true, cycleFlightMode: true });
    game.step();
    const mode = pilotShip(game.current, 'pilot-a')!.flightMode;
    const speed = Math.hypot(pilotShip(game.current, 'pilot-a')!.velocity.x, pilotShip(game.current, 'pilot-a')!.velocity.y);
    // No messages: still thrusting, and the flight mode is not cycled again.
    for (let i = 0; i < 10; i++) game.step();
    const after = pilotShip(game.current, 'pilot-a')!;
    expect(after.flightMode).toBe(mode);
    expect(Math.hypot(after.velocity.x, after.velocity.y)).toBeGreaterThan(speed);
  });

  it("runs commands for the pilot that sent them; a player's update is what changed in their view", () => {
    const game = makeWorlds({ ...createStarterWorld(), spawners: [] }).persistent;
    game.join('pilot-a', 'Ana');
    const seen = visibleWorld(game.current, 'pilot-a');
    game.step();
    const changed = diffWorld(seen, visibleWorld(game.current, 'pilot-a', seen));
    // The catalogues never change, so they are never sent again.
    expect(Object.keys(changed)).toContain('ships');
    expect(Object.keys(changed)).not.toContain('hulls');
    expect(Object.keys(changed)).not.toContain('events');
    // Not docked: refused, with the sim's reason.
    expect(game.command('pilot-a', { type: 'buyGood', good: 'food', quantity: 1 })).toMatchObject({ ok: false, reason: 'notDocked' });
  });
});

describe('the worlds', () => {
  it('run the persistent world and an Arena side by side; a pilot is in one or the other', () => {
    const worlds = makeWorlds({ ...createStarterWorld(), spawners: [] });
    worlds.arena.join('pilot-a', 'Ana');
    // In the Arena: no ship, at the setup, and the persistent world does not know them.
    expect(worlds.arena.current.pilots['pilot-a']).toMatchObject({ shipId: null });
    expect(worlds.persistent.current.pilots['pilot-a']).toBeUndefined();
    const started = worlds.arena.command('pilot-a', { type: 'arenaStart', fit: 'Warrant brawler', scenario: { kind: 'skirmish', enemyFit: 'Warrant kiter', count: 2 } });
    expect(started.ok).toBe(true);
    worlds.arena.step();
    expect(worlds.arena.takeEvents().some((e) => e.type === 'arenaStarted')).toBe(true);
    // Leaving the Arena clears it all.
    worlds.arena.leave('pilot-a');
    expect(Object.keys(worlds.arena.current.ships)).toHaveLength(0);
    expect(worlds.arena.current.pilots['pilot-a']).toBeUndefined();
    // Over in the persistent world, they get their starter ship as ever.
    worlds.persistent.join('pilot-a', 'Ana');
    expect(pilotShip(worlds.persistent.current, 'pilot-a')).not.toBeNull();
  });

  it('take only their own commands', () => {
    const start = { type: 'arenaStart', fit: 'Warrant brawler', scenario: { kind: 'skirmish', enemyFit: 'Warrant kiter', count: 1 } } as const;
    expect(allowedIn('arena', start)).toBe(true);
    expect(allowedIn('arena', { type: 'arenaLeave' })).toBe(true);
    expect(allowedIn('persistent', start)).toBe(false);
    // Nothing in the Arena can be traded, refitted, bought or switched.
    expect(allowedIn('arena', { type: 'buyGood', good: 'food', quantity: 1 })).toBe(false);
    expect(allowedIn('arena', { type: 'fitModule', mountId: 'w1', moduleId: 'x' })).toBe(false);
    expect(allowedIn('arena', { type: 'adminGrantCredits', amount: 1000 })).toBe(false);
    expect(allowedIn('persistent', { type: 'buyGood', good: 'food', quantity: 1 })).toBe(true);
  });
});
