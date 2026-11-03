import { COLLISION_EVENT_MIN_SPEED, HULL_FRICTION, HULL_RESTITUTION } from './constants.js';
import type { HullSpec, Ship, Station, WorldEvent } from './types.js';
import { add, distance, scale, sub, type Vec2 } from './vec2.js';

/**
 * Ship against station collision.
 *
 * Stations are immovable circles and ships are circles of the hull's
 * radius. On contact the ship is pushed back out to the hull surface,
 * the part of its velocity heading into the station is reflected and
 * reduced (restitution), and the sliding part is slightly reduced
 * (friction). No damage yet; that arrives with milestone 3, and the
 * event carries the impact speed it will need.
 *
 * Ship against ship collision is not handled yet.
 */

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export interface CollisionResult {
  ship: Ship;
  events: WorldEvent[];
}

export function collideWithStations(ship: Ship, hull: HullSpec, stations: Record<string, Station>): CollisionResult {
  if (ship.state !== 'flying') return { ship, events: [] };

  let s = ship;
  const events: WorldEvent[] = [];

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
    }
    s = { ...s, position, velocity };
  }
  return { ship: s, events };
}
