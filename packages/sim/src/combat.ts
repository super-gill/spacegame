import { angleDelta, wrapAngle } from './angle.js';
import { TURRET_FIRE_TOLERANCE } from './constants.js';
import type { DamageCause, HullSpec, Projectile, Ship, ShipInput, ShipStats, Station } from './types.js';
import type { Carry } from './rails.js';
import { add, distance, fromAngle, scale, sub, toAngle, type Vec2 } from './vec2.js';

/**
 * Weapons, projectiles and damage.
 *
 * Projectiles are real objects with travel time. They inherit the firing
 * ship's velocity, so shooting while drifting behaves as it should, and
 * leading a moving target matters. Hits are tested along each
 * projectile's path through the tick, so fast shots cannot skip through
 * a small hull.
 *
 * Damage goes to shields first, then structure. Shields recharge after a
 * pause with no damage; structure does not.
 */

/** A pending hit, applied after everything has moved this tick. */
export interface Damage {
  shipId: string;
  amount: number;
  by: string | null;
  cause: DamageCause;
}

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export interface FireResult {
  ship: Ship;
  projectiles: Projectile[];
  /** Ids used, so the caller can advance the world's id counter. */
  idsUsed: number;
}

/**
 * Turn turrets, count down cooldowns, and fire.
 *
 * - Fixed weapons fire along the heading when the input asks.
 * - Turrets, while weapons are hot and there is a target, slew towards
 *   the point their shots need to lead to, no faster than their turn
 *   rate, and fire by themselves once within TURRET_FIRE_TOLERANCE of it
 *   and in range. A fast target crossing close by can outrun the slew:
 *   that is turret tracking.
 *
 * Each weapon fires as its mount's effective spec in `stats.weapons`, so
 * hull damage bonuses apply. New projectiles start at the hull edge along
 * the weapon's bearing.
 */
export function fireWeapons(
  ship: Ship,
  stats: ShipStats,
  input: ShipInput,
  target: Ship | null,
  dt: number,
  nextId: number,
): FireResult {
  if (ship.state !== 'flying') return { ship, projectiles: [], idsUsed: 0 };

  const projectiles: Projectile[] = [];
  let idsUsed = 0;

  const weapons = ship.weapons.map((w) => {
    const spec = stats.weapons[w.mountId];
    if (!spec) return w;

    let aim = ship.heading;
    let turretReady = false;
    if (spec.kind === 'turret') {
      aim = w.aim;
      if (ship.weaponsHot && target) {
        const wanted = toAngle(sub(leadPoint(ship, target, spec.projectileSpeed), ship.position));
        const step = spec.turretTurnRate * dt;
        aim = wrapAngle(aim + Math.max(-step, Math.min(step, angleDelta(aim, wanted))));
        const onTarget = Math.abs(angleDelta(aim, wanted)) <= TURRET_FIRE_TOLERANCE;
        turretReady = onTarget && distance(ship.position, target.position) <= spec.range;
      }
    }

    let cooldownTicks = Math.max(0, w.cooldownTicks - 1);
    const trigger = spec.kind === 'fixed' ? input.fireFixed : turretReady;
    if (trigger && cooldownTicks === 0) {
      const dir = fromAngle(aim);
      projectiles.push({
        id: `p${nextId + idsUsed}`,
        ownerShipId: ship.id,
        position: add(ship.position, scale(dir, stats.radius + 2)),
        velocity: add(ship.velocity, scale(dir, spec.projectileSpeed)),
        damage: spec.damage,
        ticksLeft: Math.round(spec.range / spec.projectileSpeed / dt),
      });
      idsUsed++;
      cooldownTicks = Math.round(spec.fireInterval / dt);
    }
    return { ...w, aim, cooldownTicks };
  });

  return { ship: { ...ship, weapons }, projectiles, idsUsed };
}

/**
 * Distance along a segment from `start` (direction `dir`, length `len`)
 * at which it first enters a circle, or null if it misses.
 */
function segmentHitsCircle(start: Vec2, dir: Vec2, len: number, centre: Vec2, radius: number): number | null {
  const toCentre = sub(centre, start);
  const along = dot(toCentre, dir);
  const perpSq = dot(toCentre, toCentre) - along * along;
  const rSq = radius * radius;
  if (perpSq > rSq) return null;
  const entry = along - Math.sqrt(rSq - perpSq);
  if (entry > len || along + Math.sqrt(rSq - perpSq) < 0) return null;
  return Math.max(0, entry);
}

export interface ProjectileStep {
  projectiles: Projectile[];
  damage: Damage[];
}

/**
 * Move every projectile one tick. A projectile that meets a ship hull
 * hits the first one along its path; one that meets a station is
 * absorbed; one that runs out of range fizzles.
 */
export function stepProjectiles(
  projectiles: readonly Projectile[],
  ships: Record<string, Ship>,
  hulls: Record<string, HullSpec>,
  stations: Record<string, Station>,
  dt: number,
  carryAt?: (point: Vec2) => Carry,
): ProjectileStep {
  const survivors: Projectile[] = [];
  const damage: Damage[] = [];
  const targets = Object.values(ships).filter((s) => s.state === 'flying');

  for (const p of projectiles) {
    // A shot inside a body's sphere is carried with the body like anything else.
    const carry = carryAt?.(p.position);
    const travel = carry ? add(scale(p.velocity, dt), carry.dx) : scale(p.velocity, dt);
    const len = Math.hypot(travel.x, travel.y);
    const dir = len > 0 ? scale(travel, 1 / len) : { x: 0, y: 0 };

    let nearest = Infinity;
    let hitShip: Ship | null = null;
    for (const s of targets) {
      if (s.id === p.ownerShipId) continue;
      const r = hulls[s.hullId]?.radius ?? 0;
      const at = segmentHitsCircle(p.position, dir, len, s.position, r);
      if (at !== null && at < nearest) {
        nearest = at;
        hitShip = s;
      }
    }
    let blocked = false;
    for (const st of Object.values(stations)) {
      const at = segmentHitsCircle(p.position, dir, len, st.position, st.radius);
      if (at !== null && at < nearest) {
        nearest = at;
        hitShip = null;
        blocked = true;
      }
    }

    if (hitShip) {
      damage.push({ shipId: hitShip.id, amount: p.damage, by: p.ownerShipId, cause: 'weapon' });
      continue;
    }
    if (blocked || p.ticksLeft <= 1) continue;
    const velocity = carry ? add(p.velocity, carry.dv) : p.velocity;
    survivors.push({ ...p, position: add(p.position, travel), velocity, ticksLeft: p.ticksLeft - 1 });
  }
  return { projectiles: survivors, damage };
}

/** Apply damage to shields first, then structure. Resets the shield recharge delay. */
export function applyDamage(ship: Ship, stats: ShipStats, amount: number, dt: number): Ship {
  const toShield = Math.min(ship.shield, amount);
  const toStructure = amount - toShield;
  return {
    ...ship,
    shield: ship.shield - toShield,
    structure: Math.max(0, ship.structure - toStructure),
    shieldDelayTicks: Math.round(stats.shieldRegenDelay / dt),
  };
}

/** Count down the recharge delay, then recharge shields towards full. */
export function regenerateShield(ship: Ship, stats: ShipStats, dt: number): Ship {
  if (ship.shieldDelayTicks > 0) return { ...ship, shieldDelayTicks: ship.shieldDelayTicks - 1 };
  if (ship.shield >= stats.shield) return ship;
  return { ...ship, shield: Math.min(stats.shield, ship.shield + stats.shieldRegen * dt) };
}

/** Damage from a change in velocity in an impact. Zero below the safe delta-v. */
export function impactDamage(deltaV: number, safe: number, perUnit: number): number {
  return Math.max(0, deltaV - safe) * perUnit;
}

/** Where to aim to hit a target moving at constant velocity, given projectile speed. One refinement pass. */
export function leadPoint(shooter: Ship, target: Ship, projectileSpeed: number): Vec2 {
  const relVel = sub(target.velocity, shooter.velocity);
  let t = distance(shooter.position, target.position) / projectileSpeed;
  const first = add(target.position, scale(relVel, t));
  t = distance(shooter.position, first) / projectileSpeed;
  return add(target.position, scale(relVel, t));
}

