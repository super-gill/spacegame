import type { PriceSource } from './trade.js';
import type { GoodSpec, MarketEntry, Station, World } from './types.js';

/**
 * Supply and demand (Open Lanes step 4, push 1; docs/economy.md): every
 * port holds stock of each trade good it deals in, its price follows that
 * stock, and the port's own production and consumption pull the stock back
 * to an equilibrium over time.
 *
 * - **Equilibrium:** a port's design prices (`Station.market`) are its
 *   prices at equilibrium stock. A port that sells a good cheap is a
 *   producer and holds plenty (`EQUILIBRIUM.producer`); one that pays well
 *   is a consumer and holds little; the rest are in between.
 * - **Price follows stock:** scarce is dear and glutted is cheap, as
 *   (equilibrium / stock) to the power `ELASTICITY`, held between
 *   `PRICE_FLOOR` and `PRICE_CEILING` times the design price. The design
 *   spread between ask and bid is kept. Sold out: no ask.
 * - **Recovery:** each `ECONOMY_STEP_SECONDS` the stock closes on
 *   equilibrium by the share `dt / RECOVERY_SECONDS`: what the port makes
 *   or uses. A big sale is felt for the better part of an hour.
 * - **Lots:** a lot is priced unit by unit, so selling 200 at once gets
 *   steadily worse, and buying a port out gets steadily dearer.
 * - **Kit is not stocked:** ammunition, munitions, countermeasures, drones
 *   and charges keep their design prices (`isTradeGood`).
 *
 * Stock lives in `World.stock` (saved), not on the stations, whose data is
 * design and is refreshed from the catalogue on load. A world without
 * stock (Calder, the Arena) trades at design prices, as before.
 */

/** Exponent of the price against stock: 0.5 means a quarter of the stock costs twice as much. */
export const ELASTICITY = 0.5;
/** Price bounds as multiples of the design price. */
export const PRICE_FLOOR = 0.4;
export const PRICE_CEILING = 2.5;
/** Seconds for a port to close about 63% of the gap back to equilibrium. */
export const RECOVERY_SECONDS = 1800;
/** How often stock moves towards equilibrium, seconds of game time. */
export const ECONOMY_STEP_SECONDS = 10;
/** Stock a port holds at equilibrium, by what it does with the good. */
export const EQUILIBRIUM = { producer: 600, trader: 300, consumer: 150 } as const;
/** Stock can never pass this many times equilibrium: the port's storage is full and it stops buying. */
export const STOCK_CAP = 4;
/** A good is produced where its design mid price is this far under its base price, consumed this far over. */
const ROLE_MARGIN = 0.1;

/** Whether a good is traded by stock (food, machinery, ores) rather than kit sold at a fixed price. */
export function isTradeGood(good: GoodSpec | undefined): boolean {
  return !!good && !good.ammo && !good.munition && !good.decoy && !good.drone && good.id !== 'breach-charge';
}

/** A design entry's mid price: halfway between ask and bid, or whichever there is. */
function designMid(entry: MarketEntry): number | null {
  if (entry.ask != null && entry.bid != null) return (entry.ask + entry.bid) / 2;
  return entry.bid ?? entry.ask;
}

/** What a port does with a good, from its design prices against the good's base price. */
export function portRole(entry: MarketEntry, good: GoodSpec): keyof typeof EQUILIBRIUM {
  const mid = designMid(entry);
  if (mid == null) return 'trader';
  if (entry.ask == null || mid > good.basePrice * (1 + ROLE_MARGIN)) return 'consumer';
  if (mid < good.basePrice * (1 - ROLE_MARGIN)) return 'producer';
  return 'trader';
}

/** The stock a port holds of a good at equilibrium, or null if it does not stock it. */
export function equilibriumStock(station: Station, goods: Readonly<Record<string, GoodSpec>>, goodId: string): number | null {
  const entry = station.market[goodId];
  const good = goods[goodId];
  if (!entry || !isTradeGood(good)) return null;
  return EQUILIBRIUM[portRole(entry, good!)];
}

/** Every port's stock at equilibrium: a new world's, and a loaded world's for anything it lacks. */
export function startingStock(stations: Readonly<Record<string, Station>>, goods: Readonly<Record<string, GoodSpec>>): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const station of Object.values(stations)) {
    const held: Record<string, number> = {};
    for (const goodId of Object.keys(station.market)) {
      const eq = equilibriumStock(station, goods, goodId);
      if (eq != null) held[goodId] = eq;
    }
    if (Object.keys(held).length > 0) out[station.id] = held;
  }
  return out;
}

/** A loaded world's stock: what it saved, with ports and goods it lacks at equilibrium and ones it no longer trades dropped. */
export function settleStock(saved: unknown, stations: Readonly<Record<string, Station>>, goods: Readonly<Record<string, GoodSpec>>): Record<string, Record<string, number>> {
  const fresh = startingStock(stations, goods);
  const old = typeof saved === 'object' && saved !== null ? (saved as Record<string, Record<string, unknown>>) : {};
  for (const [stationId, held] of Object.entries(fresh)) {
    for (const goodId of Object.keys(held)) {
      const v = old[stationId]?.[goodId];
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) held[goodId] = v;
    }
  }
  return fresh;
}

/** The price multiple at a stock level, against equilibrium. */
function multiple(stock: number, eq: number): number {
  const ratio = eq / Math.max(stock, eq * 0.05);
  return Math.min(PRICE_CEILING, Math.max(PRICE_FLOOR, ratio ** ELASTICITY));
}

/** A port's quote for one unit at a given stock: the design entry scaled, kept to whole credits. */
function quoteAt(entry: MarketEntry, stock: number, eq: number): MarketEntry {
  const m = multiple(stock, eq);
  return {
    ask: entry.ask != null && stock >= 1 ? Math.max(1, Math.round(entry.ask * m)) : null,
    bid: entry.bid != null && stock < eq * STOCK_CAP ? Math.max(1, Math.round(entry.bid * m)) : null,
  };
}

/** Stock of a good at a port now, or null if the world keeps no stock for it. */
export function stockOf(world: Pick<World, 'stock'>, stationId: string, goodId: string): number | null {
  const v = world.stock?.[stationId]?.[goodId];
  return typeof v === 'number' ? v : null;
}

/** Prices from stock (this module), falling back to design prices where there is no stock. */
export const stockPrices: PriceSource = {
  quote(world, stationId, goodId) {
    const station = world.stations[stationId];
    const entry = station?.market[goodId];
    if (!station || !entry) return null;
    const stock = stockOf(world, stationId, goodId);
    const eq = equilibriumStock(station, world.goods, goodId);
    if (stock == null || eq == null) return entry;
    return quoteAt(entry, stock, eq);
  },
};

/**
 * What a lot of `quantity` costs to buy (`side` buy) or fetches (`side`
 * sell) at a port, unit by unit as the stock moves; null if the port will
 * not trade that many (sold out, or full).
 */
export function lotPrice(world: World, stationId: string, goodId: string, quantity: number, side: 'buy' | 'sell'): number | null {
  const station = world.stations[stationId];
  const entry = station?.market[goodId];
  if (!station || !entry) return null;
  const stock = stockOf(world, stationId, goodId);
  const eq = equilibriumStock(station, world.goods, goodId);
  if (stock == null || eq == null) {
    const unit = side === 'buy' ? entry.ask : entry.bid;
    return unit == null ? null : unit * quantity;
  }
  let total = 0;
  let s = stock;
  for (let i = 0; i < quantity; i++) {
    const q = quoteAt(entry, s, eq);
    const unit = side === 'buy' ? q.ask : q.bid;
    if (unit == null) return null;
    total += unit;
    s += side === 'buy' ? -1 : 1;
  }
  return total;
}

/** The world with a port's stock of a good moved by `delta` (a sale to it is positive). Unchanged where there is no stock. */
export function moveStock(world: World, stationId: string, goodId: string, delta: number): World {
  const stock = stockOf(world, stationId, goodId);
  if (stock == null || !world.stock) return world;
  return { ...world, stock: { ...world.stock, [stationId]: { ...world.stock[stationId], [goodId]: Math.max(0, stock + delta) } } };
}

/**
 * Production and consumption: every `ECONOMY_STEP_SECONDS`, each port's
 * stock closes on equilibrium. Other ticks return the world unchanged, so
 * the stock part of the world (and what the network sends) changes only
 * then.
 */
export function stepEconomy(world: World): World {
  if (!world.stock) return world;
  const every = Math.max(1, Math.round(ECONOMY_STEP_SECONDS / world.dt));
  if (world.tick % every !== 0) return world;
  const share = 1 - Math.exp(-(every * world.dt) / RECOVERY_SECONDS);
  let changed = false;
  const next: Record<string, Record<string, number>> = {};
  for (const [stationId, held] of Object.entries(world.stock)) {
    const station = world.stations[stationId];
    if (!station) {
      next[stationId] = held;
      continue;
    }
    let row: Record<string, number> | null = null;
    for (const [goodId, stock] of Object.entries(held)) {
      const eq = equilibriumStock(station, world.goods, goodId);
      if (eq == null) continue;
      // Within half a unit counts as settled, so a quiet port stops changing.
      const moved = Math.abs(eq - stock) < 0.5 ? eq : stock + (eq - stock) * share;
      if (moved !== stock) {
        row ??= { ...held };
        row[goodId] = Math.round(moved * 100) / 100;
      }
    }
    next[stationId] = row ?? held;
    if (row) changed = true;
  }
  return changed ? { ...world, stock: next } : world;
}
