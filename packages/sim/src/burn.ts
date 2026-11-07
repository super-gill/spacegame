import { angleDelta } from './angle.js';
import {
  BURN_ACCELERATION,
  BURN_ALIGNED,
  BURN_ARRIVE_SHORT,
  BURN_BODY_MARGIN,
  BURN_DONE_DISTANCE,
  BURN_DONE_SPEED,
  BURN_MIN_DISTANCE,
  BURN_TURN_RATE,
} from './constants.js';
import { idleThrusters } from './flight.js';
import type { CommandResult } from './pilots.js';
import { bodyStates, railTime } from './rails.js';
import type { HullClass, Ship, Station, World, WorldEvent } from './types.js';
import { add, distance, length, scale, sub, type Vec2 } from './vec2.js';

/**
 * The plotted burn (docs/sol-build.md, "Travel: the burn"; lore.md,
 * "Travel inside a system"). Inside a system there is no faster-than-light
 * travel: a ship crossing between worlds turns, burns hard, flips at the
 * midpoint and burns again to brake. The pilot picks a station and
 * presses burn; the ship does the rest and arrives at rest a little short
 * of it, ready to fly in and dock.
 *
 * While burning the ship flies itself: no locks, guns or docking (step.ts
 * skips them). Cancelling stops the drive but not the ship: it coasts at
 * whatever speed it had until the pilot brakes, which is the same burn
 * with no destination.
 *
 * Steering is a simple guidance law rather than a precomputed plan, so a
 * moving station is caught wherever it is: the ship wants to close at the
 * speed it could still brake from (√(2ad) for the distance left) and burns
 * towards whatever velocity that is. Far out that means accelerating; past
 * the midpoint the wanted speed falls below its own, so it flips and
 * brakes. A body in the way is flown round, not through.
 */

/** Freighters, barges and destroyers are heavy and burn slower; everything else at `BURN_ACCELERATION`. */
export const BURN_ACCELERATION_BY_CLASS: Partial<Record<HullClass, number>> = { freighter: 600, barge: 500, destroyer: 800 };

export type BurnRefusal =
  | 'noShip' // the pilot is not aboard a ship
  | 'notFlying' // docked or on a pad: undock first
  | 'cannotBurn' // a drone, or a hull with no drive for it
  | 'unknownStation' // no such station
  | 'tooClose' // nearer than BURN_MIN_DISTANCE: just fly there
  | 'notBurning'; // cancelling a burn that is not running

/** How hard this hull burns, units/s², or 0 if it cannot. */
export function burnAcceleration(world: Pick<World, 'hulls'>, ship: Pick<Ship, 'hullId'>): number {
  const hull = world.hulls[ship.hullId];
  if (!hull || hull.class === 'drone') return 0;
  return BURN_ACCELERATION_BY_CLASS[hull.class] ?? BURN_ACCELERATION;
}

/** Where a burn for `station` ends: short of it, along the line from `from`, outside its dock range. */
export function burnEndPoint(station: Pick<Station, 'position' | 'dockRange'>, from: Vec2): Vec2 {
  const away = sub(from, station.position);
  const d = length(away);
  const short = station.dockRange + BURN_ARRIVE_SHORT;
  return d <= short ? from : add(station.position, scale(away, short / d));
}

/**
 * What a burn from `from` to `station` would take, for the chart and the
 * HUD: the distance, the time at `accel` from rest to rest (t = 2√(d/a)),
 * when the flip comes, and the speed at the flip.
 */
export function burnPlan(from: Vec2, station: Pick<Station, 'position' | 'dockRange'>, accel: number): { distance: number; seconds: number; flipSeconds: number; peakSpeed: number } {
  const d = distance(from, burnEndPoint(station, from));
  const half = accel > 0 ? Math.sqrt(d / accel) : Infinity;
  return { distance: d, seconds: 2 * half, flipSeconds: half, peakSpeed: accel * half };
}

/** The pilot's own ship, if they are aboard one. */
function pilotsShip(world: World, pilotId: string): Ship | null {
  const id = world.pilots[pilotId]?.shipId;
  return id ? (world.ships[id] ?? null) : null;
}

/**
 * Start a burn for `targetId`'s station, or, with null, a braking burn
 * that brings the ship to rest where it is (after cancelling, say).
 */
export function startBurn(world: World, pilotId: string, targetId: string | null): CommandResult<BurnRefusal> {
  const ship = pilotsShip(world, pilotId);
  if (!ship) return { ok: false, world, reason: 'noShip' };
  if (ship.state !== 'flying') return { ok: false, world, reason: 'notFlying' };
  if (burnAcceleration(world, ship) <= 0) return { ok: false, world, reason: 'cannotBurn' };
  if (targetId !== null) {
    const station = world.stations[targetId];
    if (!station) return { ok: false, world, reason: 'unknownStation' };
    if (distance(ship.position, station.position) < BURN_MIN_DISTANCE) return { ok: false, world, reason: 'tooClose' };
  }
  const burning: Ship = { ...ship, burn: { targetId, startTick: world.tick } };
  return { ok: true, world: { ...world, ships: { ...world.ships, [ship.id]: burning } }, event: { type: 'burnStarted', shipId: ship.id, targetId } };
}

/** Stop the drive. The ship keeps its speed and coasts. */
export function cancelBurn(world: World, pilotId: string): CommandResult<BurnRefusal> {
  const ship = pilotsShip(world, pilotId);
  if (!ship) return { ok: false, world, reason: 'noShip' };
  if (!ship.burn) return { ok: false, world, reason: 'notBurning' };
  const { burn: _stopped, ...coasting } = ship;
  return { ok: true, world: { ...world, ships: { ...world.ships, [ship.id]: { ...coasting, thrusters: idleThrusters() } } }, event: { type: 'burnEnded', shipId: ship.id, reason: 'cancelled' } };
}

/**
 * The first body whose surface the straight line from `from` to `to`
 * passes too close to, and a point to steer for that clears it: out from
 * the body's centre through the line's closest point, at the margin.
 */
function detour(world: World, from: Vec2, to: Vec2, time: number): Vec2 | null {
  const states = bodyStates(world.bodies, time);
  const line = sub(to, from);
  const lineLength = length(line);
  if (lineLength === 0) return null;
  let nearest: { at: Vec2; along: number } | null = null;
  for (const id of Object.keys(world.bodies).sort()) {
    const body = world.bodies[id]!;
    if (body.radius <= 0) continue;
    const centre = states[id]!.position;
    const clear = body.radius * BURN_BODY_MARGIN;
    // The line's closest point to the body's centre, within the segment.
    const t = Math.max(0, Math.min(1, ((centre.x - from.x) * line.x + (centre.y - from.y) * line.y) / (lineLength * lineLength)));
    const closest = add(from, scale(line, t));
    const miss = distance(closest, centre);
    if (miss >= clear || t <= 0 || t >= 1) continue;
    // Out through the closest point; straight across the centre, go to the left of the line.
    const out = miss > 1 ? scale(sub(closest, centre), 1 / miss) : scale({ x: -line.y, y: line.x }, 1 / lineLength);
    const point = add(centre, scale(out, clear * 1.1));
    if (!nearest || t < nearest.along) nearest = { at: point, along: t };
  }
  return nearest?.at ?? null;
}

/**
 * One tick of a burning ship, in place of ordinary flight (step.ts). The
 * ship turns towards the thrust it wants and burns only once it points
 * there, so the flip at the midpoint is a real turn. Returns the ship and
 * any events (arrival).
 */
export function stepBurn(world: World, ship: Ship, stations: Readonly<Record<string, Station>>): { ship: Ship; events: WorldEvent[] } {
  const burn = ship.burn!;
  const dt = world.dt;
  const accel = burnAcceleration(world, ship);
  const station = burn.targetId ? stations[burn.targetId] : undefined;
  // The target went away (it never should): stop the drive and coast.
  if (burn.targetId && !station) {
    const { burn: _gone, ...coasting } = ship;
    return { ship: { ...coasting, thrusters: idleThrusters() }, events: [{ type: 'burnEnded', shipId: ship.id, reason: 'cancelled' }] };
  }

  // Where to and how fast it moves: the end point beside the station, or (braking) right here.
  const end = station ? burnEndPoint(station, ship.position) : ship.position;
  const endVelocity = station ? station.velocity : { x: 0, y: 0 };
  const toEnd = sub(end, ship.position);
  const left = length(toEnd);
  const relative = sub(ship.velocity, endVelocity);

  if (left < BURN_DONE_DISTANCE && length(relative) < BURN_DONE_SPEED) {
    const { burn: _done, ...arrived } = ship;
    return {
      ship: { ...arrived, velocity: { ...endVelocity }, angularVelocity: 0, thrusters: idleThrusters() },
      events: [{ type: 'burnEnded', shipId: ship.id, reason: 'arrived' }],
    };
  }

  // Aim round a body in the way; brake for the whole path left, not just the first leg.
  const aimAt = detour(world, ship.position, end, railTime(world.tick, dt)) ?? end;
  const toAim = sub(aimAt, ship.position);
  const aimDistance = length(toAim);
  const pathLeft = aimAt === end ? left : aimDistance + distance(aimAt, end);
  // Close at the speed it could still brake from, a little under so the last ticks are not a scramble.
  const wantedSpeed = Math.sqrt(2 * accel * Math.max(pathLeft - BURN_DONE_DISTANCE * 0.5, 0)) * 0.97;
  const wanted = aimDistance > 0 ? scale(toAim, wantedSpeed / aimDistance) : { x: 0, y: 0 };
  const change = sub(wanted, relative);
  const changeSize = length(change);

  // Turn towards the thrust wanted; burn once pointing there.
  const thrustHeading = changeSize > 0 ? Math.atan2(change.y, change.x) : ship.heading;
  const turn = angleDelta(ship.heading, thrustHeading);
  const step = Math.max(-BURN_TURN_RATE * dt, Math.min(BURN_TURN_RATE * dt, turn));
  const heading = ship.heading + step;
  const aligned = Math.abs(turn - step) < BURN_ALIGNED;
  // No more thrust than closes the gap this tick, so it settles instead of chattering.
  const push = aligned ? Math.min(accel, changeSize / dt) : 0;
  const thrust = push > 0 ? scale(change, push / changeSize) : { x: 0, y: 0 };
  const velocity = add(ship.velocity, scale(thrust, dt));
  return {
    ship: {
      ...ship,
      heading,
      angularVelocity: step / dt,
      velocity,
      position: add(ship.position, scale(velocity, dt)),
      thrusters: { ...idleThrusters(), main: push > 0 ? Math.min(1, push / accel) : 0 },
    },
    events: [],
  };
}
