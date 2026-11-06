import { describe, expect, it } from 'vitest';
import { buildShip, createStarterWorld, LOADOUTS, visibleWorld, joinPilot, pilotShip, type Ship, type World } from '@spacegame/sim';
import { arrivalSeconds, clockWords, closingSpeed, lockWords, PLOT_PRESETS, plotPosition, plotRows, plotView } from './plot-rows.js';

/** Ana in a starter far out in open space, with whatever ships are passed, and no rocks. */
function around(...others: Ship[]): { world: World; mine: Ship } {
  let w: World = { ...createStarterWorld(), ships: {}, npcs: {}, spawners: [], asteroids: [] };
  w = joinPilot(w, 'ana', 'Ana');
  const mine = { ...pilotShip(w, 'ana')!, state: 'flying' as const, dockedAt: null, padId: null, position: { x: 90000, y: 90000 }, velocity: { x: 0, y: 0 } };
  return { world: { ...w, ships: { ...w.ships, [mine.id]: mine, ...Object.fromEntries(others.map((s) => [s.id, s])) } }, mine };
}

function npc(id: string, loadout: string, x: number, over: Partial<Ship> = {}): Ship {
  const base = createStarterWorld();
  return { ...buildShip(base, { id, loadout: LOADOUTS[loadout]!, ownerId: null, position: { x: 90000 + x, y: 90000 }, heading: 0, flightMode: 'assisted' }), ...over };
}

const general = PLOT_PRESETS.find((p) => p.id === 'general')!;
const combat = PLOT_PRESETS.find((p) => p.id === 'combat')!;

describe('the Plot', () => {
  it('names a ship showing colours by hull and role, and lists every station', () => {
    const trader = npc('t1', 'tessaract-trader', 800);
    const { world, mine } = around(trader);
    const w = { ...world, npcs: { t1: { kind: 'trader' } as never } };
    const rows = plotRows(w, mine, 'ana');
    const row = rows.find((r) => r.id === 't1')!;
    expect(row).toMatchObject({ kind: 'ship', name: 'TRADER', side: 'neutral', dark: false, lock: null });
    expect(row.type).toBe(w.hulls[trader.hullId]!.name.toUpperCase());
    expect(Math.round(row.dist)).toBe(800);
    expect(rows.filter((r) => r.kind === 'station').length).toBe(Object.keys(w.stations).length);
  });

  it('shows a dark ship you have not identified as a radar contact, and its lock column as DARK', () => {
    const pirate = npc('p1', 'kessari-raider', 1200, { dark: true });
    const { world, mine } = around(pirate);
    const w = { ...world, npcs: { p1: { kind: 'pirate' } as never } };
    // The client works from its view, where the pirate is only a contact.
    const view = visibleWorld(w, 'ana');
    const row = plotRows(view, view.ships[mine.id]!, 'ana').find((r) => r.id === 'p1')!;
    expect(row).toMatchObject({ type: 'RADAR · SMALL', name: 'Unknown contact', side: 'unknown', dark: true });
    expect(lockWords(row)).toBe('DARK');
    // Locked, it is identified: hull and role.
    const locked = { ...mine, locks: [{ targetId: 'p1', progress: 1 }], activeLock: 'p1' };
    const seen = visibleWorld({ ...w, ships: { ...w.ships, [mine.id]: locked } }, 'ana');
    const known = plotRows(seen, seen.ships[mine.id]!, 'ana').find((r) => r.id === 'p1')!;
    expect(known).toMatchObject({ name: 'PIRATE', side: 'hostile', dark: false, lock: 'active' });
    expect(lockWords(known)).toBe('ACTIVE');
  });

  it('combat lists ships only, hostiles first, then unknown contacts, then the rest', () => {
    const near = npc('n1', 'tessaract-trader', 300);
    const unknown = { ...npc('u1', 'kessari-raider', 900), contact: 'small' as const };
    const pirate = npc('p1', 'kessari-raider', 2000);
    const { world, mine } = around(near, unknown, pirate);
    const w = { ...world, npcs: { p1: { kind: 'pirate' } as never } };
    expect(plotView(plotRows(w, mine, 'ana'), combat, 'dist').map((r) => r.id)).toEqual(['p1', 'u1', 'n1']);
    // General sorts by distance alone and lists stations too.
    const g = plotView(plotRows(w, mine, 'ana'), general, 'dist');
    expect(g.slice(0, 3).map((r) => r.id)).toEqual(['n1', 'u1', 'p1']);
    expect(g.some((r) => r.kind === 'station')).toBe(true);
  });

  it('sorts by closing speed, fastest closing first', () => {
    const coming = npc('c1', 'tessaract-trader', 1000, { velocity: { x: -50, y: 0 } });
    const going = npc('g1', 'tessaract-trader', 500, { velocity: { x: 40, y: 0 } });
    const { world, mine } = around(coming, going);
    const rows = plotView(plotRows(world, mine, 'ana'), combat, 'closing');
    expect(rows.map((r) => r.id)).toEqual(['c1', 'g1']);
    expect(Math.round(rows[0]!.closing)).toBe(50);
    expect(Math.round(rows[1]!.closing)).toBe(-40);
  });

  it('works out closing speed, arrival and the clock', () => {
    expect(closingSpeed({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 100, y: 0 }, { x: -5, y: 0 })).toBeCloseTo(15);
    expect(arrivalSeconds(600, 10)).toBe(60);
    expect(arrivalSeconds(600, 0)).toBeNull();
    expect(arrivalSeconds(600, -3)).toBeNull();
    expect(clockWords(65)).toBe('1:05');
    expect(clockWords(3725)).toBe('1:02:05');
    expect(clockWords(null)).toBe('--');
  });

  it('finds where a nav target is now, and loses one that has gone', () => {
    const t = npc('t1', 'tessaract-trader', 800);
    const { world } = around(t);
    expect(plotPosition(world, 'ship', 't1')?.position).toEqual(t.position);
    const station = Object.values(world.stations)[0]!;
    expect(plotPosition(world, 'station', station.id)?.position).toEqual(station.position);
    expect(plotPosition(world, 'ship', 'gone')).toBeNull();
  });
});
