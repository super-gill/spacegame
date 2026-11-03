import type { Vec2 } from './vec2.js';

/**
 * World state types.
 *
 * Everything in the world is plain data with no methods, so a save game is
 * `JSON.stringify(world)` and nothing else. The sim never holds references
 * to DOM, canvas, timers or input devices; it only ever sees a
 * `ShipInput` snapshot per tick.
 */

/** Size class of hulls, mounts and modules. */
export type ModuleSize = 'S' | 'M' | 'L' | 'XL';

/** What kind of module a mount point takes. */
export type MountType = 'weapon' | 'bay' | 'utility' | 'engine' | 'core' | 'internal';

/**
 * What a mount point provides to the module on it. A module lists the
 * services it needs and fits only where they are all provided.
 * - `power`: a power feed. Anything that draws power needs it.
 * - `fireControl`: a fire control link. Turrets need it to track.
 * - `heavyLoad`: a hardpoint rated for heavy, dense loads.
 */
export type MountService = 'power' | 'fireControl' | 'heavyLoad';

/**
 * A place on a hull a module can be fitted. Position and facing are in
 * hull space: world units from the hull centre, nose along +x, +y to the
 * ship's right (clockwise on screen). Drawing, and later turret arcs and
 * damage locality, come from these.
 */
export interface MountPoint {
  /** Unique within the hull, e.g. `w1`. Fits are keyed by it. */
  id: string;
  type: MountType;
  size: ModuleSize;
  position: Vec2;
  /** Bearing the mount points along, radians, relative to the nose. */
  facing: number;
  services: MountService[];
}

export type RaceId = 'halcyon' | 'kessari' | 'freeBelt' | 'vael' | 'oru' | 'drifter' | 'aurel';

/** A ship or module maker. `race` is null for multi-race firms. */
export interface ManufacturerSpec {
  id: string;
  name: string;
  race: RaceId | null;
}

/** The industry a hull is built for. Grows as industries arrive. */
export type HullRole = 'civilian' | 'combat' | 'transport' | 'development';

/**
 * The module stats that add up across a fit. Each module contributes some
 * of these; the ship's total is the sum, after hull bonuses.
 */
export type ModuleStat =
  | 'mainThrust'
  | 'reverseThrust'
  | 'lateralThrust'
  | 'rotationThrust'
  | 'powerOutput'
  | 'shield'
  | 'shieldRegen'
  | 'structure'
  | 'cargoCapacity';

/** What a module does. Decides its silhouette and which stats it carries. */
export type ModuleKind = 'engine' | 'thrusters' | 'reactor' | 'shieldGenerator' | 'armour' | 'cargoPod' | 'weapon';

/**
 * A module: anything fitted to a mount. Data only.
 *
 * Brands differ only in trade-offs (mass, power, price, output), never in
 * what they fit. `tags` name the technology, which race bonuses look for
 * (a Kessari hull rewards `shield` tech, a Free Belt hull `projectile`).
 */
export interface ModuleSpec {
  id: string;
  name: string;
  kind: ModuleKind;
  size: ModuleSize;
  /** Mount types it may go on. */
  mounts: MountType[];
  /** Services the mount must provide. */
  needs: MountService[];
  mass: number;
  /** Power drawn while fitted. Reactors draw nothing and produce `powerOutput`. */
  power: number;
  /** Price at outfitting, credits. */
  price: number;
  manufacturer: string;
  tags: string[];
  stats: Partial<Record<ModuleStat, number>>;
  /** Weapon modules only: the ballistic profile it fires, by weapon id. */
  weaponId?: string;
}

/**
 * A hull bonus. Multiplies what matching modules contribute to `stat` (or,
 * for `damage`, the damage of matching weapons) by `1 + amount`.
 *
 * A module matches when its kind and tag match the bonus (an absent
 * kind or tag matches anything) AND it is exactly the size of the mount
 * it sits on: a smaller module works but loses the hull's bonus.
 */
export interface HullBonus {
  source: 'role' | 'race';
  /** Shown in outfitting, e.g. "+25% cargo from full-size pods". */
  label: string;
  stat: ModuleStat | 'damage';
  amount: number;
  kind?: ModuleKind;
  tag?: string;
}

/**
 * A hull: the frame a ship is built on. It has no performance of its own
 * beyond its mass, structure and hard flight limits; thrust, shields,
 * power, cargo and weapons all come from the modules fitted to it.
 */
export interface HullSpec {
  id: string;
  name: string;
  /** Race whose look and bonuses it carries; null for multi-race makers. */
  race: RaceId | null;
  manufacturer: string;
  role: HullRole;
  sizeClass: ModuleSize;
  /** Mass of the empty frame. Modules and cargo add to it. */
  mass: number;
  /** Structure of the bare frame. Armour adds to it. */
  structure: number;
  /** Approximate hull radius for collision, docking and hit checks. */
  radius: number;
  /** Outline polygon in hull space (world units, nose along +x). */
  outline: Vec2[];
  /** Hard speed limit, units/s, enforced in every flight mode. */
  maxSpeed: number;
  /** Hard spin limit, rad/s, enforced in every flight mode. */
  maxTurnRate: number;
  mounts: MountPoint[];
  bonuses: HullBonus[];
  /** A sealed hull cannot be refitted (the Sparrow dev ship). */
  sealed?: boolean;
}

/** A named fit for a hull. NPC spawners and new pilots are built from these. */
export interface Loadout {
  id: string;
  name: string;
  hullId: string;
  /** Mount id to module id. Mounts left out are empty. */
  fit: Record<string, string>;
}

/**
 * A ship's performance, computed from its hull, its fit and its cargo.
 * Never stored: always derived, so a refit or a tuning change applies at
 * once. Flight, physics, combat, cargo and NPC steering all read this.
 */
export interface ShipStats {
  /** Hull + modules + cargo. Thrust / mass = acceleration. */
  mass: number;
  mainThrust: number;
  reverseThrust: number;
  lateralThrust: number;
  /** rotationThrust / mass = angular acceleration (rad/s^2). */
  rotationThrust: number;
  maxSpeed: number;
  maxTurnRate: number;
  radius: number;
  shield: number;
  /** Shield recharge, points per second, once recharging. */
  shieldRegen: number;
  /** Seconds after taking damage before shields start recharging. */
  shieldRegenDelay: number;
  structure: number;
  cargoCapacity: number;
  powerOutput: number;
  powerDraw: number;
  /** Effective weapon on each weapon-bearing mount, hull bonuses applied. */
  weapons: Record<string, WeaponSpec>;
}

/**
 * A tradeable good. Data only. Cargo adds `unitMass` per unit to the
 * ship's mass, so a loaded ship accelerates, turns and stops more slowly,
 * and rams harder.
 */
export interface GoodSpec {
  id: string;
  name: string;
  unitMass: number;
  /** Reference price; station prices are set around it. */
  basePrice: number;
}

/**
 * One good's prices at one station, in credits per unit, from the pilot's
 * point of view:
 * - `ask`: what the station charges you to buy from it (null: it does not sell this).
 * - `bid`: what the station pays you to sell to it (null: it does not buy this).
 */
export interface MarketEntry {
  ask: number | null;
  bid: number | null;
}

/**
 * How a weapon aims.
 * - `fixed`: fires along the ship's heading. The pilot aims by flying.
 * - `turret`: turns on its own towards the ship's selected target, at a
 *   limited slew rate (its tracking), and fires by itself while weapons
 *   are hot and it is on target and in range.
 *
 * Rule: for weapons of the same size, fixed always does more damage per
 * second than turret. Aiming with the hull is a skill and pays for it.
 * A test enforces this across the whole catalogue.
 */
export type WeaponKind = 'fixed' | 'turret';

export interface WeaponSpec {
  id: string;
  name: string;
  kind: WeaponKind;
  size: ModuleSize;
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

/** A fitted weapon's live state, one per weapon module in the fit. */
export interface WeaponState {
  /** Mount the weapon sits on. Its spec is `ShipStats.weapons[mountId]`. */
  mountId: string;
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
  /** What the NPC flies: a loadout id. */
  loadoutId: string;
  position: Vec2;
  heading: number;
  /** Station to start docked at, or null to start in space. */
  dockedAt: string | null;
  brain: NpcBrain;
  /** Cargo the NPC carries when it spawns. */
  hold: Record<string, number>;
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
  /**
   * What is fitted: mount id to module id. Belongs to the ship, like its
   * cargo. Changed only while docked at outfitting.
   */
  fit: Record<string, string>;
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
  /** Ship currently selected as the target, or null. Turrets engage it while weapons are hot. */
  targetId: string | null;
  /** Turrets fire on their own at the target only while this is true. Fixed guns ignore it. */
  weaponsHot: boolean;
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
  /** What the station trades and at what prices, by good id. Read through a PriceSource. */
  market: Record<string, MarketEntry>;
  /** Ships docked here can be refitted. */
  outfitting: boolean;
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
  /** The pilot's money. Belongs to the pilot, not the ship, so it survives losing a ship. */
  credits: number;
  /**
   * Modules the pilot owns but has not fitted, by station id then module
   * id to count. They stay where they were unfitted and are collected
   * there. Same shape as a cargo hold, so modules can join the goods
   * economy later.
   */
  storage: Record<string, Record<string, number>>;
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
  /**
   * Edge-triggered target change: `{ id }` selects that ship (or clears
   * the target when `id` is null); null leaves the target as it is.
   */
  selectTarget: { id: string | null } | null;
  /** Edge-triggered: switch weapons between hot and cold. */
  toggleWeaponsHot: boolean;
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
  goods: Record<string, GoodSpec>;
  /** Counter for unique ids of projectiles, wrecks and loot. */
  nextEntityId: number;
  stations: Record<string, Station>;
  hulls: Record<string, HullSpec>;
  modules: Record<string, ModuleSpec>;
  loadouts: Record<string, Loadout>;
  manufacturers: Record<string, ManufacturerSpec>;
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
  | { type: 'weaponsHotChanged'; shipId: string; hot: boolean }
  /** A ship struck a station hull. `speed` is the closing speed at impact, units/s. */
  | { type: 'collided'; shipId: string; stationId: string; speed: number }
  /** Two ships collided. `speed` is the closing speed at impact, units/s. */
  | { type: 'rammed'; shipId: string; by: string; speed: number }
  /** A ship took damage. `by` is the ship responsible, or null for a station hull. */
  | { type: 'damaged'; shipId: string; by: string | null; amount: number; cause: DamageCause }
  /** A ship was destroyed. `by` is the ship responsible, or null. */
  | { type: 'destroyed'; shipId: string; by: string | null }
  | { type: 'lootCollected'; shipId: string; item: string; amount: number }
  /** A trade completed while docked. `unitPrice` is per unit, in credits. */
  | { type: 'traded'; shipId: string; good: string; quantity: number; unitPrice: number; side: 'buy' | 'sell' }
  /** An NPC left the sector (no wreck). Its spawner will replace it later. */
  | { type: 'departed'; shipId: string }
  /** A pirate has picked `shipId` as its target. */
  | { type: 'huntStarted'; shipId: string; pirateId: string }
  /** A pirate has given up on `shipId`. */
  | { type: 'huntEnded'; shipId: string; pirateId: string }
  /**
   * A module was fitted, replacing `replaced` (which went to storage) if
   * the mount was full. `bought` is true when it was bought new rather
   * than taken from storage. `cost` is every credit paid: price if bought,
   * plus the fitting fee, plus the unfitting fee on what it replaced.
   */
  | { type: 'fitted'; shipId: string; mountId: string; moduleId: string; replaced: string | null; bought: boolean; cost: number }
  /** A module was taken off and put in storage at this station. `fee` is what it cost. */
  | { type: 'unfitted'; shipId: string; mountId: string; moduleId: string; fee: number }
  /** A stored module was sold back to the station the ship is docked at. */
  | { type: 'moduleSold'; shipId: string; stationId: string; moduleId: string; credits: number };
