import { angleDelta, wrapAngle } from './angle.js';
import { MUNITION_HIT_MARGIN, POINT_DEFENCE_RANGE_FRACTION, SHIELD_CAPACITOR_PER_POINT, TURRET_FIRE_TOLERANCE } from './constants.js';
import { goodsFitting } from './goods.js';
import { isLocked, weaponTarget } from './locks.js';
import { dropDecoy, launchMunition, type MunitionHit } from './munitions.js';
import type {
  DamageCause,
  DamageType,
  Decoy,
  GoodSpec,
  HullSpec,
  MountPoint,
  Munition,
  Projectile,
  Ship,
  ShipInput,
  ShipStats,
  Station,
  WeaponSpec,
  WeaponState,
  World,
  WorldEvent,
} from './types.js';
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
  /** Where the hit came from (a shot's or munition's last position), for the shield arc. Absent: from everywhere, the shield takes it. */
  from?: Vec2;
}

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export interface FireResult {
  ship: Ship;
  projectiles: Projectile[];
  /** Missiles and torpedoes launched this tick. */
  munitions: Munition[];
  /** Countermeasures dropped this tick. */
  decoys: Decoy[];
  /** Mining lasers running this tick; the caller cuts the rocks they reach (mining.ts). */
  beams: BeamShot[];
  /** Ids used, so the caller can advance the world's id counter. */
  idsUsed: number;
  events: WorldEvent[];
}

/** A mining laser fired this tick, before it is known what it reaches. */
export interface BeamShot {
  shipId: string;
  mountId: string;
  origin: Vec2;
  /** World bearing, radians: along the nose. */
  bearing: number;
  range: number;
  strength: number;
  /** Ore it can free this tick, units. */
  yield: number;
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
 * The good a weapon of ammunition slot `slot` loads next: the one already
 * in its magazine while the hold has more, else the cheapest that fits.
 */
export function nextAmmo(hold: Readonly<Record<string, number>>, goods: Readonly<Record<string, GoodSpec>>, slot: string, current: string | null | undefined): string | null {
  if (current && (hold[current] ?? 0) > 0 && goods[current]?.ammo?.fits === slot) return current;
  for (const g of goodsFitting(goods, slot)) if ((hold[g.id] ?? 0) > 0) return g.id;
  return null;
}

/** The good in a weapon's magazine. Saves from before 6e part 2 name none; a plain gun's is its slot's own good. */
export function loadedGoodOf(w: WeaponState, spec: WeaponSpec, goods: Readonly<Record<string, GoodSpec>>): string | null {
  if (w.loadedGood !== undefined) return w.loadedGood;
  return spec.ammo && goods[spec.ammo] ? spec.ammo : null;
}

/** Seconds a launcher waits after refusing to fire, so a held trigger does not flood events. */
const REFUSAL_PAUSE_SECONDS = 0.5;

/**
 * Turn turrets, count down cooldowns and reloads, and fire.
 *
 * - Main guns are turrets (docs/turrets.md): each slews towards the lead
 *   on its lock (`targetFor`) at its own traverse, never outside its
 *   mount's arc, and fires when the input asks, if it is in the selected
 *   fire group, it bears and the target is in range. With no lock it
 *   settles to its mount's facing and fires straight along it.
 * - Launchers are fixed (the only fixed weapons, with dispensers and
 *   light mining lasers) and fire on the same trigger and group, but
 *   only at a complete lock (`targetFor`): the munition needs something to
 *   home on. No lock, no launch (`launchRefused`).
 * - Dispensers drop a countermeasure on `launchCountermeasure`, whatever
 *   the group.
 * - Swivels (point defence) shoot down munitions coming for this ship
 *   (`threats`) by themselves, closest first, hot or not: nobody can click
 *   a missile while flying. With none coming, or assigned to a lock
 *   (`WeaponState.lockTarget`), they engage ships as turrets always did:
 *   while weapons are hot, the weapon's lock (`targetFor`).
 * - Swivels slew towards their lead point at their turn rate times fire
 *   control's tracking, and fire by themselves once within
 *   TURRET_FIRE_TOLERANCE of it and in range.
 * - Every shot costs what its family costs (docs/weapons.md): capacitor
 *   per shot for energy and hybrid guns, a round from the magazine for
 *   ammunition-fed weapons. An empty magazine reloads whole boxes from the
 *   hold over `reloadSeconds`, keeping to the same good while there is
 *   any (`nextAmmo`); with nothing that fits in the hold the weapon is dry.
 *
 * Each weapon fires as its mount's effective spec in `stats.weapons`, so
 * hull damage bonuses apply. New shots start at the hull edge along the
 * weapon's bearing, carrying their round's damage type.
 */
export function fireWeapons(
  ship: Ship,
  stats: ShipStats,
  input: ShipInput,
  targetFor: (weapon: WeaponState) => Ship | null,
  dt: number,
  nextId: number,
  world: Pick<World, 'goods' | 'hulls'> = { goods: {}, hulls: {} },
  threats: readonly Munition[] = [],
  rockAt: (id: string) => { position: Vec2; radius: number } | null = () => null,
): FireResult {
  if (ship.state !== 'flying') return { ship, projectiles: [], munitions: [], decoys: [], beams: [], idsUsed: 0, events: [] };

  const projectiles: Projectile[] = [];
  const munitions: Munition[] = [];
  const decoys: Decoy[] = [];
  const beams: BeamShot[] = [];
  const events: WorldEvent[] = [];
  let idsUsed = 0;
  let capacitor = ship.capacitor;
  let hold = ship.hold;
  let capacitorWarned = false;
  let dropped = false;
  const mounts = world.hulls[ship.hullId]?.mounts ?? [];

  const takeFromHold = (good: string, wanted: number): number => {
    const have = hold[good] ?? 0;
    const taken = Math.min(wanted, have);
    const left = have - taken;
    if (left > 0) hold = { ...hold, [good]: left };
    else {
      const { [good]: _gone, ...rest } = hold;
      hold = rest;
    }
    return taken;
  };

  // Fire control directs the first `turretControl` swivels, in mount order;
  // the rest stay idle (docs/ship-systems.md). Turreted main guns need none.
  const directed = new Set(
    ship.weapons
      .filter((w) => stats.weapons[w.mountId]?.kind === 'turret' && stats.weapons[w.mountId]?.family === 'pointDefence')
      .map((w) => w.mountId)
      .sort()
      .slice(0, stats.turretControl),
  );

  const weapons = ship.weapons.map((w) => {
    const spec = stats.weapons[w.mountId];
    if (!spec) return w;
    const mount = mounts.find((m) => m.id === w.mountId);

    // Turrets: pick something to point at.
    let aim = ship.heading;
    let turretReady = false;
    // Mining turrets point at the rock they were assigned, and only that (docs/mining.md, "The hulk").
    let rockInReach = false;
    if (spec.kind === 'turret' && spec.family === 'mining') {
      aim = w.aim;
      const rock = w.lockTarget && isLocked(ship, w.lockTarget) ? rockAt(w.lockTarget) : null;
      if (rock) {
        const wanted = toAngle(sub(rock.position, ship.position));
        if (!mount || withinArc(ship, mount, wanted)) {
          const step = spec.turretTurnRate * dt;
          aim = wrapAngle(aim + Math.max(-step, Math.min(step, angleDelta(aim, wanted))));
          rockInReach = Math.abs(angleDelta(aim, wanted)) <= TURRET_FIRE_TOLERANCE && distance(ship.position, rock.position) - rock.radius <= spec.range;
        }
      }
    } else if (spec.kind === 'turret' && spec.family !== 'pointDefence') {
      // A main gun turret follows its lock at its own pace and fires with
      // its group when it bears (docs/turrets.md, Option A). With no lock
      // it settles back to its mount's facing and fires straight along it,
      // so a ship without a lock (or a targeting computer) can still shoot.
      aim = w.aim;
      const quarry = targetFor(w);
      const step = spec.turretTurnRate * dt;
      if (quarry) {
        const wanted = toAngle(sub(leadFor(ship.position, ship.velocity, quarry.position, quarry.velocity, spec.projectileSpeed), ship.position));
        if (!mount || withinArc(ship, mount, wanted)) {
          aim = wrapAngle(aim + Math.max(-step, Math.min(step, angleDelta(aim, wanted))));
          turretReady = Math.abs(angleDelta(aim, wanted)) <= TURRET_FIRE_TOLERANCE && distance(ship.position, quarry.position) <= spec.range;
        }
      } else {
        const boresight = wrapAngle(ship.heading + (mount?.facing ?? 0));
        aim = wrapAngle(aim + Math.max(-step, Math.min(step, angleDelta(aim, boresight))));
        turretReady = Math.abs(angleDelta(aim, boresight)) <= TURRET_FIRE_TOLERANCE;
      }
    } else if (spec.kind === 'turret' && directed.has(w.mountId)) {
      aim = w.aim;
      let quarry: { position: Vec2; velocity: Vec2 } | null = null;
      const assigned = w.lockTarget && isLocked(ship, w.lockTarget) ? targetFor(w) : null;
      if (assigned && ship.weaponsHot) quarry = assigned;
      if (!quarry && spec.family === 'pointDefence') {
        let best = Infinity;
        for (const m of threats) {
          const d = distance(ship.position, m.position);
          const bearing = toAngle(sub(m.position, ship.position));
          if (d <= spec.range * POINT_DEFENCE_RANGE_FRACTION && d < best && (!mount || withinArc(ship, mount, bearing))) {
            best = d;
            quarry = m;
          }
        }
      }
      if (!quarry && ship.weaponsHot) quarry = targetFor(w);
      if (quarry) {
        const wanted = toAngle(sub(leadFor(ship.position, ship.velocity, quarry.position, quarry.velocity, spec.projectileSpeed), ship.position));
        const canReach = !mount || withinArc(ship, mount, wanted);
        if (canReach) {
          const step = spec.turretTurnRate * Math.max(stats.turretTracking, 0) * dt;
          aim = wrapAngle(aim + Math.max(-step, Math.min(step, angleDelta(aim, wanted))));
          const onTarget = Math.abs(angleDelta(aim, wanted)) <= TURRET_FIRE_TOLERANCE;
          turretReady = onTarget && distance(ship.position, quarry.position) <= spec.range;
        }
      }
    }

    // Reloading: a magazine empties, then refills whole boxes from the hold.
    let loaded = w.loaded;
    let reloadTicks = w.reloadTicks;
    let loadedGood = spec.ammo ? loadedGoodOf(w, spec, world.goods) : null;
    if (spec.ammo) {
      if (reloadTicks > 0) {
        reloadTicks--;
        if (reloadTicks === 0) {
          const good = nextAmmo(hold, world.goods, spec.ammo, loadedGood);
          if (good) {
            const perBox = world.goods[good]?.ammo?.perUnit ?? 1;
            const boxes = Math.max(1, Math.floor(spec.magazine / perBox));
            loaded = takeFromHold(good, boxes) * perBox;
            loadedGood = good;
          }
        }
      } else if (loaded === 0 && nextAmmo(hold, world.goods, spec.ammo, loadedGood)) {
        reloadTicks = Math.max(1, Math.round(spec.reloadSeconds / dt));
      }
    }

    let cooldownTicks = Math.max(0, w.cooldownTicks - 1);
    const kept = (): WeaponState => ({ ...w, aim, cooldownTicks, loaded, reloadTicks, ...(spec.ammo ? { loadedGood } : {}) });
    const inGroup = w.group === ship.fireGroup;

    // A mining laser runs while its group fires (a turret: while it has its rock in reach), paying its capacitor by the tick.
    if (spec.family === 'mining') {
      if (spec.kind === 'turret' ? !rockInReach : !(input.fireFixed && inGroup)) return kept();
      const cost = spec.capacitorPerShot * dt;
      if (capacitor < cost) {
        if (!capacitorWarned) events.push({ type: 'capacitorEmpty', shipId: ship.id });
        capacitorWarned = true;
        return kept();
      }
      capacitor -= cost;
      beams.push({ shipId: ship.id, mountId: w.mountId, origin: ship.position, bearing: aim, range: spec.range, strength: spec.mining?.strength ?? 0, yield: spec.damage * dt });
      return kept();
    }
    const trigger =
      spec.family === 'countermeasure'
        ? (input.launchCountermeasure && !dropped) || input.toggleModule === w.mountId
        : spec.kind === 'fixed'
          ? input.fireFixed && inGroup
          : spec.family === 'pointDefence'
            ? turretReady
            : turretReady && input.fireFixed && inGroup;
    if (!trigger || cooldownTicks > 0) return kept();

    // Can it pay for the shot?
    if (spec.capacitorPerShot > 0 && capacitor < spec.capacitorPerShot) {
      if (!capacitorWarned) events.push({ type: 'capacitorEmpty', shipId: ship.id });
      capacitorWarned = true;
      return kept();
    }
    if (spec.ammo && (loaded === 0 || !loadedGood)) {
      if (reloadTicks === 0) events.push({ type: 'outOfAmmo', shipId: ship.id, mountId: w.mountId });
      return kept();
    }
    const good = loadedGood ? world.goods[loadedGood] : undefined;

    if (spec.family === 'countermeasure') {
      const decoy = good ? dropDecoy(ship, good, `d${nextId + idsUsed}`, dt) : null;
      if (!decoy) return kept();
      decoys.push(decoy);
      idsUsed++;
      dropped = true;
      loaded--;
      cooldownTicks = Math.round(spec.fireInterval / dt);
      events.push({ type: 'countermeasureLaunched', shipId: ship.id, mountId: w.mountId, goodId: good!.id });
      return kept();
    }

    if (spec.family === 'missile') {
      const target = targetFor(w);
      if (!target) {
        events.push({ type: 'launchRefused', shipId: ship.id, mountId: w.mountId, reason: 'noLock' });
        cooldownTicks = Math.round(REFUSAL_PAUSE_SECONDS / dt);
        return kept();
      }
      const munition = good ? launchMunition(ship, stats.radius, spec, good, target.id, `m${nextId + idsUsed}`, dt) : null;
      if (!munition) return kept();
      munitions.push(munition);
      idsUsed++;
      loaded--;
      cooldownTicks = Math.round(spec.fireInterval / dt);
      events.push({ type: 'munitionLaunched', shipId: ship.id, munitionId: munition.id, targetId: target.id });
      return kept();
    }

    capacitor -= spec.capacitorPerShot;
    const round = good?.ammo;
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
    return kept();
  });

  return { ship: { ...ship, weapons, capacitor, hold }, projectiles, munitions, decoys, beams, idsUsed, events };
}

/** Whether a main gun turret can fire at its lock now (docs/turrets.md), for the HUD's "bears" mark. */
export type GunBearing = 'noLock' | 'outOfArc' | 'outOfRange' | 'slewing' | 'bears';

/**
 * How the main gun on `mountId` stands against the lock it follows, by the
 * same tests `fireWeapons` makes: no complete lock, the lead point outside
 * the mount's arc, the target out of range, the turret still slewing, or
 * bearing (it fires on the trigger).
 */
export function gunBearing(world: Pick<World, 'ships' | 'hulls'>, ship: Ship, stats: ShipStats, mountId: string): GunBearing {
  const spec = stats.weapons[mountId];
  const state = ship.weapons.find((w) => w.mountId === mountId);
  if (!spec || !state) return 'noLock';
  const quarry = weaponTarget(world, ship, state);
  if (!quarry) return 'noLock';
  const mount = world.hulls[ship.hullId]?.mounts.find((m) => m.id === mountId);
  const wanted = toAngle(sub(leadFor(ship.position, ship.velocity, quarry.position, quarry.velocity, spec.projectileSpeed), ship.position));
  if (mount && !withinArc(ship, mount, wanted)) return 'outOfArc';
  if (distance(ship.position, quarry.position) > spec.range) return 'outOfRange';
  return Math.abs(angleDelta(state.aim, wanted)) <= TURRET_FIRE_TOLERANCE ? 'bears' : 'slewing';
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
export function segmentHitsCircle(start: Vec2, dir: Vec2, len: number, centre: Vec2, radius: number): number | null {
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
  /** Hits on munitions in flight, applied when they move (munitions.ts). */
  munitionHits: MunitionHit[];
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
  munitions: readonly Munition[] = [],
  munitionRadius: (m: Munition) => number = () => 2,
): ProjectileStep {
  const survivors: Projectile[] = [];
  const damage: Damage[] = [];
  const munitionHits: MunitionHit[] = [];
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
    // A munition crossing the shot's path takes it first if it is nearer.
    let hitMunition: Munition | null = null;
    for (const m of munitions) {
      if (m.ownerShipId === p.ownerShipId) continue;
      const at = segmentHitsCircle(p.position, dir, len, m.position, munitionRadius(m) + MUNITION_HIT_MARGIN);
      if (at !== null && at < nearest) {
        nearest = at;
        hitMunition = m;
        hitShip = null;
      }
    }
    let blocked = false;
    for (const st of Object.values(stations)) {
      const at = segmentHitsCircle(p.position, dir, len, st.position, st.radius);
      if (at !== null && at < nearest) {
        nearest = at;
        hitShip = null;
        hitMunition = null;
        blocked = true;
      }
    }

    if (hitMunition) {
      munitionHits.push({ munitionId: hitMunition.id, amount: p.damage, by: p.ownerShipId });
      // Light munitions die to one hit; a torpedo may take several. Either
      // way this shot is spent; a second shot this tick may hit it too.
      continue;
    }
    if (hitShip) {
      damage.push({ shipId: hitShip.id, amount: p.damage, by: p.ownerShipId, cause: 'weapon', type: p.damageType, from: p.position });
      continue;
    }
    if (blocked || p.ticksLeft <= 1) continue;
    const velocity = carry ? add(v, carry.dv) : v;
    survivors.push({ ...p, position: add(p.position, travel), velocity, ticksLeft: p.ticksLeft - 1 });
  }
  return { projectiles: survivors, damage, munitionHits };
}


/**
 * True if a hit arriving from `from` meets the shield: it covers
 * `stats.shieldArc` centred on the bow, and the stern quarter outside it
 * is open, because the main drive has to fire through it.
 */
export function shieldCovers(ship: Pick<Ship, 'position' | 'heading'>, stats: Pick<ShipStats, 'shieldArc'>, from: Vec2): boolean {
  if (stats.shieldArc >= Math.PI * 2 - 1e-9) return true;
  if (stats.shieldArc <= 0) return false;
  const bearing = angleDelta(ship.heading, toAngle(sub(from, ship.position)));
  return Math.abs(bearing) <= stats.shieldArc / 2;
}

/**
 * What a hit of `amount` of `type` does to a ship: shields first through
 * shield resistances, then structure through armour's. A hit from `from`
 * outside the shield's arc (the open stern) skips the shield.
 */
export function applyDamage(ship: Ship, stats: ShipStats, amount: number, dt: number, type: DamageType = 'kinetic', from?: Vec2): Ship {
  const covered = !from || shieldCovers(ship, stats, from);
  const shieldHit = covered ? amount * (1 - (stats.shieldResists[type] ?? 0)) : 0;
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
  return leadFor(shooter.position, shooter.velocity, target.position, target.velocity, projectileSpeed);
}

/** `leadPoint` for anything that moves: a ship, a munition. */
export function leadFor(from: Vec2, fromVelocity: Vec2, at: Vec2, atVelocity: Vec2, projectileSpeed: number): Vec2 {
  const relVel = sub(atVelocity, fromVelocity);
  let t = distance(from, at) / projectileSpeed;
  const first = add(at, scale(relVel, t));
  t = distance(from, first) / projectileSpeed;
  return add(at, scale(relVel, t));
}

