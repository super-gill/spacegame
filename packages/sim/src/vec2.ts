/**
 * Minimal 2D vector helpers.
 *
 * Vectors are plain `{ x, y }` objects so world state stays serialisable
 * (save games are just JSON). Every function here returns a new object and
 * never mutates its inputs.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export function vec2(x: number, y: number): Vec2 {
  return { x, y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function length(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Unit vector in the same direction, or zero if the input is zero. */
export function normalise(v: Vec2): Vec2 {
  const len = length(v);
  return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
}

/** Unit vector pointing along `angle` (radians, 0 = +x, increasing anticlockwise in maths terms). */
export function fromAngle(angle: number): Vec2 {
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

/** Angle of the vector in radians, in the range (-PI, PI]. */
export function toAngle(v: Vec2): number {
  return Math.atan2(v.y, v.x);
}

/** Rotate a vector by `angle` radians. */
export function rotate(v: Vec2, angle: number): Vec2 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}
