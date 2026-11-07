import { describe, expect, it } from 'vitest';
import { STARTS, DEFAULT_START, START_STANDING, readStartId } from '../starts.js';
import { createSolWorld } from '../sol.js';
import { createStarterWorld, joinPilot, pilotShip, respawnPilot } from '../world.js';
import { pilotHome } from '../pilots.js';
import type { StartId, World } from '../types.js';

describe('the eight starts (Open Lanes step 3)', () => {
  const sol = createSolWorld();

  it('has eight, one private and one service path for each power with ports, each home a real port', () => {
    const ids = Object.keys(STARTS) as StartId[];
    expect(ids).toHaveLength(8);
    for (const power of ['earth', 'mars', 'belt', 'venus']) {
      expect(ids.filter((id) => STARTS[id].power === power).map((id) => STARTS[id].path).sort()).toEqual(['navy', 'private']);
    }
    for (const s of Object.values(STARTS)) {
      expect(sol.stations[s.home], s.id).toBeDefined();
      expect(sol.loadouts[s.loadoutId], s.id).toBeDefined();
    }
  });

  it('gives each new pilot their home, first ship, standing and (in service) licence', () => {
    for (const s of Object.values(STARTS)) {
      const w = joinPilot(sol, 'p', 'Pat', s.id);
      const pilot = w.pilots['p']!;
      expect(pilot.start).toBe(s.id);
      expect(pilot.home).toBe(s.home);
      expect(pilot.standing).toEqual({ [s.power]: START_STANDING[s.path] });
      expect(pilot.licence?.rung ?? null, s.id).toBe(s.path === 'navy' ? 1 : null);
      const ship = pilotShip(w, 'p')!;
      expect(ship.hullId, s.id).toBe(sol.loadouts[s.loadoutId]!.hullId);
      expect(ship.ownerId).toBe('p');
      // Arrives just off home.
      const home = w.stations[s.home]!;
      expect(Math.hypot(ship.position.x - home.position.x, ship.position.y - home.position.y), s.id).toBeLessThan(2000);
    }
  });

  it('starts an older client (no start sent) as Earth, private, and ignores a start for a returning pilot', () => {
    const w = joinPilot(sol, 'p', 'Pat');
    expect(w.pilots['p']!.start).toBe(DEFAULT_START);
    const again = joinPilot(w, 'p', 'Pat', 'mars-navy');
    expect(again.pilots['p']!.start).toBe(DEFAULT_START);
  });

  it('wakes a pilot who lost everything at their own home, in a Tern', () => {
    let w: World = joinPilot(sol, 'p', 'Pat', 'belt-navy');
    const ship = pilotShip(w, 'p')!;
    const ships = { ...w.ships };
    delete ships[ship.id];
    w = respawnPilot({ ...w, ships, pilots: { ...w.pilots, p: { ...w.pilots['p']!, shipId: null } } }, 'p');
    const woke = pilotShip(w, 'p')!;
    expect(pilotHome(w, 'p')).toBe(STARTS['belt-navy'].home);
    expect(woke.dockedAt).toBe(STARTS['belt-navy'].home);
    expect(woke.hullId).toBe('meridian-courier');
  });

  it('keeps Calder and pilots from before starts as they were', () => {
    const calder = joinPilot(createStarterWorld(), 'p', 'Pat', 'mars-navy');
    expect(calder.pilots['p']!.start).toBeUndefined();
    expect(pilotShip(calder, 'p')!.hullId).toBe('meridian-courier');
    const old = { ...sol, pilots: { p: { id: 'p', name: 'Pat', shipId: null, shipsIssued: 0, credits: 0, storage: {} } } };
    expect(pilotHome(old, 'p')).toBe(sol.homeStationId);
  });

  it('reads a start id from outside', () => {
    expect(readStartId('venus-navy')).toBe('venus-navy');
    expect(readStartId('pluto-private')).toBeNull();
    expect(readStartId(3)).toBeNull();
  });
});
