import type { Ship, World } from '@spacegame/sim';
import { distance, shipStats } from '@spacegame/sim';
import { el, setText } from './dom.js';
import { arrivalSeconds, clockWords, closingSpeed, lockWords, PLOT_COLUMNS, PLOT_PRESETS, plotPosition, plotRows, plotView, type PlotColumnId, type PlotKind, type PlotRow } from './plot-rows.js';
import type { HudWindow } from './windows.js';

/**
 * The Plot (docs/interface.md, section 3; the name is the lore's): a
 * sortable list of what is around you, in a window (P). Tabs are presets
 * (plot-rows.ts), column heads sort. Click a row to select it and make it
 * the nav target; right-click a ship or rock to lock it, or to make a
 * lock you hold active, as on screen.
 *
 * Rows are kept by id and updated in place a few times a second, so a
 * row under the pointer does not jump away mid-click.
 */

/** What the nav target is: a row's kind and id. Kept by the client; the sim has no nav target. */
export interface NavTarget {
  kind: PlotKind;
  id: string;
}

/** How often the list is rebuilt, ms. */
const REFRESH_MS = 250;
const STORAGE_KEY = 'spacegame.plot';

interface RowEls {
  root: HTMLButtonElement;
  cells: Record<PlotColumnId, HTMLSpanElement>;
}

export class Plot {
  private readonly summary = el('div', 'hud-plot-summary hud-dim');
  private readonly tabs = el('div', 'hud-plot-tabs');
  private readonly heads = el('div', 'hud-plot-heads');
  private readonly list = el('div', 'hud-plot-list');
  private readonly empty = el('p', 'hud-dim hud-plot-empty', 'Nothing here.');
  private readonly navLine = el('span', 'hud-plot-nav');
  private tab = PLOT_PRESETS[0]!.id;
  private sort: PlotColumnId = 'dist';
  private readonly rowEls = new Map<string, RowEls>();
  private lastBuild = -Infinity;
  /** The row ids in the order last shown, to skip reordering when nothing moved. */
  private order = '';
  /** The client's nav target (main.ts owns it); the Plot shows it and sets it. */
  navTarget: NavTarget | null = null;

  constructor(
    private readonly window: HudWindow,
    private readonly onSelect: (target: NavTarget) => void,
    private readonly onLock: (id: string) => void,
  ) {
    window.root.classList.add('hud-plot-window');
    this.restore();
    const foot = el('div', 'hud-plot-foot');
    foot.append(el('span', 'hud-dim', 'CLICK SELECT · RIGHT-CLICK LOCK'), this.navLine);
    this.buildTabs();
    this.buildHeads();
    this.list.setAttribute('role', 'list');
    window.body.classList.add('hud-plot-body');
    window.body.append(this.summary, this.tabs, this.heads, this.list, this.empty, foot);
  }

  toggle(): void {
    this.window.toggle();
  }

  /** Refresh, at most every REFRESH_MS unless something the pilot did asks for it now (`force`). */
  update(world: World, ship: Ship | null, pilotId: string, nowMs: number, force = false): void {
    if (!this.window.opened || !ship) return;
    if (!force && nowMs - this.lastBuild < REFRESH_MS) return;
    this.lastBuild = nowMs;

    const all = plotRows(world, ship, pilotId);
    const preset = PLOT_PRESETS.find((p) => p.id === this.tab) ?? PLOT_PRESETS[0]!;
    const rows = plotView(all, preset, this.sort, this.order ? this.order.split(' ') : []);
    const range = shipStats(world, ship).sensorRange;
    setText(this.summary, `${rows.length} ${rows.length === 1 ? 'CONTACT' : 'CONTACTS'} · RADAR ${range.toLocaleString('en-GB')} u`);
    this.empty.classList.toggle('hidden', rows.length > 0);

    const seen = new Set<string>();
    for (const row of rows) {
      seen.add(row.id);
      const els = this.rowEls.get(row.id) ?? this.makeRow(row.id);
      this.fill(els, row);
    }
    for (const [id, els] of this.rowEls) {
      if (seen.has(id)) continue;
      els.root.remove();
      this.rowEls.delete(id);
    }
    const order = rows.map((r) => r.id).join(' ');
    if (order !== this.order) {
      this.order = order;
      this.list.append(...rows.map((r) => this.rowEls.get(r.id)!.root));
    }
    setText(this.navLine, navWords(world, ship, this.navTarget, all));
  }

  private makeRow(id: string): RowEls {
    const root = el('button', 'hud-plot-row') as HTMLButtonElement;
    root.type = 'button';
    root.setAttribute('role', 'listitem');
    root.dataset['id'] = id;
    const cells = {} as Record<PlotColumnId, HTMLSpanElement>;
    for (const col of PLOT_COLUMNS) {
      cells[col.id] = el('span', `hud-plot-cell ${col.id}${col.align === 'right' ? ' right' : ''}`);
      root.append(cells[col.id]);
    }
    root.style.gridTemplateColumns = GRID;
    root.addEventListener('click', () => {
      const kind = root.dataset['kind'] as PlotKind | undefined;
      if (kind) this.onSelect({ kind, id });
    });
    root.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (root.dataset['lockable'] === 'yes') this.onLock(id);
    });
    const els = { root, cells };
    this.rowEls.set(id, els);
    return els;
  }

  private fill(els: RowEls, row: PlotRow): void {
    const r = els.root;
    if (r.dataset['kind'] !== row.kind) r.dataset['kind'] = row.kind;
    if (r.dataset['side'] !== row.side) r.dataset['side'] = row.side;
    const lockable = row.lockable ? 'yes' : 'no';
    if (r.dataset['lockable'] !== lockable) r.dataset['lockable'] = lockable;
    const lock = row.lock ?? (row.dark ? 'dark' : '');
    if (r.dataset['lock'] !== lock) r.dataset['lock'] = lock;
    r.classList.toggle('selected', this.navTarget?.id === row.id);
    setText(els.cells.dist, Math.round(row.dist).toLocaleString('en-GB'));
    setText(els.cells.type, row.type);
    setText(els.cells.name, row.name);
    const close = Math.round(row.closing);
    setText(els.cells.closing, close === 0 ? '0' : `${close > 0 ? '+' : ''}${close}`);
    setText(els.cells.lock, lockWords(row));
    const label = `${row.name}, ${row.type}, ${Math.round(row.dist)} units${row.lock ? `, ${lockWords(row).toLowerCase()}` : ''}`;
    if (r.getAttribute('aria-label') !== label) r.setAttribute('aria-label', label);
  }

  private buildTabs(): void {
    this.tabs.setAttribute('role', 'tablist');
    const buttons = PLOT_PRESETS.map((p) => {
      const b = el('button', 'hud-plot-tab', p.label) as HTMLButtonElement;
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.addEventListener('click', () => {
        this.tab = p.id;
        this.save();
        for (const [i, other] of buttons.entries()) setSelected(other, PLOT_PRESETS[i]!.id === this.tab);
        this.lastBuild = -Infinity;
      });
      setSelected(b, p.id === this.tab);
      return b;
    });
    this.tabs.append(...buttons);
  }

  private buildHeads(): void {
    this.heads.style.gridTemplateColumns = GRID;
    const buttons = PLOT_COLUMNS.map((c) => {
      const b = el('button', `hud-plot-head${c.align === 'right' ? ' right' : ''}`) as HTMLButtonElement;
      b.type = 'button';
      b.title = `Sort by ${c.label.toLowerCase()}`;
      b.addEventListener('click', () => {
        this.sort = c.id;
        this.save();
        paint();
        this.lastBuild = -Infinity;
      });
      return b;
    });
    const paint = (): void => {
      PLOT_COLUMNS.forEach((c, i) => {
        const b = buttons[i]!;
        const on = c.id === this.sort;
        b.textContent = on ? `${c.label} ▾` : c.label;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });
    };
    paint();
    this.heads.append(...buttons);
  }

  private restore(): void {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
      if (typeof saved !== 'object' || saved === null) return;
      const s = saved as Record<string, unknown>;
      if (typeof s['tab'] === 'string' && PLOT_PRESETS.some((p) => p.id === s['tab'])) this.tab = s['tab'];
      if (typeof s['sort'] === 'string' && PLOT_COLUMNS.some((c) => c.id === s['sort'])) this.sort = s['sort'] as PlotColumnId;
    } catch {
      // Nothing saved, or storage blocked: the defaults.
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tab: this.tab, sort: this.sort }));
    } catch {
      // Storage blocked: the Plot forgets its tab, nothing more.
    }
  }
}

/** The grid every row and the head row share, from the column widths. */
const GRID = PLOT_COLUMNS.map((c) => (c.width === 'fill' ? 'minmax(0, 1fr)' : `${c.width}px`)).join(' ');

function setSelected(b: HTMLButtonElement, on: boolean): void {
  b.classList.toggle('active', on);
  b.setAttribute('aria-selected', String(on));
}

/** The footer's nav line: what the nav target is and when you get there at this closing speed. */
export function navWords(world: World, ship: Ship, target: NavTarget | null, rows: readonly PlotRow[]): string {
  if (!target) return 'NO NAV TARGET';
  const where = plotPosition(world, target.kind, target.id);
  if (!where) return 'NAV TARGET LOST';
  const row = rows.find((r) => r.id === target.id);
  const name = row?.name ?? 'Nav target';
  const closing = closingSpeed(ship.position, ship.velocity, where.position, where.velocity);
  return `NAV ${name} · ${clockWords(arrivalSeconds(distance(ship.position, where.position), closing))}`;
}
