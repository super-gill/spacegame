import { angleDelta } from './angle.js';
import {
  BURN_ACCELERATION,
  BURN_ALIGNED,
  BURN_ARC_STEP,
  BURN_ARRIVE_SHORT,
  BURN_BEND_SHARE,
  BURN_BODY_MARGIN,
  BURN_DONE_DISTANCE,
  BURN_DONE_SPEED,
  BURN_LOOKAHEAD_SECONDS,
  BURN_MIN_DISTANCE,
  BURN_TURN_RATE,
  BURN_WELL_CLEARANCE,
} from './constants.js';
import { idleThrusters } from './flight.js';
import type { CommandResult } from './pilots.js';
import { bodyStates, railTime, type RailState } from './rails.js';
import type { Body, HullClass, Ship, Station, World, WorldEvent } from './types.js';
import { add, distance, length, scale, sub, type Vec2 } from './vec2.js';

/**
 * The plotted burn (docs/sol-build.md, "Travel: the burn"; lore.md,
 * "Travel inside a system"). Inside a system there is no faster-than-light
 * travel: a ship crossing between worlds turns, burns hard, flips at the
 * midpoint and burns again to brake. The pilot picks a port or a world and
 * presses burn; the ship does the rest and arrives at rest a little short
 * of a port, ready to fly in and dock, or above a world's gravity well.
 *
 * While burning the ship flies itself: no locks, guns or docking (step.ts
 * skips them). Cancelling stops the drive but not the ship: it coasts at
 * whatever speed it had until the pilot brakes, which is the same burn
 * with no destination.
 *
 * Steering is a guidance law along a route rather than a stored plan, so a
 * moving target is caught wherever it is: the ship wants to close at the
 * speed it could still brake from (√(2ad) for the path left) and burns
 * towards whatever velocity that is. Far out that means accelerating; past
 * the midpoint the wanted speed falls below its own, so it flips and
 * brakes. A world in the way is passed, not crossed: the route bends round
 * it as a tangent, an arc grazing its clearance and a tangent out again,
 * and the ship slows to what its drive can bend at that radius before the
 * arc. The chart draws the same route (`burnPlan`), so what is shown is
 * what is flown.
 */

/** Freighters, barges and destroyers are heavy and burn slower; everything else at `BURN_ACCELERATION`. */
export const BURN_ACCELERATION_BY_CLASS: Partial<Record<HullClass, number>> = { freighter: 600, barge: 500, destroyer: 800 };

export type BurnRefusal =
  | 'noShip' // the pilot is not aboard a ship
  | 'notFlying' // docked or on a pad: undock first
  | 'cannotBurn' // a drone, or a hull with no drive for it
  | 'unknownTarget' // no such port or world (the star and the belts cannot be burned for)
  | 'tooClose' // nearer than BURN_MIN_DISTANCE: just fly there
  | 'notBurning'; // cancelling a burn that is not running

/** How hard this hull burns, units/s², or 0 if it cannot. */
export function burnAcceleration(world: Pick<World, 'hulls'>, ship: Pick<Ship, 'hullId'>): number {
  const hull = world.hulls[ship.hullId];
  if (!hull || hull.class === 'drone') return 0;
  return BURN_ACCELERATION_BY_CLASS[hull.class] ?? BURN_ACCELERATION;
}

/**
 * What a burn can be for: a port, ending just outside its dock range, or a
 * world (a planet or moon), ending above its gravity well. `standOff` is
 * how far from the centre the burn ends; `velocity` is what the ship
 * matches on arrival.
 */
export interface BurnTarget {
  kind: 'station' | 'body';
  id: string;
  name: string;
  position: Vec2;
  velocity: Vec2;
  standOff: number;
}

/** A port as a burn target. */
export function stationTarget(station: Station): BurnTarget {
  return { kind: 'station', id: station.id, name: station.name, position: station.position, velocity: station.velocity, standOff: station.dockRange + BURN_ARRIVE_SHORT };
}

/** A world as a burn target, where it is at `state`: stop above its well, and never inside the clearance a route keeps. */
export function bodyTarget(body: Body, state: RailState): BurnTarget {
  const standOff = Math.max(body.sphere, body.radius * BURN_BODY_MARGIN) * BURN_WELL_CLEARANCE;
  return { kind: 'body', id: body.id, name: body.name, position: state.position, velocity: state.velocity, standOff };
}

/** Whether a body can be burned for: planets and moons (the big rocks are moons here), not the star or a belt. */
export function burnableBody(body: Body): boolean {
  return (body.kind === 'planet' || body.kind === 'moon') && body.radius > 0;
}

/**
 * The target `targetId` names at `time`: a station from `stations` (where
 * they will be, when stepping), or a world from the rails. Null for
 * anything else.
 */
export function burnTarget(world: Pick<World, 'bodies'>, stations: Readonly<Record<string, Station>>, targetId: string, time: number): BurnTarget | null {
  const station = stations[targetId];
  if (station) return stationTarget(station);
  const body = world.bodies[targetId];
  if (body && burnableBody(body)) return bodyTarget(body, bodyStates(world.bodies, time)[body.id]!);
  return null;
}

/** Where a burn for `target` ends: along the line from `from`, at its stand-off (back out to it, from inside). */
export function burnEndPoint(target: Pick<BurnTarget, 'position' | 'standOff'>, from: Vec2): Vec2 {
  const away = sub(from, target.position);
  const d = length(away);
  return d > 0 ? add(target.position, scale(away, target.standOff / d)) : add(target.position, { x: 0, y: -target.standOff });
}

/**
 * The route a burn flies from `from` to `end`: the points to pass through
 * in order (`end` last; `from` is not included), its length, and the
 * worlds it passes round. A `bend` is one pass: the clearance circle
 * (centre, radius) and the speed the drive can hold round it, which the
 * guidance law and the plan both honour.
 */
export interface BurnRoute {
  points: Vec2[];
  /** Along the route, units. */
  length: number;
  /** Straight there, units, for comparing. */
  direct: number;
  /** Each world passed round, in order, with how far along the route its pass begins and ends. */
  bends: { bodyId: string; centre: Vec2; radius: number; speed: number; fromAlong: number; toAlong: number }[];
}

/** The clearance a route keeps from a body's centre. */
function clearanceOf(body: Body): number {
  return body.radius * BURN_BODY_MARGIN;
}

/** The speed a drive of `accel` can hold round a circle of `radius`, spending `BURN_BEND_SHARE` of it on the bend. */
export function bendSpeed(accel: number, radius: number): number {
  return Math.sqrt(accel * radius * BURN_BEND_SHARE);
}

/** A pass never goes closer to a world's centre than this many of its radii, however low the ports it joins. */
const BURN_SURFACE_MARGIN = 1.02;

/** How long the flip takes: half a turn at `BURN_TURN_RATE`. A ship covers that much ground before its brake bites. */
const BURN_FLIP_SECONDS = Math.PI / BURN_TURN_RATE;
/** How much of the drive a ship counts on when braking into a bend; the rest goes on turning onto the arc. */
const BURN_BEND_BRAKE_SHARE = 0.7;

function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

/** The two points where tangents from `p` touch the circle (`centre`, `radius`); from on or inside the circle, both are `p` pushed out onto it. */
function tangentPoints(p: Vec2, centre: Vec2, radius: number): [Vec2, Vec2] {
  const toP = sub(p, centre);
  const d = length(toP);
  const beta = Math.acos(Math.min(1, radius / d));
  const base = Math.atan2(toP.y, toP.x);
  const at = (angle: number): Vec2 => add(centre, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  return [at(base + beta), at(base - beta)];
}

/**
 * The first body (nearest along the segment) whose clearance the segment
 * from `from` to `to` cuts, with the circle to pass it on. The clearance is
 * `BURN_BODY_MARGIN` radii, but never more than the nearer end's own
 * distance from the centre: a pass never asks a ship to climb above where
 * it already is or where it is going, so leaving or reaching a port in low
 * orbit, or dug into a rock, is a pass at that height rather than a climb
 * out and a dive back in. It never goes below `BURN_SURFACE_MARGIN` radii.
 */
function firstObstruction(world: Pick<World, 'bodies'>, states: Record<string, RailState>, from: Vec2, to: Vec2, skip: string | null): { body: Body; centre: Vec2; radius: number } | null {
  const line = sub(to, from);
  const lineLength = length(line);
  if (lineLength === 0) return null;
  let nearest: { body: Body; centre: Vec2; radius: number; along: number } | null = null;
  for (const id of Object.keys(world.bodies).sort()) {
    if (id === skip) continue;
    const body = world.bodies[id]!;
    if (body.radius <= 0) continue;
    const centre = states[id]!.position;
    const radius = Math.max(body.radius * BURN_SURFACE_MARGIN, Math.min(clearanceOf(body), distance(from, centre) - 1, distance(to, centre) - 1));
    const t = Math.max(0, Math.min(1, ((centre.x - from.x) * line.x + (centre.y - from.y) * line.y) / (lineLength * lineLength)));
    const miss = distance(add(from, scale(line, t)), centre);
    if (miss >= radius) continue;
    if (!nearest || t < nearest.along) nearest = { body, centre, radius, along: t };
  }
  return nearest ? { body: nearest.body, centre: nearest.centre, radius: nearest.radius } : null;
}

/** Points along the circle from angle `a` through `sweep` radians, every `BURN_ARC_STEP`, the end included and the start not. */
function arcPoints(centre: Vec2, radius: number, a: number, sweep: number): Vec2[] {
  const steps = Math.max(1, Math.ceil(Math.abs(sweep) / BURN_ARC_STEP));
  const out: Vec2[] = [];
  for (let i = 1; i <= steps; i++) {
    const angle = a + (sweep * i) / steps;
    out.push(add(centre, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }));
  }
  return out;
}

/** The angle of `p` seen from `centre`. */
function angleAbout(centre: Vec2, p: Vec2): number {
  return Math.atan2(p.y - centre.y, p.x - centre.x);
}

/**
 * The route from `from` to `end` round whatever is in the way, as the
 * points to pass through. Each world in the way is passed on the side the
 * straight line already favours: a tangent in to its clearance circle, an
 * arc along it, a tangent out (`firstObstruction` says how wide the circle
 * is). `accel` sets the speed each pass is flown at.
 */
export function burnRoute(world: Pick<World, 'bodies'>, from: Vec2, end: Vec2, time: number, accel: number): BurnRoute {
  const states = bodyStates(world.bodies, time);
  const points: Vec2[] = [];
  const bends: BurnRoute['bends'] = [];
  let at = from;
  let along = 0;
  let skip: string | null = null;
  const push = (p: Vec2): void => {
    along += distance(at, p);
    points.push(p);
    at = p;
  };
  // A few passes at most: Sol's worlds are far apart, and a loop here must never hang the sim.
  for (let pass = 0; pass < 4; pass++) {
    const hit = firstObstruction(world, states, at, end, skip);
    if (!hit) break;
    const { centre, radius } = hit;
    const start = at;
    const dir = sub(end, start);
    const side = Math.sign(cross(dir, sub(centre, start))) || 1; // the centre is left (+) or right (−) of the line
    // The tangent point on the far side of the centre from the line: the way past it. From on the circle, the point itself.
    const awayFromCentre = (a: Vec2, b: Vec2): Vec2 => (-side * cross(dir, sub(a, start)) > -side * cross(dir, sub(b, start)) ? a : b);
    const entry = awayFromCentre(...tangentPoints(start, centre, radius));
    if (distance(at, entry) > 1) push(entry);
    // The pass itself begins at the entry: the tangent in is flown like any straight run.
    const bendStart = along;
    const exit = awayFromCentre(...tangentPoints(end, centre, radius));
    // Round: the short way between the two, which is the way past the world.
    const sweep = angleDelta(angleAbout(centre, entry), angleAbout(centre, exit));
    for (const p of arcPoints(centre, radius, angleAbout(centre, entry), sweep)) push(p);
    bends.push({ bodyId: hit.body.id, centre, radius, speed: bendSpeed(accel, radius), fromAlong: bendStart, toAlong: along });
    skip = hit.body.id;
  }
  points.push(end);
  along += distance(at, end);
  return { points, length: along, direct: distance(from, end), bends };
}

/**
 * How long a run of `d` units takes starting at `u` and ending at `w`
 * units a second with `accel` on tap: up to a peak and down again, or, if
 * the run is too short for that, at the mean of the two. Returns the time
 * and where the peak is along the run.
 */
function legTime(d: number, u: number, w: number, accel: number): { seconds: number; peakAt: number; peak: number } {
  if (accel <= 0) return { seconds: Infinity, peakAt: 0, peak: 0 };
  const peak = Math.sqrt((2 * accel * d + u * u + w * w) / 2);
  if (peak <= Math.max(u, w)) return { seconds: d / Math.max((u + w) / 2, 1), peakAt: u > w ? 0 : d, peak: Math.max(u, w) };
  return { seconds: (peak - u) / accel + (peak - w) / accel, peakAt: (peak * peak - u * u) / (2 * accel), peak };
}

/** What a burn would take, for the chart and the HUD. */
export interface BurnPlan {
  target: BurnTarget;
  route: BurnRoute;
  /** Along the route, units. */
  distance: number;
  seconds: number;
  /** When the first flip comes (the peak of the first run), seconds in. */
  flipSeconds: number;
  peakSpeed: number;
  /** How much longer the passes round worlds make it than the straight line would, seconds (0 with none). */
  detourSeconds: number;
}

/**
 * The time profile of a route from `startSpeed`: each straight run between
 * bends is flown up to a peak and down to the next bend's speed, or to rest
 * at the end, with the flip counted where there is one.
 */
function routeTime(route: BurnRoute, accel: number, startSpeed = 0): { seconds: number; flipSeconds: number; peakSpeed: number } {
  let seconds = 0;
  let speed = startSpeed;
  let along = 0;
  let flipSeconds: number | null = null;
  let peakSpeed = 0;
  const runTo = (to: number, endSpeed: number): void => {
    const leg = legTime(to - along, speed, endSpeed, accel);
    if (flipSeconds === null && leg.peakAt > 0) flipSeconds = seconds + (leg.peak - speed) / accel;
    peakSpeed = Math.max(peakSpeed, leg.peak);
    // Plus the flip itself, during which the ship coasts.
    seconds += leg.seconds + (leg.peak > Math.max(speed, endSpeed) ? BURN_FLIP_SECONDS : 0);
    along = to;
    speed = endSpeed;
  };
  for (const bend of route.bends) {
    runTo(bend.fromAlong, bend.speed);
    seconds += (bend.toAlong - bend.fromAlong) / Math.max(bend.speed, 1);
    along = bend.toAlong;
  }
  runTo(route.length, 0);
  return { seconds, flipSeconds: flipSeconds ?? seconds / 2, peakSpeed };
}

/**
 * What a burn from `from` to `targetId` would take at `accel`: the route,
 * its length, the time with its flip and peak, and how much the passes
 * round worlds add. Null if `targetId` is nothing a burn can be for.
 */
export function burnPlan(world: Pick<World, 'bodies'>, stations: Readonly<Record<string, Station>>, from: Vec2, targetId: string, accel: number, time: number): BurnPlan | null {
  const target = burnTarget(world, stations, targetId, time);
  if (!target) return null;
  const end = burnEndPoint(target, from);
  const route = burnRoute(world, from, end, time, accel);
  const timed = routeTime(route, accel);
  const straight = routeTime({ points: [end], length: route.direct, direct: route.direct, bends: [] }, accel).seconds;
  return { target, route, distance: route.length, ...timed, detourSeconds: Math.max(0, timed.seconds - straight) };
}

/** Where a burn under way stands, for the HUD: the same route and numbers the ship steers by. */
export interface BurnStatus {
  target: BurnTarget | null;
  route: BurnRoute;
  /** Relative to the target, units a second. */
  speed: number;
  /** Along the route, units. */
  left: number;
  seconds: number;
  /** Seconds to the next flip, 0 while braking. */
  flipSeconds: number;
  braking: boolean;
  /** The world being passed round right now, if any. */
  passing: string | null;
}

/** The burning ship's status now, or null if it is not burning. */
export function burnStatus(world: World, ship: Ship): BurnStatus | null {
  if (!ship.burn) return null;
  const accel = burnAcceleration(world, ship);
  const time = railTime(world.tick, world.dt);
  const target = ship.burn.targetId ? burnTarget(world, world.stations, ship.burn.targetId, time) : null;
  const end = target ? burnEndPoint(target, ship.position) : ship.position;
  const relative = sub(ship.velocity, target?.velocity ?? { x: 0, y: 0 });
  const speed = length(relative);
  const route = target ? burnRoute(world, ship.position, end, time, accel) : { points: [end], length: 0, direct: 0, bends: [] };
  const timed = routeTime(route, accel, speed);
  const braking = accel <= 0 || speed >= allowedSpeed(route, accel, speed, turnToBrake(ship, relative)) * 0.97;
  const inBend = route.bends.find((b) => b.fromAlong < BURN_DONE_DISTANCE);
  return {
    target,
    route,
    speed,
    left: route.length,
    seconds: accel > 0 ? timed.seconds : 0,
    flipSeconds: braking ? 0 : timed.flipSeconds,
    braking,
    passing: inBend ? (world.bodies[inBend.bodyId]?.name ?? null) : null,
  };
}

/** The pilot's own ship, if they are aboard one. */
function pilotsShip(world: World, pilotId: string): Ship | null {
  const id = world.pilots[pilotId]?.shipId;
  return id ? (world.ships[id] ?? null) : null;
}

/**
 * Start a burn for `targetId`, a port or a world, or, with null, a braking
 * burn that brings the ship to rest where it is (after cancelling, say).
 */
export function startBurn(world: World, pilotId: string, targetId: string | null): CommandResult<BurnRefusal> {
  const ship = pilotsShip(world, pilotId);
  if (!ship) return { ok: false, world, reason: 'noShip' };
  const refusal = burnRefusal(world, ship, targetId);
  if (refusal) return { ok: false, world, reason: refusal };
  const burning: Ship = { ...ship, burn: { targetId, startTick: world.tick } };
  return { ok: true, world: { ...world, ships: { ...world.ships, [ship.id]: burning } }, event: { type: 'burnStarted', shipId: ship.id, targetId } };
}

/**
 * Why `ship` cannot burn for `targetId` (null: a braking burn) right now,
 * or null if it can. Pilots go through `startBurn`; NPCs ask for a burn in
 * their decisions and step.ts checks it here.
 */
export function burnRefusal(world: World, ship: Ship, targetId: string | null): BurnRefusal | null {
  if (ship.state !== 'flying') return 'notFlying';
  if (burnAcceleration(world, ship) <= 0) return 'cannotBurn';
  if (targetId !== null) {
    const target = burnTarget(world, world.stations, targetId, railTime(world.tick, world.dt));
    if (!target) return 'unknownTarget';
    if (distance(ship.position, burnEndPoint(target, ship.position)) < BURN_MIN_DISTANCE) return 'tooClose';
  }
  return null;
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
 * The speed a ship doing `speed` may have at the start of its route: the
 * least of what it could still brake to for each thing ahead, the end at
 * rest and every bend at its bend speed (and the bend speed itself while
 * in one), allowing for the ground the flip covers before it can brake.
 */
function allowedSpeed(route: BurnRoute, accel: number, speed: number, turnSeconds: number): number {
  // The lead is the ground covered while turning to brake: none for a ship already braking (it finishes crisply), a whole flip for one
  // still burning forward, and a flip again for one that overshot. (A lead that faded out at low speed, assuming the ship already
  // pointed the right way, left a ship that came out of a bend fast overshooting its end for ever: Jason, 7 November 2026.)
  const lead = speed * turnSeconds;
  let allowed = Math.sqrt(2 * accel * Math.max(route.length - lead - BURN_DONE_DISTANCE * 0.5, 0));
  for (const bend of route.bends) {
    // Braking into a bend also has to turn the ship onto the arc, so count on less than the whole drive for it.
    const toBend = Math.max(bend.fromAlong - lead, 0);
    allowed = Math.min(allowed, Math.sqrt(bend.speed * bend.speed + 2 * accel * BURN_BEND_BRAKE_SHARE * toBend));
  }
  return allowed;
}

/** Seconds to turn from the ship's heading to its braking heading (against `relative`), at `BURN_TURN_RATE`; at most a flip. */
function turnToBrake(ship: Pick<Ship, 'heading'>, relative: Vec2): number {
  if (length(relative) === 0) return 0;
  const brake = Math.atan2(-relative.y, -relative.x);
  return Math.min(Math.abs(angleDelta(ship.heading, brake)), Math.PI) / BURN_TURN_RATE;
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
  const time = railTime(world.tick + 1, dt);
  const target = burn.targetId ? burnTarget(world, stations, burn.targetId, time) : null;
  // The target went away (it never should): stop the drive and coast.
  if (burn.targetId && !target) {
    const { burn: _gone, ...coasting } = ship;
    return { ship: { ...coasting, thrusters: idleThrusters() }, events: [{ type: 'burnEnded', shipId: ship.id, reason: 'cancelled' }] };
  }

  // Where to and how fast it moves: the end point beside the target, or (braking) right here.
  const end = target ? burnEndPoint(target, ship.position) : ship.position;
  const endVelocity = target ? target.velocity : { x: 0, y: 0 };
  const left = distance(end, ship.position);
  const relative = sub(ship.velocity, endVelocity);

  if (left < BURN_DONE_DISTANCE && length(relative) < BURN_DONE_SPEED) {
    const { burn: _done, ...arrived } = ship;
    return {
      ship: { ...arrived, velocity: { ...endVelocity }, angularVelocity: 0, thrusters: idleThrusters() },
      events: [{ type: 'burnEnded', shipId: ship.id, reason: 'arrived' }],
    };
  }

  // The route from here, round anything in the way; steer for its first point a little ahead, so a bend is rounded rather than chased point by point.
  const route = target ? burnRoute(world, ship.position, end, time, accel) : { points: [end], length: left, direct: left, bends: [] };
  const lookahead = Math.max(BURN_DONE_DISTANCE, length(relative) * BURN_LOOKAHEAD_SECONDS);
  const aimAt = route.points.find((p, i) => i === route.points.length - 1 || distance(p, ship.position) > lookahead) ?? end;
  const toAim = sub(aimAt, ship.position);
  const aimDistance = length(toAim);
  // Close at the speed the route ahead allows, a little under so the last ticks are not a scramble.
  const wantedSpeed = allowedSpeed(route, accel, length(relative), turnToBrake(ship, relative)) * 0.97;
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
