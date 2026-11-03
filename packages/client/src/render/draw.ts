import type { HullSpec, Loot, Projectile, Ship, Station, Thrusters, Wreck } from '@spacegame/sim';
import type { Camera } from '../camera.js';

/**
 * Vector drawing of world objects. Everything is lines on a dark background.
 * Colours come from the CSS variables so the theme lives in one place.
 */

const COLOUR = {
  ink: '#9fd3c7',
  inkDim: '#4f7a72',
  inkBright: '#dffbf3',
  warn: '#e0a458',
  flame: '#e0a458',
  hostile: '#e06c5a',
  neutral: '#8fa8c8',
};

/** How a ship is drawn: outline colour and an optional label underneath. */
export interface ShipStyle {
  colour: string;
  label?: string;
}

/**
 * Hull outlines, in units of hull radius, nose pointing along +x.
 * Each hull gets a silhouette so ships are recognisable at a glance.
 * Unknown hulls fall back to the Sparrow's arrowhead.
 */
const HULL_OUTLINES: Record<string, ReadonlyArray<readonly [number, number]>> = {
  sparrow: [[1, 0], [-0.7, -0.65], [-0.4, 0], [-0.7, 0.65]],
  // Mule: a blunt box with a narrow bridge at the front.
  mule: [[0.9, -0.2], [0.9, 0.2], [0.5, 0.45], [-0.9, 0.45], [-0.9, -0.45], [0.5, -0.45]],
  // Jackal: a long thin dart with swept fins.
  jackal: [[1.2, 0], [-0.3, -0.25], [-0.8, -0.75], [-0.6, 0], [-0.8, 0.75], [-0.3, 0.25]],
};

export interface ShipView {
  position: { x: number; y: number };
  heading: number;
}

export function drawStation(ctx: CanvasRenderingContext2D, camera: Camera, station: Station, inRange: boolean): void {
  const c = camera.worldToScreen(station.position);
  const r = station.radius * camera.zoom;

  // Security zone edge: very faint, long dashes. Pirates will not hunt inside it.
  ctx.beginPath();
  ctx.arc(c.x, c.y, station.securityRadius * camera.zoom, 0, Math.PI * 2);
  ctx.strokeStyle = COLOUR.ink;
  ctx.globalAlpha = 0.12;
  ctx.setLineDash([24, 18]);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // Dock range ring: faint unless the player is inside it.
  ctx.beginPath();
  ctx.arc(c.x, c.y, station.dockRange * camera.zoom, 0, Math.PI * 2);
  ctx.strokeStyle = inRange ? COLOUR.ink : COLOUR.inkDim;
  ctx.setLineDash([6, 10]);
  ctx.lineWidth = 1;
  ctx.globalAlpha = inRange ? 0.8 : 0.3;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // Hull: outer ring, inner ring, six spokes.
  ctx.strokeStyle = COLOUR.ink;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(c.x, c.y, r * 0.45, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(c.x + Math.cos(a) * r * 0.45, c.y + Math.sin(a) * r * 0.45);
    ctx.lineTo(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r);
    ctx.stroke();
  }

  // Label.
  ctx.fillStyle = COLOUR.inkDim;
  ctx.font = '12px ui-monospace, Menlo, Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(station.name.toUpperCase(), c.x, c.y + r + 18);
}

export function drawShip(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  view: ShipView,
  hull: HullSpec,
  thrusters: Thrusters,
  docked: boolean,
  style: ShipStyle = { colour: COLOUR.inkBright },
): void {
  if (docked) return;
  const c = camera.worldToScreen(view.position);
  const s = hull.radius * camera.zoom;

  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(view.heading);

  // Flames are drawn from what actually fired this tick, so flight-assist
  // and brake burns show up as well as the pilot's own. Length scales
  // with throttle; a faint minimum keeps small assist burns visible.
  ctx.strokeStyle = COLOUR.flame;
  const len = (throttle: number): number => 0.25 + 0.75 * throttle;

  if (thrusters.main > 0) {
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-s * 0.7, -s * 0.35);
    ctx.lineTo(-s * (0.7 + 0.9 * len(thrusters.main)), 0);
    ctx.lineTo(-s * 0.7, s * 0.35);
    ctx.stroke();
  }
  if (thrusters.reverse > 0) {
    const l = 0.5 * len(thrusters.reverse);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s * 0.6, -s * 0.5);
    ctx.lineTo(s * (0.6 + l), -s * 0.55);
    ctx.moveTo(s * 0.6, s * 0.5);
    ctx.lineTo(s * (0.6 + l), s * 0.55);
    ctx.stroke();
  }
  // Lateral thrusters fire on the side opposite the push.
  for (const [throttle, side] of [
    [thrusters.strafeRight, -1],
    [thrusters.strafeLeft, 1],
  ] as const) {
    if (throttle <= 0) continue;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, side * s * 0.6);
    ctx.lineTo(-s * 0.2, side * s * (0.6 + 0.5 * len(throttle)));
    ctx.stroke();
  }
  // Rotation thrusters: a puff at the nose on the side opposite the turn.
  for (const [throttle, side] of [
    [thrusters.rotateRight, -1],
    [thrusters.rotateLeft, 1],
  ] as const) {
    if (throttle <= 0) continue;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s * 0.55, side * s * 0.2);
    ctx.lineTo(s * 0.55, side * s * (0.2 + 0.4 * len(throttle)));
    ctx.stroke();
  }

  // Hull outline.
  const outline = HULL_OUTLINES[hull.id] ?? HULL_OUTLINES['sparrow']!;
  ctx.strokeStyle = style.colour;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  outline.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * s, y * s) : ctx.lineTo(x * s, y * s)));
  ctx.closePath();
  ctx.stroke();

  ctx.restore();

  if (style.label) {
    ctx.fillStyle = style.colour;
    ctx.globalAlpha = 0.8;
    ctx.font = '11px ui-monospace, Menlo, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(style.label, c.x, c.y + s + 16);
    ctx.globalAlpha = 1;
  }
}

/** Short line from the ship showing where it is drifting. */
export function drawVelocityVector(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  ship: Ship,
  view: ShipView,
): void {
  if (ship.state === 'docked') return;
  const speed = Math.hypot(ship.velocity.x, ship.velocity.y);
  if (speed < 1) return;
  const c = camera.worldToScreen(view.position);
  const scale = 0.25 * camera.zoom;
  ctx.strokeStyle = COLOUR.inkDim;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  ctx.moveTo(c.x, c.y);
  ctx.lineTo(c.x + ship.velocity.x * scale, c.y + ship.velocity.y * scale);
  ctx.stroke();
  ctx.setLineDash([]);
}

export { COLOUR };

/**
 * Marker at the screen edge pointing at something off screen, with a
 * label and distance. Draws nothing if any part of the object (a circle
 * of `radius` world units) is on screen.
 */
export function drawOffscreenMarker(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  target: { x: number; y: number },
  label: string,
  distance: number,
  colour: string,
  radius = 0,
): void {
  const p = camera.worldToScreen(target);
  const w = camera.viewportWidth;
  const h = camera.viewportHeight;
  const margin = 28;
  // Any part of the object on screen counts as visible.
  const r = radius * camera.zoom;
  if (p.x >= -r && p.x <= w + r && p.y >= -r && p.y <= h + r) return;

  // Clamp the direction from screen centre onto an inset rectangle.
  const cx = w / 2;
  const cy = h / 2;
  const dx = p.x - cx;
  const dy = p.y - cy;
  const scale = Math.min((cx - margin) / Math.abs(dx || 1e-9), (cy - margin) / Math.abs(dy || 1e-9));
  const mx = cx + dx * scale;
  const my = cy + dy * scale;
  const angle = Math.atan2(dy, dx);

  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(angle);
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-4, -6);
  ctx.lineTo(-4, 6);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = colour;
  ctx.font = '11px ui-monospace, Menlo, Consolas, monospace';
  ctx.textAlign = mx > cx ? 'right' : 'left';
  const tx = mx + (mx > cx ? -14 : 14);
  const ty = my + (my > cy ? -10 : 18);
  ctx.fillText(`${label} ${Math.round(distance)}`, tx, ty);
}

/** A projectile: a short streak behind it along its velocity. */
export function drawProjectile(ctx: CanvasRenderingContext2D, camera: Camera, p: Projectile, colour: string): void {
  const head = camera.worldToScreen(p.position);
  const speed = Math.hypot(p.velocity.x, p.velocity.y) || 1;
  const tail = 10 * camera.zoom;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(head.x, head.y);
  ctx.lineTo(head.x - (p.velocity.x / speed) * tail, head.y - (p.velocity.y / speed) * tail);
  ctx.stroke();
}

/** A wreck: the hull outline broken into pieces, fading out over its lifetime. */
export function drawWreck(ctx: CanvasRenderingContext2D, camera: Camera, w: Wreck, hull: HullSpec, fade: number): void {
  const c = camera.worldToScreen(w.position);
  const s = hull.radius * camera.zoom;
  const outline = HULL_OUTLINES[hull.id] ?? HULL_OUTLINES['sparrow']!;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(w.heading);
  ctx.strokeStyle = COLOUR.inkDim;
  ctx.globalAlpha = 0.25 + 0.5 * fade;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  outline.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * s, y * s) : ctx.lineTo(x * s, y * s)));
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** A loot canister: a small diamond. */
export function drawLoot(ctx: CanvasRenderingContext2D, camera: Camera, l: Loot): void {
  const c = camera.worldToScreen(l.position);
  const r = 5 * camera.zoom;
  ctx.strokeStyle = COLOUR.warn;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(c.x, c.y - r);
  ctx.lineTo(c.x + r, c.y);
  ctx.lineTo(c.x, c.y + r);
  ctx.lineTo(c.x - r, c.y);
  ctx.closePath();
  ctx.stroke();
}

/** Tractor beam: the range ring, and a line to each canister in reach. */
export function drawTractor(ctx: CanvasRenderingContext2D, camera: Camera, at: { x: number; y: number }, range: number, loot: readonly Loot[]): void {
  const c = camera.worldToScreen(at);
  ctx.strokeStyle = COLOUR.warn;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 6]);
  ctx.beginPath();
  ctx.arc(c.x, c.y, range * camera.zoom, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.6;
  for (const l of loot) {
    if (Math.hypot(l.position.x - at.x, l.position.y - at.y) > range) continue;
    const p = camera.worldToScreen(l.position);
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** A turret's bearing: a short barrel line out from the hull. */
export function drawTurret(ctx: CanvasRenderingContext2D, camera: Camera, at: { x: number; y: number }, aim: number, hull: HullSpec, colour: string): void {
  const c = camera.worldToScreen(at);
  const inner = hull.radius * 0.2 * camera.zoom;
  const outer = hull.radius * 0.95 * camera.zoom;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(c.x + Math.cos(aim) * inner, c.y + Math.sin(aim) * inner);
  ctx.lineTo(c.x + Math.cos(aim) * outer, c.y + Math.sin(aim) * outer);
  ctx.stroke();
}

/** Shield and structure bars over a ship, shown once it has taken damage. */
export function drawHealthBars(ctx: CanvasRenderingContext2D, camera: Camera, ship: Ship, hull: HullSpec, at: { x: number; y: number }): void {
  if (ship.shield >= hull.shield && ship.structure >= hull.structure) return;
  const c = camera.worldToScreen(at);
  const w = 36;
  const y = c.y - hull.radius * camera.zoom - 14;
  const bar = (row: number, fraction: number, colour: string): void => {
    ctx.fillStyle = 'rgba(79, 122, 114, 0.35)';
    ctx.fillRect(c.x - w / 2, y + row * 5, w, 3);
    ctx.fillStyle = colour;
    ctx.fillRect(c.x - w / 2, y + row * 5, w * Math.max(0, Math.min(1, fraction)), 3);
  };
  bar(0, ship.shield / hull.shield, COLOUR.neutral);
  bar(1, ship.structure / hull.structure, ship.structure / hull.structure < 0.3 ? COLOUR.hostile : COLOUR.ink);
}

/** An expanding ring where a ship blew up. `t` runs 0 to 1. */
export function drawExplosion(ctx: CanvasRenderingContext2D, camera: Camera, at: { x: number; y: number }, radius: number, t: number): void {
  const c = camera.worldToScreen(at);
  ctx.strokeStyle = COLOUR.flame;
  ctx.globalAlpha = 1 - t;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(c.x, c.y, radius * (0.5 + 2.5 * t) * camera.zoom, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** Small ring where the turret is being aimed. */
export function drawReticle(ctx: CanvasRenderingContext2D, at: { x: number; y: number }): void {
  ctx.strokeStyle = COLOUR.ink;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(at.x, at.y, 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}
