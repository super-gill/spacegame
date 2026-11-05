import type { World } from '@spacegame/sim';

/**
 * The worlds the server sent, and which moment of them to draw
 * (docs/shared-world.md, "What the server sends").
 *
 * Updates leave the server every few ticks but do not arrive evenly:
 * timers on the host (Windows ticks in 15.6 ms steps) and the network
 * bunch them up and spread them out. Drawing each one the moment it
 * lands makes motion stutter. Instead the client draws a little in the
 * past (`DELAY_TICKS` behind the newest update), on its own steady clock,
 * between the two updates either side of that moment. Late or bunched
 * updates are then absorbed, as long as they are less late than the
 * delay.
 */

/** How far behind the newest update to draw, in ticks: 4 is about 67 ms, two updates' worth at 30 a second. */
export const DELAY_TICKS = 4;
/** Further off than this, in ticks, and the clock jumps rather than drifts (after a stall, or on joining). */
const JUMP_TICKS = 30;
/** How strongly the clock is pulled towards where it should be, per frame: gently, so speed never visibly changes. */
const PULL = 0.05;
/** Updates kept: enough to cover the delay with room for late ones. */
const KEEP = 16;

interface Snapshot {
  tick: number;
  world: World;
}

/** Two worlds to draw between, and how far from the first to the second (0 to 1). */
export interface Moment {
  from: World;
  to: World;
  alpha: number;
}

export class Timeline {
  private readonly snapshots: Snapshot[] = [];
  /** The tick being drawn, with fractions. */
  private clock: number;

  constructor(first: World) {
    this.snapshots.push({ tick: first.tick, world: first });
    this.clock = first.tick - DELAY_TICKS;
  }

  /** The newest world the server sent. */
  get latest(): World {
    return this.snapshots[this.snapshots.length - 1]!.world;
  }

  /** A new update. Out-of-order or repeated ticks are ignored. */
  add(world: World): void {
    if (world.tick <= this.latest.tick) return;
    this.snapshots.push({ tick: world.tick, world });
    if (this.snapshots.length > KEEP) this.snapshots.splice(0, this.snapshots.length - KEEP);
  }

  /** Draw the newest world straight away (after boarding or waking somewhere else: no gliding there). */
  jump(): void {
    const newest = this.snapshots[this.snapshots.length - 1]!;
    this.snapshots.splice(0, this.snapshots.length - 1);
    this.clock = newest.tick;
  }

  /** Move the clock on by a frame and say what to draw. */
  advance(seconds: number, tickSeconds: number): Moment {
    const target = this.latest.tick - DELAY_TICKS;
    this.clock += seconds / tickSeconds;
    const off = target - this.clock;
    if (Math.abs(off) > JUMP_TICKS) this.clock = target;
    else this.clock += off * PULL;
    // Never ahead of what we have: hold on the newest rather than guess.
    if (this.clock > this.latest.tick) this.clock = this.latest.tick;

    // The updates either side of the clock.
    let i = this.snapshots.length - 1;
    while (i > 0 && this.snapshots[i]!.tick > this.clock) i--;
    const from = this.snapshots[i]!;
    const to = this.snapshots[i + 1] ?? from;
    const span = to.tick - from.tick;
    const alpha = span > 0 ? Math.min(1, Math.max(0, (this.clock - from.tick) / span)) : 0;
    return { from: from.world, to: to.world, alpha };
  }
}
