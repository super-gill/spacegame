import { describe, expect, it } from 'vitest';
import { MOON_ID, PLANET_ID, STAR_ID } from '../bodies.js';
import { GRAVITY_EASE_START } from '../constants.js';
import { buildShip } from '../factory.js';
import { LOADOUTS } from '../loadouts.js';
import { gravityTier, navReadout, orbitElements } from '../nav.js';
import { bodyState, gravityAt, gravityEase, gravityFrom, orbitState, railTime, relativeVelocity } from '../rails.js';
import { HARBOUR_ID } from '../stations.js';
import { stepWorld } from '../step.js';
import type { Ship, ShipInput, World, WorldEvent } from '../types.js';
import { add, distance, length, type Vec2 } from '../vec2.js';
import { createStarterWorld, emptyInput } from '../world.js';

/** Gravity, surface impact and the nav computer (6c part 2). */

const SECOND = 60;

function quiet(): World {
  return { ...createStarterWorld(), ships: {}, npcs: {}, spawners: [] };
}

function planetNow(w: World) {
  return bodyState(w.bodies, PLANET_ID, railTime(w.tick, w.dt));
}

/** A ship from a loadout at `offset` from the planet, moving at `relVelocity` relative to it. */
function nearPlanet(w: World, id: string, offset: Vec2, relVelocity: Vec2, loadoutId = 'meridian-starter', flightMode: Ship['flightMode'] = 'manual'): World {
  const p = planetNow(w);
  const ship = buildShip(w, { id, loadout: LOADOUTS[loadoutId]!, ownerId: null, position: add(p.position, offset), heading: 0, flightMode });
  return { ...w, ships: { ...w.ships, [id]: { ...ship, velocity: add(p.velocity, relVelocity) } } };
}

function run(w: World, seconds: number, inputs: Record<string, ShipInput> = {}, each?: (w: World) => void): World {
  let x = w;
  for (let i = 0; i < seconds * SECOND; i++) {
    x = stepWorld(x, inputs);
    each?.(x);
  }
  return x;
}

describe('gravity', () => {
  const w = quiet();
  const planet = w.bodies[PLANET_ID]!;
  const state = planetNow(w);

  it('pulls towards the centre by inverse square inside the sphere', () => {
    const near = gravityFrom(planet, state, add(state.position, { x: 800, y: 0 }));
    const far = gravityFrom(planet, state, add(state.position, { x: 1600, y: 0 }));
    expect(near.x).toBeLessThan(0); // towards the planet
    expect(length(near) / length(far)).toBeCloseTo(4, 6);
    expect(length(near)).toBeCloseTo(planet.gravity / (800 * 800), 9);
  });

  it('eases smoothly to zero at the edge, and is zero outside', () => {
    expect(gravityEase(GRAVITY_EASE_START)).toBe(1);
    expect(gravityEase(1)).toBe(0);
    expect(gravityEase(0.99)).toBeLessThan(0.01);
    const at = (d: number) => length(gravityFrom(planet, state, add(state.position, { x: d, y: 0 })));
    expect(at(planet.sphere + 1)).toBe(0);
    // No step anywhere: neighbouring points differ by a tiny amount.
    for (let d = planet.sphere * 0.7; d < planet.sphere; d += 5) expect(Math.abs(at(d) - at(d + 1))).toBeLessThan(0.01);
  });

  it('comes from the innermost body only', () => {
    const moon = bodyState(w.bodies, MOON_ID, railTime(w.tick, w.dt));
    const point = add(moon.position, { x: 200, y: 0 });
    expect(gravityAt(w.bodies, { [PLANET_ID]: state, [MOON_ID]: moon, [STAR_ID]: bodyState(w.bodies, STAR_ID, 0) }, point)).toEqual(
      gravityFrom(w.bodies[MOON_ID]!, moon, point),
    );
  });

  it('holds a free orbit for an hour of play with no thrust', () => {
    let x = quiet();
    const r = 1600;
    const v = Math.sqrt(planet.gravity / r);
    x = nearPlanet(x, 'orbiter', { x: r, y: 0 }, { x: 0, y: v });
    let lowest = Infinity;
    let highest = 0;
    x = run(x, 3600, {}, (y) => {
      const d = distance(y.ships['orbiter']!.position, planetNow(y).position);
      lowest = Math.min(lowest, d);
      highest = Math.max(highest, d);
    });
    expect(x.ships['orbiter']).toBeDefined();
    expect(lowest).toBeGreaterThan(r * 0.98);
    expect(highest).toBeLessThan(r * 1.02);
  }, 120_000);

  it('a ship a little way along a station orbit keeps it company, because the station orbits as a ship would', () => {
    let x = quiet();
    const harbour = x.stations[HARBOUR_ID]!;
    const orbit = harbour.orbit!;
    // The same orbit, 160 units ahead of Harbour: the same path, a little later round it.
    const ahead = { ...orbit, phase: orbit.phase + orbit.direction * (160 / orbit.radius) };
    const at = orbitState(ahead, planetNow(x), railTime(x.tick, x.dt));
    const ship = buildShip(x, { id: 'parked', loadout: LOADOUTS['meridian-starter']!, ownerId: null, position: at.position, heading: 0, flightMode: 'manual' });
    x = { ...x, ships: { ...x.ships, parked: { ...ship, velocity: at.velocity } } };
    let worst = 0;
    run(x, 120, {}, (y) => {
      worst = Math.max(worst, Math.abs(distance(y.ships['parked']!.position, y.stations[HARBOUR_ID]!.position) - 160));
    });
    // One full orbit later it is still where it was beside the station.
    expect(worst).toBeLessThan(15);
  });

  it('full assist hovers against gravity; without it you fall', () => {
    let x = nearPlanet(quiet(), 'hover', { x: 0, y: -1600 }, { x: 0, y: 0 }, 'meridian-starter', 'assisted');
    x = nearPlanet(x, 'drop', { x: 0, y: 1600 }, { x: 0, y: 0 }, 'meridian-starter', 'rotation');
    const blank = emptyInput();
    x = run(x, 20, { hover: blank, drop: blank });
    expect(Math.abs(distance(x.ships['hover']!.position, planetNow(x).position) - 1600)).toBeLessThan(10);
    expect(length(relativeVelocity(x, x.ships['hover']!))).toBeLessThan(2);
    expect(distance(x.ships['drop']!.position, planetNow(x).position)).toBeLessThan(1500);
  });
});

describe('surfaces', () => {
  it('a slow touch bounces off unhurt; a fast fall does damage', () => {
    const planet = quiet().bodies[PLANET_ID]!;
    const events: WorldEvent[] = [];
    let x = nearPlanet(quiet(), 'soft', { x: planet.radius + 20, y: 0 }, { x: -20, y: 0 });
    x = nearPlanet(x, 'hard', { x: -(planet.radius + 30), y: 0 }, { x: 250, y: 0 });
    const before = x.ships['soft']!.structure;
    x = run(x, 2, {}, (y) => events.push(...y.events));
    expect(events.some((e) => e.type === 'damaged' && e.shipId === 'soft')).toBe(false);
    expect(x.ships['soft']!.structure).toBe(before);
    expect(events).toContainEqual(expect.objectContaining({ type: 'impacted', shipId: 'hard', bodyId: PLANET_ID }));
    expect(events.some((e) => e.type === 'damaged' && e.shipId === 'hard' && e.cause === 'surface')).toBe(true);
    for (const id of ['soft', 'hard']) {
      const s = x.ships[id];
      if (s) expect(distance(s.position, planetNow(x).position)).toBeGreaterThanOrEqual(planet.radius);
    }
  });

  it('loot that falls into a planet is gone', () => {
    const w = quiet();
    const p = planetNow(w);
    let x: World = { ...w, loot: [{ id: 'l1', item: 'scrap', amount: 1, position: add(p.position, { x: 800, y: 0 }), velocity: p.velocity, ticksLeft: 10_000 }] };
    x = run(x, 15);
    expect(x.loot).toEqual([]);
  });
});

describe('the nav computer', () => {
  it('without one, a pilot gets no navigation at all', () => {
    let x = nearPlanet(quiet(), 'blind', { x: 1600, y: 0 }, { x: 0, y: 30 });
    const ship = x.ships['blind']!;
    const fit = Object.fromEntries(Object.entries(ship.fit).filter(([m]) => m !== 'n1'));
    x = { ...x, ships: { ...x.ships, blind: { ...ship, fit } } };
    expect(navReadout(x, x.ships['blind']!)).toBeNull();
  });

  it('reads a circular orbit as one, and sees as far ahead as it is built to', () => {
    const planet = quiet().bodies[PLANET_ID]!;
    const r = 1600;
    const x = nearPlanet(quiet(), 'orbiter', { x: r, y: 0 }, { x: 0, y: Math.sqrt(planet.gravity / r) });
    const nav = navReadout(x, x.ships['orbiter']!)!;
    expect(nav.orbit!.bodyId).toBe(PLANET_ID);
    expect(nav.orbit!.periapsis).toBeCloseTo(r, 0);
    expect(nav.orbit!.apoapsis).toBeCloseTo(r, 0);
    expect(nav.orbit!.bound).toBe(true);
    expect(nav.path.relativeTo).toBe(PLANET_ID);
    // Relative to the planet, the predicted path stays on the circle.
    for (const p of nav.path.points) expect(Math.abs(length(p) - r)).toBeLessThan(r * 0.02);

    const ship = x.ships['orbiter']!;
    // The Tern's nav mount is small; the medium explorer set goes on the Tacet's medium mount.
    const tacet = buildShip(x, { id: 'scout', loadout: LOADOUTS['aurel-tacet-dev']!, ownerId: null, position: ship.position, heading: 0, flightMode: 'manual' });
    const scout = { ...tacet, velocity: ship.velocity, fit: { ...tacet.fit, n1: 'itomarr-nav-m' } };
    expect(navReadout(x, scout)!.path.points.length).toBeGreaterThan(navReadout(x, ship)!.path.points.length * 4);
  });

  it('predicts a surface impact and how long until it', () => {
    const x = nearPlanet(quiet(), 'faller', { x: 950, y: 0 }, { x: -60, y: 0 });
    const nav = navReadout(x, x.ships['faller']!)!;
    expect(nav.path.impact?.bodyId).toBe(PLANET_ID);
    expect(nav.path.impact!.seconds).toBeGreaterThan(1);
    expect(nav.path.impact!.seconds).toBeLessThan(10);
    expect(nav.orbit!.periapsisAltitude).toBeLessThan(0);
  });

  it('rates gravity against your own main thrust', () => {
    expect(gravityTier(0, 100, false)).toBe('none');
    expect(gravityTier(10, 100, true)).toBe('advisory');
    expect(gravityTier(30, 100, true)).toBe('caution');
    expect(gravityTier(70, 100, true)).toBe('warning');
    expect(gravityTier(110, 100, true)).toBe('alarm');
    // A loaded freighter feels the same pull as heavier than a light courier does.
    const x = nearPlanet(nearPlanet(quiet(), 'tern', { x: 800, y: 0 }, { x: 0, y: 0 }), 'spine', { x: -800, y: 0 }, { x: 0, y: 0 }, 'tessaract-trader');
    const loaded = { ...x.ships['spine']!, hold: { ore: 40 } };
    expect(navReadout(x, loaded)!.gravity.ratio).toBeGreaterThan(navReadout(x, x.ships['tern']!)!.gravity.ratio);
  });

  it('works out orbits from energy and angular momentum', () => {
    const mu = 1e6;
    const { periapsis, apoapsis } = orbitElements({ x: 1000, y: 0 }, { x: 0, y: Math.sqrt(mu / 1000) * 1.1 }, mu);
    expect(periapsis).toBeCloseTo(1000, 3);
    expect(apoapsis).toBeGreaterThan(1000);
    expect(orbitElements({ x: 1000, y: 0 }, { x: 0, y: Math.sqrt((2 * mu) / 1000) * 1.01 }, mu).apoapsis).toBe(Infinity);
  });
});
