/** Angle helpers. All angles are radians. */

export const TAU = Math.PI * 2;

/** Wrap an angle into (-PI, PI]. */
export function wrapAngle(a: number): number {
  let r = a % TAU;
  if (r <= -Math.PI) r += TAU;
  if (r > Math.PI) r -= TAU;
  return r;
}

/** Shortest signed difference `to - from`, in (-PI, PI]. */
export function angleDelta(from: number, to: number): number {
  return wrapAngle(to - from);
}

/**
 * Turn `current` towards `target` by at most `maxStep` radians.
 * Takes the shortest way round.
 */
export function turnTowards(current: number, target: number, maxStep: number): number {
  const delta = angleDelta(current, target);
  if (Math.abs(delta) <= maxStep) return wrapAngle(target);
  return wrapAngle(current + Math.sign(delta) * maxStep);
}
