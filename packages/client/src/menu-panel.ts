/**
 * Game menu (F2, or the Menu button): pilot name, display settings,
 * saving, and admin controls for playtesting. The world keeps running
 * while it is open, as it must in a shared world. Buttons report to
 * main.ts, which owns the world.
 */

export interface MenuActions {
  rename(name: string): void;
  setShowLabels(show: boolean): void;
  setMouseSteering(on: boolean): void;
  saveNow(): void;
  exportSave(): void;
  importSave(file: File): void;
  newGame(): void;
  /** Admin (testing): credits from nothing. */
  grantCredits(amount: number): void;
  /** Admin (testing): a free ship from any loadout, docked where you are. */
  spawnShip(loadoutId: string): void;
  /** Admin (testing): switch gravity on or off for the whole world. */
  setGravity(on: boolean): void;
  /** Admin (testing): start or stop the orbits for the whole world. */
  setOrbits(on: boolean): void;
}

/** A loadout the admin spawner offers. */
export interface SpawnChoice {
  id: string;
  name: string;
}

/** Credit amounts the admin buttons grant. */
const GRANTS = [10_000, 100_000, 1_000_000];

/** Longest pilot name accepted, in characters. */
export const MAX_NAME_LENGTH = 24;

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
  private readonly nameInput = el('input');
  private readonly labelsBox = el('input');
  private readonly savedLine = el('p', 'muted');
  private readonly gravityBox = el('input');
  private readonly orbitsBox = el('input');

  constructor(
    root: HTMLElement,
    openButton: HTMLButtonElement,
    name: string,
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

    // Pilot.
    this.panel.append(el('h2', undefined, 'Pilot'));
    const nameRow = el('div', 'menu-row');
    this.nameInput.type = 'text';
    this.nameInput.maxLength = MAX_NAME_LENGTH;
    this.nameInput.value = name;
    this.nameInput.setAttribute('aria-label', 'Pilot name');
    const applyName = (): void => {
      const trimmed = this.nameInput.value.trim();
      if (trimmed) actions.rename(trimmed);
      this.nameInput.blur();
    };
    this.nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') applyName();
    });
    nameRow.append(this.nameInput, button('Rename', applyName));
    this.panel.append(nameRow);

    // Display.
    this.panel.append(el('h2', undefined, 'Display'));
    const labelRow = el('label', 'menu-row');
    this.labelsBox.type = 'checkbox';
    this.labelsBox.checked = showLabels;
    this.labelsBox.addEventListener('change', () => actions.setShowLabels(this.labelsBox.checked));
    labelRow.append(this.labelsBox, document.createTextNode(' Show ship labels'));
    this.panel.append(labelRow);

    // Controls.
    this.panel.append(el('h2', undefined, 'Controls'));
    const steerRow = el('label', 'menu-row');
    const steerBox = el('input');
    steerBox.type = 'checkbox';
    steerBox.checked = display.mouseSteering;
    steerBox.addEventListener('change', () => actions.setMouseSteering(steerBox.checked));
    steerRow.append(steerBox, document.createTextNode(' Steer with the mouse'));
    this.panel.append(steerRow);
    this.panel.append(el('p', 'muted', 'On: the nose follows the pointer and A and D strafe. Off: A and D spin the ship.'));

    // World.
    this.panel.append(el('h2', undefined, 'World'));
    this.panel.append(this.savedLine);
    const fileInput = el('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.hidden = true;
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (file) actions.importSave(file);
      fileInput.value = '';
    });
    const worldRow = el('div', 'menu-row');
    worldRow.append(
      button('Save now', () => actions.saveNow()),
      button('Export save', () => actions.exportSave()),
      button('Import save', () => fileInput.click()),
      fileInput,
    );
    this.panel.append(worldRow);
    const dangerRow = el('div', 'menu-row');
    dangerRow.append(
      button('New game', () => {
        if (window.confirm('Start a new world? The current one is deleted unless you have exported it.')) actions.newGame();
      }),
    );
    this.panel.append(dangerRow);
    this.panel.append(el('p', 'muted', 'The world saves itself every few seconds and when you close the tab.'));

    // Admin: playtesting tools, not part of the game.
    this.panel.append(el('h2', undefined, 'Admin (testing)'));
    const creditRow = el('div', 'menu-row');
    for (const amount of GRANTS) creditRow.append(button(`+${amount.toLocaleString('en-GB')} cr`, () => actions.grantCredits(amount)));
    this.panel.append(creditRow);
    const spawnRow = el('div', 'menu-row');
    const select = el('select');
    select.setAttribute('aria-label', 'Ship to spawn');
    for (const c of spawnChoices) {
      const option = el('option', undefined, c.name);
      option.value = c.id;
      select.append(option);
    }
    spawnRow.append(select, button('Spawn ship', () => actions.spawnShip(select.value)));
    this.panel.append(spawnRow);
    this.panel.append(el('p', 'muted', 'Spawned ships are yours, free, on a pad where you are docked; board with B. Sealed hulls such as the Aurel Tacet included.'));
    const gravityRow = el('label', 'menu-row');
    this.gravityBox.type = 'checkbox';
    this.gravityBox.addEventListener('change', () => actions.setGravity(this.gravityBox.checked));
    gravityRow.append(this.gravityBox, document.createTextNode(' Gravity: planets and the star pull ships, shots and loot'));
    this.panel.append(gravityRow);
    const orbitsRow = el('label', 'menu-row');
    this.orbitsBox.type = 'checkbox';
    this.orbitsBox.addEventListener('change', () => actions.setOrbits(this.orbitsBox.checked));
    orbitsRow.append(this.orbitsBox, document.createTextNode(' Orbits: planets, moons and stations move'));
    this.panel.append(orbitsRow);
    this.panel.append(el('p', 'muted', 'Both off by default and saved with the world. Bodies keep their solid surfaces either way; switching orbits keeps everything where it is.'));

    root.append(this.panel);
  }

  toggle(): void {
    this.panel.classList.toggle('hidden');
  }

  /** Show when the world was last saved, e.g. "Saved 12 s ago". */
  setSavedStatus(text: string): void {
    if (this.savedLine.textContent !== text) this.savedLine.textContent = text;
  }

  /** Reflect the world's gravity rule (it changes with loads and imports too). */
  setGravity(on: boolean): void {
    if (this.gravityBox.checked !== on) this.gravityBox.checked = on;
  }

  /** Reflect the world's orbits rule. */
  setOrbits(on: boolean): void {
    if (this.orbitsBox.checked !== on) this.orbitsBox.checked = on;
  }

  setName(name: string): void {
    if (document.activeElement !== this.nameInput) this.nameInput.value = name;
  }
}
