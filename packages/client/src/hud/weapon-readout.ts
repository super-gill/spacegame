/**
 * Pure readings for the weapon tiles and the capacitor gauge: what a gun
 * runs on and whether it can fire, and which way its swivel can reach.
 * No DOM here, so it is tested on its own.
 */

import type { GoodSpec, MountPoint, WeaponSpec, WeaponState } from '@spacegame/sim';

/** How a gun's supply reads: fine, running low, reloading, or unable to fire. */
export type SupplyTone = 'ok' | 'low' | 'reload' | 'dry' | 'starved';

export interface GunSupply {
  /** Short text for the tile: `32 +60`, `RELOAD`, `DRY`, `24 SHOTS`, `NO CAP`. */
  text: string;
  /** Bar fill, 0 to 1: magazine, reload progress or capacitor. */
  fill: number;
  tone: SupplyTone;
}

/** Shots left below which an energy gun reads low. */
const LOW_SHOTS = 5;
/** Magazine fraction below which an ammunition gun with nothing spare reads low. */
const LOW_MAGAZINE = 0.25;

/**
 * What a gun runs on, from its spec and live state (docs/weapons.md):
 * rounds loaded and spare rounds in the hold for ammunition guns, shots
 * the capacitor can pay for for energy guns. A hybrid gun needs both, so
 * an empty capacitor starves it whatever is loaded.
 *
 * `boxes` is how many of the gun's ammunition good are in the hold;
 * `round` is that good's spec; `dt` is the tick length.
 */
export function gunSupply(
  spec: WeaponSpec,
  state: Pick<WeaponState, 'loaded' | 'reloadTicks'>,
  boxes: number,
  round: GoodSpec | undefined,
  capacitor: number,
  capacitorMax: number,
  dt: number,
): GunSupply {
  const needsCap = spec.capacitorPerShot > 0;
  const starved = needsCap && capacitor < spec.capacitorPerShot;
  if (spec.ammo) {
    if (state.reloadTicks > 0) {
      const total = Math.max(1, Math.round(spec.reloadSeconds / dt));
      return { text: 'RELOAD', fill: clamp01(1 - state.reloadTicks / total), tone: 'reload' };
    }
    const spare = boxes * (round?.ammo?.perUnit ?? 1);
    const fill = spec.magazine > 0 ? clamp01(state.loaded / spec.magazine) : 0;
    if (state.loaded === 0 && spare === 0) return { text: 'DRY', fill: 0, tone: 'dry' };
    if (starved) return { text: 'NO CAP', fill, tone: 'starved' };
    const low = spare === 0 && fill < LOW_MAGAZINE;
    return { text: `${state.loaded} +${spare}`, fill, tone: low ? 'low' : 'ok' };
  }
  if (needsCap) {
    const shots = Math.floor(capacitor / spec.capacitorPerShot);
    const fill = capacitorMax > 0 ? clamp01(capacitor / capacitorMax) : 0;
    if (shots < 1) return { text: 'NO CAP', fill, tone: 'starved' };
    return { text: `${shots} SHOTS`, fill, tone: shots < LOW_SHOTS ? 'low' : 'ok' };
  }
  return { text: '', fill: 1, tone: 'ok' };
}

/** The gun's type in a word for its tile: AUTOCANNON, PULSE, SWIVEL. */
export function gunWord(spec: WeaponSpec): string {
  if (spec.kind === 'turret') return 'SWIVEL';
  const stem = spec.id.replace(/-(s|m|l|xl)$/, '');
  return GUN_WORDS[stem] ?? 'FIXED';
}

const GUN_WORDS: Record<string, string> = {
  autocannon: 'AUTOCANNON',
  artillery: 'ARTILLERY',
  'pulse-laser': 'PULSE',
  'beam-laser': 'BEAM',
  blaster: 'BLASTER',
  railgun: 'RAILGUN',
};

/** How the capacitor reads: plenty, low (caution) or empty (alarm). */
export type CapacitorTone = 'ok' | 'low' | 'empty';

/** Fraction of the pool below which the gauge turns to caution. */
export const CAPACITOR_LOW = 0.25;

/**
 * The capacitor's tone. Empty means below what the hungriest fitted gun
 * spends on a shot (or under 2% with no capacitor guns), so the gauge
 * turns red exactly when a gun stops firing.
 */
export function capacitorTone(level: number, max: number, hungriestShot: number): CapacitorTone {
  if (max <= 0) return 'empty';
  if (level < Math.max(hungriestShot, max * 0.02)) return 'empty';
  if (level / max < CAPACITOR_LOW) return 'low';
  return 'ok';
}

/** Lit segments of a gauge of `count` segments at fraction `f`: any charge lights the first. */
export function litSegments(f: number, count: number): number {
  if (f <= 0) return 0;
  return Math.min(count, Math.max(1, Math.round(f * count)));
}

/**
 * Whether a mount's swivel can reach a bearing, both relative to the
 * nose, radians. Mirrors the sim's `withinArc` for hull-space bearings.
 */
export function arcCovers(mount: Pick<MountPoint, 'facing' | 'arc'>, relBearing: number): boolean {
  if (mount.arc === undefined || mount.arc >= Math.PI * 2 - 1e-9) return true;
  return Math.abs(wrap(relBearing - mount.facing)) <= mount.arc / 2 + 1e-9;
}

export interface Coverage {
  /** Degrees of the full circle at least one swivel can reach. */
  degrees: number;
  /** The blind sectors in words, largest first: `astern`, `port beam`. Empty when covered all round. */
  blind: string[];
}

/**
 * Swivel coverage round the hull from the mounts given (those carrying a
 * swivel), sampled every degree. 0 is the nose; positive bearings run
 * clockwise on screen, to starboard.
 */
export function swivelCoverage(mounts: readonly Pick<MountPoint, 'facing' | 'arc'>[]): Coverage {
  const covered: boolean[] = [];
  for (let d = 0; d < 360; d++) {
    // Sample the middle of each degree, so an arc's edges do not count twice.
    const rel = ((d + 0.5) * Math.PI) / 180;
    covered.push(mounts.some((m) => arcCovers(m, rel)));
  }
  const degrees = covered.filter(Boolean).length;
  if (degrees === 0 || degrees === 360) return { degrees, blind: [] };
  // Walk the blind runs, starting just after a covered degree so none is split.
  const start = covered.indexOf(true);
  const gaps: { from: number; length: number }[] = [];
  let run: { from: number; length: number } | null = null;
  for (let i = 1; i <= 360; i++) {
    const d = (start + i) % 360;
    if (!covered[d]) {
      if (run) run.length++;
      else run = { from: d, length: 1 };
    } else if (run) {
      gaps.push(run);
      run = null;
    }
  }
  gaps.sort((a, b) => b.length - a.length);
  return { degrees, blind: gaps.map((g) => bearingWords(((g.from + g.length / 2) * Math.PI) / 180)) };
}

/** A bearing relative to the nose in sailors' words: ahead, starboard bow, port beam, astern. */
export function bearingWords(rel: number): string {
  const deg = (wrap(rel) * 180) / Math.PI;
  const a = Math.abs(deg);
  if (a <= 22.5) return 'ahead';
  if (a >= 157.5) return 'astern';
  const side = deg > 0 ? 'starboard' : 'port';
  if (a < 67.5) return `${side} bow`;
  if (a <= 112.5) return `${side} beam`;
  return `${side} quarter`;
}

function wrap(a: number): number {
  let x = a % (Math.PI * 2);
  if (x > Math.PI) x -= Math.PI * 2;
  if (x < -Math.PI) x += Math.PI * 2;
  return x;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
