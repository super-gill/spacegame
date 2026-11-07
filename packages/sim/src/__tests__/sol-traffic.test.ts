import { describe, expect, it } from 'vitest';
import { collideShips } from '../collision.js';
import { chartTraffic, TRANSPONDER_RANGE } from '../traffic.js';
import { runSpawners } from '../lifecycle.js';
import { pirateHome } from '../rails.js';
import { guardedStations, relayNet, securityAt } from '../relay.js';
import { deserializeWorld, serializeWorld } from '../save.js';
import { CERES_ACCORD_ID, EARTH_ORBITAL_EXCHANGE_ID, HILDA_MOOT_ID, PSYCHE_DIG_ID, SLAGLINE_ID, SOLACE_MERCY_ID, createSolWorld } from '../sol.js';
import { fitStats, shipStats } from '../stats.js';
import { stepWorld } from '../step.js';
import type { PirateBrain, Ship, World } from '../types.js';
import { distance } from '../vec2.js';
import { createStarterWorld, joinPilot, pilotShip } from '../world.js';

/** Sol's traffic (docs/sol-build.md, slice 2, push 4): NPCs that burn, patrols by navy, pirates where nobody answers. */

/** Sol with only the named spawners, run once so their ships exist. */
function solWith(...ids: string[]): World {
  const w = createSolWorld();
  const keep = w.spawners.filter((sp) => ids.includes(sp.id)).map((sp) => ({ ...sp, shipId: null, timerTicks: 0, spawned: 0 }));
  return runSpawners({ ...w, ships: {}, npcs: {}, spawners: keep, asteroids: [] });
}

function shipOf(w: World, spawnerId: string): Ship | undefined {
  const id = w.spawners.find((sp) => sp.id === spawnerId)?.shipId;
  return id ? w.ships[id] : undefined;
}

/** Step until `done` or `seconds` pass; returns the world and every event seen. */
function run(w: World, seconds: number, done?: (w: World) => boolean): { world: World; events: World['events'] } {
  let next = w;
  const events: World['events'] = [];
  for (let i = 0; i < Math.round(seconds / w.dt); i++) {
    next = stepWorld(next, {});
    events.push(...next.events);
    if (done?.(next)) break;
  }
  return { world: next, events };
}

describe('NPCs that burn', () => {
  it('a trader undocks, burns down the Belt Lane and docks at the far end', () => {
    const w = solWith('trader-belt');
    const id = shipOf(w, 'trader-belt')!.id;
    expect(w.ships[id]!.dockedAt).toBe(CERES_ACCORD_ID);
    const { world, events } = run(w, 240, (s) => s.ships[id]?.dockedAt === SLAGLINE_ID);
    expect(world.ships[id]!.dockedAt).toBe(SLAGLINE_ID);
    expect(events.some((e) => e.type === 'burnStarted' && e.shipId === id && e.targetId === SLAGLINE_ID)).toBe(true);
    expect(events.some((e) => e.type === 'burnEnded' && e.shipId === id && e.reason === 'arrived')).toBe(true);
  });

  it('a navy patrol burns between the stations on its beat', () => {
    const w = solWith('patrol-venus');
    const id = shipOf(w, 'patrol-venus')!.id;
    const brain = w.npcs[id]!;
    expect(brain).toMatchObject({ kind: 'watch', power: 'venus' });
    const { world, events } = run(w, 180, (s) => distance(s.ships[id]!.position, s.stations[SOLACE_MERCY_ID]!.position) < 5_000 && !s.ships[id]!.burn);
    expect(events.some((e) => e.type === 'burnStarted' && e.shipId === id && e.targetId === SOLACE_MERCY_ID)).toBe(true);
    expect(distance(world.ships[id]!.position, world.stations[SOLACE_MERCY_ID]!.position)).toBeLessThan(5_000);
  });

  it('starts every NPC: no port runs out of pads for them', () => {
    const w = createSolWorld();
    for (const sp of w.spawners) expect(sp.shipId, sp.id).not.toBeNull();
  });

  it('every navy patrols: the MRN, the UDF, the ECF and the VSG', () => {
    const powers = createSolWorld().spawners.flatMap((sp) => (sp.brain.kind === 'watch' && sp.brain.power ? [sp.brain.power] : []));
    expect(new Set(powers)).toEqual(new Set(['earth', 'mars', 'venus', 'belt']));
  });
});

describe('pirates where nobody answers', () => {
  it('wait only at ports the Relay reads as Contested or Open', () => {
    const w = createSolWorld();
    const net = relayNet(w);
    const pirates = w.spawners.filter((sp) => sp.brain.kind === 'pirate');
    expect(pirates.length).toBeGreaterThanOrEqual(3);
    for (const sp of pirates) {
      const b = sp.brain as PirateBrain;
      expect(['contested', 'open'], sp.id).toContain(securityAt(net, pirateHome(w, b.home, b.homeOrbit)).level);
    }
  });

  it('guards a port\'s zone only in Core or Held space; Calder\'s zones all hold', () => {
    const w = createSolWorld();
    const guarded = new Set(guardedStations(w).map((s) => s.id));
    expect(guarded.has(EARTH_ORBITAL_EXCHANGE_ID)).toBe(true);
    expect(guarded.has(PSYCHE_DIG_ID)).toBe(false);
    const calder = createStarterWorld();
    expect(guardedStations(calder)).toHaveLength(Object.keys(calder.stations).length);
  });

  it('hunt a ship at an unguarded port\'s door, but never one mid-burn', () => {
    const base = solWith('pirate-psyche');
    const pirate = shipOf(base, 'pirate-psyche')!;
    const withPilot = joinPilot(base, 'ana', 'Ana');
    const mine = pilotShip(withPilot, 'ana')!;
    const near = { ...mine, state: 'flying' as const, dockedAt: null, padId: null, position: { x: pirate.position.x + 600, y: pirate.position.y }, velocity: { x: 0, y: 0 } };
    const hunts = (ship: Ship): boolean => run({ ...withPilot, ships: { ...withPilot.ships, [ship.id]: ship } }, 1).events.some((e) => e.type === 'huntStarted' && e.shipId === ship.id);
    expect(hunts(near)).toBe(true);
    expect(hunts({ ...near, burn: { targetId: CERES_ACCORD_ID, startTick: 0 }, velocity: { x: 30_000, y: 0 } })).toBe(false);
  });
});

describe('at burn speed', () => {
  it('ships do not ram each other: a burning ship passes through', () => {
    const w = solWith('trader-belt', 'trader-psyche');
    const a = shipOf(w, 'trader-belt')!;
    const b = shipOf(w, 'trader-psyche')!;
    // Overlapping and closing fast: a ram, unless one of them is burning.
    const flying = { ...a, state: 'flying' as const, velocity: { x: 3_000, y: 0 } };
    const overlap = { ...b, state: 'flying' as const, position: { x: a.position.x + 5, y: a.position.y }, velocity: { x: 0, y: 0 } };
    const statsFor = (s: Ship) => shipStats(w, s);
    const rammed = collideShips({ [a.id]: flying, [b.id]: overlap }, statsFor);
    expect(rammed.damage.length).toBeGreaterThan(0);
    const passed = collideShips({ [a.id]: { ...flying, burn: { targetId: SLAGLINE_ID, startTick: 0 } }, [b.id]: overlap }, statsFor);
    expect(passed.damage).toEqual([]);
    expect(passed.ships[b.id]!.position).toEqual(overlap.position);
  });
});

describe('ship stats, remembered', () => {
  it('give the same answer as working them out, and follow a change of cargo or fit', () => {
    const w = solWith('trader-belt');
    const ship = shipOf(w, 'trader-belt')!;
    const hull = w.hulls[ship.hullId]!;
    const first = shipStats(w, ship);
    expect(shipStats(w, { ...ship, position: { x: 1, y: 2 } })).toBe(first);
    expect(first).toEqual(fitStats(w, hull, ship.fit, 0.4 * (ship.hold['rounds'] ?? 0)));
    const laden = { ...ship, hold: { ...ship.hold, machinery: 20 } };
    expect(shipStats(w, laden).mass).toBeGreaterThan(first.mass);
    const stripped = { ...ship, fit: {} };
    expect(shipStats(w, stripped)).toEqual(fitStats(w, hull, {}, 0.4 * (ship.hold['rounds'] ?? 0)));
  });
});

describe('a running world', () => {
  it('drops the old Ceres pirate and its spawner on load, and gains the new traffic', () => {
    const w = createSolWorld();
    const oldPirate: World['spawners'][number] = {
      ...w.spawners.find((sp) => sp.brain.kind === 'pirate')!,
      id: 'pirate-ceres',
      shipId: 'npc-pirate-ceres-1',
    };
    const ship = { ...shipOf(w, 'pirate-psyche')!, id: 'npc-pirate-ceres-1' };
    const saved: World = {
      ...w,
      spawners: [oldPirate, ...w.spawners.filter((sp) => sp.id === 'patrol-earth')],
      ships: { ...w.ships, [ship.id]: ship },
      npcs: { ...w.npcs, [ship.id]: oldPirate.brain },
    };
    const loaded = deserializeWorld(serializeWorld(saved, 'then'));
    if (!loaded.ok) throw new Error(loaded.reason);
    const ids = loaded.world.spawners.map((sp) => sp.id);
    expect(ids).not.toContain('pirate-ceres');
    expect(loaded.world.ships[ship.id]).toBeUndefined();
    expect(loaded.world.npcs[ship.id]).toBeUndefined();
    expect(ids).toEqual(expect.arrayContaining(['patrol-earth', 'trader-inner', 'pirate-psyche']));
    // A kept spawner takes the design's template: the ECF patrol now knows its navy.
    expect(loaded.world.spawners.find((sp) => sp.id === 'patrol-earth')!.brain).toMatchObject({ power: 'earth' });
  });
});

describe('traffic on the chart', () => {
  /** Ana flying at Hilda Moot (Open: no buoys), and one trader placed where a test wants it. */
  function scene(place: (w: World) => Partial<Ship>): { world: World; id: string } {
    const base = joinPilot(solWith('trader-belt'), 'ana', 'Ana');
    const mine = pilotShip(base, 'ana')!;
    const hilda = base.stations[HILDA_MOOT_ID]!.position;
    const id = shipOf(base, 'trader-belt')!.id;
    const ships = {
      ...base.ships,
      [mine.id]: { ...mine, state: 'flying' as const, dockedAt: null, padId: null, position: { ...hilda } },
      [id]: { ...base.ships[id]!, state: 'flying' as const, dockedAt: null, padId: null, ...place(base) },
    };
    return { world: { ...base, ships }, id };
  }

  it('shows a squawking ship the Relay hears, wherever you are, named from its transponder', () => {
    const { world, id } = scene((w) => ({ position: { ...w.stations[EARTH_ORBITAL_EXCHANGE_ID]!.position } }));
    const t = chartTraffic(world, 'ana').find((c) => c.id === id);
    expect(t).toMatchObject({ heard: 'relay', role: 'trader', burningTo: null });
    expect(t!.label).toMatch(/^TRADER · /);
  });

  it('shows a squawking ship out of coverage only within its transponder\'s own range of you', () => {
    const near = scene((w) => ({ position: { x: w.stations[HILDA_MOOT_ID]!.position.x + TRANSPONDER_RANGE * 0.5, y: w.stations[HILDA_MOOT_ID]!.position.y } }));
    expect(chartTraffic(near.world, 'ana').find((c) => c.id === near.id)).toMatchObject({ heard: 'transponder' });
    const far = scene((w) => ({ position: { x: w.stations[HILDA_MOOT_ID]!.position.x + TRANSPONDER_RANGE * 1.5, y: w.stations[HILDA_MOOT_ID]!.position.y } }));
    expect(chartTraffic(far.world, 'ana').find((c) => c.id === far.id)).toBeUndefined();
  });

  it('never shows a dark ship, unless it burns: then its plume, with no name', () => {
    const dark = scene((w) => ({ position: { ...w.stations[EARTH_ORBITAL_EXCHANGE_ID]!.position }, dark: true }));
    expect(chartTraffic(dark.world, 'ana').find((c) => c.id === dark.id)).toBeUndefined();
    const plume = scene((w) => ({ position: { ...w.stations[EARTH_ORBITAL_EXCHANGE_ID]!.position }, dark: true, burn: { targetId: CERES_ACCORD_ID, startTick: 0 } }));
    expect(chartTraffic(plume.world, 'ana').find((c) => c.id === plume.id)).toMatchObject({ heard: 'plume', label: null, role: 'unknown', burningTo: CERES_ACCORD_ID });
  });

  it('leaves out your own ship, docked ships, and Calder', () => {
    const { world } = scene((w) => ({ position: { ...w.stations[EARTH_ORBITAL_EXCHANGE_ID]!.position } }));
    const mine = pilotShip(world, 'ana')!.id;
    expect(chartTraffic(world, 'ana').some((c) => c.id === mine)).toBe(false);
    const docked = Object.values(world.ships).find((s) => s.state === 'docked');
    if (docked) expect(chartTraffic(world, 'ana').some((c) => c.id === docked.id)).toBe(false);
    expect(chartTraffic(joinPilot(createStarterWorld(), 'ana', 'Ana'), 'ana')).toEqual([]);
  });
});
