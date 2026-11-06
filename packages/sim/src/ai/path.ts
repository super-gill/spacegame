import type { Vec2 } from '../vec2.js';
import { distance } from '../vec2.js';

/**
 * Pathfinding for small craft among rocks (drones first; docs/drones.md).
 *
 * A* on a grid laid over the box round the start and the goal, with every
 * obstacle grown by the craft's radius and a margin, then pulled tight so
 * the path is a few straight legs rather than a staircase. Cheap enough to
 * run for each drone once a second. Obstacles are circles: rocks, a
 * mother's hull. Moving ships are left to steering.
 */

export interface Circle {
  position: Vec2;
  radius: number;
}

/** Grid cell size, units. */
const CELL = 14;
/** The search box reaches this far beyond the start and goal, units. */
const BOX_MARGIN = 260;
/** Inside an obstacle's grown edge, a leg may dip this much closer, units (rounding, and the curve of a tangent). */
const INSIDE_SLACK = 0.5;
/** Give up after expanding this many cells: the goal is walled off or very far. */
const MAX_EXPANSIONS = 6000;

/**
 * Waypoints from `start` to `goal` (the goal last) that keep `clearance`
 * units from every obstacle's edge, or null if there is no way within the
 * box. A start or goal inside an obstacle's grown edge is allowed, so a
 * craft that has drifted close can still leave: that obstacle's edge is
 * drawn just inside where the craft (or its goal) is, so the way out is
 * open but the way through is not; never closer than half the clearance
 * (closer than that, null, and the craft backs off first: `navigate`).
 */
export function findPath(start: Vec2, goal: Vec2, obstacles: readonly Circle[], clearance: number): Vec2[] | null {
  if (clear(start, goal, obstacles, clearance)) return [goal];
  obstacles = obstacles.map((o) => {
    const room = Math.min(distance(start, o.position), distance(goal, o.position)) - CELL;
    if (room >= o.radius + clearance) return o;
    return { position: o.position, radius: Math.max(o.radius - clearance / 2, room - clearance) };
  });

  const minX = Math.min(start.x, goal.x) - BOX_MARGIN;
  const minY = Math.min(start.y, goal.y) - BOX_MARGIN;
  const cols = Math.ceil((Math.max(start.x, goal.x) + BOX_MARGIN - minX) / CELL) + 1;
  const rows = Math.ceil((Math.max(start.y, goal.y) + BOX_MARGIN - minY) / CELL) + 1;
  const near = obstacles.filter(
    (o) => o.position.x + o.radius + clearance >= minX && o.position.y + o.radius + clearance >= minY && o.position.x - o.radius - clearance <= minX + cols * CELL && o.position.y - o.radius - clearance <= minY + rows * CELL,
  );
  const centre = (c: number, r: number): Vec2 => ({ x: minX + c * CELL, y: minY + r * CELL });
  const cellOf = (p: Vec2): [number, number] => [Math.round((p.x - minX) / CELL), Math.round((p.y - minY) / CELL)];
  const blocked = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p = centre(c, r);
      for (const o of near) {
        if (distance(p, o.position) < o.radius + clearance) {
          blocked[r * cols + c] = 1;
          break;
        }
      }
    }
  }
  const [sc, sr] = cellOf(start);
  const [gc, gr] = cellOf(goal);
  const startIdx = sr * cols + sc;
  const goalIdx = gr * cols + gc;
  blocked[startIdx] = 0;
  blocked[goalIdx] = 0;

  // A*, 8-connected, octile distance.
  const g = new Float64Array(cols * rows).fill(Infinity);
  const from = new Int32Array(cols * rows).fill(-1);
  const closed = new Uint8Array(cols * rows);
  const open: number[] = [startIdx];
  const f = new Float64Array(cols * rows).fill(Infinity);
  const h = (i: number): number => {
    const dx = Math.abs((i % cols) - gc);
    const dy = Math.abs(Math.floor(i / cols) - gr);
    return (Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy)) * CELL;
  };
  g[startIdx] = 0;
  f[startIdx] = h(startIdx);
  let expansions = 0;
  while (open.length > 0 && expansions < MAX_EXPANSIONS) {
    // Smallest f; ties by index, so the result never depends on anything else.
    let best = 0;
    for (let k = 1; k < open.length; k++) {
      const a = open[k]!;
      const b = open[best]!;
      if (f[a]! < f[b]! || (f[a] === f[b] && a < b)) best = k;
    }
    const cur = open[best]!;
    open.splice(best, 1);
    if (cur === goalIdx) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    expansions++;
    const cx = cur % cols;
    const cy = Math.floor(cur / cols);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const n = ny * cols + nx;
        if (blocked[n] || closed[n]) continue;
        // No cutting a corner between two blocked cells.
        if (dx !== 0 && dy !== 0 && (blocked[cy * cols + nx] || blocked[ny * cols + cx])) continue;
        const step = dx !== 0 && dy !== 0 ? CELL * Math.SQRT2 : CELL;
        const tentative = g[cur]! + step;
        if (tentative < g[n]!) {
          g[n] = tentative;
          f[n] = tentative + h(n);
          from[n] = cur;
          open.push(n);
        }
      }
    }
  }
  if (from[goalIdx] === -1) return null;

  // Back from the goal, then pull the path tight.
  const cells: Vec2[] = [];
  for (let i = goalIdx; i !== startIdx && i !== -1; i = from[i]!) cells.push(centre(i % cols, Math.floor(i / cols)));
  cells.reverse();
  cells[cells.length - 1] = goal;
  const out: Vec2[] = [];
  let at = start;
  let i = 0;
  while (i < cells.length) {
    let j = cells.length - 1;
    while (j > i && !clear(at, cells[j]!, near, clearance)) j--;
    out.push(cells[j]!);
    at = cells[j]!;
    i = j + 1;
  }
  return out;
}

/**
 * True if the straight leg from `a` to `b` keeps `clearance` from every
 * obstacle. From inside an obstacle's grown edge, a leg may lead out or
 * skirt it but never come any closer: it used to ignore that obstacle
 * altogether, so a drone pressed against a rock planned straight through
 * it and rubbed along its face (Jason, 5 November 2026).
 */
export function clear(a: Vec2, b: Vec2, obstacles: readonly Circle[], clearance: number): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  for (const o of obstacles) {
    const reach = Math.min(o.radius + clearance, distance(a, o.position) - INSIDE_SLACK);
    const t = len2 > 0 ? Math.max(0, Math.min(1, ((o.position.x - a.x) * dx + (o.position.y - a.y) * dy) / len2)) : 0;
    const px = a.x + dx * t - o.position.x;
    const py = a.y + dy * t - o.position.y;
    if (px * px + py * py < reach * reach) return false;
  }
  return true;
}
