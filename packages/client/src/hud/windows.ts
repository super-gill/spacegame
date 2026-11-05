import { el, show } from './dom.js';

/**
 * Windows (docs/controls.md, "Windows"): one pattern for every small
 * in-flight panel, so they open, close, move and remember themselves the
 * same way.
 *
 * - Each window has a key and a button on the launcher strip, so a mouse
 *   alone reaches every one.
 * - A title bar with the window's name and key, and a close button. Drag
 *   the title bar to move it; the place is remembered in this browser.
 * - Esc closes the window on top (main.ts asks `closeTop` first).
 * - Several can be open at once; clicking one brings it to the front.
 * - A window never opens itself: only its key or its launcher button do.
 *
 * Big screens (station services, the menu, controls) are not windows yet;
 * they move onto this with the next interface pass.
 */

/** Where a window was left, and whether it was open, per window id. */
interface Remembered {
  x: number;
  y: number;
  open: boolean;
}

const STORAGE_KEY = 'spacegame.windows';

function loadPlaces(): Record<string, Remembered> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, Remembered>) : {};
  } catch {
    return {};
  }
}

function savePlaces(places: Record<string, Remembered>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
  } catch {
    // Storage blocked or full: windows still work, they just forget.
  }
}

export class HudWindow {
  readonly root = el('section', 'hud-window hidden');
  /** Where the window's own content goes. */
  readonly body = el('div', 'hud-window-body');
  private readonly launcherButton: HTMLButtonElement;
  private isOpen = false;

  constructor(
    private readonly manager: WindowManager,
    readonly id: string,
    title: string,
    keyLabel: string,
    private place: { x: number; y: number },
  ) {
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', title);
    const bar = el('header', 'hud-window-bar');
    const name = el('span', 'hud-window-title', `${title.toUpperCase()} · ${keyLabel}`);
    const close = el('button', 'hud-window-close', '✕') as HTMLButtonElement;
    close.type = 'button';
    close.title = `Close ${title} (Esc)`;
    close.setAttribute('aria-label', `Close ${title}`);
    close.addEventListener('click', () => this.close());
    bar.append(name, close);
    this.root.append(bar, this.body);
    this.root.addEventListener('pointerdown', () => manager.front(this));
    this.dragBy(bar);

    this.launcherButton = el('button', 'hud-launcher-button') as HTMLButtonElement;
    this.launcherButton.type = 'button';
    this.launcherButton.title = `${title} (${keyLabel})`;
    this.launcherButton.setAttribute('aria-label', `${title} (${keyLabel})`);
    this.launcherButton.append(el('span', 'hud-launcher-key', keyLabel), el('span', 'hud-launcher-name', title.toUpperCase()));
    this.launcherButton.addEventListener('click', () => this.toggle());
    const saved = manager.remembered(id);
    if (saved) this.place = { x: saved.x, y: saved.y };
    this.moveTo(this.place.x, this.place.y);
    if (saved?.open) this.open();
  }

  get launcher(): HTMLButtonElement {
    return this.launcherButton;
  }

  get opened(): boolean {
    return this.isOpen;
  }

  open(): void {
    this.isOpen = true;
    show(this.root, true);
    this.launcherButton.classList.add('active');
    this.manager.front(this);
    this.manager.remember(this.id, { ...this.place, open: true });
  }

  close(): void {
    this.isOpen = false;
    show(this.root, false);
    this.launcherButton.classList.remove('active');
    this.manager.remember(this.id, { ...this.place, open: false });
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  /** Keep the window on screen whatever the viewport did since. */
  private moveTo(x: number, y: number): void {
    const maxX = Math.max(0, window.innerWidth - 120);
    const maxY = Math.max(0, window.innerHeight - 40);
    this.place = { x: Math.round(Math.max(0, Math.min(maxX, x))), y: Math.round(Math.max(0, Math.min(maxY, y))) };
    this.root.style.left = `${this.place.x}px`;
    this.root.style.top = `${this.place.y}px`;
  }

  private dragBy(handle: HTMLElement): void {
    let from: { x: number; y: number; px: number; py: number } | null = null;
    handle.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('button')) return;
      from = { x: this.place.x, y: this.place.y, px: e.clientX, py: e.clientY };
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    handle.addEventListener('pointermove', (e) => {
      if (from) this.moveTo(from.x + e.clientX - from.px, from.y + e.clientY - from.py);
    });
    const end = (): void => {
      if (!from) return;
      from = null;
      this.manager.remember(this.id, { ...this.place, open: this.isOpen });
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }
}

/** Owns the windows: their order, the launcher strip, and what they remember. */
export class WindowManager {
  private readonly windows: HudWindow[] = [];
  /** Front-most last. */
  private order: HudWindow[] = [];
  private readonly launcherStrip = el('nav', 'hud-launcher');
  private readonly places = loadPlaces();

  constructor(private readonly parent: HTMLElement) {
    this.launcherStrip.setAttribute('aria-label', 'Windows');
    parent.append(this.launcherStrip);
  }

  /** A new window, added to the launcher strip. `place` is where it first opens. */
  add(id: string, title: string, keyLabel: string, place: { x: number; y: number }): HudWindow {
    const w = new HudWindow(this, id, title, keyLabel, place);
    this.windows.push(w);
    this.parent.append(w.root);
    this.launcherStrip.append(w.launcher);
    return w;
  }

  /** Close the front-most open window. False if none was open. */
  closeTop(): boolean {
    const top = [...this.order].reverse().find((w) => w.opened);
    if (!top) return false;
    top.close();
    return true;
  }

  /** Show or hide the strip (hidden while docked, when station services take over). */
  showLauncher(visible: boolean): void {
    show(this.launcherStrip, visible);
  }

  front(w: HudWindow): void {
    this.order = [...this.order.filter((o) => o !== w), w];
    this.order.forEach((o, i) => (o.root.style.zIndex = String(20 + i)));
  }

  remembered(id: string): Remembered | undefined {
    return this.places[id];
  }

  remember(id: string, place: Remembered): void {
    this.places[id] = place;
    savePlaces(this.places);
  }
}
