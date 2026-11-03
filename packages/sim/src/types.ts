import type { Vec2 } from './vec2.js';

/**
 * World state types.
 *
 * Everything in the world is plain data with no methods, so a save game is
 * `JSON.stringify(world)` and nothing else. The sim never holds references
 * to DOM, canvas, timers or input devices; it only ever sees a
 * `ShipInput` snapshot per tick.
 */

/**
 * Static description of a hull. Instances of ships reference a spec by id
 * so stats live in one place and can be tuned without touching saves.
 */
export interface HullSpec {
  id: string;
  name: string;
  /** Mass in arbitrary units. Thrust / mass = acceleration. */
  mass: number;
  /** Main engine force (units/s^2 once divided by mass). */
  mainThrust: number;
  /** Reverse / retro engine force. Usually weaker than main. */
  reverseThrust: number;
  /** Lateral thruster force (strafe). */
  lateralThrust: number;
  /**
   * Hard speed limit in units/s, enforced by the physics in every flight
   * mode. Thrust can still change direction at the limit, not magnitude.
   */
  maxSpeed: number;
  /** Rotation thruster force. rotationThrust / mass = angular acceleration (rad/s^2). */
  rotationThrust: number;
  /** Hard spin limit in rad/s, enforced by the physics in every flight mode. */
  maxTurnRate: number;
  /** Approximate hull radius for collision and docking checks. */
  radius: number;
}

export type ShipState = 'flying' | 'docked';

/**
 * Flight computer modes. The physics is the same in all of them; the mode
 * only decides whether the computer fires thrusters on the pilot's behalf.
 *
 * - `assisted`: cancels spin when no rotate key is held, and bleeds off
 *   drift on any axis the pilot is not thrusting along.
 * - `rotation`: cancels spin only. Drift is left alone.
 * - `manual`: fires only what the pilot asks for. Pure Newtonian.
 */
export type FlightMode = 'assisted' | 'rotation' | 'manual';

/**
 * Throttle per thruster group for one tick, each 0 to 1. Produced by the
 * flight computer and applied by the physics. Stored on the ship so the
 * renderer can draw exactly what fired, including assist burns.
 */
export interface Thrusters {
  main: number;
  reverse: number;
  /** Lateral thrusters pushing the ship to its left. */
  strafeLeft: number;
  /** Lateral thrusters pushing the ship to its right. */
  strafeRight: number;
  /** Rotation thrusters adding anticlockwise spin. */
  rotateLeft: number;
  /** Rotation thrusters adding clockwise spin. */
  rotateRight: number;
}

export interface Ship {
  id: string;
  hullId: string;
  /** Pilot who owns this ship, or null for NPC and unowned ships. */
  ownerId: string | null;
  position: Vec2;
  velocity: Vec2;
  /** Facing direction in radians. */
  heading: number;
  /** Spin in rad/s. Positive is clockwise on screen. */
  angularVelocity: number;
  state: ShipState;
  /** Station id when docked, otherwise null. */
  dockedAt: string | null;
  flightMode: FlightMode;
  /** What the thrusters did on the last tick. All zero when idle or docked. */
  thrusters: Thrusters;
}

export interface Station {
  id: string;
  name: string;
  position: Vec2;
  radius: number;
  /** Ships inside this distance of the station centre may request docking. */
  dockRange: number;
  /**
   * Radius of the station's protected zone, from its centre. Pirates will
   * not hunt a ship inside it or enter it themselves. Later, crimes
   * witnessed inside it bring a security response.
   */
  securityRadius: number;
}

/**
 * A person in the world. Pilots are what make the game multiplayer-ready:
 * the sim has no single "player", only pilots who each own ships and,
 * later, credits, cargo, reputation and a criminal record. Everything a
 * person earns hangs off their pilot record, so it stays theirs between
 * sessions and never mixes with another pilot's.
 *
 * Single-player is simply a world with one pilot.
 */
export interface Pilot {
  /** Stable identity, chosen by the client and kept between sessions. */
  id: string;
  name: string;
  /** The ship this pilot is currently flying, or null if they have none. */
  shipId: string | null;
}

/**
 * Per-tick control intent for one ship, from a person or (later) an NPC.
 * This is the only way the outside world influences a ship.
 */
export interface ShipInput {
  /** Fire rotation thrusters to add anticlockwise spin. */
  turnLeft: boolean;
  /** Fire rotation thrusters to add clockwise spin. */
  turnRight: boolean;
  thrustForward: boolean;
  thrustReverse: boolean;
  strafeLeft: boolean;
  strafeRight: boolean;
  /** Kill velocity and spin using available thrusters. */
  brake: boolean;
  /** Edge-triggered: request docking or undocking this tick. */
  toggleDock: boolean;
  /** Edge-triggered: switch to the next flight mode. */
  cycleFlightMode: boolean;
}

/**
 * NPC brains. Plain data, stored in `World.npcs` keyed by the ship the
 * brain flies, so NPC state saves and loads with the world like anything
 * else. The behaviour lives in `ai/`.
 */
export type NpcBrain = TraderBrain | PirateBrain;

/** Flies a fixed loop of stations, docking at each for a while. */
export interface TraderBrain {
  kind: 'trader';
  /** Station ids visited in order, then back to the first. */
  route: string[];
  /** Index into `route` of the station currently heading for or docked at. */
  leg: number;
  /** Ticks left to wait while docked. */
  waitTicks: number;
}

export type PirateMode = 'prowl' | 'hunt' | 'withdraw';

/** Patrols near a home point and hunts lone ships outside station security. */
export interface PirateBrain {
  kind: 'pirate';
  home: Vec2;
  mode: PirateMode;
  /** Ship being hunted, when mode is `hunt`. */
  targetId: string | null;
  /** Ticks spent in the current mode. */
  modeTicks: number;
  /** Ticks before the pirate will look for a new target. */
  cooldownTicks: number;
  /** Which patrol point round `home` it is flying to. */
  patrolIndex: number;
}

export interface World {
  /** Monotonic tick counter. */
  tick: number;
  /** Fixed seconds per tick. */
  dt: number;
  pilots: Record<string, Pilot>;
  ships: Record<string, Ship>;
  /** NPC brains keyed by the id of the ship they fly. */
  npcs: Record<string, NpcBrain>;
  stations: Record<string, Station>;
  hulls: Record<string, HullSpec>;
  /**
   * One-shot facts produced this tick. Cleared each tick. Every event
   * names the ship it concerns, so each client shows only its own.
   */
  events: WorldEvent[];
}

export type WorldEvent =
  | { type: 'docked'; shipId: string; stationId: string }
  | { type: 'undocked'; shipId: string; stationId: string }
  | { type: 'dockRefused'; shipId: string; reason: 'tooFar' | 'tooFast' }
  | { type: 'flightModeChanged'; shipId: string; mode: FlightMode }
  /** A ship struck a station hull. `speed` is the closing speed at impact, units/s. */
  | { type: 'collided'; shipId: string; stationId: string; speed: number }
  /** A pirate has picked `shipId` as its target. */
  | { type: 'huntStarted'; shipId: string; pirateId: string }
  /** A pirate has given up on `shipId`. */
  | { type: 'huntEnded'; shipId: string; pirateId: string };
