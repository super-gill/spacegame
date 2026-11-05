import {
  GOODS,
  HULLS,
  MODULES,
  REFERENCE_FITS,
  WEAPONS,
  duel,
  fitProblems,
  fitSummary,
  mountRefusal,
  type FitSpec,
  type FitSummary,
  type HullSpec,
  type ModuleSpec,
} from '@spacegame/sim';

/**
 * The fitter (docs/fitting.md, "The fitter"): two fits side by side, any
 * hull and any module, with the game's own numbers, and a duel between
 * them. Fits save in this browser and export as JSON (the shape of
 * `FitSpec`, which pastes straight into `reference-fits.ts`).
 *
 * Plain DOM, rebuilt on every change: it is a tool, not part of the game's
 * frame loop.
 */

const cat = { hulls: HULLS, modules: MODULES, weapons: WEAPONS, goods: GOODS };
const SAVED_KEY = 'spacegame.fits';
const root = document.getElementById('fitter')!;

type Side = 'a' | 'b';
const fits: Record<Side, FitSpec> = {
  a: structuredClone(REFERENCE_FITS[0]!),
  b: structuredClone(REFERENCE_FITS[1]!),
};
let duelText = '';
let exchange = '';

function loadSaved(): FitSpec[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as FitSpec[]) : [];
  } catch {
    return [];
  }
}

function storeSaved(list: FitSpec[]): void {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(list));
  } catch {
    // Storage blocked: saving just does not stick.
  }
}

function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, ...children: (Node | string)[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...children);
  return node;
}

/** Every module that could go in a mount of this type, best match first. */
function candidates(hull: HullSpec, mountId: string): ModuleSpec[] {
  const mount = hull.mounts.find((m) => m.id === mountId)!;
  return Object.values(MODULES)
    .filter((m) => m.mounts.includes(mount.type))
    .sort((x, y) => (mountRefusal(mount, x) ? 1 : 0) - (mountRefusal(mount, y) ? 1 : 0) || x.size.localeCompare(y.size) || x.name.localeCompare(y.name));
}

const REASONS: Record<string, string> = { tooBig: 'too big', wrongMount: 'wrong mount', missingService: 'mount lacks a service it needs' };

function editor(side: Side): HTMLElement {
  const spec = fits[side];
  const hull = HULLS[spec.hullId]!;
  const box = h('section', { class: 'fit' });

  const name = h('input', { value: spec.name, 'aria-label': `Fit ${side.toUpperCase()} name` });
  name.addEventListener('change', () => {
    spec.name = name.value;
    render();
  });
  const hullPick = h('select', { 'aria-label': `Fit ${side.toUpperCase()} hull` });
  for (const x of Object.values(HULLS)) hullPick.append(h('option', { value: x.id, ...(x.id === spec.hullId ? { selected: '' } : {}) }, `${x.name} (${(x as { class?: string }).class ?? ''}, ${x.sizeClass})`));
  hullPick.addEventListener('change', () => {
    fits[side] = { name: `New ${HULLS[hullPick.value]!.name}`, hullId: hullPick.value, fit: {} };
    render();
  });
  const refPick = h('select', { 'aria-label': 'Load a reference or saved fit' }, h('option', { value: '' }, 'Load a fit...'));
  REFERENCE_FITS.forEach((f, i) => refPick.append(h('option', { value: `r${i}` }, `Reference: ${f.name}`)));
  loadSaved().forEach((f, i) => refPick.append(h('option', { value: `s${i}` }, `Saved: ${f.name}`)));
  refPick.addEventListener('change', () => {
    const v = refPick.value;
    const from = v.startsWith('r') ? REFERENCE_FITS[Number(v.slice(1))] : loadSaved()[Number(v.slice(1))];
    if (from) fits[side] = structuredClone(from);
    render();
  });
  box.append(h('h2', {}, `Fit ${side.toUpperCase()}`), name, hullPick, refPick);

  // One row per mount, grouped by mount type in hull order.
  const table = h('table', { class: 'slots' });
  for (const mount of hull.mounts) {
    const pick = h('select', { 'aria-label': `${mount.id} ${mount.type} ${mount.size}` }, h('option', { value: '' }, '(empty)'));
    for (const m of candidates(hull, mount.id)) {
      const refusal = mountRefusal(mount, m);
      pick.append(h('option', { value: m.id, ...(spec.fit[mount.id] === m.id ? { selected: '' } : {}) }, `${m.name} · ${m.power}p ${m.mass}t ${m.price.toLocaleString('en-GB')}cr${refusal ? ` (won't fit: ${REASONS[refusal] ?? refusal})` : ''}`));
    }
    pick.addEventListener('change', () => {
      if (pick.value) spec.fit[mount.id] = pick.value;
      else delete spec.fit[mount.id];
      render();
    });
    table.append(h('tr', {}, h('td', { class: 'mount' }, `${mount.id}`), h('td', { class: 'type' }, `${mount.type} ${mount.size}`), h('td', {}, pick)));
  }
  box.append(table);

  const problems = fitProblems(cat, spec);
  box.append(h('p', { class: problems.length ? 'bad' : 'ok' }, problems.length ? `Could not be fitted: ${problems.map((p) => `${p.mountId ?? ''} ${p.reason}`.trim()).join(', ')}` : 'Fits.'));

  const save = h('button', { type: 'button' }, 'Save in this browser');
  save.addEventListener('click', () => {
    storeSaved([...loadSaved().filter((f) => f.name !== spec.name), structuredClone(spec)]);
    render();
  });
  const exp = h('button', { type: 'button' }, 'Export');
  exp.addEventListener('click', () => {
    exchange = JSON.stringify(spec, null, 2);
    render();
  });
  const imp = h('button', { type: 'button' }, 'Import from the box below');
  imp.addEventListener('click', () => {
    try {
      const parsed = JSON.parse(exchange) as FitSpec;
      if (!HULLS[parsed.hullId] || typeof parsed.fit !== 'object') throw new Error('not a fit');
      fits[side] = parsed;
    } catch {
      alertText = 'That is not a fit.';
    }
    render();
  });
  box.append(h('div', { class: 'buttons' }, save, exp, imp));
  return box;
}

let alertText = '';

type Row = [label: string, value: (s: FitSummary) => number, digits: number, better: 'higher' | 'lower' | 'none'];
const ROWS: Row[] = [
  ['Price', (s) => s.price, 0, 'lower'],
  ['Power used', (s) => s.powerDraw, 1, 'none'],
  ['Power made', (s) => s.powerOutput, 1, 'none'],
  ['Mass', (s) => s.mass, 1, 'lower'],
  ['Top speed', (s) => s.topSpeed, 0, 'higher'],
  ['Acceleration', (s) => s.acceleration, 1, 'higher'],
  ['Spin-up', (s) => s.spinUp, 2, 'higher'],
  ['Turn rate', (s) => s.turnRate, 2, 'higher'],
  ['Capacitor', (s) => s.capacitor, 0, 'higher'],
  ['Capacitor recharge', (s) => s.capacitorRecharge, 1, 'higher'],
  ['Capacitor use, all firing', (s) => s.capacitorUse, 1, 'lower'],
  ['Shield', (s) => s.shield, 0, 'higher'],
  ['Shield regen', (s) => s.shieldRegen, 1, 'higher'],
  ['Structure', (s) => s.structure, 0, 'higher'],
  ['Damage per second', (s) => s.dps, 1, 'higher'],
  ['Longest range', (s) => s.range, 0, 'higher'],
  ['Signature', (s) => s.signature, 0, 'lower'],
  ['Sensor range', (s) => s.sensorRange, 0, 'higher'],
  ['Locks', (s) => s.maxLocks, 0, 'higher'],
  ['Cargo', (s) => s.cargo, 0, 'higher'],
  ['Ore hold', (s) => s.oreHold, 0, 'higher'],
  ['Ore a second', (s) => s.miningRate, 1, 'higher'],
  ['Drones', (s) => s.drones, 0, 'higher'],
];

function comparison(): HTMLElement {
  const a = fitSummary(cat, fits.a);
  const b = fitSummary(cat, fits.b);
  const table = h('table', { class: 'compare' }, h('tr', {}, h('th', {}, ''), h('th', {}, fits.a.name), h('th', {}, fits.b.name), h('th', {}, 'B against A')));
  for (const [label, value, digits, better] of ROWS) {
    const x = a ? value(a) : 0;
    const y = b ? value(b) : 0;
    const diff = y - x;
    const good = better === 'none' || diff === 0 ? '' : (better === 'higher') === diff > 0 ? 'better' : 'worse';
    const fmt = (n: number): string => n.toLocaleString('en-GB', { maximumFractionDigits: digits, minimumFractionDigits: digits });
    table.append(h('tr', {}, h('th', {}, label), h('td', {}, fmt(x)), h('td', {}, fmt(y)), h('td', { class: good }, diff === 0 ? '' : `${diff > 0 ? '+' : ''}${fmt(diff)}`)));
  }
  return table;
}

function duelPanel(): HTMLElement {
  const box = h('section', { class: 'duel' }, h('h2', {}, 'Duel'), h('p', {}, 'Both fits flown at each other by the same simple pilot from four starting positions, up to two minutes each, in empty space.'));
  const go = h('button', { type: 'button' }, 'Duel A against B');
  go.addEventListener('click', () => {
    duelText = 'Fighting...';
    render();
    // Let the page paint "Fighting..." before the sim runs.
    setTimeout(() => {
      const r = duel(fits.a, fits.b);
      duelText = `A won ${r.winsA}, B won ${r.winsB}, ${r.draws} draws.\n` + r.runs.map((x, i) => `Start ${i + 1}: ${x.winner ? `${x.winner.toUpperCase()} won` : 'draw'} after ${x.seconds.toFixed(1)} s; A ${(x.aLeft * 100).toFixed(0)}% left, B ${(x.bLeft * 100).toFixed(0)}% left`).join('\n');
      render();
    }, 20);
  });
  box.append(go, h('pre', {}, duelText));
  return box;
}

function exchangePanel(): HTMLElement {
  const area = h('textarea', { rows: '10', 'aria-label': 'Fit JSON to copy or paste' });
  area.value = exchange;
  area.addEventListener('input', () => (exchange = area.value));
  return h('section', { class: 'exchange' }, h('h2', {}, 'Fit as JSON'), h('p', {}, 'Export puts a fit here to copy; paste one here and import it into A or B.'), area, h('p', { class: 'bad' }, alertText));
}

function render(): void {
  const focusLabel = document.activeElement?.getAttribute('aria-label');
  root.replaceChildren(h('div', { class: 'fits' }, editor('a'), editor('b')), h('section', { class: 'numbers' }, h('h2', {}, 'Compared'), comparison()), duelPanel(), exchangePanel());
  alertText = '';
  // Keep keyboard focus on the control that was used.
  if (focusLabel) root.querySelector<HTMLElement>(`[aria-label="${CSS.escape(focusLabel)}"]`)?.focus();
}

render();
