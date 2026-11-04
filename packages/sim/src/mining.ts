import { bestTier, oreLeft } from './asteroids.js';
import { segmentHitsCircle, type BeamShot } from './combat.js';
import { LOOT_LIFETIME } from './constants.js';
import type { Asteroid, GoodSpec, Loot, MiningBeam, Ship, ShipStats, SurveyResult, WorldEvent } from './types.js';
import { add, distance, fromAngle, scale, type Vec2 } from './vec2.js';

/**
 * Mining, part 1 (docs/mining.md): surveying the belt and cutting ore.
 *
 * - A survey scanner pulses from its tile: rocks in reach are reported
 *   by what they hold, as well as the scanner can tell, and the HUD
 *   lights them for a few seconds (`Ship.survey`).
 * - A mining laser runs along the nose while its group fires. It cuts
 *   the first rock it reaches if the rock is no harder than the laser is
 *   strong, freeing ore in canisters of loot that the tractor scoops. A
 *   rock with nothing left crumbles away.
 */

/** Ore in one canister, units. A rock's last canister holds whatever is left. */
export const CANISTER_UNITS = 5;
/** Freed ore drifts off the rock towards the laser at this speed, units/s. */
const ORE_DRIFT_SPEED = 14;
/** Seconds a survey scanner takes to cycle between pulses. */
export const SURVEY_CYCLE_SECONDS = 5;
/** Seconds the HUD keeps a survey's findings lit. */
export const SURVEY_SHOW_SECONDS = 8;

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

    const record = (rockId: string | null, cutting: boolean): void => {
      (drawn[beam.shipId] ??= []).push({ mountId: beam.mountId, bearing: beam.bearing, length: reach, rockId, cutting });
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
    record(rock.id, true);

    // Cut, and release whole canisters as they come free.
    let cut = (rock.cut ?? 0) + beam.yield;
    let contents = rock.contents;
    let left = oreLeft(rock);
    const point = add(beam.origin, scale(dir, reach));
    while (left > 0 && (cut >= CANISTER_UNITS || cut >= left)) {
      // The ore with most left comes out next (ties by id), so a rock gives up its ore in proportion.
      const [good] = Object.entries(contents)
        .filter(([, q]) => q > 0)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]!;
      const amount = Math.min(CANISTER_UNITS, contents[good]!);
      contents = { ...contents, [good]: contents[good]! - amount };
      if (contents[good] === 0) {
        const { [good]: _gone, ...rest } = contents;
        contents = rest;
      }
      cut -= amount;
      left -= amount;
      loot.push({
        id: `l${nextId + idsUsed++}`,
        item: good,
        amount,
        position: point,
        velocity: add(places[hit]!.velocity, scale(dir, -ORE_DRIFT_SPEED)),
        ticksLeft: Math.round(LOOT_LIFETIME / dt),
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
    rocks[hit] = cut > 0 ? { ...rest, contents, cut } : { ...rest, contents };
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
