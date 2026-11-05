import { shipStats } from './stats.js';
import { holdSpaceFor } from './trade.js';
import type { Pilot, Ship, World, WorldEvent } from './types.js';

/**
 * Station storage for goods (docs/mining.md, "Holds"): a pilot keeps goods
 * at any station, moving them between a docked ship's hold and the
 * station. The same storage as unfitted modules (`Pilot.storage`). Pilot commands, like trading: a person asks once, the sim
 * checks and applies it. Storage has no limit and costs nothing, and goods
 * stay at the station where they were left.
 */

export type HangarRefusal =
  | 'noShip' // the pilot has no ship
  | 'notDocked' // the ship is not docked
  | 'badQuantity' // not a whole number above zero
  | 'notHeld' // more than the hold (storing) or the station (taking) has
  | 'space'; // the hold has no room for that much

export type HangarResult = { ok: true; world: World; event: WorldEvent } | { ok: false; world: World; reason: HangarRefusal };

/** How many of a good the pilot keeps at a station. */
export function storedGoods(pilot: Pick<Pilot, 'storage'>, stationId: string, goodId: string): number {
  return pilot.storage?.[stationId]?.[goodId] ?? 0;
}

function docked(world: World, pilotId: string): { pilot: Pilot; ship: Ship; stationId: string } | HangarRefusal {
  const pilot = world.pilots[pilotId];
  const ship = pilot?.shipId ? world.ships[pilot.shipId] : undefined;
  if (!pilot || !ship) return 'noShip';
  if (ship.state !== 'docked' || !ship.dockedAt) return 'notDocked';
  return { pilot, ship, stationId: ship.dockedAt };
}

function withHangar(pilot: Pilot, stationId: string, goodId: string, change: number): Pilot {
  const here = { ...(pilot.storage?.[stationId] ?? {}) };
  const count = (here[goodId] ?? 0) + change;
  if (count > 0) here[goodId] = count;
  else delete here[goodId];
  return { ...pilot, storage: { ...(pilot.storage ?? {}), [stationId]: here } };
}

/** Move `quantity` of a good from the docked ship's hold into storage at that station. */
export function storeGoods(world: World, pilotId: string, goodId: string, quantity: number): HangarResult {
  if (!Number.isInteger(quantity) || quantity <= 0) return { ok: false, world, reason: 'badQuantity' };
  const d = docked(world, pilotId);
  if (typeof d === 'string') return { ok: false, world, reason: d };
  const held = d.ship.hold[goodId] ?? 0;
  if (quantity > held) return { ok: false, world, reason: 'notHeld' };
  const { [goodId]: _all, ...rest } = d.ship.hold;
  const hold = held - quantity > 0 ? { ...rest, [goodId]: held - quantity } : rest;
  return {
    ok: true,
    world: { ...world, pilots: { ...world.pilots, [pilotId]: withHangar(d.pilot, d.stationId, goodId, quantity) }, ships: { ...world.ships, [d.ship.id]: { ...d.ship, hold } } },
    event: { type: 'goodsStored', shipId: d.ship.id, stationId: d.stationId, good: goodId, quantity },
  };
}

/** Move `quantity` of a good from storage at this station into the docked ship's hold, if it fits. */
export function takeGoods(world: World, pilotId: string, goodId: string, quantity: number): HangarResult {
  if (!Number.isInteger(quantity) || quantity <= 0) return { ok: false, world, reason: 'badQuantity' };
  const d = docked(world, pilotId);
  if (typeof d === 'string') return { ok: false, world, reason: d };
  if (quantity > storedGoods(d.pilot, d.stationId, goodId)) return { ok: false, world, reason: 'notHeld' };
  if (quantity > holdSpaceFor(d.ship, shipStats(world, d.ship), world.goods, goodId)) return { ok: false, world, reason: 'space' };
  const hold = { ...d.ship.hold, [goodId]: (d.ship.hold[goodId] ?? 0) + quantity };
  return {
    ok: true,
    world: { ...world, pilots: { ...world.pilots, [pilotId]: withHangar(d.pilot, d.stationId, goodId, -quantity) }, ships: { ...world.ships, [d.ship.id]: { ...d.ship, hold } } },
    event: { type: 'goodsTaken', shipId: d.ship.id, stationId: d.stationId, good: goodId, quantity },
  };
}
