import { bodyStates, burnAcceleration, burnPlan, burnableBody, laneLegs, railTime, relayNet, securityAt, worldLanes, RELAY_RANGE, type BurnPlan, type RelayNet, type SecurityReading, type Ship, type Station, type StationHolder, type World } from '@spacegame/sim';
import { POWER_COLOUR } from '../render/ship-art.js';
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
 * that is larger. The Accord lanes are drawn as the mockup's wide, faint
 * bands between their ports, named once each. With 31 ports, names are
 * placed by priority and skipped where they would overlap one already
 * placed: the nav target first, then capitals and free ports, worlds,
 * navy yards, other ports, moons, and the lanes' own names last; zoom in
 * and the rest appear. Security shading comes with the Relay (slice 2,
 * push 3).
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

/** The lanes' bands, from the approved mockup. */
const LANE_COLOUR = 'rgba(159, 211, 199, 0.16)';
const LANE_WIDTH = 14;
const LANE_LABEL_COLOUR = 'rgba(159, 211, 199, 0.55)';

/**
 * A name to place on the chart beside a mark at (`x`, `y`) of size `r`:
 * lower `priority` is placed first. `style` says where it may go:
 * beside a world (right, then left) or a port (above right, below right,
 * above left).
 */
interface Label {
  text: string;
  x: number;
  y: number;
  r: number;
  style: 'world' | 'port' | 'free';
  colour: string;
  priority: number;
}

/** Something drawn that names must not cover: a centre and a half-size, in pixels. */
interface Mark {
  x: number;
  y: number;
  r: number;
}

/** How early a port's name is placed: the worlds come first (priority 1), capitals and free ports next, navy yards, then the rest. */
function portPriority(station: Pick<Station, 'rank'>): number {
  if (station.rank === 'capital' || station.rank === 'freePort') return 2;
  if (station.rank === 'navalYard') return 3;
  return 4;
}

/** Where a label of `width` may go, best first: the left edge of its text and its middle line. */
function spots(label: Label, width: number): { x: number; y: number }[] {
  const { x, y, r } = label;
  if (label.style === 'world') return [{ x: x + r + 5, y }, { x: x - r - 5 - width, y }, { x: x - width / 2, y: y - r - 10 }, { x: x - width / 2, y: y + r + 10 }];
  if (label.style === 'port') return [{ x: x + 10, y: y - 14 }, { x: x + 10, y: y + 14 }, { x: x - 10 - width, y: y - 14 }, { x: x - 10 - width, y: y + 14 }];
  return [{ x, y }];
}

/**
 * Draw `labels` best first, each at the first of its spots that lies
 * inside the chart and clear of every name already drawn; a name with no
 * such spot is left off. A crowded place shows its most important names,
 * and zooming in shows the rest.
 */
function placeLabels(ctx: CanvasRenderingContext2D, labels: Label[], marks: readonly Mark[], w: number, h: number): void {
  // The marks themselves (worlds, ports, you) are in the way from the start: a name never covers one.
  const placed: { x0: number; y0: number; x1: number; y1: number }[] = marks.map((m) => ({ x0: m.x - m.r, y0: m.y - m.r, x1: m.x + m.r, y1: m.y + m.r }));
  const pad = 3;
  for (const label of labels.slice().sort((a, b) => a.priority - b.priority)) {
    const width = ctx.measureText(label.text).width;
    for (const spot of spots(label, width)) {
      const box = { x0: spot.x - pad, y0: spot.y - 7 - pad, x1: spot.x + width + pad, y1: spot.y + 7 + pad };
      if (box.x0 < 0 || box.y0 < 0 || box.x1 > w || box.y1 > h) continue;
      if (placed.some((p) => box.x0 < p.x1 && box.x1 > p.x0 && box.y0 < p.y1 && box.y1 > p.y0)) continue;
      placed.push(box);
      ctx.fillStyle = label.colour;
      ctx.fillText(label.text, spot.x, spot.y);
      break;
    }
  }
}

/** Security's colours: Core teal, Held the holder's (the Accord's and nobody's a muted teal), Contested amber. Open is not drawn. */
const CORE_RGB: readonly [number, number, number] = [159, 211, 199];
const HELD_NEUTRAL_RGB: readonly [number, number, number] = [106, 152, 143];
const CONTESTED_RGB: readonly [number, number, number] = [224, 164, 88];
/** How strongly a buoy's reach is filled, 0 to 1. Faint: the chart is read over it. */
const FILL_ALPHA = { core: 0.09, held: 0.1, contested: 0.14 } as const;
/** Ports wear level rings until a buoy's reach is this many pixels across; past that the circles show it. */
const RING_UNTIL_PX = 30;

function rgbOf(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function holderRgb(holder: StationHolder | null): readonly [number, number, number] {
  return holder && holder !== 'accord' && holder !== 'clans' ? rgbOf(POWER_COLOUR[holder]) : HELD_NEUTRAL_RGB;
}

/** The colour a reading is shown in. */
function levelRgb(r: Pick<SecurityReading, 'level' | 'holder'>): readonly [number, number, number] {
  return r.level === 'core' ? CORE_RGB : r.level === 'contested' ? CONTESTED_RGB : holderRgb(r.holder);
}

/** What the chart draws for the Relay: buoys grouped by fill colour, and each port's ring. Built when the ports move. */
interface RelayDrawing {
  stations: World['stations'];
  net: RelayNet;
  groups: { fill: string; buoys: { x: number; y: number }[] }[];
  ports: { at: { x: number; y: number }; fill: string; stroke: string }[];
}

/** Read every buoy and port once and group the buoys by colour, so a frame is a few fills. */
function relayDrawing(world: World): RelayDrawing {
  const net = relayNet(world);
  const groups = new Map<string, { x: number; y: number }[]>();
  for (const node of net.nodes) {
    const r = securityAt(net, node.at);
    if (r.level === 'open') continue;
    const rgb = levelRgb(r);
    const fill = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${FILL_ALPHA[r.level]})`;
    const list = groups.get(fill) ?? [];
    list.push(node.at);
    groups.set(fill, list);
  }
  const ports: RelayDrawing['ports'] = [];
  for (const station of Object.values(world.stations)) {
    const r = securityAt(net, station.position);
    if (r.level === 'open') continue;
    const rgb = levelRgb(r);
    ports.push({ at: station.position, fill: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.07)`, stroke: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.55)` });
  }
  return { stations: world.stations, net, groups: [...groups].map(([fill, buoys]) => ({ fill, buoys })), ports };
}

/** Names for whoever holds a place, for the screen. */
const HOLDER_WORDS: Record<StationHolder, string> = { earth: 'EARTH', mars: 'MARS', venus: 'VENUS', belt: 'THE BELT', aurel: 'THE AUREL', accord: 'THE ACCORD', clans: 'THE CLANS' };

/** "CORE · THE ACCORD", "HELD · MARS", "CONTESTED", "OPEN · NOBODY HEARS". */
export function securityWords(r: SecurityReading): string {
  if (r.level === 'open') return 'OPEN · NOBODY HEARS';
  if (r.level === 'contested') return 'CONTESTED';
  return `${r.level.toUpperCase()}${r.holder ? ` · ${HOLDER_WORDS[r.holder]}` : ''}`;
}

/** The key, bottom left, as in the mockup: the lanes, security, and the port marks. */
function drawLegend(ctx: CanvasRenderingContext2D, h: number, lanes: boolean): void {
  if (!lanes) return;
  const y = h - 18;
  // Each level as the ring a port wears.
  const swatch = (x: number, rgb: readonly [number, number, number], _alpha: number, text: string): number => {
    ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.18)`;
    ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.8)`;
    ctx.setLineDash([2, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + 6, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#9fd3c7';
    ctx.fillText(text, x + 18, y);
    return x + 18 + ctx.measureText(text).width + 22;
  };
  ctx.fillStyle = LANE_COLOUR;
  ctx.fillRect(14, y - 3, 18, 6);
  ctx.fillStyle = '#9fd3c7';
  ctx.fillText('ACCORD LANE', 38, y);
  let x = 38 + ctx.measureText('ACCORD LANE').width + 22;
  x = swatch(x, CORE_RGB, 0.45, 'CORE');
  x = swatch(x, rgbOf(POWER_COLOUR.mars), 0.45, 'HELD, IN ITS HOLDER\'S COLOUR');
  x = swatch(x, CONTESTED_RGB, 0.5, 'CONTESTED');
  ctx.fillStyle = '#6a988f';
  ctx.fillText('UNSHADED · OPEN', x, y);
  x += ctx.measureText('UNSHADED · OPEN').width + 30;
  // Port marks: a capital or free port, and any other port.
  const diamond = (cx: number, d: number, colour: string): void => {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(cx, y - d);
    ctx.lineTo(cx + d, y);
    ctx.lineTo(cx, y + d);
    ctx.lineTo(cx - d, y);
    ctx.closePath();
    ctx.fill();
  };
  diamond(x, 6, '#9fd3c7');
  ctx.fillStyle = '#9fd3c7';
  ctx.fillText('CAPITAL OR FREE PORT', x + 12, y);
  diamond(x + 190, 4, '#6a988f');
  ctx.fillStyle = '#9fd3c7';
  ctx.fillText('PORT', x + 202, y);
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
  /** Where you are, in the header: the security level and who holds it. */
  private readonly here = el('span', 'chart-here');
  /** The Relay and what to draw for it, worked out once per set of port positions. */
  private relay: RelayDrawing | null = null;
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
    head.append(el('span', 'chart-title', 'CHART · SOL · M'), this.here);
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

    // Security, under everything: each buoy's reach as a translucent circle in the colour of its reading,
    // one fill per colour so overlaps do not stack. The readings are worked out when the ports move, not per frame.
    const relay = this.relayFor(world);
    if (relay) {
      const reach = RELAY_RANGE * scale;
      for (const group of relay.groups) {
        ctx.fillStyle = group.fill;
        ctx.beginPath();
        for (const at of group.buoys) {
          const p = toScreen(at);
          if (p.x < -reach || p.y < -reach || p.x > w + reach || p.y > h + reach) continue;
          ctx.moveTo(p.x + reach, p.y);
          ctx.arc(p.x, p.y, reach, 0, Math.PI * 2);
        }
        ctx.fill();
      }
      // Zoomed out a buoy's reach is a speck: each port wears the mockup's dashed ring in its level's colour instead.
      if (reach < RING_UNTIL_PX) {
        ctx.setLineDash([2, 4]);
        ctx.lineWidth = 1;
        for (const port of relay.ports) {
          const at = toScreen(port.at);
          if (at.x < -60 || at.y < -60 || at.x > w + 60 || at.y > h + 60) continue;
          ctx.strokeStyle = port.stroke;
          ctx.fillStyle = port.fill;
          ctx.beginPath();
          ctx.arc(at.x, at.y, Math.max(reach, 11), 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }
    }

    // The Accord lanes: wide faint bands under everything else, as in the mockup.
    const labels: Label[] = [];
    ctx.strokeStyle = LANE_COLOUR;
    ctx.lineWidth = LANE_WIDTH;
    ctx.lineCap = 'round';
    for (const lane of worldLanes(world)) {
      const legs = laneLegs(lane, world.stations);
      if (legs.length === 0) continue;
      ctx.beginPath();
      for (const leg of legs) {
        const a = toScreen(leg.from);
        const b = toScreen(leg.to);
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();
      // Its name once, at the middle of its longest leg on screen, if that leg is long enough to carry it.
      const longest = legs.map((leg) => ({ a: toScreen(leg.from), b: toScreen(leg.to) })).sort((m, n) => Math.hypot(n.b.x - n.a.x, n.b.y - n.a.y) - Math.hypot(m.b.x - m.a.x, m.b.y - m.a.y))[0]!;
      if (Math.hypot(longest.b.x - longest.a.x, longest.b.y - longest.a.y) > 140) {
        labels.push({ text: lane.name.toUpperCase(), x: (longest.a.x + longest.b.x) / 2 + 10, y: (longest.a.y + longest.b.y) / 2, r: 0, style: 'free', colour: LANE_LABEL_COLOUR, priority: 6 });
      }
    }
    ctx.lineCap = 'butt';

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
      labels.push({ text: body.name.toUpperCase(), x: at.x, y: at.y, r, style: 'world', colour: on ? '#dffbf3' : '#6a988f', priority: on ? 0 : body.kind === 'star' || body.kind === 'planet' ? 1 : 5 });
    }

    // Ports: small diamonds, named; the nav target bright.
    const ports = Object.values(world.stations);
    for (const station of ports) {
      const at = toScreen(station.position);
      if (at.x < -50 || at.y < -50 || at.x > w + 50 || at.y > h + 50) continue;
      this.drawn.push({ kind: 'station', id: station.id, ...at, r: 8 });
      const on = station.id === this.selectedId;
      // Capitals and free ports a size up, so the places that matter most read at a glance.
      const major = station.rank === 'capital' || station.rank === 'freePort';
      const d = major ? 6 : 4;
      ctx.fillStyle = on ? '#dffbf3' : major ? '#9fd3c7' : '#6a988f';
      ctx.beginPath();
      ctx.moveTo(at.x, at.y - d);
      ctx.lineTo(at.x + d, at.y);
      ctx.lineTo(at.x, at.y + d);
      ctx.lineTo(at.x - d, at.y);
      ctx.closePath();
      ctx.fill();
      labels.push({ text: station.name.toUpperCase(), x: at.x, y: at.y, r: d, style: 'port', colour: on ? '#dffbf3' : major ? '#9fd3c7' : '#6a988f', priority: on ? 0 : portPriority(station) });
    }

    // Names, best first, each only where it does not cover one already placed.
    // What a name must not cover: the planets and the Sun, capitals and free ports, and you. Small ports and moons may sit under text.
    const marks: Mark[] = [];
    for (const m of this.drawn) {
      if (m.kind === 'station') {
        const st = world.stations[m.id];
        if (st && (st.rank === 'capital' || st.rank === 'freePort')) marks.push({ x: m.x, y: m.y, r: 6 });
      } else if (world.bodies[m.id]?.kind === 'planet') marks.push({ x: m.x, y: m.y, r: m.r });
    }
    // The star sits at the origin and cannot be picked, so it is not among the drawn marks.
    if (Object.values(world.bodies).some((b) => b.kind === 'star')) marks.push({ x: sun.x, y: sun.y, r: 6 });
    if (ship) {
      const me = toScreen(ship.position);
      marks.push({ x: me.x, y: me.y, r: 7 }, { x: me.x + 24, y: me.y + 12, r: 7 });
    }
    placeLabels(ctx, labels, marks, w, h);
    drawLegend(ctx, h, worldLanes(world).length > 0);
    const reading = relay && ship ? securityAt(relay.net, ship.position) : null;
    const hereText = reading ? `YOU ARE IN ${securityWords(reading)}` : '';
    if (this.here.textContent !== hereText) this.here.textContent = hereText;
    this.here.dataset['level'] = reading?.level ?? '';

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

  /** The Relay for this world and how to draw it, rebuilt only when its ports have moved (the stations object is kept while nothing changes). */
  private relayFor(world: World): RelayDrawing | null {
    if (world.system !== 'sol') return null;
    if (this.relay?.stations !== world.stations) this.relay = relayDrawing(world);
    return this.relay;
  }

  /** The plan's parts, built once and updated in place, so BURN is never replaced under the pointer mid-click. */
  private planParts: { to: HTMLElement; grid: HTMLElement; values: HTMLElement[]; note: HTMLElement; go: HTMLButtonElement } | null = null;

  private renderPlan(world: World, ship: Ship | null, plan: BurnPlan | null): void {
    if (!this.planParts) {
      const to = el('p', 'chart-plan-to');
      const grid = el('div', 'chart-plan-grid');
      const values = ['DISTANCE', 'TIME', 'FLIP AT', 'PEAK', 'BURNS AT', 'ROUTE', 'ARRIVE IN'].map((k) => {
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
    const relay = this.relayFor(world);
    const arrive = relay ? securityWords(securityAt(relay.net, plan.route.points.at(-1) ?? plan.target.position)) : '--';
    const shown = [bigDistance(plan.distance), minutesSeconds(plan.seconds), minutesSeconds(plan.flipSeconds), `${Math.round(plan.peakSpeed).toLocaleString('en-GB')} u/s`, `${accel.toLocaleString('en-GB')} u/s²`, route, arrive];
    parts.values.forEach((node, i) => set(node, shown[i]!));
    const tooClose = plan.distance < 20_000;
    set(parts.note, tooClose ? 'Close enough to fly there.' : plan.target.kind === 'body' ? 'Ends above the well, at rest with the world. Weapons, locks and docking are off while burning.' : 'Weapons, locks and docking are off while burning.');
    set(parts.go, ship.burn ? 'BURNING' : 'BURN · U');
    parts.go.disabled = tooClose || Boolean(ship.burn) || ship.state !== 'flying';
  }

}
