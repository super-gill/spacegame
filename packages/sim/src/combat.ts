import { angleDelta, wrapAngle } from './angle.js';
import { SHIELD_CAPACITOR_PER_POINT, TURRET_FIRE_TOLERANCE } from './constants.js';
import type { DamageCause, DamageType, HullSpec, MountPoint, Projectile, Ship, ShipInput, ShipStats, Station, WeaponState, World, WorldEvent } from './types.js';
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
  /** What the damage is done as. Impacts are kinetic. */
  type: DamageType;
}

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export interface FireResult {
  ship: Ship;
  projectiles: Projectile[];
  /** Ids used, so the caller can advance the world's id counter. */
  idsUsed: number;
  events: WorldEvent[];
}

/** The hull-space bearing of a world bearing, for arc checks. */
function relativeBearing(ship: Ship, worldBearing: number): number {
  return angleDelta(ship.heading, worldBearing);
}

/** True if a turret on `mount` can point along `worldBearing`. */
export function withinArc(ship: Ship, mount: MountPoint, worldBearing: number): boolean {
  if (mount.arc === undefined || mount.arc >= Math.PI * 2 - 1e-9) return true;
  const off = angleDelta(mount.facing, relativeBearing(ship, worldBearing));
  return Math.abs(off) <= mount.arc / 2;
}

/**
 * Turn turrets, count down cooldowns and reloads, and fire.
 *
 * - Fixed weapons fire along the heading when the input asks, if they are
 *   in the selected fire group.
 * - Turrets (swivels), while weapons are hot and have a locked target
 *   (`targetFor` gives each weapon's: its assigned lock or the active
 *   one), slew towards the point their shots need to lead to, no faster
 *   than their turn rate and never outside their mount's arc, and fire
 *   by themselves once within TURRET_FIRE_TOLERANCE of it and in range.
 *   A fast target crossing close by can outrun the slew: that is turret
 *   tracking.
 * - Every shot costs what its family costs (docs/weapons.md): capacitor
 *   per shot for energy and hybrid guns, a round from the magazine for
 *   ammunition-fed guns. An empty magazine reloads from the hold over
 *   `reloadSeconds`; with no rounds in the hold the gun is dry.
 *
 * Each weapon fires as its mount's effective spec in `stats.weapons`, so
 * hull damage bonuses apply. New projectiles start at the hull edge along
 * the weapon's bearing, carrying the round's damage type.
 */
export function fireWeapons(
  ship: Ship,
  stats: ShipStats,
  input: ShipInput,
  targetFor: (weapon: WeaponState) => Ship | null,
  dt: number,
  nextId: number,
  world: Pick<World, 'goods' | 'hulls'> = { goods: {}, hulls: {} },
): FireResult {
  if (ship.state !== 'flying') return { ship, projectiles: [], idsUsed: 0, events: [] };

  const projectiles: Projectile[] = [];
  const events: WorldEvent[] = [];
  let idsUsed = 0;
  let capacitor = ship.capacitor;
  let hold = ship.hold;
  let capacitorWarned = false;
  const mounts = world.hulls[ship.hullId]?.mounts ?? [];

  const weapons = ship.weapons.map((w) => {
    const spec = stats.weapons[w.mountId];
    if (!spec) return w;
    const mount = mounts.find((m) => m.id === w.mountId);

    let aim = ship.heading;
    let turretReady = false;
    if (spec.kind === 'turret') {
      aim = w.aim;
      const target = ship.weaponsHot ? targetFor(w) : null;
      if (target) {
        const wanted = toAngle(sub(leadPoint(ship, target, spec.projectileSpeed), ship.position));
        const canReach = !mount || withinArc(ship, mount, wanted);
        if (canReach) {
          const step = spec.turretTurnRate * dt;
          aim = wrapAngle(aim + Math.max(-step, Math.min(step, angleDelta(aim, wanted))));
          const onTarget = Math.abs(angleDelta(aim, wanted)) <= TURRET_FIRE_TOLERANCE;
          turretReady = onTarget && distance(ship.position, target.position) <= spec.range;
        }
      }
    }

    // Reloading: a magazine empties, then refills from the hold over time.
    let loaded = w.loaded;
    let reloadTicks = w.reloadTicks;
    if (spec.ammo) {
      if (reloadTicks > 0) {
        reloadTicks--;
        if (reloadTicks === 0) {
          // Load whole boxes, as many as fit the magazine (at least one).
          const perBox = world.goods[spec.ammo]?.ammo?.perUnit ?? 1;
          const boxes = Math.max(1, Math.min(hold[spec.ammo] ?? 0, Math.floor(spec.magazine / perBox)));
          const have = hold[spec.ammo] ?? 0;
          const taken = Math.min(boxes, have);
          loaded = taken * perBox;
          const left = have - taken;
          if (left > 0) hold = { ...hold, [spec.ammo]: left };
          else {
            const { [spec.ammo]: _gone, ...rest } = hold;
            hold = rest;
          }
        }
      } else if (loaded === 0 && (hold[spec.ammo] ?? 0) > 0) {
        reloadTicks = Math.max(1, Math.round(spec.reloadSeconds / dt));
      }
    }

    let cooldownTicks = Math.max(0, w.cooldownTicks - 1);
    const inGroup = spec.kind !== 'fixed' || w.group === ship.fireGroup;
    const trigger = (spec.kind === 'fixed' ? input.fireFixed && inGroup : turretReady) && cooldownTicks === 0;
    if (trigger) {
      // Can it pay for the shot?
      if (spec.capacitorPerShot > 0 && capacitor < spec.capacitorPerShot) {
        if (!capacitorWarned) events.push({ type: 'capacitorEmpty', shipId: ship.id });
        capacitorWarned = true;
        return { ...w, aim, cooldownTicks, loaded, reloadTicks };
      }
      if (spec.ammo && loaded === 0) {
        if (reloadTicks === 0) events.push({ type: 'outOfAmmo', shipId: ship.id, mountId: w.mountId });
        return { ...w, aim, cooldownTicks, loaded, reloadTicks };
      }
      capacitor -= spec.capacitorPerShot;
      const round = spec.ammo ? world.goods[spec.ammo]?.ammo : undefined;
      if (spec.ammo) loaded--;
      const dir = fromAngle(aim);
      projectiles.push({
        id: `p${nextId + idsUsed}`,
        ownerShipId: ship.id,
        position: add(ship.position, scale(dir, stats.radius + 2)),
        velocity: add(ship.velocity, scale(dir, spec.projectileSpeed)),
        damage: spec.damage * (round?.damage ?? 1),
        damageType: round?.damageType ?? spec.damageType,
        ticksLeft: Math.round(spec.range / spec.projectileSpeed / dt),
      });
      idsUsed++;
      cooldownTicks = Math.round(spec.fireInterval / dt);
    }
    return { ...w, aim, cooldownTicks, loaded, reloadTicks };
  });

  return { ship: { ...ship, weapons, capacitor, hold }, projectiles, idsUsed, events };
}

/**
 * The capacitor refills from the reactor each tick, fastest when it is
 * low (as in EVE: peak rate at about a quarter full, slowing towards
 * full), less the steady drain of full-size active sensors.
 */
export function rechargeCapacitor(ship: Ship, stats: ShipStats, dt: number): Ship {
  if (stats.capacitor <= 0) return ship.capacitor === 0 ? ship : { ...ship, capacitor: 0 };
  const fraction = Math.max(0, Math.min(1, ship.capacitor / stats.capacitor));
  // EVE's curve: rate = peak * (sqrt(f) - f) * 2 ... normalised so the peak is `capacitorRecharge`.
  const shape = Math.sqrt(fraction) - fraction;
  const rate = stats.capacitorRecharge * shape * 4 + (fraction < 0.02 ? stats.capacitorRecharge * 0.5 : 0);
  const next = Math.max(0, Math.min(stats.capacitor, ship.capacitor + (rate - stats.capacitorDraw) * dt));
  return next === ship.capacitor ? ship : { ...ship, capacitor: next };
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
  gravityAt?: (point: Vec2) => Vec2,
): ProjectileStep {
  const survivors: Projectile[] = [];
  const damage: Damage[] = [];
  const targets = Object.values(ships).filter((s) => s.state === 'flying');

  for (const p of projectiles) {
    // A shot inside a body's sphere is carried with the body like anything else.
    // Gravity bends it, velocity first, as for ships.
    const carry = carryAt?.(p.position);
    const g = gravityAt?.(p.position);
    const v = g ? add(p.velocity, scale(g, dt)) : p.velocity;
    const travel = carry ? add(scale(v, dt), carry.dx) : scale(v, dt);
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
      damage.push({ shipId: hitShip.id, amount: p.damage, by: p.ownerShipId, cause: 'weapon', type: p.damageType });
      continue;
    }
    if (blocked || p.ticksLeft <= 1) continue;
    const velocity = carry ? add(v, carry.dv) : v;
    survivors.push({ ...p, position: add(p.position, travel), velocity, ticksLeft: p.ticksLeft - 1 });
  }
  return { projectiles: survivors, damage };
}


/** What a hit of `amount` of `type` does to a ship: shields first through shield resistances, then structure through armour's. */
export function applyDamage(ship: Ship, stats: ShipStats, amount: number, dt: number, type: DamageType = 'kinetic'): Ship {
  const shieldHit = amount * (1 - (stats.shieldResists[type] ?? 0));
  const toShield = Math.min(ship.shield, shieldHit);
  // Whatever the shield did not stop goes on, in raw terms, to the hull.
  const through = shieldHit > 0 ? amount * (1 - toShield / shieldHit) : amount;
  const toStructure = through * (1 - (stats.armourResists[type] ?? 0));
  return {
    ...ship,
    shield: ship.shield - toShield,
    structure: Math.max(0, ship.structure - toStructure),
    shieldDelayTicks: Math.round(stats.shieldRegenDelay / dt),
  };
}

/**
 * Count down the recharge delay, then recharge shields towards full,
 * drawing SHIELD_CAPACITOR_PER_POINT from the capacitor for every point
 * restored. With the capacitor empty, shields stay down.
 */
export function regenerateShield(ship: Ship, stats: ShipStats, dt: number): Ship {
  if (ship.shieldDelayTicks > 0) return { ...ship, shieldDelayTicks: ship.shieldDelayTicks - 1 };
  if (ship.shield >= stats.shield) return ship;
  const wanted = Math.min(stats.shield - ship.shield, stats.shieldRegen * dt);
  const affordable = stats.capacitor > 0 ? Math.min(wanted, ship.capacitor / SHIELD_CAPACITOR_PER_POINT) : wanted;
  if (affordable <= 0) return ship;
  const cost = stats.capacitor > 0 ? affordable * SHIELD_CAPACITOR_PER_POINT : 0;
  return { ...ship, shield: ship.shield + affordable, capacitor: ship.capacitor - cost };
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

