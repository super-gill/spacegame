import {
  applyCommand,
  emptyInput,
  pilotShip,
  stepWorld,
  type CommandOutcome,
  type PilotCommand,
  type ShipInput,
  type World,
  type WorldEvent,
} from '@spacegame/sim';

/**
 * A running world (docs/shared-world.md, docs/worlds.md): the one copy of
 * it, stepped 60 times a second, with every pilot's controls and commands
 * applied to it here and nowhere else. The server runs one per world (the
 * persistent world and the Arena), each stepping on its own.
 *
 * This class knows nothing about sockets or files: it takes controls and
 * commands in, and gives out the world and its events. `main.ts` cuts
 * each player's view from it (`visibleWorld`) and wires it to the
 * network and the disk. What differs between worlds (how a pilot joins
 * and leaves, what happens after each step) comes in as `WorldHooks`
 * (worlds.ts).
 */

/** How one kind of world treats its pilots, beyond stepping. */
export interface WorldHooks {
  /** A pilot comes in. */
  join(world: World, pilotId: string, name: string): World;
  /** A pilot goes. */
  leave(world: World, pilotId: string): World;
  /** After each step of the world. */
  afterStep(world: World): World;
}

/**
 * Controls that are held (a key down): if a tick has no fresh message
 * from the pilot, the last ones carry on. Everything else in `ShipInput`
 * is a one-off press (dock, lock, toggle a module) that happens once.
 */
const HELD: readonly (keyof ShipInput)[] = ['turnLeft', 'turnRight', 'aimHeading', 'thrustForward', 'thrustReverse', 'strafeLeft', 'strafeRight', 'brake', 'fireFixed', 'afterburner', 'tractor'];

/**
 * Controls queue up per ship and one message is used per tick, in order,
 * so no press is lost or doubled when messages bunch up on the way. If
 * more than this many are waiting (the connection stalled, then caught
 * up), the oldest held-only messages are dropped so the ship does not lag
 * behind its pilot.
 */
const MAX_QUEUED_INPUTS = 6;

/** Whether an input holds any one-off press, so it must not be dropped. */
function hasPress(input: ShipInput): boolean {
  const blank = emptyInput() as unknown as Record<string, unknown>;
  const given = input as unknown as Record<string, unknown>;
  return Object.keys(given).some((k) => !HELD.includes(k as keyof ShipInput) && given[k] !== (blank[k] ?? null) && given[k] !== undefined);
}

/** Only the held controls of an input, for ticks with no message. */
function heldOnly(input: ShipInput): ShipInput {
  const out = emptyInput() as unknown as Record<string, unknown>;
  for (const k of HELD) out[k] = input[k];
  return out as unknown as ShipInput;
}

export class Game {
  private world: World;
  /** Controls waiting to be used, per pilot (not per ship: a pilot can change ships). */
  private readonly queued = new Map<string, ShipInput[]>();
  /** The last controls used, per pilot, so held keys carry over a tick with no message. */
  private readonly last = new Map<string, ShipInput>();
  /** Events since they were last taken with `takeEvents`. */
  private events: WorldEvent[] = [];

  constructor(
    world: World,
    private readonly hooks: WorldHooks,
  ) {
    this.world = world;
  }

  /** The world as it is now. Treat it as read-only. */
  get current(): World {
    return this.world;
  }

  /** Bring a pilot into the world, as the world's hooks say. */
  join(pilotId: string, name: string): void {
    this.world = this.hooks.join(this.world, pilotId, name);
  }

  /**
   * Everyone is gone: on starting up, before anyone connects. In the
   * persistent world their ships in space disappear after the usual grace
   * (away.ts).
   */
  allAway(): void {
    for (const id of Object.keys(this.world.pilots)) this.world = this.hooks.leave(this.world, id);
  }

  /** A pilot's controls for one tick. */
  input(pilotId: string, input: ShipInput): void {
    const queue = this.queued.get(pilotId) ?? [];
    queue.push(input);
    while (queue.length > MAX_QUEUED_INPUTS) {
      const drop = queue.findIndex((q) => !hasPress(q));
      queue.splice(drop >= 0 ? drop : 0, 1);
    }
    this.queued.set(pilotId, queue);
  }

  /** A pilot's command, applied now; returns what it did. */
  command(pilotId: string, command: PilotCommand): CommandOutcome {
    const outcome = applyCommand(this.world, pilotId, command);
    if (outcome.ok) {
      this.world = outcome.world;
      this.events.push(outcome.event);
    }
    return outcome;
  }

  /** A pilot logged off or went to another world: forget their controls, and let the world's hooks deal with them. */
  leave(pilotId: string): void {
    this.queued.delete(pilotId);
    this.last.delete(pilotId);
    this.world = this.hooks.leave(this.world, pilotId);
  }

  /** One tick: everyone's controls in, the world stepped. */
  step(): void {
    const inputs: Record<string, ShipInput> = {};
    for (const pilotId of new Set([...this.queued.keys(), ...this.last.keys()])) {
      const ship = pilotShip(this.world, pilotId);
      const next = this.queued.get(pilotId)?.shift();
      const input = next ?? heldOnly(this.last.get(pilotId) ?? emptyInput());
      this.last.set(pilotId, input);
      if (ship) inputs[ship.id] = input;
    }
    this.world = this.hooks.afterStep(stepWorld(this.world, inputs));
    this.events.push(...this.world.events);
  }

  /** The events since the last call, and forget them. */
  takeEvents(): WorldEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }
}
