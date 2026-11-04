import { GRAVITY_EASE_START } from './constants.js';
import { nearestDockableStation } from './docking.js';
import type { Body, Orbit, Ship, Station, World } from './types.js';
import { add, distance, scale, sub, type Vec2 } from './vec2.js';

/**
 * Rails and frames: where bodies and stations are, and what carries what.
 *
 * Bodies and stations ride circular orbits on rails. Their position,
 * velocity and acceleration are pure functions of the tick, worked out
 * here and never simulated, so the sim stays deterministic and nothing on
 * rails drifts however long the world runs.
 *
 * Each body with a sphere of influence carries what is inside it. Ships,
 * projectiles, loot and wrecks keep positions and velocities in system
 * coordinates; each tick, whatever is inside a body's sphere also moves
 * by exactly what the body's own rail adds over that tick (`carryFor`).
 * Seen from the body, they move as if it stood still. Leaving a sphere
 * needs no change of frame, so there is never a jump.
 *
 * Inside a sphere the body also pulls (`gravityAt`): inverse-square,
 * eased to zero at the sphere's edge. Only the innermost body pulls.
 *
 * The local frame (`frameVelocity`) is what speed is measured against:
 * the station whose dock range a ship is in, else the body whose sphere
 * it is in, else the system. Assist, brake, the docking check, the speed
 * limit and NPC steering all use it.
 */

/** Where something on rails is at one moment, and how it is moving. */
export interface RailState {
  position: Vec2;
  velocity: Vec2;
  acceleration: Vec2;
}

/** What carrying adds to something inside a body's sphere over one tick. */
export interface Carry {
  /** Added to the position after the normal move. */
  dx: Vec2;
  /** Added to the velocity. */
  dv: Vec2;
}

const ORIGIN: RailState = { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, acceleration: { x: 0, y: 0 } };

const NO_CARRY: Carry = { dx: { x: 0, y: 0 }, dv: { x: 0, y: 0 } };

/** Seconds since the world began at `tick`. */
export function railTime(tick: number, dt: number): number {
  return tick * dt;
}

/**
 * The period of a circular orbit at `radius` round a body of gravitational
 * parameter `gravity`, seconds: 2 pi sqrt(r^3 / mu). A station inside its
 * parent's sphere uses exactly this, so it orbits as a ship would.
 */
export function circularPeriod(gravity: number, radius: number): number {
  if (gravity <= 0 || radius <= 0) return Infinity;
  return 2 * Math.PI * Math.sqrt((radius * radius * radius) / gravity);
}

/**
 * The angle along an orbit at `time`, radians. Time is first reduced to
 * within one period, so the angle stays exact however long the world runs.
 */
export function orbitAngle(orbit: Orbit, time: number): number {
  if (!Number.isFinite(orbit.period) || orbit.period <= 0) return orbit.phase;
  const within = time % orbit.period;
  return orbit.phase + orbit.direction * ((2 * Math.PI * within) / orbit.period);
}

/** Where something on `orbit` is at `time`, given where its parent is then. */
export function orbitState(orbit: Orbit, parent: RailState, time: number): RailState {
  const angle = orbitAngle(orbit, time);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const omega = Number.isFinite(orbit.period) && orbit.period > 0 ? (orbit.direction * 2 * Math.PI) / orbit.period : 0;
  const r = orbit.radius;
  return {
    position: add(parent.position, { x: r * cos, y: r * sin }),
    velocity: add(parent.velocity, { x: -r * omega * sin, y: r * omega * cos }),
    acceleration: add(parent.acceleration, { x: -r * omega * omega * cos, y: -r * omega * omega * sin }),
  };
}

/**
 * Where a body is at `time`, following its parents up to the star. A body
 * with no orbit, or one whose parent is missing, sits at the origin.
 */
export function bodyState(bodies: Readonly<Record<string, Body>>, id: string, time: number, depth = 0): RailState {
  const body = bodies[id];
  // Depth guard: a parent loop in hand-edited data must not hang the sim.
  if (!body || !body.orbit || depth > 16) return ORIGIN;
  return orbitState(body.orbit, bodyState(bodies, body.orbit.parent, time, depth + 1), time);
}

/** Every body's state at `time`, by id. */
export function bodyStates(bodies: Readonly<Record<string, Body>>, time: number): Record<string, RailState> {
  const out: Record<string, RailState> = {};
  for (const id of Object.keys(bodies)) out[id] = bodyState(bodies, id, time);
  return out;
}

/** Where a station is at `time`. A station with no orbit stays where it is, at rest. */
export function stationState(bodies: Readonly<Record<string, Body>>, station: Station, time: number): RailState {
  if (!station.orbit) return { position: station.position, velocity: { x: 0, y: 0 }, acceleration: { x: 0, y: 0 } };
  return orbitState(station.orbit, bodyState(bodies, station.orbit.parent, time), time);
}

/** The station moved to where its rail puts it at `time`. */
export function placeStation(bodies: Readonly<Record<string, Body>>, station: Station, time: number): Station {
  if (!station.orbit) return station;
  const s = stationState(bodies, station, time);
  return { ...station, position: s.position, velocity: s.velocity };
}

/** Every station moved to where its rail puts it at `tick`. */
export function placeStations(
  bodies: Readonly<Record<string, Body>>,
  stations: Readonly<Record<string, Station>>,
  tick: number,
  dt: number,
): Record<string, Station> {
  const time = railTime(tick, dt);
  const out: Record<string, Station> = {};
  for (const [id, st] of Object.entries(stations)) out[id] = placeStation(bodies, st, time);
  return out;
}

/**
 * The innermost body whose sphere holds `point`, given every body's state
 * now. Spheres nest (a moon's inside its planet's), so the smallest sphere
 * that holds the point wins; ties go to the lower id.
 */
export function innermostBody(
  bodies: Readonly<Record<string, Body>>,
  states: Readonly<Record<string, RailState>>,
  point: Vec2,
): Body | null {
  let best: Body | null = null;
  for (const id of Object.keys(bodies).sort()) {
    const body = bodies[id]!;
    const state = states[id];
    if (body.sphere <= 0 || !state) continue;
    if (distance(point, state.position) >= body.sphere) continue;
    if (!best || body.sphere < best.sphere) best = body;
  }
  return best;
}

/**
 * Gravity's acceleration on something at `point` from one body whose
 * state is `state`: inverse-square towards its centre inside its sphere,
 * eased smoothly to zero over the outer part of the sphere, zero outside.
 * Closer than the surface it is held at surface strength (the surface
 * stops you first).
 */
export function gravityFrom(body: Body, state: RailState, point: Vec2): Vec2 {
  if (body.gravity <= 0 || body.sphere <= 0) return { x: 0, y: 0 };
  const towards = sub(state.position, point);
  const d = Math.hypot(towards.x, towards.y);
  if (d >= body.sphere || d === 0) return { x: 0, y: 0 };
  const r = Math.max(d, body.radius, 1);
  const ease = gravityEase(d / body.sphere);
  return scale(towards, (body.gravity / (r * r)) * ease / d);
}

/** 1 inside GRAVITY_EASE_START of the sphere, falling smoothly to 0 at its edge. */
export function gravityEase(fraction: number): number {
  if (fraction <= GRAVITY_EASE_START) return 1;
  if (fraction >= 1) return 0;
  const s = (fraction - GRAVITY_EASE_START) / (1 - GRAVITY_EASE_START);
  return 1 - s * s * (3 - 2 * s);
}

/**
 * Gravity at `point`: only the innermost body whose sphere holds it
 * pulls (docs/system.md). Its parents' pull is what moves that body along
 * its rail, and carrying already gives you that.
 */
export function gravityAt(bodies: Readonly<Record<string, Body>>, states: Readonly<Record<string, RailState>>, point: Vec2): Vec2 {
  const body = innermostBody(bodies, states, point);
  return body ? gravityFrom(body, states[body.id]!, point) : { x: 0, y: 0 };
}

/**
 * The carry each body gives over the tick from `tick` to `tick + 1`.
 *
 * Something inside the sphere moves with the body: seen from the body, it
 * flies as if the body stood still. In system coordinates that is its
 * normal move plus `dx` = (body's exact displacement this tick) minus
 * (body's velocity now times dt), and its velocity plus `dv` = the body's
 * change in velocity. That is the body's rail acceleration applied exactly,
 * so a ship left alone inside a sphere keeps its offset from the body to
 * floating-point accuracy.
 */
export function carriesForTick(bodies: Readonly<Record<string, Body>>, tick: number, dt: number): Record<string, Carry> {
  const now = bodyStates(bodies, railTime(tick, dt));
  const next = bodyStates(bodies, railTime(tick + 1, dt));
  const out: Record<string, Carry> = {};
  for (const id of Object.keys(bodies)) {
    const a = now[id]!;
    const b = next[id]!;
    out[id] = {
      dx: sub(sub(b.position, a.position), scale(a.velocity, dt)),
      dv: sub(b.velocity, a.velocity),
    };
  }
  return out;
}

/**
 * Everything a tick needs to carry things: the bodies' states at its
 * start, and each body's carry. `carryAt(point)` is the carry for
 * something at `point` at the start of the tick.
 */
export interface TickRails {
  states: Record<string, RailState>;
  /** Every body's state at the end of the tick. */
  next: Record<string, RailState>;
  carries: Record<string, Carry>;
  carryAt(point: Vec2): Carry;
  /** Gravity on something at `point` at the start of the tick. */
  gravityAt(point: Vec2): Vec2;
}

export function tickRails(bodies: Readonly<Record<string, Body>>, tick: number, dt: number): TickRails {
  const states = bodyStates(bodies, railTime(tick, dt));
  const next = bodyStates(bodies, railTime(tick + 1, dt));
  const carries = carriesForTick(bodies, tick, dt);
  return {
    states,
    next,
    carries,
    carryAt(point: Vec2): Carry {
      const body = innermostBody(bodies, states, point);
      return body ? carries[body.id]! : NO_CARRY;
    },
    gravityAt(point: Vec2): Vec2 {
      return gravityAt(bodies, states, point);
    },
  };
}

/** Every body with a surface, where it is at the end of the tick. */
export function surfacesNext(bodies: Readonly<Record<string, Body>>, rails: TickRails): { bodyId: string; position: Vec2; velocity: Vec2; radius: number }[] {
  return Object.keys(bodies)
    .sort()
    .filter((id) => bodies[id]!.radius > 0)
    .map((id) => ({ bodyId: id, position: rails.next[id]!.position, velocity: rails.next[id]!.velocity, radius: bodies[id]!.radius }));
}

/** A position and velocity after carrying. */
export function applyCarry<T extends { position: Vec2; velocity: Vec2 }>(thing: T, carry: Carry): T {
  if (carry === NO_CARRY) return thing;
  return { ...thing, position: add(thing.position, carry.dx), velocity: add(thing.velocity, carry.dv) };
}

// ---------------------------------------------------------------------------
// Reading the world as it stands (at `world.tick`), for the sim and client.

/** Where a body is now. */
export function bodyPosition(world: Pick<World, 'bodies' | 'tick' | 'dt'>, id: string): Vec2 {
  return bodyState(world.bodies, id, railTime(world.tick, world.dt)).position;
}

/** How fast a body is moving now. */
export function bodyVelocity(world: Pick<World, 'bodies' | 'tick' | 'dt'>, id: string): Vec2 {
  return bodyState(world.bodies, id, railTime(world.tick, world.dt)).velocity;
}

/** The innermost body whose sphere holds `point` now, or null in flat space. */
export function sphereBodyAt(world: Pick<World, 'bodies' | 'tick' | 'dt'>, point: Vec2): Body | null {
  return innermostBody(world.bodies, bodyStates(world.bodies, railTime(world.tick, world.dt)), point);
}

/**
 * What a ship's speed is measured against right now.
 * - `station`: the ship is inside that station's dock range.
 * - `body`: inside that body's sphere (the innermost).
 * - `system`: flat space; the frame is at rest.
 * Docked ships are in their station's frame.
 */
export type LocalFrame =
  | { kind: 'station'; id: string; velocity: Vec2 }
  | { kind: 'body'; id: string; velocity: Vec2 }
  | { kind: 'system'; velocity: Vec2 };

export function localFrame(world: Pick<World, 'bodies' | 'stations' | 'tick' | 'dt'>, ship: Pick<Ship, 'position' | 'dockedAt'>): LocalFrame {
  const docked = ship.dockedAt ? world.stations[ship.dockedAt] : undefined;
  const station = docked ?? nearestDockableStation(ship, world.stations);
  if (station) return { kind: 'station', id: station.id, velocity: station.velocity };
  const time = railTime(world.tick, world.dt);
  const states = bodyStates(world.bodies, time);
  const body = innermostBody(world.bodies, states, ship.position);
  if (body) return { kind: 'body', id: body.id, velocity: states[body.id]!.velocity };
  return { kind: 'system', velocity: { x: 0, y: 0 } };
}

/** The velocity of a ship's local frame (see `localFrame`). */
export function frameVelocity(world: Pick<World, 'bodies' | 'stations' | 'tick' | 'dt'>, ship: Pick<Ship, 'position' | 'dockedAt'>): Vec2 {
  return localFrame(world, ship).velocity;
}

/** A ship's velocity relative to its local frame: what its speed readout shows. */
export function relativeVelocity(world: Pick<World, 'bodies' | 'stations' | 'tick' | 'dt'>, ship: Pick<Ship, 'position' | 'velocity' | 'dockedAt'>): Vec2 {
  return sub(ship.velocity, frameVelocity(world, ship));
}

/** Where a pirate's home is now: on its rail if it has one, else where it was set. */
export function pirateHome(world: Pick<World, 'bodies' | 'tick' | 'dt'>, home: Vec2, homeOrbit: Orbit | null | undefined): Vec2 {
  if (!homeOrbit) return home;
  const time = railTime(world.tick, world.dt);
  return orbitState(homeOrbit, bodyState(world.bodies, homeOrbit.parent, time), time).position;
}
