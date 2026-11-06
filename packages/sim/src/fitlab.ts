import { duellistInput, fightInput } from './ai/fight.js';
import { buildShip } from './factory.js';
import { mountRefusal, type FitRefusal } from './fitting.js';
import { fitStats, type Catalogues } from './stats.js';
import { stepWorld } from './step.js';
import type { DamageType, Loadout, RunState, ShipInput, ShipStats, World } from './types.js';
import { weaponDps } from './weapons.js';
import { createStarterWorld } from './world.js';
import { distance, fromAngle, scale, add } from './vec2.js';

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
      w = stepWorld(w, { a: duellistInput(w, 'a', 'b', t), b: duellistInput(w, 'b', 'a', t) });
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

/** One skirmish's outcome: which side was left, and how much of each side. */
export interface SkirmishRun {
  winner: 'a' | 'b' | null;
  seconds: number;
  /** Shield plus structure left across the side, as a share of its full. */
  aLeft: number;
  bLeft: number;
  /** Ships each side lost. */
  aLost: number;
  bLost: number;
  /** Per ship: gun shots fired, and the damage its shots, munitions and rams did. */
  fired: Record<string, number>;
  dealt: Record<string, number>;
}

export interface SkirmishResult {
  runs: SkirmishRun[];
  winsA: number;
  winsB: number;
  draws: number;
}


/**
 * Side against side (Jason: a big ship should win one against one, a
 * swarm of small ships should overwhelm it). Each ship takes the nearest
 * enemy as its target; a ship much smaller than its target makes attack
 * passes with the pirates' own `attackRun`, others fly the duellist's
 * script. Sides start `distance` apart, spread along their line, from
 * `starts` bearings. Deterministic.
 */
export function skirmish(sideA: FitSpec[], sideB: FitSpec[], options: { starts?: number; distance?: number; seconds?: number } = {}): SkirmishResult {
  const starts = options.starts ?? 4;
  const apart = options.distance ?? 1400;
  const seconds = options.seconds ?? 180;
  const base: World = { ...createStarterWorld(), ships: {}, npcs: {}, spawners: [], asteroids: [], loot: [], rockfall: { made: 0, timerTicks: 1e12 } };
  const centre = { x: 0, y: -40000 };
  const runs: SkirmishRun[] = [];
  for (let k = 0; k < starts; k++) {
    const bearing = (k / starts) * Math.PI * 2;
    const across = fromAngle(bearing + Math.PI / 2);
    const place = (side: FitSpec[], prefix: 'a' | 'b', sign: number, facing: number) =>
      side.map((spec, i) => {
        const offset = (i - (side.length - 1) / 2) * 160;
        const at = add(add(centre, scale(fromAngle(bearing), (sign * apart) / 2)), scale(across, offset));
        return build(base, spec, `${prefix}${i}`, at, facing + 0.2 * ((i + k) % 3 - 1));
      });
    const ships = [...place(sideA, 'a', 1, bearing + Math.PI), ...place(sideB, 'b', -1, bearing)];
    let w: World = { ...base, ships: Object.fromEntries(ships.map((sh) => [sh.id, sh])) };
    const full = (prefix: string) => ships.filter((sh) => sh.id.startsWith(prefix)).reduce((n, sh) => n + sh.shield + sh.structure, 0);
    const fullA = full('a');
    const fullB = full('b');
    const runState: Record<string, RunState | undefined> = {};
    const alive = (prefix: string) => Object.values(w.ships).filter((sh) => sh.id.startsWith(prefix));
    const limit = Math.round(seconds / w.dt);
    const fired: Record<string, number> = {};
    const dealt: Record<string, number> = {};
    const seen = new Set<string>();
    let t = 0;
    for (; t < limit; t++) {
      if (alive('a').length === 0 || alive('b').length === 0) break;
      for (const p of w.projectiles) if (!seen.has(p.id)) { seen.add(p.id); fired[p.ownerShipId] = (fired[p.ownerShipId] ?? 0) + 1; }
      for (const e of w.events) if (e.type === 'damaged' && e.by) dealt[e.by] = (dealt[e.by] ?? 0) + e.amount;
      const inputs: Record<string, ShipInput> = {};
      for (const me of Object.values(w.ships)) {
        const foes = alive(me.id.startsWith('a') ? 'b' : 'a');
        const foe = foes.reduce((best, f) => (distance(f.position, me.position) < distance(best.position, me.position) ? f : best), foes[0]!);
        const plan = fightInput(w, me.id, foe.id, t, runState[me.id]);
        runState[me.id] = plan.state;
        inputs[me.id] = plan.input;
      }
      w = stepWorld(w, inputs);
    }
    const left = (prefix: string, whole: number) => alive(prefix).reduce((n, sh) => n + sh.shield + sh.structure, 0) / whole;
    const aAlive = alive('a').length;
    const bAlive = alive('b').length;
    const winner = aAlive === 0 && bAlive > 0 ? 'b' : bAlive === 0 && aAlive > 0 ? 'a' : null;
    runs.push({ winner, seconds: t * w.dt, aLeft: left('a', fullA), bLeft: left('b', fullB), aLost: sideA.length - aAlive, bLost: sideB.length - bAlive, fired, dealt });
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
  return { ...ship, hold: ammunitionHold(world, ship.hullId, ship.fit), weaponsHot: true };
}

/**
 * A hold full of ammunition for a fit, as a pilot would load it for a
 * fight: the cargo space shared between the guns and launchers by how
 * many of each there are, whole boxes, at least one each.
 */
export function ammunitionHold(cat: Catalogues, hullId: string, fit: Record<string, string>): Record<string, number> {
  const stats = fitStats(cat, cat.hulls[hullId]!, fit);
  const wanted: Record<string, number> = {};
  for (const w of Object.values(stats.weapons)) {
    if (!w.ammo) continue;
    const good = Object.values(cat.goods).find((g) => g.ammo?.fits === w.ammo);
    if (good) wanted[good.id] = (wanted[good.id] ?? 0) + 1;
  }
  const shares = Object.values(wanted).reduce((n, k) => n + k, 0);
  const hold: Record<string, number> = {};
  for (const [good, k] of Object.entries(wanted)) hold[good] = Math.max(1, Math.floor((stats.cargoCapacity * k) / shares));
  return hold;
}

