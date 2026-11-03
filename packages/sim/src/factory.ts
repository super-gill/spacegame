import { idleThrusters } from './flight.js';
import type { FlightMode, HullSpec, Ship, WeaponSpec } from './types.js';
import type { Vec2 } from './vec2.js';

/**
 * Building ships. One place creates a ship from its hull spec, so every
 * ship starts with full shields and structure and its hull's weapons
 * fitted, whoever it belongs to.
 */

export interface NewShipOptions {
  id: string;
  hull: HullSpec;
  weapons: Record<string, WeaponSpec>;
  ownerId: string | null;
  position: Vec2;
  heading: number;
  flightMode: FlightMode;
  dockedAt?: string | null;
  /** Cargo aboard at build time. */
  hold?: Record<string, number>;
}

export function buildShip(o: NewShipOptions): Ship {
  const docked = o.dockedAt != null;
  return {
    id: o.id,
    hullId: o.hull.id,
    ownerId: o.ownerId,
    position: { ...o.position },
    velocity: { x: 0, y: 0 },
    heading: o.heading,
    angularVelocity: 0,
    state: docked ? 'docked' : 'flying',
    dockedAt: docked ? o.dockedAt! : null,
    flightMode: o.flightMode,
    thrusters: idleThrusters(),
    shield: o.hull.shield,
    structure: o.hull.structure,
    shieldDelayTicks: 0,
    weapons: o.hull.defaultWeapons
      .filter((id) => o.weapons[id])
      .map((weaponId) => ({ weaponId, cooldownTicks: 0, aim: o.heading })),
    tractorActive: false,
    hold: { ...(o.hold ?? {}) },
    targetId: null,
    weaponsHot: false,
  };
}
