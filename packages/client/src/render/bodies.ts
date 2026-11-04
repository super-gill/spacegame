import { bodyStates, railTime, type World } from '@spacegame/sim';
import type { Camera } from '../camera.js';

/**
 * Stopgap drawing of the system's bodies, added by the lead with 6c part 1
 * so the game stays playable: a plain circle per body, a faint dashed
 * ring for its sphere of influence, and the belt as a dashed band. The
 * interface workstream owns the real look (orbits, the belt's asteroids,
 * the map) and may replace this file whole.
 */

const BODY_INK = '#6f8f9a';
const SPHERE_INK = 'rgba(111, 143, 154, 0.25)';
const BELT_INK = 'rgba(160, 140, 110, 0.35)';

/** Draw every body as it is at `world.tick`, moved on by `alpha` of a tick to match interpolated ships. */
export function drawBodies(ctx: CanvasRenderingContext2D, camera: Camera, world: World, alpha: number): void {
  const states = bodyStates(world.bodies, railTime(world.tick - 1 + alpha, world.dt));
  ctx.save();
  ctx.lineWidth = 1;
  for (const body of Object.values(world.bodies)) {
    const at = states[body.id]?.position;
    if (!at) continue;
    const c = camera.worldToScreen(at);

    if (body.ring) {
      ctx.strokeStyle = BELT_INK;
      ctx.setLineDash([2, 10]);
      for (const r of [body.ring.radius - body.ring.width / 2, body.ring.radius + body.ring.width / 2]) {
        ctx.beginPath();
        ctx.arc(c.x, c.y, r * camera.zoom, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      continue;
    }

    if (body.sphere > 0) {
      ctx.strokeStyle = SPHERE_INK;
      ctx.setLineDash([6, 12]);
      ctx.beginPath();
      ctx.arc(c.x, c.y, body.sphere * camera.zoom, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.strokeStyle = BODY_INK;
    ctx.fillStyle = '#0a1014';
    ctx.beginPath();
    ctx.arc(c.x, c.y, body.radius * camera.zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = BODY_INK;
    ctx.font = '11px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(body.name.toUpperCase(), c.x, c.y + body.radius * camera.zoom + 16);
  }
  ctx.restore();
}

/** Where each body is now, for edge markers. Belts have no single point and are left out. */
export function bodyMarkers(world: World): { name: string; position: { x: number; y: number }; radius: number }[] {
  const states = bodyStates(world.bodies, railTime(world.tick, world.dt));
  return Object.values(world.bodies)
    .filter((b) => !b.ring && states[b.id])
    .map((b) => ({ name: b.name, position: states[b.id]!.position, radius: b.radius }));
}
