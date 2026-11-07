import { bodyStates, burnAcceleration, burnPlan, burnableBody, railTime, type BurnPlan, type Ship, type World } from '@spacegame/sim';
import type { PlotKind } from './plot-rows.js';

/**
 * The chart (M; docs/sol-build.md, slices 1 and 2; approved mockup, 7
 * November 2026): all of Sol on one screen. Worlds, the ports and where
 * you are; click a port or a world to make it your nav target, and the
 * burn to it is plotted in the side panel with its time, flip and peak
 * speed. The route drawn is the one the ship will fly (burn.ts): where a
 * world is in the way it bends round it, and the plan says how much the
 * pass adds. BURN starts it.
 *
 * The wheel zooms about the pointer and dragging pans (Jason, 7 November:
 * the scale buttons alone were annoying). Zoomed all the way out the chart
 * locks on the Sun with all of Sol inside its border; zoom in and you can
 * move about. LOCAL, INNER, BELT and ALL SOL remain as quick jumps; LOCAL
 * follows your ship until you drag away. Bodies are drawn at least a few
 * pixels across so every world can be found, and at their true size when
 * that is larger. The lanes and security shading in the mockup come later
 * in slice 2.
 */

type ViewId = 'local' | 'inner' | 'belt' | 'all';

/** The quick jumps: half the chart's width in units, and whether it centres on you (and follows) or the Sun. */
const VIEWS: readonly { id: ViewId; label: string; halfWidth: number; onShip: boolean }[] = [
  { id: 'local', label: 'LOCAL', halfWidth: 1_500_000, onShip: true },
  { id: 'inner', label: 'INNER', halfWidth: 45_000_000, onShip: false },
  { id: 'belt', label: 'BELT', halfWidth: 90_000_000, onShip: false },
  { id: 'all', label: 'ALL SOL', halfWidth: 250_000_000, onShip: false },
];
/** How far in and out the wheel goes: half the chart's width in units. Out is all of Sol, which locks on the Sun. */
const ZOOM_IN_LIMIT = 20_000;
const ZOOM_OUT_LIMIT = 250_000_000;
/** One wheel notch zooms by this factor. */
const ZOOM_STEP = 1.25;
/** A press that moves less than this many pixels is a click, not a drag. */
const DRAG_START_PX = 4;

/** Colours by body, from the powers' colours where a power holds it (docs/races.md); greys and golds otherwise. */
const BODY_COLOUR: Record<string, string> = {
  'The Sun': '#e0a458',
  Mercury: '#9a8f80',
  Venus: '#d9c27a',
  Earth: '#5b8fc7',
  Luna: '#9fb0b8',
  Mars: '#b8483a',
  Jupiter: '#c9a27a',
  Saturn: '#d8c08a',
  Uranus: '#8fc7c4',
  Neptune: '#5b78c7',
};

export interface ChartActions {
  /** A port or a world was clicked: make it the nav target. */
  pick(kind: PlotKind, id: string): void;
  /** BURN was pressed for the nav target. */
  burn(): void;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** "9.9 M u", "640,000 u". */
export function bigDistance(units: number): string {
  return units >= 1_000_000 ? `${(units / 1_000_000).toFixed(1)} M u` : `${Math.round(units).toLocaleString('en-GB')} u`;
}

/** "3:19". */
export function minutesSeconds(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** The point `share` (0 to 1) of the way along a plan's route by distance, for marking the flip. */
function alongRoute(from: { x: number; y: number }, plan: BurnPlan, share: number): { x: number; y: number } {
  let left = Math.max(0, Math.min(1, share)) * plan.route.length;
  let at = from;
  for (const p of plan.route.points) {
    const d = Math.hypot(p.x - at.x, p.y - at.y);
    if (d >= left) return d > 0 ? { x: at.x + ((p.x - at.x) * left) / d, y: at.y + ((p.y - at.y) * left) / d } : p;
    left -= d;
    at = p;
  }
  return at;
}

export class Chart {
  private readonly root = el('div', 'chart hidden');
  private readonly canvas = el('canvas', 'chart-canvas');
  private readonly plan = el('section', 'chart-plan');
  private readonly viewButtons = new Map<ViewId, HTMLButtonElement>();
  /** Half the chart's width in units, and where its centre is in the world; `follow` keeps the centre on your ship until you drag. */
  private halfWidth = 45_000_000;
  private centre = { x: 0, y: 0 };
  private follow = false;
  /** A press in progress: where it began, the centre then, and whether it has become a drag. */
  private press: { x: number; y: number; centre: { x: number; y: number }; dragging: boolean } | null = null;
  /** The last ship position seen, for zooming about the pointer and following. */
  private shipAt: { x: number; y: number } | null = null;
  /** Ports and worlds as last drawn, for clicks: screen point, kind, id and how big a mark to hit. */
  private drawn: { kind: PlotKind; id: string; x: number; y: number; r: number }[] = [];
  private selectedId: string | null = null;

  constructor(parent: HTMLElement, private readonly actions: ChartActions) {
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'The chart');
    const head = el('div', 'chart-head');
    head.append(el('span', 'chart-title', 'CHART · SOL · M'));
    const views = el('div', 'chart-views');
    for (const v of VIEWS) {
      const b = el('button', 'chart-view', v.label);
      b.type = 'button';
      b.addEventListener('click', () => {
        this.halfWidth = v.halfWidth;
        this.follow = v.onShip;
        this.centre = v.onShip && this.shipAt ? { ...this.shipAt } : { x: 0, y: 0 };
        this.markView();
      });
      this.viewButtons.set(v.id, b);
      views.append(b);
    }
    this.markView();
    const close = el('button', 'chart-view', 'CLOSE · M');
    close.type = 'button';
    close.addEventListener('click', () => this.toggle());
    head.append(views, close);
    this.root.append(head, this.canvas, this.plan);
    this.canvas.addEventListener('pointerdown', (e) => this.pointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this.pointerMove(e));
    this.canvas.addEventListener('pointerup', (e) => this.pointerUp(e));
    this.canvas.addEventListener('pointercancel', () => (this.press = null));
    this.canvas.addEventListener('wheel', (e) => this.wheel(e), { passive: false });
    parent.append(this.root);
  }

  /** Light the quick jump that matches the zoom, if one does; none while in between. */
  private markView(): void {
    for (const [id, button] of this.viewButtons) {
      const v = VIEWS.find((x) => x.id === id)!;
      button.classList.toggle('on', Math.abs(Math.log(this.halfWidth / v.halfWidth)) < 0.05 && v.onShip === this.follow);
    }
  }

  /** The chart's scale, pixels a unit, for its current size and zoom. */
  private scaleNow(): number {
    return Math.min(this.canvas.clientWidth, this.canvas.clientHeight) / 2 / this.halfWidth;
  }

  /** At the outer limit the chart locks on the Sun; inside it, the centre stays where Sol still fills the border. */
  private clampCentre(): void {
    if (this.halfWidth >= ZOOM_OUT_LIMIT) {
      this.centre = { x: 0, y: 0 };
      return;
    }
    const room = ZOOM_OUT_LIMIT - this.halfWidth;
    this.centre = { x: Math.max(-room, Math.min(room, this.centre.x)), y: Math.max(-room, Math.min(room, this.centre.y)) };
  }

  private canvasPoint(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  /** Zoom about the pointer: the world point under it stays put. */
  private wheel(e: WheelEvent): void {
    e.preventDefault();
    const at = this.canvasPoint(e);
    const before = this.scaleNow();
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const under = { x: this.centre.x + (at.x - w / 2) / before, y: this.centre.y + (at.y - h / 2) / before };
    const factor = e.deltaY > 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
    this.halfWidth = Math.max(ZOOM_IN_LIMIT, Math.min(ZOOM_OUT_LIMIT, this.halfWidth * factor));
    const after = this.scaleNow();
    this.centre = { x: under.x - (at.x - w / 2) / after, y: under.y - (at.y - h / 2) / after };
    // Zooming about a point other than your ship stops following it; zooming about it keeps on.
    if (this.follow && this.shipAt && Math.hypot(this.centre.x - this.shipAt.x, this.centre.y - this.shipAt.y) * after > 2) this.follow = false;
    this.clampCentre();
    this.markView();
  }

  private pointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    const at = this.canvasPoint(e);
    this.press = { x: at.x, y: at.y, centre: { ...this.centre }, dragging: false };
    this.canvas.setPointerCapture(e.pointerId);
  }

  private pointerMove(e: PointerEvent): void {
    if (!this.press) return;
    const at = this.canvasPoint(e);
    const dx = at.x - this.press.x;
    const dy = at.y - this.press.y;
    if (!this.press.dragging && Math.hypot(dx, dy) < DRAG_START_PX) return;
    // Dragging: nothing to drag at the outer limit, where Sol fills the chart.
    if (this.halfWidth >= ZOOM_OUT_LIMIT) return;
    this.press.dragging = true;
    this.follow = false;
    const scale = this.scaleNow();
    this.centre = { x: this.press.centre.x - dx / scale, y: this.press.centre.y - dy / scale };
    this.clampCentre();
    this.markView();
    this.canvas.classList.add('dragging');
  }

  private pointerUp(e: PointerEvent): void {
    const press = this.press;
    this.press = null;
    this.canvas.classList.remove('dragging');
    if (!press) return;
    if (!press.dragging) this.click(e);
  }

  get open(): boolean {
    return !this.root.classList.contains('hidden');
  }

  toggle(): void {
    this.root.classList.toggle('hidden');
    if (document.activeElement instanceof HTMLElement && this.root.contains(document.activeElement)) document.activeElement.blur();
  }

  private click(e: MouseEvent): void {
    const { x, y } = this.canvasPoint(e);
    // Ports first: a port on a world's face should win over the world behind it.
    let best: { kind: PlotKind; id: string; d: number } | null = null;
    for (const p of this.drawn) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d > Math.max(14, p.r) ) continue;
      if (!best || (p.kind === 'station' && best.kind !== 'station') || (p.kind === best.kind && d < best.d)) best = { kind: p.kind, id: p.id, d };
    }
    if (best) this.actions.pick(best.kind, best.id);
  }

  /** Redraw: the world as this pilot sees it, their ship, and the nav target if it is a port or a world. */
  update(world: World, ship: Ship | null, targetId: string | null): void {
    if (!this.open) return;
    this.selectedId = targetId;
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    const ctx = this.canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (ship) this.shipAt = { ...ship.position };
    if (this.follow && ship && !this.press?.dragging) this.centre = { ...ship.position };
    this.clampCentre();
    const centre = this.centre;
    const scale = this.scaleNow();
    const toScreen = (p: { x: number; y: number }): { x: number; y: number } => ({ x: w / 2 + (p.x - centre.x) * scale, y: h / 2 + (p.y - centre.y) * scale });

    // Orbits round the Sun, faint, so the ladder of worlds reads.
    ctx.strokeStyle = 'rgba(31, 53, 50, 0.9)';
    ctx.lineWidth = 1;
    const sun = toScreen({ x: 0, y: 0 });
    for (const body of Object.values(world.bodies)) {
      if (body.kind !== 'planet' || !body.orbit) continue;
      ctx.beginPath();
      ctx.arc(sun.x, sun.y, body.orbit.radius * scale, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Bodies: at least a few pixels, true size when bigger; names on worlds and the big rocks. Planets and moons can be picked.
    ctx.font = '11px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textBaseline = 'middle';
    this.drawn = [];
    // Where every body is now, from the rails, exactly as the sim places them.
    const time = railTime(world.tick, world.dt);
    const states = Object.fromEntries(Object.entries(bodyStates(world.bodies, time)).map(([id, st]) => [id, st.position]));
    for (const body of Object.values(world.bodies)) {
      if (body.radius <= 0) continue;
      const at = toScreen(states[body.id]!);
      if (at.x < -50 || at.y < -50 || at.x > w + 50 || at.y > h + 50) continue;
      const r = Math.max(body.kind === 'star' ? 6 : body.kind === 'planet' ? 4 : 2, body.radius * scale);
      const on = body.id === this.selectedId;
      ctx.fillStyle = BODY_COLOUR[body.name] ?? '#c8b9a0';
      ctx.beginPath();
      ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
      ctx.fill();
      if (burnableBody(body)) this.drawn.push({ kind: 'body', id: body.id, ...at, r });
      if (on) {
        // The chosen world: a ring just outside it.
        ctx.strokeStyle = '#dffbf3';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(at.x, at.y, r + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Moons crowd their planets far out: name them only when there is room.
      const parentAt = body.orbit && body.kind === 'moon' && world.bodies[body.orbit.parent]?.kind === 'planet' ? toScreen(states[body.orbit.parent]!) : null;
      if (on || !parentAt || Math.hypot(parentAt.x - at.x, parentAt.y - at.y) > 40) {
        ctx.fillStyle = on ? '#dffbf3' : '#6a988f';
        ctx.fillText(body.name.toUpperCase(), at.x + r + 5, at.y);
      }
    }

    // Ports: small diamonds, named; the nav target bright.
    const ports = Object.values(world.stations);
    for (const station of ports) {
      const at = toScreen(station.position);
      if (at.x < -50 || at.y < -50 || at.x > w + 50 || at.y > h + 50) continue;
      this.drawn.push({ kind: 'station', id: station.id, ...at, r: 8 });
      const on = station.id === this.selectedId;
      ctx.fillStyle = on ? '#dffbf3' : '#9fd3c7';
      ctx.beginPath();
      ctx.moveTo(at.x, at.y - 5);
      ctx.lineTo(at.x + 5, at.y);
      ctx.lineTo(at.x, at.y + 5);
      ctx.lineTo(at.x - 5, at.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = on ? '#dffbf3' : '#9fd3c7';
      ctx.fillText(station.name.toUpperCase(), at.x + 9, at.y - 12);
    }

    // You, and the route of a burn to the nav target: the line the ship will fly, bending round any world in the way.
    const plan = ship && targetId ? burnPlan(world, world.stations, ship.position, targetId, burnAcceleration(world, ship), time) : null;
    if (ship) {
      const me = toScreen(ship.position);
      if (plan) {
        ctx.strokeStyle = '#dffbf3';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(me.x, me.y);
        for (const p of plan.route.points) {
          const at = toScreen(p);
          ctx.lineTo(at.x, at.y);
        }
        ctx.stroke();
        // Each pass round a world: its clearance, faint, so the bend reads as going round something.
        for (const bend of plan.route.bends) {
          const c = toScreen(bend.centre);
          ctx.strokeStyle = 'rgba(224, 164, 88, 0.5)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 4]);
          ctx.beginPath();
          ctx.arc(c.x, c.y, Math.max(bend.radius * scale, 6), 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        // The flip: where the first run peaks, along the route.
        const mid = alongRoute(ship.position, plan, plan.flipSeconds / Math.max(plan.seconds, 1));
        const flip = toScreen(mid);
        ctx.strokeStyle = '#e0a458';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(flip.x - 5, flip.y - 5);
        ctx.lineTo(flip.x + 5, flip.y + 5);
        ctx.moveTo(flip.x + 5, flip.y - 5);
        ctx.lineTo(flip.x - 5, flip.y + 5);
        ctx.stroke();
      }
      ctx.strokeStyle = '#dffbf3';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(me.x, me.y, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#dffbf3';
      ctx.fillText('YOU', me.x + 11, me.y + 12);
    }

    this.renderPlan(world, ship, plan);
  }

  /** The plan's parts, built once and updated in place, so BURN is never replaced under the pointer mid-click. */
  private planParts: { to: HTMLElement; grid: HTMLElement; values: HTMLElement[]; note: HTMLElement; go: HTMLButtonElement } | null = null;

  private renderPlan(world: World, ship: Ship | null, plan: BurnPlan | null): void {
    if (!this.planParts) {
      const to = el('p', 'chart-plan-to');
      const grid = el('div', 'chart-plan-grid');
      const values = ['DISTANCE', 'TIME', 'FLIP AT', 'PEAK', 'BURNS AT', 'ROUTE'].map((k) => {
        const value = el('span');
        grid.append(el('span', 'muted', k), value);
        return value;
      });
      const note = el('p', 'muted');
      const go = el('button', 'chart-burn', 'BURN · U');
      go.type = 'button';
      go.addEventListener('click', () => this.actions.burn());
      this.plan.append(el('h2', undefined, 'BURN PLAN'), to, grid, note, go);
      this.planParts = { to, grid, values, note, go };
    }
    const parts = this.planParts;
    const set = (node: HTMLElement, text: string): void => {
      if (node.textContent !== text) node.textContent = text;
    };
    const plotted = Boolean(ship && plan);
    parts.grid.classList.toggle('hidden', !plotted);
    parts.go.classList.toggle('hidden', !plotted);
    if (!ship || !plan) {
      set(parts.to, '');
      set(parts.note, 'Click a port or a world to plot a burn to it.');
      return;
    }
    const accel = burnAcceleration(world, ship);
    set(parts.to, plan.target.kind === 'body' ? `${plan.target.name.toUpperCase()} · ABOVE THE WELL` : plan.target.name.toUpperCase());
    const passes = plan.route.bends.map((b) => world.bodies[b.bodyId]?.name.toUpperCase() ?? 'A WORLD');
    const route = passes.length === 0 ? 'STRAIGHT' : `ROUND ${passes.join(', ')} · +${minutesSeconds(plan.detourSeconds)}`;
    const shown = [bigDistance(plan.distance), minutesSeconds(plan.seconds), minutesSeconds(plan.flipSeconds), `${Math.round(plan.peakSpeed).toLocaleString('en-GB')} u/s`, `${accel.toLocaleString('en-GB')} u/s²`, route];
    parts.values.forEach((node, i) => set(node, shown[i]!));
    const tooClose = plan.distance < 20_000;
    set(parts.note, tooClose ? 'Close enough to fly there.' : plan.target.kind === 'body' ? 'Ends above the well, at rest with the world. Weapons, locks and docking are off while burning.' : 'Weapons, locks and docking are off while burning.');
    set(parts.go, ship.burn ? 'BURNING' : 'BURN · U');
    parts.go.disabled = tooClose || Boolean(ship.burn) || ship.state !== 'flying';
  }

}
