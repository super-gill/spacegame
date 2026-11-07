import { impactDamage, type Damage } from './combat.js';
import {
  COLLISION_EVENT_MIN_SPEED,
  HULL_FRICTION,
  HULL_RESTITUTION,
  IMPACT_DAMAGE_PER_DELTA_V,
  IMPACT_SAFE_DELTA_V,
  SHIP_RESTITUTION,
  SURFACE_FRICTION,
  SURFACE_RESTITUTION,
} from './constants.js';
import type { ShipStats, Ship, Station, WorldEvent } from './types.js';
import { add, distance, scale, sub, type Vec2 } from './vec2.js';

/**
 * Collisions: ships against station hulls, and ships against each other.
 *
 * Both push overlapping ships apart and bounce them. Damage comes from
 * each ship's own change in velocity (delta-v), see constants.ts:
 *
 * - Station hulls are immovable, so the ship takes the whole bounce.
 *   Stations move on rails, so the bounce is worked out relative to the
 *   station's own velocity.
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

export function collideWithStations(ship: Ship, stats: ShipStats, stations: Record<string, Station>): CollisionResult {
  if (ship.state !== 'flying') return { ship, events: [], damage: [] };

  let s = ship;
  const events: WorldEvent[] = [];
  const damage: Damage[] = [];

  for (const station of Object.values(stations)) {
    const minDist = station.radius + stats.radius;
    const d = distance(s.position, station.position);
    if (d >= minDist) continue;

    // Outward normal; a ship exactly at the centre is pushed out along its heading.
    const normal = d > 0 ? scale(sub(s.position, station.position), 1 / d) : { x: Math.cos(s.heading), y: Math.sin(s.heading) };
    const position = add(station.position, scale(normal, minDist));

    const relative = sub(s.velocity, station.velocity ?? { x: 0, y: 0 });
    const into = dot(relative, normal); // negative when moving into the station
    let velocity = s.velocity;
    if (into < 0) {
      const normalPart = scale(normal, into);
      const tangentPart = sub(relative, normalPart);
      velocity = add(station.velocity ?? { x: 0, y: 0 }, add(scale(tangentPart, 1 - HULL_FRICTION), scale(normalPart, -HULL_RESTITUTION)));
      if (-into >= COLLISION_EVENT_MIN_SPEED) {
        events.push({ type: 'collided', shipId: s.id, stationId: station.id, speed: -into });
      }
      const deltaV = -into * (1 + HULL_RESTITUTION);
      const amount = impactDamage(deltaV, IMPACT_SAFE_DELTA_V, IMPACT_DAMAGE_PER_DELTA_V);
      if (amount > 0) damage.push({ shipId: s.id, amount, by: null, cause: 'station', type: 'kinetic' });
    }
    s = { ...s, position, velocity };
  }
  return { ship: s, events, damage };
}

/** A body's surface as it stands at the end of the tick: where it is and how it moves. */
export interface Surface {
  bodyId: string;
  position: Vec2;
  velocity: Vec2;
  radius: number;
}

/**
 * A ship against body surfaces: like a station hull, immovable, with the
 * bounce worked out relative to the body's motion and damage by the
 * ship's change in velocity. A slow touch bounces off; a fast one is
 * fatal. Landing comes later.
 */
export function collideWithSurfaces(ship: Ship, stats: ShipStats, surfaces: readonly Surface[]): CollisionResult {
  if (ship.state !== 'flying') return { ship, events: [], damage: [] };
  let s = ship;
  const events: WorldEvent[] = [];
  const damage: Damage[] = [];
  for (const body of surfaces) {
    const minDist = body.radius + stats.radius;
    const d = distance(s.position, body.position);
    if (d >= minDist) continue;
    const normal = d > 0 ? scale(sub(s.position, body.position), 1 / d) : { x: Math.cos(s.heading), y: Math.sin(s.heading) };
    const position = add(body.position, scale(normal, minDist));
    const relative = sub(s.velocity, body.velocity);
    const into = dot(relative, normal);
    let velocity = s.velocity;
    if (into < 0) {
      const normalPart = scale(normal, into);
      const tangentPart = sub(relative, normalPart);
      velocity = add(body.velocity, add(scale(tangentPart, 1 - SURFACE_FRICTION), scale(normalPart, -SURFACE_RESTITUTION)));
      if (-into >= COLLISION_EVENT_MIN_SPEED) events.push({ type: 'impacted', shipId: s.id, bodyId: body.bodyId, speed: -into });
      const amount = impactDamage(-into * (1 + SURFACE_RESTITUTION), IMPACT_SAFE_DELTA_V, IMPACT_DAMAGE_PER_DELTA_V);
      if (amount > 0) damage.push({ shipId: s.id, amount, by: null, cause: 'surface', type: 'kinetic' });
    }
    s = { ...s, position, velocity };
  }
  return { ship: s, events, damage };
}

/** True if `point` is inside any surface: projectiles, loot and wrecks there are gone. */
export function insideSurface(point: Vec2, surfaces: readonly Surface[]): boolean {
  return surfaces.some((b) => distance(point, b.position) < b.radius);
}

export interface ShipCollisionResult {
  ships: Record<string, Ship>;
  events: WorldEvent[];
  damage: Damage[];
}

/**
 * Resolve every overlapping pair of flying ships. Pairs are visited in
 * sorted id order so the result is deterministic. `statsFor` gives each
 * ship's stats as it flies, cargo mass included, so a laden ship rams
 * harder. A drone passes through its mother and its sister drones. Fine for the handful of ships in a sector; a spatial grid can come when sectors get busy.
 */
export function collideShips(ships: Record<string, Ship>, statsFor: (ship: Ship) => ShipStats | undefined): ShipCollisionResult {
  const out: Record<string, Ship> = { ...ships };
  const events: WorldEvent[] = [];
  const damage: Damage[] = [];
  // A ship mid-burn passes others at thousands of units a second: at these scales a crossing is a near miss,
  // and the lanes are swept (lore, infrastructure.md). It still hits worlds (step.ts).
  const ids = Object.keys(out)
    .filter((id) => out[id]!.state === 'flying' && !out[id]!.burn)
    .sort();

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = out[ids[i]!]!;
      const b = out[ids[j]!]!;
      const ha = statsFor(a);
      const hb = statsFor(b);
      if (!ha || !hb) continue;
      // A mother's drones fly in and out of each other and its hull without harm (docs/drones.md).
      if ((a.motherId && (a.motherId === b.id || a.motherId === b.motherId)) || (b.motherId && b.motherId === a.id)) continue;

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
        if (aDamage > 0) damage.push({ shipId: a.id, amount: aDamage, by: b.id, cause: 'ram', type: 'kinetic' });
        if (bDamage > 0) damage.push({ shipId: b.id, amount: bDamage, by: a.id, cause: 'ram', type: 'kinetic' });
      }

      out[a.id] = { ...a, position: aPos, velocity: aVel };
      out[b.id] = { ...b, position: bPos, velocity: bVel };
    }
  }
  return { ships: out, events, damage };
}
