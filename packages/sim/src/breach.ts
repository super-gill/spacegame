import { angleDelta } from './angle.js';
import { asteroidStates, oreLeft } from './asteroids.js';
import { CANISTER_UNITS, FRAGILE_STRENGTH, ORE_LOOT_LIFETIME, claimed } from './mining.js';

export { FRAGILE_STRENGTH };
import { bodyState, railTime, withOrbitMoving } from './rails.js';
import type { Damage } from './combat.js';
import type { Asteroid, Loot, NpcBrain, Orbit, PlantedCharge, Ship, World, WorldEvent } from './types.js';
import { add, distance, fromAngle, scale, sub, toAngle, type Vec2 } from './vec2.js';

/**
 * Breaching (docs/mining.md, "Breaching"): breach charges split a big rock.
 *
 * - A breach charger (utility) plants a charge on the active lock's rock
 *   from its tile when the ship is within `PLANT_REACH` of the surface,
 *   where the ship is: a bearing round the rock. The same tile, pressed
 *   at least `SAFE_DISTANCE` from the surface, sets off every charge the
 *   ship has on that rock.
 * - The rock splits into chunks (its ore shared out, a little softer for
 *   the cracking) that drift apart, clearing room round the glass. A rock with a gate-glass core also exposes its glass:
 *   all of it if every breach point had a charge within the charger's
 *   tolerance, as little as a quarter if none did, and half that again
 *   from a fractured core. The exposed glass is
 *   brittle (a laser stronger than `FRAGILE_STRENGTH` shatters what it
 *   cuts) and collapses after `CORE_LIFETIME` seconds.
 * - The blast hurts every ship within `BLAST_RADIUS`, its owner and its
 *   drones too; shatters small rocks into loose ore and knocks ore off
 *   bigger ones; and its signature bloom draws pirates from `BLOOM_RANGE`
 *   to the blast, where they hunt whatever they find.
 */

export const PLANT_REACH = 70;
export const SAFE_DISTANCE = 150;
/** Smaller rocks cannot be breached: there is nothing to split. */
export const BREACH_MIN_RADIUS = 40;
export const BLAST_RADIUS = 320;
/** Blast damage at the centre, falling to nothing at the edge. */
export const BLAST_DAMAGE = 450;
export const BLOOM_RANGE = 9000;
export const CORE_LIFETIME = 180;
/**
 * The chunks drift apart after a breach, clearing room round the glass
 * for drones: this far beyond where they start, units (plus the rock's
 * radius), easing to a stop over `DRIFT_SECONDS`.
 */
export const DRIFT_DISTANCE = 100;
export const DRIFT_SECONDS = 20;
/** Rocks smaller than this in the blast shatter into loose ore; bigger ones lose `KNOCKED_LOOSE` units. */
const SHATTER_RADIUS = 30;
const KNOCKED_LOOSE = 10;
/** Loose ore flies off at this speed, units/s, and settles. */
const DEBRIS_SPEED = 25;

/** What a breach charger's tile does now. */
export type BreachAction =
  | { kind: 'plant'; charge: PlantedCharge }
  | { kind: 'detonate'; rockId: string }
  | { kind: 'refuse'; reason: Extract<WorldEvent, { type: 'chargeRefused' }>['reason'] };

/**
 * Work out a breach charger's tile press: plant on the active lock's rock
 * if close enough, else set off this ship's charges if far enough from
 * them, else say why not. `rockFor` gives where a rock is now.
 */
export function breachAction(world: Pick<World, 'asteroids' | 'charges'>, ship: Ship, rockFor: (id: string) => { position: Vec2; radius: number } | null, chargeId: string): BreachAction {
  const active = ship.activeLock && ship.locks.some((l) => l.targetId === ship.activeLock && l.progress >= 1) ? ship.activeLock : null;
  const target = active ? rockFor(active) : null;
  const mine = (world.charges ?? []).filter((c) => c.shipId === ship.id);

  if (target && active && distance(ship.position, target.position) - target.radius <= PLANT_REACH) {
    if (target.radius < BREACH_MIN_RADIUS) return { kind: 'refuse', reason: 'tooSmall' };
    if ((ship.hold['breach-charge'] ?? 0) <= 0) return { kind: 'refuse', reason: 'noCharges' };
    const bearing = toAngle(sub(ship.position, target.position));
    return { kind: 'plant', charge: { id: chargeId, shipId: ship.id, rockId: active, bearing } };
  }
  if (mine.length > 0) {
    // Set off the charges on the rock it planted on most recently.
    const rockId = mine[mine.length - 1]!.rockId;
    const rock = rockFor(rockId);
    if (!rock) return { kind: 'refuse', reason: 'noRock' };
    if (distance(ship.position, rock.position) - rock.radius < SAFE_DISTANCE) return { kind: 'refuse', reason: 'tooClose' };
    return { kind: 'detonate', rockId };
  }
  return { kind: 'refuse', reason: target ? 'tooFar' : 'noRock' };
}

export interface BlastResult {
  asteroids: Asteroid[];
  charges: PlantedCharge[];
  loot: Loot[];
  damage: Damage[];
  npcs: World['npcs'];
  events: WorldEvent[];
  idsUsed: number;
}

/**
 * Set off `shipId`'s charges on `rockId`: split the rock, expose any core,
 * blast what is near, and bloom. `asteroids` are the rocks as they stand
 * at the end of this tick (at `tick`); `ships` where ships are now.
 */
export function detonate(
  world: Pick<World, 'bodies' | 'dt' | 'rules' | 'goods' | 'npcs'>,
  asteroids: readonly Asteroid[],
  charges: readonly PlantedCharge[],
  ships: Readonly<Record<string, Ship>>,
  shipId: string,
  rockId: string,
  tolerance: number,
  tick: number,
  nextId: number,
  claim?: string,
): BlastResult {
  const index = asteroids.findIndex((a) => a.id === rockId);
  if (index < 0) return { asteroids: [...asteroids], charges: charges.filter((c) => c.rockId !== rockId), loot: [], damage: [], npcs: world.npcs, events: [], idsUsed: 0 };
  const states = asteroidStates(world.bodies, asteroids, tick, world.dt);
  const rock = asteroids[index]!;
  const at = states[index]!.position;
  const placed = charges.filter((c) => c.shipId === shipId && c.rockId === rockId);
  const points = rock.core?.points ?? [];
  const hit = points.filter((p) => placed.some((c) => Math.abs(angleDelta(c.bearing, p)) <= tolerance)).length;
  const quality = points.length > 0 ? hit / points.length : 0;
  const time = railTime(tick, world.dt);
  const centre = bodyState(world.bodies, rock.orbit.parent, time).position;
  const stillAt = (p: Vec2): Orbit => {
    const still: Orbit = { ...rock.orbit, radius: distance(p, centre), phase: toAngle(sub(p, centre)), frozen: true };
    return world.rules.orbits ? withOrbitMoving(still, true, time) : still;
  };

  // The rock splits: chunks round where it was, a little softer for the cracking.
  const count = rock.radius >= 60 ? 3 : 2;
  const pieces: Asteroid[] = [];
  const goods = Object.keys(rock.contents).sort();
  for (let i = 0; i < count; i++) {
    const contents: Record<string, number> = {};
    for (const g of goods) {
      const total = rock.contents[g]!;
      const share = Math.floor(total / count) + (i < total % count ? 1 : 0);
      if (share > 0) contents[g] = share;
    }
    if (Object.keys(contents).length === 0) continue;
    const out = fromAngle(rock.orbit.phase + 0.3 + (i * Math.PI * 2) / count);
    const p = add(at, scale(out, rock.radius * 0.75));
    // Pushed apart by the blast, so the glass in the middle is reachable.
    const drift = { offset: scale(out, DRIFT_DISTANCE + rock.radius), fromTick: tick, toTick: tick + Math.round(DRIFT_SECONDS / world.dt) };
    pieces.push({ id: `${rock.id}.${i + 1}`, orbit: stillAt(p), radius: Math.max(12, Math.round(rock.radius * 0.45)), contents, hardness: Math.max(0.1, Math.round((rock.hardness - 0.2) * 100) / 100), field: rock.field, drift });
  }
  // The core, exposed: brittle, and on a clock.
  // A fractured core gives half, however clean the breach.
  const glass = rock.core ? Math.round(rock.core.glass * (0.25 + 0.75 * quality) * (rock.core.fractured ? 0.5 : 1)) : 0;
  if (glass > 0) {
    pieces.push({ id: `${rock.id}.glass`, orbit: stillAt(at), radius: 12, contents: { 'gate-glass': glass }, hardness: 0.3, field: rock.field, fragile: true, expiresTick: tick + Math.round(CORE_LIFETIME / world.dt) });
  }

  // The blast: ships hurt, small rocks shattered, ore knocked off bigger ones.
  const damage: Damage[] = [];
  for (const s of Object.values(ships)) {
    if (s.state !== 'flying') continue;
    const d = distance(s.position, at);
    if (d < BLAST_RADIUS) damage.push({ shipId: s.id, amount: BLAST_DAMAGE * (1 - d / BLAST_RADIUS), by: shipId, cause: 'blast', type: 'kinetic', from: at });
  }
  const loot: Loot[] = [];
  let idsUsed = 0;
  const spill = (from: Vec2, item: string, amount: number, k: number): void => {
    const dir = fromAngle(toAngle(sub(from, at)) + (k - 1) * 0.4);
    loot.push({ id: `l${nextId + idsUsed++}`, item, amount, position: from, velocity: scale(dir, DEBRIS_SPEED), ticksLeft: Math.round(ORE_LOOT_LIFETIME / world.dt), ...claimed(claim) });
  };
  const rest: Asteroid[] = [];
  const gone = new Set<string>([rock.id]);
  asteroids.forEach((other, i) => {
    if (i === index) return;
    const where = states[i]!.position;
    if (distance(where, at) - other.radius >= BLAST_RADIUS) return void rest.push(other);
    if (other.radius < SHATTER_RADIUS) {
      // Shattered: all its ore loose, in canisters.
      gone.add(other.id);
      let k = 0;
      for (const g of Object.keys(other.contents).sort()) {
        let left = other.contents[g]!;
        while (left > 0 && k < 12) {
          const amount = Math.min(CANISTER_UNITS, left);
          spill(add(where, scale(fromAngle(k * 1.1), other.radius * 0.5)), g, amount, k++);
          left -= amount;
        }
      }
      return;
    }
    // Knocked: a little ore off the face towards the blast.
    let knocked = KNOCKED_LOOSE;
    const contents = { ...other.contents };
    let k = 0;
    for (const g of Object.keys(contents).sort((a, b) => contents[b]! - contents[a]!)) {
      if (knocked <= 0) break;
      const amount = Math.min(CANISTER_UNITS, contents[g]!, knocked);
      contents[g]! -= amount;
      if (contents[g] === 0) delete contents[g];
      knocked -= amount;
      spill(add(where, scale(fromAngle(toAngle(sub(at, where))), other.radius + 4)), g, amount, k++);
    }
    rest.push(oreLeft({ contents }) > 0 ? { ...other, contents } : other);
  });

  // The bloom: pirates far and wide notice, and come to see.
  const npcs: Record<string, NpcBrain> = { ...world.npcs };
  for (const [id, brain] of Object.entries(world.npcs)) {
    const pirate = ships[id];
    if (brain.kind !== 'pirate' || !pirate || brain.mode === 'hunt' || distance(pirate.position, at) > BLOOM_RANGE) continue;
    npcs[id] = { ...brain, drawnTo: at };
  }

  return {
    asteroids: [...rest, ...pieces],
    charges: charges.filter((c) => !gone.has(c.rockId)),
    loot,
    damage,
    npcs,
    events: [{ type: 'breached', shipId, rockId, position: at, chunks: pieces.filter((p) => !p.fragile).length, glass, quality }],
    idsUsed,
  };
}

/** Exposed cores past their time collapse, taking their glass with them. */
export function collapseCores(asteroids: readonly Asteroid[], tick: number): { asteroids: Asteroid[]; events: WorldEvent[] } {
  const events: WorldEvent[] = [];
  const kept = asteroids.filter((a) => {
    if (a.expiresTick === undefined || tick < a.expiresTick) return true;
    events.push({ type: 'coreCollapsed', rockId: a.id, shipId: '', amount: oreLeft(a) });
    return false;
  });
  // Nothing collapsed: the same list, so an unchanged belt is the same object (docs/shared-world.md).
  return { asteroids: kept.length === asteroids.length ? (asteroids as Asteroid[]) : kept, events };
}

