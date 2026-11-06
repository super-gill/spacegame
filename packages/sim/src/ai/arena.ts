import type { ArenaBrain, Ship, ShipInput, ShipStats, World } from '../types.js';
import { emptyInput } from '../world.js';
import { fightInput } from './fight.js';

/**
 * An arena enemy (admin testing, docs/fitting.md, "The arena"). It fights
 * the ship its pilot is flying, with the fitting lab's own scripts
 * (ai/fight.ts), so a fight in the arena is the fight the audit measures.
 * Escape pods are left alone, as pirates leave them.
 */
export function thinkArena(world: World, ship: Ship, _stats: ShipStats, brain: ArenaBrain): { input: ShipInput; brain: ArenaBrain } {
  const pilot = world.pilots[brain.pilotId];
  const foe = pilot?.shipId ? world.ships[pilot.shipId] : undefined;
  if (!foe || foe.state !== 'flying' || world.hulls[foe.hullId]?.escapePod) return { input: emptyInput(), brain };
  const plan = fightInput(world, ship.id, foe.id, world.tick, brain.run);
  return { input: plan.input, brain: plan.state ? { ...brain, run: plan.state } : brain };
}
