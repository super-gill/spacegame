import { describe, expect, it } from 'vitest';
import { burnPlan, startBurn, cancelBurn, burnAcceleration } from '../burn.js';
import { applyCommand, readCommand } from '../commands.js';
import { deserializeWorld, serializeWorld } from '../save.js';
import {
  CERES_ACCORD_ID,
  CERES_ID,
  EARTH_ID,
  EARTH_ORBITAL_EXCHANGE_ID,
  ELYSIUM_ID,
  SUN_ID,
  createSolWorld,
  solDistance,
} from '../sol.js';
import { stepWorld } from '../step.js';
import { bodyStates, railTime } from '../rails.js';
import type { World } from '../types.js';
import { distance, length } from '../vec2.js';
import { joinPilot, pilotShip } from '../world.js';

/** Sol, slice 1 (docs/sol-build.md): the layout, the ports, and crossing between them with a burn. */

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
    const plan = burnPlan(w.stations[EARTH_ORBITAL_EXCHANGE_ID]!.position, w.stations[ELYSIUM_ID]!, 1000);
    expect(plan.distance).toBeGreaterThan(8_000_000);
    expect(plan.distance).toBeLessThan(12_000_000);
    expect(plan.seconds).toBeGreaterThan(160);
    expect(plan.seconds).toBeLessThan(240);
    expect(plan.flipSeconds).toBeCloseTo(plan.seconds / 2);
  });

  it('flies a ship from Earth Orbital Exchange to Elysium and stops it at rest beside the port', () => {
    const started = startBurn(soloInSol(), 'ana', ELYSIUM_ID);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const shipId = pilotShip(started.world, 'ana')!.id;
    const plan = burnPlan(pilotShip(started.world, 'ana')!.position, started.world.stations[ELYSIUM_ID]!, burnAcceleration(started.world, pilotShip(started.world, 'ana')!));
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

  it('flies round a world in the way rather than through it', () => {
    // From Elysium's far side of Mars, the straight line to Earth crosses Mars.
    const w = soloInSol();
    const shipId = pilotShip(w, 'ana')!.id;
    const mars = bodyStates(w.bodies, railTime(0, w.dt))['body-sol-mars']!;
    const exchange = w.stations[EARTH_ORBITAL_EXCHANGE_ID]!.position;
    const away = { x: mars.position.x - exchange.x, y: mars.position.y - exchange.y };
    const d = length(away);
    const behind = { x: mars.position.x + (away.x / d) * 60_000, y: mars.position.y + (away.y / d) * 60_000 };
    const placed = { ...w, ships: { ...w.ships, [shipId]: { ...w.ships[shipId]!, position: behind } } };
    const started = startBurn(placed, 'ana', EARTH_ORBITAL_EXCHANGE_ID);
    if (!started.ok) throw new Error(started.reason);
    let closest = Infinity;
    run(started.world, 40, (s) => {
      closest = Math.min(closest, distance(s.ships[shipId]!.position, mars.position));
      return false;
    });
    expect(closest).toBeGreaterThan(32_000);
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
    expect(startBurn(w, 'ana', 'station-nowhere')).toMatchObject({ ok: false, reason: 'unknownStation' });
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
