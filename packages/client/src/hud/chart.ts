import { bodyStates, burnAcceleration, burnPlan, railTime, type Ship, type Station, type World } from '@spacegame/sim';

/**
 * The chart (M; docs/sol-build.md, slice 1; approved mockup, 7 November
 * 2026): all of Sol on one screen. Worlds, the ports and where you are;
 * click a port to make it your nav target, and the burn to it is plotted
 * in the side panel with its time, flip and peak speed. BURN starts it.
 *
 * Views: LOCAL (round your ship), INNER (Mercury to Mars), BELT (out to
 * Jupiter) and ALL SOL. Bodies are drawn at least a few pixels across so
 * every world can be found, and at their true size when that is larger.
 * The lanes and security shading in the mockup come with slice 2.
 */

type ViewId = 'local' | 'inner' | 'belt' | 'all';

/** How much of Sol each view shows: half its width in units, and whether it centres on you or the Sun. */
const VIEWS: readonly { id: ViewId; label: string; halfWidth: number; onShip: boolean }[] = [
  { id: 'local', label: 'LOCAL', halfWidth: 1_500_000, onShip: true },
  { id: 'inner', label: 'INNER', halfWidth: 45_000_000, onShip: false },
  { id: 'belt', label: 'BELT', halfWidth: 90_000_000, onShip: false },
  { id: 'all', label: 'ALL SOL', halfWidth: 250_000_000, onShip: false },
];

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
  /** A port was clicked: make it the nav target. */
  pick(stationId: string): void;
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

export class Chart {
  private readonly root = el('div', 'chart hidden');
  private readonly canvas = el('canvas', 'chart-canvas');
  private readonly plan = el('section', 'chart-plan');
  private readonly viewButtons = new Map<ViewId, HTMLButtonElement>();
  private view: ViewId = 'inner';
  /** Ports as last drawn, for clicks: screen point and id. */
  private drawn: { id: string; x: number; y: number }[] = [];
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
        this.view = v.id;
        for (const [id, button] of this.viewButtons) button.classList.toggle('on', id === v.id);
      });
      this.viewButtons.set(v.id, b);
      views.append(b);
    }
    this.viewButtons.get(this.view)!.classList.add('on');
    const close = el('button', 'chart-view', 'CLOSE · M');
    close.type = 'button';
    close.addEventListener('click', () => this.toggle());
    head.append(views, close);
    this.root.append(head, this.canvas, this.plan);
    this.canvas.addEventListener('click', (e) => this.click(e));
    parent.append(this.root);
  }

  get open(): boolean {
    return !this.root.classList.contains('hidden');
  }

  toggle(): void {
    this.root.classList.toggle('hidden');
    if (document.activeElement instanceof HTMLElement && this.root.contains(document.activeElement)) document.activeElement.blur();
  }

  private click(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let best: { id: string; d: number } | null = null;
    for (const p of this.drawn) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < 14 && (!best || d < best.d)) best = { id: p.id, d };
    }
    if (best) this.actions.pick(best.id);
  }

  /** Redraw: the world as this pilot sees it, their ship, and the nav target if it is a port. */
  update(world: World, ship: Ship | null, targetStationId: string | null): void {
    if (!this.open) return;
    this.selectedId = targetStationId;
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

    const v = VIEWS.find((x) => x.id === this.view)!;
    const centre = v.onShip && ship ? ship.position : { x: 0, y: 0 };
    const scale = Math.min(w, h) / 2 / v.halfWidth;
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

    // Bodies: at least a few pixels, true size when bigger; names on worlds and the big rocks.
    ctx.font = '11px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textBaseline = 'middle';
    // Where every body is now, from the rails, exactly as the sim places them.
    const states = Object.fromEntries(Object.entries(bodyStates(world.bodies, railTime(world.tick, world.dt))).map(([id, st]) => [id, st.position]));
    for (const body of Object.values(world.bodies)) {
      if (body.radius <= 0) continue;
      const at = toScreen(states[body.id]!);
      if (at.x < -50 || at.y < -50 || at.x > w + 50 || at.y > h + 50) continue;
      const r = Math.max(body.kind === 'star' ? 6 : body.kind === 'planet' ? 4 : 2, body.radius * scale);
      ctx.fillStyle = BODY_COLOUR[body.name] ?? '#c8b9a0';
      ctx.beginPath();
      ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
      ctx.fill();
      // Moons crowd their planets far out: name them only when there is room.
      const parentAt = body.orbit && body.kind === 'moon' && world.bodies[body.orbit.parent]?.kind === 'planet' ? toScreen(states[body.orbit.parent]!) : null;
      if (!parentAt || Math.hypot(parentAt.x - at.x, parentAt.y - at.y) > 40) {
        ctx.fillStyle = '#6a988f';
        ctx.fillText(body.name.toUpperCase(), at.x + r + 5, at.y);
      }
    }

    // Ports: small diamonds, named; the nav target bright.
    this.drawn = [];
    const ports = Object.values(world.stations);
    for (const station of ports) {
      const at = toScreen(station.position);
      if (at.x < -50 || at.y < -50 || at.x > w + 50 || at.y > h + 50) continue;
      this.drawn.push({ id: station.id, ...at });
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

    // You, and the line of a burn to the nav target.
    if (ship) {
      const me = toScreen(ship.position);
      const target = targetStationId ? world.stations[targetStationId] : undefined;
      if (target) {
        const to = toScreen(target.position);
        ctx.strokeStyle = '#dffbf3';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(me.x, me.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        // The flip, halfway.
        const mid = { x: (me.x + to.x) / 2, y: (me.y + to.y) / 2 };
        ctx.strokeStyle = '#e0a458';
        ctx.beginPath();
        ctx.moveTo(mid.x - 5, mid.y - 5);
        ctx.lineTo(mid.x + 5, mid.y + 5);
        ctx.moveTo(mid.x + 5, mid.y - 5);
        ctx.lineTo(mid.x - 5, mid.y + 5);
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

    this.renderPlan(world, ship, targetStationId ? (world.stations[targetStationId] ?? null) : null);
  }

  /** The plan's parts, built once and updated in place, so BURN is never replaced under the pointer mid-click. */
  private planParts: { to: HTMLElement; grid: HTMLElement; values: HTMLElement[]; note: HTMLElement; go: HTMLButtonElement } | null = null;

  private renderPlan(world: World, ship: Ship | null, target: Station | null): void {
    if (!this.planParts) {
      const to = el('p', 'chart-plan-to');
      const grid = el('div', 'chart-plan-grid');
      const values = ['DISTANCE', 'TIME', 'FLIP AT', 'PEAK', 'BURNS AT'].map((k) => {
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
    const plotted = Boolean(ship && target);
    parts.grid.classList.toggle('hidden', !plotted);
    parts.go.classList.toggle('hidden', !plotted);
    if (!ship || !target) {
      set(parts.to, '');
      set(parts.note, 'Click a port to plot a burn to it.');
      return;
    }
    const accel = burnAcceleration(world, ship);
    const plan = burnPlan(ship.position, target, accel);
    set(parts.to, target.name.toUpperCase());
    const shown = [bigDistance(plan.distance), minutesSeconds(plan.seconds), minutesSeconds(plan.flipSeconds), `${Math.round(plan.peakSpeed).toLocaleString('en-GB')} u/s`, `${accel.toLocaleString('en-GB')} u/s²`];
    parts.values.forEach((node, i) => set(node, shown[i]!));
    const tooClose = plan.distance < 20_000;
    set(parts.note, tooClose ? 'Close enough to fly there.' : 'Weapons, locks and docking are off while burning.');
    set(parts.go, ship.burn ? 'BURNING' : 'BURN · U');
    parts.go.disabled = tooClose || Boolean(ship.burn) || ship.state !== 'flying';
  }

}
