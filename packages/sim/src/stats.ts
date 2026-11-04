import { SHIELD_REGEN_DELAY } from './constants.js';
import type { HullBonus, HullSpec, ModuleSpec, MountPoint, ReadoutKind, Resistances, Ship, ShipStats, World } from './types.js';
import type { ModuleStat } from './types.js';

/**
 * Derived ship stats.
 *
 * A ship's performance is never stored. It is computed from its hull, the
 * modules fitted to it and the cargo aboard, every time it is needed, so
 * a refit or a change to a catalogue applies at once and a save can never
 * hold stale numbers.
 *
 *   mass       = hull + every module + cargo
 *   thrusts    = engines (main) and thruster packages (the rest)
 *   shields    = shield generators
 *   structure  = hull + armour
 *   cargo      = cargo pods
 *   power      = reactors (output) against everything else (draw)
 *   weapons    = weapon modules, one effective spec per mount
 *
 * Hull bonuses multiply what a matching module contributes, but only when
 * the module is the full size of its mount.
 */

/** The parts of a world stats are computed from. */
export type Catalogues = Pick<World, 'hulls' | 'modules' | 'weapons' | 'goods'>;

/** Readouts in a fixed order, so stats compare equal however the fit is ordered. */
const READOUT_ORDER: ReadoutKind[] = ['identity', 'motion', 'condition', 'combat', 'cargo', 'composition'];

const STAT_KEYS: ModuleStat[] = [
  'mainThrust',
  'reverseThrust',
  'lateralThrust',
  'rotationThrust',
  'powerOutput',
  'shield',
  'shieldRegen',
  'structure',
  'cargoCapacity',
  'sensorRange',
  'maxLocks',
  'scanResolution',
  'navHorizon',
];

/** Resistances layered: the stronger of each type wins (two armour plates do not stack). */
function bestOf(a: Resistances, b: Resistances): Resistances {
  const out: Resistances = { ...a };
  for (const [type, value] of Object.entries(b) as [keyof Resistances, number][]) out[type] = Math.max(out[type] ?? 0, value);
  return out;
}

/** Whether a hull bonus applies to this module on this mount. */
export function bonusApplies(bonus: HullBonus, module: ModuleSpec, mount: MountPoint): boolean {
  if (module.size !== mount.size) return false;
  if (bonus.kind && bonus.kind !== module.kind) return false;
  if (bonus.tag && !module.tags.includes(bonus.tag)) return false;
  return true;
}

/** Multiplier the hull gives `stat` for this module on this mount. Bonuses add. */
function multiplier(hull: HullSpec, stat: ModuleStat | 'damage', module: ModuleSpec, mount: MountPoint): number {
  let m = 1;
  for (const b of hull.bonuses) if (b.stat === stat && bonusApplies(b, module, mount)) m += b.amount;
  return m;
}

/**
 * Stats for a hull with a given fit and cargo mass. Modules on mounts the
 * hull does not have, and unknown module ids, are ignored. Used for live
 * ships and for outfitting previews.
 */
export function fitStats(cat: Catalogues, hull: HullSpec, fit: Readonly<Record<string, string>>, cargoMass = 0): ShipStats {
  const totals: Record<ModuleStat, number> = {
    mainThrust: 0,
    reverseThrust: 0,
    lateralThrust: 0,
    rotationThrust: 0,
    powerOutput: 0,
    shield: 0,
    shieldRegen: 0,
    structure: hull.structure,
    cargoCapacity: 0,
    // Sensing comes only from fitted systems: a bare hull is blind.
    sensorRange: 0,
    maxLocks: 0,
    scanResolution: 0,
    navHorizon: 0,
  };
  let mass = hull.mass + cargoMass;
  let powerDraw = 0;
  const weapons: ShipStats['weapons'] = {};
  const readouts = new Set<ReadoutKind>();
  let capacitorDraw = 0;
  let shieldResists: Resistances = {};
  let armourResists: Resistances = {};

  for (const mount of hull.mounts) {
    const id = fit[mount.id];
    const module = id ? cat.modules[id] : undefined;
    if (!module) continue;
    mass += module.mass;
    powerDraw += module.power;
    for (const stat of STAT_KEYS) {
      const value = module.stats[stat];
      if (value) totals[stat] += value * multiplier(hull, stat, module, mount);
    }
    for (const r of module.readouts ?? []) readouts.add(r);
    // Only a module the full size of its mount draws on the capacitor (docs/weapons.md).
    if (module.capacitorDraw && module.size === mount.size) capacitorDraw += module.capacitorDraw;
    if (module.resists) {
      if (module.kind === 'shieldGenerator') shieldResists = bestOf(shieldResists, module.resists);
      if (module.kind === 'armour') armourResists = bestOf(armourResists, module.resists);
    }
    const weapon = module.weaponId ? cat.weapons[module.weaponId] : undefined;
    if (weapon) weapons[mount.id] = { ...weapon, damage: weapon.damage * multiplier(hull, 'damage', module, mount) };
  }

  return {
    mass,
    mainThrust: totals.mainThrust,
    reverseThrust: totals.reverseThrust,
    lateralThrust: totals.lateralThrust,
    rotationThrust: totals.rotationThrust,
    maxSpeed: hull.maxSpeed,
    maxTurnRate: hull.maxTurnRate,
    radius: hull.radius,
    shield: totals.shield,
    shieldRegen: totals.shieldRegen,
    shieldRegenDelay: SHIELD_REGEN_DELAY,
    structure: totals.structure,
    // Whole units only: every unit of cargo takes one unit of space.
    cargoCapacity: Math.floor(totals.cargoCapacity + 1e-9),
    powerOutput: totals.powerOutput,
    powerDraw,
    sensorRange: totals.sensorRange,
    maxLocks: Math.floor(totals.maxLocks + 1e-9),
    scanResolution: totals.scanResolution,
    signature: hull.signature,
    readouts: READOUT_ORDER.filter((r) => readouts.has(r)),
    navHorizon: totals.navHorizon,
    weapons,
    capacitor: hull.capacitor,
    capacitorRecharge: hull.capacitorRecharge,
    capacitorDraw,
    shieldResists,
    armourResists,
  };
}

/** Mass the cargo adds to the ship. */
export function cargoMass(ship: Ship, goods: World['goods']): number {
  return Object.entries(ship.hold).reduce((m, [id, q]) => m + (goods[id]?.unitMass ?? 0) * q, 0);
}

/**
 * A ship's stats as it flies right now, cargo mass included. Throws on an
 * unknown hull: a ship without a hull is a broken world, not a game state.
 */
export function shipStats(cat: Catalogues, ship: Ship): ShipStats {
  const hull = cat.hulls[ship.hullId];
  if (!hull) throw new Error(`Unknown hull "${ship.hullId}" on ship "${ship.id}"`);
  return fitStats(cat, hull, ship.fit, cargoMass(ship, cat.goods));
}

/** Something a fit leaves the ship unable to do. */
export type FlightWarning = 'noMainThrust' | 'noTurning' | 'noWeapons';

/**
 * What a ship with these stats cannot do. A fit like this is allowed
 * (consequences are part of fitting) but the pilot should be told before
 * they undock in it.
 */
export function flightWarnings(stats: ShipStats): FlightWarning[] {
  const out: FlightWarning[] = [];
  if (stats.mainThrust <= 0) out.push('noMainThrust');
  if (stats.rotationThrust <= 0) out.push('noTurning');
  if (Object.keys(stats.weapons).length === 0) out.push('noWeapons');
  return out;
}
