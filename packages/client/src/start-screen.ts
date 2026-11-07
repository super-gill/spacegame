import { LOADOUTS, STARTS, type PowerId, type StartId, type StartPath, type StartSpec } from '@spacegame/sim';

/**
 * The start picker (Open Lanes step 3; docs/sol-build.md, "As built: Open
 * Lanes step 3"; mockup agreed with Jason, 7 November 2026): before a new
 * pilot first enters Sol, a power, a path, and what that start gives. The
 * Arena setup's three columns and rows. Every line comes from `STARTS` in
 * the sim, so the picker and the start the server gives never disagree.
 */

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(text: string, className: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', className, text);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

/** The four powers with ports, in the picker's order, and how standing names them. */
const POWERS: PowerId[] = ['earth', 'mars', 'belt', 'venus'];
const STANDING_NAMES: Partial<Record<PowerId, string>> = { earth: 'Earth', mars: 'Mars', belt: 'Belt', venus: 'Venus' };

function startOf(power: PowerId, path: StartPath): StartSpec {
  return STARTS[`${power}-${path}` as StartId];
}

/**
 * Show the picker until the player launches (resolves with the start) or
 * goes back to the mode screen (resolves with null). `credits` is what
 * every start begins with.
 */
export function chooseStart(credits: number): Promise<StartId | null> {
  const screen = el('div', 'login-screen arena-setup');
  const box = el('div', 'login-box arena-box start-box');
  screen.append(box);
  document.body.append(screen);

  let power: PowerId = 'earth';
  let path: StartPath = 'private';

  const head = el('div', 'arena-head');
  head.append(el('h1', undefined, 'Where you start'), el('span', 'muted', 'A power and a path. Sol is open from there.'));
  const powers = el('div', 'arena-list');
  const paths = el('div', 'arena-list');
  const detail = el('div', 'start-detail');
  const columns = el('div', 'arena-columns start-columns');
  const column = (title: string, label: string, body: HTMLElement): HTMLElement => {
    const section = el('section', 'arena-column');
    section.setAttribute('aria-label', label);
    section.append(el('h2', undefined, title), body);
    return section;
  };
  columns.append(column('1 · POWER', 'Power', powers), column('2 · PATH', 'Path', paths), column('3 · YOUR START', 'Your start', detail));
  const summary = el('span', 'arena-summary');
  const foot = el('div', 'arena-foot');

  const row = (list: HTMLElement, name: string, sub: string, on: boolean, pick: () => void): void => {
    const b = el('button', `arena-row${on ? ' on' : ''}`);
    b.type = 'button';
    b.setAttribute('aria-pressed', String(on));
    b.append(el('span', 'arena-row-name', name), el('span', 'arena-row-sub', sub.toUpperCase()));
    b.addEventListener('click', pick);
    list.append(b);
  };

  const pair = (key: string, value: string | HTMLElement): HTMLElement => {
    const p = el('div', 'start-pair');
    p.append(el('span', 'start-key', key));
    p.append(typeof value === 'string' ? el('span', 'start-value', value) : value);
    return p;
  };

  const render = (): void => {
    const start = startOf(power, path);
    powers.replaceChildren();
    for (const p of POWERS) {
      const s = startOf(p, 'private');
      row(powers, s.powerName, s.powerLine, p === power, () => {
        power = p;
        render();
      });
    }
    paths.replaceChildren();
    for (const k of ['private', 'navy'] as StartPath[]) {
      const s = startOf(power, k);
      row(paths, s.pathName, s.pathLine, k === path, () => {
        path = k;
        render();
      });
    }

    const loadout = LOADOUTS[start.loadoutId]!;
    const shipName = loadout.name.split(',')[0]!;
    const picture = el('img', 'start-ship');
    picture.alt = shipName;
    picture.src = `./ships/${loadout.hullId}/base-card.png`;
    // No picture yet (sprites not built): leave the space empty rather than show a broken image.
    picture.addEventListener('error', () => picture.classList.add('missing'));

    const ship = el('span', 'start-value', shipName);
    if (start.licence) ship.append(el('span', 'muted', ` · ${start.power === 'belt' ? 'UDF' : 'Navy'} grade`));
    const standing = el('span', 'start-standing');
    for (const p of POWERS) {
      const n = start.standing[p];
      if (n) standing.append(el('span', undefined, `${STANDING_NAMES[p]} +${n}`));
    }
    standing.append(el('span', 'muted', 'others 0'));

    detail.replaceChildren(
      picture,
      pair('HOME', start.homeName),
      pair('FIRST SHIP', ship),
      pair('STANDING', standing),
      pair('LICENCE', start.licence ? `${start.licence.service}, first rung` : el('span', 'muted', 'None')),
      pair('CREDITS', credits.toLocaleString('en-GB')),
      pair('FIRST WORK', start.work),
      el(
        'p',
        'start-note',
        start.licence
          ? 'The ship is yours and is never taken back. Duty, contracts and desertion arrive with law; for now the licence is your place in the service.'
          : 'No ties. Lose everything and you wake at home in a fresh Tern.',
      ),
    );
    summary.textContent = `${start.powerName} · ${start.pathName} · ${shipName} at ${start.homeName}`;
  };

  return new Promise((resolve) => {
    const finish = (value: StartId | null): void => {
      screen.remove();
      resolve(value);
    };
    foot.append(button('Back to modes', 'quiet', () => finish(null)), summary, button('LAUNCH', 'arena-launch', () => finish(`${power}-${path}` as StartId)));
    box.append(head, columns, foot);
    render();
    box.querySelector<HTMLButtonElement>('.arena-row.on')?.focus();
  });
}
