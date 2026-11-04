import { angleDelta } from '../angle.js';
import { leadPoint } from '../combat.js';
import { isEmptyShip, isEscapePod } from '../ownership.js';
import type { ShipStats, PirateBrain, PirateMode, Ship, ShipInput, World, WorldEvent } from '../types.js';
import { add, distance, fromAngle, normalise, scale, sub, toAngle, type Vec2 } from '../vec2.js';
import { arriveVelocity, routeAround, steerToVelocity } from './steer.js';

/**
 * Pirate: patrols near a home point and hunts lone ships.
 *
 * - prowl: fly a slow loop round home. When not cooling down, pick the
 *   nearest flying ship in detection range that is outside every
 *   station's security zone, and start hunting it.
 * - hunt: close in and hold station a short way off the target, nose on
 *   the point its shots need to lead to, and fire its fixed guns when the
 *   nose is on that point and the target is in range. Give up if the
 *   target docks, reaches station security, gets too far away, the hunt
 *   runs too long, or the pirate's own structure gets low.
 * - withdraw: go home, then prowl again after a cooldown.
 *
 * A pirate that is shot or rammed remembers who did it and turns on them
 * (outside security), even while cooling down.
 *
 * Pirates stay out of station security zones: they treat each zone as
 * `zoneCaution` bigger than it is and break off before reaching it. If
 * one does end up inside, it withdraws.
 */

export const PIRATE_TUNING = {
  /** Distance at which a pirate notices a ship, units. */
  detectRange: 1400,
  /** A hunt is abandoned if the target gets this far away, units. */
  loseRange: 2200,
  /** Distance the pirate holds off its target while hunting, units. */
  standoff: 160,
  /** Longest hunt before giving up, seconds. */
  maxHuntSeconds: 45,
  /** Wait after a hunt ends before hunting again, seconds. */
  cooldownSeconds: 20,
  /** Radius of the patrol loop round home, units. */
  patrolRadius: 400,
  /** Number of points in the patrol loop. */
  patrolPoints: 6,
  /** Patrol speed as a fraction of top speed. */
  prowlFraction: 0.35,
  /** Distance from home at which a withdrawal counts as complete, units. */
  homeArrival: 150,
  /**
   * Pirates treat security zones as this much bigger than they are, units.
   * They will not start or continue a hunt that close to a zone, so they
   * brake and turn away before crossing its edge.
   */
  zoneCaution: 300,
  /** Fire when the nose is within this angle of the lead point, radians. About 3 degrees. */
  aimTolerance: 0.05,
  /** Fire only when the target is within this fraction of weapon range. */
  rangeFraction: 0.9,
  /**
   * Whether pirates hunt escape pods. Off by Jason's call (4 November
   * 2026): a pod has no cargo, so hunting one is not piracy. Threats to
   * pods are worked out later.
   */
  huntPods: false as boolean,
  /** Break off when structure falls below this fraction of the hull's maximum. */
  fleeStructureFraction: 0.25,
  /**
   * Only start a hunt with at least this fraction of structure. A pirate
   * below it that is home leaves the sector to repair, and its spawner
   * sends a fresh one later.
   */
  engageStructureFraction: 0.6,
  /** Distance from a patrol point at which the next one is chosen, units. */
  patrolPointReached: 120,
};

export interface PirateThought {
  input: ShipInput;
  brain: PirateBrain;
  events: WorldEvent[];
  /** True when the pirate leaves the sector this tick. */
  depart?: boolean;
}

/** True if the point is inside any station's security zone, optionally widened by `margin`. */
export function inSecurityZone(world: World, point: Vec2, margin = 0): boolean {
  return Object.values(world.stations).some((s) => distance(point, s.position) < s.securityRadius + margin);
}

function switchMode(brain: PirateBrain, mode: PirateMode, extra: Partial<PirateBrain> = {}): PirateBrain {
  return { ...brain, mode, modeTicks: 0, ...extra };
}

/**
 * Pirates hunt people, not property: a ship nobody is flying is left
 * alone (it can still be shot if it gets in the way). Escape pods are
 * hunted only if `PIRATE_TUNING.huntPods` says so.
 */
function worthHunting(world: World, ship: Ship): boolean {
  if (isEmptyShip(world, ship)) return false;
  return PIRATE_TUNING.huntPods || !isEscapePod(world, ship);
}

/** Nearest ship worth hunting, or null. Ties break on id so the choice is deterministic. */
function findTarget(world: World, self: Ship): Ship | null {
  let best: Ship | null = null;
  let bestDist = Infinity;
  for (const other of Object.values(world.ships)) {
    if (other.id === self.id || other.state !== 'flying') continue;
    if (world.npcs[other.id]?.kind === 'pirate') continue;
    if (!worthHunting(world, other)) continue;
    if (inSecurityZone(world, other.position, PIRATE_TUNING.zoneCaution)) continue;
    const d = distance(self.position, other.position);
    if (d > PIRATE_TUNING.detectRange) continue;
    if (d < bestDist || (d === bestDist && best && other.id < best.id)) {
      best = other;
      bestDist = d;
    }
  }
  return best;
}

/** True if a ship is a fair target to start or keep hunting. */
function huntable(world: World, self: Ship, target: Ship | undefined): target is Ship {
  if (!target || target.state !== 'flying' || target.id === self.id) return false;
  if (!worthHunting(world, target)) return false;
  if (inSecurityZone(world, target.position, PIRATE_TUNING.zoneCaution)) return false;
  return distance(self.position, target.position) <= PIRATE_TUNING.loseRange;
}

/** Why a hunt should stop, or null to carry on. */
function huntOver(world: World, self: Ship, stats: ShipStats, target: Ship | undefined, brain: PirateBrain): boolean {
  if (self.structure < stats.structure * PIRATE_TUNING.fleeStructureFraction) return true;
  if (!target || target.state !== 'flying') return true;
  if (!worthHunting(world, target)) return true;
  if (inSecurityZone(world, target.position, PIRATE_TUNING.zoneCaution)) return true;
  if (distance(self.position, target.position) > PIRATE_TUNING.loseRange) return true;
  return brain.modeTicks * world.dt > PIRATE_TUNING.maxHuntSeconds;
}

export function thinkPirate(world: World, ship: Ship, stats: ShipStats, brain: PirateBrain): PirateThought {
  const events: WorldEvent[] = [];
  let b: PirateBrain = {
    ...brain,
    modeTicks: brain.modeTicks + 1,
    cooldownTicks: Math.max(0, brain.cooldownTicks - 1),
  };

  // Never linger inside station security.
  if (b.mode !== 'withdraw' && inSecurityZone(world, ship.position)) {
    if (b.mode === 'hunt' && b.targetId) events.push({ type: 'huntEnded', shipId: b.targetId, pirateId: ship.id });
    b = switchMode(b, 'withdraw', { targetId: null });
  }

  if (b.mode === 'hunt') {
    const target = b.targetId ? world.ships[b.targetId] : undefined;
    if (huntOver(world, ship, stats, target, b)) {
      if (b.targetId) events.push({ type: 'huntEnded', shipId: b.targetId, pirateId: ship.id });
      const cooldownTicks = Math.round(PIRATE_TUNING.cooldownSeconds / world.dt);
      b = switchMode(b, 'withdraw', { targetId: null, cooldownTicks });
    } else {
      // Hold a point between pirate and target, `standoff` short of the target,
      // and match the target's velocity on top.
      const t = target!;
      const back = normalise(sub(ship.position, t.position));
      const holdPoint = add(t.position, scale(back, PIRATE_TUNING.standoff));
      const closing = arriveVelocity(ship, stats, holdPoint, stats.maxSpeed);
      const desired = add(t.velocity, closing);

      // Point the nose where the shots need to go, and fire when it is there.
      const gun = Object.values(stats.weapons).find((w) => w.kind === 'fixed');
      const aimPoint = gun ? leadPoint(ship, t, gun.projectileSpeed) : t.position;
      const input = steerToVelocity(ship, stats, desired, aimPoint);
      if (gun) {
        const aimError = Math.abs(angleDelta(ship.heading, toAngle(sub(aimPoint, ship.position))));
        const inRange = distance(ship.position, t.position) <= gun.range * PIRATE_TUNING.rangeFraction;
        input.fireFixed = aimError <= PIRATE_TUNING.aimTolerance && inRange;
      }
      return { input, brain: b, events };
    }
  }

  const fitToFight = ship.structure >= stats.structure * PIRATE_TUNING.engageStructureFraction;

  // Retaliate against whoever attacked us, cooldown or not, unless badly hurt.
  if (b.provokedBy) {
    const attacker = world.ships[b.provokedBy];
    const strongEnough = ship.structure >= stats.structure * PIRATE_TUNING.fleeStructureFraction;
    if (strongEnough && huntable(world, ship, attacker)) {
      events.push({ type: 'huntStarted', shipId: attacker.id, pirateId: ship.id });
      b = switchMode(b, 'hunt', { targetId: attacker.id, provokedBy: null });
      return { input: steerToVelocity(ship, stats, attacker.velocity, attacker.position), brain: b, events };
    }
    b = { ...b, provokedBy: null };
  }

  if (b.mode === 'withdraw') {
    if (distance(ship.position, b.home) < PIRATE_TUNING.homeArrival) {
      b = switchMode(b, 'prowl');
    } else {
      const waypoint = routeAround(ship, stats, b.home, world.stations);
      const desired = arriveVelocity(ship, stats, waypoint, stats.maxSpeed * 0.7);
      return { input: steerToVelocity(ship, stats, desired), brain: b, events };
    }
  }

  // Prowl. Too damaged to hunt and home: leave the sector to repair.
  if (!fitToFight && distance(ship.position, b.home) < PIRATE_TUNING.homeArrival) {
    return { input: steerToVelocity(ship, stats, { x: 0, y: 0 }), brain: b, events, depart: true };
  }
  if (!fitToFight) {
    const desired = arriveVelocity(ship, stats, routeAround(ship, stats, b.home, world.stations), stats.maxSpeed * 0.7);
    return { input: steerToVelocity(ship, stats, desired), brain: b, events };
  }
  if (b.cooldownTicks === 0) {
    const target = findTarget(world, ship);
    if (target) {
      events.push({ type: 'huntStarted', shipId: target.id, pirateId: ship.id });
      b = switchMode(b, 'hunt', { targetId: target.id });
      return { input: steerToVelocity(ship, stats, target.velocity, target.position), brain: b, events };
    }
  }

  const angle = (b.patrolIndex / PIRATE_TUNING.patrolPoints) * Math.PI * 2;
  const patrolPoint = add(b.home, scale(fromAngle(angle), PIRATE_TUNING.patrolRadius));
  if (distance(ship.position, patrolPoint) < PIRATE_TUNING.patrolPointReached) {
    b = { ...b, patrolIndex: (b.patrolIndex + 1) % PIRATE_TUNING.patrolPoints };
  }
  const desired = arriveVelocity(ship, stats, patrolPoint, stats.maxSpeed * PIRATE_TUNING.prowlFraction);
  return { input: steerToVelocity(ship, stats, desired), brain: b, events };
}
