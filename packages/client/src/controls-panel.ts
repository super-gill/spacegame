import { FLIGHT_MODES, FLIGHT_MODE_LABELS, type FlightMode } from '@spacegame/sim';
import { KEY_BINDINGS, POINTER_CONTROLS, isMouseCode, keyName } from './bindings.js';
import type { Tier } from './hud/warnings.js';

/**
 * Developer controls panel: the steering choice (mouse or keys), then
 * every control in the game, generated from bindings.ts so it is always
 * accurate. Toggled with F1 or ` or the
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

/** The two steering schemes, as the Controls panel offers them. */
const STEERING_CHOICES: readonly { mouse: boolean; label: string; note: string }[] = [
  { mouse: true, label: 'Steer with the mouse', note: 'The nose follows the pointer; A and D strafe; left button fires, right click locks.' },
  { mouse: false, label: 'Steer with the keys', note: 'A and D spin the ship; Space fires; left click locks.' },
];

export class ControlsPanel {
  private readonly panel: HTMLDivElement;
  /** The steering choice at the top of the panel, once `offerSteering` has placed it. */
  private steeringRadios: HTMLInputElement[] = [];

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

  /**
   * Put the steering choice at the top of the panel (the same setting as
   * the menu's checkbox): `mouse` is the current scheme, `choose` saves a
   * new one. Called once settings are loaded.
   */
  offerSteering(mouse: boolean, choose: (mouse: boolean) => void): void {
    const box = el('fieldset', 'steering');
    box.append(el('legend', undefined, 'Steering'));
    this.steeringRadios = STEERING_CHOICES.map((c) => {
      const row = el('label', 'steering-choice');
      const radio = el('input');
      radio.type = 'radio';
      radio.name = 'steering';
      radio.checked = c.mouse === mouse;
      radio.addEventListener('change', () => radio.checked && choose(c.mouse));
      row.append(radio, el('strong', undefined, ` ${c.label}`), el('span', 'note', ` ${c.note}`));
      box.append(row);
      return radio;
    });
    this.panel.querySelector('.controls-header')!.after(box);
  }

  /**
   * The warning sounds' volume and an off switch, below the steering
   * choice, with a button per tier to hear them. `change` saves the
   * setting; `hear` plays a tier's sound.
   */
  offerSound(volume: number, muted: boolean, change: (volume: number, muted: boolean) => void, hear: (tier: Tier) => void): void {
    const box = el('fieldset', 'steering sound');
    box.append(el('legend', undefined, 'Warning sounds'));
    const slider = el('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = String(Math.round(volume * 100));
    slider.setAttribute('aria-label', 'Warning volume');
    const off = el('input');
    off.type = 'checkbox';
    off.checked = muted;
    const save = () => change(Number(slider.value) / 100, off.checked);
    slider.addEventListener('input', save);
    off.addEventListener('change', save);
    const volumeRow = el('label', 'steering-choice');
    volumeRow.append(el('strong', undefined, 'Volume '), slider);
    const offRow = el('label', 'steering-choice');
    offRow.append(off, el('strong', undefined, ' Sounds off'));
    const tryRow = el('div', 'steering-choice');
    tryRow.append(el('span', 'note', 'Hear: '));
    for (const tier of ['advisory', 'caution', 'warning', 'alarm'] as const) {
      const b = el('button', 'sound-try', tier);
      b.type = 'button';
      b.addEventListener('click', () => hear(tier));
      tryRow.append(b);
    }
    box.append(volumeRow, offRow, tryRow);
    (this.panel.querySelector('.steering:not(.sound)') ?? this.panel.querySelector('.controls-header')!).after(box);
  }

  /** Show the steering scheme chosen elsewhere (the menu). */
  showSteering(mouse: boolean): void {
    this.steeringRadios.forEach((r, i) => (r.checked = STEERING_CHOICES[i]!.mouse === mouse));
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
