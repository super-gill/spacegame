import { asteroidPositions, oreLeft, rockAt } from '../asteroids.js';
import { dronesOut } from '../drones.js';
import { angleDelta } from '../angle.js';
import { isLocked } from '../locks.js';
import { holdSpaceFor } from '../trade.js';
import type { MinerBrain, Ship, ShipInput, ShipStats, World } from '../types.js';
import { add, distance, fromAngle, scale, sub, toAngle, type Vec2 } from '../vec2.js';
import { emptyInput } from '../world.js';
import { CLEAR_MARGIN, navigate } from './navigate.js';
import { flightOn, steerSafely } from './steer.js';
import { defend, flyToStation, hunter } from './trader.js';

/**
 * NPC miners (docs/mining.md, "NPC miners"). They work as a pilot does,
 * through the same inputs:
 *
 * - Docked at the market: sell the ore (skin-deep: it simply leaves the
 *   hold), wait, undock.
 * - Outbound: pick the nearest rock round the field station that its
 *   lasers can cut and no other miner has taken, and fly to it along a
 *   planned path.
 * - Mining, a prospector: park off the rock's face, turn to it and cut
 *   with the tractor on, until the rock is gone (then the next) or the
 *   hold is full.
 * - Mining, a hulk: park off the rock, lock it and the rocks round it,
 *   give each turret a rock, launch its drones, tractor on. When the
 *   rocks in reach run out it recalls its drones and moves on.
 * - Inbound when full, or when a pirate hunts it: recall drones, wait for
 *   them (briefly), fly to the market, dock. Hunted, it also locks the
 *   pirate and goes weapons hot, as traders do.
 */

export const MINER_TUNING = {
  /** Seconds docked at the market. */
  dwellSeconds: 8,
  /** Rocks within this of the field station are worked, units. */
  workRadius: 4500,
  /** Cruise speed as a share of top speed. */
  cruiseFraction: 0.7,
  /** A prospector parks this far off the rock's face, units. */
  prospectorStandoff: 50,
  /** A hulk parks this far off the rock's face, units. */
  hulkStandoff: 150,
  /** A hulk locks rocks within this of itself, units (inside its turrets' reach). */
  hulkReach: 420,
  /** Rocks a hulk keeps locked, at most. */
  hulkLocks: 4,
  /** Facing the rock within this, radians, before a fixed laser runs. */
  aimTolerance: 0.1,
  /** Seconds to wait for drones to come home before leaving without them. */
  droneWaitSeconds: 25,
};

export interface MinerThought {
  input: ShipInput;
  brain: MinerBrain;
}

export function thinkMiner(world: World, ship: Ship, stats: ShipStats, brain: MinerBrain): MinerThought {
  const market = world.stations[brain.market];
  const field = world.stations[brain.field];
  if (!market || !field) return { input: emptyInput(), brain };
  const tick = (b: MinerBrain): MinerBrain => ({ ...b, modeTicks: b.modeTicks + 1 });
  const switchTo = (mode: MinerBrain['mode'], b: MinerBrain = brain): MinerBrain => ({ ...b, mode, modeTicks: 0 });

  // Docked: sell, wait, leave.
  if (ship.state === 'docked') {
    if (brain.mode !== 'docked') {
      // Skin-deep sale: the ore leaves the hold and pays nobody (lifecycle.ts `sellNpcOre`).
      return { input: emptyInput(), brain: { ...switchTo('docked'), waitTicks: Math.round(MINER_TUNING.dwellSeconds / world.dt), rockId: null } };
    }
    if (brain.waitTicks > 0) return { input: emptyInput(), brain: { ...brain, waitTicks: brain.waitTicks - 1 } };
    return { input: { ...emptyInput(), toggleDock: true }, brain: switchTo('outbound') };
  }

  const isHulk = stats.weapons && Object.values(stats.weapons).some((w) => w.family === 'mining' && w.kind === 'turret');
  const strength = Math.max(0, ...Object.values(stats.weapons).map((w) => w.mining?.strength ?? 0));
  const out = dronesOut(world, ship.id);
  const full = holdSpaceFor(ship, stats, world.goods, 'ore') <= 0;
  const threat = hunter(world, ship);
  const cruise = stats.maxSpeed * MINER_TUNING.cruiseFraction;
  const flight = flightOn(world, ship);

  // Time to go: full, or hunted.
  if (brain.mode !== 'inbound' && (full || threat)) return thinkMiner(world, ship, stats, switchTo('inbound'));

  if (brain.mode === 'inbound') {
    // Drones home first (not for long: a hunted hulk will not wait to die).
    const waited = brain.modeTicks * world.dt;
    if (out.length > 0 && waited < MINER_TUNING.droneWaitSeconds) {
      const recall = out.some((d) => world.npcs[d.id]?.kind === 'drone' && (world.npcs[d.id] as { mode: string }).mode !== 'return');
      const hold = steerSafely(ship, stats, ship.velocity, flight);
      const input = { ...hold, droneCommand: recall ? { action: 'recall' as const } : null };
      return { input: threat ? defend(world, ship, input) : input, brain: tick(brain) };
    }
    const toMarket = flyToStation(world, ship, stats, market, distance(ship.position, field.position) < field.radius + 400 ? field : undefined);
    if (toMarket.dock) return { input: { ...emptyInput(), toggleDock: true }, brain: tick(brain) };
    return { input: threat ? defend(world, ship, toMarket.input) : toMarket.input, brain: tick(brain) };
  }

  // Outbound or mining: keep to a rock that still has ore, else pick one.
  const current = brain.rockId ? rockAt(world, brain.rockId) : null;
  const rockId = current && oreLeft(current.rock) > 0 && current.rock.hardness <= strength ? brain.rockId : pickRock(world, ship, strength, isHulk, field.position);
  if (!rockId) {
    // Nothing to cut round here: wait near the field station.
    const near = add(field.position, scale(fromAngle(toAngle(sub(ship.position, field.position))), field.radius + 600));
    const { velocity, plan } = navigate(world, ship, stats, brain, near, field.velocity, cruise);
    return { input: steerSafely(ship, stats, velocity, flight), brain: tick({ ...brain, ...plan, rockId: null }) };
  }
  const rock = rockAt(world, rockId)!;
  const standoff = isHulk ? MINER_TUNING.hulkStandoff : MINER_TUNING.prospectorStandoff;
  const spot = clearSpot(world, rock.rock.id, rock.position, rock.rock.radius + standoff + stats.radius, toAngle(sub(ship.position, rock.position)), stats.radius + CLEAR_MARGIN);
  const there = distance(ship.position, spot) < 30;
  let next: MinerBrain = { ...brain, rockId, mode: there ? 'mining' : brain.mode === 'mining' ? 'mining' : 'outbound' };
  if (next.mode !== brain.mode) next = { ...next, modeTicks: 0 };

  const { velocity, plan } = navigate(world, ship, stats, brain, spot, rock.velocity, cruise, { ignoreShips: (o) => o.motherId === ship.id });
  next = tick({ ...next, ...plan });
  const close = distance(ship.position, spot) < 90;
  let input = steerSafely(ship, stats, velocity, flight, close ? rock.position : undefined);

  if (!isHulk) {
    // A prospector: face the rock and cut, tractor on.
    const facing = Math.abs(angleDelta(ship.heading, toAngle(sub(rock.position, ship.position)))) <= MINER_TUNING.aimTolerance;
    input = { ...input, fireFixed: there && facing, tractor: close };
    return { input, brain: next };
  }

  // A hulk: lock the rocks round it, give each turret one, fly its drones.
  input = { ...input, tractor: close };
  if (!there) return { input, brain: next };
  return { input: { ...input, ...hulkWork(world, ship, stats, rock.rock.id) }, brain: next };
}

/**
 * One tick of a parked hulk's work: lock the next rock in reach, else give
 * an idle turret a locked rock, else launch drones if any are stowed.
 */
function hulkWork(world: World, ship: Ship, stats: ShipStats, primary: string): Partial<ShipInput> {
  const strength = Math.max(0, ...Object.values(stats.weapons).map((w) => w.mining?.strength ?? 0));
  const inReach = asteroidPositions(world)
    .filter((r) => distance(r.position, ship.position) - r.radius <= MINER_TUNING.hulkReach)
    .map((r) => world.asteroids.find((a) => a.id === r.id)!)
    .filter((a) => a.hardness <= strength && oreLeft(a) > 0)
    .sort((a, b) => (a.id === primary ? -1 : b.id === primary ? 1 : distanceTo(world, ship, a.id) - distanceTo(world, ship, b.id)))
    .slice(0, Math.min(MINER_TUNING.hulkLocks, stats.maxLocks));
  // Drop a lock on anything that is not one of these rocks (a stale one).
  const stray = ship.locks.find((l) => !inReach.some((a) => a.id === l.targetId));
  if (stray) return { unlock: stray.targetId };
  const toLock = inReach.find((a) => !ship.locks.some((l) => l.targetId === a.id));
  if (toLock && ship.locks.length < stats.maxLocks) return { lock: toLock.id };
  // Give an idle turret a rock no turret is on (or any locked rock).
  const turrets = ship.weapons.filter((w) => stats.weapons[w.mountId]?.family === 'mining' && stats.weapons[w.mountId]?.kind === 'turret');
  const idle = turrets.find((w) => !w.lockTarget);
  const locked = ship.locks.filter((l) => isLocked(ship, l.targetId)).map((l) => l.targetId);
  if (idle && locked.length > 0) {
    const taken = new Set(turrets.map((w) => w.lockTarget).filter(Boolean));
    const rock = locked.find((r) => !taken.has(r)) ?? locked[0]!;
    return { activateLock: rock, toggleModule: idle.mountId };
  }
  if ((ship.droneBay?.length ?? 0) > 0 && locked.length > 0) return { droneCommand: { action: 'launch' } };
  return {};
}

function distanceTo(world: World, ship: Ship, rockId: string): number {
  const r = rockAt(world, rockId);
  return r ? distance(r.position, ship.position) : Infinity;
}

/**
 * The nearest rock round the field station this miner can cut and no
 * other miner is working. A hulk wants big rocks (worth parking for); a
 * prospector anything its laser takes.
 */
function pickRock(world: World, ship: Ship, strength: number, isHulk: boolean, fieldAt: Vec2): string | null {
  const taken = new Set<string>();
  for (const [id, other] of Object.entries(world.npcs)) if (id !== ship.id && other.kind === 'miner' && other.rockId) taken.add(other.rockId);
  let best: string | null = null;
  let bestScore = Infinity;
  const positions = asteroidPositions(world);
  world.asteroids.forEach((rock, i) => {
    if (taken.has(rock.id) || rock.hardness > strength || oreLeft(rock) <= 0) return;
    if (isHulk && rock.radius < 35) return;
    const at = positions[i]!.position;
    if (distance(at, fieldAt) > MINER_TUNING.workRadius) return;
    const score = distance(at, ship.position);
    if (score < bestScore || (score === bestScore && best !== null && rock.id < best)) {
      bestScore = score;
      best = rock.id;
    }
  });
  return best;
}

/**
 * A spot `reach` from a rock's centre, starting at `bearing` and stepping
 * round its face until it is clear of other rocks by `clearance`.
 */
export function clearSpot(world: World, rockId: string, centre: Vec2, reach: number, bearing: number, clearance: number): Vec2 {
  const others = asteroidPositions(world).filter((r) => r.id !== rockId && distance(r.position, centre) < reach + 200);
  for (let k = 0; k < 16; k++) {
    const angle = bearing + (k % 2 === 0 ? 1 : -1) * Math.ceil(k / 2) * 0.3;
    const spot = add(centre, scale(fromAngle(angle), reach));
    if (others.every((o) => distance(spot, o.position) >= o.radius + clearance + 4)) return spot;
  }
  return add(centre, scale(fromAngle(bearing), reach));
}
