import { describe, expect, it } from 'vitest';
import { bendSpeed, burnPlan, burnRoute, startBurn, cancelBurn, burnAcceleration } from '../burn.js';
import { BURN_BODY_MARGIN, FIXED_DT } from '../constants.js';
import { applyCommand, readCommand } from '../commands.js';
import { deserializeWorld, serializeWorld } from '../save.js';
import {
  CERES_ACCORD_ID,
  CERES_ID,
  EARTH_ID,
  EARTH_ORBITAL_EXCHANGE_ID,
  ELYSIUM_ID,
  LUNA_ID,
  MARS_ID,
  PALLAS_ID,
  SLAGLINE_ID,
  SUN_ID,
  createSolWorld,
  solDistance,
} from '../sol.js';
import { stepWorld } from '../step.js';
import { bodyStates, railTime } from '../rails.js';
import type { World } from '../types.js';
import { distance, length } from '../vec2.js';
import { joinPilot, pilotShip } from '../world.js';

/** Sol, slices 1 and 2 (docs/sol-build.md): the layout, the ports, and crossing between them, and to worlds, with a burn. */

/** Sol with one pilot, undocked and flying beside Earth Orbital Exchange, and nothing else moving. */
function soloInSol(): World {
  const base = { ...createSolWorld(), spawners: [], npcs: {}, ships: {}, asteroids: [] };
  const w = joinPilot(base, 'ana', 'Ana');
  const ship = pilotShip(w, 'ana')!;
  const exchange = w.stations[EARTH_ORBITAL_EXCHANGE_ID]!;
  const flying = { ...ship, state: 'flying' as const, dockedAt: null, padId: null, position: { x: exchange.position.x, y: exchange.position.y - 1500 }, velocity: { x: 0, y: 0 } };
  return { ...w, ships: { ...w.ships, [ship.id]: flying } };
}

function run(w: World, seconds: number, until?: (w: World) => boolean): World {
  let next = w;
  const ticks = Math.round(seconds / w.dt);
  for (let i = 0; i < ticks; i++) {
    next = stepWorld(next, {});
    if (until?.(next)) break;
  }
  return next;
}

describe('Sol', () => {
  it('lays the worlds out on a power law, inner close and outer lonely', () => {
    expect(solDistance(1)).toBe(30_000_000);
    expect(solDistance(40)).toBeGreaterThan(270_000_000);
    const w = createSolWorld();
    const at = bodyStates(w.bodies, railTime(0, w.dt));
    expect(at[SUN_ID]!.position).toEqual({ x: 0, y: 0 });
    expect(distance(at[EARTH_ID]!.position, at[SUN_ID]!.position)).toBeCloseTo(30_000_000, -3);
  });

  it('has the six slice-one ports, each well clear of its world, and starts pilots at Earth Orbital Exchange', () => {
    const w = createSolWorld();
    expect(Object.values(w.stations).map((s) => s.name).sort()).toEqual(
      ['Ceres Accord Station', 'Earth Orbital Exchange', 'Republic Station Elysium', 'Slagline', 'Thetis Orbital', 'Titan Free Port'],
    );
    const at = bodyStates(w.bodies, railTime(0, w.dt));
    for (const station of Object.values(w.stations)) {
      for (const body of Object.values(w.bodies)) {
        if (body.radius > 0) expect(distance(station.position, at[body.id]!.position) - body.radius, `${station.name} and ${body.name}`).toBeGreaterThan(station.radius);
      }
    }
    // New pilots start in space just off the home port, clear of its hull, as they did off Harbour.
    const joined = joinPilot(w, 'ana', 'Ana');
    const exchange = joined.stations[EARTH_ORBITAL_EXCHANGE_ID]!;
    const gap = distance(pilotShip(joined, 'ana')!.position, exchange.position);
    expect(gap).toBeGreaterThan(exchange.radius + 100);
    expect(gap).toBeLessThan(exchange.dockRange + 400);
  });

  it('puts the rocks and the miners round Ceres', () => {
    const w = createSolWorld();
    const ceres = bodyStates(w.bodies, railTime(0, w.dt))[CERES_ID]!.position;
    expect(w.asteroids.length).toBeGreaterThan(100);
    expect(w.asteroids.every((a) => a.orbit.parent === 'body-sol-ceres-field')).toBe(true);
    expect(distance(w.stations[CERES_ACCORD_ID]!.position, ceres)).toBeCloseTo(16_000, -1);
    expect(Object.values(w.npcs).filter((b) => b.kind === 'miner')).toHaveLength(3);
  });

  it('stays Sol through a save, with no Calder stations or NPCs slipped in', () => {
    const w = createSolWorld();
    const loaded = deserializeWorld(serializeWorld(w, 'now'));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.world.system).toBe('sol');
    expect(Object.keys(loaded.world.stations).sort()).toEqual(Object.keys(w.stations).sort());
    expect(loaded.world.spawners.map((s) => s.id).sort()).toEqual(w.spawners.map((s) => s.id).sort());
  });
});

describe('the burn', () => {
  it('plots Earth to Mars in about three minutes', () => {
    const w = createSolWorld();
    const plan = burnPlan(w, w.stations, w.stations[EARTH_ORBITAL_EXCHANGE_ID]!.position, ELYSIUM_ID, 1000, 0)!;
    expect(plan.target.kind).toBe('station');
    expect(plan.distance).toBeGreaterThan(8_000_000);
    expect(plan.distance).toBeLessThan(12_000_000);
    expect(plan.seconds).toBeGreaterThan(160);
    expect(plan.seconds).toBeLessThan(240);
    // The flip comes at the midpoint of the run; the plan's time also counts the flip itself.
    expect(plan.flipSeconds).toBeGreaterThan(plan.seconds * 0.45);
    expect(plan.flipSeconds).toBeLessThan(plan.seconds * 0.5);
  });

  it('flies a ship from Earth Orbital Exchange to Elysium and stops it at rest beside the port', () => {
    const started = startBurn(soloInSol(), 'ana', ELYSIUM_ID);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const shipId = pilotShip(started.world, 'ana')!.id;
    const plan = burnPlan(started.world, started.world.stations, pilotShip(started.world, 'ana')!.position, ELYSIUM_ID, burnAcceleration(started.world, pilotShip(started.world, 'ana')!), 0)!;
    let peak = 0;
    const arrived = run(started.world, plan.seconds * 1.5, (w) => {
      peak = Math.max(peak, length(w.ships[shipId]!.velocity));
      return !w.ships[shipId]!.burn;
    });
    const ship = arrived.ships[shipId]!;
    expect(ship.burn).toBeUndefined();
    const elysium = arrived.stations[ELYSIUM_ID]!;
    // Beside it, ready to fly in and dock, and at rest with it.
    expect(distance(ship.position, elysium.position)).toBeLessThan(elysium.dockRange + 3_000);
    expect(length({ x: ship.velocity.x - elysium.velocity.x, y: ship.velocity.y - elysium.velocity.y })).toBeLessThan(31);
    // Burned hard on the way: near the plan's peak, and in about the plan's time.
    expect(peak).toBeGreaterThan(plan.peakSpeed * 0.8);
    expect((arrived.tick - started.world.tick) * arrived.dt).toBeLessThan(plan.seconds * 1.25);
  });

  /** The pilot's ship 60,000 units past Mars from Earth's side, so the straight line to Earth Orbital Exchange crosses Mars. */
  function behindMars(): { world: World; shipId: string; mars: { x: number; y: number } } {
    const w = soloInSol();
    const shipId = pilotShip(w, 'ana')!.id;
    const mars = bodyStates(w.bodies, railTime(0, w.dt))[MARS_ID]!.position;
    const exchange = w.stations[EARTH_ORBITAL_EXCHANGE_ID]!.position;
    const away = { x: mars.x - exchange.x, y: mars.y - exchange.y };
    const d = length(away);
    const behind = { x: mars.x + (away.x / d) * 60_000, y: mars.y + (away.y / d) * 60_000 };
    return { world: { ...w, ships: { ...w.ships, [shipId]: { ...w.ships[shipId]!, position: behind } } }, shipId, mars };
  }

  it('routes round a world in the way: a pass grazing its clearance, longer and slower than the straight line', () => {
    const { world, shipId, mars } = behindMars();
    const ship = world.ships[shipId]!;
    const plan = burnPlan(world, world.stations, ship.position, EARTH_ORBITAL_EXCHANGE_ID, 1000, 0)!;
    expect(plan.route.bends.map((b) => b.bodyId)).toEqual([MARS_ID]);
    const clearance = world.bodies[MARS_ID]!.radius * BURN_BODY_MARGIN;
    // Every point of the route stays outside the clearance, and the pass itself is on it.
    for (const p of plan.route.points) expect(distance(p, mars)).toBeGreaterThanOrEqual(clearance * 0.999);
    expect(plan.route.points.some((p) => Math.abs(distance(p, mars) - clearance) < 1)).toBe(true);
    expect(plan.route.length).toBeGreaterThan(plan.route.direct);
    expect(plan.detourSeconds).toBeGreaterThan(5);
    expect(plan.route.bends[0]!.speed).toBeCloseTo(bendSpeed(1000, clearance));
    // Nothing in the way: no bends and no extra time.
    const straight = burnPlan(world, world.stations, world.stations[EARTH_ORBITAL_EXCHANGE_ID]!.position, ELYSIUM_ID, 1000, 0)!;
    expect(straight.route.bends).toEqual([]);
    expect(straight.detourSeconds).toBe(0);
  });

  it('flies round a world in the way rather than through it, slowing for the pass', () => {
    const { world, shipId, mars } = behindMars();
    const started = startBurn(world, 'ana', EARTH_ORBITAL_EXCHANGE_ID);
    if (!started.ok) throw new Error(started.reason);
    const clearance = world.bodies[MARS_ID]!.radius * BURN_BODY_MARGIN;
    let closest = Infinity;
    let fastestNearMars = 0;
    run(started.world, 60, (s) => {
      const ship = s.ships[shipId]!;
      const d = distance(ship.position, mars);
      closest = Math.min(closest, d);
      // On the pass itself (the tangent in runs close to the circle for a while, still shedding speed).
      if (d < clearance * 1.005) fastestNearMars = Math.max(fastestNearMars, length(ship.velocity));
      return false;
    });
    // Past the surface by a wide margin, and never at a speed the drive could not bend at that radius.
    expect(closest).toBeGreaterThan(world.bodies[MARS_ID]!.radius * 1.2);
    expect(fastestNearMars).toBeLessThan(bendSpeed(1000, clearance) * 1.1);
  });

  it('leaves a port dug into a rock by going straight out first', () => {
    const w = soloInSol();
    const shipId = pilotShip(w, 'ana')!.id;
    const slagline = w.stations[SLAGLINE_ID]!;
    const pallas = bodyStates(w.bodies, railTime(0, w.dt))[PALLAS_ID]!.position;
    // Slagline sits inside the clearance a route keeps from Pallas.
    expect(distance(slagline.position, pallas)).toBeLessThan(w.bodies[PALLAS_ID]!.radius * BURN_BODY_MARGIN);
    const placed = { ...w, ships: { ...w.ships, [shipId]: { ...w.ships[shipId]!, position: { x: slagline.position.x, y: slagline.position.y - 700 } } } };
    const plan = burnPlan(placed, placed.stations, placed.ships[shipId]!.position, CERES_ACCORD_ID, 1000, 0)!;
    // Pallas first (Ceres may be in the way further on: the Accord station sits on its far side from here).
    expect(plan.route.bends[0]!.bodyId).toBe(PALLAS_ID);
    // Out to the circle first, then on; and the route back in ends inside the circle at the port.
    expect(distance(plan.route.points[0]!, pallas)).toBeCloseTo(w.bodies[PALLAS_ID]!.radius * BURN_BODY_MARGIN, 0);
    const back = burnPlan(placed, placed.stations, placed.stations[CERES_ACCORD_ID]!.position, SLAGLINE_ID, 1000, 0)!;
    expect(back.route.bends.at(-1)!.bodyId).toBe(PALLAS_ID);
    expect(distance(back.route.points.at(-1)!, slagline.position)).toBeLessThan(slagline.dockRange + 600);
  });

  it('burns for a world and stops above its well, matched to it', () => {
    const w = soloInSol();
    const shipId = pilotShip(w, 'ana')!.id;
    const luna = w.bodies[LUNA_ID]!;
    const plan = burnPlan(w, w.stations, w.ships[shipId]!.position, LUNA_ID, 1000, 0)!;
    expect(plan.target).toMatchObject({ kind: 'body', id: LUNA_ID, name: 'Luna' });
    expect(plan.target.standOff).toBeGreaterThanOrEqual(luna.sphere);
    const started = startBurn(w, 'ana', LUNA_ID);
    if (!started.ok) throw new Error(started.reason);
    const arrived = run(started.world, plan.seconds * 1.5, (s) => !s.ships[shipId]!.burn);
    const ship = arrived.ships[shipId]!;
    expect(ship.burn).toBeUndefined();
    const at = bodyStates(arrived.bodies, railTime(arrived.tick, arrived.dt))[LUNA_ID]!;
    expect(distance(ship.position, at.position)).toBeGreaterThan(luna.sphere);
    expect(distance(ship.position, at.position)).toBeLessThan(luna.sphere * 1.2);
    expect(length({ x: ship.velocity.x - at.velocity.x, y: ship.velocity.y - at.velocity.y })).toBeLessThan(31);
  });

  it('will not burn for the Sun or a belt', () => {
    const w = soloInSol();
    expect(startBurn(w, 'ana', SUN_ID)).toMatchObject({ ok: false, reason: 'unknownTarget' });
    expect(burnPlan(w, w.stations, { x: 0, y: 0 }, SUN_ID, 1000, 0)).toBeNull();
  });

  it('cancelled, leaves the ship coasting at its speed; a braking burn then stops it', () => {
    const started = startBurn(soloInSol(), 'ana', ELYSIUM_ID);
    if (!started.ok) throw new Error(started.reason);
    const shipId = pilotShip(started.world, 'ana')!.id;
    const fast = run(started.world, 30);
    const speed = length(fast.ships[shipId]!.velocity);
    expect(speed).toBeGreaterThan(10_000);
    const cancelled = cancelBurn(fast, 'ana');
    expect(cancelled).toMatchObject({ ok: true, event: { type: 'burnEnded', reason: 'cancelled' } });
    if (!cancelled.ok) return;
    const coasting = run(cancelled.world, 2);
    expect(length(coasting.ships[shipId]!.velocity)).toBeGreaterThan(speed * 0.95);
    const braking = startBurn(coasting, 'ana', null);
    if (!braking.ok) throw new Error(braking.reason);
    const stopped = run(braking.world, 60, (w) => !w.ships[shipId]!.burn);
    expect(stopped.ships[shipId]!.burn).toBeUndefined();
    expect(length(stopped.ships[shipId]!.velocity)).toBeLessThan(31);
  });

  it('refuses a burn from the dock, to a port next door, to nowhere, or to cancel when not burning', () => {
    const w = soloInSol();
    const shipId = pilotShip(w, 'ana')!.id;
    const docked = { ...w, ships: { ...w.ships, [shipId]: { ...w.ships[shipId]!, state: 'docked' as const, dockedAt: EARTH_ORBITAL_EXCHANGE_ID } } };
    expect(startBurn(docked, 'ana', ELYSIUM_ID)).toMatchObject({ ok: false, reason: 'notFlying' });
    expect(startBurn(w, 'ana', EARTH_ORBITAL_EXCHANGE_ID)).toMatchObject({ ok: false, reason: 'tooClose' });
    expect(startBurn(w, 'ana', 'station-nowhere')).toMatchObject({ ok: false, reason: 'unknownTarget' });
    expect(startBurn(w, 'nobody', ELYSIUM_ID)).toMatchObject({ ok: false, reason: 'noShip' });
    expect(cancelBurn(w, 'ana')).toMatchObject({ ok: false, reason: 'notBurning' });
  });

  it('travels as commands, checked', () => {
    expect(readCommand({ type: 'burnStart', targetId: ELYSIUM_ID })).toEqual({ type: 'burnStart', targetId: ELYSIUM_ID });
    expect(readCommand({ type: 'burnStart', targetId: null })).toEqual({ type: 'burnStart', targetId: null });
    expect(readCommand({ type: 'burnStart', targetId: 5 })).toBeNull();
    expect(readCommand({ type: 'burnCancel' })).toEqual({ type: 'burnCancel' });
    expect(applyCommand(soloInSol(), 'ana', { type: 'burnStart', targetId: ELYSIUM_ID }).ok).toBe(true);
  });
});

describe('falling into a world', () => {
  /** The pilot's ship 200 units above Earth's surface, heading straight down at `speed`. */
  function diving(speed: number): { world: World; shipId: string } {
    const w = soloInSol();
    const shipId = pilotShip(w, 'ana')!.id;
    const earth = bodyStates(w.bodies, railTime(0, w.dt))[EARTH_ID]!.position;
    const radius = w.bodies[EARTH_ID]!.radius;
    const ship = { ...w.ships[shipId]!, position: { x: earth.x, y: earth.y - radius - 200 }, velocity: { x: 0, y: speed } };
    return { world: { ...w, ships: { ...w.ships, [shipId]: ship } }, shipId };
  }

  it('at speed is the end of the ship: no wreck, and the nearest port recovers the pod', () => {
    const { world, shipId } = diving(1000);
    const after = run(world, 0.5);
    expect(after.ships[shipId]).toBeUndefined();
    expect(after.wrecks).toHaveLength(0);
    const pod = pilotShip(after, 'ana')!;
    expect(pod.hullId).toBe('escape-pod');
    expect(pod.state).toBe('docked');
    expect(pod.dockedAt).toBe(EARTH_ORBITAL_EXCHANGE_ID);
  });

  it('at burn speed loses the pod too: the pilot is left with nothing, told so, and wakes at home', () => {
    const { world, shipId } = diving(20_000);
    let told = false;
    let next = world;
    for (let i = 0; i < Math.round(0.5 / FIXED_DT); i++) {
      next = stepWorld(next, {});
      if (next.events.some((e) => e.type === 'podLost' && e.pilotId === 'ana' && e.bodyId === EARTH_ID)) told = true;
    }
    expect(next.ships[shipId]).toBeUndefined();
    expect(told).toBe(true);
    expect(next.pilots['ana']!.shipId).toBeNull();
    expect(Object.values(next.ships).some((s) => s.hullId === 'escape-pod')).toBe(false);
    const woke = applyCommand(next, 'ana', { type: 'wake' });
    expect(woke.ok).toBe(true);
    expect(pilotShip(woke.world, 'ana')!.dockedAt).toBe(EARTH_ORBITAL_EXCHANGE_ID);
  });

  it('gently, is a bump: the ship bounces off as before', () => {
    const { world, shipId } = diving(100);
    const after = run(world, 4);
    expect(after.ships[shipId]).toBeDefined();
  });
});
