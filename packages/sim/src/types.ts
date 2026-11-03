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
  /** Shield capacity. Shields take damage first and recharge. */
  shield: number;
  /** Shield recharge, points per second, once recharging. */
  shieldRegen: number;
  /** Seconds after taking damage before shields start recharging. */
  shieldRegenDelay: number;
  /** Structure points. The ship is destroyed when this reaches zero. Does not recharge. */
  structure: number;
  /**
   * Weapons fitted when the hull is built, by weapon id. Later this
   * becomes the hull's slots and the fit becomes the owner's choice.
   */
  defaultWeapons: string[];
}

/**
 * How a weapon aims.
 * - `fixed`: fires along the ship's heading. The pilot aims by flying.
 * - `turret`: turns on its own towards the pilot's aim point and fires
 *   along its own bearing.
 *
 * Rule: for weapons of the same size, fixed always does more damage per
 * second than turret. Aiming with the hull is a skill and pays for it.
 * A test enforces this across the whole catalogue.
 */
export type WeaponKind = 'fixed' | 'turret';

export type WeaponSize = 'light' | 'medium' | 'heavy';

export interface WeaponSpec {
  id: string;
  name: string;
  kind: WeaponKind;
  size: WeaponSize;
  /** Damage per projectile. */
  damage: number;
  /** Seconds between shots. */
  fireInterval: number;
  /** Projectile speed relative to the firing ship, units/s. */
  projectileSpeed: number;
  /** Distance a projectile travels before it fizzles, units. */
  range: number;
  /** Turrets only: how fast the turret slews, rad/s. */
  turretTurnRate: number;
}

/** A fitted weapon's live state. */
export interface WeaponState {
  weaponId: string;
  /** Ticks until it can fire again. */
  cooldownTicks: number;
  /** World bearing the weapon points along, radians. Fixed weapons follow the heading. */
  aim: number;
}

/** A shot in flight. */
export interface Projectile {
  id: string;
  /** Ship that fired it; it cannot hit its own ship. */
  ownerShipId: string;
  position: Vec2;
  velocity: Vec2;
  damage: number;
  ticksLeft: number;
}

/** What is left of a destroyed ship. Drifts and fades. Salvage comes later. */
export interface Wreck {
  id: string;
  hullId: string;
  position: Vec2;
  velocity: Vec2;
  heading: number;
  angularVelocity: number;
  ticksLeft: number;
}

/** A canister of goods floating in space, scooped with a tractor beam. */
export interface Loot {
  id: string;
  item: string;
  amount: number;
  position: Vec2;
  velocity: Vec2;
  ticksLeft: number;
}

/**
 * Keeps an NPC in the world: spawns it, and respawns it a while after it
 * is destroyed. Plain data, so NPC population saves with the world.
 */
export interface Spawner {
  id: string;
  hullId: string;
  position: Vec2;
  heading: number;
  /** Station to start docked at, or null to start in space. */
  dockedAt: string | null;
  brain: NpcBrain;
  /** Seconds after the ship is destroyed before a replacement appears. */
  respawnSeconds: number;
  /** The ship this spawner currently has in the world, or null. */
  shipId: string | null;
  /** Ticks until the next spawn, while `shipId` is null. */
  timerTicks: number;
  /** How many ships this spawner has made, for unique ids. */
  spawned: number;
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
  shield: number;
  structure: number;
  /** Ticks until shields start recharging after the last hit. */
  shieldDelayTicks: number;
  weapons: WeaponState[];
  /** True on ticks the tractor beam is running. */
  tractorActive: boolean;
  /** Goods aboard, item id to amount. */
  hold: Record<string, number>;
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
  /** The ship this pilot is currently flying, or null if they have none (destroyed). */
  shipId: string | null;
  /** How many ships this pilot has been issued, for unique ship ids. */
  shipsIssued: number;
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
  /** Fire every fixed weapon. */
  fireFixed: boolean;
  /** Fire every turret. */
  fireTurret: boolean;
  /** World point turrets aim at, or null to leave them where they are. */
  aimAt: Vec2 | null;
  /** Run the tractor beam to pull in nearby loot. */
  tractor: boolean;
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
  /** Ship that last shot or rammed this pirate. It will turn on them. */
  provokedBy: string | null;
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
  spawners: Spawner[];
  projectiles: Projectile[];
  wrecks: Wreck[];
  loot: Loot[];
  weapons: Record<string, WeaponSpec>;
  /** Counter for unique ids of projectiles, wrecks and loot. */
  nextEntityId: number;
  stations: Record<string, Station>;
  hulls: Record<string, HullSpec>;
  /**
   * One-shot facts produced this tick. Cleared each tick. Every event
   * names the ship it concerns (and, where there is one, the ship that
   * caused it in `by`), so each client shows only what involves it.
   */
  events: WorldEvent[];
}

export type DamageCause = 'weapon' | 'ram' | 'station';

export type WorldEvent =
  | { type: 'docked'; shipId: string; stationId: string }
  | { type: 'undocked'; shipId: string; stationId: string }
  | { type: 'dockRefused'; shipId: string; reason: 'tooFar' | 'tooFast' }
  | { type: 'flightModeChanged'; shipId: string; mode: FlightMode }
  /** A ship struck a station hull. `speed` is the closing speed at impact, units/s. */
  | { type: 'collided'; shipId: string; stationId: string; speed: number }
  /** Two ships collided. `speed` is the closing speed at impact, units/s. */
  | { type: 'rammed'; shipId: string; by: string; speed: number }
  /** A ship took damage. `by` is the ship responsible, or null for a station hull. */
  | { type: 'damaged'; shipId: string; by: string | null; amount: number; cause: DamageCause }
  /** A ship was destroyed. `by` is the ship responsible, or null. */
  | { type: 'destroyed'; shipId: string; by: string | null }
  | { type: 'lootCollected'; shipId: string; item: string; amount: number }
  /** An NPC left the sector (no wreck). Its spawner will replace it later. */
  | { type: 'departed'; shipId: string }
  /** A pirate has picked `shipId` as its target. */
  | { type: 'huntStarted'; shipId: string; pirateId: string }
  /** A pirate has given up on `shipId`. */
  | { type: 'huntEnded'; shipId: string; pirateId: string };
