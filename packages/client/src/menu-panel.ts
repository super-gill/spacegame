import type { WorldId } from '@spacegame/sim';

/**
 * Game menu (F2, or the Menu button): your character and key, the world
 * you are in and the way back to the mode screen, display settings, and,
 * for the host in the persistent world, admin controls for playtesting. The world
 * keeps running while it is open: it is shared. Buttons report to
 * main.ts, which sends them to the server.
 */

/** Who is playing in this tab, for the menu. */
export interface MenuCharacter {
  name: string;
  /** The key this browser holds for them, to show on request; null if it holds none. */
  key: string | null;
  /** The host's character: the admin controls show. */
  admin: boolean;
}

export interface MenuActions {
  setShowLabels(show: boolean): void;
  setMouseSteering(on: boolean): void;
  /** Back to character select, to play someone else in this tab. */
  switchCharacter(): void;
  /** Bring back the connection meter after it was clicked away. */
  showMeter(): void;
  /** Leave this world for the mode screen. */
  backToModes(): void;
  /** Arena world: end the fight now, back to the arena setup. */
  leaveFight(): void;
  /** Admin (testing): credits from nothing. */
  grantCredits(amount: number): void;
  /** Admin (testing): a free ship from any loadout, docked where you are. */
  spawnShip(loadoutId: string): void;
  /** Admin (testing): switch gravity on or off for the whole world. */
  setGravity(on: boolean): void;
  /** Admin (testing): start or stop the orbits for the whole world. */
  setOrbits(on: boolean): void;
  /** Admin (testing): how fast thrust pushes ships sideways or backwards, 0 to 1 of top speed. */
  setManoeuvreSpeed(share: number): void;
}

/** A loadout the admin spawner offers. */
export interface SpawnChoice {
  id: string;
  name: string;
}

/** Credit amounts the admin buttons grant. */
const GRANTS = [10_000, 100_000, 1_000_000];

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', undefined, label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

export class MenuPanel {
  private readonly panel = el('div', 'menu-panel hidden');
  private readonly labelsBox = el('input');
  private readonly gravityBox = el('input');
  private readonly steerBox = el('input');
  private readonly orbitsBox = el('input');
  private readonly manoeuvreSlider = el('input');
  private readonly manoeuvreValue = el('span');

  constructor(
    root: HTMLElement,
    openButton: HTMLButtonElement,
    character: MenuCharacter,
    world: WorldId,
    display: { showLabels: boolean; mouseSteering: boolean },
    actions: MenuActions,
    spawnChoices: readonly SpawnChoice[],
  ) {
    const showLabels = display.showLabels;
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-label', 'Menu');
    openButton.addEventListener('click', () => this.toggle());

    const header = el('div', 'controls-header');
    header.append(el('h1', undefined, 'Menu'));
    this.panel.append(header);

    // Character.
    this.panel.append(el('h2', undefined, 'Character'));
    this.panel.append(el('p', undefined, `Playing as ${character.name}.`));
    const keyRow = el('div', 'menu-row');
    const keyText = el('code', 'menu-key');
    keyText.hidden = true;
    const showKey = button('Show key', () => {
      keyText.hidden = !keyText.hidden;
      showKey.textContent = keyText.hidden ? 'Show key' : 'Hide key';
    });
    if (character.key) {
      keyText.textContent = character.key;
      keyRow.append(showKey, keyText);
    } else {
      keyRow.append(el('span', 'muted', 'This browser does not hold your key: you logged in with it, so you have it.'));
    }
    keyRow.append(button('Switch character', () => actions.switchCharacter()));
    this.panel.append(keyRow);
    this.panel.append(el('p', 'muted', 'Your name and key get this character back from any browser. Another tab can play another character at the same time.'));

    // Where you are, and the way out (docs/worlds.md, "Screens").
    this.panel.append(el('h2', undefined, 'Mode'));
    this.panel.append(el('p', undefined, world === 'arena' ? 'In the Arena. Nothing here carries over.' : 'In the Universe.'));
    const modeRow = el('div', 'menu-row');
    if (world === 'arena') modeRow.append(button('Leave the fight', () => actions.leaveFight()));
    modeRow.append(button('Back to modes', () => actions.backToModes()));
    this.panel.append(modeRow);
    if (world === 'arena') this.panel.append(el('p', 'muted', 'Leave the fight to go back to the arena setup. Back to modes leaves the Arena.'));

    // Display.
    this.panel.append(el('h2', undefined, 'Display'));
    const labelRow = el('label', 'menu-row');
    this.labelsBox.type = 'checkbox';
    this.labelsBox.checked = showLabels;
    this.labelsBox.addEventListener('change', () => actions.setShowLabels(this.labelsBox.checked));
    labelRow.append(this.labelsBox, document.createTextNode(' Show ship labels'));
    this.panel.append(labelRow);
    const meterRow = el('div', 'menu-row');
    meterRow.append(button('Show the connection meter', () => actions.showMeter()));
    this.panel.append(meterRow);

    // Controls.
    this.panel.append(el('h2', undefined, 'Controls'));
    const steerRow = el('label', 'menu-row');
    const steerBox = this.steerBox;
    steerBox.type = 'checkbox';
    steerBox.checked = display.mouseSteering;
    steerBox.addEventListener('change', () => actions.setMouseSteering(steerBox.checked));
    steerRow.append(steerBox, document.createTextNode(' Steer with the mouse'));
    this.panel.append(steerRow);
    this.panel.append(el('p', 'muted', 'On: the nose follows the pointer and A and D strafe. Off: A and D spin the ship. Also in Controls (F1).'));

    // World.
    this.panel.append(el('h2', undefined, 'World'));
    this.panel.append(el('p', 'muted', 'The world lives on the server, which saves it every minute and when it stops.'));
    // The fitter: a separate page built from the same code (docs/fitting.md).
    const fitter = el('a', 'menu-link', 'Open the fitter in a new tab');
    fitter.href = './fitter.html';
    fitter.target = '_blank';
    fitter.rel = 'noopener';
    this.panel.append(fitter);

    // Admin: playtesting tools, the host's only and the persistent world's only (the server checks too).
    const admin = el('div');
    admin.hidden = !character.admin || world !== 'universe';
    admin.append(el('h2', undefined, 'Admin (testing)'));
    const creditRow = el('div', 'menu-row');
    for (const amount of GRANTS) creditRow.append(button(`+${amount.toLocaleString('en-GB')} cr`, () => actions.grantCredits(amount)));
    admin.append(creditRow);
    const spawnRow = el('div', 'menu-row');
    const select = el('select');
    select.setAttribute('aria-label', 'Ship to spawn');
    for (const c of spawnChoices) {
      const option = el('option', undefined, c.name);
      option.value = c.id;
      select.append(option);
    }
    spawnRow.append(select, button('Spawn ship', () => actions.spawnShip(select.value)));
    admin.append(spawnRow);
    admin.append(el('p', 'muted', 'Spawned ships are yours, free, on a pad where you are docked; board with B. Sealed hulls such as the Aurel Tacet included.'));
    const gravityRow = el('label', 'menu-row');
    this.gravityBox.type = 'checkbox';
    this.gravityBox.addEventListener('change', () => actions.setGravity(this.gravityBox.checked));
    gravityRow.append(this.gravityBox, document.createTextNode(' Gravity: planets and the star pull ships, shots and loot'));
    admin.append(gravityRow);
    const orbitsRow = el('label', 'menu-row');
    this.orbitsBox.type = 'checkbox';
    this.orbitsBox.addEventListener('change', () => actions.setOrbits(this.orbitsBox.checked));
    orbitsRow.append(this.orbitsBox, document.createTextNode(' Orbits: planets, moons and stations move'));
    admin.append(orbitsRow);
    admin.append(el('p', 'muted', 'Both off by default and saved with the world. Bodies keep their solid surfaces either way; switching orbits keeps everything where it is.'));
    const manoeuvreRow = el('label', 'menu-row');
    this.manoeuvreSlider.type = 'range';
    this.manoeuvreSlider.min = '0';
    this.manoeuvreSlider.max = '100';
    this.manoeuvreSlider.step = '5';
    this.manoeuvreSlider.setAttribute('aria-label', 'Manoeuvring speed');
    this.manoeuvreSlider.addEventListener('input', () => (this.manoeuvreValue.textContent = `${this.manoeuvreSlider.value}%`));
    this.manoeuvreSlider.addEventListener('change', () => actions.setManoeuvreSpeed(Number(this.manoeuvreSlider.value) / 100));
    manoeuvreRow.append(document.createTextNode('Manoeuvring speed '), this.manoeuvreSlider, this.manoeuvreValue);
    admin.append(manoeuvreRow);
    admin.append(el('p', 'muted', 'How fast thrust can push you sideways or backwards, as a share of top speed. 0% flies like Flatspace: only where the nose points. 100%: any direction alike. Default 20%.'));

    this.panel.append(admin);

    root.append(this.panel);
  }

  toggle(): void {
    const hidden = this.panel.classList.toggle('hidden');
    // A button clicked in the menu keeps keyboard focus after it closes, and
    // Space (fire) would click it again: spawn a ship twice, say. Let it go.
    const focused = document.activeElement;
    if (hidden && focused instanceof HTMLElement && (this.panel.contains(focused) || focused.closest('button') === focused)) focused.blur();
  }

  /** Show the steering scheme chosen elsewhere (the Controls panel). */
  setMouseSteering(on: boolean): void {
    this.steerBox.checked = on;
  }

  /** Reflect the world's gravity rule (it changes with loads and imports too). */
  setGravity(on: boolean): void {
    if (this.gravityBox.checked !== on) this.gravityBox.checked = on;
  }

  /** Reflect the world's manoeuvring speed (unless the slider is being dragged). */
  setManoeuvreSpeed(share: number): void {
    if (document.activeElement === this.manoeuvreSlider) return;
    const percent = String(Math.round(share * 100));
    if (this.manoeuvreSlider.value !== percent) this.manoeuvreSlider.value = percent;
    this.manoeuvreValue.textContent = `${percent}%`;
  }

  /** Reflect the world's orbits rule. */
  setOrbits(on: boolean): void {
    if (this.orbitsBox.checked !== on) this.orbitsBox.checked = on;
  }
}
