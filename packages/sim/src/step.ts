import { thinkNpcs } from './ai/index.js';
import { collideWithStations } from './collision.js';
import { tryDock, undock } from './docking.js';
import { nextFlightMode } from './flight.js';
import { stepShip } from './ship.js';
import type { Ship, ShipInput, World, WorldEvent } from './types.js';
import { emptyInput } from './world.js';

/**
 * Advance the world by exactly one fixed tick.
 *
 * `inputs` maps ship id to that ship's control input for this tick, from
 * people (on this machine or, later, over the network). Ships with an NPC
 * brain get their input from the brain instead; an input supplied for an
 * NPC ship wins, which is how tests and debugging can take one over.
 * Any other ship gets an empty input and keeps drifting under whatever
 * its flight computer does on its own.
 *
 * Order within a tick: NPCs decide (from the start-of-tick world), then
 * each ship docks or undocks, changes mode, moves, and is pushed out of
 * any station it hit.
 *
 * Pure: returns a new World and never mutates the one passed in. The client
 * calls this from a fixed-timestep accumulator; tests call it directly.
 */
export function stepWorld(world: World, inputs: Readonly<Record<string, ShipInput>>): World {
  const npc = thinkNpcs(world);
  const events: WorldEvent[] = [...npc.events];
  const ships: Record<string, Ship> = {};

  // Sorted so results never depend on object insertion order.
  for (const id of Object.keys(world.ships).sort()) {
    let ship = world.ships[id]!;
    const input = inputs[id] ?? npc.inputs[id] ?? emptyInput();
    const hull = world.hulls[ship.hullId];
    if (!hull) throw new Error(`Unknown hull "${ship.hullId}" on ship "${id}"`);

    // Docking is handled before movement so a docked ship does not drift.
    if (input.toggleDock) {
      if (ship.state === 'docked') {
        const result = undock(ship, world.stations);
        if (result) {
          ship = result.ship;
          events.push(result.event);
        }
      } else {
        const result = tryDock(ship, world.stations);
        ship = result.ship;
        events.push(result.event);
      }
    }

    // Mode changes apply before movement so the new mode governs this tick.
    if (input.cycleFlightMode) {
      const mode = nextFlightMode(ship.flightMode);
      ship = { ...ship, flightMode: mode };
      events.push({ type: 'flightModeChanged', shipId: ship.id, mode });
    }

    const moved = collideWithStations(stepShip(ship, hull, input, world.dt), hull, world.stations);
    ships[id] = moved.ship;
    events.push(...moved.events);
  }

  return {
    ...world,
    tick: world.tick + 1,
    ships,
    npcs: npc.npcs,
    events,
  };
}
