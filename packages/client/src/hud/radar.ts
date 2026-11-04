import type { Ship, World } from '@spacegame/sim';
import { bodyPosition, distance, lockReadout, shipStats } from '@spacegame/sim';
import type { Camera } from '../camera.js';
import { el, setText } from './dom.js';
import { pickContact, radarPoint, radarShows, ringStep, type RadarHit } from './radar-geometry.js';
import { sameTarget, type NavTarget } from './nav-target.js';
import { readoutStance, type TargetStance } from './target-card.js';

/**
 * The radar disc, bottom left. North up, centred on your ship, its rim at
 * your radar's sensor range. It replaces the off-screen markers.
 *
 * - **Ships** only within sensor range (none at all without a radar).
 *   Who a ship is shows only once a lock reads its identity; until then
 *   it is a plain contact. Your own ships always show (you know where you
 *   left them), pinned to the rim when out of range.
 * - **Stations and bodies** are on the charts: always shown, pinned to
 *   the rim when beyond the range. The belt shows as its band.
 * - The **window**: a box for what the screen shows at the current zoom.
 * - Locks: a bracket on the active lock, a ring on the others.
 *
 * Clicking a ship contact locks it (or makes it active if already
 * locked), like clicking it in space. Clicking a station or body selects
 * it, for N to make it the nav target. The nav target wears a diamond,
 * the selection a ring.
 */

const SIZE = 220;
const MID = SIZE / 2;
const DISC = 100;
const CLICK_SLOP_PX = 9;
/** Scale of the disc with no radar fitted: stations and bodies are still on the charts. */
const CHART_RANGE = 6000;

const C = {
  ink: '#9fd3c7',
  dim: '#6a988f',
  faint: '#1f3532',
  bright: '#dffbf3',
  hostile: '#e06c5a',
  neutral: '#8fa8c8',
  watch: '#f2f5f7',
  body: '#6f8f9a',
  panel: 'rgba(5, 10, 12, 0.85)',
};

const STANCE_COLOUR: Record<TargetStance, string> = {
  hostile: C.hostile,
  neutral: C.neutral,
  watch: C.watch,
  pilot: C.ink,
  empty: C.dim,
  unknown: C.dim,
};

export class Radar {
  private readonly root = el('div', 'hud-radar');
  private readonly canvas = el('canvas', 'hud-radar-disc');
  private readonly caption = el('div', 'hud-dim hud-radar-caption');
  private readonly ctx: CanvasRenderingContext2D;
  private hits: RadarHit[] = [];
  /** Stations and bodies on the disc, keyed `station:id` or `body:id`. */
  private chartHits: RadarHit[] = [];
  private dpr = 1;

  /** `onPick` gets a ship id when a contact is clicked; `onChart` a station or body. */
  constructor(
    parent: HTMLElement,
    private readonly onPick: (shipId: string) => void,
    private readonly onChart: (target: NavTarget) => void,
  ) {
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', 'Radar: north up, your ship at the centre');
    this.root.append(this.canvas, this.caption);
    parent.append(this.root);
    this.ctx = this.canvas.getContext('2d')!;
    this.canvas.addEventListener('click', (e) => {
      const r = this.canvas.getBoundingClientRect();
      const at = { x: e.clientX - r.left - MID, y: e.clientY - r.top - MID };
      const id = pickContact(this.hits, at, CLICK_SLOP_PX);
      if (id) {
        this.onPick(id);
        return;
      }
      const chart = pickContact(this.chartHits, at, CLICK_SLOP_PX);
      if (chart) {
        const [kind, ...rest] = chart.split(':');
        this.onChart({ kind: kind === 'station' ? 'station' : 'body', id: rest.join(':') });
      }
    });
    this.resize();
  }

  private resize(): void {
    this.dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    this.canvas.width = SIZE * this.dpr;
    this.canvas.height = SIZE * this.dpr;
    this.canvas.style.width = `${SIZE}px`;
    this.canvas.style.height = `${SIZE}px`;
  }

  /**
   * Redraw. `ship` is null while the pilot has no ship; `pilotId` picks out
   * your own ships; `selected` and `nav` are marked.
   */
  update(
    world: World,
    ship: Ship | null,
    pilotId: string,
    camera: Camera,
    at: { x: number; y: number },
    selected: NavTarget | null = null,
    nav: NavTarget | null = null,
  ): void {
    this.root.classList.toggle('hidden', ship === null);
    if (!ship) return;
    if (Math.max(1, Math.round(window.devicePixelRatio || 1)) !== this.dpr) this.resize();

    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.save();
    ctx.translate(MID, MID);

    const sensor = shipStats(world, ship).sensorRange;
    const range = sensor > 0 ? sensor : CHART_RANGE;
    const k = DISC / range;
    setText(this.caption, sensor > 0 ? `RADAR ${Math.round(sensor).toLocaleString('en-GB')} u · NORTH UP` : 'NO RADAR · CHARTS ONLY');

    // Disc, range rings, north.
    ctx.fillStyle = C.panel;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, DISC, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, DISC, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = C.faint;
    ctx.lineWidth = 1;
    const step = ringStep(range);
    for (let r = step; r < range; r += step) {
      ctx.beginPath();
      ctx.arc(0, 0, r * k, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, -DISC);
    ctx.lineTo(0, DISC);
    ctx.moveTo(-DISC, 0);
    ctx.lineTo(DISC, 0);
    ctx.stroke();

    // Bodies inside the disc, to scale; the belt as its band.
    for (const body of Object.values(world.bodies)) {
      const c = bodyPosition(world, body.id);
      const p = { x: (c.x - at.x) * k, y: (c.y - at.y) * k };
      if (body.ring) {
        ctx.strokeStyle = C.body;
        ctx.globalAlpha = 0.25;
        ctx.lineWidth = Math.max(2, body.ring.width * k);
        ctx.beginPath();
        ctx.arc(p.x, p.y, body.ring.radius * k, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (Math.hypot(p.x, p.y) - body.radius * k < DISC) {
        ctx.strokeStyle = C.body;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(2, body.radius * k), 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // The window: what the screen shows at the current zoom.
    const halfW = camera.viewportWidth / 2 / camera.zoom;
    const halfH = camera.viewportHeight / 2 / camera.zoom;
    ctx.strokeStyle = C.dim;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect((camera.position.x - halfW - at.x) * k, (camera.position.y - halfH - at.y) * k, halfW * 2 * k, halfH * 2 * k);
    ctx.setLineDash([]);
    ctx.restore();

    // Bodies beyond the disc: a small circle on the rim. Every solid body
    // is clickable at its centre (or its rim pin).
    this.chartHits = [];
    for (const body of Object.values(world.bodies)) {
      if (body.ring) continue;
      const c = bodyPosition(world, body.id);
      const p = radarPoint(at, c, range, DISC);
      this.chartHits.push({ id: `body:${body.id}`, x: p.x, y: p.y });
      this.markChart(p, { kind: 'body', id: body.id }, selected, nav);
      if (distance(c, at) - body.radius <= range) continue;
      ctx.strokeStyle = C.body;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Stations: always, pinned to the rim beyond the range, with a short name.
    ctx.font = '10px "IBM Plex Mono", ui-monospace, monospace';
    for (const station of Object.values(world.stations)) {
      const p = radarPoint(at, station.position, range, DISC);
      this.chartHits.push({ id: `station:${station.id}`, x: p.x, y: p.y });
      this.markChart(p, { kind: 'station', id: station.id }, selected, nav);
      ctx.fillStyle = C.panel;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 1.4;
      ctx.fillRect(p.x - 4, p.y - 4, 8, 8);
      ctx.strokeRect(p.x - 4, p.y - 4, 8, 8);
      const label = station.name.split(' ')[0]!.toUpperCase();
      ctx.fillStyle = C.ink;
      ctx.textAlign = p.x > 30 ? 'right' : 'left';
      ctx.fillText(label, p.x + (p.x > 30 ? -7 : 7), p.y - 6);
    }

    // Ships.
    this.hits = [];
    const locked = new Map(ship.locks.map((l) => [l.targetId, l]));
    for (const other of Object.values(world.ships)) {
      if (other.id === ship.id || other.state !== 'flying') continue;
      const d = distance(ship.position, other.position);
      const yours = other.ownerId === pilotId;
      if (!radarShows(d, sensor) && !yours) continue;
      const p = radarPoint(at, other.position, range, DISC);
      const read = locked.has(other.id) ? lockReadout(world, ship, other.id) : null;
      const stance: TargetStance = yours && !read ? 'pilot' : readoutStance(read);
      const colour = yours ? C.ink : STANCE_COLOUR[stance];
      ctx.strokeStyle = colour;
      ctx.fillStyle = colour;
      ctx.lineWidth = 1.4;
      if (yours) {
        // Your own ship, parked or flown by you elsewhere: a hollow dashed triangle.
        ctx.setLineDash([2, 2]);
        triangle(ctx, p.x, p.y, 5);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (stance === 'unknown') {
        // A contact nobody has identified: a small plain dot.
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Identified by a lock: a diamond in its stance colour.
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 4.5);
        ctx.lineTo(p.x + 4.5, p.y);
        ctx.lineTo(p.x, p.y + 4.5);
        ctx.lineTo(p.x - 4.5, p.y);
        ctx.closePath();
        ctx.fill();
      }
      const lock = locked.get(other.id);
      if (lock) {
        ctx.strokeStyle = colour;
        ctx.lineWidth = 1;
        if (other.id === ship.activeLock) bracket(ctx, p.x, p.y, 8);
        else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * lock.progress);
          ctx.stroke();
        }
      }
      if (radarShows(d, sensor)) this.hits.push({ id: other.id, x: p.x, y: p.y });
    }

    // Contact positions for tests and tools: what a click would pick.
    const hitsText = this.hits.map((h) => `${h.id}:${Math.round(h.x + MID)},${Math.round(h.y + MID)}`).join(' ');
    if (this.canvas.dataset['contacts'] !== hitsText) this.canvas.dataset['contacts'] = hitsText;

    // You, at the centre, pointing along your heading.
    ctx.save();
    ctx.rotate(ship.heading);
    ctx.fillStyle = C.bright;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-5, 5);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-5, -5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = C.dim;
    ctx.textAlign = 'center';
    ctx.fillText('N', 0, -DISC + 12);
    ctx.restore();
  }

  /** The nav target's diamond and the selection's ring round a station or body. */
  private markChart(p: { x: number; y: number }, target: NavTarget, selected: NavTarget | null, nav: NavTarget | null): void {
    const ctx = this.ctx;
    if (sameTarget(target, nav)) {
      ctx.strokeStyle = C.bright;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 9);
      ctx.lineTo(p.x + 9, p.y);
      ctx.lineTo(p.x, p.y + 9);
      ctx.lineTo(p.x - 9, p.y);
      ctx.closePath();
      ctx.stroke();
    }
    if (sameTarget(target, selected)) {
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function triangle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y + r * 0.8);
  ctx.lineTo(x - r, y + r * 0.8);
  ctx.closePath();
}

function bracket(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  const t = 3;
  ctx.beginPath();
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
    ctx.moveTo(x + sx * r, y + sy * (r - t));
    ctx.lineTo(x + sx * r, y + sy * r);
    ctx.lineTo(x + sx * (r - t), y + sy * r);
  }
  ctx.stroke();
}
