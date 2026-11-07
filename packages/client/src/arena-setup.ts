import { ARENA_MAX_ENEMIES, HULL_CLASS_NAMES, arenaHulls, type ArenaHull, type ArenaScenario, type World } from '@spacegame/sim';

/**
 * The arena setup (docs/worlds.md, "Screens"; approved mockup, 6 November
 * 2026): what a pilot in the Arena world sees whenever they are not in a
 * fight. Pick a **ship** (every hull with a ready-to-fly reference fit,
 * read from the code by `arenaHulls`, so new ships appear by themselves),
 * one of its **fits**, and a **scenario**, then LAUNCH. Dying, winning or
 * leaving the fight brings it back, with the last choices still picked.
 *
 * Skirmish is the only scenario built so far (the admin arena moved
 * over): its enemy fit and count are chosen in the scenario column. Waves
 * and To the death are shown, greyed, until they are built.
 */

export interface ArenaChoice {
  fit: string;
  scenario: ArenaScenario;
}

export interface ArenaSetupActions {
  launch(choice: ArenaChoice): void;
  /** Back to the mode screen. */
  back(): void;
}

/** How the last fight ended, for the line at the top. */
export type ArenaResult = 'won' | 'lost' | 'left';

const RESULT_TEXT: Record<ArenaResult, string> = {
  won: 'Won: every enemy destroyed.',
  lost: 'Lost: your ship was destroyed.',
  left: 'You left the fight.',
};

/** Scenarios as the mockup lists them; only Skirmish can be chosen yet. */
const SCENARIOS = [
  { id: 'skirmish', title: 'SKIRMISH', text: 'Pick the enemy fit and how many. The arena as you know it.', built: true },
  { id: 'waves', title: 'WAVES', text: 'Survive as long as you can. Each wave is bigger. Coming next.', built: false },
  { id: 'death', title: 'TO THE DEATH', text: 'One against one, an even fight. Coming next.', built: false },
] as const;

/** The last choices, kept for this tab so a reload back to the setup keeps them. */
const CHOICE_KEY = 'spacegame.arenaChoice';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label: string, className: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', className, label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

/** A fit's name without its hull's name in front ("Meridian Tern, Registry issue" under the Tern reads "Registry issue"). */
function fitLabel(hull: ArenaHull, fit: string): string {
  const prefix = `${hull.name}, `;
  const rest = fit.startsWith(prefix) ? fit.slice(prefix.length) : fit;
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}


export class ArenaSetup {
  private readonly screen = el('div', 'login-screen arena-setup hidden');
  private readonly hulls: ArenaHull[];
  private readonly result = el('span', 'muted');
  private readonly shipList = el('div', 'arena-list');
  private readonly fitList = el('div', 'arena-list');
  private readonly scenarioList = el('div', 'arena-list');
  private readonly enemy = el('select');
  private readonly count = el('select');
  private readonly summary = el('span', 'arena-summary');
  private choice: { hullId: string; fit: string; enemyFit: string; count: number };

  constructor(root: HTMLElement, world: World, private readonly actions: ArenaSetupActions) {
    this.hulls = arenaHulls(world);
    this.choice = this.loadChoice();
    this.screen.setAttribute('role', 'dialog');
    this.screen.setAttribute('aria-label', 'Arena setup');

    const box = el('div', 'login-box arena-box');
    const head = el('div', 'arena-head');
    head.append(el('h1', undefined, 'Arena'), el('span', 'muted', 'Nothing here carries over.'));
    box.append(head, this.result);

    const columns = el('div', 'arena-columns');
    columns.append(this.column('1 · SHIP', this.shipList), this.column('2 · FIT', this.fitList, 'Ready-to-fly fits. Fitting your own comes later.'), this.scenarioColumn());
    box.append(columns);

    const foot = el('div', 'arena-foot');
    foot.append(button('Back to modes', 'quiet', () => actions.back()), this.summary, button('LAUNCH', 'arena-launch', () => this.launch()));
    box.append(foot);
    this.screen.append(box);
    root.append(this.screen);
    this.draw();
  }

  get visible(): boolean {
    return !this.screen.classList.contains('hidden');
  }

  /** Show the setup; `result` says how the last fight ended, if one just did. */
  show(result: ArenaResult | null): void {
    this.result.textContent = result ? RESULT_TEXT[result] : '';
    if (!this.visible) {
      this.screen.classList.remove('hidden');
      this.screen.querySelector<HTMLButtonElement>('.arena-launch')?.focus();
    }
  }

  hide(): void {
    if (!this.visible) return;
    this.screen.classList.add('hidden');
    // A focused button would be clicked again by Space (fire) once flying.
    if (document.activeElement instanceof HTMLElement && this.screen.contains(document.activeElement)) document.activeElement.blur();
  }

  private launch(): void {
    this.saveChoice();
    this.actions.launch({ fit: this.choice.fit, scenario: { kind: 'skirmish', enemyFit: this.choice.enemyFit, count: this.choice.count } });
  }

  private column(title: string, list: HTMLElement, note?: string): HTMLElement {
    const section = el('section', 'arena-column');
    section.setAttribute('aria-label', title.replace(/^\d · /, ''));
    section.append(el('h2', undefined, title), list);
    if (note) section.append(el('p', 'arena-note', note));
    return section;
  }

  /** The scenario column: the scenarios, then Skirmish's own choices. */
  private scenarioColumn(): HTMLElement {
    const section = this.column('3 · SCENARIO', this.scenarioList);
    const options = el('div', 'arena-options');
    this.enemy.setAttribute('aria-label', 'Enemy fit');
    for (const hull of this.hulls) {
      const group = el('optgroup');
      group.label = hull.name;
      for (const fit of hull.fits) {
        const option = el('option', undefined, fitLabel(hull, fit.name));
        option.value = fit.name;
        group.append(option);
      }
      this.enemy.append(group);
    }
    this.enemy.addEventListener('change', () => {
      this.choice.enemyFit = this.enemy.value;
      this.draw();
    });
    this.count.setAttribute('aria-label', 'How many enemies');
    for (let n = 1; n <= ARENA_MAX_ENEMIES; n++) {
      const option = el('option', undefined, String(n));
      option.value = String(n);
      this.count.append(option);
    }
    this.count.addEventListener('change', () => {
      this.choice.count = Number(this.count.value);
      this.draw();
    });
    const enemyRow = el('label', 'arena-option');
    enemyRow.append(el('span', 'muted', 'ENEMY'), this.enemy);
    const countRow = el('label', 'arena-option');
    countRow.append(el('span', 'muted', 'HOW MANY'), this.count);
    options.append(enemyRow, countRow);
    section.append(options);
    return section;
  }

  private row(list: HTMLElement, name: string, sub: string, on: boolean, pick: (() => void) | null): void {
    const b = el('button', `arena-row${on ? ' on' : ''}`);
    b.type = 'button';
    b.setAttribute('aria-pressed', String(on));
    b.append(el('span', 'arena-row-name', name), el('span', 'arena-row-sub', sub));
    if (pick) b.addEventListener('click', pick);
    else b.setAttribute('aria-disabled', 'true');
    list.append(b);
  }

  private draw(): void {
    const c = this.choice;
    const hull = this.hulls.find((h) => h.hullId === c.hullId) ?? this.hulls[0];
    this.shipList.replaceChildren();
    for (const h of this.hulls) {
      this.row(this.shipList, h.name, HULL_CLASS_NAMES[h.class].toUpperCase(), h.hullId === hull?.hullId, () => {
        c.hullId = h.hullId;
        c.fit = h.fits[0]!.name;
        this.draw();
      });
    }
    this.fitList.replaceChildren();
    for (const f of hull?.fits ?? []) {
      this.row(this.fitList, fitLabel(hull!, f.name), (f.role ?? '').toUpperCase(), f.name === c.fit, () => {
        c.fit = f.name;
        this.draw();
      });
    }
    this.scenarioList.replaceChildren();
    // Skirmish is the only one built, so it is always the one picked; the others are greyed.
    for (const s of SCENARIOS) this.row(this.scenarioList, s.title, s.text, s.id === 'skirmish', s.built ? () => undefined : null);
    this.enemy.value = c.enemyFit;
    this.count.value = String(c.count);
    const fitName = hull ? fitLabel(hull, c.fit) : c.fit;
    this.summary.textContent = `${hull?.name ?? ''} · ${fitName} · SKIRMISH, ${c.count} × ${c.enemyFit}`;
  }

  /** The last choices, if they still name things that exist; otherwise the mockup's defaults. */
  private loadChoice(): { hullId: string; fit: string; enemyFit: string; count: number } {
    const all = this.hulls.flatMap((h) => h.fits.map((f) => f.name));
    const warrant = this.hulls.find((h) => h.hullId === 'kessari-wedge') ?? this.hulls[0]!;
    const fallback = { hullId: warrant.hullId, fit: warrant.fits[0]!.name, enemyFit: all.includes('Warrant brawler') ? 'Warrant brawler' : all[0]!, count: 3 };
    try {
      const saved = JSON.parse(sessionStorage.getItem(CHOICE_KEY) ?? 'null') as typeof fallback | null;
      const hull = saved && this.hulls.find((h) => h.hullId === saved.hullId);
      if (saved && hull && hull.fits.some((f) => f.name === saved.fit) && all.includes(saved.enemyFit) && Number.isInteger(saved.count) && saved.count >= 1 && saved.count <= ARENA_MAX_ENEMIES) return saved;
    } catch {
      // Nothing kept, or storage blocked: the defaults.
    }
    return fallback;
  }

  private saveChoice(): void {
    try {
      sessionStorage.setItem(CHOICE_KEY, JSON.stringify(this.choice));
    } catch {
      // Storage blocked: the choices last until the page reloads.
    }
  }
}
