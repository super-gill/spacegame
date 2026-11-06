import { angleDelta } from '../angle.js';
import { leadPoint } from '../combat.js';
import { fitStats } from '../stats.js';
import type { RunState, ShipInput, World } from '../types.js';
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

/** How a scripted duellist flies: closes to `preferred` of its longest gun's range (launchers aside), keeps its nose on the lead point, fires when on aim. */
export const DUELLIST = { preferred: 0.6, aimTolerance: 0.08, tooClose: 0.3 };

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

/** A small ship making attack passes at a big one: the pirates' runs, firing its guns on aim and its turrets whenever they bear. */
export function runnerInput(w: World, me: string, foe: string, tick: number, state: RunState | undefined): { input: ShipInput; state: RunState } {
  const mine = w.ships[me]!;
  const them = w.ships[foe]!;
  const stats = fitStats(w, w.hulls[mine.hullId]!, mine.fit);
  const guns = Object.values(stats.weapons).filter((x) => x.family !== 'mining' && x.family !== 'countermeasure' && x.family !== 'missile');
  const fixed = guns.filter((x) => x.kind === 'fixed');
  const range = Math.max(1, ...guns.map((x) => x.range));
  const aimPoint = fixed[0] ? leadPoint(mine, them, fixed[0].projectileSpeed || 1e6) : them.position;
  const plan = attackRun(w, mine, stats, them, aimPoint, range * 0.9, state, []);
  const input = steerToVelocity(mine, stats, plan.desired, plan.faceAt, w.rules.manoeuvreSpeed);
  const err = Math.abs(angleDelta(mine.heading, toAngle(sub(aimPoint, mine.position))));
  const d = distance(mine.position, them.position);
  const groups = [...new Set(mine.weapons.filter((s) => stats.weapons[s.mountId]?.kind === 'fixed').map((s) => s.group))].sort();
  const group = groups.length > 0 ? groups[Math.floor(tick / 120) % groups.length]! : null;
  return {
    input: {
      ...input,
      fireFixed: (guns.some((x) => x.kind === 'turret' && x.family !== 'pointDefence') || (plan.attacking && err < DUELLIST.aimTolerance)) && d < range * 0.95,
      selectGroup: group !== null && group !== mine.fireGroup ? group : null,
    },
    state: plan.state,
  };
}

/** The scripted duellist's input this tick: close, sit nose on, fire on aim. */
export function duellistInput(w: World, me: string, foe: string, tick: number): ShipInput {
  const mine = w.ships[me]!;
  const them = w.ships[foe]!;
  const stats = fitStats(w, w.hulls[mine.hullId]!, mine.fit);
  const guns = Object.values(stats.weapons).filter((x) => x.family !== 'mining' && x.family !== 'countermeasure');
  const fixed = guns.filter((x) => x.kind === 'fixed');
  // Close to gun range, not launcher range: a launcher's few missiles are
  // gone in a minute, and a ship that holds off at missile range with
  // guns aboard never fires them. A launcher-only fit stands off.
  const direct = guns.filter((x) => x.family !== 'missile');
  const longest = Math.max(1, ...(direct.length > 0 ? direct : guns).map((x) => x.range));
  const lead = fixed[0] ? leadPoint(mine, them, fixed[0].projectileSpeed || 1e6) : them.position;
  const want = toAngle(sub(lead, mine.position));
  const err = Math.abs(angleDelta(mine.heading, want));
  const d = distance(mine.position, them.position);
  // Fire groups take turns, two seconds each, so launchers get used as well as guns.
  // Turreted main guns fire with their group whenever they bear, so hold the trigger in range.
  const turreted = guns.some((x) => x.kind === 'turret' && x.family !== 'pointDefence');
  const groups = [...new Set(mine.weapons.filter((s) => { const x = stats.weapons[s.mountId]; return x && (fixed.includes(x) || (x.kind === 'turret' && x.family !== 'pointDefence' && x.family !== 'mining')); }).map((s) => s.group))].sort();
  const group = groups.length > 0 ? groups[Math.floor(tick / 120) % groups.length]! : null;
  return {
    ...emptyInput(),
    aimHeading: want,
    thrustForward: d > longest * DUELLIST.preferred && err < 0.5,
    thrustReverse: d < longest * DUELLIST.tooClose,
    fireFixed: (turreted || err < DUELLIST.aimTolerance) && d < Math.max(longest, ...guns.map((x) => x.range)) * 0.95,
    lock: tick === 0 ? foe : null,
    activateLock: tick === 0 ? foe : null,
    selectGroup: group !== null && group !== mine.fireGroup ? group : null,
  };
}
