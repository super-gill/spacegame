import { oreLeft, rockAt, rockSeam } from './asteroids.js';
import { LOCK_BASE_SECONDS, LOCK_REFERENCE_SIGNATURE } from './constants.js';
import { isEmptyShip } from './ownership.js';
import { shipStats } from './stats.js';
import { cargoUsed } from './trade.js';
import type {
  LockLossReason,
  LockRefusal,
  ModuleSize,
  ReadoutKind,
  Ship,
  ShipInput,
  ShipStats,
  TargetLock,
  WeaponKind,
  WeaponState,
  World,
  WorldEvent,
} from './types.js';
import { distance, length, sub, type Vec2 } from './vec2.js';
import { isGun, isMainGun, weaponDps } from './weapons.js';

/**
 * Target locks, in the spirit of EVE.
 *
 * - Locks come from the targeting computer: it sets how many a ship can
 *   hold (`maxLocks`) and how fast it locks (`scanResolution`). No
 *   computer, no locks.
 * - Locking takes time: `lockSeconds`, shorter with a better computer
 *   and against a target with a bigger signature (`ShipStats.signature`:
 *   its hull's, plus its kit's, bloomed while it burns an afterburner).
 * - A lock needs its target inside this ship's radar range: no radar,
 *   nothing to lock. It drops
 *   when the target leaves range, docks or is destroyed; every lock drops
 *   when this ship docks.
 * - One lock is active. Turrets engage the active lock, once complete,
 *   while weapons are hot. A weapon may name another lock in
 *   `WeaponState.lockTarget` (assigned from 6e); fixed guns stay on the
 *   nose and need no lock.
 *
 * - Rocks can be locked too (docs/mining.md), by their id: a lock on a
 *   rock is how a mining computer reads it. Guns and launchers never
 *   engage a rock; `weaponTarget` returns ships only.
 *
 * - A weapon assigned a target (`WeaponState.lockTarget`) drops it when
 *   the lock goes, for any reason: unlocked, out of range, or gone.
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

/** What a lock can point at: the world's ships and rocks. */
type LockWorld = Pick<World, 'ships' | 'hulls' | 'modules' | 'weapons' | 'goods' | 'asteroids' | 'bodies' | 'tick' | 'dt'>;

/** Where a lockable thing is and how big it looks to sensors, or null if `targetId` is neither a flying ship nor a rock. */
function lockable(world: LockWorld, targetId: string): { position: Vec2; signature: number } | null {
  const target = world.ships[targetId];
  if (target) return target.state === 'flying' ? { position: target.position, signature: world.hulls[target.hullId] ? shipStats(world, target).signature : LOCK_REFERENCE_SIGNATURE } : null;
  const rock = world.asteroids ? rockAt(world, targetId) : null;
  // A rock's signature is its size: big rocks lock almost at once.
  return rock ? { position: rock.position, signature: rock.rock.radius } : null;
}

/** Why `ship` could not start locking `targetId` right now, or null if it could. */
export function lockRefusal(world: LockWorld, ship: Ship, targetId: string): LockRefusal | null {
  if (ship.state !== 'flying') return 'docked';
  const target = targetId === ship.id ? null : lockable(world, targetId);
  if (!target) return 'invalid';
  if (ship.locks.some((l) => l.targetId === targetId)) return 'already';
  const stats = shipStats(world, ship);
  if (stats.maxLocks <= 0) return 'noComputer';
  if (ship.locks.length >= stats.maxLocks) return 'maxLocks';
  if (distance(ship.position, target.position) > stats.sensorRange) return 'outOfRange';
  return null;
}

/** Why an existing lock must go now, or null if it holds. */
function lossReason(world: LockWorld, ship: Ship, stats: ShipStats, lock: TargetLock): LockLossReason | null {
  if (ship.state !== 'flying') return 'docked';
  const target = lockable(world, lock.targetId);
  if (!target) return 'targetGone';
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
  world: LockWorld,
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
    const signature = lockable(world, lock.targetId)!.signature;
    const progress = Math.min(1, lock.progress + world.dt / lockSeconds(stats, signature));
    if (progress >= 1) events.push({ type: 'locked', shipId: ship.id, targetId: lock.targetId });
    kept.push({ ...lock, progress });
  }
  locks = kept;

  if (input.activateLock && locks.some((l) => l.targetId === input.activateLock)) active = input.activateLock;
  if (active && !locks.some((l) => l.targetId === active)) active = null;
  if (!active && locks.length > 0) active = locks[0]!.targetId;

  // A weapon given a target that is no longer locked, for whatever reason, lets it go too.
  let weapons = ship.weapons;
  if (ship.weapons.some((w) => w.lockTarget && !locks.some((l) => l.targetId === w.lockTarget))) {
    weapons = ship.weapons.map((w) => {
      if (!w.lockTarget || locks.some((l) => l.targetId === w.lockTarget)) return w;
      if (stats.weapons[w.mountId]?.family === 'mining') events.push({ type: 'laserAssigned', shipId: ship.id, mountId: w.mountId, rockId: null });
      return { ...w, lockTarget: null };
    });
  }
  if (locks === ship.locks && active === ship.activeLock && weapons === ship.weapons) return { ship, events };
  return { ship: { ...ship, locks, activeLock: active, weapons }, events };
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

/**
 * What a complete lock tells its holder. Each part is present only if
 * the holder's targeting computer provides that readout (`ReadoutKind`);
 * the client shows exactly this and never reads the target ship itself,
 * so what a pilot knows about a target comes from what they fitted.
 */
export interface LockReadout {
  targetId: string;
  identity?: {
    hullId: string;
    hullName: string;
    manufacturer: string;
    sizeClass: ModuleSize;
    /** Who flies it: a pilot, an NPC of this kind, or nobody. */
    flownBy: 'pilot' | 'trader' | 'pirate' | 'watch' | 'drone' | 'miner' | 'arena' | 'nobody';
    escapePod: boolean;
  };
  motion?: {
    range: number;
    /** Positive when the gap is closing, units/s. */
    closingSpeed: number;
    relativeVelocity: Vec2;
  };
  condition?: {
    shield: 'up' | 'down' | 'none';
    hull: 'sound' | 'damaged' | 'critical';
  };
  combat?: {
    shield: number;
    maxShield: number;
    structure: number;
    maxStructure: number;
    weapons: { mountId: string; name: string; kind: WeaponKind }[];
    /** Main guns' damage per second, held on target. */
    gunDps: number;
    /** Swivels' damage per second against ships. */
    pointDefenceDps: number;
  };
  cargo?: {
    hold: Record<string, number>;
    used: number;
    capacity: number;
  };
  /**
   * A locked rock, read by a mining computer: the ore it holds by good id
   * (whole units), how much in all, how hard it is (0 to 1; a laser needs
   * that strength), its size, and the world bearing of its seam from its
   * centre (a beam biting there cuts half as fast again).
   */
  composition?: {
    ores: Record<string, number>;
    total: number;
    hardness: number;
    radius: number;
    seam: number;
    /**
     * With a deep assay (the `core` readout): a gate-glass core inside, as
     * its breach points' bearings round the rock (plant charges there).
     * Null: the deep assay finds none. Absent: no deep assay.
     */
    core?: { points: number[]; glass: number; fractured?: true } | null;
    /** Exposed gate-glass: brittle, and how many seconds before it collapses. */
    fragile?: { secondsLeft: number | null };
  };
}

/** Hull above this fraction of its structure reads as sound; above CRITICAL_FRACTION, damaged. */
const SOUND_FRACTION = 0.66;
const CRITICAL_FRACTION = 0.33;

/** The readout for `ship`'s complete lock on `targetId`, or null if it holds no complete lock on it. */
export function lockReadout(world: World, ship: Ship, targetId: string): LockReadout | null {
  if (!isLocked(ship, targetId)) return null;
  const rock = world.ships[targetId] ? null : rockAt(world, targetId);
  if (rock) {
    // A rock: where it is, and with a mining computer, what it holds.
    const mine = shipStats(world, ship);
    const out: LockReadout = { targetId };
    if (mine.readouts.includes('motion')) {
      const gap = sub(rock.position, ship.position);
      const range = length(gap);
      const relativeVelocity = sub(rock.velocity, ship.velocity);
      const closingSpeed = range > 0 ? -(gap.x * relativeVelocity.x + gap.y * relativeVelocity.y) / range : 0;
      out.motion = { range, closingSpeed, relativeVelocity };
    }
    if (mine.readouts.includes('composition')) {
      out.composition = { ores: { ...rock.rock.contents }, total: oreLeft(rock.rock), hardness: rock.rock.hardness, radius: rock.rock.radius, seam: rockSeam(rock.rock.id) };
      if (mine.readouts.includes('core')) out.composition.core = rock.rock.core ? { points: [...rock.rock.core.points], glass: rock.rock.core.glass, ...(rock.rock.core.fractured ? { fractured: true as const } : {}) } : null;
      if (rock.rock.fragile) out.composition.fragile = { secondsLeft: rock.rock.expiresTick !== undefined ? Math.max(0, (rock.rock.expiresTick - world.tick) * world.dt) : null };
    }
    return out;
  }
  const target = world.ships[targetId];
  const hull = target ? world.hulls[target.hullId] : undefined;
  if (!target || !hull) return null;
  const mine = shipStats(world, ship);
  const theirs = shipStats(world, target);
  const has = (r: ReadoutKind): boolean => mine.readouts.includes(r);
  const out: LockReadout = { targetId };

  if (has('identity')) {
    const brain = world.npcs[target.id];
    const flownBy = brain ? brain.kind : isEmptyShip(world, target) ? 'nobody' : 'pilot';
    out.identity = { hullId: hull.id, hullName: hull.name, manufacturer: hull.manufacturer, sizeClass: hull.sizeClass, flownBy, escapePod: hull.escapePod === true };
  }
  if (has('motion')) {
    const gap = sub(target.position, ship.position);
    const range = length(gap);
    const relativeVelocity = sub(target.velocity, ship.velocity);
    const closingSpeed = range > 0 ? -(gap.x * relativeVelocity.x + gap.y * relativeVelocity.y) / range : 0;
    out.motion = { range, closingSpeed, relativeVelocity };
  }
  if (has('condition')) {
    const fraction = theirs.structure > 0 ? target.structure / theirs.structure : 0;
    out.condition = {
      shield: theirs.shield <= 0 ? 'none' : target.shield > 0 ? 'up' : 'down',
      hull: fraction > SOUND_FRACTION ? 'sound' : fraction > CRITICAL_FRACTION ? 'damaged' : 'critical',
    };
  }
  if (has('combat')) {
    const weapons = Object.entries(theirs.weapons).map(([mountId, w]) => ({ mountId, name: w.name, kind: w.kind }));
    const dps = (main: boolean): number => Object.values(theirs.weapons).filter((w) => isGun(w) && isMainGun(w) === main).reduce((n, w) => n + weaponDps(w), 0);
    out.combat = {
      shield: target.shield,
      maxShield: theirs.shield,
      structure: target.structure,
      maxStructure: theirs.structure,
      weapons,
      gunDps: dps(true),
      pointDefenceDps: dps(false),
    };
  }
  if (has('cargo')) {
    out.cargo = { hold: { ...target.hold }, used: cargoUsed(target), capacity: theirs.cargoCapacity };
  }
  return out;
}
