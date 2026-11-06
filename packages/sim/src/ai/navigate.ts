import { asteroidPositions } from '../asteroids.js';
import type { Ship, ShipStats, World } from '../types.js';
import { add, distance, fromAngle, scale, sub, toAngle, type Vec2 } from '../vec2.js';
import { clear, findPath, type Circle } from './path.js';
import { arriveVelocity, travelVelocity } from './steer.js';

/**
 * Flying small and medium craft through the belt (drones, NPC miners):
 * a planned path round the rocks (ai/path.ts), replanned every second or
 * when the destination moves; slower the tighter the room, since NPCs
 * mostly burn forwards (drones have thrusters all round, but weaker than
 * their main engine); and, close in, sliding along anything about to be
 * touched rather than stalling against it.
 */

/** Where a craft is going and how: kept in its brain between ticks. */
export interface PathState {
  path?: Vec2[];
  goal?: Vec2;
  planTick?: number;
}

/** Within this many units of clearance, a craft is pushed off an obstacle. */
export const CLEAR_MARGIN = 22;
/** How hard, units/s at contact, falling to nothing at the margin. */
const CLEAR_PUSH = 90;
/** Among rocks a craft flies no faster than this many units a second per unit of room, nor slower than the minimum. */
const CLUTTER_SPEED_PER_UNIT = 0.9;
const CLUTTER_MIN_SPEED = 20;
/** Replan this often, ticks (a second). */
const REPLAN_TICKS = 60;
/** A waypoint this close counts as reached, units. */
const WAYPOINT_REACHED = 18;
/** Rocks this far away are left out of planning, units. */
const PLAN_REACH = 900;
/** Ships this close are steered clear of, units. */
const SHIP_REACH = 300;

export interface NavigateOptions {
  /** Extra obstacles to plan round (a mother's hull, say). */
  avoid?: readonly Circle[];
  /** Ships not to steer clear of (its own drones, its mother). */
  ignoreShips?: (other: Ship) => boolean;
}

/**
 * The velocity `ship` wants to reach `spot`, moving with `frame` there,
 * at up to `cruise`, and its path state for next tick.
 */
export function navigate(world: World, ship: Ship, stats: ShipStats, state: PathState, spot: Vec2, frame: Vec2, cruise: number, options: NavigateOptions = {}): { velocity: Vec2; plan: Required<PathState> } {
  const rocks: Circle[] = asteroidPositions(world)
    .filter((r) => distance(r.position, ship.position) < PLAN_REACH)
    .map((r) => ({ position: r.position, radius: r.radius }));
  const obstacles = [...rocks, ...(options.avoid ?? [])];
  const around: Circle[] = obstacles.filter((o) => distance(o.position, ship.position) < SHIP_REACH);
  for (const other of Object.values(world.ships)) {
    if (other.id === ship.id || other.state !== 'flying' || distance(other.position, ship.position) > SHIP_REACH) continue;
    if (options.ignoreShips?.(other)) continue;
    around.push({ position: other.position, radius: world.hulls[other.hullId]?.radius ?? 10 });
  }
  const clearance = stats.radius + CLEAR_MARGIN;

  const stale = !state.path || !state.goal || state.planTick === undefined || world.tick - state.planTick >= REPLAN_TICKS || distance(state.goal, spot) > 25;
  let path = stale ? (findPath(ship.position, spot, obstacles, clearance) ?? wayOut(ship.position, spot, obstacles, clearance)) : state.path!;
  const planTick = stale ? world.tick : state.planTick!;
  // Drop waypoints reached, and any it can already see past.
  while (path.length > 1 && (distance(ship.position, path[0]!) < WAYPOINT_REACHED || clear(ship.position, path[1]!, obstacles, clearance))) path = path.slice(1);
  const next = path[0]!;
  // Slow among rocks: it needs room to turn and stop.
  const gap = Math.min(Infinity, ...obstacles.map((o) => distance(ship.position, o.position) - o.radius - stats.radius));
  const careful = Math.min(cruise, Math.max(CLUTTER_MIN_SPEED, gap * CLUTTER_SPEED_PER_UNIT));
  const wanted = path.length === 1 ? arriveVelocity(ship, stats, next, careful) : travelVelocity(ship, stats, next, spot, careful);
  return { velocity: add(frame, keepClear(ship, stats.radius, wanted, around)), plan: { path, goal: spot, planTick } };
}

/**
 * With no way found: pressed close against something, back straight off
 * it first, then head for `spot` (and replan from clear water). Out in
 * the open, straight for `spot`.
 */
function wayOut(position: Vec2, spot: Vec2, obstacles: readonly Circle[], clearance: number): Vec2[] {
  let nearest: Circle | null = null;
  for (const o of obstacles) if (!nearest || distance(position, o.position) - o.radius < distance(position, nearest.position) - nearest.radius) nearest = o;
  if (!nearest || distance(position, nearest.position) - nearest.radius >= clearance) return [spot];
  const away = fromAngle(toAngle(sub(position, nearest.position)));
  return [add(nearest.position, scale(away, nearest.radius + clearance + BACK_OFF)), spot];
}

/** Backing off a rock with no way past it: this far beyond the clearance, units. */
const BACK_OFF = 20;

/**
 * `wanted`, bent round whatever the craft is about to touch: near an
 * obstacle, the part heading into it is turned to slide along its edge
 * instead, and a push moves it off the edge.
 */
export function keepClear(ship: Ship, radius: number, wanted: Vec2, around: readonly Circle[]): Vec2 {
  let v = wanted;
  for (const o of around) {
    const gap = distance(ship.position, o.position) - o.radius - radius;
    if (gap >= CLEAR_MARGIN) continue;
    const away = fromAngle(toAngle(sub(ship.position, o.position)));
    const into = v.x * away.x + v.y * away.y;
    if (into < 0) {
      // Slide: drop the inward part and spend it along the edge, on the side it was already leaning.
      const edge = { x: -away.y, y: away.x };
      const lean = v.x * edge.x + v.y * edge.y >= 0 ? 1 : -1;
      v = add(sub(v, scale(away, into)), scale(edge, -into * lean));
    }
    v = add(v, scale(away, CLEAR_PUSH * (1 - Math.max(0, gap) / CLEAR_MARGIN)));
  }
  return v;
}
