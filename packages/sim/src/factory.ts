import { idleThrusters } from './flight.js';
import { weaponStatesFor } from './fitting.js';
import { fitStats, type Catalogues } from './stats.js';
import type { FlightMode, Loadout, Ship } from './types.js';
import type { Vec2 } from './vec2.js';

/**
 * Building ships. One place creates a ship from a loadout, so every ship
 * starts with its fit, full shields and structure and its weapons ready,
 * whoever it belongs to.
 */

export interface NewShipOptions {
  id: string;
  loadout: Loadout;
  ownerId: string | null;
  position: Vec2;
  heading: number;
  flightMode: FlightMode;
  dockedAt?: string | null;
  /** Pad at `dockedAt` the ship sits on. Use `docking.onPad` to place a ship on a pad properly. */
  padId?: string | null;
  /** Cargo aboard at build time. */
  hold?: Record<string, number>;
}

export function buildShip(cat: Catalogues, o: NewShipOptions): Ship {
  const hull = cat.hulls[o.loadout.hullId];
  if (!hull) throw new Error(`Loadout "${o.loadout.id}" names unknown hull "${o.loadout.hullId}"`);
  // Only mounts the hull has and modules that exist make it into the fit.
  const fit: Record<string, string> = {};
  for (const m of hull.mounts) {
    const id = o.loadout.fit[m.id];
    if (id && cat.modules[id]) fit[m.id] = id;
  }
  const stats = fitStats(cat, hull, fit);
  const docked = o.dockedAt != null;
  return {
    id: o.id,
    hullId: hull.id,
    fit,
    ownerId: o.ownerId,
    position: { ...o.position },
    velocity: { x: 0, y: 0 },
    heading: o.heading,
    angularVelocity: 0,
    state: docked ? 'docked' : 'flying',
    dockedAt: docked ? o.dockedAt! : null,
    padId: docked ? (o.padId ?? null) : null,
    flightMode: o.flightMode,
    thrusters: idleThrusters(),
    shield: stats.shield,
    structure: stats.structure,
    shieldDelayTicks: 0,
    weapons: weaponStatesFor(cat, hull, fit, o.heading),
    tractorActive: false,
    hold: { ...(o.hold ?? {}) },
    locks: [],
    activeLock: null,
    capacitor: stats.capacitor,
    fireGroup: 1,
    weaponsHot: false,
  };
}
