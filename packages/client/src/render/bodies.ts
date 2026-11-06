import { SURVEY_SHOW_SECONDS, asteroidPositions, bodyStates, navReadout, railTime, type Ship, type SurveyResult, type World } from '@spacegame/sim';
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
const STAR_INK = '#f0b45a';
const STAR_FILL = '#3a2410';
const STAR_GLOW = 'rgba(240, 180, 90, 0.18)';

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

    const star = body.kind === 'star';
    const r = body.radius * camera.zoom;
    if (star) {
      // A star burns: a warm glow round a bright disc.
      const glow = ctx.createRadialGradient(c.x, c.y, r * 0.8, c.x, c.y, r * 2.2);
      glow.addColorStop(0, STAR_GLOW);
      glow.addColorStop(1, 'rgba(240, 180, 90, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = star ? STAR_INK : BODY_INK;
    ctx.fillStyle = star ? STAR_FILL : '#0a1014';
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = star ? STAR_INK : BODY_INK;
    ctx.font = '11px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(body.name.toUpperCase(), c.x, c.y + body.radius * camera.zoom + 16);
  }
  ctx.restore();
}

const ROCK_INK = 'rgba(176, 160, 132, 0.8)';

/** Survey readings (docs/mining.md): how a rock is lit after a pulse. Plain rock stays as it is. */
const SURVEY_INK: Partial<Record<SurveyResult['rocks'][number]['reading'], string>> = {
  rich: '#e8b04a',
  middling: '#d9a441',
  valuable: '#ffd95e',
  rare: '#7fe7ff',
};

/**
 * Stopgap: the belt's asteroids as rough grey outlines, each a fixed
 * lumpy shape from its id so it reads as a rock, not a circle. Only those
 * near the screen are drawn. After a survey pulse from `ship`, rocks
 * worth a look are outlined in the colour of their reading for
 * `SURVEY_SHOW_SECONDS`, and the pulse's ring spreads for its first second.
 * The interface workstream's belt art replaces this.
 */
export function drawAsteroids(ctx: CanvasRenderingContext2D, camera: Camera, world: World, ship: Ship | null = null): void {
  const margin = 120;
  const survey = ship?.survey;
  // Rocks are drawn at a time between the last two updates, which can be a
  // moment before the tick the survey happened on: never let its age go
  // below zero, or the pulse's radius goes negative and the canvas throws,
  // which stopped the whole frame (Jason, 6 November 2026).
  const age = survey ? Math.max(0, (world.tick - survey.tick) * world.dt) : Infinity;
  const readings = new Map<string, string>();
  if (survey && age < SURVEY_SHOW_SECONDS) for (const r of survey.rocks) if (SURVEY_INK[r.reading]) readings.set(r.id, SURVEY_INK[r.reading]!);
  const fade = Math.max(0, Math.min(1, (SURVEY_SHOW_SECONDS - age) / 2));
  ctx.save();
  if (survey && age < 1) {
    // The pulse going out.
    const c = camera.worldToScreen(survey.origin);
    ctx.strokeStyle = SURVEY_INK.rich!;
    ctx.globalAlpha = 1 - age;
    ctx.beginPath();
    ctx.arc(c.x, c.y, Math.max(0, survey.range * camera.zoom * Math.min(1, age * 1.5)), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = '#0b0d0f';
  ctx.lineWidth = 1;
  asteroidPositions(world).forEach((rock, index) => {
    const c = camera.worldToScreen(rock.position);
    const r = rock.radius * camera.zoom;
    if (c.x < -margin - r || c.y < -margin - r || c.x > camera.viewportWidth + margin + r || c.y > camera.viewportHeight + margin + r) return;
    let seed = 0;
    for (const ch of rock.id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    ctx.beginPath();
    const corners = 9;
    for (let i = 0; i < corners; i++) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      const wobble = 0.75 + ((seed >>> 8) % 1000) / 2000;
      const a = (i / corners) * Math.PI * 2;
      const x = c.x + Math.cos(a) * r * wobble;
      const y = c.y + Math.sin(a) * r * wobble;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    // Exposed gate-glass glitters: a pulsing pale ink, faster as its time runs out.
    const glass = world.asteroids[index]?.fragile;
    const lit = glass ? GLASS_INK : readings.get(rock.id);
    ctx.strokeStyle = lit ?? ROCK_INK;
    ctx.lineWidth = lit ? 2 : 1;
    ctx.globalAlpha = glass ? 0.55 + 0.45 * Math.sin(world.tick * 0.15) : lit ? 0.4 + 0.6 * fade : 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  });
  ctx.restore();
}

/** Exposed gate-glass. */
const GLASS_INK = '#c9f0ff';

const PATH_INK = 'rgba(159, 211, 199, 0.55)';
const PATH_WARN = '#e06c5a';

/**
 * Stopgap: the nav computer's predicted path as a dotted line, and a
 * one-line orbit and gravity readout in the bottom-right corner. Drawn
 * only from `navReadout`, so a ship without a nav computer gets nothing.
 * The interface workstream's path line, gauge and warnings replace it.
 */
export function drawNav(ctx: CanvasRenderingContext2D, camera: Camera, world: World, ship: Ship, alpha: number): void {
  const nav = navReadout(world, ship);
  if (!nav || ship.state !== 'flying') return;
  const path = nav.path;
  const states = bodyStates(world.bodies, railTime(world.tick - 1 + alpha, world.dt));
  const origin = path.relativeTo ? states[path.relativeTo]?.position : undefined;
  ctx.save();
  ctx.strokeStyle = path.impact ? PATH_WARN : PATH_INK;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 6]);
  ctx.beginPath();
  path.points.forEach((p, i) => {
    const at = camera.worldToScreen(origin ? { x: origin.x + p.x, y: origin.y + p.y } : p);
    if (i === 0) ctx.moveTo(at.x, at.y);
    else ctx.lineTo(at.x, at.y);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  const parts: string[] = [];
  if (nav.orbit) {
    const pe = Math.round(nav.orbit.periapsisAltitude);
    const ap = Number.isFinite(nav.orbit.apoapsisAltitude) && nav.orbit.bound ? Math.round(nav.orbit.apoapsisAltitude).toString() : 'ESCAPE';
    parts.push(`PE ${pe}  AP ${ap}`);
  }
  if (nav.gravity.tier !== 'none') parts.push(`GRAVITY ${nav.gravity.tier.toUpperCase()} ${Math.round(nav.gravity.ratio * 100)}%`);
  if (path.impact) parts.push(`IMPACT IN ${path.impact.seconds.toFixed(0)} s`);
  if (parts.length > 0) {
    ctx.fillStyle = path.impact || nav.gravity.tier === 'alarm' || nav.gravity.tier === 'warning' ? PATH_WARN : PATH_INK;
    ctx.font = '12px ui-monospace, monospace';
    // Bottom right, above the frame counter: the radar has the bottom-left corner.
    ctx.textAlign = 'right';
    ctx.fillText(parts.join('  ·  '), camera.viewportWidth - 16, camera.viewportHeight - 34);
  }
  ctx.restore();
}
