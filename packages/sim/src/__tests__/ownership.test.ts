import { describe, expect, it } from 'vitest';
import { BOARD_MAX_RELATIVE_SPEED, BOARD_RANGE, POD_INHERIT_FRACTION } from '../constants.js';
import { freePadFor, launchPoint, onPad, padWorldPosition } from '../docking.js';
import { buildShip } from '../factory.js';
import { planRefit } from '../fitting.js';
import { HULLS } from '../hulls.js';
import { LOADOUTS } from '../loadouts.js';
import { isEmptyShip, ownedShips, pilotsAboard, shipPilot } from '../ownership.js';
import {
  boardableShips,
  boardRefusal,
  boardShip,
  buyRefusal,
  buyShip,
  claimRefusal,
  claimStarterShip,
  shipPrice,
  stepOut,
  stepOutRefusal,
  wakePilot,
} from '../pilots.js';
import { deserializeWorld, serializeWorld } from '../save.js';
import { shipStats } from '../stats.js';
import { starterStations } from '../stations.js';
import { stepWorld } from '../step.js';
import type { ModuleSize, Ship, World } from '../types.js';
import { createStarterWorld, emptyInput, joinPilot, pilotShip } from '../world.js';

const HARBOUR = 'station-harbour';
const RIDGE = 'station-ridge';
const SECOND = 60;

/** Starter sector with no NPCs, and Ana in her starter in space off Harbour. */
function quietWorld(): { w: World; me: string } {
  const base = { ...createStarterWorld(), ships: {}, npcs: {}, spawners: [] };
  const w = joinPilot(base, 'ana', 'Ana');
  return { w, me: pilotShip(w, 'ana')!.id };
}

/** A ship set down on the station's smallest free pad that fits it. */
function parked(w: World, ship: Ship, stationId: string): Ship {
  const station = w.stations[stationId]!;
  const pad = freePadFor(station, w.hulls[ship.hullId]!.sizeClass, w.ships);
  if (!pad) throw new Error(`no pad for ${ship.id} at ${stationId}`);
  return onPad(ship, station, pad);
}

/** Put a ship into the world. */
function put(w: World, ship: Ship): World {
  return { ...w, ships: { ...w.ships, [ship.id]: ship } };
}

/** A ship built from a loadout, owned by `ownerId`, nobody aboard. */
function spare(w: World, id: string, loadoutId: string, ownerId: string | null, at = { x: 3000, y: 3000 }): Ship {
  return buildShip(w, { id, loadout: LOADOUTS[loadoutId]!, ownerId, position: at, heading: 0, flightMode: 'assisted' });
}

/** Ana's ship docked at a station. */
function anaDocked(stationId: string, credits = 1000): { w: World; me: string } {
  const q = quietWorld();
  const docked = parked(q.w, q.w.ships[q.me]!, stationId);
  const w = put(q.w, docked);
  return { w: { ...w, pilots: { ...w.pilots, ana: { ...w.pilots['ana']!, credits } } }, me: q.me };
}

/** Run the world for some ticks with no inputs. */
function run(w: World, ticks: number): World {
  for (let i = 0; i < ticks; i++) w = stepWorld(w, {});
  return w;
}

/** Destroy a ship by setting its structure to zero and stepping once. */
function destroy(w: World, shipId: string): World {
  return stepWorld({ ...w, ships: { ...w.ships, [shipId]: { ...w.ships[shipId]!, shield: 0, structure: 0 } } }, {});
}

// ---------------------------------------------------------------------------

describe('owning versus flying', () => {
  it('the pilot aboard is Pilot.shipId, never the owner', () => {
    let { w, me } = quietWorld();
    w = put(w, spare(w, 'spare', 'meridian-starter', 'ana'));
    expect(shipPilot(w, me)?.id).toBe('ana');
    expect(shipPilot(w, 'spare')).toBeNull();
    expect(isEmptyShip(w, w.ships['spare']!)).toBe(true);
    expect(isEmptyShip(w, w.ships[me]!)).toBe(false);
    expect(pilotsAboard(w)).toEqual({ [me]: 'ana' });
    expect(ownedShips(w, 'ana').map((s) => s.id)).toEqual([me, 'spare'].sort());
  });

  it('an NPC brain counts as someone aboard', () => {
    const w = createStarterWorld();
    for (const id of Object.keys(w.npcs)) expect(isEmptyShip(w, w.ships[id]!)).toBe(false);
  });

  it('an empty ship coasts: no assist, no brake, no guns', () => {
    let { w, me } = quietWorld();
    const drift = { x: 40, y: -10 };
    w = put(w, { ...spare(w, 'spare', 'meridian-starter', 'ana'), velocity: drift, angularVelocity: 0.5 });
    w = put(w, { ...w.ships[me]!, position: { x: -3000, y: 3000 }, velocity: drift });
    w = run(w, SECOND);
    // Ana's flown ship, in full assist with nothing pressed, has bled its drift away.
    expect(Math.hypot(w.ships[me]!.velocity.x, w.ships[me]!.velocity.y)).toBeLessThan(40);
    // The empty one has not been touched.
    expect(w.ships['spare']!.velocity).toEqual(drift);
    expect(w.ships['spare']!.angularVelocity).toBe(0.5);
    expect(w.projectiles).toEqual([]);
  });

  it('pirates leave empty ships alone but hunt flown ones', () => {
    const fresh = createStarterWorld();
    const pirateId = Object.keys(fresh.npcs).find((id) => fresh.npcs[id]!.kind === 'pirate')!;
    const near = { x: fresh.ships[pirateId]!.position.x + 300, y: fresh.ships[pirateId]!.position.y };

    let empty = joinPilot(fresh, 'ana', 'Ana');
    empty = put(empty, spare(empty, 'spare', 'meridian-starter', 'ana', near));
    empty = run(empty, SECOND);
    expect(empty.npcs[pirateId]!.kind === 'pirate' && empty.npcs[pirateId]!.mode).toBe('prowl');

    let flown = joinPilot(fresh, 'ana', 'Ana');
    const me = pilotShip(flown, 'ana')!.id;
    flown = put(flown, { ...flown.ships[me]!, position: near });
    flown = run(flown, SECOND);
    const brain = flown.npcs[pirateId]!;
    expect(brain.kind === 'pirate' && brain.mode).toBe('hunt');
  });

  it('an empty ship can be destroyed; it leaves a wreck and no pod', () => {
    let { w } = quietWorld();
    w = put(w, spare(w, 'spare', 'meridian-starter', 'ana'));
    const before = w.pilots['ana']!;
    w = destroy(w, 'spare');
    expect(w.ships['spare']).toBeUndefined();
    expect(w.wrecks).toHaveLength(1);
    expect(w.events.some((e) => e.type === 'podEjected')).toBe(false);
    expect(w.pilots['ana']).toEqual(before);
  });
});

// ---------------------------------------------------------------------------

describe('pads', () => {
  const MAX_RADIUS: Record<ModuleSize, number> = { S: 0, M: 0, L: 0, XL: 0 };
  for (const h of Object.values(HULLS)) MAX_RADIUS[h.sizeClass] = Math.max(MAX_RADIUS[h.sizeClass], h.radius);
  const RANK: Record<ModuleSize, number> = { S: 0, M: 1, L: 2, XL: 3 };
  /** Biggest hull radius that fits a pad of this size. */
  const fitsRadius = (size: ModuleSize) =>
    Math.max(...(Object.keys(MAX_RADIUS) as ModuleSize[]).filter((s) => RANK[s] <= RANK[size]).map((s) => MAX_RADIUS[s]));

  it('every starter station has sound pads: unique ids, launch clear of the hull, room between pads', () => {
    for (const st of Object.values(starterStations())) {
      expect(st.pads.length).toBeGreaterThan(0);
      expect(new Set(st.pads.map((p) => p.id)).size).toBe(st.pads.length);
      for (const p of st.pads) {
        const launch = launchPoint(st, p);
        const out = Math.hypot(launch.x - st.position.x, launch.y - st.position.y);
        expect(out, `${st.id} ${p.id} launch`).toBeGreaterThan(st.radius + fitsRadius(p.size));
      }
      for (const a of st.pads) {
        for (const b of st.pads) {
          if (a.id >= b.id) continue;
          const gap = Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y);
          expect(gap, `${st.id} ${a.id}-${b.id}`).toBeGreaterThanOrEqual(fitsRadius(a.size) + fitsRadius(b.size));
        }
      }
    }
  });

  it('Harbour has a large pad for every hull its ship mart sells, and Ridge one for the trader', () => {
    const stations = starterStations();
    for (const st of Object.values(stations)) {
      for (const id of st.shipMart) {
        const size = HULLS[LOADOUTS[id]!.hullId]!.sizeClass;
        expect(freePadFor(st, size, {}), `${st.id} ${id}`).not.toBeNull();
      }
    }
    expect(freePadFor(stations[RIDGE]!, 'L', {})).not.toBeNull();
  });

  it('a ship docks on the smallest free pad that fits it', () => {
    const st = createStarterWorld().stations[HARBOUR]!;
    expect(freePadFor(st, 'S', {})!.id).toBe('s1');
    expect(freePadFor(st, 'M', {})!.id).toBe('m1');
    expect(freePadFor(st, 'L', {})!.id).toBe('l1');
    // With every small pad taken, a small hull takes a medium pad.
    const ships: Record<string, Ship> = {};
    for (const p of st.pads.filter((p) => p.size === 'S')) ships[p.id] = { dockedAt: st.id, padId: p.id } as Ship;
    expect(freePadFor(st, 'S', ships)!.id).toBe('m1');
  });

  it('docking is refused when no free pad fits', () => {
    let { w, me } = quietWorld();
    const st = w.stations[HARBOUR]!;
    // Fill every pad with an empty ship.
    st.pads.forEach((p, i) => {
      w = put(w, onPad(spare(w, `filler-${i}`, 'meridian-starter', null), st, p));
    });
    w = put(w, { ...w.ships[me]!, position: { x: 100, y: 0 }, velocity: { x: 0, y: 0 } });
    const next = stepWorld(w, { [me]: { ...emptyInput(), toggleDock: true } });
    expect(next.events).toContainEqual({ type: 'dockRefused', shipId: me, reason: 'noPad' });
    expect(next.ships[me]!.state).toBe('flying');
  });

  it('two ships docking in the same tick get different pads', () => {
    let { w, me } = quietWorld();
    w = joinPilot(w, 'ben', 'Ben');
    const ben = pilotShip(w, 'ben')!.id;
    w = put(w, { ...w.ships[me]!, position: { x: 100, y: 0 }, velocity: { x: 0, y: 0 } });
    w = put(w, { ...w.ships[ben]!, position: { x: -100, y: 0 }, velocity: { x: 0, y: 0 } });
    const dock = { ...emptyInput(), toggleDock: true };
    const next = stepWorld(w, { [me]: dock, [ben]: dock });
    expect(next.ships[me]!.padId).not.toBeNull();
    expect(next.ships[ben]!.padId).not.toBeNull();
    expect(next.ships[me]!.padId).not.toBe(next.ships[ben]!.padId);
  });

  it('the trader starts on a pad at Harbour', () => {
    const w = createStarterWorld();
    const trader = Object.values(w.ships).find((s) => w.npcs[s.id]?.kind === 'trader')!;
    expect(trader.state).toBe('docked');
    expect(trader.padId).toBe('l1');
    expect(trader.position).toEqual(padWorldPosition(w.stations[HARBOUR]!, w.stations[HARBOUR]!.pads.find((p) => p.id === 'l1')!));
  });
});

// ---------------------------------------------------------------------------

describe('ship mart', () => {
  it('prices a ship as its hull plus its modules', () => {
    const loadout = LOADOUTS['meridian-starter']!;
    const w = createStarterWorld();
    const modules = Object.values(loadout.fit).reduce((n, id) => n + w.modules[id]!.price, 0);
    expect(shipPrice(w, loadout)).toBe(HULLS['meridian-courier']!.price + modules);
  });

  it('ship marts sell only real, unsealed loadouts', () => {
    for (const st of Object.values(starterStations())) {
      for (const id of st.shipMart) {
        const loadout = LOADOUTS[id];
        expect(loadout, id).toBeDefined();
        expect(HULLS[loadout!.hullId]!.sealed, id).toBeFalsy();
      }
    }
  });

  it('buying puts a new, empty ship of yours on a free pad', () => {
    const { w, me } = anaDocked(HARBOUR, 50000);
    const price = shipPrice(w, LOADOUTS['kessari-raider']!);
    const r = buyShip(w, 'ana', 'kessari-raider');
    if (!r.ok) throw new Error(r.reason);
    const bought = r.world.ships['ship-ana-2']!;
    expect(r.event).toEqual({ type: 'shipBought', shipId: 'ship-ana-2', stationId: HARBOUR, loadoutId: 'kessari-raider', price });
    expect(bought.ownerId).toBe('ana');
    expect(bought.state).toBe('docked');
    expect(bought.dockedAt).toBe(HARBOUR);
    expect(bought.padId).toBe('m1');
    expect(isEmptyShip(r.world, bought)).toBe(true);
    expect(bought.structure).toBe(shipStats(r.world, bought).structure);
    expect(r.world.pilots['ana']!.credits).toBe(50000 - price);
    expect(r.world.pilots['ana']!.shipId).toBe(me); // still in the old one
  });

  it('refuses with a reason', () => {
    const rich = 1_000_000;
    expect(buyRefusal(quietWorld().w, 'ana', 'meridian-starter')).toBe('notDocked');
    expect(buyRefusal(anaDocked(RIDGE, rich).w, 'ana', 'meridian-starter')).toBe('noShipMart');
    expect(buyRefusal(anaDocked(HARBOUR, rich).w, 'ana', 'sparrow-dev')).toBe('notSold');
    expect(buyRefusal(anaDocked(HARBOUR, rich).w, 'ana', 'escape-pod')).toBe('notSold');
    expect(buyRefusal(anaDocked(HARBOUR, 10).w, 'ana', 'meridian-starter')).toBe('credits');
    expect(buyRefusal(anaDocked(HARBOUR, rich).w, 'nobody', 'meridian-starter')).toBe('noShip');

    // Every large pad taken: no Spine.
    let { w } = anaDocked(HARBOUR, rich);
    for (const p of w.stations[HARBOUR]!.pads.filter((p) => p.size === 'L')) {
      w = put(w, onPad(spare(w, `big-${p.id}`, 'tessaract-trader', null), w.stations[HARBOUR]!, p));
    }
    expect(buyRefusal(w, 'ana', 'tessaract-trader')).toBe('noPad');
    const r = buyShip(w, 'ana', 'tessaract-trader');
    expect(r).toEqual({ ok: false, world: w, reason: 'noPad' });
  });
});

// ---------------------------------------------------------------------------

describe('boarding', () => {
  /** Ana docked at Harbour with a bought Wedge beside her. */
  function withSpareDocked(): { w: World; me: string; spareId: string } {
    const { w, me } = anaDocked(HARBOUR, 50000);
    const r = buyShip(w, 'ana', 'kessari-raider');
    if (!r.ok) throw new Error(r.reason);
    return { w: r.world, me, spareId: 'ship-ana-2' };
  }

  it('moves the pilot between ships docked at the same station', () => {
    const { w, me, spareId } = withSpareDocked();
    const before = { ...w.ships[me]!, weaponsHot: true, targetId: 'x' };
    const r = boardShip(put(w, before), 'ana', spareId);
    if (!r.ok) throw new Error(r.reason);
    expect(r.event).toEqual({ type: 'boarded', shipId: spareId, from: me });
    expect(r.world.pilots['ana']!.shipId).toBe(spareId);
    const left = r.world.ships[me]!;
    expect(isEmptyShip(r.world, left)).toBe(true);
    expect(left.padId).toBe(before.padId);
    expect(left.position).toEqual(before.position);
    expect(left.weaponsHot).toBe(false);
    expect(left.targetId).toBeNull();
    // And back again.
    expect(boardShip(r.world, 'ana', me).ok).toBe(true);
  });

  it('in space: within range and slow relative to each other', () => {
    let { w, me } = quietWorld();
    const at = { x: 3000, y: 3000 };
    const v = { x: 100, y: 0 };
    w = put(w, { ...w.ships[me]!, position: at, velocity: v });
    w = put(w, { ...spare(w, 'spare', 'kessari-raider', 'ana', { x: at.x + BOARD_RANGE - 1, y: at.y }), velocity: { x: v.x + BOARD_MAX_RELATIVE_SPEED - 1, y: 0 } });
    expect(boardableShips(w, 'ana').map((s) => s.id)).toEqual(['spare']);
    const r = boardShip(w, 'ana', 'spare');
    if (!r.ok) throw new Error(r.reason);
    // The old ship is left exactly where it was, keeps its momentum, and coasts.
    expect(r.world.ships[me]!.velocity).toEqual(v);
    const later = run(r.world, SECOND);
    expect(later.ships[me]!.velocity).toEqual(v);

    const far = put(w, { ...w.ships['spare']!, position: { x: at.x + BOARD_RANGE + 1, y: at.y } });
    expect(boardRefusal(far, 'ana', 'spare')).toBe('tooFar');
    const fast = put(w, { ...w.ships['spare']!, velocity: { x: v.x + BOARD_MAX_RELATIVE_SPEED + 1, y: 0 } });
    expect(boardRefusal(fast, 'ana', 'spare')).toBe('tooFast');
  });

  it('refuses with a reason', () => {
    const { w, me, spareId } = withSpareDocked();
    expect(boardRefusal(w, 'ana', me)).toBe('sameShip');
    expect(boardRefusal(w, 'ana', 'nope')).toBe('unknownShip');
    expect(boardRefusal(w, 'nobody', spareId)).toBe('noShip');

    // Someone else's ship, empty or not.
    let other = joinPilot(w, 'ben', 'Ben');
    const benShip = pilotShip(other, 'ben')!.id;
    other = put(other, parked(other, other.ships[benShip]!, HARBOUR));
    expect(boardRefusal(other, 'ana', benShip)).toBe('notOwned');
    // Ana's own ship with Ben somehow aboard is not empty.
    other = { ...other, pilots: { ...other.pilots, ben: { ...other.pilots['ben']!, shipId: spareId } } };
    expect(boardRefusal(other, 'ana', spareId)).toBe('notEmpty');

    // Docked at different stations, or one docked and one in space.
    const elsewhere = put(w, parked(w, { ...w.ships[spareId]!, state: 'flying', dockedAt: null, padId: null }, RIDGE));
    expect(boardRefusal(elsewhere, 'ana', spareId)).toBe('notTogether');
    const outside = put(w, { ...w.ships[spareId]!, state: 'flying', dockedAt: null, padId: null, position: w.ships[me]!.position });
    expect(boardRefusal(outside, 'ana', spareId)).toBe('notTogether');
  });
});

// ---------------------------------------------------------------------------

describe('escape pods', () => {
  it('a pilot whose ship is destroyed is ejected in a pod at the wreck', () => {
    let { w, me } = quietWorld();
    const v = { x: 100, y: 50 };
    w = put(w, { ...w.ships[me]!, position: { x: 3000, y: 3000 }, velocity: v, heading: 0 });
    w = destroy(w, me);
    const pod = pilotShip(w, 'ana')!;
    expect(pod.hullId).toBe('escape-pod');
    expect(pod.ownerId).toBe('ana');
    expect(w.events).toContainEqual({ type: 'podEjected', shipId: pod.id, from: me });
    expect(Math.hypot(pod.position.x - 3000, pod.position.y - 3000)).toBeLessThan(60);
    // Keeps a little of the ship's velocity along its line of flight, plus the ejection kick sideways.
    expect(pod.velocity.x).toBeCloseTo(v.x * POD_INHERIT_FRACTION, 0);
    expect(pod.velocity.y).toBeGreaterThan(v.y * POD_INHERIT_FRACTION);
    const stats = shipStats(w, pod);
    expect(Object.keys(stats.weapons)).toEqual([]);
    expect(stats.cargoCapacity).toBe(0);
    expect(stats.mainThrust).toBeGreaterThan(0);
    expect(stats.rotationThrust).toBeGreaterThan(0);
  });

  it('a pod cannot be refitted, and owning only a pod is owning nothing', () => {
    let { w, me } = quietWorld();
    w = destroy(w, me);
    expect(ownedShips(w, 'ana')).toEqual([]);
    const pod = pilotShip(w, 'ana')!;
    w = put(w, parked(w, pod, HARBOUR));
    expect(planRefit(w, 'ana', 'e1', null)).toEqual({ ok: false, reason: 'sealed' });
  });

  it('NPCs do not get pods', () => {
    const w = createStarterWorld();
    const pirate = Object.keys(w.npcs).find((id) => w.npcs[id]!.kind === 'pirate')!;
    const next = destroy(w, pirate);
    expect(Object.values(next.ships).filter((s) => s.hullId === 'escape-pod')).toEqual([]);
  });

  it('pirates do not hunt pods', () => {
    const fresh = createStarterWorld();
    const pirateId = Object.keys(fresh.npcs).find((id) => fresh.npcs[id]!.kind === 'pirate')!;
    const near = { x: fresh.ships[pirateId]!.position.x + 300, y: fresh.ships[pirateId]!.position.y };
    // Lose the ship well away from the pirate, then drift the pod right past it.
    let w = joinPilot(fresh, 'ana', 'Ana');
    w = destroy(put(w, { ...pilotShip(w, 'ana')!, position: { x: -3000, y: 3000 } }), pilotShip(w, 'ana')!.id);
    w = put(w, { ...pilotShip(w, 'ana')!, position: near });
    w = run(w, SECOND);
    const brain = w.npcs[pirateId]!;
    expect(brain.kind === 'pirate' && brain.mode).toBe('prowl');
  });

  it('losing the pod with no ship owned wakes you in a free starter on a pad at Harbour', () => {
    let { w, me } = quietWorld();
    w = destroy(w, me);
    w = destroy(w, pilotShip(w, 'ana')!.id);
    expect(w.pilots['ana']!.shipId).toBeNull();
    const r = wakePilot(w, 'ana');
    if (!r.ok) throw new Error(r.reason);
    const ship = pilotShip(r.world, 'ana')!;
    expect(ship.hullId).toBe('meridian-courier');
    expect(ship.dockedAt).toBe(HARBOUR);
    expect(ship.padId).not.toBeNull();
    expect(r.event).toEqual({ type: 'pilotWoke', shipId: ship.id, stationId: HARBOUR });
    expect(wakePilot(r.world, 'ana')).toEqual({ ok: false, world: r.world, reason: 'hasShip' });
  });

  it('losing the pod while owning a ship wakes you in a new pod at Harbour', () => {
    let { w, me } = quietWorld();
    w = put(w, parked(w, spare(w, 'spare', 'kessari-raider', 'ana'), RIDGE));
    w = destroy(w, me);
    w = destroy(w, pilotShip(w, 'ana')!.id);
    const r = wakePilot(w, 'ana');
    if (!r.ok) throw new Error(r.reason);
    const pod = pilotShip(r.world, 'ana')!;
    expect(pod.hullId).toBe('escape-pod');
    expect(pod.dockedAt).toBe(HARBOUR);
    expect(claimRefusal(r.world, 'ana')).toBe('ownsShips');
  });

  it('wakes just off Harbour if every pad is taken', () => {
    let { w, me } = quietWorld();
    const st = w.stations[HARBOUR]!;
    st.pads.forEach((p, i) => {
      w = put(w, onPad(spare(w, `filler-${i}`, 'meridian-starter', null), st, p));
    });
    w = destroy(w, me);
    w = destroy(w, pilotShip(w, 'ana')!.id);
    const r = wakePilot(w, 'ana');
    if (!r.ok) throw new Error(r.reason);
    const ship = pilotShip(r.world, 'ana')!;
    expect(ship.state).toBe('flying');
    expect(Math.hypot(ship.position.x - st.position.x, ship.position.y - st.position.y)).toBeLessThan(st.securityRadius);
  });

  it('a pilot in a pod at Harbour who owns nothing can claim the free starter', () => {
    let { w, me } = quietWorld();
    w = destroy(w, me);
    const podId = pilotShip(w, 'ana')!.id;
    expect(claimRefusal(w, 'ana')).toBe('notAtStarterStation'); // still in space
    w = put(w, parked(w, w.ships[podId]!, HARBOUR));
    const podPad = w.ships[podId]!.padId;
    const r = claimStarterShip(w, 'ana');
    if (!r.ok) throw new Error(r.reason);
    const ship = pilotShip(r.world, 'ana')!;
    expect(r.world.ships[podId]).toBeUndefined();
    expect(ship.hullId).toBe('meridian-courier');
    expect(ship.padId).toBe(podPad);
    expect(r.event).toEqual({ type: 'starterClaimed', shipId: ship.id, stationId: HARBOUR });
    expect(claimRefusal(r.world, 'ana')).toBe('notInPod');
  });

  it('boarding from a pod uses the pod up', () => {
    let { w, me } = quietWorld();
    w = put(w, spare(w, 'spare', 'kessari-raider', 'ana', { x: 3000, y: 3000 }));
    w = put(w, { ...w.ships[me]!, position: { x: 3000, y: 3100 } });
    w = destroy(w, me);
    const podId = pilotShip(w, 'ana')!.id;
    w = put(w, { ...w.ships[podId]!, position: { x: 3000, y: 3050 }, velocity: { x: 0, y: 0 } });
    w = put(w, { ...w.ships['spare']!, velocity: { x: 0, y: 0 } });
    const r = boardShip(w, 'ana', 'spare');
    if (!r.ok) throw new Error(r.reason);
    expect(r.world.ships[podId]).toBeUndefined();
    expect(pilotShip(r.world, 'ana')!.id).toBe('spare');
  });
});

// ---------------------------------------------------------------------------

describe('stepping out', () => {
  it('leaves the ship empty where it is and puts the pilot in a pod beside it', () => {
    let { w, me } = quietWorld();
    const v = { x: 50, y: 0 };
    w = put(w, { ...w.ships[me]!, position: { x: 3000, y: 3000 }, velocity: v, heading: 0, weaponsHot: true });
    const r = stepOut(w, 'ana');
    if (!r.ok) throw new Error(r.reason);
    const pod = pilotShip(r.world, 'ana')!;
    expect(pod.hullId).toBe('escape-pod');
    expect(r.event).toEqual({ type: 'steppedOut', shipId: pod.id, from: me });
    const left = r.world.ships[me]!;
    expect(isEmptyShip(r.world, left)).toBe(true);
    expect(left.position).toEqual({ x: 3000, y: 3000 });
    expect(left.velocity).toEqual(v);
    expect(left.weaponsHot).toBe(false);
    // Still owned: stepping out is not giving it up.
    expect(ownedShips(r.world, 'ana').map((s) => s.id)).toEqual([me]);
  });

  it('a ship left moving keeps moving; the pod keeps your flight mode', () => {
    let { w, me } = quietWorld();
    const v = { x: 50, y: 20 };
    w = put(w, { ...w.ships[me]!, position: { x: 3000, y: 3000 }, velocity: v, flightMode: 'manual' });
    const r = stepOut(w, 'ana');
    if (!r.ok) throw new Error(r.reason);
    expect(pilotShip(r.world, 'ana')!.flightMode).toBe('manual');
    expect(run(r.world, SECOND).ships[me]!.velocity).toEqual(v);
  });

  it('the pod clears the hull and can board the ship again at once', () => {
    let { w, me } = quietWorld();
    w = put(w, { ...w.ships[me]!, position: { x: 3000, y: 3000 }, velocity: { x: 0, y: 0 } });
    let r = stepOut(w, 'ana');
    if (!r.ok) throw new Error(r.reason);
    // A second of drifting apart: no ram, still in reach.
    let next = run(r.world, SECOND);
    expect(next.events.some((e) => e.type === 'rammed')).toBe(false);
    expect(boardRefusal(next, 'ana', me)).toBeNull();
    const back = boardShip(next, 'ana', me);
    if (!back.ok) throw new Error(back.reason);
    expect(pilotShip(back.world, 'ana')!.id).toBe(me);
    expect(Object.values(back.world.ships).filter((s) => s.hullId === 'escape-pod')).toEqual([]);
  });

  it('the whole loop: step out, fly the pod home, board another ship there, come back', () => {
    let { w, me } = quietWorld();
    w = put(w, parked(w, spare(w, 'spare', 'kessari-raider', 'ana'), HARBOUR));
    w = put(w, { ...w.ships[me]!, position: { x: 2000, y: 2000 }, velocity: { x: 0, y: 0 } });
    let r = stepOut(w, 'ana');
    if (!r.ok) throw new Error(r.reason);
    // The pod reaches Harbour and docks (placed, as flying it here is not the point).
    const pod = pilotShip(r.world, 'ana')!;
    w = put(r.world, parked(r.world, pod, HARBOUR));
    const toSpare = boardShip(w, 'ana', 'spare');
    if (!toSpare.ok) throw new Error(toSpare.reason);
    // Pod used up; the first ship still waits, empty, out at 2000, 2000.
    expect(toSpare.world.ships[pod.id]).toBeUndefined();
    expect(toSpare.world.ships[me]!.position).toEqual({ x: 2000, y: 2000 });
    // Fly the Wedge out beside it (placed) and board across in space.
    const spareOut = { ...toSpare.world.ships['spare']!, state: 'flying' as const, dockedAt: null, padId: null, position: { x: 2000, y: 2100 }, velocity: { x: 0, y: 0 } };
    const back = boardShip(put(toSpare.world, spareOut), 'ana', me);
    if (!back.ok) throw new Error(back.reason);
    expect(pilotShip(back.world, 'ana')!.id).toBe(me);
  });

  it('refuses with a reason', () => {
    const { w: docked } = anaDocked(HARBOUR);
    expect(stepOutRefusal(docked, 'ana')).toBe('docked');
    expect(stepOutRefusal(docked, 'nobody')).toBe('noShip');
    let { w, me } = quietWorld();
    w = destroy(put(w, { ...w.ships[me]!, position: { x: 3000, y: 3000 } }), me);
    expect(stepOutRefusal(w, 'ana')).toBe('inPod');
    expect(stepOut(w, 'ana')).toEqual({ ok: false, world: w, reason: 'inPod' });
  });
});

// ---------------------------------------------------------------------------

describe('save version 4', () => {
  const AT = '2026-11-04T00:00:00.000Z';

  /** A version 3 save of this world: no pads, no ship marts, no padId. */
  function asVersion3(w: World): string {
    const env = JSON.parse(serializeWorld(w, AT));
    for (const st of Object.values(env.world.stations) as Record<string, unknown>[]) {
      delete st['pads'];
      delete st['shipMart'];
    }
    for (const s of Object.values(env.world.ships) as Record<string, unknown>[]) delete s['padId'];
    return JSON.stringify({ ...env, version: 3 });
  }

  it('migrates a version 3 save: stations gain pads and ship marts, docked ships get pads', () => {
    let w = createStarterWorld();
    w = joinPilot(w, 'ana', 'Ana');
    const me = pilotShip(w, 'ana')!.id;
    const harbour = w.stations[HARBOUR]!;
    // Version 3 parked docked ships at the station centre.
    w = put(w, { ...w.ships[me]!, state: 'docked', dockedAt: HARBOUR, padId: null, position: { ...harbour.position } });
    const r = deserializeWorld(asVersion3(w));
    if (!r.ok) throw new Error(r.reason);
    expect(r.world.stations[HARBOUR]!.pads).toEqual(starterStations()[HARBOUR]!.pads);
    expect(r.world.stations[HARBOUR]!.shipMart).toEqual(starterStations()[HARBOUR]!.shipMart);
    expect(r.world.stations[RIDGE]!.shipMart).toEqual([]);
    const docked = Object.values(r.world.ships).filter((s) => s.state === 'docked');
    expect(docked.length).toBe(2); // Ana and the trader
    for (const s of docked) expect(s.padId).not.toBeNull();
    expect(new Set(docked.map((s) => s.padId)).size).toBe(2);
    expect(r.world.ships[me]!.position).not.toEqual(harbour.position);
    for (const s of Object.values(r.world.ships).filter((s) => s.state === 'flying')) expect(s.padId).toBeNull();
  });

  it('moves docked ships with no pad left just outside the station', () => {
    let w = createStarterWorld();
    const ridge = w.stations[RIDGE]!;
    for (let i = 0; i < 4; i++) {
      w = put(w, { ...spare(w, `big-${i}`, 'tessaract-trader', null), state: 'docked', dockedAt: RIDGE, padId: null, position: { ...ridge.position } });
    }
    const r = deserializeWorld(asVersion3(w));
    if (!r.ok) throw new Error(r.reason);
    const big = [0, 1, 2, 3].map((i) => r.world.ships[`big-${i}`]!);
    expect(big.filter((s) => s.state === 'docked').map((s) => s.padId)).toEqual(['l1', 'l2']);
    for (const s of big.filter((s) => s.state === 'flying')) {
      expect(Math.hypot(s.position.x - ridge.position.x, s.position.y - ridge.position.y)).toBeGreaterThan(ridge.radius);
    }
  });

  it('round-trips a world with pods, empty ships and pads', () => {
    const { w: base } = anaDocked(HARBOUR, 50000);
    const bought = buyShip(base, 'ana', 'kessari-raider');
    if (!bought.ok) throw new Error(bought.reason);
    const r = deserializeWorld(serializeWorld(bought.world, AT));
    if (!r.ok) throw new Error(r.reason);
    expect(r.world.ships).toEqual(bought.world.ships);
    expect(r.world.stations).toEqual(bought.world.stations);
  });
});
