import type { HullSpec, PlayerInput, Ship, Station } from '@spacegame/sim';
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
};

export interface ShipView {
  position: { x: number; y: number };
  heading: number;
}

export function drawStation(ctx: CanvasRenderingContext2D, camera: Camera, station: Station, inRange: boolean): void {
  const c = camera.worldToScreen(station.position);
  const r = station.radius * camera.zoom;

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
  input: PlayerInput,
  docked: boolean,
): void {
  if (docked) return;
  const c = camera.worldToScreen(view.position);
  const s = hull.radius * camera.zoom;

  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(view.heading);

  // Main engine flame, drawn first so the hull sits on top.
  if (input.thrustForward) {
    ctx.strokeStyle = COLOUR.flame;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-s * 0.7, -s * 0.35);
    ctx.lineTo(-s * 1.6, 0);
    ctx.lineTo(-s * 0.7, s * 0.35);
    ctx.stroke();
  }
  if (input.thrustReverse) {
    ctx.strokeStyle = COLOUR.flame;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s * 0.6, -s * 0.5);
    ctx.lineTo(s * 1.1, -s * 0.55);
    ctx.moveTo(s * 0.6, s * 0.5);
    ctx.lineTo(s * 1.1, s * 0.55);
    ctx.stroke();
  }
  if (input.strafeLeft || input.strafeRight) {
    // Strafe thrusters fire on the opposite side to the direction of travel.
    const side = input.strafeRight ? -1 : 1;
    ctx.strokeStyle = COLOUR.flame;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, side * s * 0.6);
    ctx.lineTo(-s * 0.2, side * s * 1.1);
    ctx.stroke();
  }

  // Hull: arrowhead with a notched tail.
  ctx.strokeStyle = COLOUR.inkBright;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(s, 0);
  ctx.lineTo(-s * 0.7, -s * 0.65);
  ctx.lineTo(-s * 0.4, 0);
  ctx.lineTo(-s * 0.7, s * 0.65);
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
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
