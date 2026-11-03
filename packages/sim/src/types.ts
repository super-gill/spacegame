import type { Vec2 } from './vec2.js';

/**
 * World state types.
 *
 * Everything in the world is plain data with no methods, so a save game is
 * `JSON.stringify(world)` and nothing else. The sim never holds references
 * to DOM, canvas, timers or input devices; it only ever sees a
 * `PlayerInput` snapshot per tick.
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
}

/**
 * Per-tick control intent from whoever is flying the player ship.
 * This is the only way the outside world influences the sim.
 */
export interface PlayerInput {
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

export interface World {
  /** Monotonic tick counter. */
  tick: number;
  /** Fixed seconds per tick. */
  dt: number;
  playerShipId: string;
  ships: Record<string, Ship>;
  stations: Record<string, Station>;
  hulls: Record<string, HullSpec>;
  /** One-shot messages produced this tick for the UI to show. Cleared each tick. */
  events: WorldEvent[];
}

export type WorldEvent =
  | { type: 'docked'; shipId: string; stationId: string }
  | { type: 'undocked'; shipId: string; stationId: string }
  | { type: 'dockRefused'; shipId: string; reason: 'tooFar' | 'tooFast' }
  | { type: 'flightModeChanged'; shipId: string; mode: FlightMode };
