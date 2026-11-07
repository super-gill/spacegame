import type { Vec2 } from './vec2.js';

/**
 * World state types.
 *
 * Everything in the world is plain data with no methods, so a save game is
 * `JSON.stringify(world)` and nothing else. The sim never holds references
 * to DOM, canvas, timers or input devices; it only ever sees a
 * `ShipInput` snapshot per tick.
 */

/** How big an unidentified contact looks: all the radar tells you about a ship running dark (colours.ts). */
export type ContactSize = 'small' | 'medium' | 'large';

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
/**
 * Mount types (docs/ship-systems.md). Budgeted by hull class: `weapon`,
 * `utility` (active kit), `internal` (passive kit), `bay` (cargo). Fixed,
 * one of each on every ship outside the budget: `nav`, `radar`,
 * `computer` (targeting), `flight` (flight computer), `podBay`,
 * `fireControl`, `engine` and `core` (reactor, thrusters).
 */
/**
 * Where a module can go (docs/fitting.md). Core systems, one of each:
 * `engine`, `core` (thrusters and the main reactor), `radar`, `computer`,
 * `nav`, `flight`, `podBay`, `fireControl`. Then the general tiers any
 * module of that tier can use: `high` does work on something else (guns,
 * launchers, mining lasers, tractor, charge rig); `mid` runs the ship's
 * own active systems (shields, afterburner, countermeasures, scanners,
 * hopper); `low` is passive (armour, cargo, drone bays, extra reactors).
 */
/**
 * Where a mount sits and what it takes. `ciws` is a close-in weapon system
 * hardpoint (docs/turrets.md): only medium hulls and up have them, so a
 * small ship cannot carry one whatever its slots.
 */
export type MountType = 'high' | 'mid' | 'low' | 'engine' | 'core' | 'radar' | 'computer' | 'nav' | 'flight' | 'podBay' | 'fireControl' | 'ciws';

/**
 * What a mount point provides to the module on it. A module lists the
 * services it needs and fits only where they are all provided.
 * - `power`: a power feed. Anything that draws power needs it.
 * - `heavyLoad`: a hardpoint rated for heavy, dense loads.
 * (Turrets no longer need a fire-control link on their mount: since 6f
 * any weapon mount takes one, and a fire-control computer directs them.)
 */
export type MountService = 'power' | 'heavyLoad';

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

/**
 * The powers of the setting (docs/lore.md, "The four powers"; Sol pivot,
 * 6 November 2026): Earth (with Luna), Mars, Venus and the Belt, plus the
 * Aurel, who are not a power but whose ships still carry their look.
 */
export type PowerId = 'earth' | 'mars' | 'venus' | 'belt' | 'aurel';

/** A ship or module maker. `power` is its home power, null for independents (Meridian, Paragon, Corvane). */
export interface ManufacturerSpec {
  id: string;
  name: string;
  power: PowerId | null;
}

/** The industry a hull is built for. Grows as industries arrive. */
export type HullRole = 'civilian' | 'combat' | 'transport' | 'development';

/**
 * A hull's class (docs/lore.md, "Hull classes"): what it was built as,
 * on the military or the civilian ladder; the fit says what it is now.
 * About role and scale, separate from module size, which is what fits a
 * mount. Pods, drones and the Aurel sit outside both ladders.
 */
export type HullClass =
  // Outside the ladders.
  | 'pod'
  | 'drone'
  | 'aurel'
  // The military ladder, smallest first (docs/lore.md, "Hull classes").
  | 'corvette'
  | 'patrolBoat'
  | 'frigate'
  | 'destroyer'
  | 'cruiser'
  | 'battleship'
  | 'carrier'
  | 'dreadnought'
  // The civilian ladder: the classes today's hulls use; more arrive with their hulls.
  | 'prospector'
  | 'miner'
  | 'freighter'
  | 'barge';

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
 * carry bonuses to one. `pointDefence` is close-in weapon systems
 * (CIWS): very fast, short-ranged turrets on their own hardpoints that
 * shoot down munitions first, and ships when weapons are hot.
 */
export type WeaponFamily = 'projectile' | 'energy' | 'hybrid' | 'missile' | 'pointDefence' | 'countermeasure' | 'mining';

/**
 * How valuable an ore is, broadly (docs/mining.md, "Ores"). A survey
 * scanner reports a rock by the best tier it holds.
 */
export type OreTier = 'common' | 'middling' | 'valuable' | 'rare';

/**
 * An ore good: how it turns up in rocks. The ore catalogue is just the
 * goods with this block, so a new ore is a new good and nothing else:
 * rocks made from then on can hold it.
 * - `chance`: of a rock at least `minRadius` across holding any.
 * - `share`: of such a rock's ore that is this one, 0 to 1. A rock's
 *   common ore makes up whatever the others leave.
 * Common ores have chance 1 and share 0: every rock is mostly common ore.
 */
export interface OreSpec {
  tier: OreTier;
  chance: number;
  share: number;
  minRadius: number;
}

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
  | 'navHorizon'
  /** How well the flight computer flies the hull, 0 to 1: mouse steering and assist. Zero: no computer, manual on the keys. */
  | 'flightControl'
  /** How many CIWS the fire-control computer can direct at once. */
  | 'turretControl'
  /** Fire control's tracking: a multiplier on CIWS' slew rate (best fitted, not summed). */
  | 'turretTracking'
  /** A pod bay: 1 if the ship carries an escape pod. */
  | 'escapePod'
  /** Tractor reach from the ship's centre, units. */
  | 'tractorRange'
  /** How fast the tractor draws loot in, units/s. */
  | 'tractorPull'
  /** Afterburner: extra speed cap while lit, as a share of top speed. */
  | 'afterburnerSpeed'
  /** Afterburner: extra main thrust while lit, as a share of main thrust. */
  | 'afterburnerThrust'
  /** Afterburner: capacitor burnt per second while lit. */
  | 'afterburnerDraw'
  /** Survey scanner: how far a pulse reaches, units. */
  | 'surveyRange'
  /** Survey scanner: capacitor spent per pulse. */
  | 'surveyCost'
  /** Survey scanner: 1 tells rich rocks from common ones; 2 names the best tier a rock holds. */
  | 'surveyGrade'
  /** An ore hopper's grade: 1 drops one ore, 2 sorts by a list, 3 also trades up when the ore hold is full. */
  | 'hopperGrade'
  /** Ore hopper: hold space only ore may use, units. */
  | 'oreCapacity'
  /** Drone bay: drones it holds, and how many can be out at once. */
  | 'droneCapacity'
  | 'droneControl'
  /** Drone bay: how far from the mother ship its drones will work, units. */
  | 'droneRange'
  /** Breach charger: how close to a breach point a charge must sit to count, radians round the rock. */
  | 'breachTolerance'
  /** Signature this module adds to the hull's. Absent: the default for its kind and size (`KIT_SIGNATURE`). */
  | 'signature';

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
  | 'countermeasure'
  | 'flightComputer'
  | 'podBay'
  | 'fireControl'
  | 'tractor'
  | 'afterburner'
  | 'surveyScanner'
  | 'oreHopper'
  | 'droneBay'
  | 'breachCharger';

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
 * - `composition`: what a locked rock is made of, and how hard it is (a mining computer).
 */
export type ReadoutKind = 'identity' | 'motion' | 'condition' | 'combat' | 'cargo' | 'composition' | 'core';

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
  /**
   * Shield generators only: how wide the shield wraps round the hull,
   * radians, centred on the bow. Never all the way round: the main drive
   * has to fire through the stern, so the stern stays open (docs/weapons.md,
   * "Shield arcs").
   */
  shieldArc?: number;
  /** Shield generators only: seconds after a hit before the shield starts to recharge. */
  shieldRegenDelay?: number;
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
  source: 'role' | 'power';
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
  power: PowerId | null;
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
  /**
   * How freely its thrusters may push it backwards and sideways, as a
   * share of top speed (0 to 1), whatever `WorldRules.manoeuvreSpeed`
   * says: the higher of the two applies. Absent is 0, the world rule
   * alone. Drones are 1: small craft working among rocks back off and
   * sidestep like a ship with thrusters (Jason, 6 November 2026).
   */
  manoeuvre?: number;
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
  /**
   * A mining hull's built-in ore hold, units (docs/mining.md, "Holds"):
   * ore goes here and only here, never into cargo pods. Absent or 0: no
   * ore hold, and ore is ordinary cargo.
   */
  oreHold?: number;
}

/** A named fit for a hull. NPC spawners and new pilots are built from these. */
export interface Loadout {
  id: string;
  name: string;
  hullId: string;
  /** Mount id to module id. Mounts left out are empty. */
  fit: Record<string, string>;
  /** Drones a ship of this loadout comes with, stowed in its bay. Absent: none. */
  drones?: { loadoutId: string; count: number };
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
  /** The hull's own manoeuvring share (`HullSpec.manoeuvre`, 0 if none); see `manoeuvreShare`. */
  manoeuvre: number;
  radius: number;
  shield: number;
  /** Shield recharge, points per second, once recharging. */
  shieldRegen: number;
  /** Seconds after taking damage before shields start recharging. */
  /** Flight computer quality, 0 to 1; 0 with none (manual on the keys, no mouse steering, no assist). */
  flightControl: number;
  /** CIWS fire control can direct; others stay idle. */
  turretControl: number;
  /** Multiplier on CIWS' slew rate from fire control; 0 with none. */
  turretTracking: number;
  /** True with a pod bay: the pilot escapes in a pod when the ship is lost. */
  escapePod: boolean;
  /** Tractor reach, units; 0 with no tractor. */
  tractorRange: number;
  /** Tractor pull speed, units/s. */
  tractorPull: number;
  /** Afterburner effects while lit; zero with none. */
  afterburnerSpeed: number;
  afterburnerThrust: number;
  afterburnerDraw: number;
  /** Survey scanner: reach, capacitor per pulse, and grade (0 with none). */
  surveyRange: number;
  surveyCost: number;
  surveyGrade: number;
  /** The best ore hopper fitted: 0 none, 1 drops one ore, 2 sorts by a list, 3 also trades up when full. */
  hopperGrade: number;
  /** Hold space only ore may use, from ore hoppers (and later ore holds), on top of `cargoCapacity`. */
  oreCapacity: number;
  /** Drone bays: drones held, drones out at once, and how far they work from the ship (docs/drones.md). */
  droneCapacity: number;
  droneControl: number;
  droneRange: number;
  /** Breach chargers (docs/mining.md, "Breaching"): how close to a breach point a charge counts, radians; 0 with none. */
  breachTolerance: number;
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
  /**
   * How big this ship looks to other ships' sensors and guns: the hull's
   * signature plus what its kit adds (`KIT_SIGNATURE`), bloomed while an
   * afterburner burns (`shipStats` only). Sets lock time against it.
   */
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
  /** Width of the shield's cover, radians, centred on the bow: the widest fitted generator's. Zero with none. */
  shieldArc: number;
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
  /** Ores only: how it turns up in rocks (docs/mining.md). */
  ore?: OreSpec;
  /**
   * Drones only (docs/drones.md): buying one puts a drone of this loadout
   * straight into the ship's drone bay instead of the hold; selling takes
   * one from the bay.
   */
  drone?: { loadoutId: string };
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
 * How a weapon aims (docs/turrets.md).
 * - `turret`: turns on its own towards its lock at its traverse
 *   (`turretTurnRate`), inside its mount's arc. Every main gun is one and
 *   fires on the trigger when it bears; CIWS and mining turrets fire by
 *   themselves.
 * - `fixed`: fires along the ship's heading. Only launchers, dispensers
 *   and light mining lasers.
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
  /**
   * Mining lasers only (family `mining`, docs/mining.md). A beam along the
   * nose while the trigger is held, out to `range`: it cuts a rock no
   * harder than `strength` (0 to 1), freeing `damage` units of ore a
   * second, and draws `capacitorPerShot` from the capacitor every second.
   * It does nothing to ships.
   */
  mining?: { strength: number };
  /**
   * Shot guns (docs/turrets.md, "Range"): the half angle, radians, of the
   * cone each shot leaves in, so how far it misses grows with range.
   * Absent: dead straight.
   */
  spread?: number;
  /** Lasers: damage falls with how far the shot has flown (`RangeFalloff`). Absent: full damage all the way. */
  falloff?: RangeFalloff;
}

/**
 * Damage falling with range: full out to `from` of the weapon's range,
 * then in a straight line down to `floor` of it at full range.
 */
export interface RangeFalloff {
  from: number;
  floor: number;
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
  /** Ticks it was fired with (its full range), for range falloff. Absent on older shots. */
  lifeTicks?: number;
  /** Its weapon's falloff, if any: damage when it lands depends on how far it flew. */
  falloff?: RangeFalloff;
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
  /**
   * Part of a cache someone left (docs/mining.md, "Caches"): it lasts
   * longer and shows on its owner's radar. Anyone can still scoop it.
   * `ownerId` is the pilot, or the ship for an NPC. Absent: plain loot.
   */
  cache?: { ownerId: string };
  /**
   * The ship whose ore hopper spat this out (its filter's ore). That
   * ship's tractor leaves it alone while the filter stays on this ore.
   * Absent: nobody's reject.
   */
  ejectedBy?: string;
  /**
   * Who it belongs to (`lootClaim`): whoever freed it (their laser, their
   * drones, their breach), killed the ship it spilled from, or cached it.
   * The pilot, or the ship for an NPC. A tractor set to take only its own
   * leaves other people's alone. Absent: nobody's.
   */
  claim?: string;
  /** Thrown out of a hold on purpose (`ShipInput.jettison`): the ship that did it will not take it back unless its tractor takes ALL. */
  jettisoned?: true;
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
  /** Utility mounts whose module is switched on (a tractor left running). Absent: none. */
  switchedOn?: string[];
  /** True on ticks the afterburner is lit. Absent: not lit. */
  afterburning?: boolean;
  /**
   * Mining lasers running this tick, for drawing: each beam's mount, how
   * long it reached, the rock it touched (null: none in range) and
   * whether it is cutting (false: the rock is too hard). Absent: none.
   */
  beams?: MiningBeam[];
  /** The last survey pulse, which the HUD shows for a few seconds (docs/mining.md). Absent: none yet. */
  survey?: SurveyResult;
  /**
   * An ore hopper's sorting (docs/mining.md, "Holds"): the ores it spits
   * back out astern instead of keeping. `off` keeps the list but takes
   * everything for now. A small hopper drops at most one ore. Absent:
   * takes everything.
   */
  hopper?: { drop: string[]; off?: true };
  /**
   * What its tractor takes: absent, its own loot and loot nobody has a
   * claim on (`Loot.claim`); `all`, anything in reach, other people's
   * too. Set from the tractor's tile.
   */
  tractorMode?: 'all';
  /** Drones stowed in its drone bay (docs/drones.md). Drones out are ships with `motherId` set. Absent: none. */
  droneBay?: StoredDrone[];
  /** For a drone: the ship that carries and commands it. Absent: not a drone. */
  motherId?: string;
  /** For a drone: its id in the mother's bay, kept while it is out. */
  droneId?: string;
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
  /**
   * Running dark: the Registry beacon is off (colours.ts), so others see
   * this ship only as a radar contact until they lock and identify it.
   * Absent: showing colours, the default. Read through `runsDark`.
   */
  dark?: true;
  /**
   * Set only in a pilot's view (view.ts), never in the world: this is a
   * ship running dark that the pilot has not identified. Everything but
   * where it is and how it moves is held back: `hullId` is empty, the
   * fit, weapons, hold, owner and condition are blank. Draw and list it
   * as a contact of this size.
   */
  contact?: ContactSize;
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
  /**
   * Held still at `phase`: no motion, no velocity. Set for every orbit by
   * the orbits rule (`WorldRules.orbits`, rails.ts `setOrbitsMoving`).
   */
  frozen?: boolean;
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
  /**
   * What it holds: ore good id to whole units left (docs/mining.md). A
   * rock with nothing left crumbles away.
   */
  contents: Record<string, number>;
  /** How hard it is to cut, 0 to 1: a mining laser needs at least this strength. Big rocks are harder. */
  hardness: number;
  /** Ore cut free but not yet released as a canister, units. Absent: none. */
  cut?: number;
  /** Ore already released, by good id, so a laser keeps to the rock's mix. Absent: none yet. */
  mined?: Record<string, number>;
  /** The field it belongs to, which tops it back up (`ROCK_FIELDS`). */
  field: string;
  /**
   * A sealed gate-glass core (big rocks only, some of them): how much
   * glass, and the breach points, as bearings round the rock from its
   * centre. Breaching it with charges on those points splits the rock and
   * exposes the core. `fractured`: a cracked core that yields half its
   * glass however well it is breached. Absent: none.
   */
  core?: { glass: number; points: number[]; fractured?: true };
  /**
   * Pushed off its track by a blast: it moves `offset` from where its
   * orbit puts it, easing out from `fromTick` to a stop at `toTick`, and
   * keeps that offset afterwards. Absent: it sits on its track.
   */
  drift?: { offset: Vec2; fromTick: number; toTick: number };
  /** Exposed gate-glass: brittle. A laser stronger than `FRAGILE_STRENGTH` shatters what it cuts. */
  fragile?: true;
  /** An exposed core degrades: at this tick it collapses and its glass is lost. Absent: it lasts. */
  expiresTick?: number;
}

/** A breach charge stuck to a rock, waiting to be set off by the ship that planted it. */
export interface PlantedCharge {
  id: string;
  shipId: string;
  rockId: string;
  /** Where on the rock: a bearing from its centre, radians. */
  bearing: number;
}

/** A mining laser running this tick (`Ship.beams`). */
export interface MiningBeam {
  mountId: string;
  /** World bearing, radians. */
  bearing: number;
  /** How far the beam reached, units from the ship's centre. */
  length: number;
  rockId: string | null;
  cutting: boolean;
  /** True while it bites the rock's seam, for half as much ore again. */
  onSeam?: boolean;
}

/** What a survey pulse found: each rock in reach that is worth reporting, and what the scanner could tell. */
export interface SurveyResult {
  /** Tick of the pulse. */
  tick: number;
  /** Where the ship was. */
  origin: Vec2;
  range: number;
  /**
   * Rocks found, by id, with what the scanner says: `common` for plain
   * rock, `rich` for something better (a grade-1 scanner), or the best
   * tier it holds (grade 2).
   */
  rocks: { id: string; reading: OreTier | 'rich' }[];
}

/** Belt respawn bookkeeping (asteroids.ts `stepRockfall`). */
export interface Rockfall {
  /** Rocks made since the world began, for unique ids and seeds. */
  made: number;
  /** Ticks until the next check. */
  timerTicks: number;
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
   * What the pilot keeps at stations, by station id then item id to
   * count: modules not fitted, and goods moved out of a hold
   * (`hangar.ts`). One storage per station for both (docs/fitting.md);
   * module and good ids never clash. Items stay where they were left.
   */
  storage: Record<string, Record<string, number>>;
  /**
   * Logged off (docs/shared-world.md, decision 1): when, by tick. Absent
   * while the pilot is playing. A pilot away long enough has their ship
   * taken out of space (`stowed`) until they return (`away.ts`).
   */
  away?: { sinceTick: number };
  /** The ship this pilot was flying when they logged off, out of the world until they return; its drones back in its bay. */
  stowed?: Ship;
  /**
   * The fight this pilot is in, in the Arena world only (arena.ts,
   * docs/worlds.md). Absent: at the arena setup, or not in the Arena.
   */
  arena?: ArenaState;
}

/**
 * An arena scenario (docs/worlds.md, "Scenarios"). Skirmish for now:
 * `count` ships of the reference fit `enemyFit`. Waves and To the death
 * join it later as further kinds.
 */
export interface ArenaScenario {
  kind: 'skirmish';
  enemyFit: string;
  count: number;
}

/** A running arena: the pilot's ship there, where it is, what was chosen, and, once decided, how it ended and when. */
export interface ArenaState {
  shipId: string;
  centre: Vec2;
  /** The reference fit the pilot flies. */
  fit: string;
  scenario: ArenaScenario;
  /** Set when the fight is decided; the arena clears `ARENA_END_DELAY_SECONDS` later (`stepArenas`). */
  over?: { result: 'won' | 'lost'; atTick: number };
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
  /**
   * Mouse steering: the world bearing the pilot wants the nose on, or
   * null. When set, the flight computer turns the hull to it and brakes
   * into it with the rotation thrusters, in every flight mode, as
   * Flatspace's gyro cursor does; held turn keys still win. NPCs leave it
   * null and steer with the turn keys.
   */
  aimHeading: number | null;
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
   * Edge-triggered: switch the active module on this mount on or off (a
   * tractor), or fire it once (a dispenser drops a charge). Null for
   * none. The HUD's numbered tiles send this (`activationSlots`).
   */
  toggleModule: string | null;
  /** Held: light the afterburner, if one is fitted and the capacitor can pay. */
  afterburner: boolean;
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
  /** Edge-triggered: switch the Registry beacon, showing colours or running dark (colours.ts). Absent: no change. */
  toggleColours?: boolean;
  /** Run the tractor beam to pull in nearby loot. */
  tractor: boolean;
  /** A command for this ship's drones (the drone manager), or null. */
  droneCommand?: DroneCommand | null;
  /**
   * Edge-triggered: drop the ore aboard as a cache, and mark the loose ore
   * canisters near the ship as part of it (docs/mining.md, "Caches").
   */
  dropCache: boolean;
  /** Edge-triggered: throw this good's whole stack out astern, for anyone to take. In space only. */
  jettison?: string | null;
  /**
   * Set the ore hopper's list of ores to spit out (and switch sorting on).
   * A small hopper takes at most one. Null or absent: no change.
   */
  hopperDrop?: string[] | null;
}

/**
 * NPC brains. Plain data, stored in `World.npcs` keyed by the ship the
 * brain flies, so NPC state saves and loads with the world like anything
 * else. The behaviour lives in `ai/`.
 */
export type NpcBrain = TraderBrain | PirateBrain | WatchBrain | DroneBrain | MinerBrain | ArenaBrain;

/**
 * An arena enemy (admin testing, `adminArena`, ai/arena.ts): it fights the
 * ship the pilot who started the arena is flying, the way the fitting lab
 * flies its skirmishes, and nothing else.
 */
export interface ArenaBrain {
  kind: 'arena';
  /** The pilot whose arena this is. */
  pilotId: string;
  /** Its attack-run state while it makes passes at a bigger ship. */
  run?: RunState;
}

/**
 * An NPC miner (ai/miner.ts, docs/mining.md): works the belt round
 * `field` (a station), cutting rocks its lasers can take, and hauls the
 * ore to `market` when full. A prospector cuts with its own laser; a hulk
 * locks rocks, assigns its turrets and flies its drones. Skin-deep for
 * now: what it sells pays nobody (the economy milestone changes that).
 */
export interface MinerBrain {
  kind: 'miner';
  /** The station whose belt it works. */
  field: string;
  /** The station it sells at. */
  market: string;
  mode: 'docked' | 'outbound' | 'mining' | 'inbound';
  /** Ticks left to wait while docked. */
  waitTicks: number;
  /** The rock it is working towards or cutting, or null. */
  rockId: string | null;
  /** Ticks in the current mode, for patience. */
  modeTicks: number;
  path?: Vec2[];
  goal?: Vec2;
  planTick?: number;
}

/**
 * A drone flies itself (docs/drones.md, ai/drone.ts): it works rocks its
 * mother ship has locked, or the one it was sent to, and comes home when
 * recalled, out of range, or with nothing to do.
 */
export interface DroneBrain {
  kind: 'drone';
  motherId: string;
  mode: 'work' | 'return';
  /** The rock it is working, or null. */
  rockId: string | null;
  /** A rock the mother sent it to; it keeps to it while the rock stays locked. Null: it chooses. */
  sentRockId: string | null;
  /** The way it is flying: waypoints to `goal` (ai/path.ts), planned at `planTick`. Absent: none yet. */
  path?: Vec2[];
  goal?: Vec2;
  planTick?: number;
}

/** A drone in a bay: which drone it is, and how much structure it has left. */
export interface StoredDrone {
  id: string;
  loadoutId: string;
  structure: number;
}

/** What a pilot tells its drones (the drone manager). Without `droneId`, launch and recall mean all of them; `send` takes the next drone working on its own. */
export interface DroneCommand {
  action: 'launch' | 'recall' | 'send';
  droneId?: string;
}

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
  /** Its attack run, while engaged. */
  attack?: RunState;
}

export type PirateMode = 'prowl' | 'hunt' | 'withdraw';

/**
 * Where a fighting NPC is in its attack run (ai/steer.ts `attackRun`):
 * coming in nose-on and firing, or breaking away past its target to come
 * round again. Absent on brains saved before runs existed: they start on
 * an attack.
 */
export interface RunState {
  run: 'attack' | 'break';
  /** Ticks into the current part of the run. */
  runTicks: number;
  /** World bearing it extends along while breaking, radians. */
  breakHeading: number;
}

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
  /**
   * A breach's signature bloom it saw: it flies there (when not hunting)
   * and hunts whatever it finds. Cleared on arrival.
   */
  drawnTo?: Vec2 | null;
  /** Its attack run, while hunting. */
  attack?: RunState;
}

/**
 * Switches for mechanics under trial, kept in the world so a save keeps
 * them and every system reads the same answer. Changed only through
 * admin commands (pilots.ts).
 */
export interface WorldRules {
  /**
   * Bodies pull ships, shots, munitions' wrecks and loot (rails.ts
   * `gravityAt`). Off by default since the 4 November 2026 playtest: at
   * these speeds it cost attention without giving real orbits. Bodies
   * still ride their rails, carry what is in their spheres, and have
   * solid surfaces either way.
   */
  gravity: boolean;
  /**
   * Bodies, stations, the belt's rocks and the pirate's home move on their
   * orbits. Off by default since the 4 November 2026 playtest: with no
   * gravity there was no natural way to match a moving station. Off,
   * every orbit is frozen where it stands (`Orbit.frozen`); switch it
   * only with rails.ts `setOrbitsMoving`, which keeps everything in place.
   */
  orbits: boolean;
  /**
   * How fast thrust can push a ship sideways or backwards, as a share of
   * its top speed (0 to 1). Forward, thrust reaches top speed as ever. At
   * 0 the ship only flies where its nose points, as in Flatspace; at 1,
   * any direction alike. Set by the 4 November 2026 playtest to stop
   * ships holding their bows on each other while sliding round: to
   * reposition, a ship has to turn and burn. Momentum is never cut, only
   * thrust: a ship that turns at speed keeps its drift.
   */
  manoeuvreSpeed: number;
}

export interface World {
  /** Mechanics under trial (see `WorldRules`). */
  rules: WorldRules;
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
  /** Breach charges planted on rocks (docs/mining.md, "Breaching"). Absent: none. */
  charges?: PlantedCharge[];
  wrecks: Wreck[];
  loot: Loot[];
  weapons: Record<string, WeaponSpec>;
  goods: Record<string, GoodSpec>;
  /** Counter for unique ids of projectiles, wrecks and loot. */
  nextEntityId: number;
  stations: Record<string, Station>;
  /** The system's natural bodies, by id. Data, kept as saved. Empty in a flat sector. */
  bodies: Record<string, Body>;
  /** The belts' rocks. Generated once from a seed when the world is made, then mined, crumbled and topped up. */
  asteroids: Asteroid[];
  /** Belt respawn state. Absent: none made yet. */
  rockfall?: Rockfall;
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

export type DamageCause = 'weapon' | 'munition' | 'ram' | 'station' | 'surface' | 'blast';

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
  /** Admin (testing): credits from nothing. `shipId` is the pilot's ship, or empty. */
  | { type: 'adminCreditsGranted'; shipId: string; pilotId: string; amount: number }
  /** Admin (testing): a ship from any loadout, free, docked here. */
  | { type: 'adminShipSpawned'; shipId: string; stationId: string; loadoutId: string }
  /** An arena started: the pilot is in `shipId` facing `enemies` ships. */
  | { type: 'arenaStarted'; shipId: string; enemies: number }
  /** A pilot's arena ended and they are back at the setup: they `won` (every enemy gone), `lost` their ship, or `left`. `shipId` is the arena ship, now gone. */
  | { type: 'arenaEnded'; shipId: string; pilotId: string; result: 'won' | 'lost' | 'left' }
  /** Admin (testing): a world rule switched. `shipId` is the pilot's ship, or empty. */
  | { type: 'adminRuleChanged'; shipId: string; rule: keyof WorldRules; value: boolean | number }
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
  | { type: 'coloursChanged'; shipId: string; dark: boolean }
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
  /** `unshielded`: the hit came in through the open stern, past the shield. */
  | { type: 'damaged'; shipId: string; by: string | null; amount: number; cause: DamageCause; unshielded?: true }
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
  /** A survey pulse went out and found `found` rocks worth reporting. */
  | { type: 'surveyed'; shipId: string; found: number }
  /** A survey pulse could not go: the capacitor cannot pay, or the scanner is still cycling. */
  | { type: 'surveyRefused'; shipId: string; reason: 'capacitor' | 'cycling' }
  /** A mining laser touched a rock too hard for it. Once per rock per run of the beam. */
  | { type: 'miningTooHard'; shipId: string; rockId: string }
  /** A mining laser freed a canister of ore. */
  | { type: 'oreFreed'; shipId: string; rockId: string; item: string; amount: number }
  /** A ship left a cache of `units` units of ore (its hold's and loose canisters nearby). */
  | { type: 'cacheDropped'; shipId: string; units: number }
  /** Drones went out of, or came back into, a mother ship's bay. */
  | { type: 'dronesLaunched'; shipId: string; droneIds: string[] }
  | { type: 'droneStowed'; shipId: string; droneId: string }
  /** A drone was lost: destroyed, or left out when its mother docked or was destroyed. */
  | { type: 'droneLost'; shipId: string; droneId: string; reason: 'destroyed' | 'leftBehind' }
  /** A drone command could not be carried out. */
  | { type: 'droneRefused'; shipId: string; reason: 'noBay' | 'noneStowed' | 'control' | 'noRock' | 'docked' }
  /** A breach charge was planted on a rock. */
  | { type: 'chargePlaced'; shipId: string; rockId: string; placed: number }
  /** A breach charge could not be planted or set off. */
  | { type: 'chargeRefused'; shipId: string; reason: 'noCharges' | 'noRock' | 'tooFar' | 'tooClose' | 'tooSmall' }
  /**
   * Charges went off and broke a rock: into `chunks` pieces, and with a
   * core, `glass` units of gate-glass exposed from `quality` (the share of
   * breach points charged). Its signature bloom draws pirates from far off.
   */
  | { type: 'breached'; shipId: string; rockId: string; position: Vec2; chunks: number; glass: number; quality: number }
  /** A laser too strong for gate-glass shattered what it cut. */
  | { type: 'glassShattered'; shipId: string; rockId: string; amount: number }
  /** An exposed core degraded and collapsed; its glass is gone. */
  | { type: 'coreCollapsed'; rockId: string; /** Nobody: always ''. */ shipId: string; amount: number }
  /** A mining turret was given a rock to cut (its tile, with the rock as the active lock), or let go of one (null). */
  | { type: 'laserAssigned'; shipId: string; mountId: string; rockId: string | null }
  /** An ore hopper took in a canister of its filtered ore and spat it out astern. */
  | { type: 'oreEjected'; shipId: string; item: string; amount: number }
  /** An ore hopper's filter changed: the ore the tractor now leaves behind, or null for none. */
  | { type: 'hopperFilterChanged'; shipId: string; drop: string[]; on: boolean }
  /** A full ore hold with a large hopper took better ore in and spat `dropped` of its cheapest ore out. */
  | { type: 'oreTradedUp'; shipId: string; item: string; dropped: string; amount: number }
  /** A stack thrown out of the hold. */
  | { type: 'jettisoned'; shipId: string; item: string; amount: number }
  | { type: 'jettisonRefused'; shipId: string; reason: 'notHeld' | 'docked' }
  /** Goods moved between a docked ship's hold and the pilot's storage at that station. */
  /** Modules bought straight into storage at a station. */
  | { type: 'moduleBought'; shipId: string; stationId: string; moduleId: string; quantity: number; cost: number }
  | { type: 'goodsStored'; shipId: string; stationId: string; good: string; quantity: number }
  | { type: 'goodsTaken'; shipId: string; stationId: string; good: string; quantity: number }
  /** A tractor's tile changed what it does: off, taking only its own loot, or taking everything. */
  | { type: 'tractorModeChanged'; shipId: string; mode: 'off' | 'mine' | 'all' }
  /** A rock was mined out and crumbled; `shipId` mined the last of it. */
  | { type: 'rockCrumbled'; shipId: string; rockId: string }
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
