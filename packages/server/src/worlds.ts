import {
  ARENA_COMMANDS,
  createArenaWorld,
  joinArena,
  joinPilot,
  leaveArenaWorld,
  pilotLeft,
  pilotReturned,
  stepArenas,
  stepAway,
  type PilotCommand,
  type World,
  type WorldId,
} from '@spacegame/sim';
import { Game, type WorldHooks } from './game.js';

/**
 * The worlds this server runs (docs/worlds.md), and what makes each one
 * itself.
 *
 * - **The persistent world** (`persistent`; Dev on the dev server, the
 *   Universe on the live one): loaded and saved. A new pilot
 *   takes the start they chose (Sol's eight; starts.ts); one who logs off keeps their ship in space a
 *   while, then it is taken out until they return (away.ts).
 * - **The Arena** (`arena`): made fresh at start, never saved. A pilot
 *   comes in with no ship, at the arena setup; leaving clears their
 *   arena and they are gone. Fights that are decided end by themselves
 *   (`stepArenas`).
 */

const PERSISTENT: WorldHooks = {
  join: (world, pilotId, name, start) => pilotReturned(joinPilot(world, pilotId, name, start), pilotId),
  leave: (world, pilotId) => pilotLeft(world, pilotId),
  afterStep: (world) => stepAway(world),
};

const ARENA: WorldHooks = {
  join: (world, pilotId, name) => joinArena(world, pilotId, name),
  leave: (world, pilotId) => leaveArenaWorld(world, pilotId),
  afterStep: (world) => stepArenas(world),
};

/** One `Game` per world: the persistent world from its save, and a fresh Arena. */
export function makeWorlds(persistent: World): Record<WorldId, Game> {
  return { persistent: new Game(persistent, PERSISTENT), arena: new Game(createArenaWorld(), ARENA) };
}

/**
 * Whether a command may run in a world. The Arena takes only its own
 * commands (launch, leave): no trading, refitting, buying ships or admin
 * switches, so nothing there can be turned into anything else. The
 * persistent world takes everything but those.
 */
export function allowedIn(world: WorldId, command: PilotCommand): boolean {
  const arenaCommand = ARENA_COMMANDS.includes(command.type);
  return world === 'arena' ? arenaCommand : !arenaCommand;
}
