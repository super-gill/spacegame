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
  /** Flight computer speed limit in units/s. Thrust cannot push past this. */
  maxSpeed: number;
  /** Rotation thruster force. rotationThrust / mass = angular acceleration (rad/s^2). */
  rotationThrust: number;
  /** Flight computer spin limit in rad/s. */
  maxTurnRate: number;
  /** Approximate hull radius for collision and docking checks. */
  radius: number;
}

export type ShipState = 'flying' | 'docked';

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
  /** Rotate anticlockwise on screen at the hull's turn rate. */
  turnLeft: boolean;
  /** Rotate clockwise on screen at the hull's turn rate. */
  turnRight: boolean;
  thrustForward: boolean;
  thrustReverse: boolean;
  strafeLeft: boolean;
  strafeRight: boolean;
  /** Kill velocity and spin using available thrusters. */
  brake: boolean;
  /** Edge-triggered: request docking or undocking this tick. */
  toggleDock: boolean;
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
  | { type: 'dockRefused'; shipId: string; reason: 'tooFar' | 'tooFast' };
