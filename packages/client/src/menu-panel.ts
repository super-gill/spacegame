/**
 * Game menu (F2, or the Menu button): pilot name, display settings, and
 * saving. The world keeps running while it is open, as it must in a
 * shared world. Buttons report to main.ts, which owns the world.
 */

export interface MenuActions {
  rename(name: string): void;
  setShowLabels(show: boolean): void;
  saveNow(): void;
  exportSave(): void;
  importSave(file: File): void;
  newGame(): void;
}

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

  constructor(root: HTMLElement, openButton: HTMLButtonElement, name: string, showLabels: boolean, actions: MenuActions) {
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

    root.append(this.panel);
  }

  toggle(): void {
    this.panel.classList.toggle('hidden');
  }

  /** Show when the world was last saved, e.g. "Saved 12 s ago". */
  setSavedStatus(text: string): void {
    if (this.savedLine.textContent !== text) this.savedLine.textContent = text;
  }

  setName(name: string): void {
    if (document.activeElement !== this.nameInput) this.nameInput.value = name;
  }
}
