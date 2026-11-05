import { angleDelta } from './angle.js';
import { leadPoint } from './combat.js';
import { buildShip } from './factory.js';
import { mountRefusal, type FitRefusal } from './fitting.js';
import { fitStats, type Catalogues } from './stats.js';
import { stepWorld } from './step.js';
import type { DamageType, Loadout, ShipInput, ShipStats, World } from './types.js';
import { weaponDps } from './weapons.js';
import { createStarterWorld, emptyInput } from './world.js';
import { distance, fromAngle, scale, sub, toAngle, add } from './vec2.js';

/**
 * The fitting lab (docs/fitting.md, "The fitter"): what a fit is worth,
 * worked out by the same code the game runs. Used by the fitter page, the
 * audit (`npm run audit`) and tests, so none of them can drift from the
 * game.
 *
 * - `fitProblems`: why a fit could not be fitted for real (a module in the
 *   wrong mount, too big, missing a service; not enough power).
 * - `fitSummary`: the numbers a pilot compares: budgets, flight, defence,
 *   damage, sensors, holds, mining.
 * - `duel`: two fits flown at each other by a simple scripted pilot, from
 *   several starting positions, in empty space.
 */

/** A named fit: a hull and what is on each mount. Plain data, saved as JSON. */
export interface FitSpec {
  name: string;
  hullId: string;
  fit: Record<string, string>;
  /** What it is for: 'combat', 'mining', 'hauling', or anything else. */
  role?: string;
  note?: string;
}

export interface FitProblem {
  mountId: string | null;
  moduleId: string | null;
  reason: FitRefusal | 'unknownModule' | 'unknownMount';
}

/** Why this fit could not be fitted for real; empty if it could. */
export function fitProblems(cat: Catalogues, spec: FitSpec): FitProblem[] {
  const hull = cat.hulls[spec.hullId];
  if (!hull) return [{ mountId: null, moduleId: null, reason: 'unknownMount' }];
  const problems: FitProblem[] = [];
  for (const [mountId, moduleId] of Object.entries(spec.fit)) {
    const mount = hull.mounts.find((m) => m.id === mountId);
    const module = cat.modules[moduleId];
    if (!mount) problems.push({ mountId, moduleId, reason: 'unknownMount' });
    else if (!module) problems.push({ mountId, moduleId, reason: 'unknownModule' });
    else {
      const refusal = mountRefusal(mount, module);
      if (refusal) problems.push({ mountId, moduleId, reason: refusal });
    }
  }
  const stats = fitStats(cat, hull, spec.fit);
  if (stats.powerDraw > stats.powerOutput + 1e-9) problems.push({ mountId: null, moduleId: null, reason: 'power' });
  return problems;
}

/** The numbers a pilot compares fits by. */
export interface FitSummary {
  price: number;
  powerDraw: number;
  powerOutput: number;
  mass: number;
  topSpeed: number;
  /** Units/s² with the main engine, empty hold. */
  acceleration: number;
  /** Radians/s² of spin, and the hull's turn-rate cap. */
  spinUp: number;
  turnRate: number;
  capacitor: number;
  capacitorRecharge: number;
  /** Capacitor per second if every energy weapon fired continuously, plus full-size sensor draw. */
  capacitorUse: number;
  shield: number;
  shieldRegen: number;
  structure: number;
  /** Damage per second of everything that shoots, total and by type (ammunition-fed guns count at their base damage). */
  dps: number;
  dpsByType: Partial<Record<DamageType, number>>;
  /** Longest weapon range. */
  range: number;
  signature: number;
  sensorRange: number;
  maxLocks: number;
  cargo: number;
  oreHold: number;
  /** Ore a second from every mining laser at a soft rock, drones not counted. */
  miningRate: number;
  drones: number;
  stats: ShipStats;
}

export function fitSummary(cat: Catalogues, spec: FitSpec): FitSummary | null {
  const hull = cat.hulls[spec.hullId];
  if (!hull) return null;
  const stats = fitStats(cat, hull, spec.fit);
  let dps = 0;
  let miningRate = 0;
  let range = 0;
  let energy = 0;
  const dpsByType: Partial<Record<DamageType, number>> = {};
  for (const w of Object.values(stats.weapons)) {
    if (w.family === 'mining') {
      miningRate += w.damage;
      continue;
    }
    if (w.family === 'countermeasure') continue;
    const d = weaponDps(w);
    dps += d;
    dpsByType[w.damageType] = (dpsByType[w.damageType] ?? 0) + d;
    range = Math.max(range, w.range);
    energy += w.capacitorPerShot / w.fireInterval;
  }
  const price = hull.price + Object.values(spec.fit).reduce((n, id) => n + (cat.modules[id]?.price ?? 0), 0);
  return {
    price,
    powerDraw: stats.powerDraw,
    powerOutput: stats.powerOutput,
    mass: stats.mass,
    topSpeed: stats.maxSpeed,
    acceleration: stats.mass > 0 ? stats.mainThrust / stats.mass : 0,
    spinUp: stats.mass > 0 ? stats.rotationThrust / stats.mass : 0,
    turnRate: stats.maxTurnRate,
    capacitor: stats.capacitor,
    capacitorRecharge: stats.capacitorRecharge,
    capacitorUse: energy + stats.capacitorDraw,
    shield: stats.shield,
    shieldRegen: stats.shieldRegen,
    structure: stats.structure,
    dps,
    dpsByType,
    range,
    signature: stats.signature,
    sensorRange: stats.sensorRange,
    maxLocks: stats.maxLocks,
    cargo: stats.cargoCapacity,
    oreHold: stats.oreCapacity,
    miningRate,
    drones: stats.droneCapacity,
    stats,
  };
}

/** One duel's outcome. */
export interface DuelRun {
  winner: 'a' | 'b' | null;
  seconds: number;
  /** Shield plus structure left, as a share of each ship's full. */
  aLeft: number;
  bLeft: number;
}

export interface DuelResult {
  runs: DuelRun[];
  winsA: number;
  winsB: number;
  draws: number;
}

/** How a scripted duellist flies: closes to `preferred` of its longest gun's range (launchers aside), keeps its nose on the lead point, fires when on aim. */
const DUELLIST = { preferred: 0.6, aimTolerance: 0.08, tooClose: 0.3 };

/**
 * Fly two fits at each other in empty space, from `starts` bearings at
 * `distance` units apart, for up to `seconds` each. Both pilots fly the
 * same simple script, so the fits are what differ. Deterministic.
 */
export function duel(a: FitSpec, b: FitSpec, options: { starts?: number; distance?: number; seconds?: number } = {}): DuelResult {
  const starts = options.starts ?? 4;
  const apart = options.distance ?? 1200;
  const seconds = options.seconds ?? 120;
  const base: World = { ...createStarterWorld(), ships: {}, npcs: {}, spawners: [], asteroids: [], loot: [], rockfall: { made: 0, timerTicks: 1e12 } };
  // Far from every station and body.
  const centre = { x: 0, y: -40000 };
  const runs: DuelRun[] = [];
  for (let k = 0; k < starts; k++) {
    const bearing = (k / starts) * Math.PI * 2;
    const pa = add(centre, scale(fromAngle(bearing), apart / 2));
    const pb = add(centre, scale(fromAngle(bearing + Math.PI), apart / 2));
    // Each starts a little off the line, so the runs differ.
    const ships = {
      a: { ...build(base, a, 'a', pa, bearing + Math.PI + 0.3 * (k % 2 ? 1 : -1)) },
      b: { ...build(base, b, 'b', pb, bearing - 0.2 * (k % 3 - 1)) },
    };
    let w: World = { ...base, ships };
    const full = { a: ships.a.shield + ships.a.structure, b: ships.b.shield + ships.b.structure };
    let t = 0;
    const limit = Math.round(seconds / w.dt);
    for (; t < limit; t++) {
      if (!w.ships['a'] || !w.ships['b']) break;
      w = stepWorld(w, { a: pilot(w, 'a', 'b', t), b: pilot(w, 'b', 'a', t) });
    }
    const left = (id: 'a' | 'b'): number => {
      const s = w.ships[id];
      return s ? (s.shield + s.structure) / full[id] : 0;
    };
    const winner = !w.ships['a'] && w.ships['b'] ? 'b' : !w.ships['b'] && w.ships['a'] ? 'a' : null;
    runs.push({ winner, seconds: t * w.dt, aLeft: left('a'), bLeft: left('b') });
  }
  return {
    runs,
    winsA: runs.filter((r) => r.winner === 'a').length,
    winsB: runs.filter((r) => r.winner === 'b').length,
    draws: runs.filter((r) => r.winner === null).length,
  };
}

/** A ship for a duel: the fit, ammunition for every gun and launcher, weapons hot. */
function build(world: World, spec: FitSpec, id: string, position: { x: number; y: number }, heading: number) {
  const loadout: Loadout = { id: spec.name, name: spec.name, hullId: spec.hullId, fit: spec.fit };
  const ship = buildShip(world, { id, loadout, ownerId: null, position, heading, flightMode: 'assisted' });
  const hold: Record<string, number> = {};
  const stats = fitStats(world, world.hulls[spec.hullId]!, ship.fit);
  for (const w of Object.values(stats.weapons)) {
    if (!w.ammo) continue;
    const good = Object.values(world.goods).find((g) => g.ammo?.fits === w.ammo);
    if (good) hold[good.id] = (hold[good.id] ?? 0) + 4;
  }
  return { ...ship, hold, weaponsHot: true };
}

/** The scripted duellist's input this tick. */
function pilot(w: World, me: string, foe: string, tick: number): ShipInput {
  const mine = w.ships[me]!;
  const them = w.ships[foe]!;
  const stats = fitStats(w, w.hulls[mine.hullId]!, mine.fit);
  const guns = Object.values(stats.weapons).filter((x) => x.family !== 'mining' && x.family !== 'countermeasure');
  const fixed = guns.filter((x) => x.kind === 'fixed');
  // Close to gun range, not launcher range: a launcher's few missiles are
  // gone in a minute, and a ship that holds off at missile range with
  // guns aboard never fires them. A launcher-only fit stands off.
  const direct = guns.filter((x) => x.family !== 'missile');
  const longest = Math.max(1, ...(direct.length > 0 ? direct : guns).map((x) => x.range));
  const lead = fixed[0] ? leadPoint(mine, them, fixed[0].projectileSpeed || 1e6) : them.position;
  const want = toAngle(sub(lead, mine.position));
  const err = Math.abs(angleDelta(mine.heading, want));
  const d = distance(mine.position, them.position);
  // Fire groups take turns, two seconds each, so launchers get used as well as guns.
  const groups = [...new Set(mine.weapons.filter((s) => fixed.includes(stats.weapons[s.mountId]!)).map((s) => s.group))].sort();
  const group = groups.length > 0 ? groups[Math.floor(tick / 120) % groups.length]! : null;
  return {
    ...emptyInput(),
    aimHeading: want,
    thrustForward: d > longest * DUELLIST.preferred && err < 0.5,
    thrustReverse: d < longest * DUELLIST.tooClose,
    fireFixed: err < DUELLIST.aimTolerance && d < Math.max(longest, ...guns.map((x) => x.range)) * 0.95,
    lock: tick === 0 ? foe : null,
    activateLock: tick === 0 ? foe : null,
    selectGroup: group !== null && group !== mine.fireGroup ? group : null,
  };
}
