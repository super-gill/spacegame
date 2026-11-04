import { describe, expect, it } from 'vitest';
import { CARGO_SURVIVAL_FRACTION, FIXED_DT, STARTING_CREDITS } from '../constants.js';
import { cargoMass, shipStats } from '../stats.js';
import { TEST_CATALOGUES, loadoutStats } from './fixtures.js';
import { stepWorld } from '../step.js';
import { buyGood, cargoFree, maxBuyable, sellGood, type PriceSource } from '../trade.js';
import type { World } from '../types.js';
import { length } from '../vec2.js';
import { createStarterWorld, emptyInput, joinPilot, pilotShip, respawnPilot } from '../world.js';

const SECOND = 60;
const HARBOUR = 'station-harbour';
const RIDGE = 'station-ridge';
/** What new pilots fly. */
const starter = loadoutStats('meridian-starter');

/** A world with one pilot docked at the given station, and no NPCs to get in the way. */
function dockedAt(stationId: string): { w: World; me: string } {
  const base = { ...createStarterWorld(), ships: {}, npcs: {}, spawners: [] };
  let w = joinPilot(base, 'ana', 'Ana');
  const me = pilotShip(w, 'ana')!.id;
  const st = w.stations[stationId]!;
  w = { ...w, ships: { ...w.ships, [me]: { ...w.ships[me]!, state: 'docked', dockedAt: stationId, position: { ...st.position } } } };
  return { w, me };
}

function credits(w: World): number {
  return w.pilots['ana']!.credits;
}

describe('economy data', () => {
  it('no station pays more for a good than it charges for it', () => {
    const w = createStarterWorld();
    for (const st of Object.values(w.stations)) {
      for (const [good, m] of Object.entries(st.market)) {
        if (m.ask != null && m.bid != null) expect(m.bid, `${st.id} ${good}`).toBeLessThan(m.ask);
      }
    }
  });

  it('every station trades only goods that exist', () => {
    const w = createStarterWorld();
    for (const st of Object.values(w.stations)) {
      for (const good of Object.keys(st.market)) expect(w.goods[good], `${st.id} ${good}`).toBeDefined();
    }
  });

  it('there is a profitable run each way between the two stations', () => {
    const w = createStarterWorld();
    const profitable = (from: string, to: string) =>
      Object.keys(w.goods).some((g) => {
        const ask = w.stations[from]!.market[g]?.ask;
        const bid = w.stations[to]!.market[g]?.bid;
        return ask != null && bid != null && bid > ask;
      });
    expect(profitable(HARBOUR, RIDGE)).toBe(true);
    expect(profitable(RIDGE, HARBOUR)).toBe(true);
  });

  it('new pilots start with credits', () => {
    expect(credits(dockedAt(HARBOUR).w)).toBe(STARTING_CREDITS);
  });
});

describe('buying and selling', () => {
  it('buys: pays the ask, fills the hold', () => {
    const { w, me } = dockedAt(HARBOUR);
    const r = buyGood(w, 'ana', 'machinery', 5);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(credits(r.world)).toBe(STARTING_CREDITS - 5 * 70);
    expect(r.world.ships[me]!.hold['machinery']).toBe(5);
    expect(r.event).toEqual({ type: 'traded', shipId: me, good: 'machinery', quantity: 5, unitPrice: 70, side: 'buy' });
  });

  it('sells: receives the bid, empties the hold', () => {
    let { w, me } = dockedAt(RIDGE);
    w = { ...w, ships: { ...w.ships, [me]: { ...w.ships[me]!, hold: { machinery: 5 } } } };
    const r = sellGood(w, 'ana', 'machinery', 5);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(credits(r.world)).toBe(STARTING_CREDITS + 5 * 98);
    expect(r.world.ships[me]!.hold).toEqual({});
  });

  it('a full round trip makes a profit', () => {
    let { w, me } = dockedAt(HARBOUR);
    const bought = buyGood(w, 'ana', 'machinery', 10);
    if (!bought.ok) throw new Error(bought.reason);
    w = bought.world;
    // Teleport to the outpost: the flight is not what is being tested.
    w = { ...w, ships: { ...w.ships, [me]: { ...w.ships[me]!, dockedAt: RIDGE, position: { ...w.stations[RIDGE]!.position } } } };
    const sold = sellGood(w, 'ana', 'machinery', 10);
    if (!sold.ok) throw new Error(sold.reason);
    expect(credits(sold.world)).toBe(STARTING_CREDITS + 10 * (98 - 70));
  });

  it('refuses, and changes nothing, when it cannot be done', () => {
    const { w, me } = dockedAt(HARBOUR);
    const cases: Array<[ReturnType<typeof buyGood>, string]> = [
      [buyGood(w, 'ana', 'machinery', 100), 'credits'], // 7000 credits
      [buyGood(w, 'ana', 'food', starter.cargoCapacity + 1), 'space'],
      [buyGood(w, 'ana', 'scrap', 1), 'notTraded'], // Harbour does not sell scrap
      [buyGood(w, 'ana', 'food', 0), 'badQuantity'],
      [buyGood(w, 'ana', 'food', 1.5), 'badQuantity'],
      [sellGood(w, 'ana', 'food', 1), 'notHeld'],
      [buyGood(w, 'nobody', 'food', 1), 'noShip'],
    ];
    for (const [r, reason] of cases) {
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe(reason);
      expect(r.world).toBe(w);
    }
    const flying = { ...w, ships: { ...w.ships, [me]: { ...w.ships[me]!, state: 'flying' as const, dockedAt: null } } };
    const r = buyGood(flying, 'ana', 'food', 1);
    expect(r.ok ? 'ok' : r.reason).toBe('notDocked');
  });

  it('maxBuyable is limited by credits and by space', () => {
    const { w } = dockedAt(HARBOUR);
    expect(maxBuyable(w, 'ana', 'machinery')).toBe(Math.floor(STARTING_CREDITS / 70)); // 14, credits bind
    expect(maxBuyable(w, 'ana', 'food')).toBe(starter.cargoCapacity); // 20, space binds
    expect(maxBuyable(w, 'ana', 'scrap')).toBe(0);
  });

  it('reads prices through a swappable price source', () => {
    const { w } = dockedAt(HARBOUR);
    const free: PriceSource = { quote: () => ({ ask: 0, bid: 1 }) };
    const r = buyGood(w, 'ana', 'ore', 3, free);
    expect(r.ok && credits(r.world)).toBe(STARTING_CREDITS);
  });
});

describe('cargo', () => {
  it('cargo adds mass, so a loaded ship accelerates more slowly', () => {
    let { w, me } = dockedAt(HARBOUR);
    const empty = w.ships[me]!;
    const loaded = { ...empty, hold: { ore: 20 } };
    expect(cargoMass(loaded, w.goods)).toBeCloseTo(6, 9);
    expect(shipStats(TEST_CATALOGUES, loaded).mass).toBeCloseTo(starter.mass + 6, 9);

    const fly = (shipHold: Record<string, number>) => {
      let x: World = { ...w, ships: { ...w.ships, [me]: { ...empty, state: 'flying', dockedAt: null, position: { x: 3000, y: 3000 }, hold: shipHold } } };
      for (let i = 0; i < SECOND; i++) x = stepWorld(x, { [me]: { ...emptyInput(), thrustForward: true } });
      return length(x.ships[me]!.velocity);
    };
    // Same thrust, more mass: speed after one second scales with 1 / mass.
    expect(fly({ ore: 20 }) / fly({})).toBeCloseTo(starter.mass / (starter.mass + 6), 2);
  });

  it('a destroyed ship spills part of its cargo as loot', () => {
    let { w, me } = dockedAt(HARBOUR);
    w = { ...w, ships: { ...w.ships, [me]: { ...w.ships[me]!, state: 'flying', dockedAt: null, position: { x: 3000, y: 3000 }, hold: { machinery: 10 }, structure: 0 } } };
    w = stepWorld(w, {});
    const spilled = w.loot.filter((l) => l.item === 'machinery').reduce((n, l) => n + l.amount, 0);
    expect(spilled).toBe(Math.floor(10 * CARGO_SURVIVAL_FRACTION));
  });

  it('credits survive losing the ship; cargo does not', () => {
    let { w, me } = dockedAt(HARBOUR);
    const bought = buyGood(w, 'ana', 'food', 10);
    if (!bought.ok) throw new Error(bought.reason);
    w = bought.world;
    const paid = credits(w);
    w = { ...w, ships: { ...w.ships, [me]: { ...w.ships[me]!, state: 'flying', dockedAt: null, position: { x: 3000, y: 3000 }, structure: 0 } } };
    w = respawnPilot(stepWorld(w, {}), 'ana');
    expect(credits(w)).toBe(paid);
    // The pilot got away in a pod, which carries nothing.
    expect(pilotShip(w, 'ana')!.hullId).toBe('escape-pod');
    expect(pilotShip(w, 'ana')!.hold).toEqual({});
  });

  it('the tractor beam takes only what fits and leaves the rest floating', () => {
    let { w, me } = dockedAt(HARBOUR);
    const pos = { x: 3000, y: 3000 };
    w = {
      ...w,
      ships: { ...w.ships, [me]: { ...w.ships[me]!, state: 'flying', dockedAt: null, position: pos, hold: { food: starter.cargoCapacity - 2 } } },
      loot: [{ id: 'l1', item: 'ore', amount: 5, position: { x: pos.x + 100, y: pos.y }, velocity: { x: 0, y: 0 }, ticksLeft: 5000 }],
    };
    for (let i = 0; i < SECOND * 3; i++) w = stepWorld(w, { [me]: { ...emptyInput(), tractor: true } });
    expect(w.ships[me]!.hold['ore']).toBe(2);
    expect(cargoFree(w.ships[me]!, starter)).toBe(0);
    expect(w.loot.map((l) => l.amount)).toEqual([3]);
  });

  it('the NPC trader carries goods worth hunting', () => {
    const w = createStarterWorld();
    expect(Object.values(w.ships['npc-trader-1']!.hold).reduce((n, q) => n + q, 0)).toBeGreaterThan(0);
  });
});

describe('determinism with cargo', () => {
  it('two runs are still identical', () => {
    const run = () => {
      let w = createStarterWorld();
      for (let i = 0; i < SECOND * 60; i++) w = stepWorld(w, {});
      return JSON.stringify(w);
    };
    expect(run()).toBe(run());
    expect(FIXED_DT).toBeGreaterThan(0);
  });
});
