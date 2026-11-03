import { describe, expect, it } from 'vitest';
import { stepWorld } from '../step.js';
import { distance } from '../vec2.js';
import { createStarterWorld, emptyInput, joinPilot, pilotShip, starterShipId } from '../world.js';

/**
 * Pilots: the sim has no single player. These tests pin down the rules
 * that keep a shared world fair: each pilot's ship and progress are their
 * own, and one pilot's input never moves another pilot's ship.
 */

const SECOND = 60;

describe('joining', () => {
  it('starts with no pilots and no pilot-owned ships', () => {
    const w = createStarterWorld();
    expect(w.pilots).toEqual({});
    expect(Object.values(w.ships).filter((s) => s.ownerId !== null)).toEqual([]);
  });

  it('gives a new pilot their own starter ship', () => {
    const w = joinPilot(createStarterWorld(), 'ana', 'Ana');
    const ship = pilotShip(w, 'ana')!;
    expect(w.pilots['ana']).toEqual({ id: 'ana', name: 'Ana', shipId: starterShipId('ana'), shipsIssued: 1 });
    expect(ship.ownerId).toBe('ana');
    expect(ship.state).toBe('flying');
  });

  it('spawns pilots who join together apart from each other', () => {
    let w = createStarterWorld();
    for (const id of ['a', 'b', 'c', 'd']) w = joinPilot(w, id, id);
    const ships = ['a', 'b', 'c', 'd'].map((id) => pilotShip(w, id)!);
    for (let i = 0; i < ships.length; i++) {
      for (let j = i + 1; j < ships.length; j++) {
        expect(distance(ships[i]!.position, ships[j]!.position)).toBeGreaterThan(200);
      }
    }
  });

  it('a returning pilot keeps their ship exactly where they left it', () => {
    let w = joinPilot(createStarterWorld(), 'ana', 'Ana');
    const shipId = pilotShip(w, 'ana')!.id;
    for (let i = 0; i < SECOND; i++) w = stepWorld(w, { [shipId]: { ...emptyInput(), thrustForward: true } });
    const before = pilotShip(w, 'ana')!;

    const rejoined = joinPilot(w, 'ana', 'Ana');
    expect(rejoined).toBe(w); // nothing changed at all
    expect(pilotShip(rejoined, 'ana')).toEqual(before);
    expect(Object.values(rejoined.ships).filter((s) => s.ownerId === 'ana')).toHaveLength(1);
  });

  it('a returning pilot can change display name without losing anything', () => {
    const w = joinPilot(createStarterWorld(), 'ana', 'Ana');
    const renamed = joinPilot(w, 'ana', 'Captain Ana');
    expect(renamed.pilots['ana']!.name).toBe('Captain Ana');
    expect(pilotShip(renamed, 'ana')).toEqual(pilotShip(w, 'ana'));
  });
});

describe('several pilots in one world', () => {
  it('each input only moves its own ship', () => {
    let w = joinPilot(joinPilot(createStarterWorld(), 'ana', 'Ana'), 'ben', 'Ben');
    const anaStart = pilotShip(w, 'ana')!;
    const benStart = pilotShip(w, 'ben')!;

    for (let i = 0; i < SECOND; i++) {
      w = stepWorld(w, { [anaStart.id]: { ...emptyInput(), thrustForward: true } });
    }

    expect(pilotShip(w, 'ana')!.position).not.toEqual(anaStart.position);
    expect(pilotShip(w, 'ben')!.position).toEqual(benStart.position);
  });

  it('steps ships with no input under their own flight computer', () => {
    let w = joinPilot(createStarterWorld(), 'ana', 'Ana');
    const id = pilotShip(w, 'ana')!.id;
    w = { ...w, ships: { ...w.ships, [id]: { ...w.ships[id]!, velocity: { x: 50, y: 0 } } } };
    // Full assist with nobody at the controls eases the drift to a stop.
    for (let i = 0; i < SECOND * 10; i++) w = stepWorld(w, {});
    expect(pilotShip(w, 'ana')!.velocity).toEqual({ x: 0, y: 0 });
  });

  it('events name the ship they concern', () => {
    const w = joinPilot(joinPilot(createStarterWorld(), 'ana', 'Ana'), 'ben', 'Ben');
    const ben = pilotShip(w, 'ben')!.id;
    const next = stepWorld(w, { [ben]: { ...emptyInput(), cycleFlightMode: true } });
    expect(next.events).toEqual([{ type: 'flightModeChanged', shipId: ben, mode: 'rotation' }]);
  });

  it('the whole world, every pilot included, survives a save round trip', () => {
    const w = joinPilot(joinPilot(createStarterWorld(), 'ana', 'Ana'), 'ben', 'Ben');
    expect(JSON.parse(JSON.stringify(w))).toEqual(w);
  });
});
