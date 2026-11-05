import type { KickReason } from '@spacegame/sim';
import { el } from './dom.js';

/**
 * The connection meter (Jason: "a small dismissable connection meter
 * tucked away in a corner that changes colour based on latency"): the
 * round trip to the server in milliseconds, green, amber or red. Click it
 * to hide it; the menu brings it back. Remembered per browser.
 */

/** Round trips below this are good, ms. */
const GOOD_MS = 80;
/** Below this, playable but noticeable; above, poor. */
const FAIR_MS = 200;
const HIDDEN_KEY = 'spacegame.meterHidden';

export class ConnectionMeter {
  private readonly root = el('button', 'connection-meter');

  constructor(parent: HTMLElement) {
    this.root.type = 'button';
    this.root.title = 'Round trip to the server. Click to hide.';
    this.root.addEventListener('click', () => this.setHidden(true));
    this.root.hidden = readHidden();
    parent.append(this.root);
  }

  /** A new round trip measurement. */
  show(ms: number): void {
    const quality = ms < GOOD_MS ? 'good' : ms < FAIR_MS ? 'fair' : 'poor';
    this.root.dataset['quality'] = quality;
    this.root.textContent = `${Math.round(ms)} ms`;
  }

  setHidden(hidden: boolean): void {
    this.root.hidden = hidden;
    try {
      localStorage.setItem(HIDDEN_KEY, hidden ? '1' : '0');
    } catch {
      // Storage blocked: hidden for this session only.
    }
  }

  get hidden(): boolean {
    return this.root.hidden;
  }
}

function readHidden(): boolean {
  try {
    return localStorage.getItem(HIDDEN_KEY) === '1';
  } catch {
    return false;
  }
}

const WHY: Record<KickReason, string> = {
  loggedInElsewhere: 'This character logged in somewhere else, so this tab was disconnected.',
  serverClosing: 'The server is shutting down.',
};

/** The connection is gone: say why, with a way back in. */
export function showDisconnected(reason: KickReason | null): void {
  const screen = el('div', 'login-screen');
  const box = el('div', 'login-box');
  box.append(el('h1', undefined, 'Disconnected'), el('p', undefined, reason ? WHY[reason] : 'Lost the connection to the server.'));
  const again = el('button', 'login-primary', 'Back to character select') as HTMLButtonElement;
  again.type = 'button';
  again.addEventListener('click', () => location.reload());
  box.append(again);
  screen.append(box);
  document.body.append(screen);
}
