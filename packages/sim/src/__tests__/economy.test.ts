import { describe, expect, it } from 'vitest';
import { EQUILIBRIUM, RECOVERY_SECONDS, equilibriumStock, isTradeGood, lotPrice, stepEconomy, stockOf, stockPrices } from '../economy.js';
import { deserializeWorld, serializeWorld } from '../save.js';
import { createSolWorld } from '../sol.js';
import { buyGood, maxBuyable, sellGood } from '../trade.js';
import type { World } from '../types.js';
import { createStarterWorld, joinPilot, pilotShip } from '../world.js';

/** A Sol world with one pilot docked at `stationId` with `credits` and a big empty hold. */
function docked(stationId: string, credits = 1_000_000, hold: Record<string, number> = {}): World {
  let w = joinPilot(createSolWorld(), 'p', 'Pat', 'earth-private');
  const ship = pilotShip(w, 'p')!;
  w = { ...w, pilots: { ...w.pilots, p: { ...w.pilots['p']!, credits } }, ships: { ...w.ships, [ship.id]: { ...ship, state: 'docked', dockedAt: stationId, hold } } };
  return w;
}

/** A port and a trade good it both buys and sells, for the tests. */
function tradedPair(w: World): { stationId: string; goodId: string } {
  for (const st of Object.values(w.stations)) {
    for (const [goodId, entry] of Object.entries(st.market)) {
      if (entry.ask != null && entry.bid != null && isTradeGood(w.goods[goodId])) return { stationId: st.id, goodId };
    }
  }
  throw new Error('no traded pair');
}

describe('the economy (Open Lanes step 4)', () => {
  it('starts every Sol port at equilibrium, where prices are the design prices; kit has no stock', () => {
    const w = createSolWorld();
    expect(Object.keys(w.stock!).length).toBeGreaterThan(20);
    for (const st of Object.values(w.stations)) {
      for (const [goodId, entry] of Object.entries(st.market)) {
        const eq = equilibriumStock(st, w.goods, goodId);
        if (!isTradeGood(w.goods[goodId])) {
          expect(stockOf(w, st.id, goodId), `${st.id} ${goodId}`).toBeNull();
          continue;
        }
        expect(stockOf(w, st.id, goodId), `${st.id} ${goodId}`).toBe(eq);
        expect(stockPrices.quote(w, st.id, goodId), `${st.id} ${goodId}`).toEqual(entry);
      }
    }
    expect(createStarterWorld().stock).toBeUndefined();
  });

  it('a producer holds more than a consumer', () => {
    expect(EQUILIBRIUM.producer).toBeGreaterThan(EQUILIBRIUM.trader);
    expect(EQUILIBRIUM.trader).toBeGreaterThan(EQUILIBRIUM.consumer);
  });

  it('selling a lot raises the stock and lowers the price as it goes; buying does the reverse', () => {
    const base = createSolWorld();
    const { stationId, goodId } = tradedPair(base);
    const before = stockPrices.quote(base, stationId, goodId)!;
    let w = docked(stationId, 1_000_000, { [goodId]: 200 });
    const lot = lotPrice(w, stationId, goodId, 200, 'sell')!;
    expect(lot).toBeLessThan(before.bid! * 200);
    const sold = sellGood(w, 'p', goodId, 200);
    expect(sold.ok ? 'ok' : sold.reason).toBe('ok');
    w = sold.world;
    expect(w.pilots['p']!.credits).toBe(1_000_000 + lot);
    expect(stockOf(w, stationId, goodId)).toBe(stockOf(base, stationId, goodId)! + 200);
    expect(stockPrices.quote(w, stationId, goodId)!.bid!).toBeLessThan(before.bid!);
    // Buying back pushes the price up again.
    const bought = buyGood(w, 'p', goodId, 10);
    expect(bought.ok ? 'ok' : bought.reason).toBe('ok');
    expect(stockOf(bought.world, stationId, goodId)).toBe(stockOf(w, stationId, goodId)! - 10);
  });

  it('cannot buy more than the port holds, and a bought-out port has no ask', () => {
    const { stationId, goodId } = tradedPair(createSolWorld());
    let w = docked(stationId, 100_000_000);
    const room = { ...w.ships[pilotShip(w, 'p')!.id]!, hold: {} };
    // A huge hold for the test: the cap that matters is the port's stock.
    w = { ...w, ships: { ...w.ships, [room.id]: room } };
    const most = maxBuyable(w, 'p', goodId);
    expect(most).toBeLessThanOrEqual(Math.floor(stockOf(w, stationId, goodId)!));
    const tooMany = buyGood(w, 'p', goodId, Math.floor(stockOf(w, stationId, goodId)!) + 1);
    expect(tooMany.ok).toBe(false);
  });

  it('recovers towards equilibrium: about 63% of the gap in RECOVERY_SECONDS, and settled ports stop changing', () => {
    const { stationId, goodId } = tradedPair(createSolWorld());
    let w = docked(stationId, 0, { [goodId]: 300 });
    w = sellGood(w, 'p', goodId, 300).world;
    const eq = equilibriumStock(w.stations[stationId]!, w.goods, goodId)!;
    const gap = stockOf(w, stationId, goodId)! - eq;
    const steps = Math.round(RECOVERY_SECONDS / w.dt);
    for (let t = 0; t < steps; t++) w = stepEconomy({ ...w, tick: w.tick + 1 });
    const left = (stockOf(w, stationId, goodId)! - eq) / gap;
    expect(left).toBeGreaterThan(0.3);
    expect(left).toBeLessThan(0.42);
    const settled = createSolWorld();
    expect(stepEconomy({ ...settled, tick: 600 }).stock).toBe(settled.stock);
  });

  it('keeps stock through a save, and gives a Sol save from before the economy its ports at equilibrium', () => {
    const { stationId, goodId } = tradedPair(createSolWorld());
    const w = sellGood(docked(stationId, 0, { [goodId]: 50 }), 'p', goodId, 50).world;
    const loaded = deserializeWorld(serializeWorld(w, 'now'));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(stockOf(loaded.world, stationId, goodId)).toBe(stockOf(w, stationId, goodId));
    const { stock: _gone, ...old } = w;
    const fromOld = deserializeWorld(serializeWorld(old as World, 'then'));
    expect(fromOld.ok && stockOf(fromOld.world, stationId, goodId)).toBe(equilibriumStock(w.stations[stationId]!, w.goods, goodId));
  });
});
