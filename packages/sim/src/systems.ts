import { shipStats, type Catalogues } from './stats.js';
import type { ModuleKind, Ship } from './types.js';
import { isGun } from './weapons.js';

/**
 * Ship systems the pilot works (docs/ship-systems.md, "Activation tiles").
 *
 * One row of numbered tiles on the HUD, in this order: a tile per fire
 * group that has a gun, launcher or mining laser in it, lowest group
 * first; then a tile per mining turret (assigns it the active lock's
 * rock); then a tile per active module on a utility mount (tractor,
 * dispenser, survey scanner), in mount order, then per ore hopper (its
 * filter). Number keys 1 to 9 press
 * them: a group tile selects the group (the fire button fires it); a
 * module tile switches the module on or off, or fires it once (a
 * dispenser, a survey pulse) (`ShipInput.toggleModule`). The afterburner
 * is held on Shift instead, so it has no number.
 *
 * The sim decides the order so the HUD, the keys and any other client
 * agree.
 */

/** Module kinds that get a numbered tile. */
const ACTIVATED: ReadonlySet<ModuleKind> = new Set<ModuleKind>(['tractor', 'countermeasure', 'surveyScanner']);
/** Module kinds on internal mounts that still get a tile (a setting to change in flight). */
const ACTIVATED_INTERNAL: ReadonlySet<ModuleKind> = new Set<ModuleKind>(['oreHopper']);

/** How many tiles have number keys. */
export const ACTIVATION_KEYS = 9;

export type ActivationSlot =
  | { kind: 'group'; group: number }
  | { kind: 'module'; mountId: string; moduleId: string; moduleKind: ModuleKind };

/** The ship's tiles, in order. Only the first `ACTIVATION_KEYS` have number keys. */
export function activationSlots(cat: Catalogues, ship: Ship): ActivationSlot[] {
  const hull = cat.hulls[ship.hullId];
  if (!hull) return [];
  const stats = shipStats(cat, ship);
  const groups = new Set<number>();
  for (const w of ship.weapons) {
    const spec = stats.weapons[w.mountId];
    if (spec && spec.kind === 'fixed' && (isGun(spec) || spec.family === 'missile' || spec.family === 'mining')) groups.add(w.group);
  }
  const out: ActivationSlot[] = [...groups].sort((a, b) => a - b).map((group) => ({ kind: 'group', group }));
  // Mining turrets next: each tile gives its turret the active lock's rock.
  for (const mount of hull.mounts) {
    const spec = stats.weapons[mount.id];
    const moduleId = ship.fit[mount.id];
    if (spec?.family === 'mining' && spec.kind === 'turret' && moduleId) out.push({ kind: 'module', mountId: mount.id, moduleId, moduleKind: 'weapon' });
  }
  // Utility modules first, then internal ones with a setting (an ore hopper's filter).
  for (const type of ['utility', 'internal'] as const) {
    for (const mount of hull.mounts) {
      if (mount.type !== type) continue;
      const moduleId = ship.fit[mount.id];
      const module = moduleId ? cat.modules[moduleId] : undefined;
      if (!module || !(type === 'utility' ? ACTIVATED : ACTIVATED_INTERNAL).has(module.kind)) continue;
      out.push({ kind: 'module', mountId: mount.id, moduleId: module.id, moduleKind: module.kind });
    }
  }
  return out;
}

/** True if the module on `mountId` is switched on. */
export function isSwitchedOn(ship: Ship, mountId: string): boolean {
  return ship.switchedOn?.includes(mountId) ?? false;
}
