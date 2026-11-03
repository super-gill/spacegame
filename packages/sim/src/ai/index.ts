import { loadedHull } from '../trade.js';
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
  /** NPC ships leaving the sector this tick. */
  departures: string[];
}

export function thinkNpcs(world: World): NpcDecisions {
  const inputs: Record<string, ShipInput> = {};
  const npcs: World['npcs'] = {};
  const events: WorldEvent[] = [];
  const departures: string[] = [];

  for (const shipId of Object.keys(world.npcs).sort()) {
    const brain = world.npcs[shipId]!;
    const ship: Ship | undefined = world.ships[shipId];
    // Brains plan with the hull as it actually flies, cargo mass included.
    const baseHull = ship ? world.hulls[ship.hullId] : undefined;
    const hull = ship && baseHull ? loadedHull(baseHull, ship, world.goods) : undefined;
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
      if (t.depart) departures.push(shipId);
    }
  }
  return { inputs, npcs, events, departures };
}

export { PIRATE_TUNING, inSecurityZone } from './pirate.js';
export { TRADER_TUNING } from './trader.js';
