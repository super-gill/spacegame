import {
  cargoMass,
  fitStats,
  flightWarnings,
  mountRefusal,
  fitFee,
  planRefit,
  resaleValue,
  shipStats,
  storedCount,
  isGun,
  weaponDps,
  type FitRefusal,
  type FlightWarning,
  type HullSpec,
  type ModuleSpec,
  type MountPoint,
  type MountType,
  type ShipStats,
  type World,
} from '@spacegame/sim';
import { RACE_COLOUR, drawShipArt } from './render/ship-art.js';

/**
 * Outfitting, shown inside the docked panel at stations that refit ships.
 *
 * Left: the ship as fitted, with empty mounts as dashed sockets; click a
 * mount (there or in the list) to select it. Right: the ship's derived
 * stats. Below: the modules that physically fit the selected mount, each
 * with how many you own here and what fitting it costs (the handling fee,
 * plus the price if you do not own one), then the modules you have in
 * storage at this station, which you can sell. Pointing at a
 * module previews it: the drawing and the stats show the ship as it would
 * be, so the effect of a change is visible before paying for it.
 *
 * The panel only draws and reports clicks. Fitting is a sim command run
 * by main.ts, which owns the world.
 */

/** Fit `moduleId` on a mount, or with `moduleId` null unfit it; or sell one stored module. */
export type RefitRequest = { kind: 'refit'; mountId: string; moduleId: string | null } | { kind: 'sell'; moduleId: string };

/** Player-facing reasons a refit is refused. Shared with main.ts for toasts. */
export const FIT_REFUSALS: Record<FitRefusal, string> = {
  noShip: 'You have no ship.',
  notDocked: 'Dock first.',
  noOutfitting: 'This station has no outfitting.',
  sealed: 'This hull is sealed and cannot be refitted.',
  unknownMount: 'No such mount.',
  unknownModule: 'No such module.',
  wrongMount: 'Does not go on that mount.',
  tooBig: 'Too big for that mount.',
  missingService: 'That mount lacks a service it needs.',
  alreadyFitted: 'Already fitted.',
  emptyMount: 'Nothing fitted there.',
  power: 'Not enough reactor power.',
  cargo: 'Cargo aboard would not fit.',
  credits: 'Not enough credits.',
  notStored: 'You have none of those stored here.',
};

const MOUNT_TYPE_NAME: Record<MountType, string> = {
  weapon: 'Weapon',
  bay: 'Bay',
  utility: 'Utility',
  engine: 'Engine',
  core: 'Core',
  internal: 'Internal',
  radar: 'Radar',
  computer: 'Targeting computer',
  nav: 'Navigation',
  flight: 'Flight computer',
  podBay: 'Pod bay',
  fireControl: 'Fire control',
};

const INK = '#9fd3c7';
const PREVIEW_W = 360;
const PREVIEW_H = 230;
/** Pixels of slop round a mount when clicking it in the drawing. */
const MOUNT_CLICK_PX = 12;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const credits = (n: number): string => `${n.toLocaleString('en-GB')} cr`;
const fixed1 = (n: number): string => (Math.round(n * 10) / 10).toString();

/** One line on what a module does. */
/** Plain name for what a module is, beside its brand name. */
export function moduleType(m: ModuleSpec, world: World): string {
  if (m.kind === 'weapon') {
    const w = m.weaponId ? world.weapons[m.weaponId] : undefined;
    if (!w) return 'Weapon';
    if (w.kind === 'turret') return 'Swivel';
    return WEAPON_NAMES[w.id.replace(/-[sml]$/, '')] ?? 'Fixed gun';
  }
  return MODULE_TYPE_NAME[m.kind];
}

/** Plain names for the gun types, by weapon id stem. */
const WEAPON_NAMES: Record<string, string> = {
  autocannon: 'Autocannon',
  artillery: 'Artillery',
  'pulse-laser': 'Pulse laser',
  'beam-laser': 'Beam laser',
  blaster: 'Blaster',
  railgun: 'Railgun',
  'missile-launcher': 'Missile launcher',
  'torpedo-tube': 'Torpedo tube',
};

const MODULE_TYPE_NAME: Record<Exclude<ModuleSpec['kind'], 'weapon'>, string> = {
  engine: 'Engine',
  thrusters: 'Thruster package',
  reactor: 'Reactor',
  shieldGenerator: 'Shield generator',
  armour: 'Armour',
  cargoPod: 'Cargo',
  radar: 'Radar',
  targetingComputer: 'Targeting computer',
  navComputer: 'Nav computer',
  countermeasure: 'Countermeasure dispenser',
  flightComputer: 'Flight computer',
  podBay: 'Pod bay',
  fireControl: 'Fire control',
  tractor: 'Tractor beam',
  afterburner: 'Afterburner',
};

/** What a fit leaves the ship unable to do, for the pilot. Shared with main.ts. */
export const FLIGHT_WARNINGS: Record<FlightWarning, string> = {
  noMainThrust: 'No engine: cannot thrust forward.',
  noTurning: 'No thruster package: cannot turn or strafe.',
  noWeapons: 'No weapons fitted.',
};

export function describeModule(m: ModuleSpec, world: World): string {
  const s = m.stats;
  const parts: string[] = [];
  if (s.mainThrust) parts.push(`thrust ${s.mainThrust}`);
  if (s.rotationThrust) parts.push(`retro ${s.reverseThrust ?? 0}, lateral ${s.lateralThrust ?? 0}, spin ${s.rotationThrust}`);
  if (s.powerOutput) parts.push(`makes ${s.powerOutput} power`);
  if (s.shield) parts.push(`shield ${s.shield}, ${s.shieldRegen ?? 0}/s`);
  if (s.structure) parts.push(`structure +${s.structure}`);
  if (s.cargoCapacity) parts.push(`cargo ${s.cargoCapacity}`);
  if (s.sensorRange) parts.push(`sees ${s.sensorRange} u`);
  if (s.navHorizon) parts.push(`predicts ${s.navHorizon} s ahead`);
  if (s.maxLocks) parts.push(`${s.maxLocks} locks at ${fixed1(s.scanResolution ?? 0)}x speed`);
  if (s.flightControl) parts.push(`flight control ${Math.round(s.flightControl * 100)}%: mouse steering and assist`);
  if (s.turretControl) parts.push(`directs ${s.turretControl} swivel${s.turretControl === 1 ? '' : 's'}, tracking ${fixed1(s.turretTracking ?? 1)}x`);
  if (s.escapePod) parts.push('an escape pod: without one, losing the ship leaves you with nothing');
  if (s.tractorRange) parts.push(`tractor reach ${s.tractorRange} u, pull ${s.tractorPull ?? 0} u/s`);
  if (s.afterburnerSpeed) parts.push(`hold Shift: +${Math.round(s.afterburnerSpeed * 100)}% top speed, +${Math.round((s.afterburnerThrust ?? 0) * 100)}% thrust, ${fixed1(s.afterburnerDraw ?? 0)} cap/s`);
  if (m.shieldRegenDelay) parts.push(`recharges ${fixed1(m.shieldRegenDelay)} s after a hit`);
  const w = m.weaponId ? world.weapons[m.weaponId] : undefined;
  if (w && w.family === 'countermeasure') {
    // Dispensers: what they hold and what they come with.
    parts.push(`drops chaff, flares or decoys, holds ${w.magazine}, one every ${fixed1(w.fireInterval)} s`);
    if (m.startsLoadedWith) parts.push(`comes loaded with ${world.goods[m.startsLoadedWith]?.name ?? m.startsLoadedWith}`);
  } else if (w && w.family === 'missile') {
    parts.push(`${Math.round(w.damage)} warhead base, one every ${fixed1(w.fireInterval)} s, needs a lock`);
    parts.push(`loads ${w.ammo === 'torpedo' ? 'torpedoes' : 'missiles'}, holds ${w.magazine}`);
  } else if (w) {
    parts.push(`${fixed1(weaponDps(w))} dps, range ${Math.round(w.range)}, ${w.damageType}`);
    if (w.capacitorPerShot > 0) parts.push(`${fixed1(w.capacitorPerShot)} cap/shot`);
    if (w.ammo) parts.push(`loads ${w.ammo}, magazine ${w.magazine}`);
    if (w.family === 'pointDefence') parts.push('shoots down missiles by itself');
  }
  if (m.resists) parts.push('resists ' + Object.entries(m.resists).filter(([, v]) => v > 0).map(([t, v]) => `${t} ${Math.round(v * 100)}%`).join(', '));
  if (m.capacitorDraw) parts.push(`draws ${fixed1(m.capacitorDraw)} cap/s at full size`);
  return parts.join('; ');
}

/** CSS class for an "after" value: better, worse or unchanged. */
function compareClass(row: StatRow, a: number, b: number, diff: boolean): 'better' | 'worse' | 'same' {
  if (row.better === 'budget') return b < 0 ? 'worse' : 'same';
  if (!diff) return 'same';
  return (row.better === 'higher' ? b > a : b < a) ? 'better' : 'worse';
}

/**
 * A stat row: label, how to read it from stats, and which way is better.
 * `budget` rows are an allowance rather than a score: spending it is not
 * worse, only going below zero is.
 */
interface StatRow {
  label: string;
  value: (s: ShipStats) => number;
  format: (n: number) => string;
  better: 'higher' | 'lower' | 'budget';
}

const DEG = 180 / Math.PI;
const dps = (s: ShipStats, kind: 'fixed' | 'turret'): number =>
  Object.values(s.weapons)
    .filter((w) => w.kind === kind && isGun(w))
    .reduce((n, w) => n + weaponDps(w), 0);

const STAT_ROWS: StatRow[] = [
  { label: 'Mass', value: (s) => s.mass, format: fixed1, better: 'lower' },
  { label: 'Acceleration', value: (s) => s.mainThrust / s.mass, format: (n) => `${fixed1(n)} u/s²`, better: 'higher' },
  { label: 'Retro', value: (s) => s.reverseThrust / s.mass, format: (n) => `${fixed1(n)} u/s²`, better: 'higher' },
  { label: 'Spin-up', value: (s) => (s.rotationThrust / s.mass) * DEG, format: (n) => `${Math.round(n)} °/s²`, better: 'higher' },
  { label: 'Top speed', value: (s) => s.maxSpeed, format: (n) => `${n} u/s`, better: 'higher' },
  { label: 'Shield', value: (s) => s.shield, format: (n) => fixed1(n), better: 'higher' },
  { label: 'Shield regen', value: (s) => s.shieldRegen, format: (n) => `${fixed1(n)}/s`, better: 'higher' },
  { label: 'Structure', value: (s) => s.structure, format: (n) => fixed1(n), better: 'higher' },
  { label: 'Cargo', value: (s) => s.cargoCapacity, format: (n) => String(n), better: 'higher' },
  { label: 'Sensor range', value: (s) => s.sensorRange, format: (n) => (n > 0 ? `${n} u` : 'blind'), better: 'higher' },
  { label: 'Locks', value: (s) => s.maxLocks, format: (n) => String(n), better: 'higher' },
  { label: 'Lock speed', value: (s) => s.scanResolution, format: (n) => (n > 0 ? `${fixed1(n)}x` : 'none'), better: 'higher' },
  { label: 'Capacitor', value: (s) => s.capacitor, format: (n) => String(Math.round(n)), better: 'higher' },
  { label: 'Cap recharge', value: (s) => s.capacitorRecharge, format: (n) => `${fixed1(n)}/s`, better: 'higher' },
  { label: 'Cap drain', value: (s) => s.capacitorDraw, format: (n) => `${fixed1(n)}/s`, better: 'lower' },
  { label: 'Power spare', value: (s) => s.powerOutput - s.powerDraw, format: (n) => fixed1(n), better: 'budget' },
  { label: 'Fixed dps', value: (s) => dps(s, 'fixed'), format: fixed1, better: 'higher' },
  { label: 'Turret dps', value: (s) => dps(s, 'turret'), format: fixed1, better: 'higher' },
];

export class OutfittingPanel {
  private readonly root: HTMLDivElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly statsBox: HTMLDivElement;
  private readonly mountsBox: HTMLDivElement;
  private readonly storageBox: HTMLDivElement;
  private readonly modulesBox: HTMLDivElement;
  private signature = '';
  private selected: string | null = null;
  /** The change being pointed at: a module for a mount, or null module for "remove". */
  private preview: { mountId: string; moduleId: string | null } | null = null;
  private world: World | null = null;
  private pilotId = '';

  constructor(
    container: HTMLElement,
    private readonly onRefit: (request: RefitRequest) => void,
  ) {
    this.root = el('div', 'outfitting');
    const top = el('div', 'outfitting-top');
    this.canvas = el('canvas', 'outfitting-preview');
    this.canvas.addEventListener('click', (e) => this.clickDrawing(e));
    this.statsBox = el('div', 'outfitting-stats');
    top.append(this.canvas, this.statsBox);
    this.mountsBox = el('div', 'outfitting-mounts');
    this.modulesBox = el('div', 'outfitting-modules');
    this.storageBox = el('div', 'outfitting-storage');
    this.root.append(top, this.mountsBox, this.modulesBox, this.storageBox);
    container.append(this.root);

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = PREVIEW_W * dpr;
    this.canvas.height = PREVIEW_H * dpr;
    this.canvas.style.width = `${PREVIEW_W}px`;
    this.canvas.style.height = `${PREVIEW_H}px`;
  }

  /** Redraw if anything shown has changed. Cheap to call every frame. */
  update(world: World, pilotId: string): void {
    this.world = world;
    this.pilotId = pilotId;
    const pilot = world.pilots[pilotId];
    const ship = pilot?.shipId ? world.ships[pilot.shipId] : undefined;
    const hull = ship ? world.hulls[ship.hullId] : undefined;
    if (!pilot || !ship || !hull) return;
    if (this.selected && !hull.mounts.some((m) => m.id === this.selected)) this.selected = null;

    const signature = JSON.stringify([ship.id, ship.dockedAt, pilot.credits, pilot.storage, ship.fit, ship.hold, this.selected]);
    if (signature === this.signature) return;
    this.signature = signature;
    this.preview = null;
    this.renderMounts(world, hull, ship.fit);
    this.renderModules(world, hull, ship.fit);
    this.renderStorage(world, ship.dockedAt);
    this.renderPreview();
  }

  /** Force a rebuild next update (e.g. after docking somewhere new). */
  invalidate(): void {
    this.signature = '';
  }

  private select(mountId: string): void {
    this.selected = this.selected === mountId ? null : mountId;
    this.invalidate();
    if (this.world) this.update(this.world, this.pilotId);
  }

  private setPreview(preview: { mountId: string; moduleId: string | null } | null): void {
    if (this.preview?.mountId === preview?.mountId && this.preview?.moduleId === preview?.moduleId) return;
    this.preview = preview;
    this.renderPreview();
  }

  /** Redraw the ship drawing and stats for the current fit or the previewed change. */
  private renderPreview(): void {
    const world = this.world;
    const ship = world?.ships[world.pilots[this.pilotId]?.shipId ?? ''];
    const hull = ship && world ? world.hulls[ship.hullId] : undefined;
    if (!world || !ship || !hull) return;

    const now = shipStats(world, ship);
    let fit = ship.fit;
    let after: ShipStats | null = null;
    if (this.preview) {
      // Preview even a change the rules refuse, so the pilot can see why
      // (power spare going negative, cargo falling below what is aboard).
      const { mountId, moduleId } = this.preview;
      const changed = { ...ship.fit };
      if (moduleId) changed[mountId] = moduleId;
      else delete changed[mountId];
      fit = changed;
      after = fitStats(world, hull, changed, cargoMass(ship, world.goods));
    }
    this.drawShip(world, hull, fit);
    this.renderStats(now, after);
  }

  private drawShip(world: World, hull: HullSpec, fit: Readonly<Record<string, string>>): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, PREVIEW_W, PREVIEW_H);
    const scale = this.drawingScale(hull);
    ctx.save();
    ctx.translate(PREVIEW_W / 2, PREVIEW_H / 2);
    ctx.scale(scale, scale);
    drawShipArt(ctx, scale, {
      hull,
      fit,
      modules: world.modules,
      manufacturers: world.manufacturers,
      colour: hull.race ? RACE_COLOUR[hull.race] : INK,
      heading: 0,
      showMounts: true,
      highlightMount: this.selected,
    });
    ctx.restore();
  }

  /** Pixels per world unit that fit the whole hull, mounts included, in the drawing. */
  private drawingScale(hull: HullSpec): number {
    const points = [...hull.outline, ...hull.mounts.map((m) => m.position)];
    const extent = Math.max(...points.map((p) => Math.max(Math.abs(p.x) * (PREVIEW_H / PREVIEW_W), Math.abs(p.y))), 1);
    return (PREVIEW_H * 0.4) / extent;
  }

  private clickDrawing(e: MouseEvent): void {
    const world = this.world;
    const ship = world?.ships[world.pilots[this.pilotId]?.shipId ?? ''];
    const hull = ship && world ? world.hulls[ship.hullId] : undefined;
    if (!hull) return;
    const rect = this.canvas.getBoundingClientRect();
    const scale = this.drawingScale(hull);
    const x = (e.clientX - rect.left - PREVIEW_W / 2) / scale;
    const y = (e.clientY - rect.top - PREVIEW_H / 2) / scale;
    let best: MountPoint | null = null;
    let bestDist = MOUNT_CLICK_PX / scale + 3;
    for (const m of hull.mounts) {
      const d = Math.hypot(m.position.x - x, m.position.y - y);
      if (d < bestDist) {
        best = m;
        bestDist = d;
      }
    }
    if (best) this.select(best.id);
  }

  private renderStats(now: ShipStats, after: ShipStats | null): void {
    const table = el('table');
    const head = el('tr');
    // The After column is always there, empty until something is pointed
    // at, so a preview never changes the panel's layout under the pointer.
    head.append(el('th', undefined, 'Ship'), el('th', 'num', 'Now'), el('th', 'num', after ? 'After' : ''));
    table.append(head);
    for (const row of STAT_ROWS) {
      const tr = el('tr');
      const a = row.value(now);
      tr.append(el('td', undefined, row.label), el('td', 'num', row.format(a)));
      if (after) {
        const b = row.value(after);
        const diff = Math.abs(b - a) > 1e-6;
        tr.append(el('td', `num ${compareClass(row, a, b, diff)}`, row.format(b)));
      } else {
        tr.append(el('td', 'num'));
      }
      table.append(tr);
    }
    this.statsBox.replaceChildren(table);
    // Warn about the fit being shown (the preview if there is one), so a
    // ship that cannot fly is obvious before undocking in it. The box keeps
    // its height when empty: hovering must never move the buttons.
    const warnings = el('div', 'fit-warnings');
    for (const w of flightWarnings(after ?? now)) {
      if (w === 'noWeapons') continue; // a legitimate choice, not a trap
      warnings.append(el('p', 'fit-warning', FLIGHT_WARNINGS[w]));
    }
    this.statsBox.append(warnings);
  }

  private renderMounts(world: World, hull: HullSpec, fit: Readonly<Record<string, string>>): void {
    const box = this.mountsBox;
    box.replaceChildren();
    const maker = world.manufacturers[hull.manufacturer]?.name ?? hull.manufacturer;
    box.append(el('h2', undefined, `${hull.name} · ${maker} · ${hull.role}`));
    if (hull.sealed) box.append(el('p', 'muted', FIT_REFUSALS.sealed));
    if (hull.bonuses.length) box.append(el('p', 'bonuses', `Bonuses: ${hull.bonuses.map((b) => b.label).join('; ')}.`));

    const table = el('table');
    const head = el('tr');
    for (const h of ['Mount', 'Size', 'Fitted', '']) head.append(el('th', undefined, h));
    table.append(head);
    for (const mount of hull.mounts) {
      const module = fit[mount.id] ? world.modules[fit[mount.id]!] : undefined;
      const tr = el('tr', mount.id === this.selected ? 'selected' : undefined);
      const name = el('button', 'link', `${mount.id.toUpperCase()} ${MOUNT_TYPE_NAME[mount.type]}`);
      name.type = 'button';
      name.title = mount.services.length ? `Provides: ${mount.services.join(', ')}` : 'No services';
      name.addEventListener('click', () => this.select(mount.id));
      const nameCell = el('td');
      nameCell.append(name);
      const fitted = el('td', module ? undefined : 'muted-cell', module?.name ?? 'empty');
      if (module) fitted.append(el('span', 'module-type', ` · ${moduleType(module, world)}`));
      tr.append(nameCell, el('td', undefined, mount.size), fitted);

      const actions = el('td', 'actions');
      if (module && !hull.sealed) {
        const plan = planRefit(world, this.pilotId, mount.id, null);
        const remove = el('button', undefined, `Unfit ${credits(fitFee(module))}`);
        remove.title = 'Moves it to storage at this station';
        remove.type = 'button';
        remove.disabled = !plan.ok;
        if (!plan.ok) remove.title = FIT_REFUSALS[plan.reason];
        remove.addEventListener('click', () => this.onRefit({ kind: 'refit', mountId: mount.id, moduleId: null }));
        remove.addEventListener('mouseenter', () => this.setPreview({ mountId: mount.id, moduleId: null }));
        remove.addEventListener('mouseleave', () => this.setPreview(null));
        actions.append(remove);
      }
      tr.append(actions);
      table.append(tr);
    }
    box.append(table);
  }

  private renderModules(world: World, hull: HullSpec, fit: Readonly<Record<string, string>>): void {
    const box = this.modulesBox;
    box.replaceChildren();
    const mount = hull.mounts.find((m) => m.id === this.selected);
    if (!mount || hull.sealed) {
      if (!hull.sealed) box.append(el('p', 'muted', 'Select a mount to see what fits it.'));
      return;
    }
    box.append(el('h2', undefined, `Fits ${mount.id.toUpperCase()} (${MOUNT_TYPE_NAME[mount.type]} ${mount.size})`));

    const options = Object.values(world.modules)
      .filter((m) => mountRefusal(mount, m) === null)
      .sort((a, b) => a.kind.localeCompare(b.kind) || a.size.localeCompare(b.size) || a.price - b.price);
    if (options.length === 0) {
      box.append(el('p', 'muted', 'Nothing on sale fits this mount.'));
      return;
    }

    const table = el('table');
    const head = el('tr');
    for (const h of ['Module', 'Type', 'Maker', 'Mass', 'Power', 'Does', 'Owned', 'Cost', '']) head.append(el('th', undefined, h));
    table.append(head);
    const current = fit[mount.id];
    const pilot = world.pilots[this.pilotId];
    const stationId = world.ships[pilot?.shipId ?? '']?.dockedAt ?? '';
    for (const m of options) {
      const plan = planRefit(world, this.pilotId, mount.id, m.id);
      const old = current ? world.modules[current] : undefined;
      const owned = pilot ? storedCount(pilot, stationId, m.id) : 0;
      // Same sum the sim charges: price unless owned, fee to fit, fee to unfit what it replaces.
      const cost = (owned > 0 ? 0 : m.price) + fitFee(m) + (old ? fitFee(old) : 0);
      const tr = el('tr', m.id === current ? 'selected' : undefined);
      const smaller = m.size !== mount.size ? ' (no hull bonus)' : '';
      tr.append(
        el('td', undefined, `${m.name}${smaller}`),
        el('td', undefined, moduleType(m, world)),
        el('td', undefined, world.manufacturers[m.manufacturer]?.name ?? m.manufacturer),
        el('td', 'num', fixed1(m.mass)),
        el('td', 'num', m.power ? `-${m.power}` : m.stats.powerOutput ? `+${m.stats.powerOutput}` : '0'),
        el('td', 'does', describeModule(m, world)),
        el('td', 'num', owned ? String(owned) : ''),
        el('td', 'num', m.id === current ? '' : credits(cost)),
      );
      const actions = el('td', 'actions');
      if (plan.ok) {
        const b = el('button', undefined, 'Fit');
        b.type = 'button';
        b.addEventListener('click', () => this.onRefit({ kind: 'refit', mountId: mount.id, moduleId: m.id }));
        actions.append(b);
      } else {
        actions.append(el('span', 'refused', m.id === current ? 'Fitted' : FIT_REFUSALS[plan.reason]));
      }
      tr.append(actions);
      if (m.id !== current) {
        tr.addEventListener('mouseenter', () => this.setPreview({ mountId: mount.id, moduleId: m.id }));
        tr.addEventListener('mouseleave', () => this.setPreview(null));
      }
      table.append(tr);
    }
    box.append(table);
  }

  /** Modules the pilot owns in storage at this station, with a Sell button each. */
  private renderStorage(world: World, stationId: string | null): void {
    const box = this.storageBox;
    box.replaceChildren();
    const pilot = world.pilots[this.pilotId];
    const here = stationId && pilot ? (pilot.storage[stationId] ?? {}) : {};
    const ids = Object.keys(here).sort((a, b) => (world.modules[a]?.name ?? a).localeCompare(world.modules[b]?.name ?? b));
    box.append(el('h2', undefined, 'Stored here'));
    if (ids.length === 0) {
      box.append(el('p', 'muted', 'Nothing stored here. Unfitted modules are kept at the station you unfit them at.'));
      return;
    }
    const table = el('table');
    const head = el('tr');
    for (const h of ['Module', 'Type', 'Size', 'Count', '']) head.append(el('th', undefined, h));
    table.append(head);
    for (const id of ids) {
      const m = world.modules[id];
      const tr = el('tr');
      tr.append(el('td', undefined, m?.name ?? id), el('td', undefined, m ? moduleType(m, world) : ''), el('td', undefined, m?.size ?? ''), el('td', 'num', String(here[id])));
      const actions = el('td', 'actions');
      if (m) {
        const sell = el('button', undefined, `Sell +${credits(resaleValue(m))}`);
        sell.type = 'button';
        sell.addEventListener('click', () => this.onRefit({ kind: 'sell', moduleId: id }));
        actions.append(sell);
      }
      tr.append(actions);
      table.append(tr);
    }
    box.append(table);
  }
}
