import { describe, expect, it } from 'vitest';
import { stepWorld } from '../step.js';
import { PLANET_ID } from '../bodies.js';
import { bodyPosition, frameVelocity, relativeVelocity } from '../rails.js';
import { add, distance, length, sub } from '../vec2.js';
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
    expect(w.pilots['ana']).toEqual({ id: 'ana', name: 'Ana', shipId: starterShipId('ana'), shipsIssued: 1, credits: 1000, storage: {} });
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
    const start = joinPilot(joinPilot(createStarterWorld(), 'ana', 'Ana'), 'ben', 'Ben');
    let w = start;
    const anaStart = pilotShip(w, 'ana')!;
    const benStart = pilotShip(w, 'ben')!;

    for (let i = 0; i < SECOND; i++) {
      w = stepWorld(w, { [anaStart.id]: { ...emptyInput(), thrustForward: true } });
    }

    // Ben is carried with the planet, so he keeps his place relative to it.
    const planetMoved = sub(bodyPosition(w, PLANET_ID), bodyPosition(start, PLANET_ID));
    expect(pilotShip(w, 'ana')!.position).not.toEqual(add(anaStart.position, planetMoved));
    expect(distance(pilotShip(w, 'ben')!.position, add(benStart.position, planetMoved))).toBeLessThan(1e-6);
  });

  it('steps ships with no input under their own flight computer', () => {
    let w = joinPilot(createStarterWorld(), 'ana', 'Ana');
    const id = pilotShip(w, 'ana')!.id;
    const drift = add(frameVelocity(w, w.ships[id]!), { x: 50, y: 0 });
    w = { ...w, ships: { ...w.ships, [id]: { ...w.ships[id]!, velocity: drift } } };
    // Full assist with nobody at the controls eases the drift to a stop in the local frame.
    for (let i = 0; i < SECOND * 10; i++) w = stepWorld(w, {});
    expect(length(relativeVelocity(w, pilotShip(w, 'ana')!))).toBeLessThan(1e-6);
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
