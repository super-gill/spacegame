import { lotPrice, moveStock, stockOf, stockPrices } from './economy.js';
import { droneRoom, nextDroneId } from './drones.js';
import { shipStats } from './stats.js';
import type { GoodSpec, MarketEntry, Ship, ShipStats, World, WorldEvent } from './types.js';

/**
 * Trade: cargo, prices, and buying and selling while docked.
 *
 * Prices are read through a PriceSource, never straight from station data.
 * The default is `stockPrices` (economy.ts): a port's price follows its
 * stock, a lot is priced unit by unit, and every trade moves the stock.
 * Where a world keeps no stock (Calder, the Arena), that is the design
 * prices, as before.
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

/** Free cargo space, given the ship's stats (its cargo pods decide capacity). Ignores ore-only space: see `holdSpaceFor`. */
export function cargoFree(ship: Ship, stats: Pick<ShipStats, 'cargoCapacity'>): number {
  return Math.max(0, stats.cargoCapacity - cargoUsed(ship));
}

/** All the hold space a ship has: cargo plus ore-only space. */
export function holdCapacity(stats: Pick<ShipStats, 'cargoCapacity' | 'oreCapacity'>): number {
  return stats.cargoCapacity + (stats.oreCapacity ?? 0);
}

/**
 * Room for more of `goodId`. On a hull with an ore hold, ore goes there
 * and only there; elsewhere ore is ordinary cargo. Anything else has
 * ordinary cargo space only, less any ore left in it (from before ore
 * holds, or a ship with none).
 */
export function holdSpaceFor(ship: Ship, stats: Pick<ShipStats, 'cargoCapacity' | 'oreCapacity'>, goods: Readonly<Record<string, GoodSpec>>, goodId: string): number {
  let ore = 0;
  let other = 0;
  for (const [id, q] of Object.entries(ship.hold)) {
    if (goods[id]?.ore) ore += q;
    else other += q;
  }
  const oreSpace = stats.oreCapacity ?? 0;
  const general = Math.max(0, stats.cargoCapacity - other - Math.max(0, ore - oreSpace));
  if (!goods[goodId]?.ore) return general;
  return oreSpace > 0 ? Math.max(0, oreSpace - ore) : general;
}

/**
 * How full each part of the hold is: the ore hold (a mining hull's,
 * capacity 0 without one) and cargo. Ore beyond the ore hold, or on a
 * hull without one, counts as cargo.
 */
export function holdUse(ship: Ship, stats: Pick<ShipStats, 'cargoCapacity' | 'oreCapacity'>, goods: Readonly<Record<string, GoodSpec>>): { ore: { used: number; capacity: number }; cargo: { used: number; capacity: number } } {
  let ore = 0;
  let other = 0;
  for (const [id, q] of Object.entries(ship.hold)) {
    if (goods[id]?.ore) ore += q;
    else other += q;
  }
  const oreSpace = stats.oreCapacity ?? 0;
  const inOreHold = Math.min(ore, oreSpace);
  return { ore: { used: inOreHold, capacity: oreSpace }, cargo: { used: other + ore - inOreHold, capacity: stats.cargoCapacity } };
}

/** True if everything aboard fits the hold these stats give (after a refit, say). */
export function holdFits(ship: Ship, stats: Pick<ShipStats, 'cargoCapacity' | 'oreCapacity'>, goods: Readonly<Record<string, GoodSpec>>): boolean {
  let ore = 0;
  let other = 0;
  for (const [id, q] of Object.entries(ship.hold)) {
    if (goods[id]?.ore) ore += q;
    else other += q;
  }
  return other + Math.max(0, ore - (stats.oreCapacity ?? 0)) <= stats.cargoCapacity;
}

export type TradeRefusal =
  | 'noShip' // the pilot has no ship
  | 'notDocked' // the ship is not docked
  | 'notTraded' // this station does not trade this good in that direction
  | 'badQuantity' // quantity is not a whole number above zero
  | 'credits' // not enough credits
  | 'space' // not enough cargo space
  | 'droneBay' // a drone, and the drone bays are full (drones never go in cargo)
  | 'notHeld' // selling more than is aboard
  | 'stock'; // the port has fewer to sell, or is full and will take no more

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

/** What a lot costs or fetches: unit by unit against stock with the stock prices, a flat unit price with any other source. */
function lot(world: World, stationId: string, goodId: string, quantity: number, side: 'buy' | 'sell', prices: PriceSource): number | null {
  if (prices === stockPrices) return lotPrice(world, stationId, goodId, quantity, side);
  const q = prices.quote(world, stationId, goodId);
  const unit = side === 'buy' ? q?.ask : q?.bid;
  return unit == null ? null : unit * quantity;
}

/** Largest quantity of a good the pilot could buy right now (0 if none): what they can afford, carry, and the port has. */
export function maxBuyable(world: World, pilotId: string, goodId: string, prices: PriceSource = stockPrices): number {
  const d = dockedShip(world, pilotId);
  if (typeof d === 'string') return 0;
  const pilot = world.pilots[pilotId];
  const ask = prices.quote(world, d.stationId, goodId)?.ask;
  if (ask == null || ask <= 0 || !pilot) return 0;
  const room = roomFor(world, d.ship, goodId);
  const held = prices === stockPrices ? stockOf(world, d.stationId, goodId) : null;
  // Prices only rise as a lot grows, so the largest affordable lot is found by halving.
  let lo = 0;
  let hi = Math.min(room, held == null ? Math.floor(pilot.credits / ask) : Math.floor(held));
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const cost = lot(world, d.stationId, goodId, mid, 'buy', prices);
    if (cost != null && cost <= pilot.credits) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Room for more of a good: drones go to the drone bay, everything else to the hold. */
function roomFor(world: World, ship: Ship, goodId: string): number {
  return world.goods[goodId]?.drone ? droneRoom(world, ship) : holdSpaceFor(ship, shipStats(world, ship), world.goods, goodId);
}

/** Buy `quantity` units of a good from the station the pilot is docked at. All or nothing. */
export function buyGood(world: World, pilotId: string, goodId: string, quantity: number, prices: PriceSource = stockPrices): TradeResult {
  if (!Number.isInteger(quantity) || quantity <= 0) return { ok: false, world, reason: 'badQuantity' };
  const d = dockedShip(world, pilotId);
  if (typeof d === 'string') return { ok: false, world, reason: d };
  const ask = prices.quote(world, d.stationId, goodId)?.ask;
  if (ask == null) return { ok: false, world, reason: 'notTraded' };
  // Priced unit by unit as the port's stock falls; null when the port has fewer than that to sell.
  const cost = lot(world, d.stationId, goodId, quantity, 'buy', prices);
  if (cost == null) return { ok: false, world, reason: 'stock' };

  const pilot = world.pilots[pilotId]!;
  if (cost > pilot.credits) return { ok: false, world, reason: 'credits' };
  if (quantity > roomFor(world, d.ship, goodId)) return { ok: false, world, reason: world.goods[goodId]?.drone ? 'droneBay' : 'space' };

  // A drone goes into the drone bay, ready to launch.
  const drone = world.goods[goodId]?.drone;
  let bought: Ship;
  if (drone) {
    const loadout = world.loadouts[drone.loadoutId];
    const structure = world.hulls[loadout?.hullId ?? '']?.structure ?? 1;
    let ship = d.ship;
    for (let i = 0; i < quantity; i++) ship = { ...ship, droneBay: [...(ship.droneBay ?? []), { id: nextDroneId(world, ship), loadoutId: drone.loadoutId, structure }] };
    bought = ship;
  } else {
    bought = { ...d.ship, hold: { ...d.ship.hold, [goodId]: (d.ship.hold[goodId] ?? 0) + quantity } };
  }
  const traded: World = {
    ...world,
    pilots: { ...world.pilots, [pilotId]: { ...pilot, credits: pilot.credits - cost } },
    ships: { ...world.ships, [d.ship.id]: bought },
  };
  return {
    ok: true,
    world: moveStock(traded, d.stationId, goodId, -quantity),
    event: { type: 'traded', shipId: d.ship.id, good: goodId, quantity, unitPrice: Math.round((cost / quantity) * 100) / 100, side: 'buy' },
  };
}

/** Sell `quantity` units of a good to the station the pilot is docked at. All or nothing. */
export function sellGood(world: World, pilotId: string, goodId: string, quantity: number, prices: PriceSource = stockPrices): TradeResult {
  if (!Number.isInteger(quantity) || quantity <= 0) return { ok: false, world, reason: 'badQuantity' };
  const d = dockedShip(world, pilotId);
  if (typeof d === 'string') return { ok: false, world, reason: d };
  const bid = prices.quote(world, d.stationId, goodId)?.bid;
  if (bid == null) return { ok: false, world, reason: 'notTraded' };

  // Drones are sold from the drone bay, most worn first; anything else from the hold.
  const drone = world.goods[goodId]?.drone;
  const bay = (d.ship.droneBay ?? []).filter((x) => x.loadoutId === drone?.loadoutId);
  const held = drone ? bay.length : (d.ship.hold[goodId] ?? 0);
  if (quantity > held) return { ok: false, world, reason: 'notHeld' };

  // Priced unit by unit as the port's stock rises; null when the port is full and stops buying.
  const takings = lot(world, d.stationId, goodId, quantity, 'sell', prices);
  if (takings == null) return { ok: false, world, reason: 'stock' };
  const pilot = world.pilots[pilotId]!;
  let sold: Ship;
  if (drone) {
    const going = new Set([...bay].sort((a, b) => a.structure - b.structure || (a.id < b.id ? -1 : 1)).slice(0, quantity).map((x) => x.id));
    sold = { ...d.ship, droneBay: (d.ship.droneBay ?? []).filter((x) => !going.has(x.id)) };
  } else {
    const hold = { ...d.ship.hold };
    if (held === quantity) delete hold[goodId];
    else hold[goodId] = held - quantity;
    sold = { ...d.ship, hold };
  }
  const traded: World = {
    ...world,
    pilots: { ...world.pilots, [pilotId]: { ...pilot, credits: pilot.credits + takings } },
    ships: { ...world.ships, [d.ship.id]: sold },
  };
  return {
    ok: true,
    world: moveStock(traded, d.stationId, goodId, quantity),
    event: { type: 'traded', shipId: d.ship.id, good: goodId, quantity, unitPrice: Math.round((takings / quantity) * 100) / 100, side: 'sell' },
  };
}
