import { tryDock, undock } from './docking.js';
import { stepShip } from './ship.js';
import type { PlayerInput, World, WorldEvent } from './types.js';
import { playerShip } from './world.js';

/**
 * Advance the world by exactly one fixed tick.
 *
 * Pure: returns a new World and never mutates the one passed in. The client
 * calls this from a fixed-timestep accumulator; tests call it directly.
 */
export function stepWorld(world: World, input: PlayerInput): World {
  const events: WorldEvent[] = [];
  const ships = { ...world.ships };

  let player = playerShip(world);
  const hull = world.hulls[player.hullId];
  if (!hull) throw new Error(`Unknown hull "${player.hullId}"`);

  // Docking is handled before movement so a docked ship does not drift.
  if (input.toggleDock) {
    if (player.state === 'docked') {
      const result = undock(player, world.stations);
      if (result) {
        player = result.ship;
        events.push(result.event);
      }
    } else {
      const result = tryDock(player, world.stations);
      player = result.ship;
      events.push(result.event);
    }
  }

  player = stepShip(player, hull, input, world.dt);
  ships[player.id] = player;

  return {
    ...world,
    tick: world.tick + 1,
    ships,
    events,
  };
}
