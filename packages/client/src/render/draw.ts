import { padWorldPosition, type Decoy, type HullSpec, type Loot, type ModuleSize, type Munition, type Projectile, type Ship, type ShipStats, type Station, type Wreck } from '@spacegame/sim';
import type { Camera } from '../camera.js';
import { drawShipArt, type ShipArt } from './ship-art.js';

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
  /** Nobody aboard: drawn faded with a dashed hull, so it reads as parked. */
  empty?: boolean;
}

/**
 * Side of the square landing frame drawn for each pad size, world units.
 * A little smaller than twice the pad's reach from the station hull, so
 * the frame sits clear of the hull and of its neighbours.
 */
const PAD_FRAME: Record<ModuleSize, number> = { S: 22, M: 34, L: 50, XL: 70 };

/**
 * A station's landing pads: a corner-bracket frame per pad, turned to the
 * pad's facing, joined to the hull by a short gantry, with its size
 * letter on the outer edge. Pads with a ship on them are drawn brighter.
 */
export function drawPads(ctx: CanvasRenderingContext2D, camera: Camera, station: Station, occupied: ReadonlySet<string>): void {
  const z = camera.zoom;
  for (const pad of station.pads) {
    const c = camera.worldToScreen(padWorldPosition(station, pad));
    const half = (PAD_FRAME[pad.size] / 2) * z;
    const leg = half * 0.45;
    const taken = occupied.has(pad.id);
    const reach = Math.hypot(pad.position.x, pad.position.y) - station.radius;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(pad.facing);
    ctx.strokeStyle = taken ? COLOUR.ink : COLOUR.inkDim;
    ctx.globalAlpha = taken ? 0.7 : 0.45;
    ctx.lineWidth = 1;
    // Gantry from the hull to the inner edge of the frame.
    ctx.beginPath();
    ctx.moveTo(-reach * z, 0);
    ctx.lineTo(-half, 0);
    ctx.stroke();
    // Corner brackets.
    ctx.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
      ctx.moveTo(sx * half, sy * (half - leg));
      ctx.lineTo(sx * half, sy * half);
      ctx.lineTo(sx * (half - leg), sy * half);
    }
    ctx.stroke();
    if (z >= 0.6) {
      ctx.rotate(-pad.facing);
      ctx.fillStyle = COLOUR.inkDim;
      ctx.font = '9px ui-monospace, Menlo, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const out = half + 8;
      ctx.fillText(pad.size, Math.cos(pad.facing) * out, Math.sin(pad.facing) * out);
      ctx.textBaseline = 'alphabetic';
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

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

/**
 * A ship, in space or on a pad: hull and fitted modules (see
 * ship-art.ts), with an optional label underneath. A docked ship's
 * position is already its pad's, so it is drawn the same way.
 */
export function drawShip(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  view: ShipView,
  art: Omit<ShipArt, 'colour' | 'heading'>,
  style: ShipStyle = { colour: COLOUR.inkBright },
): void {
  const c = camera.worldToScreen(view.position);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(view.heading);
  ctx.scale(camera.zoom, camera.zoom);
  if (style.empty) ctx.globalAlpha = EMPTY_ALPHA;
  drawShipArt(ctx, camera.zoom, { ...art, colour: style.colour, heading: view.heading, dashedHull: style.empty === true });
  ctx.restore();
  ctx.globalAlpha = 1;

  if (style.label) {
    ctx.fillStyle = style.colour;
    ctx.globalAlpha = 0.8;
    ctx.font = '11px ui-monospace, Menlo, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(style.label, c.x, c.y + art.hull.radius * camera.zoom + 16);
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

/** How faded an empty ship is drawn. */
const EMPTY_ALPHA = 0.55;

/** One beacon flash cycle, ms. */
const BEACON_PERIOD_MS = 1400;

/**
 * An escape pod's distress beacon: a light that blinks on the pod and a
 * ring that pulses out from it, both in screen pixels so a pod stays
 * findable even zoomed out, where its hull is only a few pixels wide.
 */
export function drawPodBeacon(ctx: CanvasRenderingContext2D, camera: Camera, at: { x: number; y: number }, radius: number, nowMs: number): void {
  const c = camera.worldToScreen(at);
  const t = (nowMs % BEACON_PERIOD_MS) / BEACON_PERIOD_MS;
  const base = radius * camera.zoom + 4;
  ctx.strokeStyle = COLOUR.flame;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.6 * (1 - t);
  ctx.beginPath();
  ctx.arc(c.x, c.y, base + 22 * t, 0, Math.PI * 2);
  ctx.stroke();
  if (t < 0.18) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = COLOUR.flame;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/**
 * Marker at the screen edge pointing at something off screen, with a
 * label and distance. Draws nothing if any part of the object (a circle
 * of `radius` world units) is on screen. The radar replaced the markers
 * for everything; this stays for the nav target (stage 4).
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

/**
 * Stopgap (lead, 6e part 2): a missile or torpedo as a small dart along
 * its heading with an exhaust streak; torpedoes drawn larger. The
 * interface workstream owns the real look.
 */
export function drawMunition(ctx: CanvasRenderingContext2D, camera: Camera, m: Munition, torpedo: boolean, colour: string): void {
  const c = camera.worldToScreen(m.position);
  const z = Math.max(camera.zoom, 0.6);
  const len = (torpedo ? 12 : 7) * z;
  const half = (torpedo ? 3.5 : 2.2) * z;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(m.heading);
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(len / 2, 0);
  ctx.lineTo(-len / 2, -half);
  ctx.lineTo(-len / 2, half);
  ctx.closePath();
  ctx.stroke();
  ctx.strokeStyle = COLOUR.flame;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(-len / 2, 0);
  ctx.lineTo(-len / 2 - len * 1.4, 0);
  ctx.stroke();
  ctx.restore();
}

/** Stopgap: a countermeasure as a flickering point that fades as it burns. */
export function drawDecoy(ctx: CanvasRenderingContext2D, camera: Camera, d: Decoy, nowMs: number): void {
  const c = camera.worldToScreen(d.position);
  const life = d.lifetimeTicks > 0 ? d.ticksLeft / d.lifetimeTicks : 0;
  const flicker = 0.6 + 0.4 * Math.sin(nowMs / 40 + d.position.x);
  const heat = d.spoofs.includes('heat');
  ctx.save();
  ctx.globalAlpha = Math.max(0.15, life) * flicker;
  ctx.fillStyle = heat ? COLOUR.flame : COLOUR.inkBright;
  ctx.strokeStyle = ctx.fillStyle;
  const r = (heat ? 3 : 2) + life * 2;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.fill();
  if (!heat) {
    // Chaff: a little scatter of glints round it.
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7 + d.ticksLeft * 0.05;
      ctx.fillRect(c.x + Math.cos(a) * r * 2.5, c.y + Math.sin(a) * r * 2.5, 1.5, 1.5);
    }
  }
  ctx.restore();
}

/** A wreck: the bare hull outline, dashed, fading out over its lifetime. */
export function drawWreck(ctx: CanvasRenderingContext2D, camera: Camera, w: Wreck, hull: HullSpec, fade: number): void {
  const c = camera.worldToScreen(w.position);
  const z = camera.zoom;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(w.heading);
  ctx.strokeStyle = COLOUR.inkDim;
  ctx.globalAlpha = 0.25 + 0.5 * fade;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  hull.outline.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x * z, p.y * z) : ctx.lineTo(p.x * z, p.y * z)));
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

/** Shield and structure bars over a ship, shown once it has taken damage. */
export function drawHealthBars(ctx: CanvasRenderingContext2D, camera: Camera, ship: Ship, stats: ShipStats, at: { x: number; y: number }): void {
  if (ship.shield >= stats.shield && ship.structure >= stats.structure) return;
  const c = camera.worldToScreen(at);
  const w = 36;
  const y = c.y - stats.radius * camera.zoom - 14;
  const bar = (row: number, fraction: number, colour: string): void => {
    ctx.fillStyle = 'rgba(79, 122, 114, 0.35)';
    ctx.fillRect(c.x - w / 2, y + row * 5, w, 3);
    ctx.fillStyle = colour;
    ctx.fillRect(c.x - w / 2, y + row * 5, w * Math.max(0, Math.min(1, fraction)), 3);
  };
  if (stats.shield > 0) bar(0, ship.shield / stats.shield, COLOUR.neutral);
  bar(1, ship.structure / stats.structure, ship.structure / stats.structure < 0.3 ? COLOUR.hostile : COLOUR.ink);
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

/** Corner brackets round the selected target. Red when weapons are hot. */
export function drawTargetBracket(ctx: CanvasRenderingContext2D, camera: Camera, at: { x: number; y: number }, radius: number, hot: boolean): void {
  const c = camera.worldToScreen(at);
  const r = radius * camera.zoom + 8;
  const leg = Math.max(5, r * 0.4);
  ctx.strokeStyle = hot ? COLOUR.hostile : COLOUR.inkBright;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
    ctx.moveTo(c.x + sx * r, c.y + sy * (r - leg));
    ctx.lineTo(c.x + sx * r, c.y + sy * r);
    ctx.lineTo(c.x + sx * (r - leg), c.y + sy * r);
  }
  ctx.stroke();
}

/**
 * Lead marker for fixed guns: where to put the nose so shots meet the
 * target. A small circle with a dot, joined to the target by a faint line.
 */
export function drawLeadMarker(ctx: CanvasRenderingContext2D, camera: Camera, lead: { x: number; y: number }, target: { x: number; y: number }): void {
  const l = camera.worldToScreen(lead);
  const t = camera.worldToScreen(target);
  ctx.strokeStyle = COLOUR.warn;
  ctx.fillStyle = COLOUR.warn;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(t.x, t.y);
  ctx.lineTo(l.x, l.y);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(l.x, l.y, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(l.x, l.y, 1.5, 0, Math.PI * 2);
  ctx.fill();
}
