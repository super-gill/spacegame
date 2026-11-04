import { shipStats } from '../stats.js';
import type { Ship, ShipInput, World, WorldEvent } from '../types.js';
import { thinkPirate } from './pirate.js';
import { thinkTrader } from './trader.js';
import { thinkWatch } from './watch.js';
import { wantsCountermeasure } from './steer.js';

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
    // Brains plan with the ship as it actually flies: its fit, cargo mass included.
    const stats = ship && world.hulls[ship.hullId] ? shipStats(world, ship) : undefined;
    if (!ship || !stats) {
      npcs[shipId] = brain; // ship gone (later: destroyed); keep the brain inert
      continue;
    }

    if (brain.kind === 'trader') {
      const t = thinkTrader(world, ship, stats, brain);
      inputs[shipId] = t.input;
      npcs[shipId] = t.brain;
    } else if (brain.kind === 'watch') {
      const t = thinkWatch(world, ship, stats, brain);
      inputs[shipId] = t.input;
      npcs[shipId] = t.brain;
      events.push(...t.events);
    } else {
      const t = thinkPirate(world, ship, stats, brain);
      inputs[shipId] = t.input;
      npcs[shipId] = t.brain;
      events.push(...t.events);
      if (t.depart) departures.push(shipId);
    }
  }
  // Any NPC with a dispenser drops a countermeasure when a munition is closing on it.
  for (const shipId of Object.keys(inputs)) {
    const ship = world.ships[shipId]!;
    const stats = shipStats(world, ship);
    if (wantsCountermeasure(world, ship, stats)) inputs[shipId] = { ...inputs[shipId]!, launchCountermeasure: true };
  }
  return { inputs, npcs, events, departures };
}

export { PIRATE_TUNING, inSecurityZone } from './pirate.js';
export { TRADER_TUNING } from './trader.js';
export { WATCH_TUNING } from './watch.js';
