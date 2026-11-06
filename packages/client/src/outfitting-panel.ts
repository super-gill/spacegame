import {
  cargoMass,
  holdUse,
  fitStats,
  flightWarnings,
  mountRefusal,
  planRefit,
  resaleValue,
  shipStats,
  storedCount,
  isGun,
  isMainGun,
  weaponDps,
  type FitRefusal,
  type FlightWarning,
  type HullSpec,
  type ModuleSpec,
  type MountPoint,
  type MountType,
  type Ship,
  type ShipStats,
  type World,
} from '@spacegame/sim';
import { RACE_COLOUR } from './render/ship-art.js';

/**
 * The fitting window (docs/fitting.md, "The fitting window"), inside the
 * docked panel at stations that refit ships.
 *
 * - Budget bars across the top: power, capacitor, mass, cargo, ore hold.
 * - Left: the slots by tier (high, mid, low, then core systems), each with
 *   what is fitted.
 * - Middle: the ship as fitted, every slot marked where it sits on the
 *   hull by tier (circle high, diamond mid, square low, outline core) and
 *   size; the selected high or CIWS slot shows the arc a turret there
 *   can cover. Below it, every number the ship has, now and after a change.
 * - Right: what fits the selected slot, from storage here first, then for
 *   sale here, with Fit, Buy and fit, and Buy; then everything stored
 *   here, to sell.
 *
 * Pointing at a module previews it: the drawing, the bars and the numbers
 * show the ship as it would be. The panel only draws and reports clicks;
 * main.ts runs the sim commands.
 */

/** Fit `moduleId` on a mount, or with `moduleId` null unfit it; buy a module into storage; or sell one stored module. */
export type RefitRequest =
  | { kind: 'refit'; mountId: string; moduleId: string | null }
  | { kind: 'buy'; moduleId: string }
  | { kind: 'sell'; moduleId: string };

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
  high: 'High',
  mid: 'Mid',
  low: 'Low',
  engine: 'Engine',
  core: 'Core',
  radar: 'Radar',
  computer: 'Targeting computer',
  nav: 'Navigation',
  flight: 'Flight computer',
  podBay: 'Pod bay',
  fireControl: 'Fire control',
  ciws: 'CIWS',
};

/** Table order: core systems first (as the hull lists them), then high, mid and low slots. */
const TIER_ORDER: Partial<Record<MountType, number>> = { high: 1, mid: 2, low: 3 };

const INK = '#9fd3c7';
/** The ship drawing's size in CSS pixels; it scales down with its column. */
const PREVIEW_W = 480;
const PREVIEW_H = 340;
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
    if (w.family === 'pointDefence') return 'Close-in weapon system';
    if (w.family === 'mining' && w.kind === 'turret') return 'Mining turret';
    return WEAPON_NAMES[w.id.replace(/-[sml]$/, '')] ?? 'Gun';
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
  'mining-laser': 'Mining laser',
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
  surveyScanner: 'Survey scanner',
  oreHopper: 'Ore hopper',
  droneBay: 'Drone bay',
  breachCharger: 'Charge rig',
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
  if (s.turretControl) parts.push(`directs ${s.turretControl} CIWS, tracking ${fixed1(s.turretTracking ?? 1)}x`);
  if (s.escapePod) parts.push('an escape pod: without one, losing the ship leaves you with nothing');
  if (s.tractorRange) parts.push(`tractor reach ${s.tractorRange} u, pull ${s.tractorPull ?? 0} u/s`);
  if (s.afterburnerSpeed) parts.push(`hold Shift: +${Math.round(s.afterburnerSpeed * 100)}% top speed, +${Math.round((s.afterburnerThrust ?? 0) * 100)}% thrust, ${fixed1(s.afterburnerDraw ?? 0)} cap/s`);
  if (s.oreCapacity) parts.push(`${s.oreCapacity} units of hold for ore only${m.kind === 'oreHopper' ? '; its tile sets one ore to spit back out astern' : ''}`);
  if (s.droneCapacity) parts.push(`holds ${s.droneCapacity} drone${s.droneCapacity === 1 ? '' : 's'}, flies ${s.droneControl ?? 0} at once, within ${s.droneRange ?? 0} u (drones are bought at the market)`);
  if (s.surveyRange) parts.push(`survey pulse ${s.surveyRange} u for ${s.surveyCost ?? 0} cap: ${(s.surveyGrade ?? 0) >= 2 ? 'names the best ore in each rock' : 'tells rich rock from plain'}`);
  if (m.readouts?.includes('composition')) parts.push('reads what a locked rock holds and how hard it is, not guns');
  if (m.readouts?.includes('core')) parts.push('also finds gate-glass cores in big rocks and marks their breach points');
  if (s.breachTolerance) parts.push(`plants crackers (bought at the market) from its tile; a charge counts on a breach point within ${Math.round((s.breachTolerance * 180) / Math.PI)}° of it, and hulls built for breaching widen that`);
  if (m.shieldRegenDelay) parts.push(`recharges ${fixed1(m.shieldRegenDelay)} s after a hit`);
  const w = m.weaponId ? world.weapons[m.weaponId] : undefined;
  if (w && w.family === 'countermeasure') {
    // Dispensers: what they hold and what they come with.
    parts.push(`drops chaff, flares or decoys, holds ${w.magazine}, one every ${fixed1(w.fireInterval)} s`);
    if (m.startsLoadedWith) parts.push(`comes loaded with ${world.goods[m.startsLoadedWith]?.name ?? m.startsLoadedWith}`);
  } else if (w && w.family === 'mining') {
    if (w.kind === 'turret') parts.push('a mining turret: its tile gives it your active lock\'s rock, and it cuts that rock on its own');
    parts.push(`cuts rock up to ${Math.round((w.mining?.strength ?? 0) * 100)}% hard, ${fixed1(w.damage)} ore/s, range ${Math.round(w.range)}, ${fixed1(w.capacitorPerShot)} cap/s`);
  } else if (w && w.family === 'missile') {
    parts.push(`${Math.round(w.damage)} warhead base, one every ${fixed1(w.fireInterval)} s, needs a lock`);
    parts.push(`loads ${w.ammo === 'torpedo' ? 'torpedoes' : 'missiles'}, holds ${w.magazine}`);
  } else if (w) {
    parts.push(`${fixed1(weaponDps(w))} dps, range ${Math.round(w.range)}, ${w.damageType}`);
    if (w.capacitorPerShot > 0) parts.push(`${fixed1(w.capacitorPerShot)} cap/shot`);
    if (w.spread) parts.push(`spread ±${fixed1((w.spread * 180) / Math.PI)}°`);
    if (w.falloff) parts.push(`full power to ${Math.round(w.falloff.from * 100)}% of range, ${Math.round(w.falloff.floor * 100)}% at full range`);
    if (w.ammo) parts.push(`loads ${w.ammo}, magazine ${w.magazine}`);
    if (w.family === 'pointDefence') parts.push(`shoots down missiles by itself, and ships inside its range when weapons are hot; traverse ${fixed1(w.turretTurnRate)} rad/s; fire control sets how many you can run`);
    else if (w.kind === 'turret') parts.push(`turret: follows your lock at ${fixed1(w.turretTurnRate)} rad/s and fires with its group when it bears; no fire control needed`);
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
/** Damage per second of the main guns (`main`) or of the close-in weapon systems. */
const dps = (s: ShipStats, main: boolean): number =>
  Object.values(s.weapons)
    .filter((w) => isGun(w) && isMainGun(w) === main)
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
  { label: 'Signature', value: (s) => s.signature, format: (n) => String(Math.round(n)), better: 'lower' },
  { label: 'Lock speed', value: (s) => s.scanResolution, format: (n) => (n > 0 ? `${fixed1(n)}x` : 'none'), better: 'higher' },
  { label: 'Capacitor', value: (s) => s.capacitor, format: (n) => String(Math.round(n)), better: 'higher' },
  { label: 'Cap recharge', value: (s) => s.capacitorRecharge, format: (n) => `${fixed1(n)}/s`, better: 'higher' },
  { label: 'Cap drain', value: (s) => s.capacitorDraw, format: (n) => `${fixed1(n)}/s`, better: 'lower' },
  { label: 'Power spare', value: (s) => s.powerOutput - s.powerDraw, format: (n) => fixed1(n), better: 'budget' },
  { label: 'Gun dps', value: (s) => dps(s, true), format: fixed1, better: 'higher' },
  { label: 'CIWS dps', value: (s) => dps(s, false), format: fixed1, better: 'higher' },
];

/**
 * What the fitting window works on (docs/fitting.md, "The fitting
 * window"): a docked ship at a station, with storage and money
 * (`stationFitContext`), or a free fit in the fitter, where any module goes
 * in any slot it fits and nothing is bought.
 */
export interface FitContext {
  hull: HullSpec;
  fit: Readonly<Record<string, string>>;
  /** The ship, for its hold in the budgets; null in the fitter. */
  ship: Ship | null;
  /** Whether a change can be made, and if not, why. */
  plan(mountId: string, moduleId: string | null): { ok: true } | { ok: false; reason: FitRefusal };
  /** How many of a module are stored here; always 0 in the fitter. */
  owned(moduleId: string): number;
  /** Modules stored here, to sell; null where there is no storage (the fitter). */
  storedHere: Readonly<Record<string, number>> | null;
  /** True in the fitter: Fit just fits, nothing is bought or sold. */
  free: boolean;
  /** Changes whenever anything the window shows changes. */
  key: string;
}

/** The fitting window's context for a pilot's docked ship; null if there is none. */
export function stationFitContext(world: World, pilotId: string): FitContext | null {
  const pilot = world.pilots[pilotId];
  const ship = pilot?.shipId ? world.ships[pilot.shipId] : undefined;
  const hull = ship ? world.hulls[ship.hullId] : undefined;
  if (!pilot || !ship || !hull) return null;
  const stationId = ship.dockedAt ?? '';
  return {
    hull,
    fit: ship.fit,
    ship,
    plan: (mountId, moduleId) => {
      const r = planRefit(world, pilotId, mountId, moduleId);
      return r.ok ? { ok: true } : { ok: false, reason: r.reason };
    },
    owned: (moduleId) => storedCount(pilot, stationId, moduleId),
    storedHere: pilot.storage[stationId] ?? {},
    free: false,
    key: JSON.stringify([ship.id, ship.dockedAt, pilot.credits, pilot.storage, ship.fit, ship.hold]),
  };
}

export class OutfittingPanel {
  private readonly root: HTMLDivElement;
  private readonly header: HTMLDivElement;
  private readonly budgets: HTMLDivElement;
  private readonly rails: HTMLDivElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly statsBox: HTMLDivElement;
  private readonly picker: HTMLDivElement;
  private readonly storageBox: HTMLDivElement;
  private signature = '';
  private selected: string | null = null;
  /** The change being pointed at: a module for a mount, or null module for "remove". */
  private preview: { mountId: string; moduleId: string | null } | null = null;
  private world: World | null = null;
  private ctx: FitContext | null = null;

  constructor(
    container: HTMLElement,
    private readonly onRefit: (request: RefitRequest) => void,
  ) {
    this.root = el('div', 'outfitting');
    this.header = el('div', 'fit-header');
    this.budgets = el('div', 'fit-budgets');
    const grid = el('div', 'fit-grid');
    this.rails = el('div', 'fit-rails');
    const centre = el('div', 'fit-centre');
    this.canvas = el('canvas', 'outfitting-preview');
    this.canvas.addEventListener('click', (e) => this.clickDrawing(e));
    const legend = el('div', 'fit-legend');
    legend.append(
      this.key('high', 'High: works on something else'),
      this.key('mid', "Mid: the ship's own systems"),
      this.key('low', 'Low: passive'),
      this.key('core', 'Core systems'),
    );
    this.statsBox = el('div', 'outfitting-stats');
    centre.append(this.canvas, legend, this.statsBox);
    const right = el('div', 'fit-right');
    this.picker = el('div', 'fit-picker');
    this.storageBox = el('div', 'outfitting-storage');
    right.append(this.picker, this.storageBox);
    grid.append(this.rails, centre, right);
    this.root.append(this.header, this.budgets, grid);
    container.append(this.root);

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = PREVIEW_W * dpr;
    this.canvas.height = PREVIEW_H * dpr;
  }

  /** Redraw if anything shown has changed. Cheap to call every frame. */
  update(world: World, ctx: FitContext | null): void {
    this.world = world;
    this.ctx = ctx;
    if (!ctx) return;
    const hull = ctx.hull;
    if (this.selected && !hull.mounts.some((m) => m.id === this.selected)) this.selected = null;
    // Open on the first high slot, so the window starts somewhere useful.
    if (!this.selected) this.selected = hull.mounts.find((m) => m.type === 'high')?.id ?? hull.mounts[0]?.id ?? null;

    const signature = JSON.stringify([hull.id, ctx.key, this.selected]);
    if (signature === this.signature) return;
    this.signature = signature;
    this.preview = null;
    this.renderHeader(world, hull);
    this.renderRails(world, hull, ctx.fit);
    this.renderPicker(world, hull, ctx.fit);
    this.renderStorage(world);
    this.renderPreview();
  }

  /** Force a rebuild next update (e.g. after docking somewhere new). */
  invalidate(): void {
    this.signature = '';
  }

  private select(mountId: string): void {
    this.selected = mountId;
    this.invalidate();
    if (this.world) this.update(this.world, this.ctx);
  }

  private setPreview(preview: { mountId: string; moduleId: string | null } | null): void {
    if (this.preview?.mountId === preview?.mountId && this.preview?.moduleId === preview?.moduleId) return;
    this.preview = preview;
    this.renderPreview();
  }

  private key(tier: TierKey, label: string): HTMLElement {
    const k = el('span', 'fit-key');
    k.append(el('span', `fit-mark ${tier}`), document.createTextNode(label));
    return k;
  }

  /** Redraw the drawing, the bars and the numbers for the current fit or the previewed change. */
  private renderPreview(): void {
    const world = this.world;
    const ctx = this.ctx;
    if (!world || !ctx) return;
    const { hull, ship } = ctx;
    const cargo = ship ? cargoMass(ship, world.goods) : 0;

    const now = ship ? shipStats(world, ship) : fitStats(world, hull, ctx.fit, 0);
    let fit = ctx.fit;
    let after: ShipStats | null = null;
    if (this.preview) {
      // Preview even a change the rules refuse, so the pilot can see why
      // (power spare going negative, cargo falling below what is aboard).
      const { mountId, moduleId } = this.preview;
      const changed = { ...ctx.fit };
      if (moduleId) changed[mountId] = moduleId;
      else delete changed[mountId];
      fit = changed;
      after = fitStats(world, hull, changed, cargo);
    }
    this.drawShip(hull, fit);
    this.renderBudgets(world, ship, now, after);
    this.renderStats(now, after);
  }

  private renderHeader(world: World, hull: HullSpec): void {
    const maker = world.manufacturers[hull.manufacturer]?.name ?? hull.manufacturer;
    const cls = (hull as { class?: string }).class ?? '';
    const line = el('div', 'fit-title');
    line.append(el('span', 'fit-hull', hull.name), el('span', 'muted', `${cls} · ${hull.sizeClass} · ${maker}`));
    if (hull.oreHold) line.append(el('span', 'muted fit-builtin', `Built in: ore hold ${hull.oreHold}`));
    const parts: HTMLElement[] = [line];
    if (hull.bonuses.length) parts.push(el('p', 'bonuses', `Bonuses: ${hull.bonuses.map((b) => b.label).join('; ')}.`));
    if (hull.sealed) parts.push(el('p', 'muted', FIT_REFUSALS.sealed));
    this.header.replaceChildren(...parts);
  }

  /** Power, capacitor, mass, cargo and ore hold as bars; a preview outlines the power it would use. */
  private renderBudgets(world: World, ship: Ship | null, now: ShipStats, after: ShipStats | null): void {
    const use = ship ? holdUse(ship, now, world.goods) : { ore: { used: 0, capacity: now.oreCapacity }, cargo: { used: 0, capacity: now.cargoCapacity } };
    const bar = (label: string, value: string, note: string, fill: number, colour: string, outline: number | null, outlineBad: boolean): HTMLElement => {
      const box = el('div', 'fit-budget');
      const top = el('div', 'fit-budget-top');
      top.append(el('span', 'muted', label), el('span', 'fit-budget-value', value));
      const track = el('div', 'fit-bar');
      const f = el('div', 'fit-bar-fill');
      f.style.width = `${Math.max(0, Math.min(100, fill * 100))}%`;
      f.style.background = colour;
      track.append(f);
      if (outline !== null) {
        const o = el('div', `fit-bar-preview${outlineBad ? ' bad' : ''}`);
        o.style.width = `${Math.max(0, Math.min(100, outline * 100))}%`;
        track.append(o);
      }
      box.append(top, track, el('div', 'fit-budget-note', note));
      return box;
    };
    const s = after ?? now;
    const parts = [
      bar('Power', `${fixed1(s.powerDraw)} / ${fixed1(s.powerOutput)}`, s.powerDraw > s.powerOutput ? 'not enough power' : `${fixed1(s.powerOutput - s.powerDraw)} spare`, now.powerOutput > 0 ? now.powerDraw / now.powerOutput : 0, INK, after ? (after.powerOutput > 0 ? after.powerDraw / after.powerOutput : 1) : null, Boolean(after && after.powerDraw > after.powerOutput)),
      bar('Capacitor', `${Math.round(s.capacitor)}`, `recharges ${fixed1(s.capacitorRecharge)}/s · drains ${fixed1(s.capacitorDraw)}/s idle`, 1, '#7cc8ff', null, false),
      bar('Mass', `${fixed1(s.mass)} t`, `acceleration ${fixed1(s.mainThrust / s.mass)} u/s² · spin-up ${Math.round((s.rotationThrust / s.mass) * DEG)}°/s²`, Math.min(1, s.mass / 120), '#6a988f', null, false),
      bar('Cargo', `${use.cargo.used} / ${s.cargoCapacity}`, s.cargoCapacity > 0 ? `${Math.max(0, s.cargoCapacity - use.cargo.used)} free` : 'no cargo space', s.cargoCapacity > 0 ? use.cargo.used / s.cargoCapacity : 0, INK, null, false),
    ];
    if (s.oreCapacity > 0) parts.push(bar('Ore hold', `${use.ore.used} / ${s.oreCapacity}`, 'built in: ore only', use.ore.used / s.oreCapacity, INK, null, false));
    this.budgets.replaceChildren(...parts);
  }

  private drawShip(hull: HullSpec, fit: Readonly<Record<string, string>>): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, PREVIEW_W, PREVIEW_H);
    const scale = this.drawingScale(hull);
    // The hull as a plain outline: the slot marks carry the fit, so the
    // in-flight module art (in maker colours) would only compete with them.
    ctx.save();
    ctx.translate(PREVIEW_W / 2, PREVIEW_H / 2);
    ctx.beginPath();
    hull.outline.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x * scale, p.y * scale) : ctx.lineTo(p.x * scale, p.y * scale)));
    ctx.closePath();
    ctx.fillStyle = 'rgba(159, 211, 199, 0.05)';
    ctx.fill();
    ctx.strokeStyle = hull.race ? RACE_COLOUR[hull.race] : INK;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    this.drawSlots(ctx, hull, fit, scale);
  }

  /** Each slot where it sits, by tier and size; the selected high or CIWS slot's arc. */
  private drawSlots(ctx: CanvasRenderingContext2D, hull: HullSpec, fit: Readonly<Record<string, string>>, scale: number): void {
    const at = (m: MountPoint) => ({ x: PREVIEW_W / 2 + m.position.x * scale, y: PREVIEW_H / 2 + m.position.y * scale });
    const sel = hull.mounts.find((m) => m.id === this.selected);
    if (sel && (sel.type === 'high' || sel.type === 'ciws')) {
      const p = at(sel);
      ctx.save();
      ctx.strokeStyle = 'rgba(224, 164, 88, 0.6)';
      ctx.fillStyle = 'rgba(224, 164, 88, 0.10)';
      ctx.setLineDash([4, 4]);
      if (sel.arc !== undefined && sel.arc < Math.PI * 2 - 1e-6) {
        const r = Math.min(PREVIEW_W, PREVIEW_H) * 0.55;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.arc(p.x, p.y, r, sel.facing - sel.arc / 2, sel.facing + sel.arc / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#e0a458';
        ctx.font = '11px ' + FONT;
        const blind = sel.facing + Math.PI;
        ctx.fillText('blind spot', p.x + Math.cos(blind) * 60 - 28, p.y + Math.sin(blind) * 60 + 4);
      } else if (sel.arc !== undefined) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.min(PREVIEW_W, PREVIEW_H) * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(sel.facing) * 90, p.y + Math.sin(sel.facing) * 90);
        ctx.stroke();
      }
      ctx.restore();
    }
    for (const m of hull.mounts) {
      const p = at(m);
      const tier = tierOf(m.type);
      const r = tier === 'core' ? 4 : { S: 6, M: 8.5, L: 11, XL: 13 }[m.size];
      const empty = !fit[m.id];
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.lineWidth = 2;
      ctx.strokeStyle = TIER_LINE[tier];
      ctx.fillStyle = TIER_FILL[tier];
      if (empty && tier !== 'core') ctx.setLineDash([3, 2]);
      ctx.beginPath();
      if (tier === 'high') ctx.arc(0, 0, r, 0, Math.PI * 2);
      else if (tier === 'mid') {
        ctx.moveTo(0, -r);
        ctx.lineTo(r, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r, 0);
        ctx.closePath();
      } else ctx.rect(-r, -r, r * 2, r * 2);
      if (!empty && tier !== 'core') ctx.fill();
      ctx.lineWidth = tier === 'core' ? 1 : 2;
      ctx.stroke();
      if (m.id === this.selected) {
        ctx.setLineDash([]);
        ctx.strokeStyle = '#dffbf3';
        ctx.lineWidth = 2;
        ctx.strokeRect(-r - 4, -r - 4, (r + 4) * 2, (r + 4) * 2);
      }
      ctx.restore();
    }
  }

  /** Pixels per world unit that fit the whole hull, mounts included, in the drawing. */
  private drawingScale(hull: HullSpec): number {
    const points = [...hull.outline, ...hull.mounts.map((m) => m.position)];
    const extent = Math.max(...points.map((p) => Math.max(Math.abs(p.x) * (PREVIEW_H / PREVIEW_W), Math.abs(p.y))), 1);
    return (PREVIEW_H * 0.42) / extent;
  }

  private clickDrawing(e: MouseEvent): void {
    const hull = this.ctx?.hull;
    if (!hull) return;
    // The canvas may be drawn smaller than its pixel size: map back.
    const rect = this.canvas.getBoundingClientRect();
    const k = PREVIEW_W / rect.width;
    const scale = this.drawingScale(hull);
    const x = ((e.clientX - rect.left) * k - PREVIEW_W / 2) / scale;
    const y = ((e.clientY - rect.top) * k - PREVIEW_H / 2) / scale;
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

  /** The slots by tier, each with what is fitted; core systems last. */
  private renderRails(world: World, hull: HullSpec, fit: Readonly<Record<string, string>>): void {
    const groups: { tier: TierKey; title: string }[] = [
      { tier: 'high', title: 'HIGH' },
      { tier: 'mid', title: 'MID' },
      { tier: 'low', title: 'LOW' },
      { tier: 'core', title: 'CORE SYSTEMS' },
    ];
    const parts: HTMLElement[] = [];
    for (const g of groups) {
      const mounts = hull.mounts.filter((m) => tierOf(m.type) === g.tier);
      if (mounts.length === 0) continue;
      const box = el('div', 'fit-rail');
      const head = el('div', 'fit-rail-head');
      const title = el('span', 'fit-rail-title');
      title.append(el('span', `fit-mark ${g.tier}`), document.createTextNode(g.title));
      head.append(title, el('span', 'muted', g.tier === 'core' ? String(mounts.length) : `${mounts.filter((m) => fit[m.id]).length} of ${mounts.length} fitted`));
      box.append(head);
      for (const m of mounts) {
        const module = fit[m.id] ? world.modules[fit[m.id]!] : undefined;
        const row = el('button', `fit-slot${m.id === this.selected ? ' selected' : ''}`) as HTMLButtonElement;
        row.type = 'button';
        row.setAttribute('aria-pressed', String(m.id === this.selected));
        row.title = g.tier === 'core' ? `${MOUNT_TYPE_NAME[m.type]} ${m.size}` : `${MOUNT_TYPE_NAME[m.type]} slot, takes up to ${m.size}`;
        // The module's name, and under it what it is (a pulse laser, a shield generator).
        const what = el('span', 'fit-slot-what');
        what.append(el('span', module ? 'fit-slot-name' : 'fit-slot-name empty', module?.name ?? 'empty'));
        if (module) what.append(el('span', 'fit-slot-type', moduleType(module, world)));
        row.append(el('span', 'fit-slot-id', m.id.toUpperCase()), el('span', 'fit-slot-size', m.size), what);
        row.addEventListener('click', () => this.select(m.id));
        box.append(row);
      }
      parts.push(box);
    }
    this.rails.replaceChildren(...parts);
  }

  /** What fits the selected slot: from storage here first, then for sale here. */
  private renderPicker(world: World, hull: HullSpec, fit: Readonly<Record<string, string>>): void {
    const box = this.picker;
    box.replaceChildren();
    const mount = hull.mounts.find((m) => m.id === this.selected);
    if (!mount) {
      box.append(el('p', 'muted', 'Select a slot, on the ship or in the list.'));
      return;
    }
    const tier = tierOf(mount.type);
    const current = fit[mount.id] ? world.modules[fit[mount.id]!] : undefined;
    const head = el('div', 'fit-picker-head');
    head.append(el('div', 'fit-picker-title', `${mount.id.toUpperCase()} · ${MOUNT_TYPE_NAME[mount.type].toUpperCase()} ${mount.size}`));
    const detail =
      mount.type === 'ciws'
        ? `Close-in weapon system hardpoint: arc ${Math.round((mount.arc ?? Math.PI * 2) * DEG)}°, facing ${facingWord(mount.facing)}. Takes a CIWS up to ${mount.size}.`
        : tier === 'core'
        ? `Core system: one ${MOUNT_TYPE_NAME[mount.type].toLowerCase()}, up to ${mount.size}.`
        : tier === 'high'
          ? mount.arc !== undefined
            ? `Arc ${Math.round(mount.arc * DEG)}°, facing ${facingWord(mount.facing)}. Takes high modules up to ${mount.size}.`
            : `Fixed, facing ${facingWord(mount.facing)}. Takes high modules up to ${mount.size}.`
          : `Takes ${tier} modules up to ${mount.size}.`;
    head.append(el('div', 'muted', detail));
    const fittedLine = el('div', 'fit-picker-fitted', `Fitted: ${current ? `${current.name} (${moduleType(current, world).toLowerCase()})` : 'nothing'}`);
    const ctx = this.ctx!;
    if (current && !hull.sealed) {
      const plan = ctx.plan(mount.id, null);
      const remove = el('button', undefined, ctx.free ? 'Unfit' : 'Unfit to storage');
      remove.type = 'button';
      remove.disabled = !plan.ok;
      if (!plan.ok) remove.title = FIT_REFUSALS[plan.reason];
      remove.addEventListener('click', () => this.onRefit({ kind: 'refit', mountId: mount.id, moduleId: null }));
      remove.addEventListener('mouseenter', () => this.setPreview({ mountId: mount.id, moduleId: null }));
      remove.addEventListener('mouseleave', () => this.setPreview(null));
      fittedLine.append(remove);
    }
    head.append(fittedLine);
    box.append(head);
    if (hull.sealed) return;

    const options = Object.values(world.modules)
      .filter((m) => mountRefusal(mount, m) === null && m.id !== current?.id)
      .sort((a, b) => a.kind.localeCompare(b.kind) || a.size.localeCompare(b.size) || a.price - b.price);
    if (!ctx.free) {
      const stored = options.filter((m) => ctx.owned(m.id) > 0);
      box.append(el('h2', undefined, 'In storage here'));
      if (stored.length === 0) box.append(el('p', 'muted', 'Nothing stored here fits this slot.'));
      for (const m of stored) box.append(this.moduleRow(world, mount, m, ctx.owned(m.id)));
    }
    box.append(el('h2', undefined, ctx.free ? 'Everything that fits' : 'For sale here'));
    if (options.length === 0) box.append(el('p', 'muted', ctx.free ? 'Nothing fits this slot.' : 'Nothing on sale fits this slot.'));
    const list = el('div', 'fit-list');
    for (const m of options) list.append(this.moduleRow(world, mount, m, 0));
    box.append(list);
  }

  /** One module the selected slot takes: what it is, its costs, and its buttons. `owned` > 0 for a stored one. */
  private moduleRow(world: World, mount: MountPoint, m: ModuleSpec, owned: number): HTMLElement {
    const ctx = this.ctx!;
    const plan = ctx.plan(mount.id, m.id);
    const row = el('div', 'fit-module');
    row.title = describeModule(m, world);
    const info = el('div', 'fit-module-info');
    const smaller = m.size !== mount.size ? ' · undersized, no hull bonus' : '';
    info.append(el('span', 'fit-module-name', m.name), el('span', 'muted fit-module-does', `${moduleType(m, world)} · ${m.power ? `${m.power} power` : m.stats.powerOutput ? `+${m.stats.powerOutput} power` : 'no power'} · ${fixed1(m.mass)} t${smaller}`));
    const actions = el('div', 'fit-module-actions');
    if (ctx.free) {
      // The fitter: a price for reference, and Fit.
      actions.append(el('span', 'fit-module-price', credits(m.price)));
      if (plan.ok) {
        const b = el('button', undefined, 'Fit');
        b.type = 'button';
        b.addEventListener('click', () => this.onRefit({ kind: 'refit', mountId: mount.id, moduleId: m.id }));
        actions.append(b);
      } else actions.append(el('span', 'refused', FIT_REFUSALS[plan.reason]));
    } else if (owned > 0) {
      actions.append(el('span', 'muted', `×${owned}`));
      if (plan.ok) {
        const b = el('button', undefined, 'Fit');
        b.type = 'button';
        b.addEventListener('click', () => this.onRefit({ kind: 'refit', mountId: mount.id, moduleId: m.id }));
        actions.append(b);
      } else actions.append(el('span', 'refused', FIT_REFUSALS[plan.reason]));
    } else {
      actions.append(el('span', 'fit-module-price', credits(m.price)));
      if (plan.ok) {
        const b = el('button', undefined, 'Buy and fit');
        b.type = 'button';
        b.addEventListener('click', () => this.onRefit({ kind: 'refit', mountId: mount.id, moduleId: m.id }));
        actions.append(b);
      } else actions.append(el('span', 'refused', FIT_REFUSALS[plan.reason]));
      const buy = el('button', 'quiet', 'Buy');
      buy.type = 'button';
      buy.title = 'Buy one into storage here without fitting it';
      buy.addEventListener('click', () => this.onRefit({ kind: 'buy', moduleId: m.id }));
      actions.append(buy);
    }
    row.append(info, actions);
    row.addEventListener('mouseenter', () => this.setPreview({ mountId: mount.id, moduleId: m.id }));
    row.addEventListener('mouseleave', () => this.setPreview(null));
    return row;
  }

  /** Modules the pilot owns in storage at this station, with a Sell button each; nothing in the fitter. */
  private renderStorage(world: World): void {
    const box = this.storageBox;
    box.replaceChildren();
    const here = this.ctx?.storedHere;
    if (!here) return;
    // Goods kept here are shown in the hold panel; this is the modules.
    const ids = Object.keys(here)
      .filter((id) => world.modules[id])
      .sort((a, b) => (world.modules[a]?.name ?? a).localeCompare(world.modules[b]?.name ?? b));
    box.append(el('h2', undefined, 'Modules stored here'));
    if (ids.length === 0) {
      box.append(el('p', 'muted', 'None. Unfitted and bought modules are kept at the station where you leave them.'));
      return;
    }
    for (const id of ids) {
      const m = world.modules[id]!;
      const row = el('div', 'fit-module');
      const info = el('div', 'fit-module-info');
      info.append(el('span', 'fit-module-name', m.name), el('span', 'muted fit-module-does', `${moduleType(m, world)} · ${tierOf(m.mounts[0]!)} ${m.size} · ×${here[id]}`));
      const actions = el('div', 'fit-module-actions');
      const sell = el('button', 'quiet', `Sell +${credits(resaleValue(m))}`);
      sell.type = 'button';
      sell.addEventListener('click', () => this.onRefit({ kind: 'sell', moduleId: id }));
      actions.append(sell);
      row.append(info, actions);
      box.append(row);
    }
  }
}

type TierKey = 'high' | 'mid' | 'low' | 'core';

function tierOf(type: MountType): TierKey {
  return type === 'high' || type === 'mid' || type === 'low' ? type : 'core';
}

const TIER_LINE: Record<TierKey, string> = { high: '#e0a458', mid: '#7cc8ff', low: '#9fd3c7', core: '#6a988f' };
const TIER_FILL: Record<TierKey, string> = { high: '#e0a458', mid: '#7cc8ff', low: '#3f7f73', core: 'transparent' };
const FONT = "'IBM Plex Mono', 'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace";

/** Which way a slot faces, in words. */
function facingWord(facing: number): string {
  const a = ((facing % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  if (a < Math.PI / 4 || a > (Math.PI * 7) / 4) return 'ahead';
  if (a < (Math.PI * 3) / 4) return 'to starboard';
  if (a < (Math.PI * 5) / 4) return 'aft';
  return 'to port';
}
