import type { Ship, ShipInput, World, WorldEvent } from '../types.js';
import { thinkPirate } from './pirate.js';
import { thinkTrader } from './trader.js';

/**
 * NPC decision making, run once per tick for every ship with a brain.
 *
 * Every brain reads the world as it was at the start of the tick, so the
 * order NPCs think in never changes the outcome. Each returns the input
 * for its ship (fed to the same flight computer pilots use), its updated
 * brain, and any events.
 */

export interface NpcDecisions {
  inputs: Record<string, ShipInput>;
  npcs: World['npcs'];
  events: WorldEvent[];
}

export function thinkNpcs(world: World): NpcDecisions {
  const inputs: Record<string, ShipInput> = {};
  const npcs: World['npcs'] = {};
  const events: WorldEvent[] = [];

  for (const shipId of Object.keys(world.npcs).sort()) {
    const brain = world.npcs[shipId]!;
    const ship: Ship | undefined = world.ships[shipId];
    const hull = ship ? world.hulls[ship.hullId] : undefined;
    if (!ship || !hull) {
      npcs[shipId] = brain; // ship gone (later: destroyed); keep the brain inert
      continue;
    }

    if (brain.kind === 'trader') {
      const t = thinkTrader(world, ship, hull, brain);
      inputs[shipId] = t.input;
      npcs[shipId] = t.brain;
    } else {
      const t = thinkPirate(world, ship, hull, brain);
      inputs[shipId] = t.input;
      npcs[shipId] = t.brain;
      events.push(...t.events);
    }
  }
  return { inputs, npcs, events };
}

export { PIRATE_TUNING, inSecurityZone } from './pirate.js';
export { TRADER_TUNING } from './trader.js';
