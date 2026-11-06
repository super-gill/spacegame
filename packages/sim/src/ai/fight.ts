import { angleDelta } from '../angle.js';
import { leadPoint } from '../combat.js';
import { manoeuvreShare } from '../ship.js';
import { fitStats } from '../stats.js';
import type { RunState, Ship, ShipInput, ShipStats, WeaponSpec, World } from '../types.js';
import { isGun } from '../weapons.js';
import { distance, sub, toAngle } from '../vec2.js';
import { emptyInput } from '../world.js';
import { attackRun, steerToVelocity } from './steer.js';

/**
 * Scripted fighting, shared by the fitting lab (fitlab.ts, its duels and
 * skirmishes) and the arena's enemies (ai/arena.ts), so what the audit
 * measures is what a player meets. Two styles: the duellist closes and
 * sits nose on; a ship much smaller than its target makes attack passes
 * with the pirates' own `attackRun`.
 */

/** How a scripted duellist flies: closes to `preferred` of its longest gun's range (launchers aside), backs off inside `tooClose`, and keeps its nose on the lead point. */
export const DUELLIST = { preferred: 0.6, tooClose: 0.3 };

/**
 * A ship this many times smaller (by signature) than its target flies
 * attack runs at it, as pirates do, instead of closing and sitting nose on.
 */
export const RUNNER_SIGNATURE_RATIO = 1.5;

/** One tick of fighting `foeId`: the style that suits the match-up, holding the lock on the foe. `tick` paces fire-group turns. */
export function fightInput(w: World, meId: string, foeId: string, tick: number, state: RunState | undefined): { input: ShipInput; state: RunState | undefined } {
  const me = w.ships[meId]!;
  const foe = w.ships[foeId]!;
  const mineSig = fitStats(w, w.hulls[me.hullId]!, me.fit).signature;
  const theirSig = fitStats(w, w.hulls[foe.hullId]!, foe.fit).signature;
  let input: ShipInput;
  let next: RunState | undefined = state;
  if (theirSig >= mineSig * RUNNER_SIGNATURE_RATIO) {
    const plan = runnerInput(w, meId, foeId, tick, state);
    input = plan.input;
    next = plan.state;
  } else {
    input = duellistInput(w, meId, foeId, tick);
  }
  // Keep the lock on whoever this ship is fighting now.
  if (me.activeLock !== foeId) input = { ...input, lock: foeId, activateLock: foeId };
  return { input, state: next };
}

/** A small ship making attack passes at a big one: the pirates' runs, its turrets firing whenever they bear. */
export function runnerInput(w: World, me: string, foe: string, tick: number, state: RunState | undefined): { input: ShipInput; state: RunState } {
  const mine = w.ships[me]!;
  const them = w.ships[foe]!;
  const stats = fitStats(w, w.hulls[mine.hullId]!, mine.fit);
  const guns = mainGuns(stats);
  const range = Math.max(1, ...guns.map((x) => x.range));
  const aimPoint = guns[0] ? leadPoint(mine, them, guns[0].projectileSpeed || 1e6) : them.position;
  const plan = attackRun(w, mine, stats, them, aimPoint, range * 0.9, state, []);
  const input = steerToVelocity(mine, stats, plan.desired, plan.faceAt, manoeuvreShare(w.rules.manoeuvreSpeed, stats));
  const d = distance(mine.position, them.position);
  const group = groupTurn(mine, stats, tick);
  return {
    input: {
      ...input,
      fireFixed: d < range * 0.95,
      selectGroup: group !== null && group !== mine.fireGroup ? group : null,
    },
    state: plan.state,
  };
}

/** Main guns: turrets that fire on the trigger (not CIWS, launchers, dispensers or mining lasers). */
function mainGuns(stats: ShipStats): WeaponSpec[] {
  return Object.values(stats.weapons).filter((x) => isGun(x) && x.family !== 'pointDefence');
}

/** The fire group whose turn it is: groups holding main guns or launchers take turns, two seconds each, so launchers get used as well as guns. */
function groupTurn(mine: Ship, stats: ShipStats, tick: number): number | null {
  const triggered = (x: WeaponSpec | undefined): boolean => !!x && ((isGun(x) && x.family !== 'pointDefence') || x.family === 'missile');
  const groups = [...new Set(mine.weapons.filter((s) => triggered(stats.weapons[s.mountId])).map((s) => s.group))].sort();
  return groups.length > 0 ? groups[Math.floor(tick / 120) % groups.length]! : null;
}

/** The scripted duellist's input this tick: close, sit nose on, hold the trigger in range (its turrets fire when they bear). */
export function duellistInput(w: World, me: string, foe: string, tick: number): ShipInput {
  const mine = w.ships[me]!;
  const them = w.ships[foe]!;
  const stats = fitStats(w, w.hulls[mine.hullId]!, mine.fit);
  const guns = Object.values(stats.weapons).filter((x) => x.family !== 'mining' && x.family !== 'countermeasure');
  const main = mainGuns(stats);
  // Close to gun range, not launcher range: a launcher's few missiles are
  // gone in a minute, and a ship that holds off at missile range with
  // guns aboard never fires them. A launcher-only fit stands off.
  const direct = guns.filter((x) => x.family !== 'missile');
  const longest = Math.max(1, ...(direct.length > 0 ? direct : guns).map((x) => x.range));
  const lead = main[0] ? leadPoint(mine, them, main[0].projectileSpeed || 1e6) : them.position;
  const want = toAngle(sub(lead, mine.position));
  const err = Math.abs(angleDelta(mine.heading, want));
  const d = distance(mine.position, them.position);
  const group = groupTurn(mine, stats, tick);
  return {
    ...emptyInput(),
    aimHeading: want,
    thrustForward: d > longest * DUELLIST.preferred && err < 0.5,
    thrustReverse: d < longest * DUELLIST.tooClose,
    fireFixed: d < Math.max(longest, ...guns.map((x) => x.range)) * 0.95,
    lock: tick === 0 ? foe : null,
    activateLock: tick === 0 ? foe : null,
    selectGroup: group !== null && group !== mine.fireGroup ? group : null,
  };
}
