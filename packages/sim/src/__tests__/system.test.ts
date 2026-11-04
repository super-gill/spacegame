import { describe, expect, it } from 'vitest';
import { BELT_ID, MOON_ID, PLANET_ID, STAR_ID, starterBodies } from '../bodies.js';
import { DOCK_MAX_SPEED, FIXED_DT } from '../constants.js';
import { freePadFor, onPad } from '../docking.js';
import { buildShip } from '../factory.js';
import { LOADOUTS } from '../loadouts.js';
import {
  bodyPosition,
  bodyState,
  bodyVelocity,
  circularPeriod,
  frameVelocity,
  localFrame,
  railTime,
  relativeVelocity,
  stationState,
} from '../rails.js';
import { SAVE_FORMAT, SAVE_VERSION, deserializeWorld, serializeWorld } from '../save.js';
import { stepShip } from '../ship.js';
import { HARBOUR_ID, LANTERN_ID, RIDGE_ID } from '../stations.js';
import { stepWorld } from '../step.js';
import type { PirateBrain, Ship, ShipInput, World } from '../types.js';
import { add, distance, length, normalise, scale, sub } from '../vec2.js';
import { createStarterWorld, emptyInput, joinPilot, pilotShip } from '../world.js';
import { TEST_STATS } from './fixtures.js';

/**
 * The living system, part 1: bodies on rails, carrying, moving stations,
 * the local frame, NPCs in moving frames, and the version 5 migration.
 */

const SECOND = 60;
const AT = '2026-11-04T00:00:00.000Z';

function run(w: World, seconds: number, inputs: (w: World) => Record<string, ShipInput> = () => ({}), each?: (w: World) => void): World {
  let x = w;
  for (let i = 0; i < seconds * SECOND; i++) {
    x = stepWorld(x, inputs(x));
    each?.(x);
  }
  return x;
}

/** The starter system with no NPCs. */
function quiet(): World {
  return { ...createStarterWorld(), ships: {}, npcs: {}, spawners: [] };
}

/** The same with gravity switched off, to test carrying on its own. */
function weightless(w: World): World {
  return { ...w, bodies: Object.fromEntries(Object.entries(w.bodies).map(([id, b]) => [id, { ...b, gravity: 0 }])) };
}

function put(w: World, ship: Ship): World {
  return { ...w, ships: { ...w.ships, [ship.id]: ship } };
}

/** An empty Courier nobody owns, at `position` moving at `velocity`. */
function coaster(w: World, id: string, position: { x: number; y: number }, velocity: { x: number; y: number }): Ship {
  return { ...buildShip(w, { id, loadout: LOADOUTS['meridian-starter']!, ownerId: null, position, heading: 0, flightMode: 'manual' }), velocity };
}

describe('rails', () => {
  const bodies = starterBodies();

  it('are pure: the same time always gives the same place', () => {
    const a = bodyState(bodies, MOON_ID, 1234.5);
    const b = bodyState(bodies, MOON_ID, 1234.5);
    expect(a).toEqual(b);
  });

  it('are periodic: a body is back where it started after one period', () => {
    for (const id of [PLANET_ID, MOON_ID]) {
      const orbit = bodies[id]!.orbit!;
      const start = bodyState(bodies, id, 0);
      // Relative to the parent, so the parent's own motion does not count.
      const parentStart = bodyState(bodies, orbit.parent, 0).position;
      const later = bodyState(bodies, id, orbit.period);
      const parentLater = bodyState(bodies, orbit.parent, orbit.period).position;
      expect(distance(sub(later.position, parentLater), sub(start.position, parentStart))).toBeLessThan(1e-6);
    }
  });

  it('stay exact after a very long time', () => {
    const planet = bodies[PLANET_ID]!.orbit!;
    const far = bodyState(bodies, PLANET_ID, planet.period * 100_000);
    expect(distance(far.position, bodyState(bodies, PLANET_ID, 0).position)).toBeLessThan(1e-3);
  });

  it('keep each body at its orbit radius from its parent', () => {
    for (const t of [0, 77, 900]) {
      for (const id of [PLANET_ID, MOON_ID]) {
        const orbit = bodies[id]!.orbit!;
        const gap = distance(bodyState(bodies, id, t).position, bodyState(bodies, orbit.parent, t).position);
        expect(gap).toBeCloseTo(orbit.radius, 6);
      }
    }
  });

  it('give velocity and acceleration that match the motion', () => {
    const h = 1e-3;
    const t = 321;
    const now = bodyState(bodies, MOON_ID, t);
    const next = bodyState(bodies, MOON_ID, t + h);
    const prev = bodyState(bodies, MOON_ID, t - h);
    const v = { x: (next.position.x - prev.position.x) / (2 * h), y: (next.position.y - prev.position.y) / (2 * h) };
    expect(distance(v, now.velocity)).toBeLessThan(1e-3);
    const a = { x: (next.velocity.x - prev.velocity.x) / (2 * h), y: (next.velocity.y - prev.velocity.y) / (2 * h) };
    expect(distance(a, now.acceleration)).toBeLessThan(1e-3);
  });

  it('put the star at the origin, fixed', () => {
    expect(bodyState(bodies, STAR_ID, 999)).toEqual({ position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, acceleration: { x: 0, y: 0 } });
  });
});

describe('the starter system', () => {
  const w = createStarterWorld();

  it('has a star, a planet, a moon and the belt', () => {
    const kinds = Object.values(w.bodies).map((b) => b.kind).sort();
    expect(kinds).toEqual(['belt', 'moon', 'planet', 'star']);
    expect(w.bodies[BELT_ID]!.sphere).toBe(0); // the belt carries nothing
  });

  it("nests the moon's sphere inside the planet's, and keeps planet spheres clear of the star's", () => {
    const planet = w.bodies[PLANET_ID]!;
    const moon = w.bodies[MOON_ID]!;
    expect(moon.orbit!.radius + moon.sphere).toBeLessThan(planet.sphere);
    expect(planet.orbit!.radius - planet.sphere).toBeGreaterThan(w.bodies[STAR_ID]!.sphere);
  });

  it("orbits stations (and moons) inside a sphere at the period their parent's gravity gives", () => {
    const bound = [...Object.values(w.stations), w.bodies[MOON_ID]!].filter((x) => {
      const parent = x.orbit ? w.bodies[x.orbit.parent] : undefined;
      return parent && parent.gravity > 0 && x.orbit!.radius < parent.sphere;
    });
    expect(bound.map((x) => x.id)).toContain(HARBOUR_ID);
    for (const x of bound) {
      const parent = w.bodies[x.orbit!.parent]!;
      expect(x.orbit!.period).toBeCloseTo(circularPeriod(parent.gravity, x.orbit!.radius), 9);
    }
    // A low orbit round the planet takes a minute or two.
    const harbour = w.stations[HARBOUR_ID]!.orbit!.period;
    expect(harbour).toBeGreaterThan(60);
    expect(harbour).toBeLessThan(150);
  });

  it('puts Harbour in the planet sphere with its security zone, and Ridge on the belt', () => {
    const harbour = w.stations[HARBOUR_ID]!;
    const planet = w.bodies[PLANET_ID]!;
    expect(harbour.orbit!.parent).toBe(PLANET_ID);
    expect(harbour.orbit!.radius + harbour.securityRadius).toBeLessThanOrEqual(planet.sphere);
    expect(w.stations[RIDGE_ID]!.orbit!.parent).toBe(BELT_ID);
    expect(w.stations[RIDGE_ID]!.orbit!.radius).toBe(w.bodies[BELT_ID]!.ring!.radius);
  });

  it('keeps every station where its rail puts it, tick after tick', () => {
    const later = run(w, 3);
    for (const st of Object.values(later.stations)) {
      const s = stationState(later.bodies, st, railTime(later.tick, later.dt));
      expect(st.position).toEqual(s.position);
      expect(st.velocity).toEqual(s.velocity);
    }
    expect(distance(later.stations[HARBOUR_ID]!.position, w.stations[HARBOUR_ID]!.position)).toBeGreaterThan(100);
  });

  it("keeps the pirate's home on the belt, outside Ridge's security, as the belt turns", () => {
    let x = w;
    for (const seconds of [0, 300, 600]) {
      x = run(x, seconds === 0 ? 0 : 300);
      const id = Object.keys(x.npcs).find((k) => x.npcs[k]!.kind === 'pirate');
      if (!id) continue;
      x = stepWorld(x, {});
      const brain = x.npcs[id] as PirateBrain;
      const ridge = x.stations[RIDGE_ID]!;
      const gap = distance(brain.home, ridge.position);
      expect(gap).toBeGreaterThan(ridge.securityRadius + 300);
      expect(gap).toBeLessThan(2500);
    }
  });
});

describe('carrying', () => {
  it('keeps a ship left alone in the planet sphere at its offset from the planet', () => {
    let w = weightless(quiet()); // carrying alone; gravity is tested below
    const planet = bodyState(w.bodies, PLANET_ID, railTime(w.tick, w.dt));
    const offset = { x: 1500, y: 300 };
    w = put(w, coaster(w, 'drifter', add(planet.position, offset), planet.velocity));
    w = run(w, 120);
    const gap = sub(w.ships['drifter']!.position, bodyPosition(w, PLANET_ID));
    expect(distance(gap, offset)).toBeLessThan(1e-6);
    expect(length(sub(w.ships['drifter']!.velocity, bodyVelocity(w, PLANET_ID)))).toBeLessThan(1e-9);
  });

  it("keeps a ship in the moon's sphere with the moon, not just the planet", () => {
    let w = weightless(quiet()); // carrying alone; gravity is tested below
    const moon = bodyState(w.bodies, MOON_ID, railTime(w.tick, w.dt));
    const offset = { x: 0, y: -300 };
    w = put(w, coaster(w, 'drifter', add(moon.position, offset), moon.velocity));
    w = run(w, 60);
    expect(distance(sub(w.ships['drifter']!.position, bodyPosition(w, MOON_ID)), offset)).toBeLessThan(1e-6);
  });

  it('leaves a ship in flat space alone: no carry, no drift', () => {
    let w = quiet();
    w = put(w, coaster(w, 'drifter', { x: -6000, y: -6000 }, { x: 0, y: 0 }));
    w = run(w, 10);
    expect(w.ships['drifter']!.position).toEqual({ x: -6000, y: -6000 });
  });

  it('carries loot and wrecks too', () => {
    let w = weightless(quiet()); // carrying alone; gravity is tested below
    const planet = bodyState(w.bodies, PLANET_ID, railTime(w.tick, w.dt));
    const at = add(planet.position, { x: -1600, y: 0 });
    w = {
      ...w,
      loot: [{ id: 'l1', item: 'scrap', amount: 1, position: at, velocity: planet.velocity, ticksLeft: 10_000 }],
      wrecks: [{ id: 'w1', hullId: 'meridian-courier', position: at, velocity: planet.velocity, heading: 0, angularVelocity: 0, ticksLeft: 10_000 }],
    };
    w = run(w, 30);
    const want = add(bodyPosition(w, PLANET_ID), { x: -1600, y: 0 });
    expect(distance(w.loot[0]!.position, want)).toBeLessThan(1e-6);
    expect(distance(w.wrecks[0]!.position, want)).toBeLessThan(1e-6);
  });

  it('crossing out of a sphere is smooth: no jump in position or velocity', () => {
    let w = quiet();
    const planet = bodyState(w.bodies, PLANET_ID, railTime(w.tick, w.dt));
    const sphere = w.bodies[PLANET_ID]!.sphere;
    // Moving straight out through the sphere's edge, relative to the planet.
    w = put(w, coaster(w, 'leaver', add(planet.position, { x: 0, y: -(sphere - 20) }), add(planet.velocity, { x: 0, y: -60 })));
    let biggestDv = 0;
    let last = w.ships['leaver']!;
    run(w, 3, () => ({}), (x) => {
      const now = x.ships['leaver']!;
      biggestDv = Math.max(biggestDv, length(sub(now.velocity, last.velocity)));
      last = now;
    });
    // Carrying changes velocity by the planet's tiny rail acceleration per tick, never more.
    expect(biggestDv).toBeLessThan(0.01);
  });
});

describe('the local frame', () => {
  it('is the station in dock range, else the innermost sphere, else at rest', () => {
    const w = quiet();
    const harbour = w.stations[HARBOUR_ID]!;
    expect(localFrame(w, { position: add(harbour.position, { x: 150, y: 0 }), dockedAt: null })).toMatchObject({ kind: 'station', id: HARBOUR_ID });
    const planet = bodyPosition(w, PLANET_ID);
    const away = sub(planet, sub(harbour.position, planet)); // opposite side of the planet from Harbour
    expect(localFrame(w, { position: away, dockedAt: null })).toMatchObject({ kind: 'body', id: PLANET_ID });
    expect(frameVelocity(w, { position: away, dockedAt: null })).toEqual(bodyVelocity(w, PLANET_ID));
    const moon = bodyPosition(w, MOON_ID);
    const works = w.stations['station-lantern']!.position;
    const farSide = add(moon, scale(normalise(sub(moon, works)), 200)); // across the moon from Lantern Works
    expect(localFrame(w, { position: farSide, dockedAt: null })).toMatchObject({ kind: 'body', id: MOON_ID });
    expect(localFrame(w, { position: { x: -6000, y: -6000 }, dockedAt: null })).toEqual({ kind: 'system', velocity: { x: 0, y: 0 } });
  });

  it('full assist holds a ship still beside a moving station', () => {
    let w = joinPilot(quiet(), 'ana', 'Ana');
    const me = pilotShip(w, 'ana')!.id;
    const harbour = w.stations[HARBOUR_ID]!;
    const offset = { x: 0, y: 180 };
    w = put(w, { ...w.ships[me]!, position: add(harbour.position, offset), velocity: { ...harbour.velocity }, flightMode: 'assisted' });
    let worst = 0;
    w = run(w, 60, () => ({ [me]: emptyInput() }), (x) => {
      const gap = sub(x.ships[me]!.position, x.stations[HARBOUR_ID]!.position);
      worst = Math.max(worst, distance(gap, offset));
    });
    expect(worst).toBeLessThan(5);
    expect(length(relativeVelocity(w, w.ships[me]!))).toBeLessThan(1);
  });

  it('brake stops a ship relative to its frame, not the system', () => {
    let w = joinPilot(quiet(), 'ana', 'Ana');
    const me = pilotShip(w, 'ana')!.id;
    const planet = bodyState(w.bodies, PLANET_ID, railTime(w.tick, w.dt));
    const away = add(planet.position, { x: -1600, y: 0 });
    w = put(w, { ...w.ships[me]!, position: away, velocity: add(planet.velocity, { x: 80, y: -40 }), flightMode: 'manual' });
    w = run(w, 5, () => ({ [me]: { ...emptyInput(), brake: true } }));
    expect(length(relativeVelocity(w, w.ships[me]!))).toBeLessThan(1e-6);
    expect(length(w.ships[me]!.velocity)).toBeGreaterThan(5); // still moving with the planet
  });

  it('docks against a moving station by relative speed', () => {
    let w = joinPilot(quiet(), 'ana', 'Ana');
    const me = pilotShip(w, 'ana')!.id;
    const harbour = w.stations[HARBOUR_ID]!;
    // Almost still relative to Harbour, whatever Harbour's own speed.
    w = put(w, { ...w.ships[me]!, position: add(harbour.position, { x: 150, y: 0 }), velocity: add(harbour.velocity, { x: 5, y: 0 }) });
    const docked = stepWorld(w, { [me]: { ...emptyInput(), toggleDock: true } });
    expect(docked.ships[me]!.state).toBe('docked');

    // Slow in system terms but fast against Harbour: refused.
    const back = { x: -harbour.velocity.x / length(harbour.velocity), y: -harbour.velocity.y / length(harbour.velocity) };
    const slow = { x: back.x * 40, y: back.y * 40 };
    expect(length(slow)).toBeLessThan(DOCK_MAX_SPEED);
    const against = put(w, { ...w.ships[me]!, velocity: slow });
    expect(stepWorld(against, { [me]: { ...emptyInput(), toggleDock: true } }).events).toContainEqual({ type: 'dockRefused', shipId: me, reason: 'tooFast' });
  });

  it('a docked ship rides its pad and leaves with the station', () => {
    let w = quiet();
    const harbour = w.stations[HARBOUR_ID]!;
    const ship = coaster(w, 'parked', harbour.position, { x: 0, y: 0 });
    const pad = freePadFor(harbour, 'S', w.ships)!;
    w = put(w, onPad(ship, harbour, pad));
    w = run(w, 30);
    const st = w.stations[HARBOUR_ID]!;
    expect(w.ships['parked']!.position).toEqual(add(st.position, pad.position));
    expect(w.ships['parked']!.velocity).toEqual(st.velocity);
  });

  it("limits thrust against the frame, but never slows a ship already past the limit", () => {
    const ship: Ship = { ...coaster(quiet(), 's', { x: 0, y: 0 }, { x: 0, y: 0 }), flightMode: 'manual' };
    const frame = { x: 0, y: 50 };
    let s = { ...ship, velocity: frame };
    for (let i = 0; i < SECOND * 30; i++) s = stepShip(s, TEST_STATS, { ...emptyInput(), thrustForward: true }, FIXED_DT, frame);
    expect(length(sub(s.velocity, frame))).toBeCloseTo(TEST_STATS.maxSpeed, 6);

    // Past the limit (a frame edge, a ram): thrusting on does not add speed, and nothing takes it away.
    const over = { ...ship, velocity: { x: TEST_STATS.maxSpeed + 40, y: 0 } };
    const pushed = stepShip(over, TEST_STATS, { ...emptyInput(), thrustForward: true }, FIXED_DT);
    expect(length(pushed.velocity)).toBeCloseTo(TEST_STATS.maxSpeed + 40, 9);
    const coasting = stepShip(over, TEST_STATS, emptyInput(), FIXED_DT);
    expect(coasting.velocity).toEqual(over.velocity);
  });
});

describe('NPCs in moving frames', () => {
  it('traders complete their loop between moving stations', () => {
    const docks: string[] = [];
    // No pirates: this is about flying, not about who wins a fight.
    const start = createStarterWorld();
    const pirates = Object.keys(start.npcs).filter((id) => start.npcs[id]!.kind === 'pirate');
    const ships = { ...start.ships };
    for (const id of pirates) delete ships[id];
    const calm: World = { ...start, ships, npcs: Object.fromEntries(Object.entries(start.npcs).filter(([id]) => !pirates.includes(id))), spawners: start.spawners.filter((sp) => sp.brain.kind !== 'pirate') };
    run(calm, 240, () => ({}), (x) => {
      for (const e of x.events) if (e.type === 'docked' && e.shipId === 'npc-trader-1') docks.push(e.stationId);
    });
    // Round the triangle: Harbour, the Ridge, Lantern Works, and home.
    expect(docks.slice(0, 3)).toEqual([RIDGE_ID, LANTERN_ID, HARBOUR_ID]);
  });

  it('a new pilot who waits off Harbour gets a pass inside dock range, clear of the hull', () => {
    let w = joinPilot(quiet(), 'ana', 'Ana');
    const me = pilotShip(w, 'ana')!.id;
    let nearest = Infinity;
    let hit = false;
    run(w, 40, () => ({}), (x) => {
      nearest = Math.min(nearest, distance(x.ships[me]!.position, x.stations[HARBOUR_ID]!.position));
      if (x.events.some((e) => e.type === 'collided')) hit = true;
    });
    const harbour = w.stations[HARBOUR_ID]!;
    expect(nearest).toBeLessThan(harbour.dockRange);
    expect(hit).toBe(false);
    w = stepWorld(w, {});
    expect(length(relativeVelocity(w, w.ships[me]!))).toBeLessThan(1e-6); // starts at rest in its frame
  });
});

describe('save version 5', () => {
  /** A version 4 save: the flat sector, stations fixed where 0.8.0 had them, no bodies. */
  function version4(): { text: string; harbourPad: string } {
    let w = joinPilot(createStarterWorld(), 'ana', 'Ana');
    w = joinPilot(w, 'ben', 'Ben');
    const flat: World = {
      ...w,
      tick: 54_321,
      stations: {
        [HARBOUR_ID]: { ...w.stations[HARBOUR_ID]!, position: { x: 0, y: 0 } },
        [RIDGE_ID]: { ...w.stations[RIDGE_ID]!, position: { x: 4800, y: -1600 } },
      },
    };
    // Ana: docked at Harbour on a pad, with credits and storage, and an empty ship in space.
    const ana = pilotShip(flat, 'ana')!;
    const harbour = flat.stations[HARBOUR_ID]!;
    const pad = freePadFor(harbour, 'S', flat.ships)!;
    let v4 = put(flat, onPad(ana, harbour, pad));
    v4 = put(v4, { ...coaster(v4, 'ship-ana-9', { x: 2000, y: 2000 }, { x: 30, y: 0 }), ownerId: 'ana' });
    v4 = { ...v4, pilots: { ...v4.pilots, ana: { ...v4.pilots['ana']!, credits: 4321, storage: { [HARBOUR_ID]: { 'meridian-pulse-s': 2 } } } } };
    // Ben: flying in space somewhere along the old lane.
    const ben = pilotShip(v4, 'ben')!;
    v4 = put(v4, { ...ben, position: { x: 2600, y: 400 }, velocity: { x: 100, y: 0 } });

    const env = JSON.parse(serializeWorld(v4, AT));
    delete env.world.bodies;
    for (const st of Object.values(env.world.stations) as Record<string, unknown>[]) {
      delete st['velocity'];
      delete st['orbit'];
    }
    for (const b of Object.values(env.world.npcs) as Record<string, unknown>[]) delete b['homeOrbit'];
    for (const sp of env.world.spawners as { brain: Record<string, unknown> }[]) delete sp.brain['homeOrbit'];
    for (const s of Object.values(env.world.ships) as Record<string, unknown>[]) s['velocity'] = { x: 0, y: 0 };
    return { text: JSON.stringify({ ...env, format: SAVE_FORMAT, version: 4 }), harbourPad: pad.id };
  }

  it('is the current version', () => {
    expect(SAVE_VERSION).toBe(5);
  });

  it("keeps every pilot's credits, storage and ships", () => {
    const { text } = version4();
    const before = JSON.parse(text).world as World;
    const r = deserializeWorld(text);
    if (!r.ok) throw new Error(r.reason);
    for (const id of Object.keys(before.pilots)) {
      expect(r.world.pilots[id]).toEqual(before.pilots[id]);
      const owned = (w: World) => Object.values(w.ships).filter((s) => s.ownerId === id).map((s) => s.id).sort();
      expect(owned(r.world)).toEqual(owned(before));
    }
  });

  it('keeps docked ships on their pads, now riding the moving station', () => {
    const { text, harbourPad } = version4();
    const r = deserializeWorld(text);
    if (!r.ok) throw new Error(r.reason);
    const ana = pilotShip(r.world, 'ana')!;
    const harbour = r.world.stations[HARBOUR_ID]!;
    expect(ana.state).toBe('docked');
    expect(ana.padId).toBe(harbourPad);
    expect(harbour.orbit).not.toBeNull();
    expect(harbour.position).toEqual(stationState(r.world.bodies, harbour, railTime(r.world.tick, r.world.dt)).position);
    expect(ana.velocity).toEqual(harbour.velocity);
  });

  it('tows ships in space to Harbour, flown or empty', () => {
    const { text } = version4();
    const r = deserializeWorld(text);
    if (!r.ok) throw new Error(r.reason);
    for (const id of ['ship-ana-9', pilotShip(r.world, 'ben')!.id]) {
      const s = r.world.ships[id]!;
      expect(s.state).toBe('docked');
      expect(s.dockedAt).toBe(HARBOUR_ID);
    }
    // Ben is still aboard his ship.
    expect(r.world.pilots['ben']!.shipId).toBe(pilotShip(r.world, 'ben')!.id);
  });

  it('leaves towed ships at rest just off Harbour when every pad is taken', () => {
    const env = JSON.parse(version4().text);
    // Fill Harbour's pads with empty ships of nobody's, docked.
    const w = createStarterWorld();
    (w.stations[HARBOUR_ID]!.pads).forEach((p, i) => {
      env.world.ships[`filler-${i}`] = { ...coaster(w, `filler-${i}`, { x: 0, y: 0 }, { x: 0, y: 0 }), state: 'docked', dockedAt: HARBOUR_ID, padId: p.id };
    });
    const r = deserializeWorld(JSON.stringify(env));
    if (!r.ok) throw new Error(r.reason);
    const harbour = r.world.stations[HARBOUR_ID]!;
    const towed = r.world.ships['ship-ana-9']!;
    expect(towed.state).toBe('flying');
    const gap = distance(towed.position, harbour.position);
    expect(gap).toBeGreaterThan(harbour.radius);
    expect(gap).toBeLessThan(harbour.dockRange);
    expect(towed.velocity).toEqual(harbour.velocity);
  });

  it('gives old ships the stock sensors, since hulls no longer have any built in', () => {
    const env = JSON.parse(version4().text);
    // Version 4 fits had no sensor mounts.
    for (const s of Object.values(env.world.ships) as { fit: Record<string, string> }[]) {
      delete s.fit['r1'];
      delete s.fit['t1'];
    }
    const r = deserializeWorld(JSON.stringify(env));
    if (!r.ok) throw new Error(r.reason);
    const ana = pilotShip(r.world, 'ana')!;
    expect(ana.fit['r1']).toBe('meridian-radar-s');
    expect(ana.fit['t1']).toBe('meridian-computer-s');
  });

  it('replaces NPCs with the new system and drops things in flight', () => {
    const r = deserializeWorld(version4().text);
    if (!r.ok) throw new Error(r.reason);
    expect(Object.keys(r.world.bodies).sort()).toEqual(Object.keys(starterBodies()).sort());
    const pirate = Object.values(r.world.npcs).find((b) => b.kind === 'pirate') as PirateBrain;
    expect(pirate.homeOrbit).toBeTruthy();
    expect(r.world.projectiles).toEqual([]);
    // The migrated world steps on without trouble.
    const later = run(r.world, 5);
    expect(later.tick).toBe(r.world.tick + 5 * SECOND);
  });

  it('round-trips a version 5 world unchanged', () => {
    const w = run(joinPilot(createStarterWorld(), 'ana', 'Ana'), 2);
    const r = deserializeWorld(serializeWorld(w, AT));
    if (!r.ok) throw new Error(r.reason);
    expect(r.world.bodies).toEqual(w.bodies);
    expect(r.world.stations).toEqual(w.stations);
    expect(r.world.ships).toEqual(w.ships);
  });
});
