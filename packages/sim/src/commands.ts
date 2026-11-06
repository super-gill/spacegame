import { buyModule, fitModule, sellModule, unfitModule } from './fitting.js';
import { storeGoods, takeGoods } from './hangar.js';
import { leaveArena, startArena } from './arena.js';
import { adminGrantCredits, adminSetRule, adminSpawnShip, boardShip, buyShip, claimStarterShip, stepOut, wakePilot } from './pilots.js';
import { buyGood, sellGood } from './trade.js';
import type { ArenaScenario, World, WorldEvent, WorldRules } from './types.js';

/**
 * Pilot commands (docs/shared-world.md): everything a pilot can ask for
 * that is not flying the ship. Flying goes through `ShipInput` each tick;
 * these are the one-off requests (trade at a station, refit, buy a ship,
 * board one, admin switches).
 *
 * A command is plain data, so it can travel from a client to the server
 * as JSON. `applyCommand` runs it for the pilot it came from, using the
 * same pure functions the game has always used, and says what happened or
 * why it was refused. The server decides which pilot a command is for
 * (the one its connection logged in as), never the command itself.
 */
export type PilotCommand =
  // Trade at the station you are docked at.
  | { type: 'buyGood'; good: string; quantity: number }
  | { type: 'sellGood'; good: string; quantity: number }
  // Station storage for goods.
  | { type: 'storeGoods'; good: string; quantity: number }
  | { type: 'takeGoods'; good: string; quantity: number }
  // Fitting at a station: a module on a mount, off it, or bought or sold in storage.
  | { type: 'fitModule'; mountId: string; moduleId: string }
  | { type: 'unfitModule'; mountId: string }
  | { type: 'buyModule'; moduleId: string }
  | { type: 'sellModule'; moduleId: string }
  // Ships.
  | { type: 'buyShip'; loadoutId: string }
  | { type: 'boardShip'; shipId: string }
  | { type: 'stepOut' }
  | { type: 'claimStarter' }
  | { type: 'wake' }
  // Admin (the host only, once there is a server).
  | { type: 'adminGrantCredits'; amount: number }
  | { type: 'adminSetRule'; rule: 'gravity' | 'orbits'; value: boolean }
  | { type: 'adminSetRule'; rule: 'manoeuvreSpeed'; value: number }
  | { type: 'adminSpawnShip'; loadoutId: string }
  // The Arena world only (arena.ts, docs/worlds.md): launch a fight in a reference fit, or leave it for the setup.
  | { type: 'arenaStart'; fit: string; scenario: ArenaScenario }
  | { type: 'arenaLeave' };

/** Commands that belong to the Arena world; the server refuses them anywhere else, and every other command there. */
export const ARENA_COMMANDS: readonly PilotCommand['type'][] = ['arenaStart', 'arenaLeave'];

/** What a command did: the new world and its event, or the old world and why not. `reason` is from the refusal list of the function the command ran. */
export type CommandOutcome = { ok: true; world: World; event: WorldEvent } | { ok: false; world: World; reason: string };

/** Run a command for a pilot. Pure: the world passed in is not changed. */
export function applyCommand(world: World, pilotId: string, command: PilotCommand): CommandOutcome {
  switch (command.type) {
    case 'buyGood':
      return buyGood(world, pilotId, command.good, command.quantity);
    case 'sellGood':
      return sellGood(world, pilotId, command.good, command.quantity);
    case 'storeGoods':
      return storeGoods(world, pilotId, command.good, command.quantity);
    case 'takeGoods':
      return takeGoods(world, pilotId, command.good, command.quantity);
    case 'fitModule':
      return fitModule(world, pilotId, command.mountId, command.moduleId);
    case 'unfitModule':
      return unfitModule(world, pilotId, command.mountId);
    case 'buyModule':
      return buyModule(world, pilotId, command.moduleId);
    case 'sellModule':
      return sellModule(world, pilotId, command.moduleId);
    case 'buyShip':
      return buyShip(world, pilotId, command.loadoutId);
    case 'boardShip':
      return boardShip(world, pilotId, command.shipId);
    case 'stepOut':
      return stepOut(world, pilotId);
    case 'claimStarter':
      return claimStarterShip(world, pilotId);
    case 'wake':
      return wakePilot(world, pilotId);
    case 'adminGrantCredits':
      return adminGrantCredits(world, pilotId, command.amount);
    case 'adminSetRule':
      return command.rule === 'manoeuvreSpeed'
        ? adminSetRule(world, pilotId, 'manoeuvreSpeed', command.value as WorldRules['manoeuvreSpeed'])
        : adminSetRule(world, pilotId, command.rule, command.value as boolean);
    case 'adminSpawnShip':
      return adminSpawnShip(world, pilotId, command.loadoutId);
    case 'arenaStart':
      return startArena(world, pilotId, command.fit, command.scenario);
    case 'arenaLeave':
      return leaveArena(world, pilotId);
  }
}

/**
 * A command from outside (a client's message, parsed from JSON), checked
 * field by field: the command if it is well formed, else null. The server
 * runs only what this accepts; the functions behind each command then
 * check whether the pilot may do it.
 */
export function readCommand(value: unknown): PilotCommand | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  const text = (k: string): boolean => typeof v[k] === 'string' && (v[k] as string).length > 0 && (v[k] as string).length <= 64;
  const count = (k: string): boolean => typeof v[k] === 'number' && Number.isFinite(v[k]);
  switch (v['type']) {
    case 'buyGood':
    case 'sellGood':
    case 'storeGoods':
    case 'takeGoods':
      return text('good') && count('quantity') ? { type: v['type'], good: v['good'] as string, quantity: v['quantity'] as number } : null;
    case 'fitModule':
      return text('mountId') && text('moduleId') ? { type: 'fitModule', mountId: v['mountId'] as string, moduleId: v['moduleId'] as string } : null;
    case 'unfitModule':
      return text('mountId') ? { type: 'unfitModule', mountId: v['mountId'] as string } : null;
    case 'buyModule':
    case 'sellModule':
      return text('moduleId') ? { type: v['type'], moduleId: v['moduleId'] as string } : null;
    case 'buyShip':
    case 'adminSpawnShip':
      return text('loadoutId') ? { type: v['type'], loadoutId: v['loadoutId'] as string } : null;
    case 'boardShip':
      return text('shipId') ? { type: 'boardShip', shipId: v['shipId'] as string } : null;
    case 'stepOut':
    case 'claimStarter':
    case 'wake':
    case 'arenaLeave':
      return { type: v['type'] };
    case 'arenaStart': {
      const scenario = v['scenario'];
      if (!text('fit') || typeof scenario !== 'object' || scenario === null) return null;
      const sc = scenario as Record<string, unknown>;
      const ok = sc['kind'] === 'skirmish' && typeof sc['enemyFit'] === 'string' && sc['enemyFit'].length > 0 && sc['enemyFit'].length <= 64 && typeof sc['count'] === 'number' && Number.isFinite(sc['count']);
      return ok ? { type: 'arenaStart', fit: v['fit'] as string, scenario: { kind: 'skirmish', enemyFit: sc['enemyFit'] as string, count: sc['count'] as number } } : null;
    }
    case 'adminGrantCredits':
      return count('amount') ? { type: 'adminGrantCredits', amount: v['amount'] as number } : null;
    case 'adminSetRule':
      if (v['rule'] === 'manoeuvreSpeed') return count('value') ? { type: 'adminSetRule', rule: 'manoeuvreSpeed', value: v['value'] as number } : null;
      if (v['rule'] === 'gravity' || v['rule'] === 'orbits') return typeof v['value'] === 'boolean' ? { type: 'adminSetRule', rule: v['rule'], value: v['value'] } : null;
      return null;
    default:
      return null;
  }
}
