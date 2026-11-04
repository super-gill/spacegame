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
/**
 * `radar` and `computer` are the sensor mounts: one radar (what the ship
 * can see) and one targeting computer (what it can lock). A ship without
 * them sees nothing and locks nothing. `nav` takes the navigation
 * computer every ship carries: it knows where you are, how fast you are
 * going against your frame, what gravity is doing and where you will be.
 */
export type MountType = 'weapon' | 'bay' | 'utility' | 'engine' | 'core' | 'internal' | 'radar' | 'computer' | 'nav';

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
  /**
   * Weapon mounts only: the arc a turreted weapon here can slew through,
   * radians, centred on `facing`. Absent means all round. A fixed weapon
   * fires along `facing` whatever the arc.
   */
  arc?: number;
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
 * A hull's class on the age-of-sail ladder (docs/weapons.md, "Hull
 * classes"). About role and scale, separate from module size, which is
 * what fits a mount. Merchantmen (trade, passengers) and hulks
 * (industry) come at any size; the Aurel are outside the ladder.
 */
export type HullClass = 'pod' | 'cutter' | 'sloop' | 'brig' | 'frigate' | 'lineShip' | 'capital' | 'merchantman' | 'hulk' | 'aurel';

/**
 * What a shot does its damage as. Defences resist each type differently
 * (`ModuleSpec.resists`). Rounds and slugs are kinetic, lasers and plasma
 * thermal, warheads explosive or fragmentation.
 */
export type DamageType = 'kinetic' | 'thermal' | 'explosive' | 'fragmentation';

/** Fraction of each damage type a defence stops, 0 to 1. Missing types resist nothing. */
export type Resistances = Partial<Record<DamageType, number>>;

/**
 * A weapon family (docs/weapons.md). Each has a character, and hulls
 * carry bonuses to one. `pointDefence` is the swivels: multi-role
 * turreted guns, worse than a fixed gun of their size at everything.
 */
export type WeaponFamily = 'projectile' | 'energy' | 'hybrid' | 'missile' | 'pointDefence' | 'countermeasure';

/** How a munition finds its target (docs/weapons.md, "Missiles and torpedoes"). */
export type Guidance = 'radar' | 'heat';

/**
 * A munition good: what a launcher fires. The box's `ammo` block gives
 * the warhead (damage type and a multiplier on the launcher's damage);
 * this block gives the airframe. Missiles are fast and nimble, torpedoes
 * slow and heavy. Both can be shot down: they have a signature to track
 * and a little structure.
 */
export interface MunitionSpec {
  class: 'missile' | 'torpedo';
  guidance: Guidance;
  /** Flight speed, units/s, in the local frame. */
  speed: number;
  /** How fast it can turn, rad/s. */
  turnRate: number;
  /** Seconds of flight before it burns out. */
  lifetimeSeconds: number;
  /** Hull radius for hits, units. */
  radius: number;
  /** How it looks to sensors and seekers. */
  signature: number;
  /** Damage it takes before it is destroyed. */
  structure: number;
}

/**
 * A countermeasure good: what a dispenser drops. A decoy draws seekers of
 * the guidance kinds it spoofs while it burns, brightest when fresh.
 */
export interface DecoySpec {
  spoofs: Guidance[];
  /** Apparent signature when fresh; fades to nothing over its life. */
  signature: number;
  lifetimeSeconds: number;
}

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
  | 'cargoCapacity'
  /** Detection range, units. Comes only from a radar. */
  | 'sensorRange'
  /** How many ships it can hold locked at once. Comes only from a targeting computer. */
  | 'maxLocks'
  /** How fast it locks: 1 is an ordinary computer, 2 locks in half the time. Comes only from a targeting computer. */
  | 'scanResolution'
  /** How far ahead the navigation computer predicts your path, seconds. Comes only from a nav computer. */
  | 'navHorizon';

/** What a module does. Decides its silhouette and which stats it carries. */
export type ModuleKind =
  | 'engine'
  | 'thrusters'
  | 'reactor'
  | 'shieldGenerator'
  | 'armour'
  | 'cargoPod'
  | 'weapon'
  | 'radar'
  | 'targetingComputer'
  | 'navComputer'
  | 'countermeasure';

/**
 * What a locked target tells you, by kind of information. A targeting
 * computer lists the readouts it provides; a lock shows only those
 * (`lockReadout`). Information comes from systems like everything else:
 * a combat computer reads shields and guns, a cargo scanner reads holds,
 * a mining computer (milestone 9) will read rock.
 * - `identity`: hull, maker, size class, who flies it.
 * - `motion`: range, closing speed, relative velocity.
 * - `condition`: coarse state: shields up or down, hull sound, damaged or critical.
 * - `combat`: exact shield and structure, fitted weapons and damage per second.
 * - `cargo`: what is in the hold and how full it is.
 * - `composition`: what a rock is made of (milestone 9; nothing provides it yet).
 */
export type ReadoutKind = 'identity' | 'motion' | 'condition' | 'combat' | 'cargo' | 'composition';

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
  /** Weapon and countermeasure modules only: the profile it fires, by weapon id. */
  weaponId?: string;
  /** Dispensers only: the good a new one comes loaded with (its maker's mix). */
  startsLoadedWith?: string;
  /** Targeting computers only: what a lock shows (see `ReadoutKind`). */
  readouts?: ReadoutKind[];
  /** Shield generators and armour: what they stop of each damage type. */
  resists?: Resistances;
  /**
   * Steady capacitor draw while running, units per second, charged only
   * when the module is the full size of its mount (docs/weapons.md, "The
   * capacitor"). Radars and computers; zero or absent for the rest.
   */
  capacitorDraw?: number;
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
  /** Where the hull sits on the age-of-sail ladder. */
  class: HullClass;
  /**
   * The capacitor: the pool of energy the hull's design holds (units) and
   * how fast the reactor refills it from empty (units per second at
   * peak). A hull property: the shipwright's expertise, like structure.
   */
  capacitor: number;
  capacitorRecharge: number;
  /**
   * How big the hull looks to sensors, units. Lock time against this hull
   * goes with the square root of LOCK_REFERENCE_SIGNATURE over it: big,
   * boxy freighters lock fast, small or stealthy frames slowly. A property
   * of the frame's design; systems may change it later (hot engines,
   * signature dampers).
   */
  signature: number;
  mounts: MountPoint[];
  bonuses: HullBonus[];
  /** A sealed hull cannot be refitted or bought (the Aurel Tacet dev ship, escape pods). */
  sealed?: boolean;
  /**
   * Price of the bare frame at a ship mart, credits. A ship's price is
   * this plus the price of every module fitted.
   */
  price: number;
  /**
   * An escape pod: what a pilot is ejected in when the ship they fly is
   * destroyed. Pods are never property; owning only a pod counts as
   * owning no ship.
   */
  escapePod?: boolean;
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
  /**
   * How far this ship can detect other ships, units, from its radar. No
   * radar, zero: it sees no ships. Stations and bodies are always known
   * (they are on the charts).
   */
  sensorRange: number;
  /** Ships it can hold locked at once, whole, from its targeting computer. No computer, zero. */
  maxLocks: number;
  /** Lock speed multiplier from its targeting computer: lock time is divided by this (locks.ts). */
  scanResolution: number;
  /** How big this ship looks to other ships' sensors (`HullSpec.signature`). */
  signature: number;
  /** What its locks show, from its targeting computer. Empty without one. */
  readouts: ReadoutKind[];
  /** Seconds of predicted path from its nav computer. Zero without one: no navigation readouts at all. */
  navHorizon: number;
  /** Effective weapon on each weapon-bearing mount, hull bonuses applied. */
  weapons: Record<string, WeaponSpec>;
  /** Capacitor pool and peak recharge, from the hull. */
  capacitor: number;
  capacitorRecharge: number;
  /** Steady capacitor drain from full-size active sensors, units per second. */
  capacitorDraw: number;
  /** What the fitted shield generator stops of each damage type. */
  shieldResists: Resistances;
  /** What the fitted armour stops of each damage type, applied to structure damage. */
  armourResists: Resistances;
}

/**
 * A tradeable good. Data only. Cargo adds `unitMass` per unit to the
 * ship's mass, so a loaded ship accelerates, turns and stops more slowly,
 * and rams harder. Ammunition is a good too: `ammo` says what a round
 * does when a gun that loads it fires.
 */
export interface GoodSpec {
  id: string;
  name: string;
  unitMass: number;
  /** Reference price; station prices are set around it. */
  basePrice: number;
  /**
   * Ammunition only: one unit of the good is a box of `perUnit` rounds,
   * the damage type (null: the gun's own), a multiplier on the gun's
   * damage, and the ammunition slot the box fits (`WeaponSpec.ammo`:
   * rounds, shells, charges, missile, torpedo, chaff, flare, decoy), so
   * several goods can feed one launcher. Guns load whole boxes.
   */
  ammo?: { perUnit: number; damageType: DamageType | null; damage: number; fits: string };
  /** Missiles and torpedoes: the airframe. Present only on munition goods. */
  munition?: MunitionSpec;
  /** Chaff, flares and decoys: what a dropped charge does. Present only on countermeasure goods. */
  decoy?: DecoySpec;
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
  family: WeaponFamily;
  size: ModuleSize;
  /** Damage per projectile. For ammunition-fed guns, the round may scale it. */
  damage: number;
  /** What the damage is done as. Ammunition-fed guns take the round's type instead. */
  damageType: DamageType;
  /** Capacitor spent per shot. Zero for projectile guns and launchers. */
  capacitorPerShot: number;
  /**
   * The ammunition slot this gun loads (any good whose `ammo.fits` names
   * it), or null for an energy gun. Rounds come from the hold; `magazine`
   * is how many a weapon holds at once and `reloadSeconds` how long a
   * reload from the hold takes. Launchers load munition goods,
   * dispensers countermeasure goods, by the same machinery.
   */
  ammo: string | null;
  magazine: number;
  reloadSeconds: number;
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
  /** Rounds loaded now. Always full for energy guns. */
  loaded: number;
  /** The good in the magazine (its warhead or decoy), or null or absent for energy guns and empty magazines. */
  loadedGood?: string | null;
  /** Ticks left on a reload in progress, or 0. */
  reloadTicks: number;
  /** Fire group, 1 to 4. Space fires the selected group. Launchers default to 2. */
  group: number;
  /** World bearing the weapon points along, radians. Fixed weapons follow the heading. */
  aim: number;
  /**
   * The lock this weapon engages, by target ship id, or null or absent for
   * the active lock. Turrets only; fixed guns stay on the nose. Nothing
   * sets it yet: assigning systems to locks comes with 6e.
   */
  lockTarget?: string | null;
}

/**
 * A target lock, held by the ship locking. Locking takes time (locks.ts):
 * `progress` runs from 0 to 1 and the lock is complete at 1. Only
 * complete locks can be fired on.
 */
export interface TargetLock {
  /** The ship being locked. */
  targetId: string;
  /** 0 when started, 1 when locked. */
  progress: number;
}

/** A shot in flight. */
export interface Projectile {
  id: string;
  /** Ship that fired it; it cannot hit its own ship. */
  ownerShipId: string;
  position: Vec2;
  velocity: Vec2;
  damage: number;
  damageType: DamageType;
  ticksLeft: number;
}

/**
 * A missile or torpedo in flight (docs/weapons.md). Launched at a locked
 * ship, it steers itself: radar-homing while the launcher's lock holds,
 * heat-seeking towards the hottest signature near its target, so chaff,
 * flares, decoys and the wrong ship can draw it. It has structure and
 * can be shot down; point defence does that by itself. Moves in the
 * local frame like a projectile.
 */
export interface Munition {
  id: string;
  ownerShipId: string;
  /** The good it was fired as; its spec gives speed, turning and warhead. */
  goodId: string;
  /** The ship it was launched at. Null once it has lost its target and flies straight. */
  targetId: string | null;
  /** What it is homing on now: a ship id, a decoy id, or null (straight). */
  homingOn: string | null;
  guidance: Guidance;
  position: Vec2;
  velocity: Vec2;
  heading: number;
  damage: number;
  damageType: DamageType;
  structure: number;
  ticksLeft: number;
}

/**
 * A dropped countermeasure: chaff, a flare or a decoy, drifting where it
 * was dropped and fading over its life. Munitions whose guidance it
 * spoofs may home on it instead of its owner.
 */
export interface Decoy {
  id: string;
  ownerShipId: string;
  goodId: string;
  spoofs: Guidance[];
  position: Vec2;
  velocity: Vec2;
  ticksLeft: number;
  lifetimeTicks: number;
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
  /**
   * Pilot who owns this ship, or null for NPC and unowned ships. Owning is
   * not flying: who is aboard is `Pilot.shipId` (see ownership.ts). An
   * owned ship nobody is flying is empty.
   */
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
  /** The pad at `dockedAt` the ship sits on, or null when not docked. */
  padId: string | null;
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
  /**
   * Target locks, complete or in progress, oldest first. At most
   * `ShipStats.maxLocks`. A lock drops when its target leaves sensor
   * range, docks or is destroyed; all drop when this ship docks.
   */
  locks: TargetLock[];
  /**
   * Target ship id of the active lock, or null. Turrets engage it while
   * weapons are hot, once it is complete. Always names one of `locks`.
   */
  activeLock: string | null;
  /** Capacitor level now, 0 to `ShipStats.capacitor`. */
  capacitor: number;
  /** The fire group Space fires, 1 to 4. */
  fireGroup: number;
  /** Turrets fire on their own at the active lock only while this is true. Fixed guns ignore it. */
  weaponsHot: boolean;
}

export interface Station {
  id: string;
  name: string;
  /**
   * Where the station is at `World.tick`. Stations move on rails: this is
   * worked out from `orbit` every tick (see rails.ts), never simulated,
   * and kept here so everything that reads a station's place reads one
   * field. A station with no orbit stays where it is.
   */
  position: Vec2;
  /** The station's velocity at `World.tick`, from its orbit. Zero with no orbit. */
  velocity: Vec2;
  /**
   * The orbit the station rides, or null for a station fixed in place.
   * Inside its parent's sphere of influence the period is the one the
   * parent's gravity gives (`circularPeriod`), so a ship that matches the
   * station's velocity is in the same orbit.
   */
  orbit: Orbit | null;
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
  /**
   * Landing pads. A docking ship takes the smallest free pad its hull's
   * size class fits; with none free it is refused. Docked ships, flown or
   * empty, sit on their pads, so pads also limit how many ships can be
   * parked here.
   */
  pads: Pad[];
  /** Loadout ids this station's ship mart sells, unlimited for now. Empty: no ship mart. */
  shipMart: string[];
}

/**
 * A landing pad on a station. Stations move but do not turn, so a pad's
 * offset and facing are fixed; its place in the world is the station's
 * position plus the offset, and a ship on it moves with the station.
 */
export interface Pad {
  /** Unique within the station, e.g. `s1`. Ships record it in `padId`. */
  id: string;
  /** Largest hull size class that fits. Smaller hulls fit too. */
  size: ModuleSize;
  /** Offset of the pad centre from the station centre, world units. */
  position: Vec2;
  /** Heading of a ship sitting on the pad, radians. Ships launch this way. */
  facing: number;
}

/**
 * A circular orbit on rails. Whatever rides it is at `radius` from its
 * parent's centre, at angle `phase + direction * 2 pi * time / period`,
 * where time is `tick * dt` seconds. Position, velocity and acceleration
 * are pure functions of the tick (rails.ts), so nothing on rails ever
 * drifts, however long the world runs.
 */
export interface Orbit {
  /** Body id this orbits round. */
  parent: string;
  /** Distance from the parent's centre, units. Zero sits on the parent and only turns. */
  radius: number;
  /** Seconds per revolution. */
  period: number;
  /** Angle at tick 0, radians. */
  phase: number;
  /** 1 turns clockwise on screen (positive angles), -1 anticlockwise. */
  direction: 1 | -1;
}

export type BodyKind = 'star' | 'planet' | 'moon' | 'belt';

/**
 * A natural body: a star, planet, moon or asteroid belt. Bodies are on
 * rails and arrange the system (see docs/system.md). Inside a body's
 * sphere of influence, that body carries whatever is there: ships,
 * projectiles, loot and wrecks get the body's own acceleration along its
 * rail each tick, so they move with it. Gravity itself comes in 6c part 2.
 */
export interface Body {
  id: string;
  name: string;
  kind: BodyKind;
  /** The orbit it rides, or null for a body fixed at the system origin (the star). */
  orbit: Orbit | null;
  /** Surface radius, units. Zero for a belt. */
  radius: number;
  /** Gravitational parameter (G times mass), units^3/s^2. Zero for a belt. Used from 6c part 2. */
  gravity: number;
  /** Sphere of influence radius from the centre, units. Zero for a belt: it carries nothing. */
  sphere: number;
  /**
   * Belts only: the ring of asteroids, centred on the body. The ring turns
   * with the body's orbit angle. Asteroids come in 6c part 2.
   */
  ring?: { radius: number; width: number };
}

/**
 * A rock in a belt. On rails like everything else: it rides the belt's
 * turn at its own radius and phase. Solid: ships bounce off it as off a
 * station hull and shots stop on it, so the belt gives cover. Ore comes
 * in milestone 9, read by a mining computer.
 */
export interface Asteroid {
  id: string;
  orbit: Orbit;
  /** Units. */
  radius: number;
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
  /**
   * The ship this pilot is aboard and flying, or null between losing an
   * escape pod and waking at Harbour. A pilot flies at most one ship and
   * may own many; ownership is `Ship.ownerId`.
   */
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
  /** Fire every fixed weapon in the selected fire group. */
  fireFixed: boolean;
  /** Edge-triggered: select this fire group (1 to 4), or null to leave it. */
  selectGroup: number | null;
  /** Edge-triggered: drop a charge from every countermeasure dispenser that has one. */
  launchCountermeasure: boolean;
  /**
   * Edge-triggered: start locking this ship, or null. Refused (with a
   * `lockRefused` event) beyond sensor range, at max locks, or for a ship
   * that cannot be locked. A new lock becomes active if none is.
   */
  lock: string | null;
  /** Edge-triggered: drop the lock on this ship, or null. */
  unlock: string | null;
  /** Edge-triggered: make the lock on this ship the active one, or null. Ignored with no such lock. */
  activateLock: string | null;
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
export type NpcBrain = TraderBrain | PirateBrain | WatchBrain;

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

/**
 * A local watch patrol (the Calder Watch): flies a beat just outside the
 * stations' security zones and fights pirates it can see. It identifies
 * contacts the way a pilot does, by locking them, and fires only once the
 * lock has told it what it is looking at. It does not trouble pilots
 * until law arrives (milestone 7). An ordinary, beatable ship.
 */
export interface WatchBrain {
  kind: 'watch';
  /** Station ids the beat runs past, in order. */
  beat: string[];
  /** Index into `beat` of the station it is heading for. */
  leg: number;
  mode: 'patrol' | 'engage';
  /** The pirate being fought, in `engage`. */
  targetId: string | null;
  /** Ticks in the current mode, or left to hold at a beat point. */
  modeTicks: number;
}

export type PirateMode = 'prowl' | 'hunt' | 'withdraw';

/** Patrols near a home point and hunts lone ships outside station security. */
export interface PirateBrain {
  kind: 'pirate';
  /** Where the patrol is centred. With `homeOrbit`, where it was last tick; the orbit wins. */
  home: Vec2;
  /**
   * A home that rides a rail, such as a point on the belt. Null or absent:
   * `home` is fixed in space.
   */
  homeOrbit?: Orbit | null;
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
  /** Missiles and torpedoes in flight. */
  munitions: Munition[];
  /** Countermeasures burning in space. */
  decoys: Decoy[];
  wrecks: Wreck[];
  loot: Loot[];
  weapons: Record<string, WeaponSpec>;
  goods: Record<string, GoodSpec>;
  /** Counter for unique ids of projectiles, wrecks and loot. */
  nextEntityId: number;
  stations: Record<string, Station>;
  /** The system's natural bodies, by id. Data, kept as saved. Empty in a flat sector. */
  bodies: Record<string, Body>;
  /** The belts' rocks. Generated once from a seed when the world is made, then kept as saved. */
  asteroids: Asteroid[];
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

export type DamageCause = 'weapon' | 'munition' | 'ram' | 'station' | 'surface';

/** Why a lock could not start. */
export type LockRefusal =
  | 'invalid' // no such ship, itself, or not flying
  | 'already' // already locked or locking it
  | 'maxLocks' // every lock slot in use
  | 'outOfRange' // beyond this ship's sensor range (no radar: everything is)
  | 'noComputer' // no targeting computer fitted
  | 'docked'; // this ship is docked

/** Why a lock was lost. */
export type LockLossReason = 'unlocked' | 'outOfRange' | 'targetGone' | 'docked';

export type WorldEvent =
  | { type: 'docked'; shipId: string; stationId: string; padId: string }
  | { type: 'undocked'; shipId: string; stationId: string }
  /** `noPad`: in range and slow enough, but no free pad fits the hull. */
  | { type: 'dockRefused'; shipId: string; reason: 'tooFar' | 'tooFast' | 'noPad' }
  /** A pilot bought a ship. `shipId` is the new ship, empty and docked at `stationId`. */
  | { type: 'shipBought'; shipId: string; stationId: string; loadoutId: string; price: number }
  /** A pilot moved aboard `shipId`. `from` is the ship they left (consumed if it was a pod). */
  | { type: 'boarded'; shipId: string; from: string }
  /** The ship a pilot was flying was destroyed and they got away in the pod `shipId`. */
  | { type: 'podEjected'; shipId: string; from: string }
  /** A pilot left `from` in space in the pod `shipId`; `from` is now empty where it was. */
  | { type: 'steppedOut'; shipId: string; from: string }
  /**
   * A pilot with no ship woke at a station, aboard `shipId`: a pod if they
   * own a ship somewhere, a free starter if they own none.
   */
  | { type: 'pilotWoke'; shipId: string; stationId: string }
  /** A pilot in a pod who owned no ship took the free starter `shipId`; the pod is gone. */
  | { type: 'starterClaimed'; shipId: string; stationId: string }
  | { type: 'flightModeChanged'; shipId: string; mode: FlightMode }
  | { type: 'weaponsHotChanged'; shipId: string; hot: boolean }
  /** `shipId` started locking `targetId`. */
  | { type: 'lockStarted'; shipId: string; targetId: string }
  /** `shipId` completed its lock on `targetId`. */
  | { type: 'locked'; shipId: string; targetId: string }
  /** `shipId` lost its lock on `targetId`: unlocked, out of sensor range, target gone or docked, or this ship docked. */
  | { type: 'lockLost'; shipId: string; targetId: string; reason: LockLossReason }
  /** `shipId` could not start a lock on `targetId`. */
  | { type: 'lockRefused'; shipId: string; targetId: string; reason: LockRefusal }
  /** A ship struck a station hull. `speed` is the closing speed at impact, units/s. */
  | { type: 'collided'; shipId: string; stationId: string; speed: number }
  /** A ship struck a body's surface or an asteroid (`bodyId` is then the asteroid's id). `speed` is the closing speed at impact, units/s. */
  | { type: 'impacted'; shipId: string; bodyId: string; speed: number }
  /** Two ships collided. `speed` is the closing speed at impact, units/s. */
  | { type: 'rammed'; shipId: string; by: string; speed: number }
  /** A ship took damage (after resistances). `by` is the ship responsible, or null for a station hull. */
  | { type: 'damaged'; shipId: string; by: string | null; amount: number; cause: DamageCause }
  /** A weapon ran dry: no rounds loaded and none in the hold. */
  | { type: 'outOfAmmo'; shipId: string; mountId: string }
  /** The capacitor is empty and an energy weapon could not fire. */
  | { type: 'capacitorEmpty'; shipId: string }
  | { type: 'fireGroupChanged'; shipId: string; group: number }
  /** A missile or torpedo left `shipId` for `targetId`. */
  | { type: 'munitionLaunched'; shipId: string; munitionId: string; targetId: string }
  /** A launcher on `shipId` would not fire: launchers need a complete lock to fire at. */
  | { type: 'launchRefused'; shipId: string; mountId: string; reason: 'noLock' }
  /** A munition heading for `shipId` turned onto one of its decoys. */
  | { type: 'munitionSpoofed'; shipId: string; munitionId: string; decoyId: string }
  /** A munition fired by `shipId` was shot down (`by` the shooter), burnt out or spent on a decoy (`by` null). */
  | { type: 'munitionDestroyed'; shipId: string; munitionId: string; by: string | null }
  /** `shipId` dropped a countermeasure from `mountId`. */
  | { type: 'countermeasureLaunched'; shipId: string; mountId: string; goodId: string }
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
