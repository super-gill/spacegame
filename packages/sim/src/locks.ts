import { LOCK_BASE_SECONDS, LOCK_REFERENCE_SIGNATURE } from './constants.js';
import { shipStats } from './stats.js';
import type { LockLossReason, LockRefusal, Ship, ShipInput, ShipStats, TargetLock, WeaponState, World, WorldEvent } from './types.js';
import { distance } from './vec2.js';

/**
 * Target locks, in the spirit of EVE.
 *
 * - Locks come from the targeting computer: it sets how many a ship can
 *   hold (`maxLocks`) and how fast it locks (`scanResolution`). No
 *   computer, no locks.
 * - Locking takes time: `lockSeconds`, shorter with a better computer
 *   and against a target with a bigger signature (`HullSpec.signature`).
 * - A lock needs its target inside this ship's radar range: no radar,
 *   nothing to lock. It drops
 *   when the target leaves range, docks or is destroyed; every lock drops
 *   when this ship docks.
 * - One lock is active. Turrets engage the active lock, once complete,
 *   while weapons are hot. A weapon may name another lock in
 *   `WeaponState.lockTarget` (assigned from 6e); fixed guns stay on the
 *   nose and need no lock.
 *
 * Like everything else, locks change only through `ShipInput`: `lock`,
 * `unlock` and `activateLock`. NPCs lock the same way, and take as long.
 */

/**
 * Seconds for a ship with these stats to lock a target of signature
 * `targetSignature`. Infinite with no targeting computer.
 */
export function lockSeconds(stats: Pick<ShipStats, 'scanResolution'>, targetSignature: number): number {
  if (stats.scanResolution <= 0) return Infinity;
  const signature = Math.max(targetSignature, 1);
  return (LOCK_BASE_SECONDS / stats.scanResolution) * Math.sqrt(LOCK_REFERENCE_SIGNATURE / signature);
}

/** True if the ship holds a complete lock on `targetId`. */
export function isLocked(ship: Ship, targetId: string): boolean {
  return ship.locks.some((l) => l.targetId === targetId && l.progress >= 1);
}

/** Why `ship` could not start locking `targetId` right now, or null if it could. */
export function lockRefusal(world: Pick<World, 'ships' | 'hulls' | 'modules' | 'weapons' | 'goods'>, ship: Ship, targetId: string): LockRefusal | null {
  if (ship.state !== 'flying') return 'docked';
  const target = world.ships[targetId];
  if (!target || target.id === ship.id || target.state !== 'flying') return 'invalid';
  if (ship.locks.some((l) => l.targetId === targetId)) return 'already';
  const stats = shipStats(world, ship);
  if (stats.maxLocks <= 0) return 'noComputer';
  if (ship.locks.length >= stats.maxLocks) return 'maxLocks';
  if (distance(ship.position, target.position) > stats.sensorRange) return 'outOfRange';
  return null;
}

/** Why an existing lock must go now, or null if it holds. */
function lossReason(world: Pick<World, 'ships'>, ship: Ship, stats: ShipStats, lock: TargetLock): LockLossReason | null {
  if (ship.state !== 'flying') return 'docked';
  const target = world.ships[lock.targetId];
  if (!target || target.state !== 'flying') return 'targetGone';
  if (distance(ship.position, target.position) > stats.sensorRange) return 'outOfRange';
  return null;
}

export interface LockStep {
  ship: Ship;
  events: WorldEvent[];
}

/**
 * Apply this tick's lock inputs, advance locks in progress and drop
 * those that no longer hold. `world` gives the targets; `ship` is this
 * ship as it is after moving this tick. Order: unlock, then lock, then
 * activate, so a click can lock and activate in one tick.
 */
export function stepLocks(
  world: Pick<World, 'ships' | 'hulls' | 'modules' | 'weapons' | 'goods' | 'dt'>,
  ship: Ship,
  stats: ShipStats,
  input: Pick<ShipInput, 'lock' | 'unlock' | 'activateLock'>,
): LockStep {
  const events: WorldEvent[] = [];
  let locks = ship.locks;
  let active = ship.activeLock;

  if (input.unlock && locks.some((l) => l.targetId === input.unlock)) {
    locks = locks.filter((l) => l.targetId !== input.unlock);
    events.push({ type: 'lockLost', shipId: ship.id, targetId: input.unlock, reason: 'unlocked' });
  }

  if (input.lock) {
    const reason = lockRefusal(world, { ...ship, locks }, input.lock);
    if (reason) {
      events.push({ type: 'lockRefused', shipId: ship.id, targetId: input.lock, reason });
    } else {
      locks = [...locks, { targetId: input.lock, progress: 0 }];
      events.push({ type: 'lockStarted', shipId: ship.id, targetId: input.lock });
    }
  }

  // Advance and validate.
  const kept: TargetLock[] = [];
  for (const lock of locks) {
    const loss = lossReason(world, ship, stats, lock);
    if (loss) {
      events.push({ type: 'lockLost', shipId: ship.id, targetId: lock.targetId, reason: loss });
      continue;
    }
    if (lock.progress >= 1) {
      kept.push(lock);
      continue;
    }
    const target = world.ships[lock.targetId]!;
    const signature = world.hulls[target.hullId]?.signature ?? LOCK_REFERENCE_SIGNATURE;
    const progress = Math.min(1, lock.progress + world.dt / lockSeconds(stats, signature));
    if (progress >= 1) events.push({ type: 'locked', shipId: ship.id, targetId: lock.targetId });
    kept.push({ ...lock, progress });
  }
  locks = kept;

  if (input.activateLock && locks.some((l) => l.targetId === input.activateLock)) active = input.activateLock;
  if (active && !locks.some((l) => l.targetId === active)) active = null;
  if (!active && locks.length > 0) active = locks[0]!.targetId;

  if (locks === ship.locks && active === ship.activeLock) return { ship, events };
  return { ship: { ...ship, locks, activeLock: active }, events };
}

/** The ship a weapon on `ship` engages: its assigned lock if complete, else the active lock if complete, else none. */
export function weaponTarget(world: Pick<World, 'ships'>, ship: Ship, weapon: Pick<WeaponState, 'lockTarget'>): Ship | null {
  const pick = weapon.lockTarget && isLocked(ship, weapon.lockTarget) ? weapon.lockTarget : ship.activeLock;
  if (!pick || !isLocked(ship, pick)) return null;
  const target = world.ships[pick];
  return target && target.state === 'flying' ? target : null;
}

/** The ship of the complete active lock, or null. */
export function activeTarget(world: Pick<World, 'ships'>, ship: Ship): Ship | null {
  return weaponTarget(world, ship, {});
}
