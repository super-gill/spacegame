import { goodsFitting } from './goods.js';
import { FIT_FEE_FRACTION, MODULE_RESALE_FRACTION } from './constants.js';
import { cargoMass, fitStats, type Catalogues } from './stats.js';
import { cargoUsed } from './trade.js';
import type { HullSpec, ModuleSpec, MountPoint, Pilot, Ship, ShipStats, WeaponState, World, WorldEvent } from './types.js';

/**
 * Fitting: putting modules on mounts and taking them off.
 *
 * The rules, in the order they are checked:
 *   1. The pilot has a ship, docked at a station with outfitting, and the
 *      hull is not sealed.
 *   2. The module goes only on a mount of a type it lists, no bigger
 *      than the mount, where the mount provides every service it needs.
 *   3. After the change, total power draw is within reactor output and
 *      the cargo aboard still fits.
 *   4. The pilot can pay.
 *
 * Modules are owned. A module the pilot has in storage at this station
 * is fitted from there; otherwise it is bought new. Unfitting puts the
 * module into storage at this station. Fitting and unfitting each cost a
 * small handling fee (FIT_FEE_FRACTION of the module's price), so
 * swapping between owned modules is cheap but not free. Stored modules
 * can be sold back to the station.
 *
 * These are pilot commands, like trading: a person asks once, the sim
 * checks and applies it, and over a network they become requests.
 * Credits and storage belong to the pilot; the fit belongs to the ship.
 */

export type FitRefusal =
  | 'noShip' // the pilot has no ship
  | 'notDocked' // the ship is not docked
  | 'noOutfitting' // this station cannot refit ships
  | 'sealed' // the hull cannot be refitted
  | 'unknownMount' // the hull has no such mount
  | 'unknownModule' // no such module
  | 'wrongMount' // the module does not go on this type of mount
  | 'tooBig' // the module is larger than the mount
  | 'missingService' // the mount lacks a service the module needs
  | 'alreadyFitted' // that exact module is already there
  | 'emptyMount' // nothing to remove
  | 'power' // the fit would draw more power than the reactors make
  | 'cargo' // the cargo aboard would no longer fit
  | 'credits' // not enough credits
  | 'notStored'; // no such module in storage here

const SIZE_ORDER = { S: 0, M: 1, L: 2, XL: 3 } as const;

/** Whether a module can physically go on a mount: type, size and services. Null if it can. */
export function mountRefusal(mount: MountPoint, module: ModuleSpec): FitRefusal | null {
  if (!module.mounts.includes(mount.type)) return 'wrongMount';
  if (SIZE_ORDER[module.size] > SIZE_ORDER[mount.size]) return 'tooBig';
  if (!module.needs.every((s) => mount.services.includes(s))) return 'missingService';
  return null;
}

/** Credits a station pays for a stored module sold back to it. */
export function resaleValue(module: ModuleSpec): number {
  return Math.floor(module.price * MODULE_RESALE_FRACTION);
}

/** Handling fee for fitting or unfitting a module, in whole credits. */
export function fitFee(module: ModuleSpec): number {
  return Math.ceil(module.price * FIT_FEE_FRACTION);
}

/** How many of `moduleId` the pilot has stored at `stationId`. */
export function storedCount(pilot: Pilot, stationId: string, moduleId: string): number {
  return pilot.storage[stationId]?.[moduleId] ?? 0;
}

/** The pilot with `delta` of a module added to (or taken from) storage at a station. Empty entries are removed. */
function withStored(pilot: Pilot, stationId: string, moduleId: string, delta: number): Pilot {
  const here = { ...(pilot.storage[stationId] ?? {}) };
  const n = (here[moduleId] ?? 0) + delta;
  if (n > 0) here[moduleId] = n;
  else delete here[moduleId];
  const storage = { ...pilot.storage };
  if (Object.keys(here).length > 0) storage[stationId] = here;
  else delete storage[stationId];
  return { ...pilot, storage };
}

/**
 * Live weapon states for a fit: one per weapon module, in mount order.
 * A mount whose module is unchanged keeps its cooldown and aim; a new
 * weapon starts ready, pointing along the heading.
 */
export function weaponStatesFor(
  cat: Pick<Catalogues, 'modules'> & Partial<Pick<Catalogues, 'weapons' | 'goods'>>,
  hull: HullSpec,
  fit: Readonly<Record<string, string>>,
  heading: number,
  previous: { fit: Readonly<Record<string, string>>; weapons: readonly WeaponState[] } | null = null,
): WeaponState[] {
  const states: WeaponState[] = [];
  for (const mount of hull.mounts) {
    const id = fit[mount.id];
    if (!id || !cat.modules[id]?.weaponId) continue;
    const kept = previous && previous.fit[mount.id] === id ? previous.weapons.find((w) => w.mountId === mount.id) : undefined;
    // A new weapon starts loaded (the fitter loads it) in its default group:
    // 1 for fixed guns, 2 for launchers; turrets and dispensers need none.
    // A dispenser comes with its maker's mix; a launcher with the cheapest
    // munition that fits it; a gun with its slot's plain ammunition.
    const module = cat.modules[id]!;
    const weapon = cat.weapons?.[module.weaponId!];
    if (kept) {
      states.push(kept);
      continue;
    }
    const magazine = weapon?.magazine ?? 0;
    const slot = weapon?.ammo ?? null;
    let loaded = magazine;
    let loadedGood: string | null | undefined;
    if (slot && cat.goods) {
      loadedGood = module.startsLoadedWith ?? (cat.goods[slot] ? slot : (goodsFitting(cat.goods, slot)[0]?.id ?? null));
      // Whole boxes, at least one.
      const perBox = loadedGood ? (cat.goods[loadedGood]?.ammo?.perUnit ?? 1) : 1;
      loaded = loadedGood ? Math.max(1, Math.floor(magazine / perBox)) * perBox : 0;
    }
    states.push({
      mountId: mount.id,
      cooldownTicks: 0,
      aim: heading,
      loaded,
      ...(loadedGood !== undefined ? { loadedGood } : {}),
      reloadTicks: 0,
      group: weapon?.family === 'missile' ? 2 : weapon?.family === 'mining' ? 3 : 1,
    });
  }
  return states;
}

/** What a refit would do, without doing it. */
export type RefitPlan =
  | {
      ok: true;
      ship: Ship;
      /** The pilot after paying and after storage changes. */
      pilot: Pilot;
      /** Stats after the change, cargo included. */
      stats: ShipStats;
      /** Credits the pilot pays. */
      cost: number;
      /** True when the module is bought new rather than taken from storage. */
      bought: boolean;
      event: WorldEvent;
    }
  | { ok: false; reason: FitRefusal };

/**
 * Plan putting `moduleId` on `mountId` (replacing what is there), or, with
 * `moduleId` null, taking the module off. Checks every rule; changes
 * nothing. The outfitting screen uses this for previews.
 */
export function planRefit(world: World, pilotId: string, mountId: string, moduleId: string | null): RefitPlan {
  const pilot = world.pilots[pilotId];
  const ship = pilot?.shipId ? world.ships[pilot.shipId] : undefined;
  if (!pilot || !ship) return { ok: false, reason: 'noShip' };
  if (ship.state !== 'docked' || !ship.dockedAt) return { ok: false, reason: 'notDocked' };
  if (!world.stations[ship.dockedAt]?.outfitting) return { ok: false, reason: 'noOutfitting' };
  const hull = world.hulls[ship.hullId];
  if (!hull) return { ok: false, reason: 'noShip' };
  if (hull.sealed) return { ok: false, reason: 'sealed' };
  const mount = hull.mounts.find((m) => m.id === mountId);
  if (!mount) return { ok: false, reason: 'unknownMount' };

  const oldId = ship.fit[mountId] ?? null;
  const old = oldId ? world.modules[oldId] : undefined;
  let module: ModuleSpec | undefined;
  if (moduleId === null) {
    if (!oldId) return { ok: false, reason: 'emptyMount' };
  } else {
    module = world.modules[moduleId];
    if (!module) return { ok: false, reason: 'unknownModule' };
    const misfit = mountRefusal(mount, module);
    if (misfit) return { ok: false, reason: misfit };
    if (oldId === moduleId) return { ok: false, reason: 'alreadyFitted' };
  }

  const fit = { ...ship.fit };
  if (module) fit[mountId] = module.id;
  else delete fit[mountId];

  const stats = fitStats(world, hull, fit, cargoMass(ship, world.goods));
  if (stats.powerDraw > stats.powerOutput) return { ok: false, reason: 'power' };
  if (cargoUsed(ship) > stats.cargoCapacity) return { ok: false, reason: 'cargo' };

  const stationId = ship.dockedAt;
  const fromStorage = module ? storedCount(pilot, stationId, module.id) > 0 : false;
  const bought = module !== undefined && !fromStorage;
  const cost = (bought && module ? module.price : 0) + (module ? fitFee(module) : 0) + (old ? fitFee(old) : 0);
  if (cost > pilot.credits) return { ok: false, reason: 'credits' };

  let paid: Pilot = { ...pilot, credits: pilot.credits - cost };
  if (module && fromStorage) paid = withStored(paid, stationId, module.id, -1);
  if (oldId) paid = withStored(paid, stationId, oldId, 1);

  const refitted: Ship = {
    ...ship,
    fit,
    weapons: weaponStatesFor(world, hull, fit, ship.heading, ship),
    shield: Math.min(ship.shield, stats.shield),
    structure: Math.min(ship.structure, stats.structure),
  };
  const event: WorldEvent = module
    ? { type: 'fitted', shipId: ship.id, mountId, moduleId: module.id, replaced: oldId, bought, cost }
    : { type: 'unfitted', shipId: ship.id, mountId, moduleId: oldId!, fee: cost };
  return { ok: true, ship: refitted, pilot: paid, stats, cost, bought, event };
}

export type FitResult = { ok: true; world: World; event: WorldEvent } | { ok: false; world: World; reason: FitRefusal };

function apply(world: World, pilotId: string, plan: RefitPlan): FitResult {
  if (!plan.ok) return { ok: false, world, reason: plan.reason };
  return {
    ok: true,
    world: {
      ...world,
      pilots: { ...world.pilots, [pilotId]: plan.pilot },
      ships: { ...world.ships, [plan.ship.id]: plan.ship },
    },
    event: plan.event,
  };
}

/**
 * Fit a module to a mount on the pilot's docked ship, from storage here if
 * the pilot has one, otherwise bought new. What it replaces goes to
 * storage here. All or nothing.
 */
export function fitModule(world: World, pilotId: string, mountId: string, moduleId: string): FitResult {
  return apply(world, pilotId, planRefit(world, pilotId, mountId, moduleId));
}

/** Take the module off a mount on the pilot's docked ship and put it in storage here. All or nothing. */
export function unfitModule(world: World, pilotId: string, mountId: string): FitResult {
  return apply(world, pilotId, planRefit(world, pilotId, mountId, null));
}

/**
 * Sell one stored module back to the station the pilot is docked at.
 * Needs a station with outfitting; the module must be in storage there.
 */
export function sellModule(world: World, pilotId: string, moduleId: string): FitResult {
  const pilot = world.pilots[pilotId];
  const ship = pilot?.shipId ? world.ships[pilot.shipId] : undefined;
  if (!pilot || !ship) return { ok: false, world, reason: 'noShip' };
  if (ship.state !== 'docked' || !ship.dockedAt) return { ok: false, world, reason: 'notDocked' };
  const stationId = ship.dockedAt;
  if (!world.stations[stationId]?.outfitting) return { ok: false, world, reason: 'noOutfitting' };
  const module = world.modules[moduleId];
  if (!module) return { ok: false, world, reason: 'unknownModule' };
  if (storedCount(pilot, stationId, moduleId) < 1) return { ok: false, world, reason: 'notStored' };
  const credits = resaleValue(module);
  const sold = withStored({ ...pilot, credits: pilot.credits + credits }, stationId, moduleId, -1);
  return {
    ok: true,
    world: { ...world, pilots: { ...world.pilots, [pilotId]: sold } },
    event: { type: 'moduleSold', shipId: ship.id, stationId, moduleId, credits },
  };
}
