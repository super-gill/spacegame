import { describe, expect, it } from 'vitest';
import { applyCommand, readCommand, type PilotCommand } from '../commands.js';
import { freePadFor, onPad } from '../docking.js';
import type { World } from '../types.js';
import { createStarterWorld, joinPilot, pilotShip } from '../world.js';

/** Pilot commands (docs/shared-world.md): what a client may ask of the server, as plain data. */

/** Ana, new, her starter ship on a pad at Harbour. */
function docked(): World {
  let w = joinPilot({ ...createStarterWorld(), ships: {}, npcs: {}, spawners: [] }, 'ana', 'Ana');
  const station = w.stations['station-harbour']!;
  const ship = pilotShip(w, 'ana')!;
  w = { ...w, ships: { ...w.ships, [ship.id]: onPad(ship, station, freePadFor(station, 'S', {})!) }, pilots: { ...w.pilots, ana: { ...w.pilots['ana']!, credits: 100_000 } } };
  return w;
}

describe('pilot commands', () => {
  it('run the same rules as before, for the pilot they are run for', () => {
    const w = docked();
    const bought = applyCommand(w, 'ana', { type: 'buyGood', good: 'food', quantity: 2 });
    expect(bought.ok).toBe(true);
    if (!bought.ok) return;
    expect(pilotShip(bought.world, 'ana')!.hold['food']).toBe(2);
    expect(bought.event).toMatchObject({ type: 'traded', side: 'buy', quantity: 2 });
    // Refused: the reason comes from the function behind the command.
    expect(applyCommand(w, 'ana', { type: 'sellGood', good: 'food', quantity: 1 })).toMatchObject({ ok: false, reason: 'notHeld' });
    expect(applyCommand(w, 'nobody', { type: 'buyGood', good: 'food', quantity: 1 })).toMatchObject({ ok: false, reason: 'noShip' });
  });

  it('cover buying and fitting modules, storage and ships', () => {
    let w = docked();
    const steps: PilotCommand[] = [
      { type: 'buyModule', moduleId: 'rookrivet-armour-s' },
      { type: 'buyGood', good: 'food', quantity: 1 },
      { type: 'storeGoods', good: 'food', quantity: 1 },
      { type: 'takeGoods', good: 'food', quantity: 1 },
      { type: 'buyShip', loadoutId: 'rookrivet-prospector' },
    ];
    for (const c of steps) {
      const r = applyCommand(w, 'ana', c);
      expect(r.ok, c.type).toBe(true);
      if (r.ok) w = r.world;
    }
    expect(w.pilots['ana']!.storage['station-harbour']?.['rookrivet-armour-s']).toBe(1);
  });

  it('read only well-formed commands from outside', () => {
    const all: PilotCommand[] = [
      { type: 'buyGood', good: 'food', quantity: 3 },
      { type: 'fitModule', mountId: 'w1', moduleId: 'paragon-pulse-s' },
      { type: 'unfitModule', mountId: 'w1' },
      { type: 'boardShip', shipId: 'ship-ana-2' },
      { type: 'stepOut' },
      { type: 'adminSetRule', rule: 'orbits', value: true },
      { type: 'adminSetRule', rule: 'manoeuvreSpeed', value: 0.2 },
    ];
    // Through JSON and back, unchanged.
    for (const c of all) expect(readCommand(JSON.parse(JSON.stringify(c)))).toEqual(c);
    // Anything else is turned away before it reaches the sim.
    for (const bad of [null, 'buyGood', {}, { type: 'explode' }, { type: 'buyGood', good: 'food' }, { type: 'buyGood', good: '', quantity: 1 }, { type: 'adminSetRule', rule: 'orbits', value: 'yes' }, { type: 'adminSetRule', rule: 'speed', value: 1 }, { type: 'buyGood', good: 'food', quantity: Infinity }]) {
      expect(readCommand(bad), JSON.stringify(bad)).toBeNull();
    }
    // Extra fields do not come through.
    expect(readCommand({ type: 'stepOut', pilotId: 'someone-else' })).toEqual({ type: 'stepOut' });
  });
});
