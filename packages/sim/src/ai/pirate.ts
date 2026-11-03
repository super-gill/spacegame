import type { HullSpec, PirateBrain, PirateMode, Ship, ShipInput, World, WorldEvent } from '../types.js';
import { add, distance, fromAngle, normalise, scale, sub, type Vec2 } from '../vec2.js';
import { arriveVelocity, routeAround, steerToVelocity } from './steer.js';

/**
 * Pirate: patrols near a home point and hunts lone ships.
 *
 * - prowl: fly a slow loop round home. When not cooling down, pick the
 *   nearest flying ship in detection range that is outside every
 *   station's security zone, and start hunting it.
 * - hunt: close in and hold station a short way off the target, nose on
 *   it. With no weapons yet (milestone 3) this is the whole threat: a
 *   pirate sitting on your tail. Give up if the target docks, reaches
 *   station security, gets too far away, or the hunt runs too long.
 * - withdraw: go home, then prowl again after a cooldown.
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
  /** Distance from a patrol point at which the next one is chosen, units. */
  patrolPointReached: 120,
};

export interface PirateThought {
  input: ShipInput;
  brain: PirateBrain;
  events: WorldEvent[];
}

/** True if the point is inside any station's security zone, optionally widened by `margin`. */
export function inSecurityZone(world: World, point: Vec2, margin = 0): boolean {
  return Object.values(world.stations).some((s) => distance(point, s.position) < s.securityRadius + margin);
}

function switchMode(brain: PirateBrain, mode: PirateMode, extra: Partial<PirateBrain> = {}): PirateBrain {
  return { ...brain, mode, modeTicks: 0, ...extra };
}

/** Nearest ship worth hunting, or null. Ties break on id so the choice is deterministic. */
function findTarget(world: World, self: Ship): Ship | null {
  let best: Ship | null = null;
  let bestDist = Infinity;
  for (const other of Object.values(world.ships)) {
    if (other.id === self.id || other.state !== 'flying') continue;
    if (world.npcs[other.id]?.kind === 'pirate') continue;
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

/** Why a hunt should stop, or null to carry on. */
function huntOver(world: World, self: Ship, target: Ship | undefined, brain: PirateBrain): boolean {
  if (!target || target.state !== 'flying') return true;
  if (inSecurityZone(world, target.position, PIRATE_TUNING.zoneCaution)) return true;
  if (distance(self.position, target.position) > PIRATE_TUNING.loseRange) return true;
  return brain.modeTicks * world.dt > PIRATE_TUNING.maxHuntSeconds;
}

export function thinkPirate(world: World, ship: Ship, hull: HullSpec, brain: PirateBrain): PirateThought {
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
    if (huntOver(world, ship, target, b)) {
      if (b.targetId) events.push({ type: 'huntEnded', shipId: b.targetId, pirateId: ship.id });
      const cooldownTicks = Math.round(PIRATE_TUNING.cooldownSeconds / world.dt);
      b = switchMode(b, 'withdraw', { targetId: null, cooldownTicks });
    } else {
      // Hold a point between pirate and target, `standoff` short of the target,
      // and match the target's velocity on top.
      const t = target!;
      const back = normalise(sub(ship.position, t.position));
      const holdPoint = add(t.position, scale(back, PIRATE_TUNING.standoff));
      const closing = arriveVelocity(ship, hull, holdPoint, hull.maxSpeed);
      const desired = add(t.velocity, closing);
      return { input: steerToVelocity(ship, hull, desired, t.position), brain: b, events };
    }
  }

  if (b.mode === 'withdraw') {
    if (distance(ship.position, b.home) < PIRATE_TUNING.homeArrival) {
      b = switchMode(b, 'prowl');
    } else {
      const waypoint = routeAround(ship, hull, b.home, world.stations);
      const desired = arriveVelocity(ship, hull, waypoint, hull.maxSpeed * 0.7);
      return { input: steerToVelocity(ship, hull, desired), brain: b, events };
    }
  }

  // Prowl.
  if (b.cooldownTicks === 0) {
    const target = findTarget(world, ship);
    if (target) {
      events.push({ type: 'huntStarted', shipId: target.id, pirateId: ship.id });
      b = switchMode(b, 'hunt', { targetId: target.id });
      return { input: steerToVelocity(ship, hull, target.velocity, target.position), brain: b, events };
    }
  }

  const angle = (b.patrolIndex / PIRATE_TUNING.patrolPoints) * Math.PI * 2;
  const patrolPoint = add(b.home, scale(fromAngle(angle), PIRATE_TUNING.patrolRadius));
  if (distance(ship.position, patrolPoint) < PIRATE_TUNING.patrolPointReached) {
    b = { ...b, patrolIndex: (b.patrolIndex + 1) % PIRATE_TUNING.patrolPoints };
  }
  const desired = arriveVelocity(ship, hull, patrolPoint, hull.maxSpeed * PIRATE_TUNING.prowlFraction);
  return { input: steerToVelocity(ship, hull, desired), brain: b, events };
}
