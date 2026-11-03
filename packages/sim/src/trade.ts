import { shipStats } from './stats.js';
import type { MarketEntry, Ship, ShipStats, World, WorldEvent } from './types.js';

/**
 * Trade: cargo, prices, and buying and selling while docked.
 *
 * Prices are read through a PriceSource, never straight from station data,
 * so the scripted tables used now can later be replaced by a real supply
 * and demand sim (milestone 10) without touching the trade rules or the
 * market screen.
 *
 * Buying and selling are pilot commands, like respawning: a person asks
 * once, the sim checks and applies it. Over a network they become
 * requests the client sends. Credits belong to the pilot; cargo belongs to
 * the ship, so it is lost (or spilled as loot) with the ship.
 */

/** Where prices come from. Swap the implementation to change the economy model. */
export interface PriceSource {
  quote(world: World, stationId: string, goodId: string): MarketEntry | null;
}

/** Fixed prices from each station's `market` table. */
export const scriptedPrices: PriceSource = {
  quote(world, stationId, goodId) {
    return world.stations[stationId]?.market[goodId] ?? null;
  },
};

/** Units of cargo space in use. */
export function cargoUsed(ship: Ship): number {
  return Object.values(ship.hold).reduce((n, q) => n + q, 0);
}

/** Free cargo space, given the ship's stats (its cargo pods decide capacity). */
export function cargoFree(ship: Ship, stats: Pick<ShipStats, 'cargoCapacity'>): number {
  return Math.max(0, stats.cargoCapacity - cargoUsed(ship));
}

export type TradeRefusal =
  | 'noShip' // the pilot has no ship
  | 'notDocked' // the ship is not docked
  | 'notTraded' // this station does not trade this good in that direction
  | 'badQuantity' // quantity is not a whole number above zero
  | 'credits' // not enough credits
  | 'space' // not enough cargo space
  | 'notHeld'; // selling more than is aboard

export type TradeResult =
  | { ok: true; world: World; event: WorldEvent }
  | { ok: false; world: World; reason: TradeRefusal };

/** The docked ship and its station for a pilot, or why there is none. */
function dockedShip(world: World, pilotId: string): { ship: Ship; stationId: string } | TradeRefusal {
  const shipId = world.pilots[pilotId]?.shipId;
  const ship = shipId ? world.ships[shipId] : undefined;
  if (!ship) return 'noShip';
  if (ship.state !== 'docked' || !ship.dockedAt) return 'notDocked';
  return { ship, stationId: ship.dockedAt };
}

/** Largest quantity of a good the pilot could buy right now (0 if none). */
export function maxBuyable(world: World, pilotId: string, goodId: string, prices: PriceSource = scriptedPrices): number {
  const d = dockedShip(world, pilotId);
  if (typeof d === 'string') return 0;
  const ask = prices.quote(world, d.stationId, goodId)?.ask;
  const pilot = world.pilots[pilotId];
  if (ask == null || ask <= 0 || !pilot) return 0;
  return Math.min(Math.floor(pilot.credits / ask), cargoFree(d.ship, shipStats(world, d.ship)));
}

/** Buy `quantity` units of a good from the station the pilot is docked at. All or nothing. */
export function buyGood(world: World, pilotId: string, goodId: string, quantity: number, prices: PriceSource = scriptedPrices): TradeResult {
  if (!Number.isInteger(quantity) || quantity <= 0) return { ok: false, world, reason: 'badQuantity' };
  const d = dockedShip(world, pilotId);
  if (typeof d === 'string') return { ok: false, world, reason: d };
  const ask = prices.quote(world, d.stationId, goodId)?.ask;
  if (ask == null) return { ok: false, world, reason: 'notTraded' };

  const pilot = world.pilots[pilotId]!;
  const cost = ask * quantity;
  if (cost > pilot.credits) return { ok: false, world, reason: 'credits' };
  if (quantity > cargoFree(d.ship, shipStats(world, d.ship))) return { ok: false, world, reason: 'space' };

  const hold = { ...d.ship.hold, [goodId]: (d.ship.hold[goodId] ?? 0) + quantity };
  return {
    ok: true,
    world: {
      ...world,
      pilots: { ...world.pilots, [pilotId]: { ...pilot, credits: pilot.credits - cost } },
      ships: { ...world.ships, [d.ship.id]: { ...d.ship, hold } },
    },
    event: { type: 'traded', shipId: d.ship.id, good: goodId, quantity, unitPrice: ask, side: 'buy' },
  };
}

/** Sell `quantity` units of a good to the station the pilot is docked at. All or nothing. */
export function sellGood(world: World, pilotId: string, goodId: string, quantity: number, prices: PriceSource = scriptedPrices): TradeResult {
  if (!Number.isInteger(quantity) || quantity <= 0) return { ok: false, world, reason: 'badQuantity' };
  const d = dockedShip(world, pilotId);
  if (typeof d === 'string') return { ok: false, world, reason: d };
  const bid = prices.quote(world, d.stationId, goodId)?.bid;
  if (bid == null) return { ok: false, world, reason: 'notTraded' };

  const held = d.ship.hold[goodId] ?? 0;
  if (quantity > held) return { ok: false, world, reason: 'notHeld' };

  const pilot = world.pilots[pilotId]!;
  const hold = { ...d.ship.hold };
  if (held === quantity) delete hold[goodId];
  else hold[goodId] = held - quantity;
  return {
    ok: true,
    world: {
      ...world,
      pilots: { ...world.pilots, [pilotId]: { ...pilot, credits: pilot.credits + bid * quantity } },
      ships: { ...world.ships, [d.ship.id]: { ...d.ship, hold } },
    },
    event: { type: 'traded', shipId: d.ship.id, good: goodId, quantity, unitPrice: bid, side: 'sell' },
  };
}
