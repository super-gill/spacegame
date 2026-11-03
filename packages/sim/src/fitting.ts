import { MODULE_RESALE_FRACTION } from './constants.js';
import { cargoMass, fitStats, type Catalogues } from './stats.js';
import { cargoUsed } from './trade.js';
import type { HullSpec, ModuleSpec, MountPoint, Ship, ShipStats, WeaponState, World, WorldEvent } from './types.js';

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
 *   4. The pilot can pay: the module's price, less the resale value of
 *      anything it replaces.
 *
 * Fitting and removing are pilot commands, like trading: a person asks
 * once, the sim checks and applies it, and over a network they become
 * requests. Credits belong to the pilot; the fit belongs to the ship.
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
  | 'credits'; // not enough credits

const SIZE_ORDER = { S: 0, M: 1, L: 2, XL: 3 } as const;

/** Whether a module can physically go on a mount: type, size and services. Null if it can. */
export function mountRefusal(mount: MountPoint, module: ModuleSpec): FitRefusal | null {
  if (!module.mounts.includes(mount.type)) return 'wrongMount';
  if (SIZE_ORDER[module.size] > SIZE_ORDER[mount.size]) return 'tooBig';
  if (!module.needs.every((s) => mount.services.includes(s))) return 'missingService';
  return null;
}

/** Credits paid back for a module taken off. */
export function resaleValue(module: ModuleSpec): number {
  return Math.floor(module.price * MODULE_RESALE_FRACTION);
}

/**
 * Live weapon states for a fit: one per weapon module, in mount order.
 * A mount whose module is unchanged keeps its cooldown and aim; a new
 * weapon starts ready, pointing along the heading.
 */
export function weaponStatesFor(
  cat: Pick<Catalogues, 'modules'>,
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
    states.push(kept ?? { mountId: mount.id, cooldownTicks: 0, aim: heading });
  }
  return states;
}

/** What a refit would do, without doing it. */
export type RefitPlan =
  | {
      ok: true;
      ship: Ship;
      /** Stats after the change, cargo included. */
      stats: ShipStats;
      /** Credits the pilot pays (negative: is paid). */
      cost: number;
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

  const refund = old ? resaleValue(old) : 0;
  const cost = (module?.price ?? 0) - refund;
  if (cost > pilot.credits) return { ok: false, reason: 'credits' };

  const refitted: Ship = {
    ...ship,
    fit,
    weapons: weaponStatesFor(world, hull, fit, ship.heading, ship),
    shield: Math.min(ship.shield, stats.shield),
    structure: Math.min(ship.structure, stats.structure),
  };
  const event: WorldEvent = module
    ? { type: 'fitted', shipId: ship.id, mountId, moduleId: module.id, replaced: oldId, cost }
    : { type: 'unfitted', shipId: ship.id, mountId, moduleId: oldId!, refund };
  return { ok: true, ship: refitted, stats, cost, event };
}

export type FitResult = { ok: true; world: World; event: WorldEvent } | { ok: false; world: World; reason: FitRefusal };

function apply(world: World, pilotId: string, plan: RefitPlan): FitResult {
  if (!plan.ok) return { ok: false, world, reason: plan.reason };
  const pilot = world.pilots[pilotId]!;
  return {
    ok: true,
    world: {
      ...world,
      pilots: { ...world.pilots, [pilotId]: { ...pilot, credits: pilot.credits - plan.cost } },
      ships: { ...world.ships, [plan.ship.id]: plan.ship },
    },
    event: plan.event,
  };
}

/** Fit a module to a mount on the pilot's docked ship, replacing what is there. All or nothing. */
export function fitModule(world: World, pilotId: string, mountId: string, moduleId: string): FitResult {
  return apply(world, pilotId, planRefit(world, pilotId, mountId, moduleId));
}

/** Take the module off a mount on the pilot's docked ship and sell it back. All or nothing. */
export function unfitModule(world: World, pilotId: string, mountId: string): FitResult {
  return apply(world, pilotId, planRefit(world, pilotId, mountId, null));
}
