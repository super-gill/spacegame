import { bestTier, oreLeft, rockSeam } from './asteroids.js';
/** Lasers stronger than this shatter exposed gate-glass (breach.ts). */
export const FRAGILE_STRENGTH = 0.6;
import { oreGoods } from './goods.js';
import { segmentHitsCircle, type BeamShot } from './combat.js';
import type { Asteroid, GoodSpec, Loot, MiningBeam, Ship, ShipStats, SurveyResult, WorldEvent } from './types.js';
import { angleDelta } from './angle.js';
import { add, distance, fromAngle, scale, sub, toAngle, type Vec2 } from './vec2.js';

/**
 * Mining, part 1 (docs/mining.md): surveying the belt and cutting ore.
 *
 * - A survey scanner pulses from its tile: rocks in reach are reported
 *   by what they hold, as well as the scanner can tell, and the HUD
 *   lights them for a few seconds (`Ship.survey`).
 * - A mining laser runs along the nose while its group fires. It cuts
 *   the first rock it reaches if the rock is no harder than the laser is
 *   strong, freeing ore in canisters of loot that the tractor scoops. A
 *   laser takes the rock as it comes: canisters follow the rock's mix,
 *   so a light ship gets what it gets. Choosing an ore is for hulks
 *   working the pockets charges expose (part 2). A rock with nothing
 *   left crumbles away.
 */

/** Ore in one canister, units. A rock's last canister holds whatever is left. */
export const CANISTER_UNITS = 5;
/** Seconds a canister of freed ore lasts loose in space: long enough to fill up, sell and come back. */
export const ORE_LOOT_LIFETIME = 600;
/**
 * Soft rock cuts faster: the rate is multiplied by 1 plus this times how
 * far the laser's strength exceeds the rock's hardness, as a share of the
 * strength. The softest rock cuts at twice the rate; rock at the
 * laser's limit at the plain rate.
 */
export const SOFT_ROCK_BONUS = 1;
/** Every rock has a seam: a beam biting within this angle of it, radians, frees ore SEAM_MULTIPLIER times as fast. */
export const SEAM_HALF_ARC = 0.45;
export const SEAM_MULTIPLIER = 1.5;
/** Seconds a survey scanner takes to cycle between pulses. */
export const SURVEY_CYCLE_SECONDS = 5;
/** Seconds the HUD keeps a survey's findings lit. */
export const SURVEY_SHOW_SECONDS = 8;

/** Seconds a cache lasts: long enough for a mining run and a trip to sell. */
export const CACHE_LIFETIME = 3600;
/** Loose ore canisters this close to a ship dropping a cache join it, units (or its tractor's reach, if longer). */
export const CACHE_GATHER_RANGE = 200;

/**
 * Drop a cache (docs/mining.md, "Caches"): the ore aboard goes out of the
 * stern as one canister per ore, and loose ore canisters near the ship
 * join the cache. Cached loot lasts `CACHE_LIFETIME` and shows on its
 * owner's radar; anyone can still scoop it. Returns the ship with its ore
 * gone, the new canisters, the ids of loose canisters marked, and the
 * event (null if there was nothing to cache).
 */
export function dropCache(
  ship: Ship,
  stats: Pick<ShipStats, 'radius' | 'tractorRange'>,
  ownerId: string,
  loot: readonly Loot[],
  goods: Readonly<Record<string, GoodSpec>>,
  frame: Vec2,
  dt: number,
  nextId: number,
): { ship: Ship; added: Loot[]; marked: Set<string>; idsUsed: number; event: WorldEvent | null } {
  const cache = { ownerId };
  const ticksLeft = Math.round(CACHE_LIFETIME / dt);
  const stern = add(ship.position, scale(fromAngle(ship.heading), -(stats.radius + 12)));
  const added: Loot[] = [];
  let hold = ship.hold;
  let units = 0;
  for (const good of Object.keys(ship.hold).sort()) {
    const amount = ship.hold[good]!;
    if (!goods[good]?.ore || amount <= 0) continue;
    const { [good]: _gone, ...rest } = hold;
    hold = rest;
    // Fanned out a little so the canisters do not sit on one another.
    const spread = fromAngle(ship.heading + Math.PI + (added.length - 1) * 0.5);
    added.push({ id: `l${nextId + added.length}`, item: good, amount, position: add(stern, scale(spread, 6 * added.length)), velocity: frame, ticksLeft, cache, claim: ownerId });
    units += amount;
  }
  const reach = Math.max(CACHE_GATHER_RANGE, stats.tractorRange);
  const marked = new Set<string>();
  for (const l of loot) {
    if (!goods[l.item]?.ore || distance(l.position, ship.position) > reach) continue;
    if (l.claim !== undefined && l.claim !== ownerId) continue; // someone else's stays theirs
    marked.add(l.id);
    units += l.amount;
  }
  if (units === 0) return { ship, added, marked, idsUsed: 0, event: null };
  return { ship: hold === ship.hold ? ship : { ...ship, hold }, added, marked, idsUsed: added.length, event: { type: 'cacheDropped', shipId: ship.id, units } };
}

/** `{ claim }` when there is one, else nothing (so loot without a claim has no key). */
export function claimed(claim: string | undefined): { claim?: string } {
  return claim === undefined ? {} : { claim };
}

/** The ores a ship's hopper spits out now: its list, unless sorting is switched off. */
export function hopperRejects(ship: Pick<Ship, 'hopper'>): readonly string[] {
  return ship.hopper && !ship.hopper.off ? ship.hopper.drop : [];
}

/**
 * The hopper after a press of its tile. A small hopper (grade 1) steps its
 * one dropped ore through the ore catalogue and back to taking all; a
 * bigger one switches its list on and off.
 */
export function hopperAfterTile(ship: Pick<Ship, 'hopper'>, grade: number, goods: Readonly<Record<string, GoodSpec>>): Ship['hopper'] {
  if (grade <= 1) {
    const next = nextHopperFilter(ship.hopper && !ship.hopper.off ? ship.hopper.drop[0] : null, goods);
    return next ? { drop: [next] } : undefined;
  }
  const drop = ship.hopper?.drop ?? [];
  return ship.hopper?.off ? { drop } : { drop, off: true };
}

/** A hopper list as set from the hold panel: ores only, no repeats, in catalogue order, one at most on a small hopper. */
export function hopperList(list: readonly string[], grade: number, goods: Readonly<Record<string, GoodSpec>>): string[] {
  const ores = oreGoods(goods).map((g) => g.id).filter((id) => list.includes(id));
  return grade <= 1 ? ores.slice(0, 1) : ores;
}

/**
 * With a large hopper (grade 3) and the ore hold full: the cheapest ore
 * aboard that `item` is worth more than, to spit out in its place; null if
 * there is none or the ship cannot trade up.
 */
export function tradeUpFor(ship: Ship, grade: number, oreRoom: number, goods: Readonly<Record<string, GoodSpec>>, item: string): string | null {
  if (grade < 3 || oreRoom > 0 || !goods[item]?.ore) return null;
  const value = goods[item]!.basePrice;
  let cheapest: string | null = null;
  for (const [id, q] of Object.entries(ship.hold)) {
    if (q <= 0 || !goods[id]?.ore || id === item || goods[id]!.basePrice >= value) continue;
    if (!cheapest || goods[id]!.basePrice < goods[cheapest]!.basePrice || (goods[id]!.basePrice === goods[cheapest]!.basePrice && id < cheapest)) cheapest = id;
  }
  return cheapest;
}

/** The ore an ore hopper's filter leaves behind after `current`, cycling through the ore catalogue and back to none. */
export function nextHopperFilter(current: string | null | undefined, goods: Readonly<Record<string, GoodSpec>>): string | null {
  const ores = oreGoods(goods).map((g) => g.id);
  if (!current) return ores[0] ?? null;
  const at = ores.indexOf(current);
  return at < 0 || at === ores.length - 1 ? null : ores[at + 1]!;
}

export interface CutResult {
  asteroids: Asteroid[];
  ships: Record<string, Ship>;
  loot: Loot[];
  events: WorldEvent[];
  idsUsed: number;
}

/**
 * Cut the rocks this tick's beams reach. `rockAt` gives each rock's
 * place, in the same order as `asteroids`, as it stands at the end of the
 * tick (where the ships now are). `before` holds the ships as they were
 * at the start of the tick, to tell a fresh beam from one already
 * running. Beams are resolved in the order given, so results never
 * depend on anything else.
 */
export function cutRocks(
  asteroids: readonly Asteroid[],
  rockAt: readonly { position: Vec2; velocity: Vec2 }[],
  ships: Readonly<Record<string, Ship>>,
  before: Readonly<Record<string, Ship>>,
  beams: readonly BeamShot[],
  dt: number,
  nextId: number,
  claimFor: (shipId: string) => string | undefined = () => undefined,
): CutResult {
  const rocks = asteroids.slice();
  const places = rockAt.slice();
  const loot: Loot[] = [];
  const events: WorldEvent[] = [];
  const drawn: Record<string, MiningBeam[]> = {};
  let idsUsed = 0;

  for (const beam of beams) {
    const dir = fromAngle(beam.bearing);
    let hit = -1;
    let reach = beam.range;
    for (let i = 0; i < rocks.length; i++) {
      const at = places[i]!.position;
      const r = rocks[i]!.radius;
      if (distance(beam.origin, at) > beam.range + r) continue;
      const d = segmentHitsCircle(beam.origin, dir, beam.range, at, r);
      if (d !== null && d < reach) {
        reach = d;
        hit = i;
      }
    }

    const record = (rockId: string | null, cutting: boolean, onSeam = false): void => {
      (drawn[beam.shipId] ??= []).push({ mountId: beam.mountId, bearing: beam.bearing, length: reach, rockId, cutting, ...(onSeam ? { onSeam } : {}) });
    };
    if (hit < 0) {
      record(null, false);
      continue;
    }
    const rock = rocks[hit]!;
    if (rock.hardness > beam.strength) {
      record(rock.id, false);
      const was = before[beam.shipId]?.beams?.find((b) => b.mountId === beam.mountId);
      if (was?.rockId !== rock.id) events.push({ type: 'miningTooHard', shipId: beam.shipId, rockId: rock.id });
      continue;
    }
    // Where the beam bites: on the seam, the rock gives up its ore half as fast again.
    const point = add(beam.origin, scale(dir, reach));
    const onSeam = Math.abs(angleDelta(rockSeam(rock.id), toAngle(sub(point, places[hit]!.position)))) <= SEAM_HALF_ARC;
    record(rock.id, true, onSeam);

    // Cut, and release whole canisters as they come free.
    const rate = cutRate(beam.strength, rock.hardness) * (onSeam ? SEAM_MULTIPLIER : 1);
    let cut = (rock.cut ?? 0) + beam.yield * rate;
    let contents = rock.contents;
    let mined = rock.mined ?? {};
    let left = oreLeft(rock);
    while (left > 0 && (cut >= CANISTER_UNITS || cut >= left)) {
      const good = nextOre(contents, mined);
      const amount = Math.min(CANISTER_UNITS, contents[good]!);
      contents = { ...contents, [good]: contents[good]! - amount };
      mined = { ...mined, [good]: (mined[good] ?? 0) + amount };
      if (contents[good] === 0) {
        const { [good]: _gone, ...rest } = contents;
        contents = rest;
      }
      cut -= amount;
      left -= amount;
      // Gate-glass is brittle: a laser too strong for it shatters what it frees.
      if (rock.fragile && beam.strength > FRAGILE_STRENGTH) {
        events.push({ type: 'glassShattered', shipId: beam.shipId, rockId: rock.id, amount });
        continue;
      }
      loot.push({
        id: `l${nextId + idsUsed++}`,
        item: good,
        amount,
        position: point,
        // At rest beside the rock, where the laser freed it.
        velocity: places[hit]!.velocity,
        ticksLeft: Math.round(ORE_LOOT_LIFETIME / dt),
        ...claimed(claimFor(beam.shipId)),
      });
      events.push({ type: 'oreFreed', shipId: beam.shipId, rockId: rock.id, item: good, amount });
    }

    if (left <= 0) {
      events.push({ type: 'rockCrumbled', shipId: beam.shipId, rockId: rock.id });
      rocks.splice(hit, 1);
      places.splice(hit, 1);
      continue;
    }
    const { cut: _old, ...rest } = rock;
    rocks[hit] = cut > 0 ? { ...rest, contents, mined, cut } : { ...rest, contents, mined };
  }

  // Note what each ship's lasers are doing, for drawing; clear ships that stopped.
  let out: Record<string, Ship> | null = null;
  for (const [id, ship] of Object.entries(ships)) {
    const now = drawn[id];
    if (!now && !ship.beams) continue;
    out ??= { ...ships };
    if (now) out[id] = { ...ship, beams: now };
    else {
      const { beams: _off, ...rest } = ship;
      out[id] = rest;
    }
  }
  return { asteroids: rocks, ships: out ?? (ships as Record<string, Ship>), loot, events, idsUsed };
}

/** How much faster than its plain rate a laser of this strength cuts rock this hard (1 at its limit). */
export function cutRate(strength: number, hardness: number): number {
  if (strength <= 0) return 0;
  return 1 + SOFT_ROCK_BONUS * Math.max(0, strength - hardness) / strength;
}

/**
 * The ore the next canister holds: whichever is furthest behind its share
 * of the rock as it was, so canisters follow the rock's mix from the
 * first one (ties by id).
 */
function nextOre(contents: Readonly<Record<string, number>>, mined: Readonly<Record<string, number>>): string {
  const ids = Object.keys(contents).filter((id) => contents[id]! > 0).sort();
  const original = (id: string): number => (contents[id] ?? 0) + (mined[id] ?? 0);
  const whole = Object.keys({ ...contents, ...mined }).reduce((n, id) => n + original(id), 0);
  const taken = Object.values(mined).reduce((n, q) => n + q, 0) + CANISTER_UNITS;
  let best = ids[0]!;
  let owed = -Infinity;
  for (const id of ids) {
    const due = (original(id) / whole) * taken - (mined[id] ?? 0);
    if (due > owed) {
      owed = due;
      best = id;
    }
  }
  return best;
}

/**
 * A survey pulse from `ship`, if its scanner can pay and has cycled.
 * Returns the ship with the pulse paid for and its findings recorded,
 * and the event to report.
 */
export function surveyPulse(
  ship: Ship,
  stats: Pick<ShipStats, 'surveyRange' | 'surveyCost' | 'surveyGrade'>,
  asteroids: readonly Asteroid[],
  rockAt: readonly { position: Vec2 }[],
  goods: Readonly<Record<string, GoodSpec>>,
  tick: number,
  dt: number,
): { ship: Ship; event: WorldEvent } {
  if (stats.surveyRange <= 0 || ship.state !== 'flying') return { ship, event: { type: 'surveyRefused', shipId: ship.id, reason: 'cycling' } };
  if (ship.survey && tick - ship.survey.tick < Math.round(SURVEY_CYCLE_SECONDS / dt)) return { ship, event: { type: 'surveyRefused', shipId: ship.id, reason: 'cycling' } };
  if (ship.capacitor < stats.surveyCost) return { ship, event: { type: 'surveyRefused', shipId: ship.id, reason: 'capacitor' } };

  const rocks: SurveyResult['rocks'] = [];
  asteroids.forEach((rock, i) => {
    if (distance(ship.position, rockAt[i]!.position) - rock.radius > stats.surveyRange) return;
    const tier = bestTier(rock, goods) ?? 'common';
    rocks.push({ id: rock.id, reading: stats.surveyGrade >= 2 ? tier : tier === 'common' ? 'common' : 'rich' });
  });
  const survey: SurveyResult = { tick, origin: ship.position, range: stats.surveyRange, rocks };
  return {
    ship: { ...ship, capacitor: ship.capacitor - stats.surveyCost, survey },
    event: { type: 'surveyed', shipId: ship.id, found: rocks.filter((r) => r.reading !== 'common').length },
  };
}
