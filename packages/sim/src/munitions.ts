import { angleDelta, wrapAngle } from './angle.js';
import {
  DECOY_DROP_SPEED,
  DECOY_FUSE,
  HEAT_SEEKER_CONE,
  HEAT_SEEKER_RANGE,
  MUNITION_ACCELERATION,
  MUNITION_PROXIMITY_FUSE,
  RADAR_SPOOF_RANGE,
} from './constants.js';
import { isLocked } from './locks.js';
import { idSeed } from './random.js';
import type { Carry } from './rails.js';
import type { Decoy, GoodSpec, HullSpec, Munition, Ship, Station, WeaponSpec, WorldEvent } from './types.js';
import { add, distance, fromAngle, length, scale, sub, toAngle, type Vec2 } from './vec2.js';
import type { Damage } from './combat.js';

/**
 * Missiles, torpedoes and countermeasures (docs/weapons.md, part 2).
 *
 * A munition is launched from a launcher at a ship its launcher's owner
 * has a complete lock on. It leaves with the launching ship's velocity
 * and accelerates to its own speed relative to the local frame, so a fast
 * ship can outrun a slow torpedo and outturn a missile. It steers its nose
 * towards where its quarry will be, no faster than its turn rate.
 *
 * - Radar-homing follows the ship it was launched at for as long as the
 *   launching ship holds its lock. Lose the lock and it flies straight.
 *   A countermeasure that spoofs radar, dropped near it, may draw it: the
 *   chance is the decoy's signature against the ship's. Drawn, it chases
 *   the decoy and is spent when the decoy burns out or it reaches it.
 * - Heat-seeking is fire and forget: each tick it turns for the hottest
 *   thing in the cone ahead of its nose, a ship or a flare, whatever ship
 *   it was launched at. A fresh flare outshines a small hull; a break turn
 *   takes the ship out of the cone.
 *
 * Munitions have structure: shots that cross their path hit them (point
 * defence aims at them on purpose, combat.ts). They hit the first ship
 * along their path, or burst when they pass close to the ship they are
 * homing on.
 *
 * Everything here is deterministic: the spoof chance is a hash of the two
 * ids, not a random draw.
 */

/** A deterministic number in [0, 1) from two ids. FNV-1a. */
function chance(a: string, b: string): number {
  return idSeed(`${a}|${b}`) / 0x100000000;
}

/** How bright a decoy looks now: its full signature when fresh, fading to nothing. */
export function decoySignature(decoy: Decoy, goods: Readonly<Record<string, GoodSpec>>): number {
  const full = goods[decoy.goodId]?.decoy?.signature ?? 0;
  return decoy.lifetimeTicks > 0 ? (full * decoy.ticksLeft) / decoy.lifetimeTicks : 0;
}

/** A new munition leaving `ship` along its heading, at `targetId`, or null if the good is not a munition. */
export function launchMunition(
  ship: Ship,
  shipRadius: number,
  launcher: WeaponSpec,
  good: GoodSpec,
  targetId: string,
  id: string,
  dt: number,
): Munition | null {
  const airframe = good.munition;
  const warhead = good.ammo;
  if (!airframe || !warhead) return null;
  const dir = fromAngle(ship.heading);
  return {
    id,
    ownerShipId: ship.id,
    goodId: good.id,
    targetId,
    homingOn: targetId,
    guidance: airframe.guidance,
    position: add(ship.position, scale(dir, shipRadius + airframe.radius + 2)),
    // It leaves with the ship's velocity plus a kick, then accelerates.
    velocity: add(ship.velocity, scale(dir, airframe.speed * 0.25)),
    heading: ship.heading,
    damage: launcher.damage * warhead.damage,
    damageType: warhead.damageType ?? launcher.damageType,
    structure: airframe.structure,
    ticksLeft: Math.max(1, Math.round(airframe.lifetimeSeconds / dt)),
  };
}

/** A countermeasure dropped from `ship`: it drifts astern of the ship and burns. Null if the good is not one. */
export function dropDecoy(ship: Ship, good: GoodSpec, id: string, dt: number): Decoy | null {
  const spec = good.decoy;
  if (!spec) return null;
  const lifetimeTicks = Math.max(1, Math.round(spec.lifetimeSeconds / dt));
  return {
    id,
    ownerShipId: ship.id,
    goodId: good.id,
    spoofs: [...spec.spoofs],
    position: { ...ship.position },
    velocity: sub(ship.velocity, scale(fromAngle(ship.heading), DECOY_DROP_SPEED)),
    ticksLeft: lifetimeTicks,
    lifetimeTicks,
  };
}

/** Decoys drift, are carried like anything else, and burn out. */
export function stepDecoys(decoys: readonly Decoy[], dt: number, carryAt?: (point: Vec2) => Carry): Decoy[] {
  const out: Decoy[] = [];
  for (const d of decoys) {
    if (d.ticksLeft <= 1) continue;
    const carry = carryAt?.(d.position);
    const travel = carry ? add(scale(d.velocity, dt), carry.dx) : scale(d.velocity, dt);
    out.push({
      ...d,
      position: add(d.position, travel),
      velocity: carry ? add(d.velocity, carry.dv) : d.velocity,
      ticksLeft: d.ticksLeft - 1,
    });
  }
  return out;
}

/**
 * Countermeasures dropped this tick try to draw the radar-homing
 * munitions chasing their owner. Each munition within RADAR_SPOOF_RANGE
 * of the decoy is drawn with chance decoy signature / (decoy + ship
 * signature). Heat seekers need no help: they look for the hottest thing
 * every tick (`stepMunitions`).
 */
export function spoofRadar(
  munitions: readonly Munition[],
  fresh: readonly Decoy[],
  ships: Readonly<Record<string, Ship>>,
  hulls: Readonly<Record<string, HullSpec>>,
  goods: Readonly<Record<string, GoodSpec>>,
): { munitions: Munition[]; events: WorldEvent[] } {
  const events: WorldEvent[] = [];
  const out = munitions.map((m) => {
    if (m.guidance !== 'radar') return m;
    for (const d of fresh) {
      if (!d.spoofs.includes('radar') || m.homingOn !== d.ownerShipId) continue;
      if (distance(m.position, d.position) > RADAR_SPOOF_RANGE) continue;
      const owner = ships[d.ownerShipId];
      const shipSignature = owner ? (hulls[owner.hullId]?.signature ?? 10) : 10;
      const decoySig = goods[d.goodId]?.decoy?.signature ?? 0;
      if (chance(m.id, d.id) < decoySig / (decoySig + shipSignature)) {
        events.push({ type: 'munitionSpoofed', shipId: d.ownerShipId, munitionId: m.id, decoyId: d.id });
        return { ...m, homingOn: d.id, targetId: null };
      }
    }
    return m;
  });
  return { munitions: out, events };
}

/** Munitions coming for `shipId`: homing on it, or launched at it and not yet drawn off. */
export function incomingMunitions(munitions: readonly Munition[], shipId: string): Munition[] {
  return munitions.filter((m) => m.ownerShipId !== shipId && (m.homingOn === shipId || (m.homingOn === null && m.targetId === shipId)));
}

/** A hit on a munition from a shot, applied before it moves. */
export interface MunitionHit {
  munitionId: string;
  amount: number;
  by: string;
}

interface Quarry {
  id: string;
  position: Vec2;
  velocity: Vec2;
}

/** What a heat seeker turns for: the hottest ship or heat decoy in the cone ahead of its nose. */
function hottestAhead(
  m: Munition,
  ships: Readonly<Record<string, Ship>>,
  hulls: Readonly<Record<string, HullSpec>>,
  decoys: readonly Decoy[],
  goods: Readonly<Record<string, GoodSpec>>,
): Quarry | null {
  let best: Quarry | null = null;
  let bestHeat = 0;
  let bestDist = Infinity;
  const consider = (q: Quarry, heat: number): void => {
    const d = distance(m.position, q.position);
    if (d > HEAT_SEEKER_RANGE || heat <= 0) return;
    if (Math.abs(angleDelta(m.heading, toAngle(sub(q.position, m.position)))) > HEAT_SEEKER_CONE) return;
    if (heat > bestHeat || (heat === bestHeat && (d < bestDist || (d === bestDist && best && q.id < best.id)))) {
      best = q;
      bestHeat = heat;
      bestDist = d;
    }
  };
  for (const id of Object.keys(ships).sort()) {
    const s = ships[id]!;
    if (s.id === m.ownerShipId || s.state !== 'flying') continue;
    consider(s, hulls[s.hullId]?.signature ?? 0);
  }
  for (const d of decoys) if (d.spoofs.includes('heat')) consider(d, decoySignature(d, goods));
  return best;
}

/** Where to point to meet `q`, flying at `speed` relative to `frame`. */
function interceptPoint(m: Munition, q: Quarry, speed: number, frame: Vec2): Vec2 {
  const rel = sub(q.velocity, frame);
  let t = distance(m.position, q.position) / Math.max(speed, 1);
  const first = add(q.position, scale(rel, t));
  t = distance(m.position, first) / Math.max(speed, 1);
  return add(q.position, scale(rel, Math.min(t, 6)));
}

/** Distance along a segment at which it first enters a circle, or null. */
function segmentHitsCircle(start: Vec2, dir: Vec2, len: number, centre: Vec2, radius: number): number | null {
  const toCentre = sub(centre, start);
  const along = toCentre.x * dir.x + toCentre.y * dir.y;
  const perpSq = toCentre.x * toCentre.x + toCentre.y * toCentre.y - along * along;
  const rSq = radius * radius;
  if (perpSq > rSq) return null;
  const entry = along - Math.sqrt(rSq - perpSq);
  if (entry > len || along + Math.sqrt(rSq - perpSq) < 0) return null;
  return Math.max(0, entry);
}

export interface MunitionStep {
  munitions: Munition[];
  damage: Damage[];
  events: WorldEvent[];
}

/**
 * Move every munition one tick: take the hits shots dealt it, pick what it
 * homes on, turn, accelerate, then hit, burst, or burn out.
 *
 * `frameAt(point)` is the local frame's velocity there (rails.ts), which
 * its speed is measured against, as a ship's is.
 */
export function stepMunitions(
  munitions: readonly Munition[],
  hits: readonly MunitionHit[],
  decoys: readonly Decoy[],
  ships: Readonly<Record<string, Ship>>,
  hulls: Readonly<Record<string, HullSpec>>,
  stations: Readonly<Record<string, Station>>,
  goods: Readonly<Record<string, GoodSpec>>,
  dt: number,
  frameAt: (point: Vec2) => Vec2,
  carryAt?: (point: Vec2) => Carry,
): MunitionStep {
  const out: Munition[] = [];
  const damage: Damage[] = [];
  const events: WorldEvent[] = [];
  const decoyById = new Map(decoys.map((d) => [d.id, d]));
  const flying = Object.keys(ships)
    .sort()
    .map((id) => ships[id]!)
    .filter((s) => s.state === 'flying');

  for (const start of munitions) {
    // Shot down?
    const taken = hits.filter((h) => h.munitionId === start.id);
    const structure = start.structure - taken.reduce((n, h) => n + h.amount, 0);
    if (structure <= 0) {
      events.push({ type: 'munitionDestroyed', shipId: start.ownerShipId, munitionId: start.id, by: taken[taken.length - 1]!.by });
      continue;
    }
    let m: Munition = { ...start, structure };
    const airframe = goods[m.goodId]?.munition;
    if (!airframe) continue;

    // What is it chasing now?
    let quarry: Quarry | null = null;
    const onDecoy = m.homingOn ? decoyById.get(m.homingOn) : undefined;
    if (m.guidance === 'heat') {
      quarry = hottestAhead(m, ships, hulls, decoys, goods);
      if (quarry && quarry.id !== m.homingOn && decoyById.has(quarry.id)) {
        const owner = decoyById.get(quarry.id)!.ownerShipId;
        events.push({ type: 'munitionSpoofed', shipId: owner, munitionId: m.id, decoyId: quarry.id });
      }
      m = { ...m, homingOn: quarry?.id ?? null };
    } else if (onDecoy) {
      quarry = onDecoy;
    } else if (m.targetId === null) {
      // Drawn off and its decoy burnt out: spent, it flies on straight.
      m = { ...m, homingOn: null };
    } else {
      const owner = ships[m.ownerShipId];
      const target = ships[m.targetId];
      const held = owner && target && target.state === 'flying' && isLocked(owner, m.targetId);
      quarry = held ? target : null;
      m = { ...m, homingOn: quarry ? quarry.id : null };
    }

    // Turn and accelerate.
    const frame = frameAt(m.position);
    let heading = m.heading;
    if (quarry) {
      const want = toAngle(sub(interceptPoint(m, quarry, airframe.speed, frame), m.position));
      const step = airframe.turnRate * dt;
      heading = wrapAngle(heading + Math.max(-step, Math.min(step, angleDelta(heading, want))));
    }
    const desired = add(frame, scale(fromAngle(heading), airframe.speed));
    const gap = sub(desired, m.velocity);
    const gapLen = length(gap);
    const maxDv = airframe.speed * MUNITION_ACCELERATION * dt;
    const velocity = gapLen <= maxDv ? desired : add(m.velocity, scale(gap, maxDv / gapLen));

    const carry = carryAt?.(m.position);
    const travel = carry ? add(scale(velocity, dt), carry.dx) : scale(velocity, dt);
    const len = length(travel);
    const dir = len > 0 ? scale(travel, 1 / len) : { x: 0, y: 0 };

    // The first hull along its path, or the station that stops it.
    let nearest = Infinity;
    let hitShip: Ship | null = null;
    let blocked = false;
    for (const s of flying) {
      if (s.id === m.ownerShipId) continue;
      const at = segmentHitsCircle(m.position, dir, len, s.position, (hulls[s.hullId]?.radius ?? 0) + airframe.radius);
      if (at !== null && at < nearest) {
        nearest = at;
        hitShip = s;
      }
    }
    for (const st of Object.values(stations)) {
      const at = segmentHitsCircle(m.position, dir, len, st.position, st.radius);
      if (at !== null && at < nearest) {
        nearest = at;
        hitShip = null;
        blocked = true;
      }
    }
    const end = add(m.position, travel);
    // Proximity fuse on the ship it is homing on.
    if (!hitShip && !blocked && quarry && ships[quarry.id]) {
      const q = ships[quarry.id]!;
      if (distance(end, q.position) <= (hulls[q.hullId]?.radius ?? 0) + airframe.radius + MUNITION_PROXIMITY_FUSE) hitShip = q;
    }
    if (hitShip) {
      damage.push({ shipId: hitShip.id, amount: m.damage, by: m.ownerShipId, cause: 'munition', type: m.damageType, from: m.position });
      continue;
    }
    if (blocked) {
      events.push({ type: 'munitionDestroyed', shipId: m.ownerShipId, munitionId: m.id, by: null });
      continue;
    }
    // Reaching the decoy it chases spends it.
    const decoy = m.homingOn ? decoyById.get(m.homingOn) : undefined;
    if (decoy && distance(end, decoy.position) <= DECOY_FUSE + airframe.radius) {
      events.push({ type: 'munitionDestroyed', shipId: m.ownerShipId, munitionId: m.id, by: null });
      continue;
    }
    if (m.ticksLeft <= 1) {
      events.push({ type: 'munitionDestroyed', shipId: m.ownerShipId, munitionId: m.id, by: null });
      continue;
    }
    out.push({
      ...m,
      heading,
      position: end,
      velocity: carry ? add(velocity, carry.dv) : velocity,
      ticksLeft: m.ticksLeft - 1,
    });
  }
  return { munitions: out, damage, events };
}
