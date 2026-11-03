import { FLIGHT_MODES, FLIGHT_MODE_LABELS, type FlightMode } from '@spacegame/sim';
import { KEY_BINDINGS, POINTER_CONTROLS, isMouseCode, keyName } from './bindings.js';

/**
 * Developer controls panel: lists every control in the game, generated
 * from bindings.ts so it is always accurate. Toggled with F1 or ` or the
 * button in the top right. Intended to become part of a proper settings
 * menu later; for now it is a testing aid.
 */

const MODE_NOTES: Record<FlightMode, string> = {
  assisted: 'Stops spin when Q/E are released and eases drift to a stop on any axis you are not thrusting along.',
  rotation: 'Stops spin when Q/E are released. Drift is left alone.',
  manual: 'Pure Newtonian. Nothing fires unless you fire it.',
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function keyChips(codes: readonly string[]): HTMLElement {
  const cell = el('td', 'keys');
  codes.forEach((code, i) => {
    if (i > 0) cell.append(el('span', 'or', ' or '));
    cell.append(el('kbd', isMouseCode(code) ? 'mouse' : undefined, keyName(code)));
  });
  return cell;
}

export class ControlsPanel {
  private readonly panel: HTMLDivElement;

  constructor(root: HTMLElement, button: HTMLButtonElement) {
    this.panel = el('div', 'controls-panel hidden');
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-label', 'Controls');
    this.build();
    root.append(this.panel);
    button.addEventListener('click', () => this.toggle());
  }

  toggle(): void {
    this.panel.classList.toggle('hidden');
  }

  private build(): void {
    const header = el('div', 'controls-header');
    header.append(el('h1', undefined, 'Controls'), el('span', 'tag', 'dev'));
    this.panel.append(header);

    // Preserve first-seen group order across keys and pointer controls.
    const groups: string[] = [];
    for (const g of [...KEY_BINDINGS.map((b) => b.group), ...POINTER_CONTROLS.map((p) => p.group)]) {
      if (!groups.includes(g)) groups.push(g);
    }

    const table = el('table');
    for (const group of groups) {
      const head = el('tr', 'group');
      const th = el('th', undefined, group);
      th.colSpan = 3;
      head.append(th);
      table.append(head);

      for (const b of KEY_BINDINGS.filter((k) => k.group === group)) {
        const row = el('tr');
        row.append(keyChips(b.codes), el('td', undefined, b.label), el('td', 'note', b.note ?? ''));
        table.append(row);
      }
      for (const p of POINTER_CONTROLS.filter((k) => k.group === group)) {
        const row = el('tr');
        const keys = el('td', 'keys');
        keys.append(el('kbd', 'mouse', p.input));
        row.append(keys, el('td', undefined, p.label), el('td', 'note', ''));
        table.append(row);
      }
    }
    this.panel.append(table);

    const modes = el('div', 'modes');
    modes.append(el('h2', undefined, 'Flight modes'));
    for (const mode of FLIGHT_MODES) {
      const p = el('p');
      p.append(el('strong', undefined, FLIGHT_MODE_LABELS[mode]), document.createTextNode(`: ${MODE_NOTES[mode]}`));
      modes.append(p);
    }
    this.panel.append(modes);
  }
}
