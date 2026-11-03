import { impactDamage, type Damage } from './combat.js';
import {
  COLLISION_EVENT_MIN_SPEED,
  HULL_FRICTION,
  HULL_RESTITUTION,
  IMPACT_DAMAGE_PER_DELTA_V,
  IMPACT_SAFE_DELTA_V,
  SHIP_RESTITUTION,
} from './constants.js';
import type { HullSpec, Ship, Station, WorldEvent } from './types.js';
import { add, distance, scale, sub, type Vec2 } from './vec2.js';

/**
 * Collisions: ships against station hulls, and ships against each other.
 *
 * Both push overlapping ships apart and bounce them. Damage comes from
 * each ship's own change in velocity (delta-v), see constants.ts:
 *
 * - Station hulls are immovable, so the ship takes the whole bounce.
 * - Between ships, momentum is shared by mass. In a ram the heavy ship's
 *   velocity barely changes and the light ship's changes a lot, so a big
 *   hull can ram a small one and walk away.
 */

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export interface CollisionResult {
  ship: Ship;
  events: WorldEvent[];
  damage: Damage[];
}

export function collideWithStations(ship: Ship, hull: HullSpec, stations: Record<string, Station>): CollisionResult {
  if (ship.state !== 'flying') return { ship, events: [], damage: [] };

  let s = ship;
  const events: WorldEvent[] = [];
  const damage: Damage[] = [];

  for (const station of Object.values(stations)) {
    const minDist = station.radius + hull.radius;
    const d = distance(s.position, station.position);
    if (d >= minDist) continue;

    // Outward normal; a ship exactly at the centre is pushed out along its heading.
    const normal = d > 0 ? scale(sub(s.position, station.position), 1 / d) : { x: Math.cos(s.heading), y: Math.sin(s.heading) };
    const position = add(station.position, scale(normal, minDist));

    const into = dot(s.velocity, normal); // negative when moving into the station
    let velocity = s.velocity;
    if (into < 0) {
      const normalPart = scale(normal, into);
      const tangentPart = sub(s.velocity, normalPart);
      velocity = add(scale(tangentPart, 1 - HULL_FRICTION), scale(normalPart, -HULL_RESTITUTION));
      if (-into >= COLLISION_EVENT_MIN_SPEED) {
        events.push({ type: 'collided', shipId: s.id, stationId: station.id, speed: -into });
      }
      const deltaV = -into * (1 + HULL_RESTITUTION);
      const amount = impactDamage(deltaV, IMPACT_SAFE_DELTA_V, IMPACT_DAMAGE_PER_DELTA_V);
      if (amount > 0) damage.push({ shipId: s.id, amount, by: null, cause: 'station' });
    }
    s = { ...s, position, velocity };
  }
  return { ship: s, events, damage };
}

export interface ShipCollisionResult {
  ships: Record<string, Ship>;
  events: WorldEvent[];
  damage: Damage[];
}

/**
 * Resolve every overlapping pair of flying ships. Pairs are visited in
 * sorted id order so the result is deterministic. `hullFor` gives each
 * ship's hull as it flies, cargo mass included, so a laden ship rams
 * harder. Fine for the handful of
 * ships in a sector; a spatial grid can come when sectors get busy.
 */
export function collideShips(ships: Record<string, Ship>, hullFor: (ship: Ship) => HullSpec | undefined): ShipCollisionResult {
  const out: Record<string, Ship> = { ...ships };
  const events: WorldEvent[] = [];
  const damage: Damage[] = [];
  const ids = Object.keys(out)
    .filter((id) => out[id]!.state === 'flying')
    .sort();

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = out[ids[i]!]!;
      const b = out[ids[j]!]!;
      const ha = hullFor(a);
      const hb = hullFor(b);
      if (!ha || !hb) continue;

      const minDist = ha.radius + hb.radius;
      const d = distance(a.position, b.position);
      if (d >= minDist) continue;

      const normal = d > 0 ? scale(sub(b.position, a.position), 1 / d) : { x: 1, y: 0 }; // a towards b
      const totalMass = ha.mass + hb.mass;

      // Separate in proportion to mass: the light ship moves further.
      const overlap = minDist - d;
      const aPos = sub(a.position, scale(normal, overlap * (hb.mass / totalMass)));
      const bPos = add(b.position, scale(normal, overlap * (ha.mass / totalMass)));

      const closing = dot(sub(a.velocity, b.velocity), normal); // positive when approaching
      let aVel = a.velocity;
      let bVel = b.velocity;
      if (closing > 0) {
        // Impulse along the normal, conserving momentum.
        const impulse = ((1 + SHIP_RESTITUTION) * closing * ha.mass * hb.mass) / totalMass;
        const aDeltaV = impulse / ha.mass;
        const bDeltaV = impulse / hb.mass;
        aVel = sub(a.velocity, scale(normal, aDeltaV));
        bVel = add(b.velocity, scale(normal, bDeltaV));

        if (closing >= COLLISION_EVENT_MIN_SPEED) {
          events.push({ type: 'rammed', shipId: a.id, by: b.id, speed: closing });
          events.push({ type: 'rammed', shipId: b.id, by: a.id, speed: closing });
        }
        const aDamage = impactDamage(aDeltaV, IMPACT_SAFE_DELTA_V, IMPACT_DAMAGE_PER_DELTA_V);
        const bDamage = impactDamage(bDeltaV, IMPACT_SAFE_DELTA_V, IMPACT_DAMAGE_PER_DELTA_V);
        if (aDamage > 0) damage.push({ shipId: a.id, amount: aDamage, by: b.id, cause: 'ram' });
        if (bDamage > 0) damage.push({ shipId: b.id, amount: bDamage, by: a.id, cause: 'ram' });
      }

      out[a.id] = { ...a, position: aPos, velocity: aVel };
      out[b.id] = { ...b, position: bPos, velocity: bVel };
    }
  }
  return { ships: out, events, damage };
}
